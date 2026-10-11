// Preparation only. Not imported by a deployed API or active browser asset.
import {SaveError,expectedVersion,validCopyId} from '../_shared/save-consistency.mjs';
export function sourcingRpcParameters(body,row,supplierInfo){
  if(!body||!['sourcing_verdict','sourcing_reset'].includes(body.action)||typeof body.id!=='string'||!body.id.trim()||body.id.length>500)throw new SaveError('invalid_sourcing_mutation',400);
  const signalVersion=expectedVersion(body.expectedUpdatedAt);
  if(!Object.hasOwn(body,'expectedJudgedAt'))throw new SaveError('sourcing_review_version_required',428);
  const reviewVersion=body.expectedJudgedAt===null?null:expectedVersion(body.expectedJudgedAt);
  const operation=validCopyId(body.operationId);
  const review=body.action==='sourcing_verdict';
  if(review&&(!['success','close','miss'].includes(body.verdict)||(body.note!=null&&(typeof body.note!=='string'||body.note.length>5000))))throw new SaveError('invalid_sourcing_mutation',400);
  // RPC checks an existing receipt before checking the current signal. A deleted
  // or reclassified signal must not block replay of an already committed intent.
  const currentSource=row?.id===body.id&&row.domain==='sourcing';
  const info=review&&currentSource?supplierInfo(row.source_title,row.source_url):null;
  return {p_signal_id:body.id,p_action:review?'review':'reset',p_verdict:review?body.verdict:null,p_note:review?body.note?.trim()||null:null,
    p_expected_signal_at:signalVersion,p_expected_review_at:reviewVersion,p_operation_id:operation,
    p_supplier_info:info?{...info,sourceTitle:row.source_title,sourceUrl:row.source_url??null}:null};
}
export async function applySourcingRpc(admin,parameters){
  const {data,error}=await admin.rpc('command_center_apply_sourcing_review',parameters);
  if(error){
    if(/^PT(400|404|409|428)$/.test(error.code||''))throw new SaveError(error.message,Number(error.code.slice(2)));
    // Never fall back to the previous separate writes when RPC is unavailable.
    throw new SaveError('sourcing_atomic_save_failed',500);
  }
  if(!data?.ok)throw new SaveError('sourcing_atomic_save_failed',500);
  return data;
}
