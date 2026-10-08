import { VERSION, JOB_TASK, CAMPAIGN_TASK, ASSET_TASK, HOUSE_CAMPAIGN, revisionOf, copyRevisionOf, digest, validCarouselSize, finishedIssues, productionPacket, jobState, deliveryIssues, contentIssues, httpsUrl, deliveryCaption, createBufferPost } from '../shared/affiliate-production.mjs';

type Deps = { admin: any; json: (r: Request, b: unknown, status?: number) => Response; hmac: (v: string) => Promise<string>; same: (a: string, b: string) => boolean; cors: (r: Request) => Headers; token: string };
const TABLE = 'command_center_task_events';
const now = () => new Date().toISOString();
const compact = (value: unknown, limit = 1500) => String(value || '').trim().slice(0, limit);
async function row(d: Deps, task: string, key: string) { const {data,error} = await d.admin.from(TABLE).select('id,task_id,event_key,title,payload,occurred_at').eq('task_id',task).eq('event_key',key).maybeSingle(); if(error) throw error; return data; }
async function save(d: Deps, task: string, key: string, title: string, payload: any, old?: any) {
  const record = {task_id:task,event_key:key,domain:'sns',priority:'A',score:80,title,summary:payload.result_kind === 'affiliate_campaign' ? '半自動投稿の商材設定' : '半自動投稿の制作・承認状態',occurred_at:now(),payload};
  const query = old ? d.admin.from(TABLE).update({payload,occurred_at:now()}).eq('id',old.id).eq('payload',JSON.stringify(old.payload)).select('id,payload').single() : d.admin.from(TABLE).insert(record).select('id,payload').single();
  const {data,error} = await query; if(error) throw error; return data;
}
async function campaign(d: Deps, id: string) { const r = await row(d,CAMPAIGN_TASK,id); if(r) return r.payload.campaign; if(id === HOUSE_CAMPAIGN.id) return structuredClone(HOUSE_CAMPAIGN); throw new Error('商材設定が見つかりません'); }
async function job(d: Deps, id: string) { const r = await row(d,JOB_TASK,id); if(!r || r.payload?.result_kind !== 'affiliate_job' || !r.payload?.job) throw new Error('投稿が見つかりません'); return r; }
async function withState(d: Deps, r: any) { const j = r.payload.job, c = await campaign(d,j.campaign_id); return {...j,id:r.event_key,updated_at:r.occurred_at,...await jobState(j,c,!!d.token)}; }
function assetKey(id: string, revision: string, page: number) { return `${id}:${revision}:${page}`; }
function finishedKey(id: string,set: string,page: number){return `${id}:finished:${set}:${page}`;}
function readPng(input: unknown) {
  const png=String(input||'').replace(/^data:image\/png;base64,/,'');
  if(png.length>6000000 || !/^iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/.test(png)) throw new Error('完成画像は1枚4.5MB以内のPNGにしてください');
  const bytes=Uint8Array.from(atob(png),x=>x.charCodeAt(0)),v=new DataView(bytes.buffer);let at=8,width=0,height=0,data=false,end=false;
  while(at+12<=bytes.length){const n=v.getUint32(at),type=String.fromCharCode(...bytes.slice(at+4,at+8));if(n>bytes.length-at-12)throw new Error('PNGが壊れています');if(at===8 && (type!=='IHDR'||n!==13))throw new Error('PNGのヘッダーが不正です');if(type==='IHDR'){width=v.getUint32(at+8);height=v.getUint32(at+12)}if(type==='IDAT'&&n)data=true;if(type==='IEND'){end=n===0&&at+12===bytes.length;break}at+=n+12;}
  if(!end||!data||!validCarouselSize(width,height))throw new Error('完成画像は縦4:5、幅800〜2160pxのPNGにしてください');
  return {png,width,height};
}
async function storedFinished(d: Deps,id: string,j: any,c: any) {
  const errors=finishedIssues(j,await copyRevisionOf(j,c));if(errors.length)throw new Error(errors.join(' / '));
  const out=[];
  for(const p of j.finished_images.pages){const r=await row(d,ASSET_TASK,finishedKey(id,j.finished_images.set_id,p.page)),png=r?.payload?.png;if(!png || await digest(png)!==p.sha256)throw new Error('保存した完成画像を確認してください');out.push(png)}return out;
}

// Only signed PNGs for an explicitly released post are public; no job data or
// affiliate credentials are exposed. Tokens are bound to page, revision and expiry.
export async function affiliatePublicAsset(req: Request, d: Deps): Promise<Response | null> {
  const u = new URL(req.url); if(req.method !== 'GET' || u.searchParams.get('resource') !== 'affiliate-asset') return null;
  try {
    const id = u.searchParams.get('id') || '', revision = u.searchParams.get('revision') || '', page = Number(u.searchParams.get('page')), expires = Number(u.searchParams.get('expires')), signature = u.searchParams.get('signature') || '';
    if(!id || !/^[a-f0-9]{64}$/.test(revision) || !Number.isInteger(page) || page < 1 || page > 10 || !Number.isFinite(expires) || expires < Date.now() || expires > Date.now()+15*86400000 || !d.same(signature,await d.hmac(`affiliate-asset|${id}|${revision}|${page}|${expires}`))) return d.json(req,{ok:false,error:'asset_not_authorized'},403);
    const r = await job(d,id), j = r.payload.job, c = await campaign(d,j.campaign_id);
    if(j.approval?.revision !== revision || (await revisionOf(j,c)) !== revision || !['sending','scheduled','unknown'].includes(j.dispatch?.status)) return d.json(req,{ok:false,error:'asset_not_released'},403);
    const a = await row(d,ASSET_TASK,assetKey(id,revision,page)); if(!a?.payload?.png) return d.json(req,{ok:false,error:'asset_not_found'},404);
    const bytes = Uint8Array.from(atob(a.payload.png),char=>char.charCodeAt(0));
    const h=d.cors(req);h.set('Content-Type','image/png');h.set('Cache-Control','private, max-age=300');h.set('X-Content-Type-Options','nosniff');return new Response(bytes,{headers:h});
  } catch { return d.json(req,{ok:false,error:'asset_not_found'},404); }
}

export async function affiliateGet(req: Request, d: Deps): Promise<Response | null> {
  const u = new URL(req.url);
  if(u.searchParams.get('resource')==='affiliate-finished-images'){
    try{const id=compact(u.searchParams.get('id'),220),r=await job(d,id),j=r.payload.job,c=await campaign(d,j.campaign_id);if(u.searchParams.get('revision')!==await revisionOf(j,c))return d.json(req,{ok:false,error:'最新の内容を読み直してください'},409);const assets=await storedFinished(d,id,j,c);return d.json(req,{ok:true,assets:assets.map((png,i)=>({page:i+1,png:'data:image/png;base64,'+png}))});}
    catch(e){return d.json(req,{ok:false,error:compact((e as any)?.message)},409)}
  }
  if(u.searchParams.get('resource') !== 'affiliate-production') return null;
  const [{data:jobs,error:je},{data:campaigns,error:ce},{data:runs,error:re}] = await Promise.all([
    d.admin.from(TABLE).select('event_key,payload,occurred_at').eq('task_id',JOB_TASK).order('occurred_at',{ascending:false}).limit(60),
    d.admin.from(TABLE).select('event_key,payload').eq('task_id',CAMPAIGN_TASK),
    d.admin.from(TABLE).select('event_key,title,payload,occurred_at').eq('task_id','affiliate-production-runs-v1').order('occurred_at',{ascending:false}).limit(3),
  ]); if(je)throw je;if(ce)throw ce;if(re)throw re;
  const cs=(campaigns||[]).map((r:any)=>r.payload?.campaign).filter(Boolean);if(!cs.some((c:any)=>c.id===HOUSE_CAMPAIGN.id))cs.push(HOUSE_CAMPAIGN);
  const items=await Promise.all((jobs||[]).filter((r:any)=>r.payload?.job).map(r=>withState(d,r)));
  return d.json(req,{ok:true,version:VERSION,generatedAt:now(),campaigns:cs,jobs:items,runs:runs||[],publisher_connected:!!d.token});
}

export async function affiliatePatch(req: Request, body: any, d: Deps): Promise<Response | null> {
  const action=String(body?.action||'');if(!action.startsWith('affiliate_'))return null;
  try {
    if(action==='affiliate_campaign') {
      const id=compact(body.id,100), old=await row(d,CAMPAIGN_TASK,id), c=await campaign(d,id), b=body.campaign||{};
      const url=compact(b.affiliate_url,2000);if(url&&!httpsUrl(url))throw new Error('広告リンクはHTTPSの承認済みURLを設定してください');
      const updated={...c,affiliate_url:url,enabled:b.enabled===true,media_approval:b.media_approval==='approved'?'approved':'pending',media_approval_scope:['channel','per_post'].includes(b.media_approval_scope)?b.media_approval_scope:'unknown',media_approval_note:compact(b.media_approval_note),bio_link_confirmed:b.bio_link_confirmed===true,publisher_channel:compact(b.publisher_channel,150),updated_at:now()};
      if(b.terms_verified===true)updated.terms_checked_at=now();
      await save(d,CAMPAIGN_TASK,id,c.name,{result_kind:'affiliate_campaign',version:VERSION,campaign:updated},old);
      return d.json(req,{ok:true,campaign:updated});
    }
    const id=compact(body.id,220), r=await job(d,id), j=r.payload.job, c=await campaign(d,j.campaign_id), revision=await revisionOf(j,c);
    if(body.revision!==revision)return d.json(req,{ok:false,error:'内容が更新されました。最新の画像・原稿を確認してください'},409);
    if(['sending','scheduled','unknown'].includes(j.dispatch?.status)&&action!=='affiliate_metrics')throw new Error('送信済みまたは結果確認中の投稿は変更・再送できません');
    if(action==='affiliate_skip') {
      await save(d,JOB_TASK,id,j.title,{...r.payload,job:{...j,decision:'skipped',approval:null}},r);return d.json(req,{ok:true});
    }
    if(action==='affiliate_recheck') {
      await save(d,JOB_TASK,id,j.title,{...r.payload,job:{...j,decision:null,approval:null,advertiser_review:null,handoff:null,finished_images:null,needs_recheck:true,review:{...j.review,status:'blocked',notes:'利用者が自動再確認を依頼。次の定期制作で根拠と内容を再確認する。清書画像も再取り込みが必要。'}}},r);return d.json(req,{ok:true});
    }
    if(action==='affiliate_handoff'){
      const errors=contentIssues(j,c);if(errors.length)throw new Error(errors.join(' / '));const copy_revision=await copyRevisionOf(j,c),packet=await productionPacket({...j,id},c);
      await save(d,JOB_TASK,id,j.title,{...r.payload,job:{...j,handoff:{copy_revision,exported_at:now()}}},r);return d.json(req,{ok:true,packet,copy_revision});
    }
    if(action==='affiliate_import_images'){
      const errors=contentIssues(j,c);if(errors.length)throw new Error(errors.join(' / '));const copy_revision=await copyRevisionOf(j,c);
      if(body.copy_revision!==copy_revision || j.handoff?.copy_revision!==copy_revision)throw new Error('最新の制作セットをGPTへ渡してから、その版の完成画像を取り込んでください');
      const inputs=Array.isArray(body.assets)?body.assets:[];if(inputs.length!==j.slides.length)throw new Error(`完成画像は${j.slides.length}枚すべてをページ順に取り込んでください`);
      const assets=inputs.map((p:any,i:number)=>{if(p.page!==i+1)throw new Error('完成画像のページ順を確認してください');return {...readPng(p.png),page:i+1}});
      if(assets.reduce((n,p)=>n+p.png.length,0)>32000000)throw new Error('全画像の合計は24MB以内にしてください');
      const pages=await Promise.all(assets.map(async p=>({page:p.page,width:p.width,height:p.height,sha256:await digest(p.png)})));
      if(new Set(pages.map(p=>p.sha256)).size!==pages.length)throw new Error('同じ画像が重複しています。ページ順を確認してください');
      const set_id=await digest({copy_revision,pages});
      for(const p of assets){const key=finishedKey(id,set_id,p.page),old=await row(d,ASSET_TASK,key);if(!old)await save(d,ASSET_TASK,key,`${j.title}｜清書${p.page}枚目`,{result_kind:'affiliate_finished_asset',job_id:id,set_id,page:p.page,png:p.png});}
      const updated={...j,decision:null,approval:null,advertiser_review:null,finished_images:{copy_revision,set_id,pages,imported_at:now(),review_status:'user_check_pending'}};
      await save(d,JOB_TASK,id,j.title,{...r.payload,job:updated},r);return d.json(req,{ok:true,state:await jobState(updated,c,!!d.token)});
    }
    if(action==='affiliate_approve'||action==='affiliate_confirm_manual') {
      const errors=[...contentIssues(j,c),...finishedIssues(j,await copyRevisionOf(j,c))];if(errors.length)return d.json(req,{ok:false,error:errors.join(' / ')},409);
      await storedFinished(d,id,j,c); // Approval binds the exact imported image bytes and current copy.
      const updated={...j,decision:null,...(action==='affiliate_confirm_manual'?{posting_mode:'manual'}:{}),approval:{status:'approved',revision,checked_at:now(),reviewer:'command_center_user'}};
      await save(d,JOB_TASK,id,j.title,{...r.payload,job:updated},r);return d.json(req,{ok:true,state:await jobState(updated,c,!!d.token)});
    }
    if(action==='affiliate_advertiser_review') {
      await storedFinished(d,id,j,c);
      if(!compact(body.note))throw new Error('広告主の確認結果を記録してください');
      await save(d,JOB_TASK,id,j.title,{...r.payload,job:{...j,advertiser_review:{status:'approved',revision,evidence:compact(body.note),checked_at:now()}}},r);return d.json(req,{ok:true});
    }
    if(action==='affiliate_metrics') {
      const keys=['clicks','applications','approved_count','confirmed_revenue_yen','cost_yen','work_minutes'];const values:any={};
      for(const key of keys){const n=body.metrics?.[key];if(n===null||n===undefined||n===''){values[key]=null;continue}if(!Number.isFinite(Number(n))||Number(n)<0||Number(n)>100000000)throw new Error('成果の数字を確認してください');values[key]=Number(n)}
      await save(d,JOB_TASK,id,j.title,{...r.payload,job:{...j,metrics:{...values,checked_at:now()}}},r);return d.json(req,{ok:true});
    }
    if(action==='affiliate_queue') {
      // Only jobs explicitly reviewed through the manual workflow are blocked.
      if(j.posting_mode==='manual')return d.json(req,{ok:false,error:'manual_posting_only'},403);
      const errors=deliveryIssues(j,c,!!d.token);if(j.approval?.revision!==revision||j.approval?.status!=='approved')errors.push('最新の画像・原稿が未承認');
      if(c.media_approval_scope==='per_post'&&j.advertiser_review?.revision!==revision)errors.push('最新の投稿に対する広告主確認が未完了');
      if(errors.length)return d.json(req,{ok:false,error:errors.join(' / ')},409);
      const dueAt=compact(body.due_at,50), due=Date.parse(dueAt);if(!Number.isFinite(due)||due<Date.now()+300000||due>Date.now()+10*86400000)throw new Error('予約日時は5分後〜10日後にしてください');
      const futureErrors=deliveryIssues(j,c,!!d.token,due);if(futureErrors.length)throw new Error('予約日時まで有効な根拠・広告条件を確認してください');
      const assets=await storedFinished(d,id,j,c);
      if(body.assets!==undefined)throw new Error('配信画像は保存済みの承認画像を使用します。画像の差し替えは取り込みから行ってください');
      for(let i=0;i<assets.length;i++) {
        const png=assets[i];
        const key=assetKey(id,revision,i+1), old=await row(d,ASSET_TASK,key);await save(d,ASSET_TASK,key,`${j.title}｜${i+1}枚目`,{result_kind:'affiliate_asset',job_id:id,revision,page:i+1,png},old);
      }
      const sending={...j,dispatch:{status:'sending',revision,due_at:dueAt,started_at:now()}};
      // CAS claim precedes the external mutation. An ambiguous outcome stays
      // locked for reconciliation instead of creating the same post again.
      const claimed=await save(d,JOB_TASK,id,j.title,{...r.payload,job:sending},r);
      try {
        const expires=Date.now()+14*86400000, urls=[];
        for(let i=0;i<assets.length;i++){const signature=await d.hmac(`affiliate-asset|${id}|${revision}|${i+1}|${expires}`);const u=new URL(req.url);u.search='';u.searchParams.set('resource','affiliate-asset');for(const [k,v]of Object.entries({id,revision,page:String(i+1),expires:String(expires),signature}))u.searchParams.set(k,v);urls.push(u.toString())}
        const post=await createBufferPost({token:d.token,channelId:c.publisher_channel,caption:deliveryCaption(j,c),assetUrls:urls,dueAt});
        await save(d,JOB_TASK,id,j.title,{...r.payload,job:{...sending,dispatch:{...sending.dispatch,status:'scheduled',provider:'buffer',provider_id:post.id,confirmed_at:now()}}},{...r,...claimed});
        return d.json(req,{ok:true,post});
      } catch {
        await save(d,JOB_TASK,id,j.title,{...r.payload,job:{...sending,dispatch:{...sending.dispatch,status:'unknown',error:'受付結果を確認してください。重複防止のため自動再送しません'}}},{...r,...claimed});
        return d.json(req,{ok:false,error:'予約投稿の受付結果を確認してください。重複防止のため自動再送しません'},502);
      }
    }
    return d.json(req,{ok:false,error:'unknown_affiliate_action'},400);
  } catch(e) { return d.json(req,{ok:false,error:compact((e as any)?.message||e)},409); }
}
