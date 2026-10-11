import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {pathToFileURL} from 'node:url';
import {stripTypeScriptTypes} from 'node:module';
import {createHmac,webcrypto} from 'node:crypto';
import {SaveError,saveVersionedRow, saveCopyEvent, validCopyId, nextVersion, expectedVersion} from '../supabase/functions/_shared/save-consistency.mjs';

test('version parsing preserves microseconds and a writer advances past the supplied version',()=>{
  const v='2026-10-11T00:00:00.123456+00:00';
  assert.equal(expectedVersion(v),v);
  assert.equal(nextVersion(v,'2026-10-11T00:00:00.123Z'),'2026-10-11T00:00:00.123457Z');
  for(const value of [null,'',12,'bad','2026-10-11T00:00:00.1234567Z','2026-02-30T00:00:00Z'])assert.throws(()=>expectedVersion(value));
});

// Only synthetic data; PostgreSQL evaluates conditional updates and UNIQUE.
const modulePath=process.env.PGLITE_MODULE;
test('real PostgreSQL rejects stale/ABA updates, preserves failures, and deduplicates receipts', {skip: !modulePath && 'PGLITE_MODULE required for the isolated PostgreSQL test'}, async()=>{
  const {PGlite}=await import(pathToFileURL(modulePath).href), pg=new PGlite();
  await pg.exec("SET TIME ZONE 'UTC'; CREATE TABLE command_center_signals(id text PRIMARY KEY,review_state text NOT NULL,updated_at timestamptz NOT NULL); CREATE TABLE command_center_card_copy_history(client_event_id uuid UNIQUE,candidate_id text,platform text,draft_type text,relative_stage text,text_snapshot text,deadline_snapshot timestamptz,created_at timestamptz); INSERT INTO command_center_signals VALUES('s','new','2026-10-11T00:00:00.123456Z');");
  const safe=value=>{if(!/^[a-z_]+$/.test(value))throw Error('invalid test identifier');return '"'+value+'"';};
  class Query{
    constructor(table){this.table=table;this.filters=[];}
    select(){return this;}eq(key,value){this.filters.push([key,value]);return this;}
    update(value){this.op='update';this.value=value;return this;}
    insert(value){this.op='insert';this.value=value;return this;}
    maybeSingle(){this.one=true;return this;}single(){this.one=true;return this;}
    then(resolve,reject){return (async()=>{
      const args=[];const bind=value=>{args.push(value);return '$'+args.length;};
      const where=this.filters.map(([k,v])=>safe(k)+'='+bind(v)).join(' AND ');
      let sql='SELECT *, '+(this.table==='command_center_signals'?'updated_at::text AS version':'created_at::text AS receipt_time')+' FROM '+safe(this.table)+(where?' WHERE '+where:'');
      if(this.op==='update')sql='UPDATE '+safe(this.table)+' SET '+Object.entries(this.value).map(([k,v])=>safe(k)+'='+bind(v)).join(',')+' WHERE '+where+' RETURNING *,updated_at::text AS version';
      if(this.op==='insert')sql='INSERT INTO '+safe(this.table)+' ('+Object.keys(this.value).map(safe).join(',')+') VALUES ('+Object.values(this.value).map(bind).join(',')+') RETURNING *';
      try{const rows=(await pg.query(sql,args)).rows;
        for(const row of rows)if(row.version)row.updated_at=String(row.version).replace(' ','T').replace(/\+00$/,'+00:00');
        return {data:this.one?rows[0]||null:rows,error:null};
      }catch(error){return {data:null,error:{code:error.code,message:'synthetic failure'}};}
    })().then(resolve,reject);}
  }
  const db={from:table=>new Query(table)},v='2026-10-11T00:00:00.123456Z';
  try{
    await assert.rejects(saveVersionedRow(db,'command_center_signals','s',{review_state:'read'},null),{status:428});
    const first=await saveVersionedRow(db,'command_center_signals','s',{review_state:'read'},v);
    assert.match(first.updated_at,/T.*(?:Z|\+00:00)$/);
    await assert.rejects(saveVersionedRow(db,'command_center_signals','s',{review_state:'accepted'},v),{status:409});
    await assert.rejects(saveVersionedRow(db,'command_center_signals','s',{review_state:'read'},v),{status:409});
    await saveVersionedRow(db,'command_center_signals','s',{review_state:'new'},first.updated_at);
    await assert.rejects(saveVersionedRow(db,'command_center_signals','s',{review_state:'accepted'},v),{status:409});
    const before=(await pg.query('SELECT * FROM command_center_signals')).rows;
    await assert.rejects(saveVersionedRow(db,'command_center_signals','s',{review_state:null},before[0].updated_at.toISOString()));
    assert.deepEqual((await pg.query('SELECT * FROM command_center_signals')).rows,before);
    const intent={client_event_id:'00000000-0000-4000-8000-000000000001',candidate_id:'s',platform:'x',draft_type:'opening',relative_stage:'opening',text_snapshot:'synthetic text',deadline_snapshot:'2026-11-11T00:00:00Z',created_at:'2026-10-11T00:00:00Z'};
    await saveCopyEvent(db,intent);
    await saveCopyEvent(db,intent,()=>{throw Error('expired current candidate must not prevent replay');});
    for(const [key,value] of [['text_snapshot','other'],['platform','threads'],['candidate_id','other'],['created_at','2026-10-12T00:00:00Z'],['deadline_snapshot','2026-11-11T00:00:00.000001Z']])await assert.rejects(saveCopyEvent(db,{...intent,[key]:value}),{status:409});
    assert.equal((await pg.query('SELECT count(*)::int AS n FROM command_center_card_copy_history')).rows[0].n,1);
  }finally{await pg.close();}
});

test('actual card editor retains input on 409/428 and copy retries retain the same intent',async()=>{
  const source=await readFile(new URL('../command-center-98/v160-card-publishing.js',import.meta.url),'utf8');
  const elements=new Map(), make=id=>({id,value:'',textContent:'',children:[],classList:{add(){},remove(){},toggle(){}},setAttribute(){},appendChild(child){this.children.push(child);if(child.id)elements.set(child.id,child)},remove(){elements.delete(this.id)}});
  for(const id of ['xEditor','xForm','xAdd','xeId','xeProduct','xeDraft','xeThreadsDraft','xeChars','xeThreadsChars','xClose','xeCancel','xeCopyX','xeCopyThreads'])elements.set(id,make(id));
  // Execute the real editor block, without the unrelated card renderer.
  const block=source.slice(source.indexOf('  const modal=by('),source.lastIndexOf('})();'));
  const X={state:{items:[]},headers:()=>({}),twitterLength:value=>value.length,chars(){},clip:async()=>true,load:async()=>{},request:async()=>{throw Object.assign(Error('conflict'),{status:409});},update(){throw Error('conflict must not update UI');}};
  runInNewContext('(()=>{'+block+'})();',{X,by:id=>elements.get(id),document:{createElement:()=>make('')},toast(){},console});
  X.openEditor({id:'s',updatedAt:'2026-10-11T00:00:00.123456Z',productName:'original'});
  elements.get('xeProduct').value='unsaved edit';
  await elements.get('xForm').onsubmit({preventDefault(){}});
  assert.equal(elements.get('xeProduct').value,'unsaved edit');assert.equal(elements.get('xeId').value,'s');
  assert.equal(X.editorVersion,'2026-10-11T00:00:00.123456Z');assert.ok(elements.get('xeConflict'));
  X.request=async()=>{throw Object.assign(Error('old tab'),{status:428});};
  await elements.get('xForm').onsubmit({preventDefault(){}});
  assert.equal(elements.get('xeProduct').value,'unsaved edit');
  const copyBlock=source.slice(source.indexOf('  X.copy=async'),source.indexOf('  X.publish=async'));
  let ids=0;const sent=[];X.state.items=[{id:'s',xDraft:'copy text',draftType:'opening',applicationDeadline:null}];
  X.eventId=()=>String(++ids);X.patch=async body=>{sent.push(structuredClone(body));if(sent.length===1)throw Error('lost response');};
  runInNewContext(copyBlock,{X,toast(){},Date,Map});
  await X.copy('s','x',{});await X.copy('s','x',{});
  assert.deepEqual(sent[0],sent[1]);assert.equal(ids,1);assert.equal(X.copyPending.size,0);
  await X.copy('s','x',{});assert.equal(ids,2);
});

test('real X handler rejects stale editor writes and returns the same copy receipt after candidate changes',async()=>{
  const tables={command_center_x_candidates:[{id:'c',product_name:'synthetic',status:'draft',updated_at:'2026-10-11T00:00:00.123456Z',x_draft:'text',draft_type:'opening',application_deadline:'2026-11-11T00:00:00Z'}],command_center_card_copy_history:[],command_center_card_copy_summary:[],command_center_card_draft_reviews:[]};
  class Query{
    constructor(table){this.table=table;this.filters=[];}
    eq(k,v){this.filters.push(r=>k==='updated_at'?expectedVersion(r[k])===v:r[k]===v);return this;}
    select(){return this;}maybeSingle(){this.one=true;return this;}single(){this.one=true;return this;}
    update(value){this.op='update';this.value=value;return this;}insert(value){this.op='insert';this.value=value;return this;}
    then(resolve,reject){return Promise.resolve().then(()=>{
      let rows=tables[this.table].filter(r=>this.filters.every(f=>f(r)));
      if(this.op==='update')rows.forEach(r=>Object.assign(r,this.value));
      if(this.op==='insert'){
        if(this.table==='command_center_card_copy_history'&&tables[this.table].some(r=>r.client_event_id===this.value.client_event_id))return {data:null,error:{code:'23505'}};
        rows=Array.isArray(this.value)?this.value:[this.value];tables[this.table].push(...structuredClone(rows));
      }
      return {data:structuredClone(this.one?rows[0]||null:rows),error:null};
    }).then(resolve,reject);}
  }
  let handler;
  const source=await readFile(new URL('../supabase/functions/command-center-x-api/index.ts',import.meta.url),'utf8');
  runInNewContext(stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm,''),{mode:'strip'}),{
    Deno:{env:{get:()=> 'synthetic-test-key'},serve:fn=>handler=fn},createClient:()=>({from:t=>new Query(t)}),
    twitterText:{parseTweet:text=>({valid:true,weightedLength:text.length})},crypto:webcrypto,TextEncoder,Headers,Response,URL,
    SaveError,saveVersionedRow,saveCopyEvent,validCopyId,expectedVersion
  });
  const exp=String(Date.now()+60000),token=exp+'.'+createHmac('sha256','synthetic-test-key').update('retro|'+exp).digest('hex');
  const call=body=>handler(new Request('https://example.invalid',{method:'PATCH',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(body)}));
  assert.equal((await call({id:'c',action:'save',candidate:{productName:'unsaved'}})).status,428);
  const version=tables.command_center_x_candidates[0].updated_at;
  assert.equal((await call({id:'c',action:'save',expectedUpdatedAt:version,candidate:{productName:'saved'}})).status,200);
  assert.equal((await call({id:'c',action:'save',expectedUpdatedAt:version,candidate:{productName:'old screen'}})).status,409);
  assert.equal(tables.command_center_x_candidates[0].product_name,'saved');
  const intent={id:'c',action:'copy',platform:'x',textSnapshot:'text',copiedAt:'2026-10-11T00:00:00Z',clientEventId:'00000000-0000-4000-8000-000000000002',draftType:'opening',deadlineSnapshot:'2026-11-11T00:00:00Z'};
  assert.equal((await call(intent)).status,200);
  tables.command_center_x_candidates[0].application_deadline='2026-10-10T00:00:00Z';
  tables.command_center_x_candidates[0].draft_type='deadline';
  assert.equal((await call(intent)).status,200);
  assert.equal((await call({...intent,textSnapshot:'different'})).status,409);
  assert.equal((await call({...intent,clientEventId:'invalid'})).status,400);
  assert.equal(tables.command_center_card_copy_history.length,1);
});
