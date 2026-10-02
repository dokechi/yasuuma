import { VERSION, JOB_TASK, REVIEW_TASK, RUN_TASK, revisionOf, contentRevisionOf, sourceIssues, contentIssues, stateOf, productionPacket } from '../shared/binbo-neko.mjs';
const TABLE = 'command_center_task_events';
type Deps = {admin:any,json:Function};
async function allRows(admin:any,table:string,columns:string,task?:string) {
  const rows=[];
  for(let offset=0;offset<20000;offset+=500){let q=admin.from(table).select(columns).order(table===TABLE?'id':'signal_id',{ascending:true});if(task)q=q.eq('task_id',task);const r=await q.range(offset,offset+499);if(r.error)throw r.error;rows.push(...r.data||[]);if((r.data||[]).length<500)return {data:rows};}
  throw new Error('照合対象が多いため処理を止めました。購入・判断の確認が必要です');
}
async function context(d:Deps) {
  const [drafts, reviews, sourcing, purchases, runs, tasks] = await Promise.all([
    d.admin.from(TABLE).select('event_key,payload,occurred_at').eq('task_id',JOB_TASK).order('occurred_at',{ascending:false}).limit(200),
    allRows(d.admin,TABLE,'id,event_key,payload',REVIEW_TASK),
    allRows(d.admin,'command_center_sourcing_reviews','signal_id,verdict,note,snapshot,judged_at'),
    (async()=>{const rows=[];for(let offset=0;offset<20000;offset+=500){const r=await d.admin.from('command_center_sourcing_purchases').select('id,product_name,sku,variant,status').order('id',{ascending:true}).range(offset,offset+499);if(r.error)throw r.error;rows.push(...r.data||[]);if((r.data||[]).length<500)return {data:rows};}throw new Error('購入照合の上限に達したため処理を止めました');})(),
    d.admin.from(TABLE).select('payload,occurred_at').eq('task_id',RUN_TASK).order('occurred_at',{ascending:false}).limit(1),
    d.admin.from('command_center_tasks').select('task_id,title,is_enabled,last_run_time,schedule').eq('source',VERSION).limit(1),
  ]);
  for (const r of [drafts,reviews,sourcing,purchases,runs,tasks]) if(r.error) throw r.error;
  const jobs=[];
  for(const row of drafts.data||[]) {
    if(row.payload?.result_kind !== 'binbo_neko_draft' || !row.payload?.job) continue;
    const j={...row.payload.job};j.revision=await revisionOf(row.payload.job);j.content_revision=await contentRevisionOf(row.payload.job);
    const review=(reviews.data||[]).find((x:any)=>x.event_key===j.id)?.payload?.review||{};
    const issues=[...sourceIssues(j,sourcing.data||[],purchases.data||[]),...contentIssues(j)];
    const state=stateOf(j,review,issues);
    jobs.push({...j,review,issues,state_key:state.key,state_label:state.label});
  }
  return {jobs,reviewRows:reviews.data||[],last_run:runs.data?.[0]?.payload?.run||null,task:tasks.data?.[0]||null};
}
export async function nekoGet(req:Request,d:Deps):Promise<Response|null> {
  if(new URL(req.url).searchParams.get('resource')!=='binbo-neko') return null;
  try { const x=await context(d);return d.json(req,{ok:true,version:VERSION,jobs:x.jobs,last_run:x.last_run,task:x.task,manual:{handoff:true,photos:true,affiliate_link:true,publish:true}}); }
  catch(e) { return d.json(req,{ok:false,error:String((e as any)?.message||e)},500); }
}
export async function nekoPatch(req:Request,b:any,d:Deps):Promise<Response|null> {
  const action=String(b?.action||'');if(!action.startsWith('neko_'))return null;
  if(!['neko_packet','neko_copied','neko_skip','neko_recheck'].includes(action))return d.json(req,{ok:false,error:'この画面では制作の確認だけを扱います'},400);
  try {
    const x=await context(d),j=x.jobs.find((v:any)=>v.id===String(b.id||''));
    if(!j)return d.json(req,{ok:false,error:'原稿が見つかりません'},404);
    if(b.revision!==j.revision)return d.json(req,{ok:false,error:'原稿が更新されています。画面を再読込してください'},409);
    if(['neko_packet','neko_copied'].includes(action)&&!['ready','copied'].includes(j.state_key))return d.json(req,{ok:false,error:'条件の自動再確認が必要です',issues:j.issues},409);
    if(action==='neko_packet')return d.json(req,{ok:true,packet:productionPacket(j),revision:j.revision});
    const timestamp=new Date().toISOString(),review={...j.review};
    if(action==='neko_copied'){review.copied_revision=j.revision;review.copied_content_revision=j.content_revision;review.copied_at=timestamp;}
    if(action==='neko_skip'){review.state='skipped';review.skipped_at=timestamp;}
    if(action==='neko_recheck'){review.state='pending';review.recheck_requested_at=timestamp;}
    const old=x.reviewRows.find((v:any)=>v.event_key===j.id),payload={version:VERSION,result_kind:'binbo_neko_review',review};
    let result;
    if(old)result=await d.admin.from(TABLE).update({payload,occurred_at:timestamp}).eq('id',old.id).eq('payload',JSON.stringify(old.payload)).select('id').maybeSingle();
    else result=await d.admin.from(TABLE).insert({task_id:REVIEW_TASK,event_key:j.id,domain:'sns',priority:'B',score:70,title:'貧乏ねこ｜制作の確認',summary:action==='neko_copied'?'AIへ渡す一式をコピー済み':'紹介用原稿の確認状態',payload,occurred_at:timestamp}).select('id').single();
    if(result.error)throw result.error;if(!result.data)return d.json(req,{ok:false,error:'別の操作で更新されています。再読込してください'},409);
    return d.json(req,{ok:true,review});
  }catch(e){return d.json(req,{ok:false,error:String((e as any)?.message||e)},500);}
}
