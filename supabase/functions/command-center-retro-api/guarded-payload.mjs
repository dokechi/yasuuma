// A single conditional UPDATE is atomic in PostgreSQL. No compensating writes.
export class MutationError extends Error {
  constructor(code, status) { super(code); this.status = status; }
}
function record(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (record(value)) return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
export function validateSourcingVerdict(body) {
  if (!record(body) || typeof body.id !== 'string' || !body.id.trim() || body.id.length > 500 ||
      !['success', 'close', 'miss'].includes(body.verdict) ||
      (body.note != null && (typeof body.note !== 'string' || body.note.length > 5000))) {
    throw new MutationError('invalid_sourcing_verdict', 400);
  }
  return {id: body.id, verdict: body.verdict, note: body.note?.trim() || null};
}
export function mutationFailure(error) {
  // Do not expose SQL errors, personal data or infrastructure details to clients.
  return error instanceof MutationError ? {status: error.status, code: error.message} : {status: 500, code: 'mutation_failed'};
}
export async function saveGuardedPayload(admin, row, payload, fields, now = () => new Date().toISOString()) {
  if (!record(row) || typeof row.id !== 'string' || !row.id || !record(row.payload) || !record(payload)) {
    throw new MutationError('invalid_payload_update', 400);
  }
  const {data, error} = await admin.from('command_center_signals')
    .update({payload, updated_at: now()}).eq('id', row.id)
    .eq('payload', JSON.stringify(row.payload)).select(fields).maybeSingle();
  if (error) throw error;
  if (data) return data;
  // A response may have been lost after commit. Exact replay succeeds without
  // another write. A different concurrent payload must never be overwritten.
  const current = await admin.from('command_center_signals').select(fields).eq('id', row.id).maybeSingle();
  if (current.error) throw current.error;
  if (!current.data) throw new MutationError('content_signal_not_found', 404);
  if (stable(current.data.payload) === stable(payload)) return current.data;
  throw new MutationError('content_changed_reload', 409);
}
