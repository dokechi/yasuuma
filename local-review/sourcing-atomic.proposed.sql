-- LOCAL REVIEW ONLY. Not a migration; do not apply to production before review.
-- No expiration, cleanup job, existing-table ACL change, or new credential.
BEGIN;
CREATE TABLE public.command_center_mutation_receipts (
  operation_id uuid PRIMARY KEY,
  resource text NOT NULL CHECK (char_length(resource) BETWEEN 1 AND 500),
  action text NOT NULL CHECK (action IN ('review','reset')),
  request_hash text NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  outcome jsonb NOT NULL CHECK (jsonb_typeof(outcome)='object'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.command_center_mutation_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.command_center_mutation_receipts FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT ON public.command_center_mutation_receipts TO service_role;

CREATE FUNCTION public.command_center_apply_sourcing_review(
  p_signal_id text,
  p_action text,
  p_verdict text,
  p_note text,
  p_expected_signal_at timestamptz,
  p_expected_review_at timestamptz,
  p_operation_id uuid,
  p_supplier_info jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path='' SET lock_timeout='5s' SET timezone='UTC'
AS $rpc$
DECLARE
  s public.command_center_signals%ROWTYPE;
  r public.command_center_sourcing_reviews%ROWTYPE;
  receipt public.command_center_mutation_receipts%ROWTYPE;
  had_review boolean;
  old_candidate_key text;
  new_key text;
  affected text[];
  k text;
  request_hash text;
  saved_at timestamptz;
  judged_at timestamptz;
  next_state text;
  result jsonb;
BEGIN
  IF p_signal_id IS NULL OR btrim(p_signal_id)='' OR char_length(p_signal_id)>500
    OR p_action IS NULL OR p_action NOT IN ('review','reset')
    OR (p_action='review' AND (p_verdict IS NULL OR p_verdict NOT IN ('success','close','miss')))
    OR (p_action='reset' AND (p_verdict IS NOT NULL OR p_note IS NOT NULL))
    OR char_length(coalesce(p_note,''))>5000 OR p_operation_id IS NULL
  THEN RAISE EXCEPTION USING ERRCODE='PT400',MESSAGE='invalid_sourcing_mutation'; END IF;
  IF p_expected_signal_at IS NULL
  THEN RAISE EXCEPTION USING ERRCODE='PT428',MESSAGE='sourcing_version_required'; END IF;

  -- Fingerprint only stable client intent, not freshly derived supplier data.
  request_hash:=encode(sha256(convert_to(jsonb_build_object(
    'id',p_signal_id,'action',p_action,'verdict',p_verdict,'note',p_note,
    'signalVersion',p_expected_signal_at,'reviewVersion',p_expected_review_at
  )::text,'UTF8')),'hex');
  -- Serializes the same operation including the absent-receipt case.
  PERFORM pg_advisory_xact_lock(hashtextextended('cc-operation:'||p_operation_id::text,0));
  SELECT * INTO receipt FROM public.command_center_mutation_receipts WHERE operation_id=p_operation_id;
  IF FOUND THEN
    IF receipt.request_hash<>request_hash THEN
      RAISE EXCEPTION USING ERRCODE='PT409',MESSAGE='sourcing_operation_id_reused';
    END IF;
    RETURN receipt.outcome;
  END IF;

  SELECT * INTO s FROM public.command_center_signals WHERE id=p_signal_id FOR UPDATE;
  IF NOT FOUND OR s.domain<>'sourcing'
  THEN RAISE EXCEPTION USING ERRCODE='PT404',MESSAGE='sourcing_signal_not_found'; END IF;
  IF s.updated_at IS DISTINCT FROM p_expected_signal_at
  THEN RAISE EXCEPTION USING ERRCODE='PT409',MESSAGE='sourcing_save_conflict'; END IF;
  SELECT * INTO r FROM public.command_center_sourcing_reviews WHERE signal_id=p_signal_id FOR UPDATE;
  had_review:=FOUND;
  IF (had_review AND r.judged_at IS DISTINCT FROM p_expected_review_at)
    OR (NOT had_review AND p_expected_review_at IS NOT NULL)
  THEN RAISE EXCEPTION USING ERRCODE='PT409',MESSAGE='sourcing_review_conflict'; END IF;
  SELECT supplier_key INTO old_candidate_key FROM public.command_center_supplier_candidates WHERE signal_id=p_signal_id FOR UPDATE;

  IF p_action='review' THEN
    -- Derived by the existing server supplierInfo implementation. Never accept
    -- client-supplied metadata; compare the source it was derived from as well.
    IF jsonb_typeof(p_supplier_info) IS DISTINCT FROM 'object'
      OR p_supplier_info->>'sourceTitle' IS DISTINCT FROM s.source_title
      OR p_supplier_info->>'sourceUrl' IS DISTINCT FROM s.source_url
      OR char_length(coalesce(p_supplier_info->>'key','')) NOT BETWEEN 1 AND 1000
      OR char_length(coalesce(p_supplier_info->>'name','')) NOT BETWEEN 1 AND 1000
    THEN RAISE EXCEPTION USING ERRCODE='PT409',MESSAGE='sourcing_source_changed'; END IF;
    new_key:=p_supplier_info->>'key';
  END IF;
  affected:=ARRAY[r.supplier_key,old_candidate_key,new_key];
  -- Deterministic locks cover nonexistent suppliers as well as existing rows.
  FOR k IN SELECT DISTINCT unnest(affected) AS key ORDER BY key LOOP
    IF k IS NOT NULL THEN
      PERFORM pg_advisory_xact_lock(hashtextextended('cc-supplier:'||k,0));
      PERFORM 1 FROM public.command_center_suppliers WHERE supplier_key=k FOR UPDATE;
    END IF;
  END LOOP;
  saved_at:=greatest(clock_timestamp(),s.updated_at+interval '1 microsecond');
  judged_at:=greatest(saved_at,coalesce(r.judged_at,saved_at)+interval '1 microsecond');
  IF p_action='review' THEN
    INSERT INTO public.command_center_suppliers(supplier_key,supplier_name,canonical_host,homepage_url,last_seen_at,updated_at)
    VALUES(new_key,p_supplier_info->>'name',nullif(p_supplier_info->>'host',''),p_supplier_info->>'homepage',s.last_seen_at,saved_at)
    ON CONFLICT(supplier_key) DO UPDATE SET supplier_name=excluded.supplier_name,canonical_host=excluded.canonical_host,
      homepage_url=excluded.homepage_url,last_seen_at=excluded.last_seen_at,updated_at=excluded.updated_at;
    INSERT INTO public.command_center_supplier_candidates(signal_id,supplier_key,supplier_name,title,source_url,latest_score,last_seen_at)
    VALUES(s.id,new_key,p_supplier_info->>'name',s.title,s.source_url,s.score,s.last_seen_at)
    ON CONFLICT(signal_id) DO UPDATE SET supplier_key=excluded.supplier_key,supplier_name=excluded.supplier_name,
      title=excluded.title,source_url=excluded.source_url,latest_score=excluded.latest_score,last_seen_at=excluded.last_seen_at;
    INSERT INTO public.command_center_sourcing_reviews(signal_id,verdict,supplier_key,supplier_name,source_url,note,snapshot,judged_at,expires_at)
    VALUES(s.id,p_verdict,new_key,p_supplier_info->>'name',s.source_url,p_note,
      jsonb_build_object('title',s.title,'summary',s.summary,'score',s.score,'impact_yen',s.impact_yen,'payload',s.payload),
      judged_at,CASE WHEN p_verdict='miss' THEN saved_at+interval '14 days' ELSE NULL END)
    ON CONFLICT(signal_id) DO UPDATE SET verdict=excluded.verdict,supplier_key=excluded.supplier_key,supplier_name=excluded.supplier_name,
      source_url=excluded.source_url,note=excluded.note,snapshot=excluded.snapshot,judged_at=excluded.judged_at,expires_at=excluded.expires_at
    RETURNING command_center_sourcing_reviews.judged_at INTO judged_at;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='PT409',MESSAGE='sourcing_review_not_saved'; END IF;
    next_state:=CASE WHEN p_verdict='success' THEN 'accepted' ELSE 'read' END;
  ELSE
    DELETE FROM public.command_center_sourcing_reviews WHERE signal_id=s.id;
    next_state:='new';
    judged_at:=NULL;
  END IF;
  UPDATE public.command_center_signals SET review_state=next_state,
    review_note=CASE WHEN p_action='review' THEN 'sourcing:'||p_verdict ELSE NULL END,updated_at=saved_at WHERE id=s.id
    RETURNING updated_at INTO saved_at;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='PT409',MESSAGE='sourcing_signal_not_saved'; END IF;

  -- Same review/candidate-derived formulas; purchase preservation trigger stays
  -- enabled and purchase fields/notes/first-seen are never written here.
  FOR k IN SELECT DISTINCT unnest(affected) AS key ORDER BY key LOOP
    IF k IS NOT NULL THEN
      WITH reviews AS (
        SELECT count(*) FILTER(WHERE verdict='success')::int AS successes,
          count(*) FILTER(WHERE verdict='close')::int AS closes,
          count(*) FILTER(WHERE verdict='miss')::int AS misses,
          max(rv.judged_at) FILTER(WHERE verdict='success') AS last_success
        FROM public.command_center_sourcing_reviews AS rv WHERE supplier_key=k
      ), candidates AS (
        SELECT count(*)::int AS count,max(last_seen_at) AS last_seen
        FROM public.command_center_supplier_candidates WHERE supplier_key=k
      )
      UPDATE public.command_center_suppliers AS sup SET success_count=reviews.successes,close_count=reviews.closes,
        miss_count=reviews.misses,candidate_count=candidates.count,last_success_at=reviews.last_success,
        last_seen_at=coalesce(candidates.last_seen,sup.last_seen_at),
        priority_boost=CASE WHEN reviews.successes>0 THEN least(10,5+greatest(0,reviews.successes-1)*2+least(3,reviews.closes)) ELSE least(5,reviews.closes) END,
        trust_score=least(100,50+reviews.successes*15+reviews.closes*3),updated_at=saved_at
      FROM reviews,candidates WHERE sup.supplier_key=k;
    END IF;
  END LOOP;
  result:=jsonb_build_object('ok',true,'id',s.id,'state',next_state,'verdict',p_verdict,'updatedAt',saved_at,'judgedAt',judged_at);
  INSERT INTO public.command_center_mutation_receipts(operation_id,resource,action,request_hash,outcome)
    VALUES(p_operation_id,s.id,p_action,request_hash,result);
  RETURN result;
END
$rpc$;
REVOKE ALL ON FUNCTION public.command_center_apply_sourcing_review(text,text,text,text,timestamptz,timestamptz,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.command_center_apply_sourcing_review(text,text,text,text,timestamptz,timestamptz,uuid,jsonb) TO service_role;
COMMIT;
