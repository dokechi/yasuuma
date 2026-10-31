import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {installSpatialDesk} from '../command-center-98/lounge/spatial-desk.js';
import {installLivingRoom} from '../command-center-98/lounge/living-room.js';
const {JSDOM}=createRequire(import.meta.url)('jsdom');
const html=fs.readFileSync(new URL('../command-center-98/lounge/index.html',import.meta.url),'utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function setup(t){
 const dom=new JSDOM(html,{url:'https://fixture.invalid/command-center-98/lounge/',runScripts:'outside-only'}),doc=dom.window.document,win=dom.window;
 win.ResizeObserver=class{observe(){}disconnect(){}};
 win.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 win.HTMLDialogElement.prototype.close=function(){this.open=false;win.queueMicrotask(()=>this.dispatchEvent(new win.Event('close')));};
 const $=s=>doc.querySelector(s),room=$('#room'),paper=$('#desk');doc.body.classList.add('spatial-atelier');room.dataset.account='insurance';room.hidden=false;
 let listener;const calls={select:[],history:0,pending:0,scene:0},draft={id:'one',title:'原稿一',kind:'本文',source:{account:'insurance',id:'r1'}};
 let data={rooms:['insurance','otoku','rakuten','lottery'].map(key=>({key,name:key,handle:'@'+key,state:'ready',light:'notice',briefing:'保存原稿 1本を開けます。',scopeNote:'この端末の記録です。',notice:'本文はまだ置き換えていません。',labels:{shelf:'保存原稿 1本',favorites:'お気に入り 1本',notice:'未読・更新 1本',read:'読了 0本',posted:'投稿済みメモ 0本'},current:draft,favoriteDrafts:[draft],unreadDrafts:[draft],pendingUpdate:false}))};
 const controller={snapshot:()=>data,subscribe(fn){listener=fn;fn(data);return()=>{listener=null;};},openDraft(id){calls.select.push(id);return id==='one';},history(){calls.history++;$('#desk-history-dialog').showModal();},applyPending(){calls.pending++;return true;}};
 const spatial=installSpatialDesk({document:doc,openRoom(){}}),api=installLivingRoom({document:doc,controller,spatialDesk:spatial,scene:{setLivingStatus(){calls.scene++;}}});
 const emit=change=>{data={...data,rooms:data.rooms.map(r=>r.key===room.dataset.account?{...r,...change}:r)};listener?.(data);};
 const enter=async key=>{room.dataset.account=key;await flush();};
 t.after(()=>{api.destroy();spatial.destroy();dom.window.close();});return{doc,win,$,room,paper,api,spatial,calls,emit,enter};
}
test('optional bench retains exact paper nodes, scroll and edited text; default remains reader',async t=>{
 const b=setup(t),body=b.$('#draft-body'),scroll=b.$('#desk-scroll');body.textContent='編集中の最終稿';scroll.scrollTop=128;
 assert.equal(b.$('#living-workbench').hidden,true);assert.equal(b.paper.hasAttribute('aria-hidden'),false);
 b.$('.living-toggle').focus();b.$('.living-toggle').click();assert.equal(b.room.dataset.livingView,'tools');assert.equal(b.paper.inert,true);assert.equal(b.paper.getAttribute('aria-hidden'),'true');
 assert.equal(b.doc.activeElement,b.$('.living-reader-return'));b.$('[data-object=desk]').click();
 assert.equal(b.room.dataset.livingView,undefined);assert.ok(!b.paper.inert);assert.equal(b.paper.hasAttribute('aria-hidden'),false);assert.equal(b.$('#draft-body'),body);assert.equal(body.textContent,'編集中の最終稿');assert.equal(scroll.scrollTop,128);assert.equal(b.doc.activeElement,scroll);
});
test('favorites is read-only until explicit selection; close and queued reopen restore visible origin',async t=>{
 const b=setup(t);b.api.showTools(true);const chest=b.$('[data-object=chest]');chest.click();assert.equal(b.$('#living-record-dialog').open,true);assert.deepEqual(b.calls.select,[]);
 b.$('.living-dialog-heading button').click();assert.equal(b.doc.activeElement,chest);chest.click();await flush();assert.equal(b.$('#living-record-dialog').open,true);
 b.$('[data-living-draft=one]').click();await flush();assert.deepEqual(b.calls.select,['one']);assert.equal(b.room.dataset.livingView,undefined);assert.equal(b.$('#living-record-dialog').open,false);
});
test('actual pending notice never auto applies, then delegates the explicit update once',async t=>{
 const b=setup(t);b.api.showTools(true);b.emit({pendingUpdate:true});b.$('[data-object=notice]').click();assert.equal(b.calls.pending,0);assert.match(b.$('.living-dialog-note').textContent,/まだ置き換えていません/);
 b.$('.living-apply-update').click();assert.equal(b.calls.pending,1);assert.equal(b.room.dataset.livingView,undefined);assert.equal(b.$('#living-record-dialog').open,false);
});
test('bench Escape returns to same reader, while open dialog retains native Escape semantics',async t=>{
 const b=setup(t);b.api.showTools(true);b.$('[data-object=chest]').click();const event=new b.win.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});b.doc.dispatchEvent(event);assert.equal(event.defaultPrevented,false);assert.equal(b.room.dataset.livingView,'tools');
 b.$('#living-record-dialog').close();await flush();assert.equal(b.doc.activeElement,b.$('[data-object=chest]'));
 const exit=new b.win.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});b.doc.dispatchEvent(exit);assert.equal(exit.defaultPrevented,true);assert.equal(b.room.dataset.livingView,undefined);
});
test('existing shelf origin, handlers, and exact node identity survive bench use',async t=>{
 const b=setup(t),shelf=b.$('.manuscript-shelf'),query=b.$('#desk-query');query.value='維持する検索';let invoked=0;query.addEventListener('input',()=>invoked++);
 b.api.showTools(true);b.$('[data-object=shelf]').focus();b.$('[data-object=shelf]').click();assert.equal(b.$('.manuscript-shelf'),shelf);assert.equal(b.$('#desk-query'),query);assert.equal(query.value,'維持する検索');query.dispatchEvent(new b.win.Event('input'));assert.equal(invoked,1);
 b.spatial.closeShelf();assert.equal(b.room.dataset.livingView,'tools');assert.equal(b.doc.activeElement,b.$('[data-object=shelf]'));
});
test('room changes and departure close old dialogs, restore prior inert/aria, and never carry tools forward',async t=>{
 const b=setup(t);b.paper.inert=true;b.paper.setAttribute('aria-hidden','false');b.api.showTools(true);b.$('[data-object=chest]').click();await b.enter('otoku');
 assert.equal(b.room.dataset.livingView,undefined);assert.equal(b.$('#living-record-dialog').open,false);assert.equal(b.paper.inert,true);assert.equal(b.paper.getAttribute('aria-hidden'),'false');assert.equal(b.$('.living-briefing h3').textContent,'otoku');
 b.paper.inert=false;b.paper.removeAttribute('aria-hidden');b.api.showTools(true);b.$('.living-copy-history').click();assert.equal(b.calls.history,1);b.room.hidden=true;await flush();assert.equal(b.$('#desk-history-dialog').open,false);assert.equal(b.$('.living-toggle'),null);assert.equal(b.paper.inert,false);
});
test('destroy removes enhancement, subscribers and modal context while retaining reader',async t=>{
 const b=setup(t);b.api.showTools(true);b.$('[data-object=chest]').click();const paper=b.paper;b.api.destroy();await flush();assert.equal(b.$('#desk'),paper);assert.equal(b.$('.living-workbench'),null);assert.ok(!b.paper.inert);const n=b.calls.scene;b.emit({briefing:'late'});assert.equal(b.calls.scene,n);b.api.destroy();
});
test('refresh preserves stable record/update focus or falls back to visible dialog close',async t=>{
 const b=setup(t);b.api.showTools(true);b.$('[data-object=chest]').click();b.$('[data-living-draft=one]').focus();b.emit({favoriteDrafts:[]});assert.equal(b.doc.activeElement,b.$('.living-dialog-heading button'));
 b.api.closeRecords();b.emit({pendingUpdate:true});b.$('[data-object=notice]').click();b.$('.living-apply-update').focus();b.emit({notice:'さらに更新を預かっています。'});assert.equal(b.doc.activeElement,b.$('.living-apply-update'));b.emit({pendingUpdate:false});assert.equal(b.doc.activeElement,b.$('.living-dialog-heading button'));
});
test('shelf selection returns to paper even when the owner rerender detaches the clicked card',async t=>{
 const b=setup(t);b.api.showTools(true);b.$('[data-object=shelf]').click();const card=b.doc.createElement('button');card.className='manuscript-card';card.textContent='Select';card.onclick=()=>{b.$('#desk-list').replaceChildren();};b.$('#desk-list').append(card);card.click();await flush();assert.equal(b.room.dataset.livingView,undefined);assert.equal(b.doc.activeElement,b.$('#desk-scroll'));assert.equal(b.$('#spatial-shelf-dialog').open,false);
});
