/* Isolated, opt-in architectural preview. Existing owners keep all records,
   routing and paper. Nothing here reads an API or changes source records. */
import * as spatial from './spatial-atelier.js?v=20261101.1-living';
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
const reduceControl=doc.getElementById('reduce-setting');
const reduced=()=>media.matches||!!reduceControl?.checked;
const lowQuality=()=>navigator.connection?.saveData===true||(Number.isFinite(navigator.deviceMemory)&&navigator.deviceMemory<=2);
const element=(tag,cls,text)=>{const n=doc.createElement(tag);n.className=cls||'';if(text!==undefined)n.textContent=text;return n;};
const button=(cls,text,handler)=>{const n=element('button',cls,text);n.type='button';n.addEventListener('click',handler);return n;};
let renderer=null,failed=false,ready=false,disposed=false,preferred=true,active=false,hostPaused=false,selected=null,overview=true,lastTrigger=null,projection=[],pointer=null;
let snapshot=application.getLivingDesk?.()?.snapshot?.(),lastVisited=board.state.lastVisited,loadTimer=0;
const abort=new AbortController(),originalAttributes=new Map(),buttons=new Map();

const root=element('section','arrival-court');root.dataset.state='loading';root.hidden=true;root.setAttribute('aria-label','城の到着の中庭・立体表示の試作');
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
menuItems.append(refresh,settings,classic,admin,sealed);menu.append(summary,menuItems);utilities.append(listButton,menu);header.append(identity,utilities);

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
for(const room of rooms.filter(r=>!r.sealed)){const b=button('arrival-quick-open',room.short,()=>open(room.key,b));b.dataset.courtOpen=room.key;b.setAttribute('aria-label',room.short+'をすぐ開く');quick.append(b);}
const announcement=element('p','sr-only');announcement.setAttribute('aria-live','polite');
footer.append(hint,quick);root.append(canvas,header,targets,detail,footer,announcement);panel.append(root);
const launch=button('arrival-launch','立体の中庭へ',()=>{if(!failed&&ready){preferred=true;sync({force:true});listButton.focus({preventScroll:true});}});launch.hidden=true;panel.querySelector('.board-footer').append(launch);
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
}
function select(key){
 const room=rooms.find(r=>r.key===key);if(!room||room.sealed||!renderer||!active)return;
 selected=key;overview=false;renderer.select(key,{instant:reduced()});renderCopy();announcement.textContent=room.name+'を選びました。「入る」または「すぐ開く」で本文へ進めます。';
}
function open(key,trigger){
 if(!rooms.some(r=>r.key===key&&!r.sealed))return;
 lastTrigger=trigger;selected=key;overview=false;menu.open=false;renderer?.select(key,{instant:true});renderer?.setActive(false);
 // The owner retains source identity, native routing, latest intent and Back.
 // First architectural slice intentionally keeps this work path truly instant.
 baseScene.open(key,trigger,{instant:true});sync();
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
function sync({force=false}={}){
 if(disposed)return;
 const shouldShow=ready&&!failed&&preferred&&!panel.hidden&&panel.dataset.view!=='list'&&!reduced()&&!lowQuality();
 if(!shouldShow){releaseOriginal();launch.hidden=!ready||failed||reduced()||lowQuality();return;}
 // A slow enhancement must not hide a keyboard user's in-progress old control.
 const focus=doc.activeElement;
 if(!force&&!active&&focus!==doc.body&&panel.contains(focus)&&!root.contains(focus)&&focus!==launch&&!lastTrigger){launch.hidden=false;return;}
 const wasActive=active;active=true;root.hidden=false;hideOriginal();launch.hidden=true;
 const rect=root.getBoundingClientRect();renderer.resize(rect.width,rect.height);renderer.setActive(!doc.hidden&&!hostPaused);
 if(!wasActive&&lastTrigger&&lastTrigger.isConnected&&panel.contains(lastTrigger))lastTrigger.focus({preventScroll:true});
 renderCopy();
}
function fail(reason){
 if(failed||disposed)return;failed=true;ready=false;clearTimeout(loadTimer);abort.abort();renderer?.dispose();renderer=null;root.dataset.state='fallback';releaseOriginal();launch.hidden=true;
 fallbackNote.textContent='立体表示を利用できないため、いつもの城を表示しています。';fallbackNote.hidden=false;
 console.warn('Arrival court kept the established castle.',reason);
}
function project(frame){
 projection=frame.rooms||[];
 const w=root.clientWidth,h=root.clientHeight;
 for(const room of projection){const b=buttons.get(room.key);if(!b)continue;b.hidden=!room.visible||room.x<22||room.x>w-22||room.y<80||room.y>h-114;if(!b.hidden){b.style.left=(room.x-22)+'px';b.style.top=(room.y-22)+'px';}}
}
function pointerDown(event){if(!active||event.button!==0)return;pointer={id:event.pointerId,x:event.clientX,y:event.clientY,lastX:event.clientX,dragged:false,moved:false};}
function pointerMove(event){if(!pointer||pointer.id!==event.pointerId||!active)return;const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;if(Math.hypot(dx,dy)>8)pointer.moved=true;if(!pointer.dragged&&Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)*1.4){pointer.dragged=true;canvas.setPointerCapture(event.pointerId);}if(pointer.dragged){renderer.nudge(event.clientX-pointer.lastX);event.preventDefault();}pointer.lastX=event.clientX;}
function pointerUp(event){if(!pointer||pointer.id!==event.pointerId)return;const old=pointer;pointer=null;if(canvas.hasPointerCapture?.(event.pointerId))canvas.releasePointerCapture(event.pointerId);if(old.dragged||old.moved||Math.hypot(event.clientX-old.x,event.clientY-old.y)>8||!active)return;const rect=canvas.getBoundingClientRect(),key=renderer?.pick((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);if(key)selected===key&&!overview?open(key,buttons.get(key)||enter):select(key);}
canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',()=>pointer=null);
const unsubscribe=board.subscribe(()=>{if(board.state.lastVisited!==lastVisited){lastVisited=board.state.lastVisited;if(lastVisited){selected=lastVisited;overview=false;renderer?.select(selected,{instant:true});}}renderCopy();});
const unsubscribeLiving=application.getLivingDesk?.()?.subscribe?.(value=>{snapshot=value;renderCopy();});
const observer=new MutationObserver(()=>sync());observer.observe(panel,{attributes:true,attributeFilter:['hidden','data-view']});
const resize=new ResizeObserver(()=>{if(active){const r=root.getBoundingClientRect();renderer?.resize(r.width,r.height);}});resize.observe(panel);
const motionChanged=()=>{if(reduced()||lowQuality()){preferred=false;releaseOriginal();launch.hidden=true;if(!ready){abort.abort();root.dataset.state='fallback';}}else sync();};media.addEventListener('change',motionChanged);reduceControl?.addEventListener('change',motionChanged);navigator.connection?.addEventListener?.('change',motionChanged);
doc.addEventListener('visibilitychange',()=>{pointer=null;renderer?.setActive(active&&!doc.hidden&&!hostPaused);});
const hostVisibility=event=>{if(event.source!==win.parent||event.origin!==location.origin||event.data?.channel!=='cc-castle-v1'||!['pause','resume'].includes(event.data.type))return;hostPaused=event.data.type==='pause';pointer=null;renderer?.setActive(active&&!doc.hidden&&!hostPaused);};win.addEventListener('message',hostVisibility);
win.addEventListener('pagehide',()=>{disposed=true;abort.abort();clearTimeout(loadTimer);renderer?.dispose();observer.disconnect();resize.disconnect();unsubscribe();unsubscribeLiving?.();win.removeEventListener('message',hostVisibility);},{once:true});
// Read-only graphics diagnostics exist only on the explicitly opted-in prototype.
Object.defineProperty(win,'__arrivalCourt',{configurable:true,value:Object.freeze({snapshot:()=>({state:failed||reduced()||lowQuality()?'fallback':ready?'ready':'loading',ready,active,failed,selected,overview,projection:projection.map(p=>({...p})),renderer:renderer?.diagnostics()||null})})});
renderCopy();

if(reduced()||lowQuality()){
 root.dataset.state='fallback';
}else{
 try{
  await new Promise((resolve,reject)=>{const link=doc.createElement('link');link.rel='stylesheet';link.href=new URL('./arrival-court.css?v=20261101.3-arrival',import.meta.url);link.onload=resolve;link.onerror=()=>reject(Error('Arrival styles unavailable'));doc.head.append(link);loadTimer=setTimeout(()=>reject(Error('Arrival style timeout')),10000);});clearTimeout(loadTimer);
  if(getComputedStyle(doc.body).getPropertyValue('--arrival-court-ready').trim()!=='1')throw Error('Arrival style contract unavailable');
  // Keep the original castle visible during loading and shader compilation.
  root.hidden=false;root.dataset.state='loading';const rect=panel.getBoundingClientRect();canvas.width=Math.max(1,rect.width);canvas.height=Math.max(1,rect.height);
  loadTimer=setTimeout(()=>fail(Error('Arrival model/compile timeout')),15000);
  const {createCourtRenderer}=await import('./arrival-renderer.js?v=20261101.3-arrival');
  const result=await createCourtRenderer({canvas,modelURL:new URL('./assets/arrival-court-v1.glb?v=c6baebc2d517',import.meta.url).href,onFrame:project,onFailure:fail,signal:abort.signal});
  if(disposed||failed){result.dispose();}else{renderer=result;clearTimeout(loadTimer);ready=true;root.dataset.state='ready';root.hidden=true;sync();}
 }catch(error){if(disposed||reduced()||lowQuality()){clearTimeout(loadTimer);root.dataset.state='fallback';releaseOriginal();}else fail(error);}
}
