// Private, append-only editorial examples. No SNS calls or inferred numeric results.
export const POST_LEARNING_TASK = 'manual-post-learning-v1';
export const POST_LEARNING_CONTRACT = 'post-learning-v1';
const TABLE = 'command_center_task_events';
const FIELDS = 'id,task_id,event_key,domain,title,payload,occurred_at';
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = v => typeof v === 'string' ? v : '';
const list = v => Array.isArray(v) ? v : [];
class LearningError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const fail = (message, status) => { throw new LearningError(message, status); };

export function binding(input) {
  const kind = input.sourceKind, id = input.sourceId, account = input.accountKey, copy = input.copyKey;
  if (!['signal', 'event'].includes(kind) || typeof id !== 'string' ||
      !(kind === 'event' ? /^[1-9]\d{0,14}$/.test(id) : id.length > 0 && id.length <= 500 && !/[\u0000-\u001f\u007f]/.test(id)) ||
      !['fp', 'house', 'tiktok', 'kyun', 'choi'].includes(account) ||
      typeof copy !== 'string' || copy.length > 80 ||
      !/^(?:fp_script|fp_caption|保存主投稿|保存自己返信|保存された推奨案|保存本文案[1-9]\d?)$/.test(copy)) {
    fail('post_learning_invalid_source');
  }
  return {kind, id, account, copy};
}
function matchesAccount(row, key) {
  const p = row.payload, configs = [row, p, p.channel_configuration, p.media_configuration, p.posting_configuration].filter(object);
  const keys = ['account_name', 'account', 'channel_name', 'channel', 'brand', 'platform_account', 'posting_account', 'target_account', 'handle'];
  const values = configs.flatMap(x => keys.map(k => text(x[k]).replace(/\s/g, '').toLowerCase()));
  const targets = {kyun: ['キュン拾い', 'threadsキュン拾い'], choi: ['ちょい上等', 'threadsちょい上等'],
    tiktok: ['@sucker0508', 'sucker0508', 'tiktok@sucker0508']};
  return values.some(v => (targets[key] || []).includes(v));
}
export function sourceSnapshot(row, ref) {
  if (!row || !object(row.payload) || row.task_id === POST_LEARNING_TASK) fail('post_learning_source_not_found', 404);
  const p = row.payload;
  const fp = p.content_type === 'fp_post_candidate' || ['fp_psychology', 'fp_reaction'].includes(p.category);
  const house = p.content_type === 'house_post_candidate' || p.category === 'house_living';
  if (!(ref.account === 'fp' ? fp : ref.account === 'house' ? house : matchesAccount(row, ref.account))) {
    fail('post_learning_account_mismatch', 409);
  }
  let value = '';
  const title = text(p.post_title || p.draft_title || p.draft_cover || row.title);
  if (ref.copy === 'fp_script') {
    if (!fp && !house) fail('post_learning_copy_not_found', 404);
    const pages = list(p.draft_slides).map((slide, index) => {
      const copy = text(slide?.page_contract?.display_copy) || text(slide?.display_copy) ||
        [text(slide?.headline || slide?.title || slide?.heading), text(slide?.body || slide?.text || slide?.copy)].filter(Boolean).join('\n');
      return copy ? '【' + (index + 1) + '枚目】\n' + copy : '';
    }).filter(Boolean);
    value = ['【タイトル】', title, '', ...pages, '', '【キャプション】',
      text(p.caption || p.draft_caption || p.post_caption)].join('\n').trim();
    if (!pages.length) fail('post_learning_copy_not_found', 404);
  } else if (ref.copy === 'fp_caption') {
    if (!fp && !house) fail('post_learning_copy_not_found', 404);
    value = text(p.caption || p.draft_caption || p.post_caption);
  } else if (ref.copy === '保存主投稿') {
    value = text(p.main_post || p.threads_main_post || p.post_text || p.caption || p.draft_caption || p.draft);
  } else if (ref.copy === '保存自己返信') {
    value = text(p.self_reply || p.reply_text || p.threads_reply || p.link_reply);
  } else if (ref.copy === '保存された推奨案') {
    const v = p.recommended_variant ?? p.recommended_option;
    value = object(v) ? text(v.text || v.body || v.label) : text(v);
  } else {
    const variants = Array.isArray(p.body_variants) ? p.body_variants : list(p.body_options);
    const v = variants[Number(ref.copy.replace('保存本文案', '')) - 1];
    value = typeof v === 'string' ? v : text(v?.text || v?.body);
  }
  if (!value.trim() || value.length > 100000) fail('post_learning_copy_not_found', 404);
  return {title, text: value, draft_revision: p.draft_revision ?? null,
    content_type: p.content_type ?? null, question: text(p.reader_question || p.question_lineage?.selected_question)};
}
export function changeSummary(original, final) {
  const a = Array.from(original), b = Array.from(final);
  let start = 0, tail = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  while (tail < a.length - start && tail < b.length - start && a[a.length - tail - 1] === b[b.length - tail - 1]) tail++;
  return {changed: original !== final, from: a.slice(start, a.length - tail).join(''),
    to: b.slice(start, b.length - tail).join('')};
}
async function source(d, input) {
  const ref = binding(input), table = ref.kind === 'signal' ? 'command_center_signals' : TABLE;
  const {data, error} = await d.admin.from(table).select('*').eq('id', ref.id).maybeSingle();
  if (error) throw error;
  const original = sourceSnapshot(data, ref);
  const fingerprint = await d.sha256(JSON.stringify(original));
  const key = await d.sha256(JSON.stringify([ref.kind, ref.id, ref.account, ref.copy, fingerprint]));
  return {ref, original, fingerprint, key};
}
async function latest(d, key) {
  const {data, error} = await d.admin.from(TABLE).select(FIELDS).eq('task_id', POST_LEARNING_TASK)
    .eq('payload->>source_key', key).order('id', {ascending: false}).limit(1).maybeSingle();
  if (error) throw error;
  return data || null;
}
function project(row) {
  if (!row) return null;
  const p = row.payload;
  if (p?.contract !== POST_LEARNING_CONTRACT || !Number.isSafeInteger(p.revision) || p.revision < 1) fail('post_learning_record_invalid', 409);
  return {eventId: row.id, ...p};
}
export async function postLearningGet(req, d) {
  const u = new URL(req.url), resource = u.searchParams.get('resource');
  if (!['post-learning', 'post-learning-examples'].includes(resource)) return null;
  try {
    if (resource === 'post-learning-examples') {
      const {data, error} = await d.admin.from(TABLE).select(FIELDS).eq('task_id', POST_LEARNING_TASK)
        .order('id', {ascending: false}).limit(500);
      if (error) throw error;
      const seen = new Set(), examples = [];
      for (const row of data || []) {
        const p = project(row);
        if (seen.has(p.source_key)) continue;
        seen.add(p.source_key);
        if (u.searchParams.has('accountKey') && p.source.account !== u.searchParams.get('accountKey')) continue;
        if (p.changes.changed || p.subjective_result.status === 'buzz') examples.push(p);
        if (examples.length === 40) break;
      }
      return d.json(req, {ok: true, examples, guidance: [
        '次の原稿の前に、同じ媒体・近い題材の元文と本人の最終稿を比較する。',
        '本人が変えた口調、削った説明、冒頭、順番を次の原稿に反映する。',
        'バズは本人の体感。未評価は失敗でもゼロでもない。利益や修正の因果効果を推定しない。',
        '制度・金額・商品条件は次の題材の根拠で確認し、過去の修正文から無条件に転用しない。'
      ]});
    }
    const s = await source(d, Object.fromEntries(u.searchParams));
    return d.json(req, {ok: true, original: s.original, fingerprint: s.fingerprint, entry: project(await latest(d, s.key))});
  } catch (e) { return d.json(req, {ok: false, error: e instanceof LearningError ? e.message : 'post_learning_read_failed'}, e instanceof LearningError ? e.status : 500); }
}
export async function postLearningPatch(req, body, d) {
  if (body?.action !== 'post_learning') return null;
  try {
    if (!['save', 'buzz', 'unbuzz'].includes(body.operation) || typeof body.finalText !== 'string' ||
        !body.finalText.trim() || body.finalText.length > 100000 ||
        !Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0 ||
        typeof body.mutationId !== 'string' || !/^[A-Za-z0-9_-]{10,100}$/.test(body.mutationId)) fail('post_learning_invalid_request');
    const s = await source(d, body);
    if (body.fingerprint !== s.fingerprint) fail('post_learning_source_changed', 409);
    const previous = await latest(d, s.key), current = project(previous);
    const replay = row => row?.payload?.mutation_id === body.mutationId && row.payload.operation === body.operation && row.payload.final.text === body.finalText;
    if (replay(previous)) return d.json(req, {ok: true, entry: current, replay: true});
    if ((current?.revision || 0) !== body.expectedRevision) fail('post_learning_changed_reload', 409);
    const now = (d.now || (() => new Date().toISOString()))(), changed = current?.final.text !== body.finalText;
    let result = !changed && current ? current.subjective_result : {status: null, source: 'user_subjective', observed_at: null};
    if (body.operation === 'buzz') result = {status: 'buzz', source: 'user_subjective', observed_at: now};
    if (body.operation === 'unbuzz') result = {status: null, source: 'user_subjective', observed_at: null};
    const payload = {contract: POST_LEARNING_CONTRACT, content_type: 'post_learning_pair', source_key: s.key,
      source: {...s.ref, fingerprint: s.fingerprint}, revision: body.expectedRevision + 1, previous_event_id: previous?.id ?? null,
      original: s.original, final: {text: body.finalText}, changes: changeSummary(s.original.text, body.finalText),
      subjective_result: result, operation: body.operation, mutation_id: body.mutationId, saved_at: now};
    const row = {task_id: POST_LEARNING_TASK, event_key: s.key + ':' + payload.revision, domain: 'sns',
      priority: 'B', score: 0, title: '原稿の手直し｜' + s.original.title.slice(0,150),
      summary: '本人の修正文と体感の反応。次回制作の内部資料。', payload, occurred_at: now};
    const out = await d.admin.from(TABLE).insert(row).select(FIELDS).single();
    if (out.error) {
      const saved = await latest(d, s.key);
      if (replay(saved)) return d.json(req, {ok: true, entry: project(saved), replay: true});
      if (out.error.code === '23505') fail('post_learning_changed_reload', 409);
      throw out.error;
    }
    if (!out.data || !replay(out.data)) fail('post_learning_save_unconfirmed', 500);
    return d.json(req, {ok: true, entry: project(out.data)});
  } catch (e) { return d.json(req, {ok: false, error: e instanceof LearningError ? e.message : 'post_learning_save_failed'}, e instanceof LearningError ? e.status : 500); }
}
