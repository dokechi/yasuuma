import {captureCastleForeground} from './castle-foreground.js?v=20261031.11-immersive';
import {createCastleJourney} from './castle-journey.js?v=20261031.11-immersive';
import {mountCastlePresence} from './castle-presence.js?v=20261031.11-immersive';
/* Presentation-only spatial adapter. The existing account controller owns routing,
   records and permissions. Enhancement failure leaves the original manuscript/account view available. */
export const castleRooms=Object.freeze([
 {key:'insurance',short:'保険',name:'手紙の書斎',x:.085,y:.33,w:.35,h:.28,tone:'burgundy'},
 {key:'otoku',short:'お得',name:'宵色の収集室',x:.17,y:.06,w:.27,h:.25,tone:'violet'},
 {key:'rakuten',short:'楽天',name:'陽だまりの食卓',x:.58,y:.34,w:.34,h:.27,tone:'amber'},
 {key:'lottery',short:'抽選',name:'星巡りの観測室',x:.62,y:.05,w:.25,h:.27,tone:'silver'},
 {key:'planned-5',short:'未設定 5',name:'西の閉鎖翼',x:.055,y:.675,w:.215,h:.23,sealed:true},
 {key:'planned-6',short:'未設定 6',name:'東の閉鎖翼',x:.817,y:.65,w:.152,h:.275,sealed:true},
 {key:'sourcing',short:'仕入れ',name:'商人の工房',x:.325,y:.66,w:.43,h:.27,tone:'teal'},
 {key:'reserve',short:'予備',name:'封じられた小塔',x:.457,y:.015,w:.139,h:.14,sealed:true}
]);
export function mountCastleScene({accountBoard,castleImage='assets/castle-cutaway-v1.webp',skyImage=null}){
 if(typeof ResizeObserver!=='function'||typeof MutationObserver!=='function'||typeof matchMedia!=='function')throw new Error('Spatial observers unavailable');
 const board=accountBoard?.element,tiles=board?.querySelector('.account-tiles');if(!board||!tiles)throw new Error('Spatial scene needs the existing account controller.');
 const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const button=(cls,text,fn)=>{const b=node('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;};
 const activeRooms=castleRooms.filter(r=>!r.sealed),mobile=matchMedia('(max-width:700px)');
 let selected='insurance',overview=!mobile.matches,lastTrigger=null,lastHidden=board.hidden,geometry=null,ignoreClickUntil=0,queuedRoom=null,returning=false,observedVisit=null,observedVisitVersion=-1,viewportMobile=null,hitboxFrame=0,sceneDisposed=false,cameraTarget='';
 if(skyImage)document.body.style.setProperty('--castle-sky',`url("${skyImage}")`);
 board.setAttribute('aria-label','司令塔の部屋と持ち場');
 const world=node('section','spatial-castle');world.setAttribute('aria-label','つながった城の持ち場');
 const viewport=node('div','castle-viewport'),stage=node('div','castle-stage'),art=node('img','castle-cutaway');art.src=castleImage;art.alt='';art.decoding='async';art.width=1536;art.height=1024;stage.append(art);
 for(const key of ['insurance','otoku','rakuten','lottery','sourcing']){const actor=node('img','castle-room-actor');actor.dataset.actor=key;actor.src=`assets/${key}-desk-actor.webp`;actor.alt='';actor.decoding='async';stage.append(actor);}viewport.append(stage);
 const hotspots=node('nav','castle-hotspots');hotspots.setAttribute('aria-label','部屋から持ち場を開く');viewport.append(hotspots);
 const routebar=node('div','castle-routebar'),routecopy=node('div','castle-routecopy'),location=node('strong',null),hint=node('span',null);routecopy.append(location,hint);
 const previous=button('castle-step','‹',()=>browse(-1)),next=button('castle-step','›',()=>browse(1));previous.setAttribute('aria-label','前の部屋を見る');next.setAttribute('aria-label','次の部屋を見る');
 const view=button('castle-overview','城の全景',()=>{overview=!overview;layout();});view.setAttribute('aria-pressed',String(overview));routebar.append(previous,routecopy,next,view);
 const quick=node('nav','castle-quick');quick.setAttribute('aria-label','持ち場をすぐ開く');quick.append(node('span','castle-quick-label','すぐ開く'));
 const controls=new Map(),quickButtons=new Map();
 function source(key){return accountBoard.state.destinations.find(n=>n.key===key);}
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),reduceControl=document.getElementById('reduce-setting');
 const quiet=()=>reduced.matches||!!reduceControl?.checked;
 const localJourney=getComputedStyle(document.documentElement).getPropertyValue('--castle-journey-ready').trim()==='1'?createCastleJourney({document,assetRoot:new URL('./assets/',import.meta.url).href,reducedMotion:quiet}):{travel:()=>false,cancel(){},destroy(){}};
 let hostJourney=false,travelTimer=0,travelSerial=0,lastTrip=null,presence=null,departure=null;
 const hosted=window.parent!==window,post=(type,data={})=>{if(hosted)window.parent.postMessage({channel:'cc-castle-v1',type,...data},window.location.origin);};
 function markTravel(active,duration=800){const serial=++travelSerial;clearTimeout(travelTimer);if(active){world.dataset.journey='active';document.body.dataset.castleJourney='active';travelTimer=setTimeout(()=>{if(serial===travelSerial){delete world.dataset.journey;delete document.body.dataset.castleJourney;}},duration+100);}else{delete world.dataset.journey;delete document.body.dataset.castleJourney;}}
 function cancelJourney(){localJourney.cancel();post('journey-cancel');markTravel(false);}
 function originGeometry(direction){const rect=viewport.getBoundingClientRect(),painted=stage.getBoundingClientRect();return geometry&&{left:rect.left,top:rect.top,width:rect.width,height:rect.height,stageLeft:direction==='out'?geometry.left:painted.left-rect.left,stageTop:direction==='out'?geometry.top:painted.top-rect.top,scale:direction==='out'?geometry.scale:painted.width/1536};}
 function embark(key,{direction='in',instant=false,sourceRoom}={}){
  cancelJourney();const origin=originGeometry(direction);if(!origin)return;
  const pace=document.querySelector('input[name=pace]:checked')?.value||'normal',duration=({quick:520,normal:780,slow:1050})[pace]||780;
  const spec={room:key,direction,origin,quick:instant||quiet(),duration,...(sourceRoom?{sourceRoom}:{})};
  markTravel(!spec.quick&&!document.hidden,duration);const intent=travelSerial;
  if(hostJourney)post('journey', {spec});else {const saved=direction==='out'?departure:null;departure=null;if(direction==='out')localJourney.travel({...spec,foreground:saved});else queueMicrotask(()=>{if(intent===travelSerial&&document.body.dataset.spatialRoom===key)localJourney.travel({...spec,foreground:captureCastleForeground(document)});});}
  return spec;
 }
 const fromHost=e=>{if(e.source!==window.parent||e.origin!==window.location.origin||e.data?.channel!=='cc-castle-v1')return;if(e.data.type==='journey-capability')hostJourney=e.data.ready===true;if(e.data.type==='journey-state')markTravel(e.data.active===true,e.data.duration||800);if(e.data.type==='journey-return'){layout();embark(e.data.room,{direction:'out',instant:e.data.instant===true});}};
 window.addEventListener('message',fromHost);post('journey-capability');
 const localEnd=()=>{if(!hostJourney)markTravel(false);};document.addEventListener('castle:journey-end',localEnd);
 const motionChanged=()=>{world.dataset.motion=quiet()?'reduced':'normal';if(quiet())cancelJourney();presence?.sync();post('journey-preferences',{reduced:quiet()});};
 reduced.addEventListener('change',motionChanged);reduceControl?.addEventListener('change',motionChanged);motionChanged();
 const visibilityChanged=()=>{if(document.hidden){cancelJourney();presence?.reset();cancelAnimationFrame(hitboxFrame);hitboxFrame=0;}else layout();};document.addEventListener('visibilitychange',visibilityChanged);
 const captureDeparture=()=>{if(document.getElementById('room')?.hidden)return;if(hostJourney){try{window.parent.CCCastleJourneyCapture?.();}catch{}}else departure=captureCastleForeground(document);};
 const beforeExit=e=>{if(e.type==='popstate'||e.type==='click'&&e.target.closest?.('#back,#again')||e.type==='keydown'&&e.key==='Escape'&&!document.querySelector('dialog[open]')&&document.body.dataset.castleJourney!=='active')captureDeparture();};
 document.addEventListener('click',beforeExit,true);document.addEventListener('keydown',beforeExit,true);window.addEventListener('popstate',beforeExit,true);
 const escapeJourney=e=>{if(e.key==='Escape'&&document.body.dataset.castleJourney==='active'&&!document.querySelector('dialog[open]')){e.preventDefault();e.stopImmediatePropagation();cancelJourney();}};
 document.addEventListener('keydown',escapeJourney,true);
 const interruptWork=e=>{if(document.body.dataset.castleJourney==='active'&&(e.type==='pointerdown'||e.key==='Tab'))cancelJourney();};document.addEventListener('pointerdown',interruptWork,true);document.addEventListener('keydown',interruptWork,true);
 function open(key,trigger,options={}){
  if(performance.now()<ignoreClickUntil&&trigger?.closest?.('.castle-viewport'))return;
  const destination=source(key);if(!destination||destination.pending)return;
  const instant=options.instant??!!trigger?.matches?.('.castle-quick-open');
  if(board.hidden){cancelJourney();queuedRoom={key,trigger,options:{instant,sourceRoom:options.sourceRoom||selected,direction:'switch'}};if(!returning){returning=true;document.getElementById('back').click();}return;}
  presence?.reset();const spec=embark(key,{instant,direction:options.direction||'in',sourceRoom:options.sourceRoom});
  lastTrip={key,instant:instant||quiet(),origin:spec?.origin};selected=key;lastTrigger=trigger?.isConnected?trigger:quickButtons.get(key);board.dataset.spatialDestination=key;document.body.dataset.spatialRoom=key;layout();accountBoard.open(key);
 }
 for(const [index,r] of castleRooms.entries()){
  const b=button('castle-room-hotspot','',()=>open(r.key,b));b.dataset.room=r.key;b.dataset.tone=r.tone||'sealed';b.disabled=!!r.sealed;
  const marker=node('span','castle-room-marker',String(index+1).padStart(2,'0')),label=node('span','castle-room-label'),title=node('strong',null,r.short),count=node('span','castle-room-count','確認中');label.append(title,count);b.append(marker,label);hotspots.append(b);controls.set(r.key,{button:b,title,count,marker});
  if(!r.sealed){const q=button('castle-quick-open',r.short,()=>open(r.key,q));q.dataset.room=r.key;quick.append(q);quickButtons.set(r.key,q);}
 }
 const announcement=node('p','sr-only');announcement.setAttribute('aria-live','polite');announcement.setAttribute('aria-atomic','true');
 world.append(viewport,routebar,quick,announcement);tiles.before(world);
 presence=mountCastlePresence({world,viewport,stage,controls,rooms:castleRooms,reduced:quiet});
 // The stable list remains intact as the immediate manuscript-first view.
 const mode=board.querySelector('.board-primary');const syncMode=()=>{world.hidden=board.dataset.view==='list';mode.textContent=world.hidden?'← 城の全景へ':'原稿一覧';layout();};
 function update(){
  if(accountBoard.state.visitVersion!==observedVisitVersion){observedVisitVersion=accountBoard.state.visitVersion;observedVisit=accountBoard.state.lastVisited;if(observedVisit)selected=observedVisit;}
  for(const r of castleRooms){const original=source(r.key),c=controls.get(r.key);if(!original)continue;const title=original.name||r.short;const state=original.status||'';c.title.textContent=r.short;c.button.title=title;c.button.dataset.lastVisited=String(r.key===observedVisit);c.count.textContent=state;c.button.setAttribute('aria-label',title+'、'+state+(r.sealed?'、封鎖中':'を開く')+(r.key===observedVisit?'、最後に開いた持ち場':''));quickButtons.get(r.key)?.setAttribute('aria-label',title+'をすぐ開く');}
  syncMode();layout();
 }
 function browse(delta){const i=activeRooms.findIndex(r=>r.key===selected);selected=activeRooms[(i+delta+activeRooms.length)%activeRooms.length].key;overview=false;layout();announcement.textContent=castleRooms.find(r=>r.key===selected).name+'。部屋または「すぐ開く」から入れます。';}
 // Hit regions remain in viewport pixels (minimum 44px), but follow the
 // *painted* architecture throughout browse transitions. Target geometry alone
 // would move invisible hitboxes ahead of their doors for 220ms.
 function paintTargets(){
  const bounds=viewport.getBoundingClientRect(),painted=stage.getBoundingClientRect();
  const w=viewport.clientWidth,h=viewport.clientHeight,scale=painted.width/1536,left=painted.left-bounds.left,top=painted.top-bounds.top;
  if(!w||!h||!scale)return;
  presence?.layout({width:w,height:h,scale,left,top});
  for(const [index,room] of castleRooms.entries()){
   const c=controls.get(room.key),b=c.button,x=left+room.x*1536*scale,y=top+room.y*1024*scale,rw=room.w*1536*scale,rh=room.h*1024*scale,vx=Math.max(0,x),vy=Math.max(0,y),vw=Math.min(w,x+rw)-vx,vh=Math.min(h,y+rh)-vy;
   const neighbor=!overview&&room.key!==selected;
   b.hidden=!overview&&(vw<44||vh<44);b.dataset.neighbor=String(neighbor);
   b.style.left=(overview?x:vx)+'px';b.style.top=(overview?y:vy)+'px';
   b.style.width=Math.max(44,overview?rw:vw)+'px';b.style.height=Math.max(44,overview?rh:vh)+'px';
   b.setAttribute('aria-current',room.key===selected?'location':'false');
   c.marker.textContent=(mobile.matches&&overview)||neighbor?(room.sealed?'未設定':room.short):String(index+1).padStart(2,'0');
  }
 }
 function followPaintedStage(){
  cancelAnimationFrame(hitboxFrame);hitboxFrame=0;paintTargets();
  const started=performance.now();
  const frame=()=>{
   hitboxFrame=0;if(sceneDisposed||document.hidden||world.hidden||board.hidden)return;
   paintTargets();
   const moving=stage.getAnimations?stage.getAnimations().some(a=>a.playState==='running'||a.playState==='paused'||a.pending):performance.now()-started<250;
   if(moving&&!quiet())hitboxFrame=requestAnimationFrame(frame);
  };
  hitboxFrame=requestAnimationFrame(frame);
 }
 // This viewport is a camera aperture, not a scroll container. Native focus
 // restoration must not add a second, hidden camera offset (older clip-less
 // engines can still scroll overflow:hidden containers programmatically).
 function keepCameraOrigin(){if(viewport.scrollLeft||viewport.scrollTop){viewport.scrollLeft=0;viewport.scrollTop=0;followPaintedStage();}}
 viewport.addEventListener('scroll',keepCameraOrigin,{passive:true});
 function layout(){
  keepCameraOrigin();
  world.dataset.selected=selected;for(const [key,b]of quickButtons)b.setAttribute('aria-current',key===selected?'location':'false');
  if(world.hidden||board.hidden){cancelAnimationFrame(hitboxFrame);hitboxFrame=0;return;}
  if(!viewport.clientWidth||!viewport.clientHeight)return;
  const currentMobile=innerWidth<=700;if(viewportMobile!==currentMobile){viewportMobile=currentMobile;overview=!currentMobile;}
  const r=castleRooms.find(r=>r.key===selected);
  // Resolve responsive chrome before measuring the aperture. A wrapped phone
  // hint can change its height; measuring first would restart our own camera
  // transition on the next ResizeObserver delivery.
  world.dataset.overview=String(overview);
  const title=overview?'ひとつの城、あなたの持ち場':r.name;
  const help=overview?'部屋から入室 · 天球儀は長押し／横に回せます':`${activeRooms.findIndex(x=>x.key===selected)+1} / ${activeRooms.length} · 部屋を押すと持ち場が開きます`;
  const viewTitle=overview?'部屋を近くで見る':'城の全景';
  if(location.textContent!==title)location.textContent=title;
  if(hint.textContent!==help)hint.textContent=help;
  if(view.textContent!==viewTitle)view.textContent=viewTitle;
  view.setAttribute('aria-pressed',String(overview));
  const w=viewport.clientWidth,h=viewport.clientHeight;
  const scale=overview?Math.min(w/1536,h/1024):Math.min(w*.96/(1536*r.w),h*.82/(1024*r.h));
  const cx=overview?.5:r.x+r.w/2,cy=overview?.5:r.y+r.h*.55,left=w/2-cx*1536*scale,top=h/2-cy*1024*scale;
  geometry={width:w,height:h,scale,left,top};
  const target=`translate(${left}px,${top}px) scale(${scale})`;
  if(cameraTarget!==target){cameraTarget=target;stage.style.transform=target;}
  followPaintedStage();
 }
 let pointer=null;viewport.addEventListener('pointerdown',e=>{pointer=e.pointerType==='touch'&&!e.target.closest('.castle-orrery,.castle-experience-controls')?{x:e.clientX,y:e.clientY}:null;});viewport.addEventListener('pointerup',e=>{if(!pointer)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5){ignoreClickUntil=performance.now()+250;browse(dx<0?1:-1);}});viewport.addEventListener('pointercancel',()=>pointer=null);
 viewport.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();browse(e.key==='ArrowRight'?1:-1);controls.get(selected).button.focus({preventScroll:true});}});
 const unsubscribe=accountBoard.subscribe(update);board.dataset.spatialReady='true';
 const boardObserver=new MutationObserver(()=>{syncMode();if(board.hidden)presence?.reset();if(!board.hidden&&queuedRoom){const next=queuedRoom;queuedRoom=null;returning=false;open(next.key,next.trigger,next.options);lastHidden=board.hidden;return;}if(lastHidden&&!board.hidden){layout();if(board.dataset.view!=='list'&&lastTrip?.key===selected)embark(selected,{direction:'out',instant:lastTrip.instant});else cancelJourney();if(board.dataset.view!=='list'&&lastTrigger?.isConnected)lastTrigger.focus({preventScroll:true});}lastHidden=board.hidden;});boardObserver.observe(board,{attributes:true,attributeFilter:['hidden','data-view']});
 const resize=new ResizeObserver(layout);resize.observe(viewport);const mobileChanged=()=>{overview=!mobile.matches;layout();};mobile.addEventListener('change',mobileChanged);art.addEventListener('load',layout);art.addEventListener('error',()=>{world.dataset.artFailed='true';announcement.textContent='城の絵を読み込めませんでした。持ち場は下の「すぐ開く」と原稿一覧から開けます。';});
 board.querySelector('.board-footer').prepend(board.querySelector('.board-lounge'));board.querySelector('h1').textContent='司令塔';board.querySelector('.account-board-heading small').textContent='THE CASTLE ATELIER';
 update();return {open,layout,geometry:()=>geometry,destroy(){sceneDisposed=true;cancelAnimationFrame(hitboxFrame);viewport.removeEventListener('scroll',keepCameraOrigin);document.removeEventListener('click',beforeExit,true);document.removeEventListener('keydown',beforeExit,true);window.removeEventListener('popstate',beforeExit,true);cancelJourney();localJourney.destroy();presence?.destroy();window.removeEventListener('message',fromHost);document.removeEventListener('castle:journey-end',localEnd);document.removeEventListener('keydown',escapeJourney,true);document.removeEventListener('pointerdown',interruptWork,true);document.removeEventListener('keydown',interruptWork,true);reduced.removeEventListener('change',motionChanged);reduceControl?.removeEventListener('change',motionChanged);document.removeEventListener('visibilitychange',visibilityChanged);unsubscribe();mobile.removeEventListener('change',mobileChanged);boardObserver.disconnect();resize.disconnect();delete board.dataset.spatialReady;world.remove();}};
}
