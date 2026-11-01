import test from 'node:test';
import assert from 'node:assert/strict';
import {createNotebook,isLegacyPublishingDraft,NOTEBOOK_PREFIX} from '../command-center-98/lounge/notebook.js';
import {publishingAccounts,draftsForAccount} from '../command-center-98/lounge/accounts.js';
function memory(){const map=new Map();return {map,get length(){return map.size},key:i=>[...map.keys()][i],getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}}
const seeds={kyun:[],choi:[],otoku:[],rakuten:[],fp:[],shiire:[]};
const draft=(account,place='kyun')=>({id:account,place,title:'同じ見出し',body:account+'本文',source:{id:'same',account},createdAt:1,updatedAt:2});
test('old sources survive complete refresh and reload only in separate history',()=>{
 const storage=memory(),book=createNotebook({seeds,storage});
 const old=draft('kyun'),unknown=draft('unknown'),current=draft('insurance');
 book.replaceSources([old,unknown,current]);book.remember('kyun',old.id,100);
 assert.equal(book.legacySources().length,2);
 book.replaceSources([current],{complete:true});
 assert.equal(storage.getItem(NOTEBOOK_PREFIX+'source:kyun'),null);
 assert.ok(storage.getItem(NOTEBOOK_PREFIX+'legacy-source:kyun'));
 const restored=createNotebook({seeds,storage});
 assert.deepEqual(restored.legacySources().map(d=>d.source.account).sort(),['kyun','unknown']);
 assert.deepEqual(draftsForAccount(restored.all(),publishingAccounts[0]).map(d=>d.id),['insurance']);
 assert.equal(restored.selected('kyun'),'kyun','old selection retained but not reassigned');
 assert.ok(restored.legacySources().some(d=>d.body==='kyun本文'));
 assert.deepEqual(JSON.parse(restored.export()).drafts.map(d=>d.id).sort(),['insurance','kyun','unknown'],'backup includes preserved history');
});
test('failed archival write never removes the original cache',()=>{
 const storage=memory(),book=createNotebook({seeds,storage});book.replaceSources([draft('kyun')]);
 storage.setItem=()=>{throw Error('quota');};book.replaceSources([],{complete:true});
 assert.ok(storage.getItem(NOTEBOOK_PREFIX+'source:kyun'));
 assert.equal(book.legacySources()[0].body,'kyun本文');
});
test('unknown local identity is history, never assigned from room/title; current identities exact',()=>{
 for(const d of [draft('kyun'),draft('unknown'),{...draft('insurance'),source:undefined},draft('insurance','rakuten'),draft('choi','choi')])assert.equal(isLegacyPublishingDraft(d),true);
 for(const d of [draft('insurance'),draft('otoku','otoku'),draft('rakuten','rakuten'),draft('tiktok','fp')])assert.equal(isLegacyPublishingDraft(d),false);
});

import {workMarks} from '../command-center-98/lounge/work-memory.js';
test('old completion and posting marks do not appear under current account labels',()=>{
 const now=Date.now(),book=createNotebook({seeds,storage:memory(),now:()=>now});const old=draft('kyun'),current=draft('insurance');
 book.replaceSources([old,current]);book.finish(old);book.finish(current);
 assert.deepEqual(workMarks(book,now).map(m=>m.id),['read:insurance']);
 assert.equal(book.completed('kyun').length,2,'old completion is preserved');
});

import fs from 'node:fs';import vm from 'node:vm';
test('new offline shell clears only superseded application caches, not account storage',async()=>{
 const handlers={},deleted=[];const code=fs.readFileSync(new URL('../command-center-98/castle-offline.js',import.meta.url),'utf8');
 vm.runInNewContext(code,{URL,Set,self:{location:{href:'https://example.test/command-center-98/castle-offline.js'},addEventListener:(name,fn)=>handlers[name]=fn,clients:{claim:async()=>{}}},caches:{keys:async()=>['cc-production-shell-69','cc-production-shell-70','cc-production-shell-71','cc-production-shell-72','cc-production-shell-73','cc-production-shell-74','cc-production-shell-75','cc-production-shell-76','user-backup'],delete:async key=>deleted.push(key)}});
 let task;handlers.activate({waitUntil:p=>task=p});await task;assert.deepEqual(deleted,['cc-production-shell-69','cc-production-shell-70','cc-production-shell-71','cc-production-shell-72','cc-production-shell-73','cc-production-shell-74','cc-production-shell-75','cc-production-shell-76']);assert.match(code,/await fetch\(r\)/,'online files are network-first, not an old cached account screen');
});

import {copiesForAccount} from '../command-center-98/lounge/accounts.js';
test('copy history uses explicit source identity, preserves old records and survives source removal',()=>{
 const book=createNotebook({seeds,storage:memory()});const old=draft('kyun'),current=draft('insurance');book.replaceSources([old,current]);book.copied(old,'body','old copy');book.copied(current,'body','current copy');book.replaceSources([],{complete:true});
 assert.equal(book.copies().length,2,'old copy remains preserved');assert.deepEqual(copiesForAccount(book.copies(),publishingAccounts[0],id=>book.get(id)).map(c=>c.text),['current copy']);
 assert.equal(copiesForAccount([{place:'kyun',draftId:'unknown',text:'unassigned'}],publishingAccounts[0],id=>book.get(id)).length,0);
});
