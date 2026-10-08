// Authenticated FP image storage. Reuses existing JSONB events; no schema or external delivery.
export const ASSET_TASK='affiliate-assets-v1';
const TABLE='command_center_task_events';
const FP_TASKS=new Set(['6aa9ee1043388191a2eac3bb2702092a','6a9e5826d4888191a4d82a643e6d5adf']);
const CONTRACT='fp-finished-images-v1';
const text=v=>String(v??'');
const array=v=>Array.isArray(v)?v:[];
function fail(message,status=409){const e=new Error(message);e.status=status;throw e;}
export function identity(id){
 const s=text(id).replace(/^(?:sns:)+/,'');
 const m=s.match(/^task:([^:]+):(.+)$/);
 if(m){if(!FP_TASKS.has(m[1])||m[2].length>500)fail('fp_candidate_not_supported',400);return {table:TABLE,task:m[1],key:m[2]};}
 if(!/^[0-9a-f-]{36}$/i.test(s))fail('invalid_fp_id',400);
 return {table:'command_center_signals',key:s};
}
export async function candidate(d,id){
 const k=identity(id);let q=d.admin.from(k.table).select('id,title,payload'+(k.task?',task_id,event_key':''));
 q=k.task?q.eq('task_id',k.task).eq('event_key',k.key):q.eq('id',k.key);
 const {data,error}=await q.maybeSingle();if(error)throw error;
 if(!data||data.payload?.content_type!=='fp_post_candidate')fail('fp_candidate_not_found',404);
 return {row:data,identity:k,id:k.task?'task:'+k.task+':'+k.key:k.key};
}
export function editorialSnapshot(p){
  return {
    post_title:p.post_title??null,
    draft_title:p.draft_title??null,
    draft_cover:p.draft_cover??null,
    caption:p.caption??p.draft_caption??p.post_caption??null,
    page_count_reason:p.page_count_reason??null,
    question_lineage:p.question_lineage??null,
    premise_checks:Array.isArray(p.premise_checks)?p.premise_checks:[],
    draft_slides:Array.isArray(p.draft_slides)?p.draft_slides:[],
    draft_sources:Array.isArray(p.draft_sources)?p.draft_sources:[],
    entrance_contract_version:p.entrance_contract_version??null,
    entrance_options:Array.isArray(p.entrance_options)?p.entrance_options:[],
    selected_entrance:p.selected_entrance??null,
    entrance_selection:p.entrance_selection??null,
    structure_contract_version:p.structure_contract_version??null,
    story_spine:p.story_spine??null
  };
}
export function stable(value){return JSON.stringify(value,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.keys(v).sort().reduce((o,k)=>(o[k]=v[k],o),{}):v);}
export function currentEditorialSnapshot(p){
 const current=editorialSnapshot(p);
 if(p.editorial_workflow_version==='money-spine-editor-v1-20260925'){current.editorial_workflow_version=p.editorial_workflow_version;current.editorial_stage=p.editorial_stage??null;}
 return current;
}
export function fpLearningIssues(p){
 const issues=[];
 if(p.review_status==='rejected'||p.content_review?.status==='rejected')issues.push('本人不採用：制作中止');
 const r=p.editorial_review?.fp_learning_value;
 if(r?.status!=='passed'||r.checked_revision!==p.draft_revision||
  !text(r.mechanism).trim()||!text(r.primary_evidence_url).trim().match(/^https:\/\//)||
  !text(r.reader_decision_before).trim()||!text(r.reader_decision_after).trim()||
  r.reader_decision_before===r.reader_decision_after||r.specific_knowledge!==true||r.general_advice_only!==false)
  issues.push('FP採用審査待ち：具体的な仕組み・一次情報の根拠・読者の判断の変化を確認');
 return issues;
}
export function productionIssues(p){
 const issues=fpLearningIssues(p),lock=p.content_lock||{},pages=array(p.draft_slides),current=currentEditorialSnapshot(p);
 if(p.draft_status!=='ready'||lock.locked!==true||!p.draft_revision||lock.draft_revision!==p.draft_revision||!lock.locked_at)issues.push('原稿完成・同版LOCKの確認待ち');
 if(!lock.snapshot||stable(lock.snapshot)!==stable(current))issues.push('LOCKと現在の原稿snapshotが一致しません');
 for(const [key,label]of [['final_review','最終原稿審査'],['logic_institution_review','論理・制度審査']]){
  const r=p[key];if(r?.status!=='passed'||r.checked_revision!==p.draft_revision||!r.reviewed_snapshot||stable(r.reviewed_snapshot)!==stable(lock.snapshot)||array(r.unresolved_items).length)issues.push(label+'の同版snapshot確認待ち');
 }
 const review=p.pre_image_review;
 if(review?.status!=='approved_by_user'||review.checked_revision!==p.draft_revision||review.checked_locked_at!==lock.locked_at)issues.push('画像化前の本人確認待ち');
 const plan=p.image_render_plan;
 if(!plan||plan.draft_revision!==p.draft_revision||array(plan.pages).length!==pages.length||
  pages.some((s,i)=>Number(plan.pages?.[i]?.page)!==Number(s.page)||!['hero','composition','text_role'].every(k=>text(plan.pages[i][k]).trim())))issues.push('同版の画像制作計画の確認待ち');
 if(text(p.blocked_reason).trim()||array(p.missing_evidence).length||array(p.unresolved_research_items).length)issues.push('未解決事項・根拠不足があります');
 return issues;
}
export function evidenceScope(s){return {id:text(s.id),url:text(s.url),slide_no:Number(s.slide_no),capture_range:text(s.capture_range),required:s.required===true};}

export function snapshot(p){
 const pages=array(p.draft_slides).map((s,i)=>({page:Number(s.page??i+1),copy:text(s.page_contract?.display_copy)}));
 return {draft_revision:text(p.draft_revision),locked_at:text(p.content_lock?.locked_at),selected_entrance:p.selected_entrance??null,
 title:text(p.post_title||p.draft_title),caption:text(p.caption),pages};
}
export async function copyHash(d,p){return d.sha256(stable({copy:snapshot(p),editorial:currentEditorialSnapshot(p),fp_learning_value:p.editorial_review?.fp_learning_value??null,review_status:p.review_status??null,content_review:p.content_review??null,draft_status:p.draft_status,lock:p.content_lock,final_review:p.final_review,logic_institution_review:p.logic_institution_review,pre_image_review:p.pre_image_review,image_render_plan:p.image_render_plan,blocked_reason:p.blocked_reason??null,missing_evidence:array(p.missing_evidence),unresolved_research_items:array(p.unresolved_research_items),required_evidence:array(p.screenshot_requests).filter(s=>s.required).map(evidenceScope)}));}
function requireVersion(p,body){
 const gate=productionIssues(p);if(gate.length)fail('fp_editorial_gate_failed: '+gate.join('／'));
 if(!p.draft_revision||!p.content_lock?.locked_at||p.content_lock.locked!==true||p.content_lock.draft_revision!==p.draft_revision||
 body.draftRevision!==p.draft_revision||body.lockedAt!==p.content_lock.locked_at)fail('fp_copy_stale_or_unlocked');
 const pages=snapshot(p).pages;
 if(p.draft_status!=='ready'||pages.length<1||pages.length>10||pages.some((s,i)=>s.page!==i+1||!s.copy.trim()))fail('fp_copy_incomplete');
 if(text(p.blocked_reason).trim()||array(p.missing_evidence).length||array(p.unresolved_research_items).length)fail('fp_copy_unresolved');
 return pages;
}
const CRC_TABLE=Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);return c>>>0;});
export function crc32(bytes){let crc=0xffffffff;for(const b of bytes)crc=(crc>>>8)^CRC_TABLE[(crc^b)&255];return (crc^0xffffffff)>>>0;}
// Validate PNG chunks and CRCs before storing. Browser import also decodes pixels.
export function readPng(input){
 const match=text(input).match(/^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/);
 if(!match||match[1].length>8000000||match[1].length%4)fail('invalid_png',400);
 const png=match[1],raw=atob(png),b=Uint8Array.from(raw,c=>c.charCodeAt(0)),v=new DataView(b.buffer);
 if(b.length<57||[137,80,78,71,13,10,26,10].some((n,i)=>b[i]!==n))fail('invalid_png',400);
 let offset=8,width=0,height=0,idat=false,end=false;
 while(offset+12<=b.length){
  const size=v.getUint32(offset),type=String.fromCharCode(...b.slice(offset+4,offset+8));
  if(offset+size+12>b.length||crc32(b.slice(offset+4,offset+8+size))!==v.getUint32(offset+8+size))fail('invalid_png',400);
  if(offset===8){if(type!=='IHDR'||size!==13)fail('invalid_png',400);width=v.getUint32(offset+8);height=v.getUint32(offset+12);if(![0,2,3,4,6].includes(b[offset+17])||b[offset+18]!==0||b[offset+19]!==0||b[offset+20]>1)fail('invalid_png',400);}
  if(type==='IDAT'&&size>0)idat=true;
  if(type==='IEND'){if(size!==0||offset+12!==b.length)fail('invalid_png',400);end=true;break;}
  offset+=size+12;
 }
 if(!idat||!end||width<800||width>2160||height!==width*5/4)fail('png_requires_4_by_5_800_to_2160',400);
 return {png,width,height};
}
async function asset(d,key){
 const {data,error}=await d.admin.from(TABLE).select('id,payload').eq('task_id',ASSET_TASK).eq('event_key',key).maybeSingle();
 if(error)throw error;return data;
}
async function saveCandidate(d,c,p){
 const {data,error}=await d.admin.from(c.identity.table).update({payload:p,...(c.identity.task?{occurred_at:new Date().toISOString()}:{updated_at:new Date().toISOString()})})
 .eq('id',c.row.id).eq('payload',JSON.stringify(c.row.payload)).select('id,payload').single();
 if(error||!data)fail('fp_copy_changed_retry');return data;
}
export async function finished(d,c){
 const p=c.row.payload,f=p.finished_images;
 const gate=productionIssues(p);
 if(!f||f.contract!==CONTRACT)return {status:gate.length?'blocked':'missing',assets:[],issues:['完成画像は未保存です',...gate],copy_hash:await copyHash(d,p)};
 const current=await copyHash(d,p),issues=[];
 if(f.copy_hash!==current||f.draft_revision!==p.draft_revision||f.locked_at!==p.content_lock?.locked_at)
 return {status:'stale',assets:[],issues:['原稿が更新されています。旧画像を現行原稿として表示しません',...gate],copy_hash:current,manifest:f};
 if(gate.length)return {status:'blocked',assets:[],issues:gate,copy_hash:current,manifest:f};
 if(!Array.isArray(f.pages)||f.pages.length!==array(p.draft_slides).length)fail('fp_image_manifest_incomplete');
 const assets=[];
 for(const [i,page]of f.pages.entries()){
  if(page.page!==i+1)fail('fp_image_manifest_incomplete');
  const a=await asset(d,page.event_key);
  if(a?.payload?.result_kind!=='fp_finished_asset'||a.payload.candidate_id!==c.id||a.payload.set_id!==f.set_id||a.payload.page!==page.page||
    await d.sha256(a.payload.png)!==page.sha256)fail('fp_image_bytes_missing_or_changed');
  const parsed=readPng('data:image/png;base64,'+a.payload.png);
  if(parsed.width!==page.width||parsed.height!==page.height)fail('fp_image_dimensions_changed');
  assets.push({page:page.page,png:'data:image/png;base64,'+parsed.png});
 }
 if(p.channel_configuration==='unverified'||!p.channel_configuration)issues.push('投稿先の媒体設定は未確認です');
 for(const shot of array(p.screenshot_requests).filter(s=>s.required)){
  if(f.evidence?.[shot.id]?.checked!==true||stable(f.evidence[shot.id].scope)!==stable(evidenceScope(shot)))issues.push('必須資料の画像確認待ち：'+text(shot.label||shot.id));
 }
 const review=p.finished_image_review;
 const confirmed=review?.status==='confirmed_manual'&&review.copy_hash===current&&review.set_id===f.set_id;
 return {status:confirmed?'confirmed_manual':'saved_pending_review',assets,issues,copy_hash:current,manifest:f};
}
export async function fpImagesGet(req,d){
 const u=new URL(req.url),resource=u.searchParams.get('resource');if(!['fp-finished-images','fp-image-state'].includes(resource))return null;
 try{
  const c=await candidate(d,u.searchParams.get('id'));
  const current=await copyHash(d,c.row.payload);
  if(u.searchParams.get('copyHash')&&u.searchParams.get('copyHash')!==current)fail('fp_copy_changed_retry');
  if(resource==='fp-image-state'){const {assets,...state}=await finished(d,c);return d.json(req,{ok:true,id:c.id,...state,asset_count:assets.length,production_issues:productionIssues(c.row.payload)});}
  return d.json(req,{ok:true,id:c.id,...await finished(d,c),copy:snapshot(c.row.payload),draft_status:c.row.payload.draft_status,production_issues:productionIssues(c.row.payload),requirements:array(c.row.payload.screenshot_requests).filter(s=>s.required).map(s=>({id:s.id,url:s.url,label:s.label,slide_no:s.slide_no,capture_range:s.capture_range})),image_render_plan:c.row.payload.image_render_plan??null,pre_image_review:c.row.payload.pre_image_review??null,visuals:array(c.row.payload.draft_slides).map(s=>({page:s.page,role:s.role,visual_mode:s.visual_mode,visual:s.visual}))});
 }catch(e){return d.json(req,{ok:false,error:e.message},e.status||500);}
}
export async function fpImagesPatch(req,body,d){
 if(!['fp_finished_import','fp_finished_confirm_manual','fp_pre_image_confirm'].includes(body?.action))return null;
 try{
  const c=await candidate(d,body.id),p=c.row.payload;
  if(body.action==='fp_pre_image_confirm'){
   if(body.confirmed!==true)fail('fp_pre_image_user_confirmation_required');
   if(body.draftRevision!==p.draft_revision||body.lockedAt!==p.content_lock?.locked_at||body.copyHash!==await copyHash(d,p))fail('fp_copy_changed_retry');
   if(p.pre_image_review?.status==='approved_by_user'&&p.pre_image_review.checked_revision===p.draft_revision&&p.pre_image_review.checked_locked_at===p.content_lock?.locked_at&&!productionIssues(p).length)return d.json(req,{ok:true,id:c.id,...await finished(d,c)});
   const review={status:'approved_by_user',checked_revision:p.draft_revision,checked_locked_at:p.content_lock?.locked_at,checked_at:new Date().toISOString(),confirmation_scope:'public_copy_and_render_plan',source:'authenticated_user_click'};
   const next={...p,pre_image_review:review};const gate=productionIssues(next);if(gate.length)fail('fp_editorial_gate_failed: '+gate.join('／'));
   next.pre_image_review_history=[...array(p.pre_image_review_history),{previous:p.pre_image_review??null,review}];
   await saveCandidate(d,c,next);c.row.payload=next;
   return d.json(req,{ok:true,id:c.id,...await finished(d,c)});
  }
  const pages=requireVersion(p,body),copy_hash=await copyHash(d,p);
  if(body.copyHash!==copy_hash)fail('fp_copy_changed_retry');
  if(body.action==='fp_finished_import'){
   if(array(body.assets).length!==pages.length)fail('all_fp_pages_required',400);
   const inputs=body.assets.map((a,i)=>{if(a.page!==i+1)fail('fp_page_order_invalid',400);return {page:i+1,...readPng(a.png)};});
   if(inputs.reduce((n,a)=>n+a.png.length,0)>32000000)fail('png_total_over_24mb',400);
   const hashes=await Promise.all(inputs.map(a=>d.sha256(a.png)));
   if(new Set(hashes).size!==hashes.length)fail('duplicate_fp_images',400);
   // Screenshot checks are user attestations; they never imply external source verification.
   const evidence={};
   for(const shot of array(p.screenshot_requests).filter(s=>s.required)){
    const v=body.evidence?.[shot.id];
    if(v?.checked===true&&v.url===shot.url)evidence[shot.id]={checked:true,url:shot.url,scope:evidenceScope(shot),checked_at:new Date().toISOString(),reviewer:'command_center_user'};
   }
   const set_id=await d.sha256(JSON.stringify({copy_hash,hashes})),idHash=await d.sha256(c.id),manifest=[];
   for(const [i,a]of inputs.entries()){
    const event_key='fp:'+idHash+':'+set_id+':'+a.page,old=await asset(d,event_key);
    if(old){if(old.payload?.png!==a.png||old.payload?.candidate_id!==c.id)fail('fp_immutable_asset_conflict');}
    else{
     const {error}=await d.admin.from(TABLE).insert({task_id:ASSET_TASK,event_key,domain:'sns',priority:'A',score:80,title:text(c.row.title)+'｜完成'+a.page+'枚目',
      summary:'FP完成画像・本人確認待ち',occurred_at:new Date().toISOString(),payload:{result_kind:'fp_finished_asset',contract:CONTRACT,candidate_id:c.id,set_id,page:a.page,png:a.png}});
     if(error)throw error;
    }
    manifest.push({page:a.page,width:a.width,height:a.height,sha256:hashes[i],event_key});
   }
   const next={...p,image_status:'saved_pending_review',finished_image_review:null,
    finished_images:{contract:CONTRACT,draft_revision:p.draft_revision,locked_at:p.content_lock.locked_at,copy_hash,set_id,pages:manifest,evidence,saved_at:new Date().toISOString()}};
   // Asset writes are immutable. A failed CAS leaves recoverable unreferenced assets.
   const saved=await saveCandidate(d,c,next);
   return d.json(req,{ok:true,id:c.id,...await finished(d,{...c,row:{...c.row,payload:saved.payload}}),copy:snapshot(saved.payload)});
  }
  if(body.confirmed!==true||body.unchangedCopy!==true)fail('explicit_user_confirmation_required',400);
  const state=await finished(d,c);
  if(!['saved_pending_review','confirmed_manual'].includes(state.status)||state.assets.length!==pages.length)fail('fp_finished_images_required');
  if(state.issues.some(s=>s.startsWith('必須資料')))fail('required_source_image_unchecked');
  const next={...p,image_status:'confirmed_manual',finished_image_review:{status:'confirmed_manual',copy_hash,set_id:p.finished_images.set_id,
   checked_at:new Date().toISOString(),reviewer:'command_center_user',posting_mode:'manual'}};
  const saved=await saveCandidate(d,c,next);
  return d.json(req,{ok:true,id:c.id,...await finished(d,{...c,row:{...c.row,payload:saved.payload}}),copy:snapshot(saved.payload)});
 }catch(e){return d.json(req,{ok:false,error:e.message},e.status||500);}
}
