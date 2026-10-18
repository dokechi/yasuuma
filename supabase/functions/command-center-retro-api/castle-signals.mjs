// Read-only, paginated snapshots for the castle. The caller enforces the existing login.
import { excludeArchivedSourcing } from "./sourcing-archive.mjs";
export async function castleSignals(admin, params) {
  const number = (key, fallback) => { const n = Number(params.get(key) ?? fallback); return Number.isFinite(n) ? Math.floor(n) : fallback; };
  const limit = Math.min(100, Math.max(1, number('limit', 100)));
  const offset = Math.max(0, number('offset', 0));
  const {data, error, count} = await excludeArchivedSourcing(admin.from('command_center_signals')
    .select('id,domain,priority,score,title,summary,reason,next_action,impact_yen,impact_label,deadline,confidence,source_title,source_url,review_state,last_seen_at,updated_at,payload', {count:'exact'}))
    .order('id', {ascending:true}).range(offset, offset + limit - 1);
  if (error) throw error;
  if (!Array.isArray(data) || !Number.isInteger(count)) throw Error('castle_signal_read_incomplete');
  if (!data.length && offset < count) throw Error('castle_signal_page_empty');
  return {rows:data, total:count, nextOffset:offset + data.length < count ? offset + data.length : null};
}
