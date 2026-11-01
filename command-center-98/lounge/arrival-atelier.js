/* Optional architectural courtyard. Existing owners keep all records,
   routing and paper. Nothing here reads an API or changes source records. */
import * as spatial from './spatial-atelier.js?v=20261101.5-arrival';
import * as application from './app.js?v=20261101.1-living';

const rooms=[
 {key:'insurance',short:'保険',name:'手紙の書斎'},
 {key:'otoku',short:'お得',name:'宵色の収集室'},
 {key:'rakuten',short:'楽天',name:'陽だまりの食卓'},
 {key:'lottery',short:'抽選',name:'星巡りの観測室'},
 {key:'sourcing',short:'仕入れ',name:'商人の工房'},
 {key:'planned-5',short:'西の閉鎖翼',sealed:true},
 {key:'planned-6',short:'東の閉鎖翼',sealed:true},
 {key:'reserve',short:'封じられた小塔',sealed:true}
];
const presentation=spatial.getSpatialPresentation?.();
if(!presentation?.scene||!presentation.board?.element)throw Error('The established castle must be ready first.');
const {board,scene:baseScene}=presentation;
const panel=board.element,doc=document,win=window,media=matchMedia('(prefers-reduced-motion: reduce)');
const externalLaunch=panel.querySelector('[data-arrival-entry]');
const reduceControl=doc.getElementById('reduce-setting');
const reduced=()=>media.matches||!!reduceControl?.checked;
const lowQuality=()=>navigator.connection?.saveData===true||(Number.isFinite(navigator.deviceMemory)&&navigator.deviceMemory<=2);
const element=(tag,cls,text)=>{const n=doc.createElement(tag);n.className=cls||'';if(text!==undefined)n.textContent=text;return n;};
const button=(cls,text,handler)=>{const n=element('button',cls,text);n.type='button';n.addEventListener('click',handler);return n;};
let renderer=null,passageAdapter=null,failed=false,ready=false,disposed=false,preferred=!externalLaunch,active=false,hostPaused=false,selected=null,overview=true,lastTrigger=null,projection=[],pointer=null,handedOff=false;
let snapshot=application.getLivingDesk?.()?.snapshot?.(),lastVisited=board.state.lastVisited,loadTimer=0;
const abort=new AbortController(),originalAttributes=new Map(),buttons=new Map();

const root=element('section','arrival-court');root.dataset.state='loading';root.hidden=true;root.setAttribute('aria-label','城の到着の中庭・3Dの中庭');
const canvas=element('canvas','arrival-canvas');canvas.setAttribute('aria-hidden','true');
const header=element('header','arrival-heading'),identity=element('div','arrival-identity');
identity.append(element('small','','THE CASTLE ATELIER'),element('h1','','司令塔'));
const utilities=element('div','arrival-utilities');
const listButton=button('arrival-text-button','原稿一覧',()=>{lastTrigger=listButton;releaseOriginal();panel.querySelector('.board-primary').click();});
const menu=element('details','arrival-menu'),summary=element('summary','','操作');summary.setAttribute('aria-label','中庭の操作メニュー');
const menuItems=element('div','arrival-menu-items');
const refresh=button('','保存原稿を更新',()=>{menu.open=false;panel.querySelector('.board-refresh')?.click();});
const settings=button('','音・演出',()=>{menu.open=false;panel.querySelector('.castle-experience-settings')?.click();const dialog=doc.getElementById('settings');if(dialog?.open)dialog.addEventListener('close',()=>{if(!panel.hidden)(active?summary:panel.querySelector(panel.dataset.view==='list'?'.board-primary':'.castle-experience-settings')||panel.querySelector('.board-primary'))?.focus({preventScroll:true});},{once:true});});
const classic=button('','いつもの城へ',()=>{menu.open=false;preferred=false;sync();launch.focus({preventScroll:true});});
const admin=button('','ラウンジ・管理へ',()=>{menu.open=false;panel.querySelector('.board-lounge')?.click();});
const sealed=element('p','arrival-sealed','西の閉鎖翼・東の閉鎖翼・小塔は未設定です。');
menuItems.append(refresh,settings,classic,admin,sealed);menu.append(summary,menuItems);menu.addEventListener('toggle',()=>{if(active&&projection.length)project({rooms:projection});});utilities.append(listButton,menu);header.append(identity,utilities);

const targets=element('nav','arrival-targets');targets.setAttribute('aria-label','建築の入口を選ぶ');
for(const room of rooms){
 const b=button('arrival-target','',()=>selected===room.key&&!overview?open(room.key,b):select(room.key));
 b.dataset.courtRoom=room.key;b.disabled=!!room.sealed;b.hidden=true;
 b.setAttribute('aria-label',room.short+(room.sealed?'、未設定の閉鎖翼':'の入口を選ぶ'));
 b.append(element('span','arrival-target-mark',room.sealed?'◇':'＋'),element('span','arrival-target-name',room.short));
 targets.append(b);buttons.set(room.key,b);
}
const detail=element('aside','arrival-detail');detail.setAttribute('aria-label','選んだ持ち場');
const kicker=element('small','arrival-kicker','到着の中庭'),title=element('h2','','扉の向こうに、いつもの持ち場。'),account=element('p','arrival-account',''),state=element('p','arrival-source-state','');
const enter=button('arrival-enter','持ち場へ入る',()=>{if(selected)open(selected,enter);});enter.hidden=true;
const all=button('arrival-overview','中庭全体',()=>{overview=true;selected=null;renderer?.home({instant:reduced()});renderCopy();});all.hidden=true;
detail.append(kicker,title,account,state,enter,all);
const footer=element('footer','arrival-footer'),hint=element('p','arrival-hint','扉を選んで近くへ。行先からは、すぐ本文へ。');
const quick=element('nav','arrival-quick');quick.setAttribute('aria-label','持ち場をすぐ開く');quick.append(element('span','arrival-quick-label','すぐ開く'));
for(const room of rooms.filter(r=>!r.sealed)){const b=button('arrival-quick-open',room.short,()=>open(room.key,b,{instant:true}));b.dataset.courtOpen=room.key;b.setAttribute('aria-label',room.short+'をすぐ開く');quick.append(b);}
const announcement=element('p','sr-only');announcement.setAttribute('aria-live','polite');
footer.append(hint,quick);root.append(canvas,header,targets,detail,footer,announcement);panel.append(root);
const launch=externalLaunch||element('button','arrival-launch','3Dの中庭');launch.type='button';if(!externalLaunch){launch.hidden=true;panel.querySelector('.board-footer').append(launch);}
const fallbackNote=element('p','account-board-status arrival-fallback-note');fallbackNote.hidden=true;fallbackNote.setAttribute('role','status');const originalStatus=panel.querySelector('.account-board-status');if(originalStatus)originalStatus.after(fallbackNote);else panel.prepend(fallbackNote);

function source(key){return snapshot?.rooms?.find(r=>r.key===key);}
function renderCopy(){
 const room=rooms.find(r=>r.key===selected),data=source(selected);
 root.dataset.overview=String(overview);
 title.textContent=room?.name||'扉の向こうに、いつもの持ち場。';
 account.textContent=data?(data.name+' '+data.handle).trim():room?.short||'';
 state.textContent=!data?'':data.key==='sourcing'?'購入・在庫・売却は、いつもの仕入れ帳へ。':data.totalCount===null?'保存分 '+data.loadedCount+'本 · 全体未確認':data.pendingUpdate?'保存原稿 '+data.loadedCount+'本 · 本文の更新を保留中':'保存原稿 '+data.loadedCount+'本 · 未読・更新 '+data.unreadCount+'本';
 hint.textContent=board.state.loading?'保存原稿を確認中。行先から持ち場へ。':snapshot?.complete?'扉を選んで近くへ。行先から、すぐ本文へ。':'保存先の全体は未確認。行先から持ち場へ。';
 enter.hidden=!room||!!room.sealed;enter.textContent=room?room.short+'へ入る':'持ち場へ入る';all.hidden=overview;
 for(const [key,b]of buttons){b.dataset.selected=String(key===selected);b.setAttribute('aria-current',key===selected?'location':'false');const r=rooms.find(r=>r.key===key);b.setAttribute('aria-label',r.short+(r.sealed?'、未設定の閉鎖翼':key===selected&&!overview?'へ入る':'の入口を選ぶ'));}
 refresh.disabled=board.state.loading;refresh.textContent=board.state.loading?'保存原稿を確認中…':'保存原稿を更新';
 if(active&&projection.length)project({rooms:projection});
}
function select(key){
 const room=rooms.find(r=>r.key===key);if(!room||room.sealed||!renderer||!active)return;
 selected=key;overview=false;renderer.select(key,{instant:reduced()});renderCopy();announcement.textContent=room.name+'を選びました。「入る」または「すぐ開く」で本文へ進めます。';
}
function commitOpen(key,trigger){
 if(!rooms.some(r=>r.key===key&&!r.sealed))return;
 lastTrigger=trigger;selected=key;overview=false;menu.open=false;
 // A leased canvas already holds the actual painted starting pose. Canonical
 // selection still updates below; it must not repaint a future pose first.
 if(!passageAdapter?.state().active)renderer?.select(key,{instant:true});renderer?.setActive(false);
 // The owner retains source identity, native routing, latest intent and Back.
 baseScene.open(key,trigger,{instant:true});sync();
}
function open(key,trigger,options={}){
 if(!rooms.some(r=>r.key===key&&!r.sealed))return;
 if(passageAdapter)passageAdapter.enter(key,trigger,options);else commitOpen(key,trigger);
}
function hideOriginal(){
 for(const child of panel.children){if(child===root)continue;if(!originalAttributes.has(child))originalAttributes.set(child,{inert:child.inert,aria:child.getAttribute('aria-hidden')});child.inert=true;child.setAttribute('aria-hidden','true');}
 panel.dataset.court='ready';
}
function releaseOriginal(){
 const restoreFocus=!panel.hidden&&root.contains(doc.activeElement);
 delete panel.dataset.court;
 for(const [child,prior]of originalAttributes){child.inert=prior.inert;if(prior.aria===null)child.removeAttribute('aria-hidden');else child.setAttribute('aria-hidden',prior.aria);}originalAttributes.clear();
 active=false;root.hidden=true;pointer=null;renderer?.setActive(false);
 if(restoreFocus){const prior=panel.dataset.view!=='list'&&selected?panel.querySelector('.castle-quick-open[data-room="'+selected+'"]'):null;(prior||panel.querySelector('.board-primary'))?.focus({preventScroll:true});}
}
function syncLaunch(){
 if(externalLaunch&&!handedOff)return;
 const unavailable=failed||disposed||!ready||reduced()||lowQuality();
 launch.hidden=active||panel.hidden||panel.dataset.view==='list';launch.disabled=unavailable;launch.removeAttribute('aria-busy');launch.removeAttribute('aria-disabled');
 launch.dataset.arrivalEntryState=failed?'unavailable':!ready?'paused':reduced()||lowQuality()?'blocked':'ready';
 launch.textContent=failed?'3Dは利用できません':!ready?'3Dは休止中':'3Dの中庭';
 launch.title=failed?'いつもの城で、そのまま続けられます。':reduced()?'移動の演出を省略しているため、いつもの城を表示します。':lowQuality()?'通信・端末への負荷を抑えるため、いつもの城を表示します。':!ready?'設定を戻した後、ページを再読み込みすると再度利用できます。':'';
 launch.setAttribute('aria-label',launch.textContent+(launch.title?'。'+launch.title:''));
}
export function getCourtState(){return {ready,failed,active,available:!disposed&&!failed&&!reduced()&&!lowQuality()&&!panel.hidden&&panel.dataset.view!=='list'&&!doc.hidden&&!hostPaused&&!doc.querySelector('dialog[open]')};}
export function activateCourt(){
 if(!ready||!getCourtState().available)return false;
 preferred=true;sync({force:true});if(active)listButton.focus({preventScroll:true});return active;
}
function sync({force=false}={}){
 if(disposed)return;
 const shouldShow=ready&&!failed&&preferred&&!panel.hidden&&panel.dataset.view!=='list'&&!reduced()&&!lowQuality();
 if(!shouldShow){releaseOriginal();syncLaunch();return;}
 // A slow enhancement must not hide a keyboard user's in-progress old control.
 const focus=doc.activeElement;
 if(!force&&!active&&focus!==doc.body&&panel.contains(focus)&&!root.contains(focus)&&focus!==launch&&!lastTrigger){launch.hidden=false;return;}
 const wasActive=active;active=true;root.hidden=false;hideOriginal();launch.hidden=true;
 const rect=root.getBoundingClientRect();renderer.resize(rect.width,rect.height);renderer.setActive(!doc.hidden&&!hostPaused);
 if(!wasActive&&lastTrigger&&lastTrigger.isConnected&&panel.contains(lastTrigger))lastTrigger.focus({preventScroll:true});
 renderCopy();
}
function fail(reason){
 if(failed||disposed)return;failed=true;ready=false;clearTimeout(loadTimer);abort.abort();passageAdapter?.cancel();renderer?.dispose();renderer=null;root.dataset.state='fallback';releaseOriginal();syncLaunch();
 fallbackNote.textContent='立体表示を利用できないため、いつもの城を表示しています。';fallbackNote.hidden=false;
 console.warn('Arrival court kept the established castle.',reason);
}
function project(frame){
 projection=(frame.rooms||[]).map(room=>({...room}));
 const w=root.clientWidth,h=root.clientHeight,origin=root.getBoundingClientRect();
 const planes=[identity,utilities,detail,footer,...(menu.open?[menuItems]:[])].map(node=>{
  const rect=node.getBoundingClientRect();return {name:node.className,left:rect.left-origin.left,top:rect.top-origin.top,right:rect.right-origin.left,bottom:rect.bottom-origin.top,width:rect.width,height:rect.height};
 }).filter(rect=>rect.width>0&&rect.height>0);
 for(const room of projection){
  const b=buttons.get(room.key);if(!b)continue;
  const blocked=planes.filter(rect=>room.x+22>rect.left&&room.x-22<rect.right&&room.y+22>rect.top&&room.y-22<rect.bottom);
  room.uiOccluded=blocked.length>0;room.uiObstructions=blocked.map(rect=>({...rect}));
  b.hidden=!room.visible||room.x<22||room.x>w-22||room.y<80||room.y>h-114||room.uiOccluded;
  if(!b.hidden){b.style.left=(room.x-22)+'px';b.style.top=(room.y-22)+'px';}
  else if(active&&doc.activeElement===b){const destination=selected===room.key&&!enter.hidden?enter:quick.querySelector('[data-court-open="'+room.key+'"]');destination?.focus({preventScroll:true});}
 }
}

function pointerDown(event){if(!active||event.button!==0)return;pointer={id:event.pointerId,x:event.clientX,y:event.clientY,lastX:event.clientX,dragged:false,moved:false};}
function pointerMove(event){if(!pointer||pointer.id!==event.pointerId||!active)return;const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;if(Math.hypot(dx,dy)>8)pointer.moved=true;if(!pointer.dragged&&Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)*1.4){pointer.dragged=true;canvas.setPointerCapture(event.pointerId);}if(pointer.dragged){renderer.nudge(event.clientX-pointer.lastX);event.preventDefault();}pointer.lastX=event.clientX;}
function pointerUp(event){if(!pointer||pointer.id!==event.pointerId)return;const old=pointer;pointer=null;if(canvas.hasPointerCapture?.(event.pointerId))canvas.releasePointerCapture(event.pointerId);if(old.dragged||old.moved||Math.hypot(event.clientX-old.x,event.clientY-old.y)>8||!active)return;const rect=canvas.getBoundingClientRect(),key=renderer?.pick((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);if(key)selected===key&&!overview?open(key,buttons.get(key)||enter):select(key);}
canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',()=>pointer=null);
const unsubscribe=board.subscribe(()=>{if(board.state.lastVisited!==lastVisited){lastVisited=board.state.lastVisited;if(lastVisited){selected=lastVisited;overview=false;renderer?.select(selected,{instant:true});}}renderCopy();});
const unsubscribeLiving=application.getLivingDesk?.()?.subscribe?.(value=>{snapshot=value;renderCopy();});
const observer=new MutationObserver(()=>sync());observer.observe(panel,{attributes:true,attributeFilter:['hidden','data-view']});
const resize=new ResizeObserver(()=>{if(active){const r=root.getBoundingClientRect();renderer?.resize(r.width,r.height);}});resize.observe(panel);
const motionChanged=()=>{if(reduced()||lowQuality()){passageAdapter?.cancel();preferred=false;releaseOriginal();syncLaunch();if(!ready){abort.abort();root.dataset.state='fallback';}}else sync();};media.addEventListener('change',motionChanged);reduceControl?.addEventListener('change',motionChanged);navigator.connection?.addEventListener?.('change',motionChanged);
doc.addEventListener('visibilitychange',()=>{pointer=null;renderer?.setActive(active&&!doc.hidden&&!hostPaused);});
const hostVisibility=event=>{if(event.source!==win.parent||event.origin!==location.origin||event.data?.channel!=='cc-castle-v1'||!['pause','resume'].includes(event.data.type))return;hostPaused=event.data.type==='pause';pointer=null;renderer?.setActive(active&&!doc.hidden&&!hostPaused);};win.addEventListener('message',hostVisibility);
win.addEventListener('pagehide',()=>{disposed=true;abort.abort();clearTimeout(loadTimer);passageAdapter?.destroy();renderer?.dispose();observer.disconnect();resize.disconnect();unsubscribe();unsubscribeLiving?.();win.removeEventListener('message',hostVisibility);},{once:true});
// Read-only graphics diagnostics exist only after explicit courtyard opt-in.
Object.defineProperty(win,'__arrivalCourt',{configurable:true,value:Object.freeze({snapshot:()=>({state:failed||reduced()||lowQuality()?'fallback':ready?'ready':'loading',ready,active,failed,selected,overview,projection:projection.map(p=>({...p})),passage:{available:!!passageAdapter,...passageAdapter?.state()},renderer:renderer?.diagnostics()||null})})});
renderCopy();

if(reduced()||lowQuality()){
 root.dataset.state='fallback';
}else{
 try{
  await new Promise((resolve,reject)=>{const link=doc.createElement('link');link.rel='stylesheet';link.href=new URL('./arrival-court.css?v=20261101.5-arrival',import.meta.url);link.onload=resolve;link.onerror=()=>reject(Error('Arrival styles unavailable'));doc.head.append(link);loadTimer=setTimeout(()=>reject(Error('Arrival style timeout')),10000);});clearTimeout(loadTimer);
  if(getComputedStyle(doc.body).getPropertyValue('--arrival-court-ready').trim()!=='1')throw Error('Arrival style contract unavailable');
  if(disposed||abort.signal.aborted||reduced()||lowQuality())throw new DOMException('Court initialization cancelled','AbortError');
  // Keep the original castle visible during loading and shader compilation.
  root.hidden=false;root.dataset.state='loading';const rect=panel.getBoundingClientRect();canvas.width=Math.max(1,rect.width);canvas.height=Math.max(1,rect.height);
  loadTimer=setTimeout(()=>fail(Error('Arrival model/compile timeout')),15000);
  const {createCourtRenderer}=await import('./arrival-renderer.js?v=20261101.6-passage');
  const result=await createCourtRenderer({canvas,modelURL:new URL('./assets/arrival-court-v1.glb?v=ce1959752595',import.meta.url).href,onFrame:project,onFailure:fail,signal:abort.signal});
  if(disposed||failed){result.dispose();}else{
   renderer=result;
   // A reader may have been chosen while the model was loading. Replay that
   // latest room into the still-hidden renderer, never promote the old intent.
   if(selected&&!overview)renderer.select(selected,{instant:true});
   clearTimeout(loadTimer);ready=true;root.dataset.state='ready';root.hidden=true;sync();
   // Independently optional and never awaited by activation or a work route.
   // No native portal metadata means the established instant path remains.
   if(['insurance','otoku','rakuten','lottery','sourcing'].some(key=>renderer.canPassage?.(key)))import('./arrival-passage.js?v=20261101.6-passage').then(async({installArrivalPassage})=>{
    const adapter=await installArrivalPassage({document:doc,canvas,board,renderer,route:commitOpen,reduced,currentRoom:()=>doc.getElementById('room')?.dataset.account,canPresent:key=>!disposed&&!failed&&active&&!reduced()&&!lowQuality()&&!doc.hidden&&!hostPaused&&!doc.querySelector('dialog[open]')&&!!renderer?.canPassage(key)});
    if(disposed||failed)adapter?.destroy();else passageAdapter=adapter;
   }).catch(error=>console.warn('Court passage unavailable; instant work routes retained.',error));
  }
 }catch(error){if(disposed||reduced()||lowQuality()){clearTimeout(loadTimer);root.dataset.state='fallback';releaseOriginal();}else fail(error);}
}

// The tiny default entry hands ownership over only after bounded initialization.
handedOff=true;syncLaunch();launch.addEventListener('click',activateCourt);
