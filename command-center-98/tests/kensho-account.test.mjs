import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {publishingAccounts,draftsForAccount} from '../lounge/accounts.js';
import {createNotebook} from '../lounge/notebook.js';
import {roomForPlace,postingSteps,postingReadiness} from '../lounge/qol-model.js';
import {placeNames,nativeForDraft} from '../lounge/desk-model.js';

test('Kensho has its own sixth slot, supplied handle and storage task',()=>{
 const a=publishingAccounts.find(a=>a.key==='kensho');
 assert.deepEqual([a.name,a.handle,a.place,a.taskId],['懸賞小ナス','@nasbi.777','kensho','kensho-threads-v1']);
 assert.equal(publishingAccounts.filter(a=>!a.pending).length,6);
 assert.equal(publishingAccounts.some(a=>a.key==='planned-6'),false);
 assert.equal(publishingAccounts.find(a=>a.key==='lottery').taskId,'lottery-threads-v1');
 assert.equal(placeNames.kensho,'懸賞小ナス');
 assert.equal(roomForPlace.kensho,'purple');
});

test('Kensho text and copy history survive reload without entering the purchase lottery box',()=>{
 const disk=new Map(),storage={get length(){return disk.size},key:i=>[...disk.keys()][i],getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v),removeItem:k=>disk.delete(k)};
 const opts={storage,seeds:{kensho:[],lottery:[]}};
 const rows=['kensho','lottery'].map(place=>({id:place+'-1',place,title:'同じ題名',body:place+'本文',posting:{main:place+'本文',reply:place+'返信'},source:{id:'1',account:place,label:'本文＋返信'}}));
 const n=createNotebook(opts);n.replaceSources(rows,{complete:true});n.copied(n.list('kensho')[0],'body','kensho本文');
 const restored=createNotebook(opts),draft=restored.list('kensho')[0];
 assert.equal(draft.body,'kensho本文');assert.equal(restored.list('lottery')[0].body,'lottery本文');
 assert.deepEqual(postingSteps(draft,restored.copies()).map(x=>x.copied),[true,false]);
 assert.equal(postingReadiness(draft).label,'本文＋返信（画像なし）');
 assert.equal(nativeForDraft('kensho',draft).action,'kensho');
 const a=publishingAccounts.find(a=>a.key==='kensho');
 assert.deepEqual(draftsForAccount(rows,a).map(d=>d.id),['kensho-1']);
});

test('Production bridge excludes profile settings and keeps identical draft titles in their own boxes',()=>{
 const code=fs.readFileSync(new URL('../castle-parent.js',import.meta.url),'utf8');
 const start=code.indexOf(' function drafts('),end=code.indexOf('\n async function read()',start);
 const context={publishingConfig:publishingAccounts.filter(a=>!a.pending),H:{unique:x=>x,isSuppressed:()=>false,payload:x=>x.payload,matchesAccount:()=>false},w:{}};
 vm.createContext(context);vm.runInContext(code.slice(start,end),context);
 const items=['kensho','lottery'].map((key,i)=>({id:'task:'+key,eventRecordId:200+i,taskId:key+'-threads-v1',title:'同じ題名',payload:{draft:key+'本文',reply:key+'返信'},occurredAt:'2026-11-06T07:00:00Z'}));
 items.push({id:'config',taskId:'kensho-threads-v1',payload:{content_type:'account_configuration',profile_draft:'プロフィール'}});
 const rows=context.drafts(items);
 assert.deepEqual(Array.from(rows,x=>[x.place,x.source.account,x.body]),[['kensho','kensho','kensho本文'],['lottery','lottery','lottery本文']]);
});

test('Native Kensho viewer reads only its task and copies the profile and draft separately',async()=>{
 const code=fs.readFileSync(new URL('../manual-operation-hub.js',import.meta.url),'utf8');
 const start=code.indexOf('async function insuranceDesk('),end=code.indexOf('\n api.openAccount=',start);
 const nodes=[],requests=[],copied=[];
 const e=(tag,text='')=>{const n={tag,textContent:text,children:[],append(...v){this.children.push(...v)},showModal(){},close(){},remove(){}};nodes.push(n);return n;};
 const events=[{title:'設定',payload:{content_type:'account_configuration',profile_draft:'なすびの懸賞生活、やってみよー！',editorial_rules:'私生活を創作しない。'}},{id:42,title:'応募したもの',payload:{draft:'懸賞の本文',reply:'返信',date:'2026-11-06'}}];
 const context={e,details:(text,body)=>{const n=e('details',text);n.append(body);return n;},doc:{body:e('body')},root:{},URL,localStorage:{getItem:()=>''},navigator:{clipboard:{writeText:async t=>copied.push(t)}},fetch:async url=>{requests.push(String(url));return {ok:true,json:async()=>({ok:true,events})}}};
 vm.createContext(context);vm.runInContext(code.slice(start,end),context);await context.insuranceDesk('kensho');
 assert.equal(new URL(requests[0]).searchParams.get('taskId'),'kensho-threads-v1');
 assert.equal(nodes.find(n=>n.tag==='h2').textContent,'懸賞小ナス｜@nasbi.777');
 assert.equal(nodes.find(n=>n.tag==='a').href,'https://www.threads.com/@nasbi.777');
 assert.ok(nodes.some(n=>n.textContent.startsWith('保存原稿 1本')));
 await nodes.find(n=>n.textContent==='プロフィール案をコピー').onclick();
 await nodes.find(n=>n.textContent==='本文をコピー').onclick();
 assert.deepEqual(copied,['なすびの懸賞生活、やってみよー！','懸賞の本文']);
});
