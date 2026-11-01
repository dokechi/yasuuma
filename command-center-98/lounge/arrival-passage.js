/* Optional route/presentation coordination. Existing owners still commit every
   account and Back; a passage is never awaited and never owns reader content. */
export function createArrivalPassage({document:doc,canvas,board,renderer,passage,route,canPresent=()=>true,currentRoom=()=>null,capture=()=>null}={}){
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
   if(!disposed&&!instant&&room==='insurance'&&canPresent()&&bounds){
    token=passage?.travel({room,direction:'in',renderer,canvas,surface:bounds});
    if(token&&intent===serial)trip={room,returnState:token.returnState};
   }
  }catch{/* Optional graphics may never prevent the normal route. */}
  if(intent!==serial)return false;
  // This line is intentionally synchronous even while the graphics clock runs.
  try{route(room,trigger,{instant:true});}
  catch(error){if(intent===serial)clear();throw error;}
  return !!token&&intent===serial;
 }
 function beforeExit(event){
  if(disposed||!trip||!panel.hidden||currentRoom()!==trip.room||doc.querySelector('dialog[open]'))return;
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
  if(intent!==serial||panel.dataset.view==='list'||board.state?.lastVisited!==saved.room||!canPresent()||visual?.room!==saved.room||!visual.foreground||!visual.roomBackdrop)return;
  const bounds=surface();if(!bounds)return;
  try{passage?.travel({room:saved.room,direction:'out',renderer,canvas,surface:bounds,returnState:saved.returnState,...(visual?.room===saved.room?{foreground:visual.foreground,roomBackdrop:visual.roomBackdrop}:{})});}catch{}
 }
 const observer=new win.MutationObserver(onBoard);observer.observe(panel,{attributes:true,attributeFilter:['hidden','data-view']});
 // Capture phase precedes the canonical app's bubble-phase history handler.
 listen(win,'popstate',beforeExit,true);listen(doc,'click',beforeExit,true);
 const escape=event=>{
  if(event.key==='Escape'&&passage?.state().active){event.preventDefault();event.stopImmediatePropagation();passage.cancel();return;}
  beforeExit(event);
 };
 listen(doc,'keydown',escape,true);
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
