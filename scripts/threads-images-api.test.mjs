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
test('insurance attachments preserve draft and reject wrong identity or asset owner',async()=>{
 const s=fixture();s.rows[0]={...s.rows[0],task_id:'insurance-threads-v1',event_key:'2026-10-29-1',payload:{account:'保険',handle:'@sucker0508',draft:'完成原稿'}};
 const first=good(await patch(s,request({accountKey:'insurance'})));assert.equal(first.assets[0].dataUrl,png);assert.equal(s.rows[0].payload.draft,'完成原稿');
 assert.equal(good(await get(s,1,'insurance')).assets.length,1);
 assert.equal((await get(s,1,'kyun')).status,409);
 s.rows[1]={...s.rows[0],id:2,event_key:'2026-10-29-2',payload:{account:'保険',handle:'@sucker0508',draft:'別原稿'}};
 assert.equal((await patch(s,request({id:2,accountKey:'insurance',images:[{assetKey:first.assets[0].assetKey}]}))).status,404);
 s.rows[0].payload.handle='@another';assert.notEqual((await get(s,1,'insurance')).status,200);
});


test('all current publishing tasks save and reload images without changing manuscript evidence',async()=>{
 for(const [account,task]of [['otoku','otoku-threads-v1'],['rakuten','rakuten-threads-v1'],['lottery','lottery-threads-v1'],['tanaka','tanaka-threads-v1']]){
  const s=fixture(),target={id:3,task_id:task,event_key:'synthetic-'+account,domain:'sns',title:'Synthetic '+account,payload:{draft:'Exact '+account+' body',reply:'Exact reply',posted:false}};s.rows.push(target);const before=structuredClone(target.payload);
  const result=await patch(s,request({id:3,accountKey:account}));good(result);assert.equal(result.body.accountKey,account);assert.equal(result.body.assets.length,1);assert.equal(target.payload.draft,before.draft);assert.equal(target.payload.reply,before.reply);assert.equal(target.payload.posted,false);
  const loaded=await get(s,3,account);good(loaded);assert.equal(loaded.body.assets[0].dataUrl,png);assert.equal(loaded.body.manifest.revision,1);
 }
});
test('publishing image scope rejects wrong category, non-publishing rows and non-sns records before any write',async()=>{
 for(const [task,domain,account]of [['rakuten-threads-v1','sns','insurance'],['unrelated-task','sns','rakuten'],['rakuten-threads-v1','money','rakuten']]){const s=fixture();s.rows.push({id:3,task_id:task,event_key:'synthetic',domain,title:'Synthetic',payload:{draft:'preserve'}});const result=await patch(s,request({id:3,accountKey:account}));assert.ok(result.status>=400);assert.equal(s.assets.length,0);assert.equal(s.writes.length,0);}
});
test('preview reads only first attachment while preserving full saved order and never writing',async()=>{
 const s=fixture();good(await patch(s,request({images:[{dataUrl:png,label:'first'},{url:'https://example.invalid/second.png',label:'second'}]})));const before=JSON.stringify(s.writes),result=await threadsImagesGet(new Request('https://example.invalid/?resource=threads-images&id=1&accountKey=choi&preview=1'),s.d);good(result);assert.equal(result.body.assets.length,1);assert.equal(result.body.manifest.images.length,2);assert.equal(result.body.assets[0].dataUrl,png);assert.equal(JSON.stringify(s.writes),before);
});

test('fixed insurance and S account GET resolves exact identities read-only and rejects impersonation',async()=>{
 for(const [account,task,name,handle] of [['insurance','insurance-threads-v1','保険','@sucker0508'],['skun','skun-threads-v1','Sくん','@skun.koi']]){
  const s=fixture();s.rows[0]={...s.rows[0],task_id:task,payload:{account:name,handle,post_images:['https://example.test/finished.png']}};
  const before=JSON.stringify(s.rows),result=good(await get(s,1,account));
  assert.equal(result.accountKey,account);assert.equal(result.assets[0].url,'https://example.test/finished.png');assert.equal(result.assets[0].label,'1枚目');
  assert.equal(JSON.stringify(s.rows),before);assert.equal(s.writes.length,0);assert.equal(s.assets.length,0);
  assert.equal((await get(s,1,'wrong-account')).status,409);
  for(const payload of [{account:'other',handle},{account:name,handle:'@other'},{account:name},{handle}]){
   s.rows[0].payload=payload;assert.equal((await get(s,1,account)).status,404);assert.equal(s.writes.length,0);
  }
 }
});
test('image scope never accepts object prototype keys as publishing task identities',async()=>{
 for(const task_id of ['constructor','toString','__proto__']){
  const s=fixture();s.rows[0]={...s.rows[0],task_id};assert.equal((await get(s,1,'skun')).status,404);
 }
});
test('S account uploads remain bound to its exact identity and immutable owner',async()=>{
 const s=fixture();s.rows[0]={...s.rows[0],task_id:'skun-threads-v1',payload:{account:'Sくん',handle:'@skun.koi',draft:'Synthetic original'}};
 const result=good(await patch(s,request({accountKey:'skun'})));assert.equal(result.assets[0].dataUrl,png);assert.equal(s.assets[0].payload.account_key,'skun');assert.equal(s.rows[0].payload.draft,'Synthetic original');
 s.rows[0].payload.handle='@other';assert.equal((await patch(s,request({accountKey:'skun',expectedRevision:1,mutationId:'second-fixture-0001'}))).status,404);assert.equal(s.writes.length,1);
});
test('image endpoint source uses ASCII-safe identity and label literals for deployment transport',async()=>{
 const {readFile}=await import('node:fs/promises');
 for(const name of ['publishing-image-scope.mjs','threads-images-api.mjs']){
  const source=await readFile(new URL('../supabase/functions/command-center-retro-api/'+name,import.meta.url),'utf8');
  assert.match(source,/^[\x00-\x7f]*$/); // Japanese runtime strings are Unicode escapes, not altered labels.
 }
});
