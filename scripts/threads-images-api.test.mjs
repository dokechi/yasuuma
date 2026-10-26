import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {threadsImagesGet,threadsImagesPatch,imageBytes,imageUrl,ASSET_TASK} from '../supabase/functions/command-center-retro-api/threads-images-api.mjs';
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jBf8AAAAASUVORK5CYII=';
const row=id=>({id,task_id:'threads-library-import-v1',event_key:'choi:fixture:'+id,domain:'sns',title:'Synthetic draft',occurred_at:'2026-10-26T00:00:00Z',payload:{platform:'threads',account_name:'ちょい上等',main_post:'Original English text',post_sets_v1:{en:{first_post:'Original English text',second_reply:'Original reply'}},price:1234,posted:false}});
function fixture(){
 const rows=[row(1),row(2)],assets=[],writes=[];let beforeSave=null,failAsset=false;
 class Query{
  filters=[];single=false;value=null;
  select(){return this;}eq(k,v){this.filters.push(x=>x[k]===v);return this;}maybeSingle(){this.single=true;return this;}
  upsert(value){this.value=value;return this;}
  then(resolve,reject){return Promise.resolve().then(()=>{
   if(this.value){if(failAsset)return {error:{message:'private details'}};if(!assets.some(x=>x.task_id===this.value.task_id&&x.event_key===this.value.event_key))assets.push({...structuredClone(this.value),id:100+assets.length});return {data:null,error:null};}
   const found=[...rows,...assets].filter(x=>this.filters.every(f=>f(x)));return {data:structuredClone(this.single?found[0]||null:found),error:null};
  }).then(resolve,reject);}
 }
 const d={admin:{from:()=>new Query()},json:(_r,body,status=200)=>({status,body}),sha256:async s=>createHash('sha256').update(s).digest('hex'),now:()=> '2026-10-26T00:00:00Z',saveThreadsPayload:async(old,payload)=>{if(beforeSave){beforeSave(rows);beforeSave=null;}const current=rows.find(x=>x.id===old.id);if(!isDeepStrictEqual(current.payload,old.payload))return null;current.payload=structuredClone(payload);writes.push(structuredClone(current));return structuredClone(current);}};
 return {d,rows,assets,writes,set beforeSave(fn){beforeSave=fn;},set failAsset(x){failAsset=x;}};
}
const request=(extra={})=>({action:'threads_images_save',id:1,accountKey:'choi',expectedRevision:0,mutationId:'image-fixture-0001',images:[{dataUrl:png,label:'Original image',name:'original.png'}],...extra});
const patch=(s,b=request())=>threadsImagesPatch({},b,s.d);
const get=(s,id=1,account='choi')=>threadsImagesGet(new Request('https://example.invalid/?resource=threads-images&id='+id+'&accountKey='+account),s.d);
const good=result=>{assert.equal(result.status,200,JSON.stringify(result.body));return result.body;};
test('read is empty and read-only; upload round-trips exact bytes while original draft remains intact',async()=>{
 const s=fixture(),original=structuredClone(s.rows[0]);assert.equal(good(await get(s)).assets.length,0);assert.equal(s.writes.length,0);
 const saved=good(await patch(s));assert.equal(saved.assets[0].dataUrl,png);assert.equal(saved.manifest.revision,1);assert.equal(s.assets[0].task_id,ASSET_TASK);
 const {threads_images_v1,...rest}=s.rows[0].payload;assert.deepEqual(rest,original.payload);assert.equal(s.rows[0].occurred_at,original.occurred_at);assert.deepEqual(s.rows[1],row(2));
 assert.equal(good(await get(s)).assets[0].dataUrl,png);assert.equal(JSON.stringify(saved.manifest).includes('base64'),false);assert.equal(s.rows[0].payload.posted,false);
});
test('retry is idempotent; changed intent and stale versions cannot roll back image order',async()=>{
 const s=fixture(),first=good(await patch(s));good(await patch(s));assert.equal(s.writes.length,1);assert.equal(s.assets.length,1);
 assert.equal((await patch(s,request({images:[]}))).status,409);
 const external={url:'https://images.example.test/two.png',label:'Second'};
 const second=good(await patch(s,request({expectedRevision:1,mutationId:'image-fixture-0002',images:[{assetKey:first.manifest.images[0].assetKey,label:'Original image'},external]})));
 const third=good(await patch(s,request({expectedRevision:2,mutationId:'image-fixture-0003',images:[external,{assetKey:first.manifest.images[0].assetKey,label:'Original image'}]})));
 assert.equal(third.assets[0].url,external.url);assert.equal(third.assets[1].dataUrl,png);assert.equal(s.assets.length,1);
 assert.equal((await patch(s,request({expectedRevision:1,mutationId:'stale-fixture-0004',images:[]}))).status,409);
 assert.equal(good(await get(s)).manifest.revision,third.manifest.revision);assert.equal(second.assets.length,2);
});
test('ownership is checked for both source record and stored asset; arbitrary payload edits are rejected',async()=>{
 const s=fixture(),first=good(await patch(s));
 assert.equal((await get(s,1,'kyun')).status,409);
 assert.equal((await patch(s,request({accountKey:'kyun'}))).status,409);
 assert.equal((await patch(s,request({id:2,images:[{assetKey:first.manifest.images[0].assetKey}]}))).status,404);
 assert.equal((await patch(s,request({payload:{main_post:'overwrite'}}))).status,400);
 assert.equal((await patch(s,request({id:'task:unrelated:choi:1'}))).status,400);
 assert.equal(s.writes.length,1);
});
test('whole batch is validated first; unsafe URLs, active content, mismatched MIME and duplicates cannot be saved',async()=>{
 for(const images of [[{dataUrl:'data:image/svg+xml;base64,PHN2Zy8+'}],[{url:'javascript:alert(1)'}],[{url:'https://user:secret@example.test/a.png'}],[{dataUrl:png},{url:'http://example.test/a.png'}],[{dataUrl:png},{dataUrl:png}],Array.from({length:21},()=>({dataUrl:png}))]){
  const s=fixture();assert.equal((await patch(s,request({images}))).status,400);assert.equal(s.assets.length,0);assert.equal(s.writes.length,0);
 }
 assert.throws(()=>imageBytes(png.replace('image/png','image/jpeg')));assert.equal(imageUrl('https://a.test/x.png'),'https://a.test/x.png');assert.equal(imageUrl('https://a.test/x\\y'),'');
});
test('concurrent manuscript update preserves its content and leaves the last image manifest unchanged',async()=>{
 const s=fixture();s.beforeSave=rows=>{rows[0].payload.main_post='A newer manuscript';};
 assert.equal((await patch(s)).status,409);assert.equal(s.rows[0].payload.main_post,'A newer manuscript');assert.equal(s.rows[0].payload.threads_images_v1,undefined);assert.equal(s.writes.length,0);
 // Immutable unreferenced bytes are recoverable; retrying from the current source reuses them.
 good(await patch(s));assert.equal(s.assets.length,1);assert.equal(s.rows[0].payload.main_post,'A newer manuscript');
});
test('removing an attachment keeps original bytes and source; empty managed manifest overrides legacy URLs',async()=>{
 const s=fixture();s.rows[0].payload.post_images=['https://example.test/old.png'];assert.equal(good(await get(s)).assets.length,1);
 good(await patch(s));good(await patch(s,request({expectedRevision:1,mutationId:'remove-fixture-0002',images:[]})));
 assert.equal(good(await get(s)).assets.length,0);assert.equal(s.assets[0].payload.data_url,png);assert.deepEqual(s.rows[0].payload.post_images,['https://example.test/old.png']);
});
test('failed image persistence returns a safe error and never changes the source draft',async()=>{
 const s=fixture();s.failAsset=true;const result=await patch(s);assert.equal(result.status,500);assert.equal(result.body.error,'threads_images_save_failed');assert.equal(s.writes.length,0);assert.equal(s.rows[0].payload.threads_images_v1,undefined);
});
