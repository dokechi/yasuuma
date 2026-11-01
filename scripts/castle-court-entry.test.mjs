/* Actual entry source with only its existing owner namespace and dynamic court
   import injected. This proves admission/intent ownership, not WebGL rendering. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const {JSDOM}=createRequire(import.meta.url)('jsdom');
const source=fs.readFileSync(new URL('../command-center-98/lounge/arrival-entry.js',import.meta.url),'utf8');
const executable=source.replace(/^import \* as spatial from [^\n]+;\n/m,'').replace(/import\('\.\/arrival-atelier\.js[^']*'\)/g,'__loadCourt()').replace('export function installArrivalEntry','function installArrivalEntry');
assert.notEqual(executable,source);assert.doesNotMatch(executable,/^import /m);
const run=new Function('spatial','__loadCourt',executable);
const flush=async()=>{await Promise.resolve();await new Promise(resolve=>setImmediate(resolve));};
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
function setup(t,options={}){
 const dom=new JSDOM('<!doctype html><body><dialog id="settings"><input id="reduce-setting" type="checkbox"><button>Close</button></dialog><section class="account-board" data-view="rooms"><button class="board-primary">List</button><button class="room-open">Read</button><input class="query"><footer class="board-footer"></footer></section><article id="reader" hidden><button id="copy">Copy unchanged original</button></article></body>',{url:'https://castle.invalid/lounge/index.html',pretendToBeVisual:true});
 const win=dom.window,doc=win.document,panel=doc.querySelector('.account-board'),gate=deferred(),listeners=new Set(),connectionListeners=new Set(),state={ready:false,failed:false,active:false,available:false};
 const media={matches:!!options.reduced,addEventListener(type,fn){listeners.add(fn);},removeEventListener(type,fn){listeners.delete(fn);}};
 win.matchMedia=()=>media;const connection={saveData:!!options.saveData,addEventListener(type,fn){connectionListeners.add(fn);},removeEventListener(type,fn){connectionListeners.delete(fn);}};
 Object.defineProperty(win.navigator,'connection',{value:connection});Object.defineProperty(win.navigator,'deviceMemory',{value:options.lowMemory?2:8,configurable:true});
 doc.getElementById('reduce-setting').checked=!!options.reduceControl;
 const requests=[],writes=[],records=Object.freeze([{id:'owner-1',body:'Exact saved manuscript'}]),before=JSON.stringify(records);win.fetch=(...args)=>{requests.push(args);throw Error('No backend fetch in entry');};
 const set=win.Storage.prototype.setItem;win.Storage.prototype.setItem=function(...args){writes.push(args);return set.apply(this,args);};
 let imports=0,activations=0,bindings=0,ownerClicks=0;
 doc.querySelector('.room-open').addEventListener('click',()=>{ownerClicks++;panel.hidden=true;doc.getElementById('reader').hidden=false;doc.getElementById('copy').focus();});
 const owner={getSpatialPresentation:()=>options.missingOwner?null:{board:{element:panel,state:Object.freeze({lastVisited:null}),records},scene:{open(){throw Error('Entry must never route itself');}}}};
 function activateCourt(){if(!state.ready||state.failed||!state.available||panel.hidden||doc.querySelector('dialog[open]'))return false;activations++;state.active=true;return true;}
 async function load(){
  imports++;
  if(options.pending)await gate.promise;
  if(options.moduleFailure)throw Error('Optional module unavailable');
  state.failed=!!options.contextFailure;state.ready=!state.failed;state.available=state.ready&&!media.matches&&!connection.saveData&&!doc.getElementById('reduce-setting').checked;
  if(options.notReady){state.ready=false;state.available=false;}
  if(options.invalidExports)return {};
  const button=doc.querySelector('[data-arrival-entry]');
  // The real controller owns this single handler only once initialization has
  // settled; the lightweight entry must relinquish its own handler at handoff.
  button.removeAttribute('aria-busy');button.textContent=state.failed||!state.ready?'3Dを利用できません':'3Dの中庭';button.disabled=!state.available;button.dataset.arrivalEntryState=state.ready?'ready':'unavailable';button.addEventListener('click',activateCourt);bindings++;
  return {activateCourt,getCourtState:()=>({...state})};
 }
 run(owner,load);
 t.after(()=>{win.dispatchEvent(new win.Event('pagehide'));dom.window.close();});
 const button=doc.querySelector('[data-arrival-entry]');
 return {win,doc,panel,button,state,gate,load,owner,records,requests,writes,emitMedia(value){media.matches=value;for(const fn of listeners)fn({matches:value});},emitSaveData(value){connection.saveData=value;for(const fn of connectionListeners)fn();},get imports(){return imports;},get activations(){return activations;},get bindings(){return bindings;},get ownerClicks(){return ownerClicks;},sourceUnchanged(){return JSON.stringify(records)===before&&requests.length===0&&writes.length===0;}};
}
test('default entry is tiny and performs no court/vendor/model import or persistence before explicit tap',async t=>{
 const h=setup(t);await flush();assert.equal(h.imports,0);assert.equal(h.button.textContent,'3Dの中庭');assert.equal(h.button.parentElement.className,'board-footer');assert.equal(h.button.disabled,false);assert.equal(h.button.style.minHeight,'44px');assert.equal(h.sourceUnchanged(),true);
 assert.doesNotMatch(source,/arrival-renderer|vendor\/|\.glb|localStorage|sessionStorage|\bfetch\s*\(/);assert.match(source,/spatial-atelier\.js\?v=20261101\.5-arrival/);assert.match(source,/arrival-atelier\.js\?v=20261101\.5-arrival/);
});
test('single explicit intent waits for first-frame contract without blocking old controls; double click imports once',async t=>{
 const h=setup(t,{pending:true});h.button.click();h.button.click();assert.equal(h.imports,1);assert.equal(h.activations,0);assert.equal(h.button.getAttribute('aria-busy'),'true');assert.equal(h.panel.inert,undefined);assert.equal(h.doc.querySelector('.room-open').disabled,false);
 h.gate.resolve();await flush();assert.equal(h.activations,1);assert.equal(h.state.active,true);assert.equal(h.button.hasAttribute('aria-busy'),false);assert.equal(h.bindings,1);assert.equal(h.sourceUnchanged(),true);
 h.state.active=false;h.button.click();await flush();assert.equal(h.activations,2,'only controller handler owns ready re-entry');assert.equal(h.imports,1);
});
test('a real original reader route cancels delayed activation and its event is never suppressed',async t=>{
 const h=setup(t,{pending:true});h.button.click();h.doc.querySelector('.room-open').click();assert.equal(h.ownerClicks,1);assert.equal(h.panel.hidden,true);assert.equal(h.doc.activeElement.id,'copy');
 h.gate.resolve();await flush();assert.equal(h.activations,0);assert.equal(h.doc.activeElement.id,'copy');assert.equal(h.button.hasAttribute('aria-busy'),false);assert.equal(h.sourceUnchanged(),true);
 h.panel.hidden=false;h.doc.getElementById('reader').hidden=true;h.button.click();await flush();assert.equal(h.activations,1);assert.equal(h.imports,1);
});
for(const action of ['dialog','focus','keyboard','escape','list','hidden-return'])test('pending '+action+' work wins over delayed first frame',async t=>{
 const h=setup(t,{pending:true});h.button.click();
 if(action==='dialog'){h.doc.getElementById('settings').open=true;await flush();h.doc.getElementById('settings').open=false;}
 if(action==='focus')h.doc.querySelector('.query').focus();
 if(action==='keyboard')h.doc.querySelector('.query').dispatchEvent(new h.win.KeyboardEvent('keydown',{key:'a',bubbles:true}));
 if(action==='escape')h.button.dispatchEvent(new h.win.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 if(action==='list')h.panel.dataset.view='list';
 if(action==='hidden-return'){h.panel.hidden=true;h.panel.hidden=false;}
 await flush();h.gate.resolve();await flush();assert.equal(h.activations,0);assert.equal(h.button.hasAttribute('aria-busy'),false);assert.equal(h.sourceUnchanged(),true);
});
for(const mode of ['reduced','reduceControl','saveData','lowMemory'])test(mode+' startup never imports expensive presentation',async t=>{
 const h=setup(t,{[mode]:true});h.button.click();await flush();assert.equal(h.imports,0);assert.equal(h.button.disabled,true);assert.equal(h.button.dataset.arrivalEntryState,'blocked');assert.equal(h.sourceUnchanged(),true);
});
test('preference off/on before first load updates admission but never auto-imports',async t=>{
 const h=setup(t,{reduced:true});h.emitMedia(false);assert.equal(h.button.disabled,false);assert.equal(h.imports,0);h.emitSaveData(true);assert.equal(h.button.disabled,true);h.emitSaveData(false);assert.equal(h.imports,0);h.button.click();await flush();assert.equal(h.imports,1);assert.equal(h.activations,1);
});
test('a reduce setting chosen while loading cancels activation even if reverted before readiness',async t=>{
 const h=setup(t,{pending:true});h.button.click();h.emitMedia(true);h.emitMedia(false);h.gate.resolve();await flush();assert.equal(h.activations,0);assert.equal(h.button.disabled,false);h.button.click();await flush();assert.equal(h.activations,1);assert.equal(h.imports,1);
});
for(const reason of ['moduleFailure','contextFailure','notReady','invalidExports'])test(reason+' leaves the original UI and data intact, clears busy and never retries contexts',async t=>{
 const h=setup(t,{[reason]:true});h.button.click();await flush();assert.equal(h.activations,0);assert.equal(h.button.hasAttribute('aria-busy'),false);assert.equal(h.button.disabled,true);assert.equal(h.panel.hidden,false);assert.notEqual(h.panel.inert,true);h.button.click();await flush();assert.equal(h.imports,1);assert.equal(h.sourceUnchanged(),true);
});
test('only the trusted host pause invalidates pending activation',async t=>{
 const h=setup(t,{pending:true});h.button.click();
 const send=(type,source,origin)=>h.win.dispatchEvent(new h.win.MessageEvent('message',{source,origin,data:{channel:'cc-castle-v1',type}}));
 send('pause',null,h.win.location.origin);send('pause',h.win.parent,'https://foreign.invalid');h.gate.resolve();await flush();assert.equal(h.activations,1);
});
test('trusted pause/resume cannot resurrect the original pending intent',async t=>{
 const h=setup(t,{pending:true});h.button.click();
 for(const type of ['pause','resume'])h.win.dispatchEvent(new h.win.MessageEvent('message',{source:h.win.parent,origin:h.win.location.origin,data:{channel:'cc-castle-v1',type}}));
 h.gate.resolve();await flush();assert.equal(h.activations,0);assert.equal(h.imports,1);
});
test('pagehide and document hiding prevent late promotion without touching owner source',async t=>{
 const h=setup(t,{pending:true});h.button.click();Object.defineProperty(h.doc,'hidden',{value:true,configurable:true});h.doc.dispatchEvent(new h.win.Event('visibilitychange'));Object.defineProperty(h.doc,'hidden',{value:false,configurable:true});h.win.dispatchEvent(new h.win.Event('pagehide'));h.gate.resolve();await flush();assert.equal(h.activations,0);assert.equal(h.button.hasAttribute('aria-busy'),false);assert.equal(h.sourceUnchanged(),true);
});
test('missing spatial owner creates nothing and repeat module installation does not duplicate the entry',async t=>{
 const missing=setup(t,{missingOwner:true});assert.equal(missing.button,null);assert.equal(missing.imports,0);
 const h=setup(t);run(h.owner,h.load);assert.equal(h.doc.querySelectorAll('[data-arrival-entry]').length,1);h.button.click();await flush();assert.equal(h.imports,1);assert.equal(h.activations,1);
});

test('the lightweight entry follows list/room visibility without importing graphics',async t=>{
 const h=setup(t);h.panel.dataset.view='list';await flush();assert.equal(h.button.hidden,true);h.button.click();await flush();assert.equal(h.imports,0);
 h.panel.dataset.view='rooms';await flush();assert.equal(h.button.hidden,false);assert.equal(h.imports,0);
 h.panel.hidden=true;await flush();assert.equal(h.button.hidden,true);h.panel.hidden=false;await flush();assert.equal(h.button.hidden,false);
});
test('module failure still hides its disabled entry in the manuscript-first list',async t=>{
 const h=setup(t,{moduleFailure:true});h.button.click();await flush();assert.equal(h.button.disabled,true);h.panel.dataset.view='list';await flush();assert.equal(h.button.hidden,true);assert.equal(h.imports,1);
});

test('a new pointer gesture on the old castle background cancels only promotion, not the gesture',async t=>{
 const h=setup(t,{pending:true});let received=0;h.panel.addEventListener('pointerdown',()=>received++);h.button.click();h.panel.dispatchEvent(new h.win.MouseEvent('pointerdown',{bubbles:true,button:0}));h.gate.resolve();await flush();assert.equal(received,1);assert.equal(h.activations,0);assert.equal(h.imports,1);
});
