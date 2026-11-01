import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {createCourtPassage} from '../command-center-98/lounge/court-passage.js';
import {createPresentationLeases} from '../command-center-98/lounge/arrival-camera.js';
const {JSDOM} = createRequire(import.meta.url)('jsdom');
const flush = () => new Promise(resolve => setImmediate(resolve));
function setup(t, options = {}) {
 const outer = new JSDOM('<!doctype html><html style="--court-passage-ready:1"><body><button id="request">Host work</button></body>', {url:'https://castle.invalid/app.html',pretendToBeVisual:true});
 const inner = new JSDOM('<!doctype html><body><section id="court"><i id="before"></i><canvas class="arrival-canvas" style="touch-action:pan-y; opacity: .9"></canvas><i id="after"></i></section><article id="reader"><button id="copy">Copy source</button><p>Exact owner manuscript</p></article></body>', {url:options.foreign?'https://foreign.invalid/lounge/':'https://castle.invalid/lounge/',pretendToBeVisual:true});
 const win=outer.window,doc=win.document,child=inner.window.document,canvas=child.querySelector('canvas'),parent=canvas.parentNode,style=canvas.getAttribute('style'),animations=[],rafs=new Map(),timers=new Map(),handles=[];let id=0,begins=0,quiet=false;
 const media={matches:false,listeners:new Set(),addEventListener(type,fn){this.listeners.add(fn);},removeEventListener(type,fn){this.listeners.delete(fn);},change(value){this.matches=value;for(const fn of this.listeners)fn({matches:value});}};
 win.matchMedia=()=>media;win.requestAnimationFrame=fn=>{rafs.set(++id,fn);return id;};win.cancelAnimationFrame=key=>rafs.delete(key);win.setTimeout=fn=>{timers.set(++id,fn);return id;};win.clearTimeout=key=>timers.delete(key);
 win.Element.prototype.animate=function(frames,timing){
  if(options.animateFailure)throw Error('Animation unavailable');
  let resolve,reject;const a={node:this,frames,timing,currentTime:0,playState:'running',finished:new Promise((yes,no)=>{resolve=yes;reject=no;}),cancel(){this.playState='idle';reject(Error('Cancelled'));},finish(){this.currentTime=timing.duration;this.playState='finished';resolve();}};animations.push(a);return a;
 };
 const renderer={beginPassage(args){
  begins++;if(options.beginFailure)throw Error('Renderer unavailable');if(options.noHandle)return null;
  const handle={args,returnState:Object.freeze({room:'insurance',pose:Object.freeze({position:[1,2,3]}),width:800,height:596}),paints:[],finishes:[],paint(u,size){this.paints.push({u,...size});if(options.paintFailure)throw Error('Lost context');if(options.paintFalse)return false;return {ok:true,u,phase:u<.44?'approach':u<=.52?'sealed':u<.94?'reveal':'inside'};},finish(value){this.finishes.push({...value,ownerDocument:canvas.ownerDocument,parent:canvas.parentNode});if(options.finishFailure)throw Error('Retired renderer');}};
  handles.push(handle);return handle;
 }};
 const engine=createCourtPassage({document:doc,reducedMotion:()=>quiet});
 const spec=(extra={})=>({room:'insurance',direction:'in',canvas,renderer,surface:{left:0,top:52,width:800,height:596},...extra});
 const seek=time=>{animations.at(-1).currentTime=time;const pending=[...rafs.values()];rafs.clear();for(const fn of pending)fn();};
 const original=child.querySelector('#reader').outerHTML;
 t.after(()=>{engine.destroy();outer.window.close();inner.window.close();});
 return {win,doc,child,canvas,parent,style,renderer,engine,media,animations,rafs,timers,handles,spec,seek,setQuiet(value){quiet=value;},get begins(){return begins;},unchanged(){return child.querySelector('#reader').outerHTML===original;},restored(){assert.equal(canvas.ownerDocument,child);assert.equal(canvas.parentNode,parent);assert.equal(canvas.nextSibling.id,'after');assert.equal(canvas.previousSibling.id,'before');assert.equal(canvas.getAttribute('style'),style);assert.equal(doc.querySelector('.court-passage'),null);assert.equal([...parent.childNodes].filter(n=>n.nodeType===8).length,0);}};
}
test('leases exactly one original canvas into an inert parent layer without changing source work',t=>{
 const h=setup(t);h.child.querySelector('#copy').focus();const token=h.engine.travel(h.spec());assert.ok(token);assert.equal(h.begins,1);assert.equal(h.canvas.ownerDocument,h.doc);assert.equal(h.doc.querySelectorAll('canvas').length,1);assert.equal(h.child.querySelectorAll('canvas').length,0);assert.equal(h.child.activeElement.id,'copy');assert.equal(h.unchanged(),true);
 const layer=h.doc.querySelector('.court-passage');assert.equal(layer.style.top,'52px');assert.equal(layer.style.height,'596px');assert.equal(layer.style.pointerEvents,'none');assert.equal(layer.inert,true);assert.equal(layer.getAttribute('aria-hidden'),'true');assert.deepEqual(h.handles[0].paints[0],{u:0,width:800,height:596});assert.equal(token.returnState,h.handles[0].returnState);
 h.engine.cancel();h.restored();assert.equal(h.handles[0].finishes.length,1);assert.equal(h.handles[0].finishes[0].cancelled,true);assert.equal(h.handles[0].finishes[0].parent,h.parent);assert.equal(h.unchanged(),true);
});
test('ordinary WAAPI clock drives reversible manual renderer progress and completed restoration',async t=>{
 const h=setup(t);h.engine.travel(h.spec());const clock=h.animations[0];assert.equal(clock.id,'court-passage-clock');assert.deepEqual(clock.frames,[{opacity:1},{opacity:1}]);assert.equal(clock.timing.duration,900);
 h.seek(450);assert.equal(h.engine.state().progress,.5);assert.equal(h.doc.querySelector('.court-passage').dataset.phase,'sealed');clock.finish();await flush();h.restored();assert.equal(h.handles[0].finishes[0].cancelled,false);assert.equal(h.handles[0].paints.at(-1).u,1);
 const saved=h.handles[0].returnState;h.engine.travel(h.spec({direction:'out',returnState:saved}));assert.equal(h.handles[1].args.returnState,saved);assert.equal(h.handles[1].paints[0].u,1);h.seek(675);assert.equal(h.handles[1].paints.at(-1).u,.25);h.animations[1].finish();await flush();h.restored();assert.equal(h.handles[1].paints.at(-1).u,0);assert.equal(h.handles[1].finishes[0].direction,'out');
});
test('detached snapshots attach after route, keep actor/paper solid together, and restore scroll after mount',t=>{
 const h=setup(t),token=h.engine.travel(h.spec()),foreground=h.doc.createElement('div'),backdrop=h.doc.createElement('div');foreground.innerHTML='<img data-journey-part="actor"><article data-journey-part="paper"><div data-journey-scroll-top="87">Safe copy</div></article>';let scroll=0;
 Object.defineProperty(foreground.querySelector('[data-journey-scroll-top]'),'scrollTop',{get:()=>scroll,set:value=>{assert.equal(foreground.isConnected,true);scroll=value;}});
 assert.equal(token.setRoom({foreground,roomBackdrop:backdrop}),true);assert.equal(scroll,87);assert.equal(foreground.inert,true);h.seek(400);assert.equal(foreground.parentNode.style.visibility,'hidden');h.seek(450);assert.equal(foreground.parentNode.style.visibility,'visible');assert.equal(backdrop.parentNode.style.visibility,'visible');assert.equal(foreground.querySelector('[data-journey-part=actor]').style.opacity,'');assert.equal(foreground.querySelector('[data-journey-part=paper]').style.opacity,'');
 h.engine.cancel();h.restored();assert.equal(foreground.isConnected,false);assert.equal(token.setRoom({foreground:h.doc.createElement('div')}),false);assert.equal(h.unchanged(),true);
});
test('return snapshots are solid at first frame, and disappear only behind sealed physical door',t=>{
 const h=setup(t),foreground=h.doc.createElement('div'),backdrop=h.doc.createElement('div');h.engine.travel(h.spec({direction:'out',foreground,roomBackdrop:backdrop}));assert.equal(foreground.parentNode.style.visibility,'visible');h.seek(450);assert.equal(foreground.parentNode.style.visibility,'visible');h.seek(500);assert.equal(foreground.parentNode.style.visibility,'hidden');h.engine.cancel();h.restored();
});
test('connected, foreign, or already-parented snapshot nodes are never stolen',t=>{
 const h=setup(t),live=h.child.querySelector('#reader'),foreign=h.child.createElement('div'),holder=h.doc.createElement('div'),nested=h.doc.createElement('div');holder.append(nested);
 const token=h.engine.travel(h.spec({foreground:live,roomBackdrop:foreign}));assert.equal(live.parentNode,h.child.body);assert.equal(foreign.ownerDocument,h.child);assert.equal(foreign.parentNode,null);token.setRoom({foreground:nested});assert.equal(nested.parentNode,holder);h.engine.cancel();assert.equal(h.unchanged(),true);h.restored();
});
test('newer travel and late old finishes never remove or restore the newer lease',async t=>{
 const h=setup(t),first=h.engine.travel(h.spec()),old=h.animations[0];const next=h.engine.travel(h.spec({direction:'out',returnState:first.returnState}));assert.ok(next);assert.equal(h.handles[0].finishes.length,1);old.finish();await flush();assert.equal(h.engine.state().direction,'out');assert.equal(h.canvas.ownerDocument,h.doc);first.cancel();assert.equal(h.engine.state().active,true);h.animations[1].finish();await flush();h.restored();assert.equal(h.handles[1].finishes.length,1);
});
test('a new intent from end notification wins over the interrupted outer travel',t=>{
 const h=setup(t);h.engine.travel(h.spec());h.doc.addEventListener('court:passage-end',()=>h.engine.travel(h.spec({direction:'out'})),{once:true});assert.equal(h.engine.travel(h.spec()),null);assert.equal(h.engine.state().direction,'out');assert.equal(h.doc.querySelectorAll('.court-passage').length,1);
});
for(const reason of ['quick','reduced','appReduced','styles','unsupported','foreign','hidden','invalidSurface','invalidRoom'])test(reason+' skips the optional passage without context or route work',t=>{
 const h=setup(t,{foreign:reason==='foreign'});let extra={};if(reason==='quick')extra.quick=true;if(reason==='reduced')h.media.change(true);if(reason==='appReduced')h.setQuiet(true);if(reason==='styles')h.doc.documentElement.style.removeProperty('--court-passage-ready');if(reason==='unsupported')h.win.Element.prototype.animate=undefined;if(reason==='hidden')Object.defineProperty(h.child,'hidden',{value:true,configurable:true});if(reason==='invalidSurface')extra.surface={left:0,top:52,width:0,height:596};if(reason==='invalidRoom')extra.room='sourcing';assert.equal(h.engine.travel(h.spec(extra)),null);assert.equal(h.begins,0);h.restored();assert.equal(h.unchanged(),true);
});
for(const reason of ['beginFailure','noHandle','paintFailure','paintFalse','animateFailure','finishFailure'])test(reason+' restores exact canvas slot and style without touching original content',async t=>{
 const h=setup(t,{[reason]:true});const token=h.engine.travel(h.spec());if(reason==='finishFailure'){assert.ok(token);h.engine.cancel();}else assert.equal(token,null);await flush();h.restored();assert.equal(h.unchanged(),true);assert.equal(h.rafs.size,0);assert.equal(h.timers.size,0);
});
for(const target of ['parent','child'])for(const type of ['pointerdown','keydown','copy','input','resize','orientationchange','pagehide','visibilitychange'])test(target+' '+type+' cancels presentation without swallowing original input',t=>{
 const h=setup(t);h.engine.travel(h.spec());const doc=target==='parent'?h.doc:h.child,win=doc.defaultView;let observed=0;const source=['resize','orientationchange','pagehide'].includes(type)?win:doc;source.addEventListener(type,()=>observed++);
 if(type==='visibilitychange')Object.defineProperty(doc,'hidden',{value:true,configurable:true});source.dispatchEvent(type==='keydown'?new win.KeyboardEvent(type,{key:'Tab',bubbles:true,cancelable:true}):new win.Event(type,{bubbles:true,cancelable:true}));assert.equal(observed,1);assert.equal(h.engine.state().active,false);h.restored();assert.equal(h.unchanged(),true);
});
test('canvas context loss, reduced preference and app preference all release without waiting',t=>{
 const h=setup(t);h.engine.travel(h.spec());h.canvas.dispatchEvent(new h.win.Event('webglcontextlost'));h.restored();h.engine.travel(h.spec());h.media.change(true);h.restored();h.media.change(false);h.engine.travel(h.spec());h.setQuiet(true);h.seek(100);h.restored();
});
test('cancel is idempotent and an independent compositor cannot steal an active canvas',t=>{
 const h=setup(t),other=createCourtPassage({document:h.doc});h.engine.travel(h.spec());assert.equal(other.travel(h.spec()),null);assert.equal(h.begins,1);other.destroy();assert.equal(h.engine.state().active,true);h.engine.cancel();h.engine.cancel();h.engine.destroy();assert.equal(h.handles[0].finishes.length,1);h.restored();assert.equal(h.media.listeners.size,0);assert.equal(h.engine.travel(h.spec()),null);
});
test('watchdog bounds a broken clock and duration is clamped, without production seek hooks',t=>{
 const h=setup(t);h.engine.travel(h.spec({duration:1}));assert.equal(h.engine.state().duration,400);for(const fn of [...h.timers.values()])fn();h.restored();h.engine.travel(h.spec({duration:1e9}));assert.equal(h.engine.state().duration,1400);h.engine.cancel();h.restored();assert.equal(h.rafs.size,0);assert.equal(h.timers.size,0);
 const source=fs.readFileSync(new URL('../command-center-98/lounge/court-passage.js',import.meta.url),'utf8');assert.doesNotMatch(source,/getContext\s*\(|\bfetch\s*\(|localStorage|sessionStorage|innerHTML|toDataURL|createImageBitmap|postMessage|preventDefault|stopPropagation/);
});
test('Fold viewport change while in the room skips stale return geometry without touching canonical Back',t=>{
 const h=setup(t),token=h.engine.travel(h.spec());const saved=token.returnState;h.engine.cancel();assert.equal(h.engine.travel(h.spec({direction:'out',returnState:saved,surface:{left:0,top:52,width:390,height:848}})),null);assert.equal(h.begins,1);h.restored();assert.equal(h.unchanged(),true);
});
test('reentrant renderer failure cancels and closes a just-returned lease without mounting stale layers',t=>{
 const h=setup(t),old=h.renderer.beginPassage.bind(h.renderer);h.renderer.beginPassage=args=>{const handle=old(args);h.engine.cancel();return handle;};assert.equal(h.engine.travel(h.spec()),null);h.restored();assert.equal(h.handles[0].finishes.length,1);assert.equal(h.handles[0].finishes[0].cancelled,true);
});
test('real renderer lease invalidation releases adopted canvas immediately, including paused clock',t=>{
 const h=setup(t);let resumed=0;
 const state={room:'insurance',pose:{position:[1,2,3],target:[0,1,0],fov:43},width:800,height:596};
 const leases=createPresentationLeases({snapshot:()=>state,suspend(){},valid:()=>true,paint:()=>true,restore(){},resume(){assert.equal(h.canvas.parentNode,h.parent);assert.equal(h.canvas.ownerDocument,h.child);resumed++;}});
 h.renderer.beginPassage=options=>{const lease=leases.acquire(options);return {returnState:lease.returnState,paint(u,size){return {ok:lease.paintPose(state.pose,size),u,phase:'approach'};},finish:lease.finish};};
 const token=h.engine.travel(h.spec());assert.ok(token);assert.equal(token.returnState.width,800);assert.equal(token.returnState.height,596);assert.equal(token.returnState.viewport,undefined);h.animations[0].playState='paused';
 leases.invalidate('resize');assert.equal(h.engine.state().active,false);h.restored();assert.equal(resumed,1);assert.equal(h.rafs.size,0);assert.equal(h.timers.size,0);leases.dispose();
});
test('renderer invalidation after replacement cannot cancel the newer layer',t=>{
 const h=setup(t);h.engine.travel(h.spec());const old=h.handles[0];h.engine.travel(h.spec({direction:'out'}));old.args.onInvalidated('late failure');assert.equal(h.engine.state().active,true);assert.equal(h.engine.state().direction,'out');h.handles[1].args.onInvalidated('context-lost');h.restored();assert.equal(h.handles[1].finishes.length,1);
});
test('disconnecting original parent cancels on the next sampled frame and returns the canvas without an orphan compositor RAF',t=>{
 const h=setup(t);h.engine.travel(h.spec());h.parent.remove();h.seek(200);assert.equal(h.engine.state().active,false);assert.equal(h.canvas.isConnected,false);assert.equal(h.canvas.ownerDocument,h.child);assert.equal(h.canvas.parentNode,h.parent);assert.equal(h.canvas.getAttribute('style'),h.style);assert.equal(h.doc.querySelector('.court-passage'),null);assert.equal(h.handles[0].finishes[0].cancelled,true);assert.equal(h.rafs.size,0);assert.equal(h.timers.size,0);assert.equal(h.unchanged(),true);
});
