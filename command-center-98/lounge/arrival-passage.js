/* Optional route/presentation coordination. Existing owners still commit every
   account and Back; a passage is never awaited and never owns reader content. */
export const courtPassageDuration=pace=>pace==='quick'?480:pace==='slow'?1200:900;
export function createArrivalPassage({document:doc,canvas,board,renderer,passage,route,canPresent=()=>true,currentRoom=()=>null,capture=()=>null,pace=()=>doc.querySelector('[name=pace]:checked')?.value}={}){
 const win=doc?.defaultView,panel=board?.element;
 if(!win||!panel||!canvas||typeof route!=='function')throw Error('A mounted courtyard owner is required.');
 let disposed=false,serial=0,trip=null,departure=null,lastHidden=panel.hidden;
 const listeners=[];
 const listen=(target,type,fn,options)=>{target.addEventListener(type,fn,options);listeners.push(()=>target.removeEventListener(type,fn,options));};
 function surface(){
  try{
   const frame=win.frameElement,parent=win.parent;
   if(parent!==win&&(parent.location.origin!==win.location.origin||!frame?.isConnected||frame.hidden))return null;
   const r=canvas.getBoundingClientRect(),f=frame?.getBoundingClientRect();
   if(frame&&(!f?.width||!f.height||parent.document.hidden||parent.getComputedStyle(frame).visibility==='hidden'))return null;
   return r.width>0&&r.height>0?{left:r.left+(f?.left||0),top:r.top+(f?.top||0),width:r.width,height:r.height}:null;
  }catch{return null;}
 }
 function clear(){serial++;trip=null;departure=null;passage?.cancel();}
 function enter(room,trigger,{instant=false}={}){
  const intent=++serial;trip=null;departure=null;passage?.cancel();
  let token=null;
  try{
   const bounds=surface();
   if(!disposed&&!instant&&room==='insurance'&&canPresent(room)&&bounds){
    token=passage?.travel({room,direction:'in',renderer,canvas,surface:bounds,duration:courtPassageDuration(pace())});
    if(token&&intent===serial)trip={room,returnState:token.returnState,arrived:false};
   }
  }catch{/* Optional graphics may never prevent the normal route. */}
  if(intent!==serial)return false;
  // This line is intentionally synchronous even while the graphics clock runs.
  try{route(room,trigger,{instant:true});}
  catch(error){if(intent===serial)clear();throw error;}
  return !!token&&intent===serial;
 }
 function beforeExit(event){
  if(disposed||!trip?.arrived||!panel.hidden||currentRoom()!==trip.room||doc.querySelector('dialog[open]'))return;
  const returning=event.type==='popstate'||event.type==='click'&&event.target?.closest?.('#back,#again')||event.type==='keydown'&&event.key==='Escape';
  if(!returning)return;
  // A pending entry can be interrupted by actual Back. Capture only what is
  // already rendered; never apply a pending source update to make a snapshot.
  const intent=serial,room=trip.room;
  try{const visual=capture(room);if(intent===serial&&trip?.room===room)departure={room,...visual};}catch{if(intent===serial)departure=null;}
 }
 function onBoard(){
  if(disposed)return;
  const wasHidden=lastHidden;lastHidden=panel.hidden;
  if(!wasHidden||panel.hidden)return;
  const intent=++serial,saved=trip,visual=departure;trip=null;departure=null;
  if(!saved)return;
  passage?.cancel();
  if(intent!==serial||!saved.arrived||panel.dataset.view==='list'||board.state?.lastVisited!==saved.room||!canPresent(saved.room)||visual?.room!==saved.room||!visual.foreground||!visual.roomBackdrop)return;
  const bounds=surface();if(!bounds)return;
  try{passage?.travel({room:saved.room,direction:'out',renderer,canvas,surface:bounds,duration:courtPassageDuration(pace()),returnState:saved.returnState,...(visual?.room===saved.room?{foreground:visual.foreground,roomBackdrop:visual.roomBackdrop}:{})});}catch{}
 }
 const observer=new win.MutationObserver(onBoard);observer.observe(panel,{attributes:true,attributeFilter:['hidden','data-view']});
 // A canceled journey is a deliberate fast path. In particular, Back during an
 // unfinished approach must not flash a full room by replaying reverse from u=1.
 let presentationDocument=doc;try{if(win.parent.location.origin===win.location.origin)presentationDocument=win.parent.document;}catch{}
 listen(presentationDocument,'court:passage-end',event=>{if(trip&&event.detail?.room===trip.room&&event.detail.direction==='in'&&event.detail.cancelled===false)trip.arrived=true;});
 // Capture phase precedes the canonical app's bubble-phase history handler.
 listen(win,'popstate',beforeExit,true);listen(doc,'click',beforeExit,true);
 const escape=event=>{
  if(event.key==='Escape'&&passage?.state().active){event.preventDefault();event.stopImmediatePropagation();passage.cancel();return;}
  beforeExit(event);
 };
 listen(doc,'keydown',escape,true);
 try{if(win.parent!==win&&win.parent.location.origin===win.location.origin)listen(win.parent.document,'keydown',event=>{if(event.key==='Escape'&&passage?.state().active){event.preventDefault();event.stopImmediatePropagation();passage.cancel();}},true);}catch{}
 const unsubscribe=board.subscribe?.(()=>{
  if(trip&&board.state?.lastVisited!==trip.room){trip=null;departure=null;passage?.cancel();}
 });
 // A Fold resize discards only cosmetic return geometry, not canonical state.
 listen(win,'resize',clear);listen(win,'orientationchange',clear);
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
 return createArrivalPassage({...options,renderer,passage,capture});
}
