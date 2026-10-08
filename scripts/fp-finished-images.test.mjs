import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {fpImagesPatch,fpImagesGet,copyHash,finished,readPng,crc32,identity,currentEditorialSnapshot,productionIssues} from '../supabase/functions/command-center-retro-api/fp-finished-images-api.mjs';
function png(color,width=1080,height=1350){
 const chunk=(type,data)=>{const t=Buffer.from(type),body=Buffer.concat([t,data]),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);body.copy(out,4);out.writeUInt32BE(crc32(body),out.length-4);return out;};
 const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=0;
 const rows=Buffer.alloc((width+1)*height,color);for(let y=0;y<height;y++)rows[y*(width+1)]=0;
 return 'data:image/png;base64,'+Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]).toString('base64');
}
function memoryDb(initial){
 const tables=new Map(Object.entries(initial));let writes=0,serial=0,forceCasFailure=false;
 const admin={from(table){
  const filters=[];let action='select',value;
  const q={select(){return q;},eq(k,v){filters.push([k,v]);return q;},update(v){action='update';value=v;return q;},insert(v){action='insert';value=v;return q;},
   async maybeSingle(){return execute(false);},async single(){return execute(true);},then(resolve,reject){return Promise.resolve(execute(false)).then(resolve,reject);}};
  function execute(single){
   const rows=tables.get(table)||[];tables.set(table,rows);
   const matches=row=>filters.every(([k,v])=>k==='payload'?JSON.stringify(row.payload)===v:row[k]===v);
   if(action==='insert'){writes++;const row={...structuredClone(value),id:'asset-'+(++serial)};rows.push(row);return {data:row,error:null};}
   const row=rows.find(matches);
   if(action==='update'){if(forceCasFailure||!row)return {data:null,error:{message:'CAS mismatch'}};writes++;Object.assign(row,structuredClone(value));}
   return {data:row?structuredClone(row):null,error:single&&!row?{message:'missing'}:null};
  }
  return q;
 }};
 return {admin,tables,get writes(){return writes;},failCas(v){forceCasFailure=v;}};
}
export async function runFpImageContractTests(){
 const id='task:6aa9ee1043388191a2eac3bb2702092a:money-chat:test-images',payload={content_type:'fp_post_candidate',draft_status:'ready',draft_revision:'r1',
  content_lock:{locked:true,draft_revision:'r1',locked_at:'lock1'},draft_slides:[{page:1,page_contract:{display_copy:'全文1'}},{page:2,page_contract:{display_copy:'全文2'}}],
  caption:'投稿文',post_title:'original',channel_configuration:'unverified',screenshot_requests:[{id:'official',required:true,url:'https://www.stat.go.jp/evidence.pdf',label:'公式グラフ',slide_no:2}],retained:{doNotLose:true},image_history:[{old:'keep'}]};
 payload.image_render_plan={draft_revision:'r1',pages:payload.draft_slides.map(s=>({page:s.page,hero:'defined',composition:'defined',text_role:'defined'}))};
 payload.pre_image_review={status:'approved_by_user',checked_revision:'r1',checked_locked_at:'lock1'};
 payload.content_lock.snapshot=currentEditorialSnapshot(payload);
 for(const key of ['final_review','logic_institution_review'])payload[key]={status:'passed',checked_revision:'r1',reviewed_snapshot:structuredClone(payload.content_lock.snapshot),unresolved_items:[]};
 assert.deepEqual(productionIssues(payload),[]);
 // Separate user pre-image action, never inferred from an editorial review.
 const pre=structuredClone(payload);pre.pre_image_review={status:'not_required',required:false};
 const preDb=memoryDb({command_center_task_events:[{id:'before',task_id:'6aa9ee1043388191a2eac3bb2702092a',event_key:'money-chat:test-images',title:'original',payload:structuredClone(pre)}]});
 const preD={admin:preDb.admin,sha256:async s=>createHash('sha256').update(s).digest('hex'),json:(_r,b,status=200)=>({body:b,status})};
 const preBody={action:'fp_pre_image_confirm',id,draftRevision:'r1',lockedAt:'lock1',copyHash:await copyHash(preD,pre),confirmed:true};
 const preRow=preDb.tables.get('command_center_task_events')[0];
 for(const change of [
  {confirmed:false},{copyHash:'old'}
 ]){const r=await fpImagesPatch({}, {...preBody,...change},preD);assert.equal(r.status,409);assert.equal(preDb.writes,0);}
 for(const mutate of [
  p=>{p.logic_institution_review.status='pending';},p=>{p.image_render_plan.pages=[];},p=>{p.content_lock.locked=false;}
 ]){preRow.payload=structuredClone(pre);mutate(preRow.payload);const b={...preBody,copyHash:await copyHash(preD,preRow.payload)};
  const r=await fpImagesPatch({},b,preD);assert.equal(r.status,409);assert.equal(preDb.writes,0);}
 preRow.payload=structuredClone(pre);preDb.failCas(true);
 const preRace=await fpImagesPatch({},preBody,preD);assert.equal(preRace.status,409);assert.equal(preRow.payload.pre_image_review.status,'not_required');
 preDb.failCas(false);const accepted=await fpImagesPatch({},preBody,preD);
 assert.equal(accepted.status,200);assert.equal(preRow.payload.pre_image_review.status,'approved_by_user');
 assert.equal(preRow.payload.pre_image_review.checked_locked_at,'lock1');assert.equal(preRow.payload.pre_image_review_history[0].previous.status,'not_required');
 assert.equal(preRow.payload.finished_images,undefined);assert.deepEqual(preRow.payload.draft_slides,pre.draft_slides);

 const db=memoryDb({command_center_task_events:[{id:'candidate',task_id:'6aa9ee1043388191a2eac3bb2702092a',event_key:'money-chat:test-images',title:'original',payload:structuredClone(payload)}]});
 const d={admin:db.admin,sha256:async s=>createHash('sha256').update(s).digest('hex'),json:(_req,b,status=200)=>({body:b,status})};
 const body={action:'fp_finished_import',id,draftRevision:'r1',lockedAt:'lock1',copyHash:await copyHash(d,payload),assets:[{page:1,png:png(10)},{page:2,png:png(20)}]};
 assert.equal(readPng(body.assets[0].png).width,1080);
 const seed=db.tables.get('command_center_task_events')[0];
 const invalid=[
  p=>{p.final_review.status='pending';},p=>{p.logic_institution_review.checked_revision='old';},
  p=>{p.content_lock.snapshot.caption='changed';},p=>{p.pre_image_review.status='not_required';},
  p=>{p.image_render_plan.pages[0].hero='';},p=>{p.content_lock.locked=false;},
  p=>{p.draft_status='blocked';},p=>{p.missing_evidence=['new gap'];}
 ];
 for(const mutate of invalid){seed.payload=structuredClone(payload);mutate(seed.payload);
  const response=await fpImagesPatch({},body,d);assert.equal(response.status,409);assert.equal(db.writes,0);}
 seed.payload=structuredClone(payload);
 assert.throws(()=>identity('task:unrelated:record'));
 const stale=await fpImagesPatch({}, {...body,draftRevision:'old'},d);assert.equal(stale.status,409);assert.equal(db.writes,0);
 const duplicate=await fpImagesPatch({}, {...body,assets:[body.assets[0],{page:2,png:body.assets[0].png}]},d);assert.equal(duplicate.status,400);assert.equal(db.writes,0);
 const bad=await fpImagesPatch({}, {...body,assets:[{page:2,png:png(10)},body.assets[1]]},d);assert.equal(bad.status,400);assert.equal(db.writes,0);
 const corrupt=body.assets[0].png.slice(0,-8)+'AAAAAAAA';assert.throws(()=>readPng(corrupt));
 const saved=await fpImagesPatch({},body,d);assert.equal(saved.status,200);assert.equal(saved.body.status,'saved_pending_review');assert.equal(saved.body.assets.length,2);
 const candidate=db.tables.get('command_center_task_events').find(r=>r.id==='candidate');
 assert.deepEqual(candidate.payload.retained,{doNotLose:true});assert.deepEqual(candidate.payload.image_history,[{old:'keep'}]);
 const countAssets=()=>db.tables.get('command_center_task_events').filter(r=>r.payload.result_kind==='fp_finished_asset').length;
 assert.equal(countAssets(),2);
 const reread=await fpImagesGet({url:'https://api.example/?resource=fp-finished-images&id='+encodeURIComponent(id)},d);
 assert.equal(reread.status,200);
 const alias=await fpImagesGet({url:'https://api.example/?resource=fp-finished-images&id='+encodeURIComponent('sns:'+id)},d);assert.equal(alias.status,200);assert.equal(alias.body.id,id);assert.equal(reread.body.assets[0].png,body.assets[0].png);
 const unchecked=await fpImagesPatch({}, {...body,action:'fp_finished_confirm_manual',confirmed:true,unchangedCopy:true},d);assert.equal(unchecked.status,409);
 const evidence=await fpImagesPatch({}, {...body,evidence:{official:{checked:true,url:payload.screenshot_requests[0].url}}},d);assert.equal(evidence.status,200);assert.equal(countAssets(),2);
 const confirmed=await fpImagesPatch({}, {...body,action:'fp_finished_confirm_manual',confirmed:true,unchangedCopy:true},d);
 assert.equal(confirmed.status,200);assert.equal(confirmed.body.status,'confirmed_manual');assert.ok(confirmed.body.issues.some(s=>s.includes('媒体設定')));
 const valid=structuredClone(candidate.payload);
 for(const mutate of [
  p=>{p.content_lock.locked=false;},p=>{p.draft_status='blocked';},p=>{p.missing_evidence=['new gap'];},
  p=>{p.final_review.status='failed';},p=>{p.logic_institution_review.reviewed_snapshot.caption='changed';},
  p=>{p.pre_image_review.checked_revision='old';},p=>{p.image_render_plan.pages[0].composition='';},
  p=>{p.screenshot_requests[0].slide_no=1;},p=>{p.screenshot_requests[0].capture_range='different crop';}
 ]){
  candidate.payload=structuredClone(valid);mutate(candidate.payload);
  const read=await fpImagesGet({url:'https://api.example/?resource=fp-finished-images&id='+encodeURIComponent(id)},d);
  assert.ok(['stale','blocked'].includes(read.body.status));assert.equal(read.body.assets.length,0);
  const list=await fpImagesGet({url:'https://api.example/?resource=fp-image-state&id='+encodeURIComponent(id)},d);
  assert.equal(list.body.status,read.body.status);assert.equal(list.body.assets,undefined);assert.equal(list.body.asset_count,0);
  const approve=await fpImagesPatch({}, {...body,action:'fp_finished_confirm_manual',confirmed:true,unchangedCopy:true},d);assert.equal(approve.status,409);
 }
 candidate.payload=structuredClone(valid);
 candidate.payload.draft_slides[0].page_contract.display_copy='改訂した全文';
 const mismatch=await fpImagesGet({url:'https://api.example/?resource=fp-finished-images&id='+encodeURIComponent(id)},d);
 assert.equal(mismatch.status,200);assert.equal(mismatch.body.status,'stale');assert.equal(mismatch.body.assets.length,0);
 candidate.payload.draft_slides[0].page_contract.display_copy='全文1';
 const asset=db.tables.get('command_center_task_events').find(r=>r.payload.result_kind==='fp_finished_asset');
 asset.payload.png=body.assets[1].png.split(',')[1];
 const bytes=await fpImagesGet({url:'https://api.example/?resource=fp-finished-images&id='+encodeURIComponent(id)},d);assert.equal(bytes.status,409);
 asset.payload.png=body.assets[0].png.split(',')[1];
 db.failCas(true);const race=await fpImagesPatch({},body,d);assert.equal(race.status,409);
 assert.equal(candidate.payload.finished_image_review.status,'confirmed_manual');
 return {passed:36,assets:countAssets(),liveDb:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(await runFpImageContractTests());
