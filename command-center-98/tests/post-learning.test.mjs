import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {binding,sourceSnapshot,changeSummary,postLearningGet,postLearningPatch,POST_LEARNING_TASK} from '../../supabase/functions/command-center-retro-api/post-learning-api.mjs';
const frontend=createRequire(import.meta.url)('../post-learning.js');
const sourceId='task:example:20261023';
const ref={sourceKind:'signal',sourceId,accountKey:'fp',copyKey:'fp_script'};
const original={id:sourceId,title:'保険を見直す',payload:{content_type:'fp_post_candidate',draft_revision:2,draft_slides:[{page_contract:{display_copy:'まず家計を確認。'},internal_note:'非公開の調査メモ'}],draft_caption:'迷いを減らす。'}};
function fixture(){
 const signals=[structuredClone(original)],events=[];let next=1,writes=0;
 const admin={from(table){let filters=[],limit=Infinity,insert=null,descending=false;
  const q={select(){return q;},eq(k,v){filters.push([k,v]);return q;},order(k,o){descending=o?.ascending===false;return q;},limit(n){limit=n;return q;},insert(row){insert=structuredClone(row);return q;},
   async result(single){
    const rows=table==='command_center_signals'?signals:events;
    if(insert){if(rows.some(r=>r.task_id===insert.task_id&&r.event_key===insert.event_key))return {error:{code:'23505'}};insert.id=next++;rows.push(insert);writes++;return {data:structuredClone(insert)};}
    let found=rows.filter(r=>filters.every(([k,v])=>(k==='payload->>source_key'?r.payload.source_key:r[k])==v));
    if(descending)found=found.toSorted((a,b)=>b.id-a.id);found=found.slice(0,limit);
    return {data:structuredClone(single?found[0]||null:found),error:null};
   },maybeSingle(){return q.result(true);},single(){return q.result(true);},then(a,b){return q.result(false).then(a,b);}};return q;}};
 const deps={admin,sha256:async v=>createHash('sha256').update(v).digest('hex'),json:(req,data,status=200)=>({status,data}),now:()=> '2026-10-23T01:00:00.000Z'};
 const get=(r=ref)=>postLearningGet(new Request('https://example.test/?'+new URLSearchParams({resource:'post-learning',...r})),deps);
 const patch=(body)=>postLearningPatch(new Request('https://example.test/'),body,deps);
 const save=async (text,options={})=>{const read=await get();return patch({action:'post_learning',...ref,operation:'save',finalText:text,fingerprint:read.data.fingerprint,expectedRevision:read.data.entry?.revision||0,mutationId:'mutation_'+next,...options});};
 return {get,save,patch,deps,signals,events,writes:()=>writes};
}
test('actual text signal ids and numeric event ids bind to their exact source',()=>{
 assert.equal(binding(ref).id,sourceId);assert.throws(()=>binding({...ref,sourceId:'x\nsecret'}));
 assert.equal(binding({...ref,sourceKind:'event',sourceId:'123'}).kind,'event');
 assert.equal(frontend.descriptor({id:'sns:'+sourceId},'fp','fp_script').sourceId,sourceId);
 assert.equal(frontend.descriptor({id:sourceId,eventRecordId:123},'fp','fp_script').sourceId,'123');
 assert.equal(frontend.draftBinding({source:{kind:'signal',id:sourceId,account:'fp',copyKey:'fp_script'}}).sourceId,sourceId);
});
test('source snapshots contain public copy and refuse cross-account records',()=>{
 const snap=sourceSnapshot(original,binding(ref));assert.match(snap.text,/まず家計を確認/);assert.doesNotMatch(snap.text,/非公開/);
 assert.throws(()=>sourceSnapshot(original,binding({...ref,accountKey:'kyun'})),/account_mismatch/);
 assert.throws(()=>sourceSnapshot({...original,task_id:POST_LEARNING_TASK},binding(ref)),/source_not_found/);
});
test('reading original does not save or invent a result',async()=>{
 const f=fixture(),read=await f.get();assert.equal(read.status,200);assert.equal(read.data.entry,null);assert.equal(f.writes(),0);
});
test('final text and original remain paired and subsequent edits keep prior history',async()=>{
 const f=fixture(),first=await f.save('保険料、どれを減らすか迷うよね。');assert.equal(first.status,200);
 const second=await f.save('まず今の保障を一緒に見よう。');assert.equal(second.status,200);assert.equal(f.events.length,2);
 assert.equal(f.events[0].payload.final.text,'保険料、どれを減らすか迷うよね。');
 assert.deepEqual(f.events[1].payload.original,f.events[0].payload.original);assert.deepEqual(f.signals[0],original);
 assert.equal(second.data.entry.subjective_result.status,null);assert.equal('reach' in second.data.entry,false);
});
test('buzz needs no metrics, is reversible, and belongs to the evaluated final text',async()=>{
 const f=fixture();let r=await f.save('手直しした文',{operation:'buzz'});assert.equal(r.data.entry.subjective_result.status,'buzz');
 r=await f.save('手直しした文',{operation:'unbuzz'});assert.equal(r.data.entry.subjective_result.status,null);
 await f.save('手直しした文',{operation:'buzz'});r=await f.save('別の手直し');assert.equal(r.data.entry.subjective_result.status,null);
 assert.equal(f.events[2].payload.subjective_result.status,'buzz');
});
test('stale source and stale revisions cannot overwrite data; exact retry is idempotent',async()=>{
 const f=fixture(),read=await f.get(),body={action:'post_learning',...ref,operation:'buzz',finalText:'確定した文',fingerprint:read.data.fingerprint,expectedRevision:0,mutationId:'same_mutation_01'};
 assert.equal((await f.patch(body)).status,200);assert.equal((await f.patch(body)).data.replay,true);assert.equal(f.writes(),1);
 assert.equal((await f.patch({...body,mutationId:'different_mutation'})).status,409);
 f.signals[0].payload.draft_slides[0].page_contract.display_copy='新しい原稿';
 assert.equal((await f.patch({...body,expectedRevision:1})).data.error,'post_learning_source_changed');assert.equal(f.writes(),1);
});
test('examples return the latest pair once, retain edited unmarked examples, and omit undone unchanged buzz',async()=>{
 const f=fixture();await f.save('手直し',{operation:'buzz'});await f.save('最新の手直し');
 let r=await postLearningGet(new Request('https://example.test/?resource=post-learning-examples&accountKey=fp'),f.deps);
 assert.equal(r.data.examples.length,1);assert.equal(r.data.examples[0].final.text,'最新の手直し');assert.equal(r.data.examples[0].subjective_result.status,null);
 const unedited=fixture(),read=await unedited.get();await unedited.save(read.data.original.text,{operation:'buzz'});await unedited.save(read.data.original.text,{operation:'unbuzz'});
 r=await postLearningGet(new Request('https://example.test/?resource=post-learning-examples'),unedited.deps);assert.equal(r.data.examples.length,0);
});
test('change extraction handles emoji without splitting code points',()=>{
 assert.deepEqual(changeSummary('あ😀う','あ😄う'),{changed:true,from:'😀',to:'😄'});
 assert.deepEqual(changeSummary('同じ','同じ'),{changed:false,from:'',to:''});
});
