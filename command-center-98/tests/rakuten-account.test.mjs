import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createNotebook} from '../lounge/notebook.js';
import {postingSteps,postingReadiness,roomForPlace} from '../lounge/qol-model.js';
import {nativeForDraft,placeNames} from '../lounge/desk-model.js';

test('Rakuten drafts survive reload without mixing accounts or losing reply copy history',()=>{
 const disk=new Map(),storage={get length(){return disk.size},key:i=>[...disk.keys()][i],getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v),removeItem:k=>disk.delete(k)};
 const opts={storage,seeds:{kyun:[],choi:[],otoku:[],rakuten:[]}};
 const rows=['kyun','otoku','rakuten'].map(place=>({id:place+'-1',place,title:'同じタイトル',body:place+'本文',posting:{main:place+'本文',reply:place+'返信\nhttps://example.com/'+place},source:{id:'1',account:place,label:'本文＋返信'}}));
 const n=createNotebook(opts);n.replaceSources(rows,{complete:true});
 const rakuten=n.list('rakuten')[0];n.copied(rakuten,'reply',rakuten.posting.reply);
 const restored=createNotebook(opts);
 for(const place of ['kyun','otoku','rakuten'])assert.equal(restored.list(place)[0].body,place+'本文');
 assert.deepEqual(postingSteps(restored.get(rakuten.id),restored.copies()).map(s=>[s.kind,s.copied]),[['body',false],['reply',true]]);
 assert.equal(postingReadiness(rakuten).label,'本文＋返信（画像なし）');
 assert.equal(roomForPlace.rakuten,'purple');assert.equal(placeNames.rakuten,'楽天犬');
 assert.equal(nativeForDraft('rakuten',rakuten).action,'rakuten');
});

test('production bridge routes explicit task ids to separate account drafts',()=>{
 const code=fs.readFileSync(new URL('../castle-parent.js',import.meta.url),'utf8');
 const start=code.indexOf(' function drafts('),end=code.indexOf('\n async function read()',start);
 const context={H:{unique:x=>x,isSuppressed:()=>false,payload:i=>i.payload,matchesAccount:()=>false},w:{}};
 vm.createContext(context);vm.runInContext(code.slice(start,end),context);
 const items=['rakuten','otoku','insurance'].map((key,i)=>({id:'task:'+key,eventRecordId:100+i,taskId:key+'-threads-v1',title:key,payload:{draft:key+'本文',reply:key+'返信'},occurredAt:'2026-10-30T07:00:00Z'}));
 const rows=context.drafts(items);
 assert.equal(rows.length,3);
 assert.deepEqual(Array.from(rows,r=>r.place),['rakuten','otoku','kyun']);
 assert.equal(rows[0].posting.reply,'rakuten返信');assert.equal(rows[0].source.recordId,'100');
 assert.equal(rows[1].id,'otoku-task:otoku');
});
