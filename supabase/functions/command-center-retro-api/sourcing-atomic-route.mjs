// LOCAL REVIEW ONLY. Not imported by the deployed API.
// Replace BOTH legacy sourcing mutation branches and remove their old ledger
// callbacks together. No new SQL function, role, grant, or trigger is proposed.
import {SaveError} from '../_shared/save-consistency.mjs';
import {sourcingRpcParameters,applySourcingRpc} from './sourcing-atomic-api.mjs';

export async function saveSourcingRoute(admin,body,supplierInfo){
 try{
  // Validate stable intent, then reach receipt before fetching or deriving a
  // mutable source. NULL metadata makes a fresh review fail before any write.
  const intent=sourcingRpcParameters(body,null,supplierInfo);
  const probe=await admin.rpc('command_center_apply_sourcing_review',intent);
  if(probe.error?.code==='PT409'&&probe.error.message==='sourcing_source_changed'){
   const {data:row,error}=await admin.from('command_center_signals')
    .select('id,domain,source_title,source_url').eq('id',body.id).maybeSingle();
   if(error)throw new SaveError('sourcing_atomic_save_failed',500);
   const parameters=sourcingRpcParameters(body,row,supplierInfo);
   return await applySourcingRpc(admin,parameters);
  }
  // Reset and committed replay finish on the first RPC, without a source read.
  // Forward the result through the same sanitized validation as a normal call.
  return await applySourcingRpc({rpc:async()=>probe},intent);
 }catch(error){
  if(error instanceof SaveError)throw error;
  throw new SaveError('sourcing_atomic_save_failed',500);
 }
}
