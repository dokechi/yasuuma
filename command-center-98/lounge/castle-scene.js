/* Presentation-only spatial adapter. Existing account buttons own all routing,
   records and permissions. This file is loaded only by spatial-prototype.html. */
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
export function mountCastleScene(){
 const board=document.querySelector('.account-board'),tiles=board?.querySelector('.account-tiles');if(!board||!tiles)return;
 const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const button=(cls,text,fn)=>{const b=node('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;};
 const activeRooms=castleRooms.filter(r=>!r.sealed),mobile=matchMedia('(max-width:700px)');
 let selected='insurance',overview=!mobile.matches,lastTrigger=null,lastHidden=board.hidden,geometry=null,ignoreClickUntil=0;
 const world=node('section','spatial-castle');world.setAttribute('aria-label','つながった城の持ち場');
 const viewport=node('div','castle-viewport'),stage=node('div','castle-stage'),art=node('img','castle-cutaway');art.src='assets/castle-cutaway-v1.webp';art.alt='';art.decoding='async';art.width=1536;art.height=1024;stage.append(art);
 const actor=node('img','castle-study-actor');actor.src='assets/insurance-desk-actor.webp';actor.alt='';actor.decoding='async';stage.append(actor);viewport.append(stage);
 const hotspots=node('nav','castle-hotspots');hotspots.setAttribute('aria-label','部屋から持ち場を開く');viewport.append(hotspots);
 const routebar=node('div','castle-routebar'),routecopy=node('div','castle-routecopy'),location=node('strong',null),hint=node('span',null);routecopy.append(location,hint);
 const previous=button('castle-step','‹',()=>browse(-1)),next=button('castle-step','›',()=>browse(1));previous.setAttribute('aria-label','前の部屋を見る');next.setAttribute('aria-label','次の部屋を見る');
 const view=button('castle-overview','城の全景',()=>{overview=!overview;layout();});view.setAttribute('aria-pressed',String(overview));routebar.append(previous,routecopy,next,view);
 const quick=node('nav','castle-quick');quick.setAttribute('aria-label','持ち場をすぐ開く');quick.append(node('span','castle-quick-label','すぐ開く'));
 const controls=new Map(),quickButtons=new Map();
 function source(key){return [...tiles.children].find(n=>n.dataset.destination===key);}
 function open(key,trigger){if(performance.now()<ignoreClickUntil)return;const original=source(key);if(!original||original.disabled)return;selected=key;lastTrigger=trigger;board.dataset.spatialDestination=key;document.body.dataset.spatialRoom=key;layout();original.click();}
 for(const [index,r] of castleRooms.entries()){
  const b=button('castle-room-hotspot','',()=>open(r.key,b));b.dataset.room=r.key;b.dataset.tone=r.tone||'sealed';b.disabled=!!r.sealed;
  const marker=node('span','castle-room-marker',String(index+1).padStart(2,'0')),label=node('span','castle-room-label'),title=node('strong',null,r.short),count=node('span','castle-room-count','確認中');label.append(title,count);b.append(marker,label);hotspots.append(b);controls.set(r.key,{button:b,title,count});
  if(!r.sealed){const q=button('castle-quick-open',r.short,()=>open(r.key,q));q.dataset.room=r.key;quick.append(q);quickButtons.set(r.key,q);}
 }
 const announcement=node('p','sr-only');announcement.setAttribute('aria-live','polite');announcement.setAttribute('aria-atomic','true');
 world.append(viewport,routebar,quick,announcement);tiles.before(world);
 // The stable list remains intact as the immediate manuscript-first view.
 const mode=board.querySelector('.board-primary');const syncMode=()=>{world.hidden=board.dataset.view==='list';mode.textContent=world.hidden?'← 城の全景へ':'原稿一覧';};
 function update(){
  for(const r of castleRooms){const original=source(r.key),c=controls.get(r.key);if(!original)continue;const title=original.querySelector('.account-tile-caption strong')?.textContent||r.short;const state=original.querySelector('.account-tile-state')?.textContent||'';c.title.textContent=r.short;c.button.title=title;c.count.textContent=state;c.button.setAttribute('aria-label',title+'、'+state+(r.sealed?'、封鎖中':'を開く'));quickButtons.get(r.key)?.setAttribute('aria-label',title+'をすぐ開く');}
  syncMode();layout();
 }
 function browse(delta){const i=activeRooms.findIndex(r=>r.key===selected);selected=activeRooms[(i+delta+activeRooms.length)%activeRooms.length].key;overview=false;layout();announcement.textContent=castleRooms.find(r=>r.key===selected).name+'。部屋または「すぐ開く」から入れます。';}
 function layout(){
  if(world.hidden||board.hidden)return;const w=viewport.clientWidth,h=viewport.clientHeight;if(!w||!h)return;
  const r=castleRooms.find(r=>r.key===selected),scale=overview?Math.min(w/1536,h/1024):Math.min(w*.96/(1536*r.w),h*.82/(1024*r.h));
  const cx=overview?.5:r.x+r.w/2,cy=overview?.5:r.y+r.h*.55,left=w/2-cx*1536*scale,top=h/2-cy*1024*scale;
  geometry={width:w,height:h,scale,left,top};stage.style.transform=`translate(${left}px,${top}px) scale(${scale})`;world.dataset.overview=String(overview);world.dataset.selected=selected;
  for(const room of castleRooms){const b=controls.get(room.key).button;b.hidden=!overview&&room.key!==selected;const x=left+room.x*1536*scale,y=top+room.y*1024*scale,rw=room.w*1536*scale,rh=room.h*1024*scale;b.style.left=x+'px';b.style.top=y+'px';b.style.width=Math.max(44,rw)+'px';b.style.height=Math.max(44,rh)+'px';b.setAttribute('aria-current',room.key===selected?'location':'false');}
  location.textContent=overview?'ひとつの城、あなたの持ち場':r.name;hint.textContent=overview?'灯りのついた部屋から、そのまま仕事へ。':`${activeRooms.findIndex(x=>x.key===selected)+1} / ${activeRooms.length} · 部屋を押すと持ち場が開きます`;view.textContent=overview?'部屋を近くで見る':'城の全景';view.setAttribute('aria-pressed',String(overview));
 }
 let pointer=null;viewport.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')pointer={x:e.clientX,y:e.clientY};});viewport.addEventListener('pointerup',e=>{if(!pointer)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5){ignoreClickUntil=performance.now()+250;browse(dx<0?1:-1);}});viewport.addEventListener('pointercancel',()=>pointer=null);
 viewport.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();browse(e.key==='ArrowRight'?1:-1);controls.get(selected).button.focus({preventScroll:true});}});
 const tileObserver=new MutationObserver(update);tileObserver.observe(tiles,{childList:true,subtree:true,characterData:true});
 const boardObserver=new MutationObserver(()=>{syncMode();if(lastHidden&&!board.hidden){requestAnimationFrame(()=>{layout();if(board.dataset.view!=='list'&&lastTrigger?.isConnected)lastTrigger.focus({preventScroll:true});});}lastHidden=board.hidden;});boardObserver.observe(board,{attributes:true,attributeFilter:['hidden','data-view']});
 const resize=new ResizeObserver(layout);resize.observe(viewport);mobile.addEventListener('change',()=>{overview=!mobile.matches;layout();});art.addEventListener('load',layout);art.addEventListener('error',()=>{world.dataset.artFailed='true';announcement.textContent='城の絵を読み込めませんでした。持ち場は下の「すぐ開く」と原稿一覧から開けます。';});
 board.querySelector('.board-footer').prepend(board.querySelector('.board-lounge'));board.querySelector('h1').textContent='司令塔';board.querySelector('.account-board-heading small').textContent='SPATIAL ATELIER · DESIGN STUDY';
 update();return {layout,geometry:()=>geometry,destroy(){tileObserver.disconnect();boardObserver.disconnect();resize.disconnect();world.remove();}};
}
