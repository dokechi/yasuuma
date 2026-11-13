import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mountPaperStage} from '../command-center-98/lounge/paper-stage.js';
import {createNotebook} from '../command-center-98/lounge/notebook.js';
const {JSDOM}=createRequire(import.meta.url)('jsdom');
const tick=()=>new Promise(r=>setImmediate(r));
function setup(t,{count=27}={}){
 const dom=new JSDOM('<body><button id="lounge-search">検索</button><button id="settings-open">設定</button><main><section id="room" data-account="insurance"><article id="desk"><div id="desk-scroll" tabindex="0"><p id="draft-body">唯一のリーダー</p></div></article></section></main></body>',{url:'https://test.invalid',pretendToBeVisual:true}),d=dom.window.document;
 const accounts=Array.from({length:7},(_,i)=>({key:i?'category'+i:'insurance',name:i?'カテゴリ'+i:'保険'}));
 const rows=Array.from({length:count},(_,i)=>({id:'draft-'+i,title:'実原稿 '+i,body:'保存された本文 '+i,source:{id:'source-'+i,account:'insurance'},place:'kyun'})),pins=new Set(),calls=[];
 const board={state:{complete:true},subscribe(fn){fn();return()=>{};}};
 const owner={rows:key=>key==='insurance'?rows:[],open:id=>{calls.push(id);return true;},isFuture:id=>pins.has(id),toggleFuture:id=>{pins.has(id)?pins.delete(id):pins.add(id);},persistent:()=>true,canPin:()=>true};
 const application={getPaperDesk:()=>owner,getAccountBoard:()=>board,openWorkingChapter:key=>{d.getElementById('room').dataset.account=key;return true;}};
 const reader=d.getElementById('desk'),stage=mountPaperStage({document:d,application,accounts});
 t.after(()=>{stage.destroy();dom.window.close();});return {d,stage,rows,calls,pins,reader,application,$:s=>d.querySelector(s)};
}
test('8 data-driven tabs, bounded initial papers, continuation preserves all records and no automatic open',async t=>{const s=setup(t);await tick();assert.equal(s.d.querySelectorAll('.paper-tab').length,8);assert.equal(s.d.querySelectorAll('.paper-card').length,20);assert.deepEqual(s.calls,[]);assert.match(s.$('.paper-excerpt').textContent,/保存された本文/);s.$('.paper-more').click();assert.equal(s.d.querySelectorAll('.paper-card').length,27);assert.equal(s.rows.length,27);});
test('only chosen paper borrows the original reader; close restores DOM and focus',async t=>{const s=setup(t);await tick();const card=s.d.querySelectorAll('.paper-card')[2],opener=card.querySelector('.paper-open');opener.focus();opener.click();assert.deepEqual(s.calls,['draft-2']);assert.equal(card.querySelector('#desk'),s.reader);assert.equal(s.d.querySelectorAll('#desk').length,1);s.$('.paper-close').click();assert.equal(s.reader.parentNode,s.$('#room'));assert.equal(s.d.activeElement,opener);assert.equal(s.stage.snapshot().opened,null);});
test('source refresh while open preserves live text and reader identity until explicit close',async t=>{const s=setup(t);await tick();s.$('.paper-open').click();s.reader.querySelector('p').textContent='編集中の最終稿';s.rows[0].body='新しい受信本文';s.stage.paint();assert.equal(s.reader.querySelector('p').textContent,'編集中の最終稿');assert.equal(s.$('.paper-reader #desk'),s.reader);s.stage.close();await tick();assert.match(s.$('.paper-excerpt').textContent,/新しい受信本文/);});
test('repeated opens, Escape, category interrupts and empty categories keep a single reader',async t=>{const s=setup(t);await tick();for(let i=0;i<10;i++){s.d.querySelectorAll('.paper-open')[i%3].click();assert.equal(s.d.querySelectorAll('#desk').length,1);}s.d.dispatchEvent(new s.d.defaultView.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(s.stage.snapshot().opened,null);s.$('[data-paper-chapter=category1]').click();await tick();assert.equal(s.d.querySelectorAll('.paper-card').length,0);assert.match(s.$('.paper-state').textContent,/ありません/);assert.equal(s.reader.parentNode,s.$('#room'));});
test('pin and open are separate controls; pin filter preserves actual rows',async t=>{const s=setup(t);await tick();s.$('.paper-pin').click();await tick();assert.deepEqual(s.calls,[]);assert.deepEqual([...s.pins],['draft-0']);s.$('.paper-future').click();assert.equal(s.d.querySelectorAll('.paper-card').length,1);s.$('.paper-pin').click();await tick();assert.equal(s.d.querySelectorAll('.paper-card').length,0);assert.equal(s.rows.length,27);});
test('keyboard navigation reaches all 8 tabs without changing category until activation',async t=>{const s=setup(t);await tick();s.$('.paper-tab').focus();s.$('.paper-tabs').dispatchEvent(new s.d.defaultView.KeyboardEvent('keydown',{key:'End',bubbles:true}));assert.equal(s.d.activeElement.dataset.paperChapter,'sourcing');assert.equal(s.$('#room').dataset.account,'insurance');});
test('failed and loading reads disclose uncertainty and keep available source papers',async t=>{const s=setup(t);await tick();const board=s.application.getAccountBoard();board.state={complete:false,loading:false};s.stage.paint();assert.match(s.$('.paper-state').textContent,/読取未確認/);assert.equal(s.d.querySelectorAll('.paper-card').length,20);board.state={loading:true};s.stage.paint();assert.match(s.$('.paper-state').textContent,/読み込み中/);assert.equal(s.rows.length,27);});
test('10万文字の本文と200文字の題名を切り詰め保存せず、プレビューのみ制限する',async t=>{const s=setup(t,{count:1});s.rows[0].title='長'.repeat(200);s.rows[0].body='本'.repeat(100000);s.stage.paint();assert.equal(s.rows[0].body.length,100000);assert.equal(s.$('.paper-title').textContent.length,200);assert.equal(s.$('.paper-excerpt').textContent.length,240);s.$('.paper-open').click();assert.equal(s.$('.paper-reader #desk'),s.reader);});
test('explicit external selection reveals an off-page exact manuscript rather than leaving reader on the old paper',async t=>{const s=setup(t);await tick();s.$('.paper-open').click();s.d.dispatchEvent(new s.d.defaultView.CustomEvent('cc:paper-select',{detail:{id:'draft-25'}}));await tick();assert.equal(s.stage.snapshot().opened,'draft-25');assert.equal(s.$('.paper-reader').closest('.paper-card').dataset.paperId,'draft-25');assert.equal(s.d.querySelectorAll('#desk').length,1);s.stage.close();await tick();assert.equal(s.stage.snapshot().opened,null);});
test('a rejected category activation reports failure and retains the actual selected category',async t=>{const s=setup(t);await tick();s.application.openWorkingChapter=()=>false;s.$('[data-paper-chapter=category1]').click();assert.match(s.$('.paper-state').textContent,/開けません/);assert.equal(s.stage.snapshot().key,'insurance');assert.equal(s.$('[data-paper-chapter=insurance]').getAttribute('aria-current'),'page');});
test('future marks isolate exact session, category and manuscript; favorites/read marks stay independent',()=>{
 const values=new Map(),storage={get length(){return values.size;},key:i=>[...values.keys()][i],getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const n=createNotebook({seeds:{kyun:[],tanaka:[]},storage}),a={id:'same',place:'kyun',title:'実原稿',body:'本文',source:{id:'upstream',account:'insurance'}};
 n.replaceSources([a]);assert.equal(n.toggleFuture('same'),false);assert.equal(values.size,1);
 n.setFutureScope('a'.repeat(64));assert.equal(n.toggleFuture('same'),true);assert.equal(n.flag('pin','same'),false);assert.equal(n.completed('kyun').length,0);
 const reload=createNotebook({seeds:{kyun:[],tanaka:[]},storage});reload.setFutureScope('a'.repeat(64));assert.equal(reload.futureFlag('same'),true);reload.setFutureScope('b'.repeat(64));assert.equal(reload.futureFlag('same'),false);
 reload.setFutureScope('a'.repeat(64));reload.replaceSources([{...a,place:'tanaka',source:{id:'upstream',account:'tanaka'}}]);assert.equal(reload.futureFlag('same'),false);
 reload.replaceSources([{...a,source:{id:'different',account:'insurance'}}]);assert.equal(reload.futureFlag('same'),false);reload.setFutureScope('');assert.equal(reload.futureFlag('same'),false);
});

test('delayed opening completion never steals settings or returned menu focus',async t=>{
 const s=setup(t);await tick();
 const card=s.$('.paper-card'),opener=card.querySelector('.paper-open');let finish;
 card.__fold.to=(_value,options)=>{finish=options.done;};
 const dialog=s.d.createElement('dialog'),control=s.d.createElement('button');control.textContent='設定を閉じる';dialog.append(control);s.d.body.append(dialog);
 opener.focus();opener.click();dialog.setAttribute('open','');control.focus();finish();
 assert.equal(s.d.activeElement,control);assert.equal(s.stage.snapshot().phase,'open');
 s.stage.close({immediate:true});dialog.removeAttribute('open');
 opener.focus();opener.click();s.$('.paper-tools summary').focus();finish();
 assert.equal(s.d.activeElement,s.$('.paper-tools summary'));assert.equal(s.stage.snapshot().phase,'open');
 s.stage.close({immediate:true});opener.focus();opener.click();finish();
 assert.equal(s.d.activeElement,s.$('#desk-scroll'),'uninterrupted opening still focuses its reader');
});
