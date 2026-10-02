import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {deflateSync} from 'node:zlib';
import {affiliateGet,affiliatePatch,affiliatePublicAsset} from '../supabase/functions/command-center-retro-api/affiliate-production-api.ts';
import {HOUSE_CAMPAIGN,JOB_TASK,CAMPAIGN_TASK,ASSET_TASK,revisionOf,copyRevisionOf,digest} from '../supabase/functions/shared/affiliate-production.mjs';
const fixture=JSON.parse(await readFile(new URL('./affiliate-production-pilot.json',import.meta.url),'utf8'));
const request=()=>new Request('https://example.supabase.co/functions/v1/retro',{method:'PATCH'});
function setup(){
 const j=structuredClone(fixture),c=structuredClone(HOUSE_CAMPAIGN),fresh=new Date().toISOString();j.sources.forEach(s=>s.checked_at=fresh);j.demand.forEach(s=>s.checked_at=fresh);j.review.checked_at=fresh;c.terms_checked_at=fresh;
 const rows=[{id:1,task_id:JOB_TASK,event_key:j.id,title:j.title,occurred_at:fresh,payload:{result_kind:'affiliate_job',job:j}},{id:2,task_id:CAMPAIGN_TASK,event_key:c.id,title:c.name,occurred_at:fresh,payload:{result_kind:'affiliate_campaign',campaign:c}}];
 class Q{
  filters=[];op='select';value=null;singleResult=false;limitN=Infinity;
  select(){return this}eq(k,v){this.filters.push([k,v]);return this}order(){return this}limit(n){this.limitN=n;return this}maybeSingle(){this.singleResult=true;return this}single(){this.singleResult=true;return this}insert(v){this.op='insert';this.value=v;return this}update(v){this.op='update';this.value=v;return this}
  then(resolve,reject){return Promise.resolve().then(()=>{let matches=rows.filter(r=>this.filters.every(([k,v])=>k==='payload'?JSON.stringify(r[k])===v:r[k]===v));if(this.op==='insert'){if(rows.some(r=>r.task_id===this.value.task_id&&r.event_key===this.value.event_key))return{data:null,error:{message:'duplicate'}};const r={...this.value,id:rows.length+1};rows.push(r);matches=[r]}if(this.op==='update')matches.forEach(r=>Object.assign(r,structuredClone(this.value)));const list=matches.slice(0,this.limitN);if(this.singleResult&&this.op==='update'&&list.length!==1)return{data:null,error:{message:'concurrent_update'}};return{data:structuredClone(this.singleResult?list[0]||null:list),error:null}}).then(resolve,reject)}
 }
 const d={admin:{from:()=>new Q()},json:(_r,b,status=200)=>new Response(JSON.stringify(b),{status,headers:{'Content-Type':'application/json'}}),hmac:async v=>'sig-'+v,same:(a,b)=>a===b,cors:()=>new Headers(),token:''};return{d,rows,j,c};
}
function testPng(page,width=800,height=1000){
 const crc=b=>{let v=0xffffffff;for(const x of b){v^=x;for(let k=0;k<8;k++)v=v&1?(v>>>1)^0xedb88320:v>>>1}return(v^0xffffffff)>>>0};
 const chunk=(t,b)=>{const type=Buffer.from(t),len=Buffer.alloc(4),sum=Buffer.alloc(4);len.writeUInt32BE(b.length);sum.writeUInt32BE(crc(Buffer.concat([type,b])));return Buffer.concat([len,type,b,sum])};
 const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=2;
 const raw=Buffer.alloc((width*3+1)*height);for(let y=0;y<height;y++)raw.fill(page*20,y*(width*3+1)+1,(y+1)*(width*3+1));
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]).toString('base64');
}
async function importFinished(s){
 let r=await affiliatePatch(request(),{action:'affiliate_handoff',id:s.j.id,revision:await revisionOf(s.j,s.c)},s.d);assert.equal(r.status,200);
 const packet=await r.json();r=await affiliatePatch(request(),{action:'affiliate_import_images',id:s.j.id,revision:await revisionOf(s.j,s.c),copy_revision:packet.copy_revision,assets:s.j.slides.map((_,i)=>({page:i+1,png:testPng(i+1)}))},s.d);assert.equal(r.status,200);
 return {...s,j:s.rows[0].payload.job};
}
test('Listing exposes finished drafts and connection blockers, never PNG storage or secrets',async()=>{
 const {d}=setup();const r=await affiliateGet(new Request('https://example.com/?resource=affiliate-production'),d),data=await r.json();assert.equal(data.ok,true);assert.equal(data.jobs[0].state,'finish_wait');assert.equal(data.publisher_connected,false);assert.ok(!JSON.stringify(data).includes('test-token'));
});
test('Approval is explicit, stale revisions fail and delivery remains blocked',async()=>{
 const {d,rows,j,c}=await importFinished(setup());const rev=await revisionOf(j,c);
 let r=await affiliatePatch(request(),{action:'affiliate_approve',id:j.id,revision:'old'},d);assert.equal(r.status,409);assert.equal(rows[0].payload.job.approval,null);
 r=await affiliatePatch(request(),{action:'affiliate_approve',id:j.id,revision:rev},d);assert.equal(r.status,200);assert.equal(rows[0].payload.job.approval.revision,rev);
 r=await affiliatePatch(request(),{action:'affiliate_queue',id:j.id,revision:rev,due_at:new Date(Date.now()+600000).toISOString(),assets:[]},d);assert.equal(r.status,409);assert.equal(rows[0].payload.job.dispatch,null);
});
test('CAS prevents two concurrent approvals overwriting one another',async()=>{
 const {d,j,c}=await importFinished(setup()),body={action:'affiliate_approve',id:j.id,revision:await revisionOf(j,c)};
 const results=await Promise.all([affiliatePatch(request(),body,d),affiliatePatch(request(),body,d)]);assert.equal(results.filter(r=>r.status===200).length,1);assert.equal(results.filter(r=>r.status===409).length,1);
});
test('Campaign edits keep reader conditions and affect only owned settings',async()=>{
 const {d,rows,c}=setup();const r=await affiliatePatch(request(),{action:'affiliate_campaign',id:c.id,campaign:{affiliate_url:'https://example.com/approved',enabled:true,media_approval:'approved',media_approval_scope:'channel',media_approval_note:'actual advertiser confirmation',bio_link_confirmed:true,publisher_channel:'channel',conditions:['malicious replacement']}},d);
 assert.equal(r.status,200);assert.deepEqual(rows[1].payload.campaign.conditions,c.conditions);assert.equal(rows[1].payload.campaign.affiliate_url,'https://example.com/approved');
});
test('Sent posts cannot be approved, skipped, edited or sent again',async()=>{
 const {d,rows,j,c}=setup();rows[0].payload.job.dispatch={status:'unknown'};const rev=await revisionOf(j,c);
 for(const action of ['affiliate_approve','affiliate_skip','affiliate_queue'])assert.equal((await affiliatePatch(request(),{action,id:j.id,revision:rev},d)).status,409);
 assert.equal((await affiliatePatch(request(),{action:'affiliate_metrics',id:j.id,revision:rev,metrics:{confirmed_revenue_yen:22000,work_minutes:12}},d)).status,200);
 assert.equal(rows[0].payload.job.metrics.confirmed_revenue_yen,22000);assert.equal(rows[0].payload.job.dispatch.status,'unknown');
});
test('Asset signatures do not expose unapproved or expired content',async()=>{
 const {d,j,c}=setup(),rev=await revisionOf(j,c),expires=Date.now()+600000,u=new URL('https://example.com/?resource=affiliate-asset');
 for(const [k,v]of Object.entries({id:j.id,revision:rev,page:'1',expires:String(expires),signature:'wrong'}))u.searchParams.set(k,v);
 assert.equal((await affiliatePublicAsset(new Request(u),d)).status,403);
 u.searchParams.set('signature',await d.hmac(`affiliate-asset|${j.id}|${rev}|1|${expires}`));assert.equal((await affiliatePublicAsset(new Request(u),d)).status,403);
 u.searchParams.set('expires','1');assert.equal((await affiliatePublicAsset(new Request(u),d)).status,403);
 assert.equal(await affiliatePublicAsset(new Request('https://example.com/?resource=signals'),d),null);
});

test('SVG-only drafts cannot be approved and incomplete, duplicate or stale finished sets never replace them',async()=>{
 const s=setup(),rev=await revisionOf(s.j,s.c);
 assert.equal((await affiliatePatch(request(),{action:'affiliate_approve',id:s.j.id,revision:rev},s.d)).status,409);
 await affiliatePatch(request(),{action:'affiliate_handoff',id:s.j.id,revision:rev},s.d);
 const valid=s.j.slides.map((_,i)=>({page:i+1,png:testPng(i+1)})),base={action:'affiliate_import_images',id:s.j.id,revision:rev,copy_revision:await copyRevisionOf(s.j,s.c)};
 for(const assets of [valid.slice(1),valid.map(()=>valid[0]),valid.map((p,i)=>({...p,page:9-i})),valid.map((p,i)=>i? p:{...p,png:testPng(1,800,800)}),valid.map((p,i)=>i?p:{...p,png:p.png.slice(0,-24)})]){
  assert.equal((await affiliatePatch(request(),{...base,assets},s.d)).status,409);assert.equal(s.rows[0].payload.job.finished_images,undefined);
 }
 assert.equal((await affiliatePatch(request(),{...base,copy_revision:'0'.repeat(64),assets:valid},s.d)).status,409);
 assert.equal(s.rows.filter(r=>r.task_id===ASSET_TASK).length,0);
});
test('Imported images are read only through the authenticated route, and replacement invalidates approvals',async()=>{
 const s=await importFinished(setup()),rev=await revisionOf(s.j,s.c);
 const r=await affiliateGet(new Request(`https://example.com/?resource=affiliate-finished-images&id=${s.j.id}&revision=${rev}`),s.d),data=await r.json();assert.equal(r.status,200);assert.equal(data.assets.length,9);assert.equal(data.assets[0].png,'data:image/png;base64,'+testPng(1));
 await affiliatePatch(request(),{action:'affiliate_approve',id:s.j.id,revision:rev},s.d);
 const changed=s.j.slides.map((_,i)=>({page:i+1,png:testPng(i+11)}));const replacement=await affiliatePatch(request(),{action:'affiliate_import_images',id:s.j.id,revision:rev,copy_revision:await copyRevisionOf(s.j,s.c),assets:changed},s.d);
 assert.equal(replacement.status,200);assert.equal(s.rows[0].payload.job.approval,null);assert.notEqual(await revisionOf(s.rows[0].payload.job,s.c),rev);
 assert.equal((await affiliateGet(new Request(`https://example.com/?resource=affiliate-finished-images&id=${s.j.id}&revision=${rev}`),s.d)).status,409);
});
test('Queue sends the approved stored PNGs in page order; caller image substitution and duplicate sends fail',async()=>{
 const s=setup();Object.assign(s.c,{affiliate_url:'https://example.com/approved',media_approval:'approved',media_approval_scope:'channel',media_approval_note:'test confirmation',bio_link_confirmed:true,publisher_channel:'test-channel'});s.d.token='test-buffer-token';
 const {d,rows,j,c}=await importFinished(s),revision=await revisionOf(j,c),due_at=new Date(Date.now()+600000).toISOString();
 assert.equal((await affiliatePatch(request(),{action:'affiliate_approve',id:j.id,revision},d)).status,200);
 assert.equal((await affiliatePatch(request(),{action:'affiliate_queue',id:j.id,revision,due_at,assets:[]},d)).status,409);
 const original=globalThis.fetch;let calls=0,query;
 globalThis.fetch=async(_url,opts)=>{calls++;query=JSON.parse(opts.body).query;return new Response(JSON.stringify({data:{createPost:{post:{id:'test-provider-id',dueAt:due_at}}}}),{status:200})};
 try{assert.equal((await affiliatePatch(request(),{action:'affiliate_queue',id:j.id,revision,due_at},d)).status,200);assert.equal(calls,1);assert.ok(query.indexOf('page=1&')<query.indexOf('page=9&'));assert.equal((await affiliatePatch(request(),{action:'affiliate_queue',id:j.id,revision,due_at},d)).status,409);assert.equal(calls,1)}finally{globalThis.fetch=original}
 const released=rows.find(r=>r.event_key===`${j.id}:${revision}:1`);assert.equal(await digest(released.payload.png),j.finished_images.pages[0].sha256);
 const expires=Date.now()+600000,u=new URL('https://example.com/?resource=affiliate-asset');for(const [k,v]of Object.entries({id:j.id,revision,page:'1',expires:String(expires),signature:await d.hmac(`affiliate-asset|${j.id}|${revision}|1|${expires}`)}))u.searchParams.set(k,v);
 assert.equal((await affiliatePublicAsset(new Request(u),d)).status,200);
});
test('Recheck releases the handoff lock and removes finished image approval before automatic editing',async()=>{
 const {d,rows,j,c}=await importFinished(setup());const r=await affiliatePatch(request(),{action:'affiliate_recheck',id:j.id,revision:await revisionOf(j,c)},d);assert.equal(r.status,200);assert.equal(rows[0].payload.job.handoff,null);assert.equal(rows[0].payload.job.finished_images,null);assert.equal(rows[0].payload.job.review.status,'blocked');
});
