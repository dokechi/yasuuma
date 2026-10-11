// Observation writes never carry human review columns. Conditional updates
// prevent a stale import from moving the row version backwards after a review.
export async function saveObservedSignal(admin,row){
 const {review_state,review_note,updated_at,...observed}=row;
 const inserted=await admin.from('command_center_signals').upsert({...observed,updated_at:new Date().toISOString()},{onConflict:'id',ignoreDuplicates:true}).select('id');
 if(inserted.error)throw Error('signal_ingest_failed');
 if(inserted.data?.length)return;
 for(let attempt=0;attempt<3;attempt++){
  const current=await admin.from('command_center_signals').select('updated_at').eq('id',row.id).maybeSingle();
  if(current.error||!current.data||!Number.isFinite(Date.parse(current.data.updated_at)))throw Error('signal_ingest_failed');
  const at=new Date(Math.max(Date.now(),Date.parse(current.data.updated_at)+1)).toISOString();
  const saved=await admin.from('command_center_signals').update({...observed,updated_at:at}).eq('id',row.id).eq('updated_at',current.data.updated_at).select('id');
  if(saved.error)throw Error('signal_ingest_failed');
  if(saved.data?.length)return;
 }
 throw Error('signal_ingest_conflict');
}
