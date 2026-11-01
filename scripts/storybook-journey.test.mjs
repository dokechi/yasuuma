import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {createStorybookJourney} from '../command-center-98/lounge/storybook-journey.js';
const {JSDOM}=createRequire(import.meta.url)('jsdom');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function setup(t,options={}){
 const dom=new JSDOM('<!doctype html><html style="--storybook-journey-ready:1"><body><button id="copy">Copy</button><article id="reader"><p>Exact live manuscript</p></article></body>',{url:'https://book.invalid/app.html',pretendToBeVisual:true});
 const child=new JSDOM('<!doctype html><body><button id="work">Original child work</button></body>',{url:'https://book.invalid/lounge/',pretendToBeVisual:true});
 const win=dom.window,doc=win.document,animations=[],rafs=new Map(),timers=new Map(),events=[];let id=0,quiet=false,calls=0;
 Object.defineProperties(win,{innerWidth:{value:800,configurable:true},innerHeight:{value:648,configurable:true}});Object.defineProperty(doc,'timeline',{value:{currentTime:125}});
 const media={matches:false,listeners:new Set(),addEventListener(type,fn){this.listeners.add(fn);},removeEventListener(type,fn){this.listeners.delete(fn);},change(value){this.matches=value;for(const fn of this.listeners)fn({matches:value});}};
 win.matchMedia=()=>media;win.requestAnimationFrame=fn=>{rafs.set(++id,fn);return id;};win.cancelAnimationFrame=key=>rafs.delete(key);win.setTimeout=(fn,delay)=>{timers.set(++id,{fn,delay});return id;};win.clearTimeout=key=>timers.delete(key);
 win.Element.prototype.animate=function(frames,timing){
  if(++calls===options.failAnimation)throw Error('Animation unavailable');let resolve,reject;
  const value={node:this,frames,timing,startTime:null,currentTime:0,playState:'running',finished:new Promise((yes,no)=>{resolve=yes;reject=no;}),cancel(){this.playState='idle';reject(Error('cancelled'));},pause(){this.playState='paused';},finish(){this.currentTime=timing.duration;this.playState='finished';resolve();}};animations.push(value);return value;
 };
 for(const type of ['storybook:journey-start','storybook:journey-end'])doc.addEventListener(type,e=>events.push({type,...e.detail}));
 const engine=createStorybookJourney({document:doc,reducedMotion:()=>quiet});
 const scene=(label='Original illustration')=>{const root=doc.createElement('div'),object=doc.createElement('i');root.className='original-scene';object.dataset.storybookPart='figure';object.style.transform='rotate(-7deg)';object.style.translate='4px 2px';object.style.rotate='3deg';object.style.scale='.9';object.textContent=label;root.append(object);return root;};
 const foreground=(label='Exact safe text')=>{const root=doc.createElement('div'),paper=doc.createElement('article'),button=doc.createElement('button');paper.dataset.journeyPart='paper';paper.textContent=label;button.textContent='Copy';paper.append(button);root.append(paper);return root;};
 const spec=(extra={})=>({room:'insurance',direction:'in',surface:{left:0,top:52,width:800,height:596},sourceScene:scene(),destinationScene:scene('Destination illustration'),...extra});
 const seek=fraction=>{for(const a of animations)if(a.playState!=='idle')a.currentTime=a.timing.duration*fraction;const pending=[...rafs.values()];rafs.clear();for(const fn of pending)fn();};
 const clock=()=>animations.findLast(a=>a.id==='storybook-journey-clock');
 const original=doc.getElementById('reader').outerHTML;
 t.after(()=>{engine.destroy();dom.window.close();child.window.close();});
 return {win,doc,child:child.window.document,engine,media,animations,rafs,timers,events,scene,foreground,spec,seek,clock,setQuiet(value){quiet=value;},unchanged(){return doc.getElementById('reader').outerHTML===original;}};
}
test('one inert paper passage carries the exact original decoration and preserves every independent object transform',t=>{
 const h=setup(t),source=h.scene(),figure=source.firstElementChild,transform=figure.getAttribute('style');h.doc.getElementById('copy').focus();const token=h.engine.travel(h.spec({sourceScene:source}));assert.ok(token);
 const layer=h.doc.querySelector('.storybook-journey');assert.equal(layer.style.top,'52px');assert.equal(layer.style.height,'596px');assert.equal(layer.style.pointerEvents,'none');assert.equal(layer.inert,true);assert.equal(layer.getAttribute('aria-hidden'),'true');
 assert.equal(layer.querySelector('.storybook-journey-source').firstElementChild,source);assert.equal(figure.getAttribute('style'),transform);assert.equal(h.animations.some(a=>a.node===figure),false);assert.equal(h.animations.some(a=>a.node===source),false);assert.equal(h.doc.activeElement.id,'copy');assert.equal(h.unchanged(),true);assert.equal(layer.querySelectorAll('.storybook-journey-fold').length,3);
 assert.equal(h.clock().timing.duration,620);assert.ok(h.animations.every(a=>a.startTime===125&&a.timing.duration===620));h.engine.cancel();assert.equal(layer.isConnected,false);assert.equal(h.doc.getElementById('reader').isConnected,true);assert.equal(h.unchanged(),true);
});
test('the three opaque paper segments close before scene and flat manuscript handoff',t=>{
 const h=setup(t),paper=h.foreground(),sourcePaper=h.foreground('Outgoing manuscript');h.engine.travel(h.spec({foreground:paper,sourceForeground:sourcePaper}));
 const folds=h.animations.filter(a=>a.id.startsWith('storybook-fold-'));assert.equal(folds.length,3);for(const fold of folds){assert.ok(fold.frames.find(frame=>frame.offset<=.41&&frame.offset>.3&&frame.transform==='translateX(0%) rotateY(0deg)'));assert.equal(fold.frames.find(frame=>frame.offset===.56).transform,'translateX(0%) rotateY(0deg)');}
 for(const id of ['storybook-flat-source','storybook-flat-destination']){const a=h.animations.find(value=>value.id===id);assert.ok(a.frames.every(frame=>!('transform'in frame)&&!('opacity'in frame)));}
 assert.equal(h.animations.some(a=>paper.contains(a.node)||sourcePaper.contains(a.node)),false);assert.equal(paper.querySelector('article').style.transform,'');assert.equal(h.animations.find(a=>a.id==='storybook-flat-source').frames[0].visibility,'visible');
 for(const [progress,phase]of [[0,'press'],[.2,'fold'],[.5,'covered'],[.7,'unfold'],[.95,'settle']]){h.seek(progress);assert.equal(h.engine.state().phase,phase);assert.equal(h.doc.querySelector('.storybook-journey').dataset.phase,phase);}
 const css=fs.readFileSync(new URL('../command-center-98/lounge/storybook-journey.css',import.meta.url),'utf8');assert.match(css,/\.storybook-journey-fold\{[^}]*background:var\(--page-paper\)/);assert.match(css,/\.storybook-journey-flat-source[^}]*transform:none/);
});
test('canonical work may commit immediately while the optional page is still running',t=>{
 const h=setup(t);const token=h.engine.travel(h.spec());assert.ok(token);let work=0;h.doc.getElementById('copy').addEventListener('click',()=>work++);h.doc.getElementById('copy').click();assert.equal(work,1);assert.equal(h.engine.state().active,true);assert.equal(h.unchanged(),true);
});
test('safe post-route destination and scroll are mounted without moving source work or retaining late snapshots',t=>{
 const h=setup(t),token=h.engine.travel(h.spec({destinationScene:null})),scene=h.scene('Committed chapter'),foreground=h.foreground(),paper=foreground.firstElementChild;paper.dataset.journeyScrollTop='87';paper.dataset.courtScrollLeft='12';let top=0,left=0;
 Object.defineProperties(paper,{scrollTop:{get:()=>top,set:value=>{assert.equal(paper.isConnected,true);top=value;}},scrollLeft:{get:()=>left,set:value=>{assert.equal(paper.isConnected,true);left=value;}}});
 assert.equal(token.setDestination({scene,foreground}),true);assert.equal(top,87);assert.equal(left,12);assert.equal(h.doc.querySelector('.storybook-journey-destination').firstElementChild,scene);h.engine.cancel();assert.equal(token.setDestination({scene:h.scene()}),false);assert.equal(h.unchanged(),true);
});
test('reverse turns the same page in the opposite direction and starts with the current flat work visible',t=>{
 const h=setup(t);h.engine.travel(h.spec({direction:'out',sourceForeground:h.foreground()}));assert.equal(h.engine.state().direction,'out');const source=h.animations.find(a=>a.id==='storybook-source');assert.equal(source.frames[2].offset,.4);assert.equal(source.frames[2].transform,'translateX(0%) rotateY(0deg)');assert.match(source.frames[3].transform,/translateX\(22%\) rotateY\(48deg\)/);assert.equal(source.node.style.transformOrigin,'100% 50%');assert.equal(h.animations.find(a=>a.id==='storybook-flat-source').frames[0].visibility,'visible');h.seek(.5);assert.equal(h.engine.state().phase,'covered');
});
test('all five original destinations and chapter switching keep identity without graphics contexts',t=>{
 const h=setup(t);for(const room of ['insurance','otoku','rakuten','lottery','sourcing']){assert.ok(h.engine.travel(h.spec({room,direction:'switch'})));assert.equal(h.engine.state().room,room);assert.equal(h.doc.querySelectorAll('.storybook-journey').length,1);assert.equal(h.doc.querySelectorAll('canvas').length,0);}
});
test('late finishes and stale tokens cannot delete or update a newer chapter',async t=>{
 const h=setup(t),first=h.engine.travel(h.spec()),old=h.clock();const second=h.engine.travel(h.spec({room:'otoku'}));assert.ok(second);old.finish();await flush();first.cancel();assert.equal(first.setDestination({scene:h.scene()}),false);assert.equal(h.engine.state().room,'otoku');assert.equal(h.doc.querySelectorAll('.storybook-journey').length,1);h.clock().finish();await flush();assert.equal(h.engine.state().active,false);assert.equal(h.events.at(-1).cancelled,false);
});
test('a newer route during synchronous end notification wins over the outer intent',t=>{
 const h=setup(t);h.engine.travel(h.spec());h.doc.addEventListener('storybook:journey-end',()=>h.engine.travel(h.spec({room:'lottery'})),{once:true});assert.equal(h.engine.travel(h.spec({room:'rakuten'})),null);assert.equal(h.engine.state().room,'lottery');assert.equal(h.doc.querySelectorAll('.storybook-journey').length,1);
});
test('cancelling from the start event returns no stale active token',t=>{const h=setup(t);h.doc.addEventListener('storybook:journey-start',()=>h.engine.cancel(),{once:true});assert.equal(h.engine.travel(h.spec()),null);assert.equal(h.doc.querySelector('.storybook-journey'),null);assert.equal(h.events.at(-1).cancelled,true);});
test('a reentrant preference or snapshot getter cannot mount a stale outer chapter',t=>{
 const h=setup(t);let once=true,engine;engine=createStorybookJourney({document:h.doc,reducedMotion:()=>{if(once){once=false;engine.cancel();}return false;}});assert.equal(engine.travel(h.spec()),null);assert.equal(h.doc.querySelector('.storybook-journey'),null);engine.destroy();
 const value=h.spec();Object.defineProperty(value,'sourceScene',{get(){h.engine.cancel();return h.scene();}});assert.equal(h.engine.travel(value),null);assert.equal(h.doc.querySelector('.storybook-journey'),null);
});
for(const reason of ['quick','os-reduced','app-reduced','styles','unsupported','hidden','invalid-surface','invalid-room','invalid-direction'])test(reason+' is a genuinely instant path with no overlay or work mutation',t=>{
 const h=setup(t);let extra={};if(reason==='quick')extra.quick=true;if(reason==='os-reduced')h.media.change(true);if(reason==='app-reduced')h.setQuiet(true);if(reason==='styles')h.doc.documentElement.style.removeProperty('--storybook-journey-ready');if(reason==='unsupported')h.win.Element.prototype.animate=undefined;if(reason==='hidden')Object.defineProperty(h.doc,'hidden',{configurable:true,value:true});if(reason==='invalid-surface')extra.surface={left:0,top:52,width:NaN,height:596};if(reason==='invalid-room')extra.room='reserve';if(reason==='invalid-direction')extra.direction='unknown';assert.equal(h.engine.travel(h.spec(extra)),null);assert.equal(h.animations.length,0);assert.equal(h.doc.querySelector('.storybook-journey'),null);assert.equal(h.unchanged(),true);
});
test('quick work cancels an already running page instead of waiting for its remaining duration',t=>{const h=setup(t);h.engine.travel(h.spec());assert.equal(h.engine.travel(h.spec({quick:true})),null);assert.equal(h.engine.state().active,false);assert.equal(h.doc.querySelector('.storybook-journey'),null);});
for(const target of ['parent','child'])for(const type of ['pointerdown','keydown','input','copy','cut','paste','resize','orientationchange','pagehide','visibilitychange','popstate'])test(target+' '+type+' cancels the presentation and never suppresses original work',t=>{
 const h=setup(t);h.engine.travel(h.spec({sourceDocument:h.child}));const doc=target==='parent'?h.doc:h.child,win=doc.defaultView,source=['resize','orientationchange','pagehide','popstate'].includes(type)?win:doc;let received=0;source.addEventListener(type,()=>received++);
 if(type==='visibilitychange')Object.defineProperty(doc,'hidden',{configurable:true,value:true});const event=type==='keydown'?new win.KeyboardEvent(type,{key:'Escape',cancelable:true,bubbles:true}):new win.Event(type,{cancelable:true,bubbles:true});source.dispatchEvent(event);assert.equal(received,1);assert.equal(event.defaultPrevented,false);assert.equal(h.engine.state().active,false);assert.equal(h.doc.querySelector('.storybook-journey'),null);assert.equal(h.unchanged(),true);
});
test('modifier keys alone do not interrupt but Tab immediately does',t=>{const h=setup(t);h.engine.travel(h.spec());h.doc.dispatchEvent(new h.win.KeyboardEvent('keydown',{key:'Shift'}));assert.equal(h.engine.state().active,true);h.doc.dispatchEvent(new h.win.KeyboardEvent('keydown',{key:'Tab'}));assert.equal(h.engine.state().active,false);});
test('changed motion preference, silent geometry change and removed layer cancel on the next frame',t=>{for(const reason of ['preference','geometry','removed']){const h=setup(t);h.engine.travel(h.spec());if(reason==='preference')h.setQuiet(true);if(reason==='geometry')Object.defineProperty(h.win,'innerWidth',{value:390,configurable:true});if(reason==='removed')h.doc.querySelector('.storybook-journey').remove();h.seek(.2);assert.equal(h.engine.state().active,false);assert.equal(h.rafs.size,0);assert.equal(h.timers.size,0);}});
test('OS reduce and destroy clear every owned resource and preserve an unrelated layer',async t=>{
 const h=setup(t),foreign=h.doc.createElement('div');foreign.className='storybook-journey';h.doc.body.append(foreign);h.engine.travel(h.spec());h.media.change(true);assert.equal(h.engine.state().active,false);h.media.change(false);h.engine.travel(h.spec());h.engine.destroy();h.engine.destroy();await flush();assert.equal(h.doc.querySelectorAll('.storybook-journey').length,1);assert.equal(foreign.isConnected,true);assert.equal(h.media.listeners.size,0);assert.equal(h.rafs.size,0);assert.equal(h.timers.size,0);assert.equal(h.engine.travel(h.spec()),null);
});
for(const reason of ['live','foreign','parented','missing','duplicate','script','button','handler','id','href','external-image','external-css','shadow','budget','text'])test('unsafe '+reason+' snapshot fails open without touching its original owner',t=>{
 const h=setup(t);let source=h.scene(),extra={};
 if(reason==='live')source=h.doc.getElementById('reader');if(reason==='foreign')source=h.child.createElement('div');if(reason==='parented')h.doc.createElement('div').append(source);if(reason==='missing')source=null;if(reason==='duplicate')extra.destinationScene=source;
 if(['script','button'].includes(reason))source.append(h.doc.createElement(reason));if(reason==='handler')source.setAttribute('onclick','window.bad=true');if(reason==='id')source.id='copy';if(reason==='href')source.setAttribute('href','https://book.invalid/');if(reason==='external-image'){const image=h.doc.createElement('img');image.src='https://external.invalid/art.png';source.append(image);}if(reason==='external-css')source.style.backgroundImage='url("https://external.invalid/art.png")';if(reason==='shadow')source.attachShadow({mode:'open'});if(reason==='budget')for(let i=0;i<351;i++)source.append(h.doc.createElement('i'));if(reason==='text')source.textContent='x'.repeat(24001);
 const parent=source?.parentNode;assert.equal(h.engine.travel(h.spec({...extra,sourceScene:source})),null);assert.equal(source?.parentNode,parent);assert.equal(h.doc.querySelector('.storybook-journey'),null);assert.equal(h.unchanged(),true);
});
test('invalid destination replacement leaves the currently mounted safe chapter intact',t=>{const h=setup(t),token=h.engine.travel(h.spec()),scene=h.doc.querySelector('.storybook-journey-destination').firstElementChild,newScene=h.scene();assert.equal(token.setDestination({scene:newScene,foreground:h.doc.getElementById('reader')}),false);assert.equal(h.doc.querySelector('.storybook-journey-destination').firstElementChild,scene);assert.equal(newScene.parentNode,null);});
test('same-origin loaded decorative images and simple inline SVG remain original nodes',t=>{
 const h=setup(t),scene=h.scene(),image=h.doc.createElement('img'),svg=h.doc.createElementNS('http://www.w3.org/2000/svg','svg'),path=h.doc.createElementNS(svg.namespaceURI,'path');image.src='./lounge/assets/original-character.webp';svg.setAttribute('viewBox','0 0 20 20');path.setAttribute('d','M1 1L18 18');svg.append(path);scene.append(image,svg);assert.ok(h.engine.travel(h.spec({sourceScene:scene})));assert.equal(h.doc.querySelector('.storybook-journey-source img'),image);assert.equal(h.doc.querySelector('.storybook-journey-source path'),path);
});
test('comment-heavy snapshots and SVG paint references cannot bypass the bounded decorative contract',t=>{
 const h=setup(t),many=h.scene();for(let i=0;i<1401;i++)many.append(h.doc.createComment(''));assert.equal(h.engine.travel(h.spec({sourceScene:many})),null);
 const scene=h.scene(),svg=h.doc.createElementNS('http://www.w3.org/2000/svg','svg'),path=h.doc.createElementNS(svg.namespaceURI,'path');path.setAttribute('fill','url(https://external.invalid/paint.svg#fill)');svg.append(path);scene.append(svg);assert.equal(h.engine.travel(h.spec({sourceScene:scene})),null);assert.equal(h.unchanged(),true);
});
test('partial animation failure removes only its own layer and leaves original reading usable',async t=>{const h=setup(t,{failAnimation:3});assert.equal(h.engine.travel(h.spec()),null);await flush();assert.equal(h.engine.state().active,false);assert.equal(h.doc.querySelector('.storybook-journey'),null);assert.equal(h.rafs.size,0);assert.equal(h.timers.size,0);assert.equal(h.unchanged(),true);});
test('only one engine may own a document presentation at once',t=>{const h=setup(t),other=createStorybookJourney({document:h.doc});h.engine.travel(h.spec());assert.equal(other.travel(h.spec()),null);other.destroy();assert.equal(h.engine.state().active,true);h.engine.cancel();assert.equal(h.doc.querySelector('.storybook-journey'),null);});
test('watchdog bounds paused clocks; existing quick/normal/slow durations are honored',t=>{
 const h=setup(t);for(const duration of [380,620,850]){h.engine.travel(h.spec({duration}));assert.equal(h.engine.state().duration,duration);assert.equal([...h.timers.values()][0].delay,duration+4000);h.engine.cancel();}
 h.engine.travel(h.spec({duration:1}));assert.equal(h.engine.state().duration,260);for(const {fn}of [...h.timers.values()])fn();assert.equal(h.engine.state().active,false);h.engine.travel(h.spec({duration:1e9}));assert.equal(h.engine.state().duration,1100);h.engine.cancel();
});
test('renderer never creates a context, captures live HTML, routes, persists, loads art, or adds audio',()=>{
 const source=fs.readFileSync(new URL('../command-center-98/lounge/storybook-journey.js',import.meta.url),'utf8');assert.doesNotMatch(source,/getContext\s*\(|\bfetch\s*\(|localStorage|sessionStorage|innerHTML|outerHTML|cloneNode|toDataURL|createImageBitmap|postMessage|preventDefault|stopPropagation|new Audio|AudioContext|import\s*\(/);
});
function paperArt(h,count=6){const art=h.doc.createElement('div');art.className='story-paper-art';for(let index=0;index<count;index++){const prop=h.doc.createElement('span');prop.className='story-prop';prop.dataset.prop=index===5?'adviser-and-desk':'object-'+index;for(const [key,value]of Object.entries({'--x':'10%','--y':'20%','--w':'30%','--h':'40%'}))prop.style.setProperty(key,value);Object.assign(prop.style,{position:'absolute',left:'var(--x)',top:'var(--y)',width:'var(--w)',height:'var(--h)',transform:'rotate(-2deg)',rotate:'4deg',translate:'2px 3px',scale:'.98',zIndex:String(index)});art.append(prop);}return art;}
test('six original scenery/figure props hinge on equal-size carriers while their authored transforms stay exact',t=>{
 const h=setup(t),art=paperArt(h),props=[...art.children],styles=props.map(node=>node.getAttribute('style'));assert.ok(h.engine.travel(h.spec({sourceScene:art})));
 const hinges=[...art.children];assert.equal(hinges.length,6);for(const [index,hinge]of hinges.entries()){assert.ok(hinge.classList.contains('storybook-journey-prop-hinge'));assert.equal(hinge.firstElementChild,props[index]);assert.equal(hinge.style.inset,'0');assert.equal(hinge.style.width,'100%');assert.equal(hinge.style.height,'100%');assert.equal(hinge.style.transformOrigin,'25% 60%');assert.equal(hinge.style.zIndex,String(index));assert.equal(props[index].getAttribute('style'),styles[index]);}
 const animations=h.animations.filter(a=>a.id.startsWith('storybook-prop-source-'));assert.equal(animations.length,6);assert.ok(animations.every(a=>a.frames[0].transform==='rotateX(0deg)'&&a.frames.find(f=>f.offset===.45).transform==='rotateX(72deg)'&&a.startTime===h.clock().startTime&&a.timing.duration===h.clock().timing.duration));assert.equal(h.animations.some(a=>props.includes(a.node)),false);
 h.engine.cancel();assert.ok(animations.every(a=>a.playState==='idle'));assert.equal(h.doc.querySelector('.storybook-journey-prop-hinge'),null);assert.equal(h.unchanged(),true);
});
test('late incoming props join the current paused clock and stand only after the sealed swap',t=>{
 const h=setup(t),token=h.engine.travel(h.spec({sourceScene:paperArt(h),destinationScene:null}));h.clock().pause();h.clock().currentTime=310;
 assert.equal(token.setDestination({scene:paperArt(h,5),foreground:h.foreground()}),true);const animations=h.animations.filter(a=>a.id.startsWith('storybook-prop-destination-'));assert.equal(animations.length,5);
 assert.ok(animations.every(a=>a.currentTime===310&&a.playState==='paused'&&a.startTime===h.clock().startTime&&a.frames.find(f=>f.offset===.52).transform==='rotateX(72deg)'&&a.frames.some(f=>f.offset>=.89&&f.offset<=.94&&f.transform==='rotateX(0deg)')));
 assert.equal(h.doc.querySelector('.storybook-journey-flat-destination .storybook-journey-prop-hinge'),null);
});
test('replacing a fresh destination retires its old hinge animations instead of accumulating owners',t=>{
 const h=setup(t),token=h.engine.travel(h.spec({sourceScene:paperArt(h),destinationScene:paperArt(h,5)})),old=h.animations.filter(a=>a.id.startsWith('storybook-prop-destination-'));
 for(let i=0;i<5;i++){assert.equal(token.setDestination({scene:paperArt(h,5)}),true);assert.equal(h.animations.filter(a=>a.playState!=='idle'&&a.id.startsWith('storybook-prop-destination-')).length,5);assert.equal(h.doc.querySelectorAll('.storybook-journey-destination .storybook-journey-prop-hinge').length,5);}
 assert.ok(old.every(a=>a.playState==='idle'));h.engine.destroy();assert.equal(h.animations.some(a=>a.playState!=='idle'),false);
});
test('flat manuscript/actor nodes are never treated as decorative pop-up props',t=>{
 const h=setup(t),flat=h.foreground(),actor=paperArt(h,1);flat.append(actor);const original=actor.firstElementChild,style=original.getAttribute('style');assert.ok(h.engine.travel(h.spec({sourceScene:paperArt(h),sourceForeground:flat,foreground:h.foreground()})));assert.equal(actor.firstElementChild,original);assert.equal(original.getAttribute('style'),style);assert.equal(flat.querySelector('.storybook-journey-prop-hinge'),null);
});
test('unsupported decorative coordinates preserve their original plane rather than guessing geometry',t=>{
 const h=setup(t),art=paperArt(h,1),prop=art.firstElementChild;prop.style.setProperty('--x','25px');const before=prop.getAttribute('style');assert.ok(h.engine.travel(h.spec({sourceScene:art})));assert.equal(art.firstElementChild,prop);assert.equal(prop.getAttribute('style'),before);assert.equal(art.querySelector('.storybook-journey-prop-hinge'),null);
});
test('more than 24 decorative hinges fails open without touching the original route',t=>{
 const h=setup(t),art=paperArt(h,25);assert.equal(h.engine.travel(h.spec({sourceScene:art})),null);assert.equal(art.parentNode,null);assert.equal(art.querySelector('.storybook-journey-prop-hinge'),null);assert.equal(h.unchanged(),true);
});
test('a hinge animation creation failure cleans up the whole optional presentation',async t=>{
 const h=setup(t,{failAnimation:10});assert.equal(h.engine.travel(h.spec({sourceScene:paperArt(h)})),null);await flush();assert.equal(h.engine.state().active,false);assert.equal(h.doc.querySelector('.storybook-journey'),null);assert.equal(h.animations.some(a=>a.playState!=='idle'),false);assert.equal(h.rafs.size,0);assert.equal(h.timers.size,0);assert.equal(h.unchanged(),true);
});
test('reverse uses the same bounded collapse/stand choreography without touching flat outgoing paper',t=>{
 const h=setup(t),flat=h.foreground();h.engine.travel(h.spec({direction:'out',sourceScene:paperArt(h,5),destinationScene:paperArt(h),sourceForeground:flat}));assert.equal(h.animations.filter(a=>a.id.startsWith('storybook-prop-source-')).length,5);assert.equal(h.animations.filter(a=>a.id.startsWith('storybook-prop-destination-')).length,6);assert.equal(h.animations.some(a=>flat.contains(a.node)),false);h.seek(.5);assert.equal(h.engine.state().phase,'covered');h.engine.cancel();assert.equal(h.doc.querySelector('.storybook-journey-prop-hinge'),null);
});
test('new spread and page compositions retain every original authored prop and their one figure under the same hinges',async t=>{
 const {buildStorybookArt}=await import('../command-center-98/lounge/storybook-art.js');const h=setup(t);
 for(const layout of ['spread','page']){const art=buildStorybookArt({document:h.doc,key:'insurance',layout,actorURL:'https://book.invalid/lounge/assets/storybook-insurance-actor-v1.webp'}),props=[...art.children],styles=props.map(prop=>prop.getAttribute('style')),keys=props.map(prop=>prop.dataset.prop);assert.ok(props.length>=5);assert.ok(keys.includes('letter-rack'));assert.equal(new Set(keys).size,props.length);assert.ok(h.engine.travel(h.spec({sourceScene:art})));assert.equal(art.querySelectorAll('.storybook-journey-prop-hinge').length,props.length);assert.deepEqual([...art.querySelectorAll('.story-prop')].map(prop=>prop.dataset.prop),keys);assert.equal(art.querySelectorAll('[data-prop=adviser-and-desk].story-prop').length,1);assert.equal(art.querySelector('[data-prop=room-fold]'),null);assert.deepEqual(props.map(prop=>prop.getAttribute('style')),styles);assert.equal(art.dataset.storyLayout,layout);h.engine.cancel();}
});

test('the destination reading book settles while fully covered, never tilting behind exposed flat text',t=>{
 const h=setup(t);h.engine.travel(h.spec({uprightDestination:true}));const incoming=h.animations.find(a=>a.id==='storybook-destination');assert.equal(incoming.frames.find(f=>f.transform==='translateX(0%) rotateY(0deg)').offset,.56);assert.equal(incoming.frames.at(-1).transform,'translateX(0%) rotateY(0deg)');assert.ok(h.animations.filter(a=>a.id.startsWith('storybook-fold-')).every(a=>a.frames.find(f=>f.offset===.56).transform==='translateX(0%) rotateY(0deg)'));assert.equal(h.clock().timing.duration,620);
});
