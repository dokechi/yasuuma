import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{JSDOM}=require('jsdom');
const root=new URL('../command-center-98/lounge/',import.meta.url);
const read=name=>readFileSync(new URL(name,root),'utf8');
const model=await import('data:text/javascript;base64,'+Buffer.from(read('stained-model.js')).toString('base64'));
const accounts=await import('data:text/javascript;base64,'+Buffer.from(read('accounts.js')).toString('base64'));
function setup(t){
 const dom=new JSDOM(read('index.html'),{url:'https://qa.invalid/lounge/index.html',runScripts:'outside-only'}),w=dom.window;
 w.matchMedia=()=>({matches:true});w.HTMLElement.prototype.scrollIntoView=function(){this.dataset.scrolled='true';};
 const panel=w.document.createElement('section');w.document.body.append(panel);let listener;const calls=[];
 const board={element:panel,state:{destinations:[],complete:true},subscribe(fn){listener=fn;return ()=>{};},open(key){calls.push(key);}};
 w.application={getAccountBoard:()=>board,getPaperDesk:()=>({})};Object.assign(w,model);
 w.eval(read('stained-art.js').replace('export function createGlassArt','function createGlassArt'));w.art=w.createGlassArt;
 w.eval(read('stained-order.js').replace(/export /g,''));w.installGalleryOrder= w.eval('installGalleryOrder');
 w.eval(read('stained-atelier.js').replace(/^import .*;\n/gm,''));
 t.after(()=>w.close());return {w,board,calls,render:()=>listener(),cards:[...w.document.querySelectorAll('.sg-card')]};
}
test('ten slots match all nine saved identities plus sourcing',()=>{
 assert.deepEqual(new Set(model.glassSlots.filter(x=>!x.pending).map(x=>x.key)),new Set([...accounts.publishingAccounts.map(x=>x.key),'sourcing']));
 assert.equal(model.glassSlots.length,10);assert.equal(model.glassFor('tanaka').label,'固定費');assert.equal(model.glassFor('kensho').label,'懸賞');
 assert.equal(model.glassFor('skun').label,'Sくん');
 assert.equal(model.glassSlots.filter(slot=>slot.pending).length,0);
 assert.equal(new Set(model.glassSlots.map(x=>x.key)).size,10);
});
test('glass clicks open the corresponding owner routes, including Sくん',t=>{
 const h=setup(t);for(const c of h.cards)c.click();assert.deepEqual(h.calls,model.glassSlots.filter(s=>!s.pending).map(s=>s.key));
 const skun=h.cards.find(c=>c.dataset.key==='skun');
 assert.equal(skun.getAttribute('aria-label'),'Sくんの原稿を開く');
 assert.ok(skun.querySelector('.sg-character'));
 assert.equal(skun.querySelector('.sg-plinth').getAttribute('data-foot-plane'),'650');
});
test('keyboard navigation reaches all slots and does not open them until activated',t=>{
 const h=setup(t);h.cards[0].focus();h.cards[0].dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'End',bubbles:true}));
 assert.equal(h.w.document.activeElement,h.cards[9]);assert.equal(h.cards[9].dataset.scrolled,'true');assert.deepEqual(h.calls,[]);
 h.cards[9].dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'Home',bubbles:true}));assert.equal(h.w.document.activeElement,h.cards[0]);
});
test('source status updates retain the same glass controls and manuscript editor DOM',async t=>{
 const h=setup(t),body=h.w.document.getElementById('draft-body');h.board.state={destinations:[{key:'insurance',status:'保存原稿 3本'}],complete:true};h.render();await Promise.resolve();
 assert.equal(h.cards[0].querySelector('.sg-count').textContent,'保存原稿 3本');assert.equal(h.w.document.getElementById('draft-body'),body);assert.equal(h.w.document.querySelector('.sg-card'),h.cards[0]);
});
test('arrow glide is halfway at 650ms, finishes at 1300ms and touch interrupts it',t=>{
 const h=setup(t),w=h.w,rail=w.document.querySelector('.sg-rail');let frame;
 w.matchMedia=()=>({matches:false});w.performance.now=()=>0;
 w.requestAnimationFrame=fn=>{frame=fn;return 1;};w.cancelAnimationFrame=()=>{frame=null;};
 Object.defineProperties(rail,{clientWidth:{value:1000},scrollWidth:{value:3000}});rail.dispatchEvent(new w.Event('scroll'));
 w.document.querySelector('[aria-label="右へスクロール"]').click();
 frame(650);assert.equal(rail.scrollLeft,350);frame(1300);assert.equal(rail.scrollLeft,700);
 w.document.querySelector('[aria-label="右へスクロール"]').click();
 rail.dispatchEvent(new w.Event('pointerdown'));assert.equal(frame,null);assert.equal(rail.style.scrollSnapType,'');
});
test('visible reorder button enters edit mode and Done restores opening',t=>{
 const h=setup(t),d=h.w.document,trigger=d.querySelector('.sg-order-trigger'),done=d.querySelector('.sg-order-done');
 assert.equal(trigger.hidden,false);trigger.click();assert.equal(done.hidden,false);assert.equal(trigger.hidden,true);
 h.cards[0].click();assert.deepEqual(h.calls,[]);done.click();assert.equal(trigger.hidden,false);h.cards[0].click();assert.deepEqual(h.calls,['insurance']);
});

test('reader and gallery transitions move keyboard focus to visible presentation controls only',async t=>{
 const h=setup(t),d=h.w.document,room=d.getElementById('room');
 h.cards[2].focus();room.dataset.account=h.cards[2].dataset.key;h.board.element.hidden=true;room.hidden=false;
 // The original owner focuses #back, which this presentation intentionally hides.
 d.getElementById('back').focus();h.render();await Promise.resolve();
 assert.equal(d.activeElement,room.querySelector('.sg-title'));
 const query=d.getElementById('desk-query');query.focus();h.render();await Promise.resolve();
 assert.equal(d.activeElement,query,'source repaint must not steal focus from an editor/search field');
 h.board.element.hidden=false;room.hidden=true;h.render();await Promise.resolve();
 assert.equal(d.activeElement,h.cards[2]);
});

test('reader account switches expose the current heading without a stale accessible label',async t=>{
 const h=setup(t),d=h.w.document,room=d.getElementById('room'),heading=d.getElementById('desk-title');
 for(const key of ['skun','insurance','otoku','rakuten','kensho','insurance']){
  room.hidden=true;h.board.element.hidden=false;h.render();await Promise.resolve();
  room.dataset.account=key;room.hidden=false;h.board.element.hidden=true;h.render();await Promise.resolve();
  const expected=model.glassFor(key).label+'の原稿';
  assert.equal(heading.textContent,expected);
  assert.equal(heading.getAttribute('aria-label'),null,'heading derives its accessible name from its current text');
  assert.equal(heading.getAttribute('aria-labelledby'),null,'no external label overrides current heading text');
 }
});
