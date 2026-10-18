import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {ARCHIVED_THREADS_EVENT_IDS,excludeArchivedThreads} from '../supabase/functions/command-center-retro-api/threads-archive.mjs';
const require=createRequire(import.meta.url),policy=require('../command-center-98/threads-archive.js');
test('only the approved snapshot IDs are excluded before count and pagination',()=>{
 assert.deepEqual([...policy.eventIds],[...ARCHIVED_THREADS_EVENT_IDS]);
 const rows=[...ARCHIVED_THREADS_EVENT_IDS.map(id=>({id})),{id:1212,kind:'progress'},{id:998,kind:'tiktok'},{id:5000,kind:'new threads'}],calls=[];
 const q={not(column,operator,values){calls.push([column,operator,values]);const excluded=values.slice(1,-1).split(',').map(Number);this.rows=rows.filter(x=>!excluded.includes(x.id));return this;}};
 assert.equal(excludeArchivedThreads(q),q);assert.equal(q.rows.length,3);assert.deepEqual(q.rows.map(x=>x.id),[1212,998,5000]);assert.deepEqual(calls,[['id','in','('+ARCHIVED_THREADS_EVENT_IDS.join(',')+')']]);
 const code=fs.readFileSync(new URL('../supabase/functions/command-center-retro-api/index.ts',import.meta.url),'utf8'),route=code.slice(code.indexOf('if(resource==="task-events")'),code.indexOf('if(resource==="sourcing")',code.indexOf('if(resource==="task-events")')));
 assert.ok(route.indexOf('excludeArchivedThreads(query)')<route.indexOf('.range('));assert.ok(code.indexOf('if(resource==="task-events")')>code.indexOf('await auth(req)'));
 assert.equal(policy.isArchivedRecord({id:1086,taskId:policy.taskId}),true);assert.equal(policy.isArchivedRecord({id:1086,taskId:'different'}),false);assert.equal(policy.isArchivedRecord({id:5000,taskId:policy.taskId}),false);
});
test('cold start skips remote Threads cache without reading or deleting it; edited work and histories remain',()=>{
 const map=new Map(),reads=[],writes=[],storage={get length(){return map.size},key:i=>[...map.keys()][i],getItem:k=>{reads.push(k);return map.get(k)??null},setItem:(k,v)=>{writes.push(k);map.set(k,v)},removeItem:k=>{throw Error('unexpected cache deletion '+k)}};
 const remote={id:'live-choi-archived-0',place:'choi',title:'old saved text',body:'old body',source:{id:'old',account:'choi',label:'saved'}};
 const local={id:'n-user-edit',place:'choi',title:'unsaved/editable work',body:'local body',createdAt:1,updatedAt:1};
 map.set('castle-production.v1.source:'+remote.id,JSON.stringify(remote));map.set('castle-production.v1.draft:'+local.id,JSON.stringify(local));map.set('castle-production.v1.copy:kept',JSON.stringify({id:'kept',draftId:local.id,place:'choi',text:'copied original',kind:'body',time:1}));
 const c=vm.createContext({URL});vm.runInContext(fs.readFileSync(new URL('../command-center-98/castle/notebook.js',import.meta.url),'utf8').replaceAll('export ',''),c);const book=vm.runInContext('createNotebook',c)({seeds:{kyun:[],choi:[],fp:[],shiire:[]},storage,archive:policy});
 assert.equal(book.get(remote.id),null);assert.equal(book.get(local.id).body,'local body');assert.equal(book.copies().length,1);assert.ok(!reads.includes('castle-production.v1.source:'+remote.id));assert.deepEqual(writes,[]);assert.ok(map.has('castle-production.v1.source:'+remote.id));
 const fresh={...remote,id:'live-choi-new-0',title:'new server record',source:{...remote.source,readContract:'threads-active-v1',recordId:'5000',taskId:policy.taskId}};book.replaceSources([fresh]);book.sync();assert.equal(book.get(fresh.id).title,'new server record');assert.equal(book.get(local.id).body,'local body');
});
test('archive is a normal link and contains no Sheet fetch, iframe, or remote import',()=>{
 assert.match(policy.url,/^https:\/\/docs\.google\.com\/spreadsheets\/d\/[A-Za-z0-9_-]+\/edit$/);
 const code=fs.readFileSync(new URL('../command-center-98/threads-archive.js',import.meta.url),'utf8');assert.doesNotMatch(code,/fetch\(|XMLHttpRequest|<iframe|import\(/);
 const assets=JSON.parse(fs.readFileSync(new URL('../command-center-98/app-assets.json',import.meta.url),'utf8'));assert.ok(assets.scripts.findIndex(x=>x.includes('threads-archive.js'))<assets.scripts.findIndex(x=>x.includes('manual-operation-hub.js')));
});
