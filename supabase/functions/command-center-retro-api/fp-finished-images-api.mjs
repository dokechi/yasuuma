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
 return {row:data,identity:k,id:text(id)};
}
export function snapshot(p){
 const pages=array(p.draft_slides).map((s,i)=>({page:Number(s.page??i+1),copy:text(s.page_contract?.display_copy)}));
 return {draft_revision:text(p.draft_revision),locked_at:text(p.content_lock?.locked_at),selected_entrance:p.selected_entrance??null,
 title:text(p.post_title||p.draft_title),caption:text(p.caption),pages};
}
export async function copyHash(d,p){return d.sha256(JSON.stringify(snapshot(p)));}
function requireVersion(p,body){
 if(!p.draft_revision||!p.content_lock?.locked_at||p.content_lock.locked!==true||p.content_lock.draft_revision!==p.draft_revision||
 body.draftRevision!==p.draft_revision||body.lockedAt!==p.content_lock.locked_at)fail('fp_copy_stale_or_unlocked');
 const pages=snapshot(p).pages;
 if(p.draft_status!=='ready'||pages.length<1||pages.length>10||pages.some((s,i)=>s.page!==i+1||!s.copy.trim()))fail('fp_copy_incomplete');
 if(text(p.blocked_reason).trim()||array(p.missing_evidence).length||array(p.unresolved_research_items).length)fail('fp_copy_unresolved');
 return pages;
}
// Validate PNG structure before storing. Browser import also decodes the image.
export function readPng(input){
 const match=text(input).match(/^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/);
 if(!match||match[1].length>8000000||match[1].length%4)fail('invalid_png',400);
 const png=match[1],raw=atob(png),b=Uint8Array.from(raw,c=>c.charCodeAt(0)),v=new DataView(b.buffer);
 if(b.length<57||[137,80,78,71,13,10,26,10].some((n,i)=>b[i]!==n))fail('invalid_png',400);
 let offset=8,width=0,height=0,idat=false,end=false;
 while(offset+12<=b.length){
  const size=v.getUint32(offset),type=String.fromCharCode(...b.slice(offset+4,offset+8));
  if(offset+size+12>b.length)fail('invalid_png',400);
  if(offset===8){if(type!=='IHDR'||size!==13)fail('invalid_png',400);width=v.getUint32(offset+8);height=v.getUint32(offset+12);}
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
 if(!f||f.contract!==CONTRACT)return {status:'missing',assets:[],issues:['完成画像は未保存です'],copy_hash:await copyHash(d,p)};
 const current=await copyHash(d,p),issues=[];
 if(f.copy_hash!==current||f.draft_revision!==p.draft_revision||f.locked_at!==p.content_lock?.locked_at)
 return {status:'stale',assets:[],issues:['原稿が更新されています。旧画像を現行原稿として表示しません'],copy_hash:current,manifest:f};
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
  if(f.evidence?.[shot.id]?.checked!==true||f.evidence[shot.id].url!==shot.url)issues.push('必須資料の画像確認待ち：'+text(shot.label||shot.id));
 }
 const review=p.finished_image_review;
 const confirmed=review?.status==='confirmed_manual'&&review.copy_hash===current&&review.set_id===f.set_id;
 return {status:confirmed?'confirmed_manual':'saved_pending_review',assets,issues,copy_hash:current,manifest:f};
}
export async function fpImagesGet(req,d){
 const u=new URL(req.url);if(u.searchParams.get('resource')!=='fp-finished-images')return null;
 try{
  const c=await candidate(d,u.searchParams.get('id'));
  const current=await copyHash(d,c.row.payload);
  if(u.searchParams.get('copyHash')&&u.searchParams.get('copyHash')!==current)fail('fp_copy_changed_retry');
  return d.json(req,{ok:true,id:c.id,...await finished(d,c),copy:snapshot(c.row.payload),draft_status:c.row.payload.draft_status,requirements:array(c.row.payload.screenshot_requests).filter(s=>s.required).map(s=>({id:s.id,url:s.url,label:s.label,slide_no:s.slide_no,capture_range:s.capture_range})),visuals:array(c.row.payload.draft_slides).map(s=>({page:s.page,role:s.role,visual_mode:s.visual_mode,visual:s.visual}))});
 }catch(e){return d.json(req,{ok:false,error:e.message},e.status||500);}
}
export async function fpImagesPatch(req,body,d){
 if(!['fp_finished_import','fp_finished_confirm_manual'].includes(body?.action))return null;
 try{
  const c=await candidate(d,body.id),p=c.row.payload,pages=requireVersion(p,body),copy_hash=await copyHash(d,p);
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
    if(v?.checked===true&&v.url===shot.url)evidence[shot.id]={checked:true,url:shot.url,checked_at:new Date().toISOString(),reviewer:'command_center_user'};
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
