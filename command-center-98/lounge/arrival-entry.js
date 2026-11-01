/* A light, explicit doorway into the optional 3D presentation. The established
   spatial owner is shared; no renderer, vendor or model is imported on startup. */
import * as spatial from './spatial-atelier.js?v=20261101.9-workbook';

export function installArrivalEntry(owner=spatial,loadCourt=()=>import('./arrival-atelier.js?v=20261101.9-workbook')) {
 const presentation=owner.getSpatialPresentation?.(),panel=presentation?.board?.element;
 const doc=panel?.ownerDocument,win=doc?.defaultView,footer=panel?.querySelector('.board-footer');
 if(!presentation?.scene||!doc||!win||!footer)return null;
 const existing=panel.querySelector('[data-arrival-entry]');if(existing)return existing;
 const launch=doc.createElement('button');launch.type='button';launch.className='arrival-launch';launch.setAttribute('data-arrival-entry','');launch.textContent='3Dの中庭';
 Object.assign(launch.style,{minHeight:'44px',fontSize:'13px',padding:'8px 12px'});
 footer.append(launch);
 const media=win.matchMedia('(prefers-reduced-motion: reduce)'),reduce=doc.getElementById('reduce-setting'),connection=win.navigator.connection;
 let pending=false,attempted=false,disposed=false,handedOff=false,serial=0,hostPaused=false;
 const removers=[];
 const listen=(target,type,fn,options)=>{target?.addEventListener?.(type,fn,options);removers.push(()=>target?.removeEventListener?.(type,fn,options));};
 const blocked=()=>media.matches||!!reduce?.checked||connection?.saveData===true||(Number.isFinite(win.navigator.deviceMemory)&&win.navigator.deviceMemory<=2);
 const dialogOpen=()=>!!doc.querySelector('dialog[open],[role="dialog"]:not([hidden]):not([aria-hidden="true"])');
 const contextCurrent=()=>!disposed&&!hostPaused&&!doc.hidden&&panel.isConnected&&!panel.hidden&&panel.dataset.view!=='list'&&!dialogOpen();
 const cancelIntent=()=>{if(pending)serial++;};
 const clearBusy=()=>{launch.removeAttribute('aria-busy');launch.removeAttribute('aria-disabled');};
 const unavailable=message=>{clearBusy();launch.disabled=true;launch.textContent='3Dを利用できません';launch.setAttribute('aria-label','3Dを利用できません。'+message);launch.title=message;launch.dataset.arrivalEntryState='unavailable';};
 function admission(){
  if(disposed||handedOff)return;
  launch.hidden=panel.hidden||panel.dataset.view==='list';
  if(attempted)return;
  const denied=blocked();launch.disabled=denied;launch.dataset.arrivalEntryState=denied?'blocked':'idle';
  launch.textContent='3Dの中庭';launch.setAttribute('aria-label',denied?'3Dの中庭。現在は動きを減らす設定・通信節約・端末のメモリ条件により利用できません。':'3Dの中庭');launch.title=denied?'動きを減らす設定・通信節約・端末のメモリ条件により、いつもの城を使います。':'押した時だけ3D表示を読み込みます。いつもの城と原稿はそのまま使えます。';
 }
 function cleanup(){for(const off of removers.splice(0))off();routeObserver.disconnect();dialogObserver.disconnect();}
 const purposeful=event=>{
  if(!pending)return;
  if(event.type==='keydown'){
   if(['Shift','Control','Alt','Meta'].includes(event.key))return;
   if(event.target===launch&&['Enter',' '].includes(event.key))return;
   cancelIntent();return;
  }
  if(event.target===launch||launch.contains(event.target))return;
  if(event.type==='pointerdown'){cancelIntent();return;}
  if(event.type==='focusin'){
   if(event.target!==doc.body&&event.target!==doc.documentElement)cancelIntent();
  }else if(event.target?.closest?.('button,a,input,select,textarea,summary,[role="button"],[contenteditable="true"]'))cancelIntent();
 };
 for(const type of ['pointerdown','click','keydown','input','change','focusin'])listen(doc,type,purposeful,true);
 const routeObserver=new win.MutationObserver(records=>{
  if(pending&&(records.some(record=>record.target===panel&&['hidden','data-view'].includes(record.attributeName))||!contextCurrent()))cancelIntent();
  admission();
 });routeObserver.observe(panel,{attributes:true,attributeFilter:['hidden','data-view']});
 const dialogObserver=new win.MutationObserver(()=>{if(pending&&dialogOpen())cancelIntent();});dialogObserver.observe(doc.body,{subtree:true,attributes:true,attributeFilter:['open','hidden','aria-hidden','role'],childList:true});
 const preferenceChanged=()=>{if(pending&&blocked())cancelIntent();admission();};listen(media,'change',preferenceChanged);listen(reduce,'change',preferenceChanged);listen(connection,'change',preferenceChanged);
 listen(doc,'visibilitychange',()=>{if(doc.hidden)cancelIntent();});
 listen(win,'message',event=>{
  if(event.source!==win.parent||event.origin!==win.location.origin||event.data?.channel!=='cc-castle-v1'||!['pause','resume'].includes(event.data.type))return;
  hostPaused=event.data.type==='pause';if(hostPaused)cancelIntent();
 });
 listen(win,'pagehide',()=>{disposed=true;cancelIntent();clearBusy();cleanup();},{once:true});
 async function enter(){
  if(disposed||pending||attempted||blocked()||!contextCurrent())return;
  attempted=true;pending=true;const intent=++serial;
  launch.disabled=true;launch.setAttribute('aria-busy','true');launch.textContent='3Dを準備中…';launch.title='準備中も、いつもの城や原稿をそのまま使えます。';launch.dataset.arrivalEntryState='loading';
  try{
   // No prefetch/import of this module (or its renderer) before this gesture.
   const court=await loadCourt();
   if(disposed)return;
   if(typeof court.activateCourt!=='function'||typeof court.getCourtState!=='function')throw Error('The optional court entry is unavailable.');
   const state=court.getCourtState();
   if(!state||typeof state.ready!=='boolean'||typeof state.failed!=='boolean'||typeof state.available!=='boolean'||typeof state.active!=='boolean')throw Error('The optional court readiness is unavailable.');
   const shouldActivate=intent===serial&&!blocked()&&contextCurrent()&&state.ready&&state.available&&!state.failed;
   pending=false;
   // The initialized controller now owns this exact button and all mode/failure
   // handling. Its external-button listener is installed only after first frame.
   handedOff=true;launch.removeEventListener('click',enter);cleanup();
   if(shouldActivate&&!state.active)court.activateCourt();
  }catch(error){
   pending=false;
   if(!disposed){unavailable('3D表示を読み込めませんでした。いつもの城と原稿はそのまま使えます。');admission();}
  }
 }
 launch.addEventListener('click',enter);admission();return launch;
}
installArrivalEntry();
