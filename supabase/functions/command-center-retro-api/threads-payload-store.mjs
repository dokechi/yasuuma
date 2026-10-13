// Server-only PostgreSQL transport. SQL is constant; all evidence travels in bound
// parameters rather than PostgREST URL filters. No DDL, grants, or credential setup.
export const THREADS_PAYLOAD_UPDATE_SQL = `
UPDATE public.command_center_task_events AS event
SET payload = $1::jsonb
WHERE event.id = $2::bigint
  AND event.domain = 'sns'
  AND event.task_id = $3::text
  AND event.event_key = $4::text
  AND event.payload = $5::jsonb
RETURNING to_jsonb(event) AS row
`;
export async function saveThreadsPayload(query, row, payload) {
  if (!row || row.domain !== 'sns' || row.task_id !== 'threads-library-import-v1' || !Number.isSafeInteger(Number(row.id)) || Number(row.id) <= 0 ||
      typeof row.event_key !== 'string' || !row.event_key || !row.payload || Array.isArray(row.payload) || typeof row.payload !== 'object' ||
      !payload || Array.isArray(payload) || typeof payload !== 'object') throw new Error('threads_invalid_storage_scope');
  const parameters = [JSON.stringify(payload), Number(row.id), row.task_id, row.event_key, JSON.stringify(row.payload)];
  const rows = await query(THREADS_PAYLOAD_UPDATE_SQL, parameters);
  return rows[0]?.row ?? null;
}
