/* A short-lived paper presentation around the existing account/reader owners.
   No routing, manuscript writes, live DOM moves, media, or saved preferences. */
import {createStorybookJourney} from './storybook-journey.js?v=20261101.8-storybook';
import {captureCastleForeground} from './castle-foreground.js?v=20261101.1-living';

export const storybookPassageDuration=pace=>pace==='quick'?380:pace==='slow'?850:620;
const installations=new WeakMap();
const sameBox=(a,b)=>a&&b&&['left','top','width','height'].every(key=>a[key]===b[key]);
const boxOf=node=>{const r=node?.getBoundingClientRect();return r&&r.width>0&&r.height>0?{left:r.left,top:r.top,width:r.width,height:r.height}:null;};

// Dependency injection is for contract tests; production uses the installer below.
export function createStorybookPassage({document:doc,scene,board,spatialDesk,buildArt,journey,captureForeground=captureCastleForeground}={}){
 const win=doc?.defaultView,panel=board?.element;
 if(!win||!panel||!scene?.element||!spatialDesk||!journey)throw Error('The existing book and reader must be mounted first.');
 let host=win,target=doc,frame=null;
 try{if(win.parent!==win){if(win.parent.location.origin!==win.location.origin)return null;host=win.parent;target=host.document;frame=win.frameElement;if(!frame||frame.contentDocument!==doc)return null;}}catch{return null;}
 let disposed=false,epoch=0,trip=null,departure=null,timer=0,raf=0,captureWait=null,previousHidden=panel.hidden;
 const listeners=[];
 const listen=(node,type,fn,options)=>{node.addEventListener(type,fn,options);listeners.push(()=>node.removeEventListener(type,fn,options));};
 const reduced=()=>!!doc.querySelector('#reduce-setting')?.checked||win.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
 const pace=()=>storybookPassageDuration(doc.querySelector('[name=pace]:checked')?.value);
 function surface(){try{
  if(doc.hidden||target.hidden)return null;
  if(frame){const style=host.getComputedStyle(frame);if(!frame.isConnected||frame.contentDocument!==doc||frame.hidden||style.display==='none'||style.visibility==='hidden')return null;const r=boxOf(frame);return r&&r.width===win.innerWidth&&r.height===win.innerHeight?r:null;}
  return win.innerWidth>0&&win.innerHeight>0?{left:0,top:0,width:win.innerWidth,height:win.innerHeight}:null;
 }catch{return null;}}
 const currentRoom=()=>doc.querySelector('#room')?.dataset.account;
 const closedDialog=()=>!doc.querySelector('dialog[open]')&&!target.querySelector('dialog[open]');
 const ready=()=>!disposed&&!reduced()&&closedDialog()&&scene.snapshot?.().chapterReady==='ready';
 function forget(){host.clearTimeout(timer);timer=0;departure=null;}
 function stopCapture(){captureWait?.();captureWait=null;win.cancelAnimationFrame(raf);raf=0;}
 function cancel(){epoch++;stopCapture();trip=null;forget();win.cancelAnimationFrame(raf);raf=0;journey.cancel();}
 function rootPage(color){const page=target.createElement('div');page.className='story-passage-page';page.inert=true;page.setAttribute('aria-hidden','true');Object.assign(page.style,{position:'absolute',inset:'0',overflow:'hidden',background:color||'#F7F8F2',pointerEvents:'none'});return page;}
 function color(node){const value=win.getComputedStyle(node).backgroundColor;return value&&value!=='transparent'&&value!=='rgba(0, 0, 0, 0)'?value:'#F7F8F2';}
 function bookAt(){
  const spread=scene.element.querySelector('.story-spread'),r=boxOf(spread);if(!r)return null;
  const book=target.createElement('div');book.className='story-passage-book';
  const style=win.getComputedStyle(spread),palette=win.getComputedStyle(scene.element);
  const copy=(from,to,properties)=>{for(const property of properties.split(' ')){const value=from.getPropertyValue(property);if(value)to.style.setProperty(property,value);}};
  Object.assign(book.style,{position:'absolute',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',boxSizing:'border-box',isolation:'isolate',pointerEvents:'none',backgroundColor:color(spread)});
  copy(style,book,'border-top border-right border-bottom border-left border-radius box-shadow filter');
  for(const [side,pseudo]of [['left','::before'],['right','::after']]){
   const leaf=target.createElement('div');leaf.className='story-passage-book-leaf';leaf.dataset.bookLeaf=side;
   const material=win.getComputedStyle(spread,pseudo);
   Object.assign(leaf.style,{position:'absolute',top:'0',bottom:'0',left:side==='left'?'0':'50%',width:'50%',boxSizing:material.boxSizing||'border-box',zIndex:'0',pointerEvents:'none',backgroundColor:style.getPropertyValue('--story-'+side).trim()||palette.getPropertyValue('--story-'+side).trim()||'#F7F8F2'});
   copy(material,leaf,'border-top border-right border-bottom border-left border-radius box-shadow');book.append(leaf);
  }
  const liveBinding=spread.querySelector('.story-binding'),br=boxOf(liveBinding);
  if(br){
   const binding=target.createElement('div');binding.className='story-passage-book-binding';
   Object.assign(binding.style,{position:'absolute',left:br.left-r.left+'px',top:br.top-r.top+'px',width:br.width+'px',height:br.height+'px',boxSizing:'border-box',zIndex:'1',pointerEvents:'none'});
   copy(win.getComputedStyle(liveBinding),binding,'background-color background-image border-top border-right border-bottom border-left box-shadow');
   const stitching=target.createElement('div');stitching.className='story-passage-book-stitching';Object.assign(stitching.style,{position:'absolute',inset:'22px 3px',pointerEvents:'none'});copy(win.getComputedStyle(liveBinding,'::after'),stitching,'background-color background-image');binding.append(stitching);book.append(binding);
  }
  const content=target.createElement('div');content.className='story-passage-book-content';Object.assign(content.style,{position:'absolute',inset:'0',overflow:'hidden',borderRadius:win.getComputedStyle(spread.querySelector('.story-chapter-page')||spread).borderRadius,zIndex:'2',pointerEvents:'none'});book.append(content);
  return {node:book,content,rect:r};
 }
 function readerBookAt(roomNode,page){
  const r=boxOf(roomNode);if(!r)return;
  // Pseudo leaves are decorative CSS, not live controls or manuscript nodes.
  // Copy their resolved coordinates/materials inside the actual room box. This
  // also preserves the intentionally simpler phone binding without inventing
  // a second leaf or an illustration which the real reader does not display.
  const properties='top right bottom left width height min-width min-height max-width max-height box-sizing border-top border-right border-bottom border-left border-radius background-color background-image background-position background-size background-repeat box-shadow opacity transform transform-origin';
  for(const [pseudo,part]of [['::before','leaves'],['::after','binding']]){
   const style=win.getComputedStyle(roomNode,pseudo);
   if(!style.content||['none','normal'].includes(style.content)||style.display==='none'||style.visibility==='hidden'||style.position!=='absolute')continue;
   const boundary=target.createElement('div');boundary.className='story-passage-reader-boundary';
   Object.assign(boundary.style,{position:'absolute',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',pointerEvents:'none',zIndex:part==='binding'?'3':'0'});
   const leaf=target.createElement('div');leaf.className='story-passage-reader-'+part;leaf.dataset.readerBookPart=part;
   Object.assign(leaf.style,{position:'absolute',pointerEvents:'none'});
   for(const property of properties.split(' ')){const value=style.getPropertyValue(property);if(value)leaf.style.setProperty(property,value);}
   boundary.append(leaf);page.append(boundary);
  }
 }
 function hiddenReaderIllustration(roomNode,artHost,live){
  const stage=artHost?.closest('.spatial-illustration-stage');
  return win.innerWidth<=600&&roomNode?.dataset.storyScene==='ready'&&!!live&&!!stage&&roomNode.contains(stage)&&win.getComputedStyle(stage).display==='none';
 }
 function freshArt(room,actor,intent,layout){
  const node=typeof buildArt==='function'?buildArt({document:target,key:room,actor,...(layout?{layout}:{})}):actor?intent?.makeScene?.(target)||scene.makeScene?.(target,room):null;
  if(!node||node.ownerDocument!==target||node.isConnected||node.parentNode||node.classList.contains('story-paper-fallback'))return null;
  // These are fresh decorative images of assets already painted on screen.
  // Sync decoding is only a hint, never an awaited work-route dependency.
  for(const image of node.querySelectorAll('img'))image.decoding='sync';
  return node;
 }
 function imagesPainted(node){return [...node.querySelectorAll('img')].every(image=>image.complete&&image.naturalWidth>0);}
 function pageAt(room,bounds,{home=false,intent}={}){
  const roomNode=doc.querySelector('#room'),artHost=home?scene.element.querySelector('.story-art-host'):roomNode?.querySelector('.spatial-study-scene');
  const live=artHost?.querySelector('.story-paper-art'),r=boxOf(live),container=boxOf(artHost);
  const intentionallyHidden=!home&&hiddenReaderIllustration(roomNode,artHost,live);
  if(!intentionallyHidden&&(!r||!container||!imagesPainted(live)))return null;
  const page=rootPage(color(home?scene.element:roomNode)),book=home?bookAt():null;if(home&&!book)return null;
  if(book)page.append(book.node);else readerBookAt(roomNode,page);
  if(intentionallyHidden)return page;
  const art=freshArt(room,home,intent,live.dataset.storyLayout);if(!art)return null;
  const position=target.createElement('div');position.className='story-passage-art-position';
  // Geometry is child-viewport relative; the full parent-frame surface supplies
  // its one translation. Preserve every prop's own transform and coordinates.
  Object.assign(position.style,{position:'absolute',left:(r.left-(book?.rect.left||0))+'px',top:(r.top-(book?.rect.top||0))+'px',width:r.width+'px',height:r.height+'px',zIndex:'1',pointerEvents:'none',perspective:'1000px',transformStyle:'preserve-3d'});
  Object.assign(art.style,{width:'100%',height:'100%',margin:'0'});position.append(art);(book?.content||page).append(position);return page;
 }
 function capture(room,bounds){
  const liveRoom=doc.querySelector('#room');if(liveRoom?.hidden||liveRoom?.dataset.account!==room||liveRoom.dataset.spatialDesk!=='ready')return null;
  const paper=doc.querySelector(liveRoom.dataset.livingView==='tools'?'.living-workbench':'#desk');
  if(!boxOf(paper)||!imagesPainted(paper))return null;
  // Existing capture is bounded but may omit over-budget descendants. Reject
  // that case first instead of presenting a partially invented manuscript.
  const actor=doc.querySelector('.spatial-desk-actor');
  if((paper.querySelectorAll('*').length+(actor?.querySelectorAll('*').length||0)+2)>340)return null;
  if(actor&&!actor.hidden&&boxOf(actor)&&actor.tagName==='IMG'&&(!actor.complete||!actor.naturalWidth))return null;
  const foreground=captureForeground(doc,{document:target,offsetX:0,offsetY:0,surfaceTop:0});
  if(!foreground?.querySelector('[data-journey-part=paper]'))return null;
  const page=pageAt(room,bounds);return page?{scene:page,foreground}:null;
 }
 function onTravel(intent={}){
  const serial=++epoch;stopCapture();trip=null;forget();journey.cancel();
  if(serial!==epoch||disposed||intent.instant||intent.room!=='insurance'||panel.hidden||panel.dataset.view==='list'||!ready())return false;
  try{
   const bounds=surface();if(!bounds)return false;
   const sourceScene=pageAt(intent.room,bounds,{home:true,intent});if(!sourceScene||serial!==epoch)return false;
   const duration=pace();if(serial!==epoch)return false;
   const deadline=host.performance.now()+duration*.4;
   const token=journey.travel({room:intent.room,direction:'in',surface:bounds,sourceScene,sourceDocument:doc,uprightDestination:true,duration});
   if(!token||serial!==epoch){token?.cancel();return false;}
   trip={room:intent.room,surface:bounds,arrived:false,token};const saved=trip;
   let initialLayoutRetry=true,captured=false;
   const settle=()=>{
    if(serial!==epoch||trip!==saved||disposed||captured)return;
    try{
     const state=journey.state();if(!state.active||!sameBox(bounds,surface())||!ready()||host.performance.now()>=deadline||state.progress>=.4){cancel();return;}
     // The caller commits board.open synchronously. Two microtasks let the
     // existing spatial/room observers mount their real DOM before this read.
     if(panel.hidden&&currentRoom()===saved.room){const visual=capture(saved.room,bounds);if(visual){if(serial===epoch&&trip===saved){if(host.performance.now()>=deadline||journey.state().progress>=.4){cancel();return;}const attached=token.setDestination(visual);if(serial===epoch&&trip===saved){if(attached){captured=true;stopCapture();}else cancel();}}return;}}
    }catch{if(serial===epoch)cancel();return;}
    if(initialLayoutRetry){initialLayoutRetry=false;raf=win.requestAnimationFrame(settle);}
   };
   // A newly mounted IMG completes in a later task even when the same asset
   // was already painted at home. Readiness is an event, not three RAFs. Wait
   // only inside this already-running turn's pre-handoff window; never hold a
   // route, extend the animation, or reveal an incomplete destination.
   const liveRoom=doc.querySelector('#room'),wake=()=>win.queueMicrotask(settle);
   const readiness=new win.MutationObserver(wake);if(liveRoom){readiness.observe(liveRoom,{attributes:true,attributeFilter:['hidden','data-account','data-spatial-desk','data-story-scene'],childList:true});liveRoom.addEventListener('load',wake,true);liveRoom.addEventListener('error',wake,true);}
   const expiry=host.setTimeout(()=>{if(serial===epoch&&trip===saved)cancel();},Math.max(0,deadline-host.performance.now()));
   captureWait=()=>{host.clearTimeout(expiry);readiness.disconnect();liveRoom?.removeEventListener('load',wake,true);liveRoom?.removeEventListener('error',wake,true);};
   win.queueMicrotask(()=>win.queueMicrotask(settle));return true;
  }catch{if(serial===epoch)cancel();return false;}
 }
 function beforeExit(event){
  if(disposed||!trip?.arrived||!panel.hidden||currentRoom()!==trip.room||!closedDialog())return;
  const isBack=event.type==='popstate'||event.type==='click'&&event.target?.closest?.('#back,#again')||event.type==='keydown'&&event.key==='Escape';if(!isBack)return;
  const serial=epoch,saved=trip;
  try{
   const bounds=surface();if(!sameBox(bounds,saved.surface)){cancel();return;}
   const visual=capture(saved.room,bounds);if(serial!==epoch||trip!==saved)return;
   forget();if(!visual){cancel();return;}departure={room:saved.room,...visual};
   timer=host.setTimeout(()=>{if(serial===epoch)cancel();},2000);
  }catch{if(serial===epoch)cancel();}
 }
 function onBoard(){
  if(disposed)return;const wasHidden=previousHidden;previousHidden=panel.hidden;
  if(!wasHidden||panel.hidden)return;
  const serial=++epoch,saved=trip,visual=departure;trip=null;forget();win.cancelAnimationFrame(raf);raf=0;journey.cancel();
  if(serial!==epoch||!saved?.arrived||!visual||visual.room!==saved.room||panel.dataset.view==='list'||board.state?.lastVisited!==saved.room||!ready())return;
  try{
   const bounds=surface();if(!sameBox(bounds,saved.surface))return;
   const destination=pageAt(saved.room,bounds,{home:true});if(!destination||serial!==epoch)return;
   const duration=pace();if(serial!==epoch)return;
   journey.travel({room:saved.room,direction:'out',surface:bounds,sourceScene:visual.scene,sourceForeground:visual.foreground,destinationScene:destination,sourceDocument:doc,duration});
  }catch{/* The canonical home is already visible; an optional Back is instant. */}
 }
 const observer=new win.MutationObserver(onBoard);observer.observe(panel,{attributes:true,attributeFilter:['hidden','data-view']});
 listen(target,'storybook:journey-end',event=>{
  if(event.detail?.direction!=='in'||!trip||event.detail.room!==trip.room)return;
  if(event.detail.cancelled){stopCapture();trip=null;forget();}else{trip.token=null;trip.arrived=true;}
 });
 listen(doc,'click',beforeExit,true);listen(win,'popstate',beforeExit,true);
 const escape=event=>{if(event.key==='Escape'&&journey.state().active){event.preventDefault();event.stopImmediatePropagation();cancel();return;}if(event.currentTarget===doc)beforeExit(event);};
 listen(doc,'keydown',escape,true);if(target!==doc)listen(target,'keydown',escape,true);
 const unsubscribe=board.subscribe?.(()=>{if(trip&&board.state?.lastVisited&&board.state.lastVisited!==trip.room)cancel();});
 for(const observed of new Set([doc,target])){
  listen(observed,'visibilitychange',()=>{if(observed.hidden)cancel();});
  listen(observed,'pointerdown',event=>{if(departure&&!event.target?.closest?.('#back,#again'))cancel();},true);
  listen(observed,'change',event=>{if(event.target?.id==='reduce-setting'&&reduced())cancel();},true);
  for(const type of ['resize','orientationchange'])listen(observed.defaultView,type,cancel);
  listen(observed.defaultView,'pagehide',destroy,{once:true});
 }
 // Native routes are deliberately instant in this first illustrated chapter.
 if(target!==doc)listen(target,'cc:castle-native',cancel);
 function destroy(){if(disposed)return;disposed=true;cancel();observer.disconnect();unsubscribe?.();for(const off of listeners.splice(0))off();journey.destroy();}
 return {onTravel,cancel,destroy,snapshot:()=>({active:!!journey.state().active,returnRoom:trip?.room||null,pendingReturn:!!departure,phase:journey.state().phase||'idle'})};
}

export function installStorybookPassage(options={}){
 const doc=options.document||globalThis.document,win=doc?.defaultView;
 if(!win||!options.scene||!options.board||!options.spatialDesk)return null;
 if(installations.has(doc))return installations.get(doc);
 let target=doc,host=win;try{if(win.parent!==win){if(win.parent.location.origin!==win.location.origin)return null;host=win.parent;target=host.document;}}catch{return null;}
 const journey=createStorybookJourney({document:target,reducedMotion:()=>!!doc.querySelector('#reduce-setting')?.checked||win.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true});
 const adapter=createStorybookPassage({...options,document:doc,journey});if(!adapter){journey.destroy();return null;}
 let link=null,timer=0;
 // Loading a tiny optional parent stylesheet never postpones a work route.
 if(host.getComputedStyle(target.documentElement).getPropertyValue('--storybook-journey-ready').trim()!=='1'){
  link=target.createElement('link');link.rel='stylesheet';link.href=new URL('./storybook-journey.css?v=20261101.8-storybook',import.meta.url).href;
  const finish=failed=>{host.clearTimeout(timer);timer=0;if(failed){link?.remove();link=null;}};
  link.onload=()=>finish(false);link.onerror=()=>finish(true);timer=host.setTimeout(()=>finish(true),5000);target.head.append(link);
 }
 const destroy=adapter.destroy;adapter.destroy=()=>{destroy();host.clearTimeout(timer);if(link){link.onload=null;link.onerror=null;link.remove();link=null;}installations.delete(doc);};
 installations.set(doc,adapter);return adapter;
}
