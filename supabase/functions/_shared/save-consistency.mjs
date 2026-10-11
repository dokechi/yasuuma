// Used only with server-selected tables. No new RPC, ACL or credential.
export class SaveError extends Error {
  constructor(code, status) { super(code); this.status = status; }
}
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)$/;
export function expectedVersion(value) {
  if (value == null || value === '') throw new SaveError('save_version_required', 428);
  if (typeof value !== 'string' || !timestamp.test(value) || !Number.isFinite(Date.parse(value))) throw new SaveError('invalid_save_version', 400);
  return value; // Preserve PostgreSQL microseconds; never round the predicate.
}
function micros(value) {
  const fraction = (value.match(/\.(\d+)/)?.[1] || '').padEnd(6, '0');
  return BigInt(Date.parse(value.replace(/\.\d+/, ''))) * 1000n + BigInt(fraction);
}
export function nextVersion(previous, now = new Date().toISOString()) {
  const value = micros(now) > micros(previous) ? micros(now) : micros(previous) + 1n;
  return new Date(Number(value / 1000n)).toISOString().replace(/\.\d{3}Z$/, '.' + String(value % 1000000n).padStart(6, '0') + 'Z');
}
export async function saveVersionedRow(db, table, id, update, expectedUpdatedAt, fields = '*') {
  const expected = expectedVersion(expectedUpdatedAt);
  const {data, error} = await db.from(table).update({...update, updated_at: nextVersion(expected)})
    .eq('id', id).eq('updated_at', expected).select(fields).maybeSingle();
  if (error) throw error;
  if (!data) throw new SaveError('save_conflict_reload', 409);
  return data;
}
export function validCopyId(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new SaveError('invalid_copy_event_id', 400);
  return value;
}
function sameReceipt(row, intent) {
  return ['candidate_id', 'platform', 'draft_type', 'relative_stage', 'text_snapshot'].every(key => row[key] === intent[key]) &&
    ['deadline_snapshot', 'created_at'].every(key => row[key] == null && intent[key] == null || row[key] != null && intent[key] != null && new Date(row[key]).toISOString() === new Date(intent[key]).toISOString());
}
export async function saveCopyEvent(db, intent, beforeInsert = () => {}) {
  validCopyId(intent.client_event_id);
  const read = () => db.from('command_center_card_copy_history').select('*').eq('client_event_id', intent.client_event_id).maybeSingle();
  const replay = row => {
    if (!sameReceipt(row, intent)) throw new SaveError('copy_event_id_reused', 409);
    return row;
  };
  const existing = await read();
  if (existing.error) throw existing.error;
  if (existing.data) return replay(existing.data); // Check receipt before current deadline validation.
  beforeInsert();
  const inserted = await db.from('command_center_card_copy_history').insert(intent).select('*').single();
  if (inserted.error?.code === '23505') {
    const raced = await read();
    if (raced.error) throw raced.error;
    if (!raced.data) throw inserted.error;
    return replay(raced.data);
  }
  if (inserted.error) throw inserted.error;
  return inserted.data;
}
