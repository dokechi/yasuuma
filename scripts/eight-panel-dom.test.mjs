import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createRequire} from 'node:module';const require=createRequire(import.meta.url);const {parseHTML}=require('linkedom');
import {createDesk} from '../command-center-98/lounge/desk.js';
test('eight panel entry routes three accounts without legacy leakage and preserves all sources',()=>{
 const {window,document}=parseHTML(fs.readFileSync(new URL('../command-center-98/lounge/index.html',import.meta.url),'utf8'));const disk=new Map(),storage={get length(){return disk.size},key:i=>[...disk.keys()][i],getItem:k=>disk.get(k)||null,setItem:(k,v)=>disk.set(k,v),removeItem:k=>disk.delete(k)};
 Object.assign(globalThis,{document,window,location:{origin:'https://example.test'}});Object.defineProperty(globalThis,'navigator',{value:{clipboard:{writeText:async()=>{}}},configurable:true});window.localStorage=storage;window.parent={postMessage:()=>{}};window.HTMLElement.prototype.scrollIntoView=()=>{};
 Object.defineProperty(document.getElementById('desk-font'),'value',{value:'standard',writable:true});
 let desk;desk=createDesk({onOpenRoom:p=>desk.enter(({kyun:'red',otoku:'purple',rakuten:'purple',shiire:'orange'})[p]),onHome:()=>desk.leave()});
 const rows=['insurance','otoku','rakuten','kyun'].map((account,i)=>({id:'draft-'+account,place:account==='insurance'?'kyun':account,title:'共通タイトル',body:account+'専用本文',source:{id:'same-id',account},createdAt:1,updatedAt:i+1}));
 desk.receive({drafts:rows,complete:true,loading:false});assert.equal(document.querySelectorAll('.account-tile').length,8);assert.equal(document.querySelectorAll('.account-tile:disabled').length,4);assert.equal(desk.notebook.all().length,4);
 for(const key of ['insurance','otoku','rakuten']){document.querySelector('[data-destination='+key+']').onclick();assert.equal(document.getElementById('draft-body').textContent,key+'専用本文');assert.equal(document.querySelectorAll('#desk-list .manuscript-card').length,1);assert.equal(document.querySelector('#desk-routes strong').textContent.startsWith(key==='insurance'?'保険':key==='otoku'?'まだ安く':'楽天犬'),true);desk.leave();assert.equal(document.querySelector('.account-board').hidden,false);}
 assert.equal(desk.notebook.all().length,4);window.dispatchEvent(new window.Event('pagehide'));
});
