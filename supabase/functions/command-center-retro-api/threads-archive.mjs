// Approved snapshot IDs only; never infer an archive from age, title or account.
export const ARCHIVED_THREADS_EVENT_IDS=Object.freeze([1072,1073,1074,1075,1076,1085,1086,1105]);
export function excludeArchivedThreads(query){return query.not('id','in','('+ARCHIVED_THREADS_EVENT_IDS.join(',')+')');}
