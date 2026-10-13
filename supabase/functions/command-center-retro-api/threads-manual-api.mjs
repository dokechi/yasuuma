// Owner-authenticated manual records only. Never calls Threads or changes imported evidence.
export const THREADS_TASK = 'threads-library-import-v1';
export const RESULT_CONTRACT = 'threads-manual-result-v1';
export const PROFILE_CONTRACT = 'threads-manual-profile-v1';
const TABLE = 'command_center_task_events';
const FIELDS = 'id,task_id,event_key,domain,priority,score,title,summary,source_url,impact_yen,deadline,occurred_at,payload';
const ACCOUNTS = {kyun: 'キュン拾い', choi: 'ちょい上等'};
const METRICS = ['views', 'likes', 'replies', 'reposts', 'quotes', 'clicks'];
const LIMIT = 20;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const stable = value => JSON.stringify(value, (_key, v) => record(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
class ThreadsError extends Error { constructor(code, status = 400) { super(code); this.status = status; } }
const fail = (code, status) => { throw new ThreadsError(code, status); };

// Reject URL parser repairs (backslashes, encoded paths, dot segments, whitespace),
// redirects, queries, fragments, credentials and ports before creating any link.
export function threadsUrl(value, kind) {
  if (typeof value !== 'string' || value.length > 300) fail('threads_invalid_' + kind + '_url');
  const raw = value.trim();
  const match = raw.match(/^https:\/\/(?:www\.)?(threads\.com|threads\.net)\/@([A-Za-z0-9_](?:[A-Za-z0-9_.]{0,28}[A-Za-z0-9_])?)(?:\/post\/([A-Za-z0-9_-]{1,100}))?\/?$/);
  if (!match || match[2].includes('..') || (kind === 'post') !== Boolean(match[3])) fail('threads_invalid_' + kind + '_url');
  return {url: 'https://www.threads.com/@' + match[2].toLowerCase() + (match[3] ? '/post/' + match[3] : ''), handle: match[2].toLowerCase()};
}
export function threadsAccount(row) {
  if (row?.task_id !== THREADS_TASK || row?.domain !== 'sns' || !record(row.payload) || row.payload.platform !== 'threads') fail('threads_event_not_supported', 404);
  const key = String(row.event_key || '').split(':')[0];
  if (!own(ACCOUNTS, key)) fail('threads_event_not_supported', 404);
  const identities = [row.payload.account, row.payload.account_name].filter(value => value != null);
  if (!identities.length || identities.some(value => value !== ACCOUNTS[key])) fail('threads_account_mismatch', 409);
  return key;
}
function identity(id) {
  if ((typeof id === 'number' && Number.isSafeInteger(id) && id > 0) || (typeof id === 'string' && /^[1-9]\d{0,14}$/.test(id))) return {id: Number(id)};
  if (typeof id === 'string' && id.length <= 600) {
    const match = id.match(/^(?:sns:)?task:threads-library-import-v1:(.+)$/);
    if (match && !/[\x00-\x1f]/.test(match[1])) return {key: match[1]};
  }
  fail('threads_invalid_event_id');
}
async function readEvent(d, id) {
  const ref = identity(id);
  let query = d.admin.from(TABLE).select(FIELDS).eq('task_id', THREADS_TASK);
  query = ref.id ? query.eq('id', ref.id) : query.eq('event_key', ref.key);
  const {data, error} = await query.maybeSingle();
  if (error) throw error;
  if (!data) fail('threads_event_not_found', 404);
  threadsAccount(data);
  return data;
}
async function anchor(d) {
  // Ordered, bounded pages make the first valid imported event a shared anchor.
  // GET is strictly read-only; an account without an import is not fabricated.
  for (let offset = 0; ; offset += 100) {
    const {data, error} = await d.admin.from(TABLE).select(FIELDS).eq('task_id', THREADS_TASK).eq('domain', 'sns')
      .order('id', {ascending: true}).range(offset, offset + 99);
    if (error) throw error;
    for (const row of data || []) { try { threadsAccount(row); return row; } catch (error) { if (!(error instanceof ThreadsError)) throw error; } }
    if (!data || data.length < 100) return null;
  }
}
function savedRecord(payload, field, contract, key) {
  const value = payload[field];
  if (value == null) return null;
  if (!record(value) || value.contract !== contract || value.account_key !== key || !Number.isSafeInteger(value.revision) || value.revision < 1) fail('threads_record_invalid_reload', 409);
  return value;
}
function profileFor(row, key) {
  if (!row) return null;
  const profiles = row.payload.threads_account_profiles;
  if (profiles != null && !record(profiles)) fail('threads_record_invalid_reload', 409);
  return savedRecord(profiles || {}, key, PROFILE_CONTRACT, key);
}
function projectAccount(row, key) {
  const profile = profileFor(row, key);
  const parsed = profile ? threadsUrl(profile.profile_url, 'profile') : null;
  return {accountKey: key, id: row?.id ?? null, revision: profile?.revision ?? 0, profile_url: parsed?.url ?? null, handle: parsed?.handle ?? null};
}
function envelope(body, allowed) {
  if (!record(body) || Object.keys(body).some(key => !allowed.includes(key))) fail('threads_invalid_fields');
  if (!own(ACCOUNTS, body.accountKey)) fail('threads_invalid_account');
  identity(body.id);
  if (!Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0) fail('threads_expected_revision_required', 428);
  if (typeof body.mutationId !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(body.mutationId)) fail('threads_mutation_id_required');
}
function timestamp(value, code, now) {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) fail(code);
  const parsed = Date.parse(value), date = new Date(parsed);
  if (!Number.isFinite(parsed) || parsed > Date.parse(now) + 300000 || parsed < Date.parse('2000-01-01T00:00:00Z')) fail(code);
  // Date.parse otherwise normalizes impossible calendar dates such as Feb 30.
  const [y, m, day] = value.slice(0, 10).split('-').map(Number);
  if (m < 1 || m > 12 || day < 1 || day > new Date(Date.UTC(y, m, 0)).getUTCDate()) fail(code);
  return date.toISOString();
}
function actualText(value) {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 5000 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) fail('threads_invalid_actual_text');
  return value.trim() ? value : null;
}
function metricInput(value) {
  if (value === null) return null;
  if (!record(value) || Object.keys(value).some(key => !METRICS.includes(key))) fail('threads_invalid_metrics');
  return Object.fromEntries(METRICS.map(key => {
    const n = value[key] ?? null;
    if (n !== null && (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 0 || n > 1000000000)) fail('threads_invalid_metrics');
    return [key, n];
  }));
}
function receipt(record, mutationId, fingerprint) {
  const found = (Array.isArray(record?.receipts) ? record.receipts : []).find(item => item.mutation_id === mutationId);
  if (!found) return false;
  if (found.fingerprint !== fingerprint) fail('threads_mutation_id_conflict', 409);
  return true;
}
function snapshot(value) {
  if (!value) return null;
  const {history, receipts, original_copies, ...state} = value;
  return state;
}
function nextRecord(previous, fields, body, fingerprint, now) {
  const revision = (previous?.revision ?? 0) + 1;
  return {...fields, revision, updated_at: now,
    history: [...(Array.isArray(previous?.history) ? previous.history : []), ...(previous ? [snapshot(previous)] : [])].slice(-LIMIT),
    receipts: [...(Array.isArray(previous?.receipts) ? previous.receipts : []), {mutation_id: body.mutationId, fingerprint, revision}].slice(-LIMIT)};
}
async function commit(d, row, field, value, body, fingerprint) {
  const payload = {...row.payload, [field]: value};
  // A single conditional UPDATE is atomic. Do not touch occurred_at, status,
  // draft, prices, stock, imported provenance, or any other original field.
  const data = await d.saveThreadsPayload(row, payload);
  if (data) return data;
  const current = await readEvent(d, row.id);
  if (receipt(field === 'threads_account_profiles' ? current.payload[field]?.[body.accountKey] : current.payload[field], body.mutationId, fingerprint)) return current;
  fail('threads_content_changed_reload', 409);
}
function failure(req, d, error) {
  return d.json(req, {ok: false, error: error instanceof ThreadsError ? error.message : 'threads_save_failed'}, error instanceof ThreadsError ? error.status : 500);
}
export async function threadsManualGet(req, d) {
  if (new URL(req.url).searchParams.get('resource') !== 'threads-manual-accounts') return null;
  try { const row = await anchor(d); return d.json(req, {ok: true, accounts: Object.keys(ACCOUNTS).map(key => projectAccount(row, key))}); }
  catch (error) { return failure(req, d, error); }
}
export async function threadsManualPatch(req, body, d) {
  if (!['threads_account_profile', 'threads_manual_result'].includes(body?.action)) return null;
  try {
    const profileAction = body.action === 'threads_account_profile';
    envelope(body, ['action', 'id', 'accountKey', 'expectedRevision', 'mutationId', ...(profileAction ? ['profileUrl', 'confirmAccount'] : ['postUrl', 'confirmPosted', 'actualText', 'postedAt', 'metrics', 'observedAt', 'resetForNewPost'])]);
    const key = body.accountKey, row = await readEvent(d, body.id);
    if (!profileAction && threadsAccount(row) !== key) fail('threads_account_mismatch', 409);
    const now = d.now ? d.now() : new Date().toISOString();
    const field = profileAction ? 'threads_account_profiles' : 'threads_manual_result';
    const previous = profileAction ? profileFor(row, key) : savedRecord(row.payload, field, RESULT_CONTRACT, key);
    const parsed = threadsUrl(profileAction ? body.profileUrl : body.postUrl, profileAction ? 'profile' : 'post');
    if (profileAction ? body.confirmAccount !== true : body.confirmPosted !== true) fail('threads_user_confirmation_required');
    const intent = {action: body.action, accountKey: key, id: row.id, expectedRevision: body.expectedRevision, url: parsed.url};
    if (!profileAction) {
      // An optional blank means unknown/unchanged, never erase a past result.
      if (own(body, 'actualText')) { const text = actualText(body.actualText); if (text !== null) intent.actual_text = text; }
      if (own(body, 'postedAt')) { const posted = timestamp(body.postedAt, 'threads_invalid_posted_at', now); if (posted !== null) intent.posted_at = posted; }
      if (own(body, 'metrics')) { const metrics = metricInput(body.metrics); if (metrics && METRICS.some(key => metrics[key] !== null)) intent.metrics = metrics; }
      if (own(body, 'observedAt')) {
        if (!own(intent, 'metrics')) fail('threads_metrics_required_for_observed_at');
        intent.observed_at = timestamp(body.observedAt, 'threads_invalid_observed_at', now);
        if (!intent.observed_at) fail('threads_invalid_observed_at');
      }
      if (own(body, 'resetForNewPost')) { if (body.resetForNewPost !== true) fail('threads_invalid_reset'); intent.reset_for_new_post = true; }
    }
    const fingerprint = await d.sha256(stable(intent));
    const reply = saved => profileAction ? d.json(req, {ok: true, account: projectAccount(saved, key)}) : d.json(req, {ok: true, item: d.mapEvent(saved), result: saved.payload[field]});
    if (receipt(previous, body.mutationId, fingerprint)) return reply(row);
    if ((previous?.revision ?? 0) !== body.expectedRevision) fail('threads_content_changed_reload', 409);
    const accountRow = await anchor(d);
    if (!accountRow) fail('threads_account_anchor_missing', 404);
    let state;
    if (profileAction) {
      if (accountRow.id !== row.id) fail('threads_account_anchor_changed_reload', 409);
      const otherKey = key === 'kyun' ? 'choi' : 'kyun';
      // Both account profiles live on this one payload snapshot, so the uniqueness
      // check and conditional write cannot race across independent rows.
      const other = projectAccount(row, otherKey);
      if (other.handle === parsed.handle) fail('threads_profile_used_by_other_account', 409);
      state = {contract: PROFILE_CONTRACT, account_key: key, profile_url: parsed.url, handle: parsed.handle, source: 'manual', confirmed_at: now};
    } else {
      const profile = projectAccount(accountRow, key);
      if (!profile.profile_url) fail('threads_profile_required', 409);
      if (profile.handle !== parsed.handle) fail('threads_post_account_mismatch', 409);
      const changedPost = previous && previous.post_url !== parsed.url;
      if (changedPost && body.resetForNewPost !== true) fail('threads_post_url_changed_requires_reset', 409);
      const base = changedPost ? null : previous;
      let metrics = own(intent, 'metrics') ? (intent.metrics === null ? null : {...intent.metrics, observed_at: intent.observed_at ?? now, source: 'manual'}) : base?.metrics ?? null;
      const posted_at = own(intent, 'posted_at') ? intent.posted_at : base?.posted_at ?? null;
      if (metrics && posted_at && Date.parse(metrics.observed_at) < Date.parse(posted_at)) fail('threads_observation_before_post');
      state = {contract: RESULT_CONTRACT, account_key: key, status: 'posted_manual', source: 'manual', post_url: parsed.url,
        original_copies: previous?.original_copies ?? structuredClone(Object.fromEntries(['draft', 'body_variants', 'body_options', 'main_post', 'threads_main_post', 'post_text', 'caption', 'draft_caption', 'recommended_variant', 'recommended_option', 'self_reply', 'reply_text', 'threads_reply', 'link_reply'].filter(name => own(row.payload, name)).map(name => [name, row.payload[name]]))),
        actual_text: own(intent, 'actual_text') ? intent.actual_text : base?.actual_text ?? null, posted_at, metrics,
        confirmed_at: base?.confirmed_at ?? now, account_profile_url: profile.profile_url, account_profile_revision: profile.revision};
    }
    const next = nextRecord(previous, state, body, fingerprint, now);
    const value = profileAction ? {...(row.payload.threads_account_profiles || {}), [key]: next} : next;
    return reply(await commit(d, row, field, value, body, fingerprint));
  } catch (error) { return failure(req, d, error); }
}
