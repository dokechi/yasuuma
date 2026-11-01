/* Optional route/presentation coordination. Existing owners still commit every
   account and Back; a passage is never awaited and never owns reader content. */
const rooms=new Set(['insurance','otoku','rakuten','lottery','sourcing']);
export const courtPassageDuration=pace=>pace==='quick'?480:pace==='slow'?1200:900;
export function createArrivalPassage({document:doc,canvas,board,renderer,passage,route,canPresent=()=>true,currentRoom=()=>null,capture=()=>null,captureNative=()=>null,nativeVisible=()=>false,pace=()=>doc.querySelector('[name=pace]:checked')?.value}={}){
 const win=doc?.defaultView,panel=board?.element;
 if(!win||!panel||!canvas||typeof route!=='function')throw Error('A mounted courtyard owner is required.');
 let host=win,presentationDocument=doc,sourceFrame=null;
 try{if(win.parent!==win&&win.parent.location.origin===win.location.origin){host=win.parent;presentationDocument=host.document;sourceFrame=win.frameElement;}}catch{}
 let disposed=false,serial=0,trip=null,departure=null,entryToken=null,returnSurface=null,departureTimer=0,lastHidden=panel.hidden;
 const listeners=[];
 const listen=(target,type,fn,options)=>{target.addEventListener(type,fn,options);listeners.push(()=>target.removeEventListener(type,fn,options));};
 const hostSize=()=>({width:host.innerWidth,height:host.innerHeight});
 const sameHost=size=>size&&size.width===host.innerWidth&&size.height===host.innerHeight;
 const sameRect=(a,b)=>a&&b&&['left','top','width','height'].every(key=>a[key]===b[key]);
 function frameHidden(){try{return !!sourceFrame&&(sourceFrame.hidden||host.getComputedStyle(sourceFrame).display==='none'||host.getComputedStyle(sourceFrame).visibility==='hidden');}catch{return true;}}
 function validFrame(){try{return !sourceFrame||sourceFrame.isConnected&&sourceFrame.ownerDocument===presentationDocument&&sourceFrame.contentDocument===doc;}catch{return false;}}
 function returnedSurface(saved){try{return !!sourceFrame&&validFrame()&&!frameHidden()&&sameHost(saved.hostSize)&&sameRect(sourceFrame.getBoundingClientRect(),saved.surface)&&win.innerWidth===saved.surface.width&&win.innerHeight===saved.surface.height;}catch{return false;}}
 function surface(){
  try{
   if(host!==win&&(!validFrame()||frameHidden()))return null;
   const r=canvas.getBoundingClientRect(),f=sourceFrame?.getBoundingClientRect();
   if(sourceFrame&&(!f?.width||!f.height||presentationDocument.hidden))return null;
   // A temporary parent-owned canvas already uses parent coordinates.
   const offset=canvas.ownerDocument===doc?f:null;
   return r.width>0&&r.height>0?{left:r.left+(offset?.left||0),top:r.top+(offset?.top||0),width:r.width,height:r.height}:null;
  }catch{return null;}
 }
 function forgetDeparture(){host.clearTimeout(departureTimer);departureTimer=0;departure=null;}
 function clear(){serial++;trip=null;entryToken=null;returnSurface=null;forgetDeparture();passage?.cancel();}
 function saveDeparture(room,visual){
  forgetDeparture();if(!visual?.foreground||!visual.roomBackdrop)return;
  departure={room,...visual};const intent=serial;
  // A failed/abandoned canonical Back must not retain a detached record clone.
  departureTimer=host.setTimeout(()=>{if(serial===intent){trip=null;entryToken=null;forgetDeparture();}},2000);
 }
 function enter(room,trigger,{instant=false}={}){
  const intent=++serial;trip=null;entryToken=null;returnSurface=null;forgetDeparture();passage?.cancel();
  if(intent!==serial)return false;
  let token=null;
  try{
   const bounds=surface();
   if(!disposed&&!instant&&rooms.has(room)&&canPresent(room)&&bounds&&(room!=='sourcing'||sourceFrame)){
    const duration=courtPassageDuration(pace());if(intent!==serial)return false;
    token=passage?.travel({room,direction:'in',renderer,canvas,surface:bounds,duration,...(room==='sourcing'?{nativeVisible}:{} )});
    if(token&&intent===serial){entryToken=token;trip={room,returnState:token.returnState,surface:bounds,hostSize:hostSize(),arrived:false,native:false,returning:false};}
   }
  }catch{/* Optional graphics may never prevent the normal route. */}
  if(intent!==serial)return false;
  // This line is intentionally synchronous even while the graphics clock runs.
  try{route(room,trigger,{instant:true});}
  catch(error){if(intent===serial)clear();throw error;}
  return !!token&&intent===serial;
 }
 function beforeExit(event){
  if(disposed||!trip?.arrived||trip.native||!panel.hidden||currentRoom()!==trip.room||doc.querySelector('dialog[open]'))return;
  const returning=event.type==='popstate'||event.type==='click'&&event.target?.closest?.('#back,#again')||event.type==='keydown'&&event.key==='Escape';
  if(!returning)return;
  const intent=serial,room=trip.room;
  try{const visual=capture(room);if(intent===serial&&trip?.room===room)saveDeparture(room,visual);}catch{if(intent===serial)forgetDeparture();}
 }
 function nativeRoute(event){
  if(disposed)return;
  if(event.detail?.action!=='sourcing'||trip?.room!=='sourcing'||!entryToken||!passage?.state().active||!sameHost(trip.hostSize)){clear();return;}
  try{if(entryToken.acknowledgeNativeHide?.()===true){trip.native=true;return;}}catch{}
  clear();
 }
 function nativeHome(){
  if(disposed||!trip?.native)return;
  const intent=serial,saved=trip;
  if(!saved.arrived||saved.returning||!sameHost(saved.hostSize)||!validFrame()){clear();return;}
  try{
   if(nativeVisible()!==true){clear();return;}
   const visual=captureNative(saved.surface);
   if(intent===serial&&trip===saved){saved.returning=true;saveDeparture(saved.room,visual);if(!departure)clear();}
  }catch{if(intent===serial)clear();}
 }
 function onBoard(){
  if(disposed)return;
  const wasHidden=lastHidden;lastHidden=panel.hidden;
  if(!wasHidden||panel.hidden)return;
  const intent=++serial,saved=trip,visual=departure;trip=null;entryToken=null;forgetDeparture();
  if(!saved)return;
  passage?.cancel();
  if(intent!==serial||!saved.arrived||panel.dataset.view==='list'||board.state?.lastVisited!==saved.room||!canPresent(saved.room)||visual?.room!==saved.room||!visual.foreground||!visual.roomBackdrop)return;
  const bounds=surface();if(!bounds||saved.native&&(!saved.returning||!returnedSurface(saved)))return;
  try{
   const duration=courtPassageDuration(pace());if(intent!==serial)return;
   if(saved.native)returnSurface={surface:bounds,hostSize:hostSize()};
   const token=passage?.travel({room:saved.room,direction:'out',renderer,canvas,surface:bounds,duration,returnState:saved.returnState,foreground:visual.foreground,roomBackdrop:visual.roomBackdrop});
   if(!token)returnSurface=null;
  }catch{returnSurface=null;}
 }
 const observer=new win.MutationObserver(onBoard);observer.observe(panel,{attributes:true,attributeFilter:['hidden','data-view']});
 listen(presentationDocument,'court:passage-end',event=>{
  if(event.detail?.direction==='out')returnSurface=null;
  if(trip&&event.detail?.room===trip.room&&event.detail.direction==='in'){
   entryToken=null;
   if(event.detail.cancelled===false&&(trip.room!=='sourcing'||trip.native))trip.arrived=true;
  }
 });
 // Native owner events run before its DOM visibility mutation. They are local
 // same-origin presentation signals, never a replacement routing channel.
 if(sourceFrame){
  listen(presentationDocument,'cc:castle-native',nativeRoute);listen(presentationDocument,'cc:castle-home',nativeHome);
  // These existing native actions return to a work dialog, not to the courtyard.
  // Drop only cosmetics before show(); their owner still receives the click.
  listen(presentationDocument,'click',event=>{if((trip?.native||returnSurface)&&event.target?.closest?.('[data-lounge-search],[data-lounge-later],[data-lounge-tools]'))clear();},true);
  listen(win,'message',event=>{
   if(event.source===host&&event.origin===win.location.origin&&event.data?.channel==='cc-castle-v1'&&['search-open','later-context','reading-settings'].includes(event.data.type))clear();
  });
 }
 listen(win,'popstate',beforeExit,true);listen(doc,'click',beforeExit,true);
 const escape=event=>{
  if(event.key==='Escape'&&passage?.state().active){event.preventDefault();event.stopImmediatePropagation();passage.cancel();return;}
  beforeExit(event);
 };
 listen(doc,'keydown',escape,true);
 if(host!==win)listen(presentationDocument,'keydown',event=>{if(event.key==='Escape'&&passage?.state().active){event.preventDefault();event.stopImmediatePropagation();passage.cancel();}},true);
 const unsubscribe=board.subscribe?.(()=>{if(trip&&board.state?.lastVisited!==trip.room)clear();});
 // Only the acknowledged native hide and exact unchanged restoration may cause
 // a child-only resize. Actual Fold/parent geometry changes cancel cosmetics.
 listen(win,'resize',()=>{
  if(trip?.native&&validFrame()&&sameHost(trip.hostSize)&&(frameHidden()||trip.returning&&returnedSurface(trip)))return;
  if(returnSurface&&returnedSurface(returnSurface))return;
  clear();
 });
 listen(win,'orientationchange',clear);
 if(host!==win){listen(host,'resize',clear);listen(host,'orientationchange',clear);listen(host,'pagehide',destroy,{once:true});listen(presentationDocument,'visibilitychange',()=>{if(presentationDocument.hidden)clear();});}
 listen(doc,'visibilitychange',()=>{if(doc.hidden)clear();});
 listen(win,'pagehide',destroy,{once:true});
 function destroy(){if(disposed)return;disposed=true;clear();observer.disconnect();unsubscribe?.();for(const off of listeners.splice(0))off();passage?.destroy();}
 return {enter,cancel:clear,destroy,state:()=>({returnRoom:trip?.room||null,active:!!passage?.state().active})};
}

// A return needs the room that is actually on screen, not a second invented
// interior or a live DOM move. Only its already-loaded decorative background and
// the established bounded, inert foreground snapshot are retained briefly.
export function captureArrivalRoom(source,{document:target,surface,captureForeground}={}){
 const win=source?.defaultView,room=source?.querySelector('#room'),scene=room?.querySelector('.spatial-study-scene');
 if(!win||!target||!surface||!scene||room.hidden||typeof captureForeground!=='function')return null;
 const frame=win.frameElement?.getBoundingClientRect(),offsetX=(frame?.left||0)-surface.left,offsetY=(frame?.top||0)-surface.top;
 const rect=room.getBoundingClientRect();if(!rect.width||!rect.height)return null;
 const backdrop=target.createElement('div');backdrop.inert=true;backdrop.setAttribute('aria-hidden','true');
 Object.assign(backdrop.style,{position:'absolute',left:rect.left+offsetX+'px',top:rect.top+offsetY+'px',width:rect.width+'px',height:rect.height+'px',overflow:'hidden',background:win.getComputedStyle(room).backgroundColor,pointerEvents:'none'});
 const copyBackground=(style,node)=>{for(const key of ['background-color','background-image','background-position','background-size','background-repeat','background-origin','background-clip','opacity','filter'])node.style.setProperty(key,style.getPropertyValue(key));};
 const art=target.createElement('div'),sceneRect=scene.getBoundingClientRect();
 Object.assign(art.style,{position:'absolute',left:sceneRect.left-rect.left+'px',top:sceneRect.top-rect.top+'px',width:sceneRect.width+'px',height:sceneRect.height+'px',pointerEvents:'none'});copyBackground(win.getComputedStyle(scene),art);
 const shade=target.createElement('div');Object.assign(shade.style,{position:'absolute',inset:'0',pointerEvents:'none'});copyBackground(win.getComputedStyle(scene,'::after'),shade);art.append(shade);backdrop.append(art);
 const foreground=captureForeground(source,{document:target,offsetX,offsetY,surfaceTop:0});
 return foreground?{foreground,roomBackdrop:backdrop}:null;
}

export async function installArrivalPassage(options={}){
 const {document:doc,canvas,board,renderer,reduced=()=>false}=options,win=doc?.defaultView;
 if(!win||!canvas||!board?.element)return null;
 let target,host;
 try{host=win.parent;target=host.document;if(host.location.origin!==win.location.origin)return null;}catch{return null;}
 let nativeSnapshot=null;
 // Native return is a separate enhancement: a slow optional module must not
 // postpone the four publishing-room passages. Missing capture means instant Back.
 import('./court-native-snapshot.js?v=20261101.9-workbook').then(module=>{nativeSnapshot=module;}).catch(()=>{});
 const [{createCourtPassage},{captureCastleForeground}]=await Promise.all([import('./court-passage.js?v=20261101.6-passage'),import('./castle-foreground.js?v=20261101.1-living')]);
 if(host.getComputedStyle(target.documentElement).getPropertyValue('--court-passage-ready').trim()!=='1')await new Promise((resolve,reject)=>{
  const link=target.createElement('link');link.rel='stylesheet';link.href=new URL('./court-passage.css?v=20261101.6-passage',import.meta.url).href;
  const timer=host.setTimeout(()=>{link.remove();reject(Error('Passage style timeout'));},5000);
  link.onload=()=>{host.clearTimeout(timer);resolve();};link.onerror=()=>{host.clearTimeout(timer);link.remove();reject(Error('Passage style unavailable'));};target.head.append(link);
 });
 if(host.getComputedStyle(target.documentElement).getPropertyValue('--court-passage-ready').trim()!=='1')return null;
 const passage=createCourtPassage({document:target,reducedMotion:reduced});
 const capture=()=>{
  const frame=win.frameElement?.getBoundingClientRect();
  // The canvas is back in its original hidden court while reading. Its rendered
  // size is therefore the current iframe viewport, never a zero hidden rect.
  const surface={left:frame?.left||0,top:frame?.top||0,width:frame?.width||win.innerWidth,height:frame?.height||win.innerHeight};
  return captureArrivalRoom(doc,{document:target,surface,captureForeground:captureCastleForeground});
 };
 const nativeVisible=()=>{
  const frame=win.frameElement,main=target.getElementById('mainWindow'),header=target.getElementById('loungeWorkspaceHeader');
  if(!frame?.isConnected||frame.contentDocument!==doc||!frame.hidden||target.hidden||!target.body.classList.contains('lounge-workspace')||main?.dataset.ccView!=='sourcing'||!header?.isConnected||header.hidden||!main.contains(header))return false;
  return [main,header].every(node=>{const r=node.getBoundingClientRect(),style=host.getComputedStyle(node);return r.width>0&&r.height>0&&style.display!=='none'&&style.visibility!=='hidden';});
 };
 const captureNative=surface=>nativeSnapshot?.captureNativeWorkspace(target,{document:target,surface})||null;
 return createArrivalPassage({...options,renderer,passage,capture,captureNative,nativeVisible});
}
