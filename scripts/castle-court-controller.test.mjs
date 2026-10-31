/* Controller contract only. The actual source is evaluated with a stub owner
 * and stub renderer; these tests make NO WebGL or visual-quality claim. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{JSDOM}=require('jsdom');
const original=fs.readFileSync(new URL('../command-center-98/lounge/arrival-atelier.js',import.meta.url),'utf8');
const executable=original
 .replace(/^import \* as spatial from [^\n]+;\n/m,'')
 .replace(/^import \* as application from [^\n]+;\n/m,'')
 .replace(/import\('\.\/arrival-renderer\.js[^']*'\)/g,'__loadRenderer()')
 .replaceAll('import.meta.url','__moduleURL');
assert.notEqual(executable,original);
assert.doesNotMatch(executable,/^import /m,'only the two owner namespace imports are replaced');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const run=new AsyncFunction('window','document','matchMedia','navigator','MutationObserver','ResizeObserver','AbortController','getComputedStyle','spatial','application','__loadRenderer','__moduleURL','fetch','location',executable);
const flush=async()=>{await Promise.resolve();await new Promise(resolve=>setImmediate(resolve));};
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}

async function setup(t,options={}){
 const dom=new JSDOM('<!doctype html><html><head></head><body style="--arrival-court-ready:1"><main id="app"></main><dialog id="settings"><input id="reduce-setting" type="checkbox"><button id="settings-close">閉じる</button></dialog><section class="account-board"><header class="original-header" aria-hidden="false"><button class="board-primary">原稿一覧</button><button class="board-refresh">更新</button><button class="board-lounge">管理</button><button class="castle-experience-settings">設定</button></header><p class="account-board-status">保存原稿読込済み</p><nav class="spatial-castle">'+['insurance','otoku','rakuten','lottery','sourcing'].map(key=>`<button class="castle-quick-open" data-room="${key}">${key}</button>`).join('')+'</nav><footer class="board-footer"></footer></section></body></html>',{url:'https://castle.invalid/lounge/index.html?experience=court',pretendToBeVisual:true});
 const win=dom.window,doc=win.document,panel=doc.querySelector('.account-board'),originalChildren=[...panel.children],gate=deferred();
 t.after(()=>{win.dispatchEvent(new win.Event('pagehide'));dom.window.close();});
 Object.defineProperties(win.HTMLElement.prototype,{clientWidth:{get:()=>390,configurable:true},clientHeight:{get:()=>848,configurable:true}});
 win.HTMLElement.prototype.getBoundingClientRect=function(){return {left:0,top:0,right:390,bottom:848,x:0,y:0,width:390,height:848};};
 const listeners=new Set(),media={matches:!!options.reduced,addEventListener:(_,fn)=>listeners.add(fn),removeEventListener:(_,fn)=>listeners.delete(fn)};
 const emitMedia=value=>{media.matches=value;for(const fn of listeners)fn({matches:value});};
 Object.defineProperty(win.navigator,'deviceMemory',{value:options.lowMemory?2:8,configurable:true});
 Object.defineProperty(win.navigator,'connection',{value:{saveData:!!options.saveData},configurable:true});
 const dialog=doc.getElementById('settings');dialog.close=()=>{dialog.open=false;dialog.dispatchEvent(new win.Event('close'));};doc.querySelector('.castle-experience-settings').addEventListener('click',()=>{dialog.open=true;doc.getElementById('settings-close').focus();});
 const append=doc.head.append.bind(doc.head);doc.head.append=(...nodes)=>{append(...nodes);for(const node of nodes)if(node.tagName==='LINK')queueMicrotask(()=>options.styleFailure?node.onerror?.(new win.Event('error')):node.onload?.(new win.Event('load')));};
 const resizeObservers=[];class ResizeObserver{constructor(callback){this.callback=callback;resizeObservers.push(this);}observe(){}disconnect(){this.disconnected=true;}}
 const subscribers=new Set(),state={lastVisited:null,loading:false},opened=[],graphics={active:true,disposed:false,selected:null,pendingFrame:false,frameCount:1};
 const stored=Object.freeze({rooms:Object.freeze(['insurance','otoku','rakuten','lottery','sourcing'].map(key=>Object.freeze({key,name:key,handle:'@'+key,totalCount:key==='sourcing'?null:1,loadedCount:key==='sourcing'?null:1,unreadCount:0,pendingUpdate:false})))}),sourceBefore=JSON.stringify(stored);
 const board={element:panel,state,subscribe(fn){subscribers.add(fn);fn();return()=>subscribers.delete(fn);}};
 const scene={open(key,trigger,routeOptions){opened.push({key,trigger,options:routeOptions});state.lastVisited=key;for(const fn of subscribers)fn();panel.hidden=true;}};
 const renderer={resizeCalls:[],selectCalls:[],disposeCalls:0,resize(w,h){this.resizeCalls.push([w,h]);},select(key,opts){this.selectCalls.push({key,opts});graphics.selected=key;},home(){graphics.selected=null;},nudge(){},setActive(value){graphics.active=!!value;},pick(){return 'insurance';},diagnostics(){return {...graphics};},dispose(){this.disposeCalls++;graphics.disposed=true;graphics.active=false;}};
 let imports=0,init=null;
 const load=async()=>{imports++;if(options.moduleFailure)throw Error('synthetic optional module failure');return {createCourtRenderer:async opts=>{init=opts;if(options.pending)await gate.promise;return renderer;}};};
 const transport=[];const fetch=win.fetch=(...args)=>{transport.push(args);throw Error('Controller must not issue network requests');};
 const spatial={getSpatialPresentation:()=>({board,scene})},application={getLivingDesk:()=>({snapshot:()=>stored,subscribe(fn){fn(stored);return()=>{};}})};
 if(options.focusOriginal)doc.querySelector('.castle-quick-open').focus();
 const finished=run(win,doc,()=>media,win.navigator,win.MutationObserver,ResizeObserver,win.AbortController,win.getComputedStyle.bind(win),spatial,application,load,'https://castle.invalid/lounge/arrival-atelier.js',fetch,win.location);
 await flush();
 return {win,doc,panel,originalChildren,finished,gate,renderer,graphics,opened,emitMedia,resizeObservers,get imports(){return imports;},get init(){return init;},snapshot:()=>win.__arrivalCourt.snapshot(),sourceUnchanged:()=>JSON.stringify(stored)===sourceBefore&&transport.length===0&&win.localStorage.length===0,back:async()=>{panel.hidden=false;await flush();}};
}

test('loading enhancement leaves the proven castle accessible; only successful first-frame contract isolates it',async t=>{
 const h=await setup(t,{pending:true});assert.equal(h.imports,1);assert.equal(h.snapshot().ready,false);
 for(const node of h.originalChildren)assert.notEqual(node.inert,true);
 assert.equal(h.panel.dataset.court,undefined);h.gate.resolve();await h.finished;await flush();
 assert.equal(h.snapshot().ready,true);assert.equal(h.snapshot().active,true);assert.equal(h.panel.dataset.court,'ready');
 for(const node of h.originalChildren){assert.equal(node.inert,true);assert.equal(node.getAttribute('aria-hidden'),'true');}
 assert.equal(h.sourceUnchanged(),true);
});

test('slow enhancement does not steal existing keyboard work; explicit launch is required',async t=>{
 const h=await setup(t,{pending:true,focusOriginal:true}),original=h.doc.activeElement;h.gate.resolve();await h.finished;await flush();
 assert.equal(h.snapshot().ready,true);assert.equal(h.snapshot().active,false);assert.equal(h.doc.activeElement,original);assert.equal(h.doc.querySelector('.arrival-launch').hidden,false);
 h.doc.querySelector('.arrival-launch').click();await flush();assert.equal(h.snapshot().active,true);assert.equal(h.doc.activeElement.className,'arrival-text-button');
});

test('module failure leaves original child attributes and keyboard focus intact',async t=>{
 const h=await setup(t,{moduleFailure:true,focusOriginal:true});await h.finished;await flush();
 assert.equal(h.snapshot().state,'fallback');assert.equal(h.doc.activeElement.dataset.room,'insurance');assert.equal(h.panel.dataset.court,undefined);
 assert.equal(h.doc.querySelector('.original-header').getAttribute('aria-hidden'),'false');assert.equal(h.doc.querySelector('.spatial-castle').hasAttribute('aria-hidden'),false);
 for(const node of h.originalChildren)assert.notEqual(node.inert,true);assert.equal(h.sourceUnchanged(),true);
});

test('stylesheet failure never imports the renderer or obstructs the original controls',async t=>{
 const h=await setup(t,{styleFailure:true});await h.finished;assert.equal(h.imports,0);assert.equal(h.snapshot().state,'fallback');
 for(const node of h.originalChildren)assert.notEqual(node.inert,true);
});

for(const mode of ['reduced','lowMemory','saveData'])test(mode+' at startup never imports or creates WebGL renderer',async t=>{
 const h=await setup(t,{[mode]:true});await h.finished;assert.equal(h.imports,0);assert.equal(h.init,null);assert.equal(h.snapshot().state,'fallback');assert.equal(h.panel.dataset.court,undefined);
});

test('owner routes remain immediate and Back restores the latest matching visible source control',async t=>{
 const h=await setup(t);await h.finished;
 for(const key of ['insurance','otoku']){
  const trigger=h.doc.querySelector('[data-court-open='+key+']');trigger.click();await flush();
  assert.equal(h.opened.at(-1).key,key);assert.equal(h.opened.at(-1).options.instant,true);assert.equal(h.graphics.active,false);
  await h.back();assert.equal(h.snapshot().selected,key);assert.equal(h.doc.activeElement,trigger);assert.equal(h.snapshot().active,true);
 }
 assert.deepEqual(h.opened.map(item=>item.key),['insurance','otoku']);assert.equal(h.sourceUnchanged(),true);
});

test('context-loss callback retires only graphics and returns focus to the corresponding original room',async t=>{
 const h=await setup(t);await h.finished;h.doc.querySelector('[data-court-open=rakuten]').click();await h.back();
 h.init.onFailure(Error('synthetic context-loss callback, real extension is tested in browser CI'));await flush();
 assert.equal(h.snapshot().state,'fallback');assert.equal(h.snapshot().renderer,null);assert.equal(h.renderer.disposeCalls,1);assert.equal(h.doc.activeElement.dataset.room,'rakuten');
 assert.equal(h.doc.querySelector('.original-header').getAttribute('aria-hidden'),'false');for(const node of h.originalChildren)assert.notEqual(node.inert,true);assert.equal(h.sourceUnchanged(),true);
});

test('mid-session reduced motion suspends graphics; ending it requires explicit re-entry',async t=>{
 const h=await setup(t);await h.finished;h.emitMedia(true);await flush();assert.equal(h.snapshot().state,'fallback');assert.equal(h.graphics.active,false);assert.equal(h.panel.dataset.court,undefined);
 h.emitMedia(false);await flush();assert.equal(h.snapshot().active,false);assert.equal(h.doc.querySelector('.arrival-launch').hidden,false);
 h.doc.querySelector('.arrival-launch').click();await flush();assert.equal(h.snapshot().active,true);assert.equal(h.imports,1);
});

test('late renderer resolution after pagehide is disposed and never replaces the existing castle',async t=>{
 const h=await setup(t,{pending:true});h.win.dispatchEvent(new h.win.Event('pagehide'));assert.equal(h.init.signal.aborted,true);h.gate.resolve();await h.finished;await flush();
 assert.equal(h.renderer.disposeCalls,1);assert.equal(h.snapshot().ready,false);assert.equal(h.panel.dataset.court,undefined);for(const node of h.originalChildren)assert.notEqual(node.inert,true);
});

test('vertical and diagonal touch scrolling never becomes an architectural tap',async t=>{
 const h=await setup(t);await h.finished;const canvas=h.doc.querySelector('.arrival-canvas');
 const pointer=(type,x,y)=>{const event=new h.win.MouseEvent(type,{bubbles:true,clientX:x,clientY:y,button:0});Object.defineProperty(event,'pointerId',{value:1});canvas.dispatchEvent(event);};
 for(const [x,y] of [[100,150],[125,125]]){pointer('pointerdown',100,100);pointer('pointermove',x,y);pointer('pointerup',x,y);}
 assert.equal(h.renderer.selectCalls.length,0);assert.equal(h.opened.length,0);assert.equal(h.snapshot().selected,null);
});

for(const failure of ['context','reduce'])test(failure+' fallback during first exploration restores focus outside the now-hidden court',async t=>{
 const h=await setup(t);await h.finished;h.doc.querySelector('[data-court-room=insurance]').click();h.doc.querySelector('.arrival-enter').focus();
 if(failure==='context')h.init.onFailure(Error('synthetic loss'));else h.emitMedia(true);await flush();
 assert.equal(h.doc.activeElement,h.doc.querySelector('.castle-quick-open[data-room=insurance]'));
 assert.equal(h.doc.querySelector('.arrival-court').contains(h.doc.activeElement),false);
});

test('context loss while reading does not steal focus into the hidden home controls',async t=>{
 const h=await setup(t);await h.finished;h.doc.querySelector('[data-court-open=insurance]').click();await flush();
 const paper=h.doc.createElement('button');paper.textContent='Existing reader copy';h.doc.body.append(paper);paper.focus();
 h.init.onFailure(Error('synthetic loss while existing reader owns focus'));await flush();assert.equal(h.doc.activeElement,paper);
});

test('only trusted parent visibility messages pause or resume an otherwise active court',async t=>{
 const h=await setup(t);await h.finished;
 const send=(type,origin=h.win.location.origin,source=h.win.parent)=>h.win.dispatchEvent(new h.win.MessageEvent('message',{source,origin,data:{channel:'cc-castle-v1',type}}));
 send('pause','https://different.invalid');assert.equal(h.graphics.active,true);
 send('pause',h.win.location.origin,null);assert.equal(h.graphics.active,true);
 send('pause');assert.equal(h.graphics.active,false);send('resume');assert.equal(h.graphics.active,true);
 h.doc.querySelector('[data-court-open=insurance]').click();await flush();send('resume');assert.equal(h.graphics.active,false,'a parent resume cannot awaken the court behind the existing reader');
});

for(const reduce of [false,true])test('settings close restores a visible '+(reduce?'fallback control after reduce changes':'court menu summary'),async t=>{
 const h=await setup(t);await h.finished;const menu=h.doc.querySelector('.arrival-menu');menu.open=true;
 [...h.doc.querySelectorAll('.arrival-menu-items button')].find(button=>button.textContent==='音・演出').click();
 const dialog=h.doc.getElementById('settings'),inside=h.doc.activeElement;assert.equal(dialog.open,true);assert.equal(dialog.contains(inside),true);
 if(reduce){h.doc.getElementById('reduce-setting').checked=true;h.doc.getElementById('reduce-setting').dispatchEvent(new h.win.Event('change'));await flush();assert.equal(h.doc.activeElement,inside,'changing motion settings does not pull focus out of the modal');}
 dialog.close();await flush();assert.equal(h.doc.activeElement,h.doc.querySelector(reduce?'.castle-experience-settings':'.arrival-menu summary'));
});
