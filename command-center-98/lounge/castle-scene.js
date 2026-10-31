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
 const board=accountBoard?.element,tiles=board?.querySelector('.account-tiles');if(!board||!tiles)throw new Error('Spatial scene needs the existing account controller.');
 const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const button=(cls,text,fn)=>{const b=node('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;};
 const activeRooms=castleRooms.filter(r=>!r.sealed),mobile=matchMedia('(max-width:700px)');
 let selected='insurance',overview=!mobile.matches,lastTrigger=null,lastHidden=board.hidden,geometry=null,ignoreClickUntil=0,queuedRoom=null,returning=false,observedVisit=null,observedVisitVersion=-1;
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
 let journey=null;
 function cancelJourney(){if(!journey)return;for(const animation of journey.animations)animation.cancel();journey.layer.remove();journey=null;}
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function embark(key){
  cancelJourney();if(typeof Element.prototype.animate!=='function'||reduced.matches||document.getElementById('reduce-setting')?.checked||document.hidden||!geometry)return;
  const r=castleRooms.find(room=>room.key===key),rect=viewport.getBoundingClientRect();if(!r||!rect.width||!rect.height)return;
  const layer=node('div','castle-travel-view');layer.setAttribute('aria-hidden','true');const moving=stage.cloneNode(true);moving.style.transition='none';layer.append(moving);document.body.append(layer);
  const scale=Math.max(innerWidth/(1536*r.w),innerHeight/(1024*r.h)),left=(innerWidth-1536*r.w*scale)/2-1536*r.x*scale,top=(innerHeight-1024*r.h*scale)/2-1024*r.y*scale;
  const start=`translate(${rect.left+geometry.left}px,${rect.top+geometry.top}px) scale(${geometry.scale})`,end=`translate(${left}px,${top}px) scale(${scale})`;
  const animations=[moving.animate([{transform:start},{transform:end}],{duration:220,easing:'cubic-bezier(.2,.7,.2,1)',fill:'both'}),layer.animate([{clipPath:`inset(${rect.top}px ${Math.max(0,innerWidth-rect.right)}px ${Math.max(0,innerHeight-rect.bottom)}px ${rect.left}px)`,opacity:1},{clipPath:'inset(0)',opacity:1,offset:.68},{clipPath:'inset(0)',opacity:0}],{duration:220,easing:'ease-out',fill:'both'})];
  const current={layer,animations};journey=current;Promise.all(animations.map(a=>a.finished)).then(()=>{if(journey===current){layer.remove();journey=null;}}).catch(()=>{});
 }
 const reduceControl=document.getElementById('reduce-setting');
 const motionChanged=()=>{const quiet=reduced.matches||!!reduceControl?.checked;world.dataset.motion=quiet?'reduced':'normal';if(quiet)cancelJourney();};reduced.addEventListener('change',motionChanged);reduceControl?.addEventListener('change',motionChanged);motionChanged();
 const visibilityChanged=()=>{if(document.hidden)cancelJourney();};document.addEventListener('visibilitychange',visibilityChanged);
 function open(key,trigger){if(performance.now()<ignoreClickUntil)return;const destination=source(key);if(!destination||destination.pending)return;if(board.hidden){queuedRoom={key,trigger};if(!returning){returning=true;document.getElementById('back').click();}return;}embark(key);selected=key;lastTrigger=trigger?.isConnected?trigger:quickButtons.get(key);board.dataset.spatialDestination=key;document.body.dataset.spatialRoom=key;layout();accountBoard.open(key);}
 for(const [index,r] of castleRooms.entries()){
  const b=button('castle-room-hotspot','',()=>open(r.key,b));b.dataset.room=r.key;b.dataset.tone=r.tone||'sealed';b.disabled=!!r.sealed;
  const marker=node('span','castle-room-marker',String(index+1).padStart(2,'0')),label=node('span','castle-room-label'),title=node('strong',null,r.short),count=node('span','castle-room-count','確認中');label.append(title,count);b.append(marker,label);hotspots.append(b);controls.set(r.key,{button:b,title,count,marker});
  if(!r.sealed){const q=button('castle-quick-open',r.short,()=>open(r.key,q));q.dataset.room=r.key;quick.append(q);quickButtons.set(r.key,q);}
 }
 const announcement=node('p','sr-only');announcement.setAttribute('aria-live','polite');announcement.setAttribute('aria-atomic','true');
 world.append(viewport,routebar,quick,announcement);tiles.before(world);
 // The stable list remains intact as the immediate manuscript-first view.
 const mode=board.querySelector('.board-primary');const syncMode=()=>{world.hidden=board.dataset.view==='list';mode.textContent=world.hidden?'← 城の全景へ':'原稿一覧';};
 function update(){
  if(accountBoard.state.visitVersion!==observedVisitVersion){observedVisitVersion=accountBoard.state.visitVersion;observedVisit=accountBoard.state.lastVisited;if(observedVisit)selected=observedVisit;}
  for(const r of castleRooms){const original=source(r.key),c=controls.get(r.key);if(!original)continue;const title=original.name||r.short;const state=original.status||'';c.title.textContent=r.short;c.button.title=title;c.button.dataset.lastVisited=String(r.key===observedVisit);c.count.textContent=state;c.button.setAttribute('aria-label',title+'、'+state+(r.sealed?'、封鎖中':'を開く')+(r.key===observedVisit?'、最後に開いた持ち場':''));quickButtons.get(r.key)?.setAttribute('aria-label',title+'をすぐ開く');}
  syncMode();layout();
 }
 function browse(delta){const i=activeRooms.findIndex(r=>r.key===selected);selected=activeRooms[(i+delta+activeRooms.length)%activeRooms.length].key;overview=false;layout();announcement.textContent=castleRooms.find(r=>r.key===selected).name+'。部屋または「すぐ開く」から入れます。';}
 function layout(){
  if(world.hidden||board.hidden)return;const w=viewport.clientWidth,h=viewport.clientHeight;if(!w||!h)return;
  const r=castleRooms.find(r=>r.key===selected),scale=overview?Math.min(w/1536,h/1024):Math.min(w*.96/(1536*r.w),h*.82/(1024*r.h));
  const cx=overview?.5:r.x+r.w/2,cy=overview?.5:r.y+r.h*.55,left=w/2-cx*1536*scale,top=h/2-cy*1024*scale;
  geometry={width:w,height:h,scale,left,top};stage.style.transform=`translate(${left}px,${top}px) scale(${scale})`;world.dataset.overview=String(overview);world.dataset.selected=selected;
  for(const [index,room] of castleRooms.entries()){const c=controls.get(room.key),b=c.button,x=left+room.x*1536*scale,y=top+room.y*1024*scale,rw=room.w*1536*scale,rh=room.h*1024*scale,vx=Math.max(0,x),vy=Math.max(0,y),vw=Math.min(w,x+rw)-vx,vh=Math.min(h,y+rh)-vy;const neighbor=!overview&&room.key!==selected;b.hidden=!overview&&(vw<44||vh<44);b.dataset.neighbor=String(neighbor);b.style.left=(overview?x:vx)+'px';b.style.top=(overview?y:vy)+'px';b.style.width=Math.max(44,overview?rw:vw)+'px';b.style.height=Math.max(44,overview?rh:vh)+'px';b.setAttribute('aria-current',room.key===selected?'location':'false');c.marker.textContent=(mobile.matches&&overview)||neighbor?(room.sealed?'未設定':room.short):String(index+1).padStart(2,'0');}
  location.textContent=overview?'ひとつの城、あなたの持ち場':r.name;hint.textContent=overview?'灯りのついた部屋から、そのまま仕事へ。':`${activeRooms.findIndex(x=>x.key===selected)+1} / ${activeRooms.length} · 部屋を押すと持ち場が開きます`;view.textContent=overview?'部屋を近くで見る':'城の全景';view.setAttribute('aria-pressed',String(overview));for(const [key,b]of quickButtons)b.setAttribute('aria-current',key===selected?'location':'false');
 }
 let pointer=null;viewport.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')pointer={x:e.clientX,y:e.clientY};});viewport.addEventListener('pointerup',e=>{if(!pointer)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5){ignoreClickUntil=performance.now()+250;browse(dx<0?1:-1);}});viewport.addEventListener('pointercancel',()=>pointer=null);
 viewport.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();browse(e.key==='ArrowRight'?1:-1);controls.get(selected).button.focus({preventScroll:true});}});
 const unsubscribe=accountBoard.subscribe(update);board.dataset.spatialReady='true';
 const boardObserver=new MutationObserver(()=>{syncMode();if(!board.hidden&&queuedRoom){const next=queuedRoom;queuedRoom=null;returning=false;open(next.key,next.trigger);lastHidden=board.hidden;return;}if(lastHidden&&!board.hidden){cancelJourney();layout();if(board.dataset.view!=='list'&&lastTrigger?.isConnected)lastTrigger.focus({preventScroll:true});}lastHidden=board.hidden;});boardObserver.observe(board,{attributes:true,attributeFilter:['hidden','data-view']});
 const resize=new ResizeObserver(layout);resize.observe(viewport);mobile.addEventListener('change',()=>{overview=!mobile.matches;layout();});art.addEventListener('load',layout);art.addEventListener('error',()=>{world.dataset.artFailed='true';announcement.textContent='城の絵を読み込めませんでした。持ち場は下の「すぐ開く」と原稿一覧から開けます。';});
 board.querySelector('.board-footer').prepend(board.querySelector('.board-lounge'));board.querySelector('h1').textContent='司令塔';board.querySelector('.account-board-heading small').textContent='THE CASTLE ATELIER';
 update();return {open,layout,geometry:()=>geometry,destroy(){cancelJourney();reduced.removeEventListener('change',motionChanged);reduceControl?.removeEventListener('change',motionChanged);document.removeEventListener('visibilitychange',visibilityChanged);unsubscribe();boardObserver.disconnect();resize.disconnect();delete board.dataset.spatialReady;world.remove();}};
}
