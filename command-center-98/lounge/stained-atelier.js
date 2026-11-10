/* Presentation only. The existing desk owns data, selection, editing and copying. */
import * as application from './app.js?v=20261109.6-everyday';
import {createGlassArt as art} from './stained-art.js?v=20261110.3-silver-architecture';
import {glassSlots,glassFor,adjacentSlot} from './stained-model.js?v=20261110.2-everyday-glass';
const doc=document,board=application.getAccountBoard(),owner=application.getPaperDesk();
const room=doc.getElementById('room');
const make=(tag,cls,text)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
const button=(text,action,cls='sg-tool')=>{const b=make('button',cls,text);b.type='button';b.addEventListener('click',action);return b;};
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||doc.getElementById('reduce-setting')?.checked;
const motionDuration=1300;
let passage=null;
function travel(action){
  passage?.skipTransition();
  if(reduced()){action();return;}
  const returning=!room.hidden;
  doc.documentElement.dataset.sgDirection=returning?'back':'forward';
  const change=async()=>{
    // Back uses browser history; wait for its DOM change before capturing the destination.
    await new Promise(resolve=>{
      let timer;
      const done=()=>{observer.disconnect();clearTimeout(timer);resolve();};
      const observer=new MutationObserver(()=>{if(room.hidden===returning)done();});
      observer.observe(room,{attributes:true,attributeFilter:['hidden']});
      timer=setTimeout(done,800);action();if(room.hidden===returning)done();
    });
    paint();
  };
  if(doc.startViewTransition){
    passage=doc.startViewTransition(change);
    passage.finished.catch(()=>{});
  }else{
    const origin=cards.get(selected)?.querySelector('.sg-art');
    const from=(returning?selectedArt.querySelector('.sg-art'):origin)?.getBoundingClientRect();
    change().then(()=>{
      const target=returning?origin:selectedArt.querySelector('.sg-art');
      const to=target?.getBoundingClientRect();
      if(from&&to&&to.width)target.animate?.([{transform:`translateX(${from.left-to.left}px)`},{transform:'translateX(0)'}],{duration:motionDuration,easing:'cubic-bezier(.22,.61,.36,1)'});
      if(!returning)doc.getElementById('desk').animate?.([{transform:'translateX(100vw)'},{transform:'translateX(0)'}],{duration:motionDuration,easing:'cubic-bezier(.22,.61,.36,1)'});
    });
  }
}
let selected='insurance',queued=false;

function settings(){
  // The existing board makes #app inert. Its settings dialog lives inside #app.
  const app=doc.getElementById('app');app.removeAttribute('inert');
  const dialog=doc.getElementById('settings');
  dialog.addEventListener('close',()=>{if(!board.element.hidden)app.setAttribute('inert','');},{once:true});
  doc.getElementById('settings-open').click();
}
function header(reader=false){
  const h=make('header','sg-header');
  h.append(reader?button('‹ 司令塔',()=>travel(()=>doc.getElementById('back').click()),'sg-title'):make('h1','sg-title','司令塔　原稿の記録'));
  const nav=make('nav','sg-tools');nav.setAttribute('aria-label','司令塔の操作');
  nav.append(button('原稿を検索',()=>doc.getElementById('lounge-search').click()),button('更新',()=>doc.getElementById('desk-refresh').click()),button('設定',settings));h.append(nav);return h;
}
const home=make('section','sg-home'),head=header(),rail=make('nav','sg-rail');
rail.setAttribute('aria-label',`${glassSlots.filter(s=>!s.pending).length}つの持ち場と${glassSlots.filter(s=>s.pending).length}つの空き枠。左右にスクロールして選択`);
const cards=new Map();
let scrollFrame=0,scrollGoal=null;
function cancelScroll(){cancelAnimationFrame(scrollFrame);scrollFrame=0;scrollGoal=null;rail.style.scrollSnapType='';}
function glideTo(left){
  cancelScroll();
  const start=rail.scrollLeft,target=Math.max(0,Math.min(left,rail.scrollWidth-rail.clientWidth));
  if(reduced()){rail.scrollLeft=target;return;}
  scrollGoal=target;rail.style.scrollSnapType='none';const began=performance.now();
  function frame(now){const t=Math.min(1,(now-began)/motionDuration),ease=t*t*(3-2*t);rail.scrollLeft=start+(target-start)*ease;
    if(t<1)scrollFrame=requestAnimationFrame(frame);else{scrollFrame=0;scrollGoal=null;}}
  scrollFrame=requestAnimationFrame(frame);
}
rail.addEventListener('pointerdown',cancelScroll,{passive:true});
function select(key){
  selected=key;
  for(const [k,card]of cards){const yes=k===key;card.dataset.selected=String(yes);card.querySelector('.sg-art').style.viewTransitionName=yes?'sg-panel':'none';if(yes)card.setAttribute('aria-current','true');else card.removeAttribute('aria-current');}
}
for(const [index,slot]of glassSlots.entries()){
  const card=button('',()=>{if(slot.pending)return;select(slot.key);travel(()=>board.open(slot.key));},'sg-card');
  card.dataset.key=slot.key;card.dataset.empty=String(!!slot.pending);card.setAttribute('aria-label',slot.label+(slot.pending?'、空き枠': 'の原稿を開く'));
  if(slot.pending)card.setAttribute('aria-disabled','true');
  card.append(make('span','sg-beam'),art(slot),make('span','sg-label',slot.label));
  const pointer=make('span','sg-pointer');pointer.setAttribute('aria-hidden','true');pointer.innerHTML='<svg viewBox="0 0 38 32"><path fill="#fff" d="M2 15 L8 8 L13 7 L15 1 L18 1 L20 3 L18 9 L33 9 Q38 9 36 13 L25 16 L25 20 L22 21 L20 25 L9 25 L2 22Z"/></svg>';card.append(pointer);
  const count=make('span','sg-count',slot.pending?'空き枠':'読み込み中');card.append(count);
  card.addEventListener('pointerenter',()=>{if(matchMedia('(hover: hover)').matches)select(slot.key);});
  card.addEventListener('focus',()=>select(slot.key));
  card.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?glassSlots.length-1:adjacentSlot(index,e.key==='ArrowRight'?1:-1);
    const target=cards.get(glassSlots[next].key);target.focus({preventScroll:true});
    if(reduced())target.scrollIntoView({behavior:'instant',block:'nearest',inline:'center'});
    else glideTo(rail.scrollLeft+target.getBoundingClientRect().left-rail.getBoundingClientRect().left+(target.clientWidth-rail.clientWidth)/2);
  });cards.set(slot.key,card);rail.append(card);
}
// Native touch scrolling and trackpad gestures; wheel also works with a mouse.
rail.addEventListener('wheel',e=>{if(Math.abs(e.deltaY)>Math.abs(e.deltaX)&&rail.scrollWidth>rail.clientWidth){e.preventDefault();glideTo((scrollGoal??rail.scrollLeft)+e.deltaY);}else cancelScroll();},{passive:false});
const footer=make('footer','sg-footer'),status=make('span','sg-status','原稿を確認しています…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const controls=make('div','sg-scroll-controls');
const previous=button('‹',()=>glideTo((scrollGoal??rail.scrollLeft)-rail.clientWidth*.7));previous.setAttribute('aria-label','左へスクロール');
const next=button('›',()=>glideTo((scrollGoal??rail.scrollLeft)+rail.clientWidth*.7));next.setAttribute('aria-label','右へスクロール');
controls.append(previous,make('span','','左右にスワイプ'),next);footer.append(status,controls);home.append(head,rail,footer);
const categories=make('nav','sg-categories');categories.setAttribute('aria-label','司令塔の分類');
for(const [i,label,action]of [[0,'原稿の持ち場',()=>{cards.get(selected)?.focus();}],[1,'仕入れの記録',()=>{select('sourcing');travel(()=>board.open('sourcing'));}],[2,'表示と音の設定',settings]]){
 const tab=button('',action,'sg-category');tab.setAttribute('aria-label',label);tab.innerHTML=`<svg viewBox="0 0 82 100" aria-hidden="true"><image href="assets/stained/journey-reference.webp" x="${-43-i*90}" y="-81" width="2048" height="1152"/></svg>`;categories.append(tab);
}home.append(categories);board.element.append(home);board.element.setAttribute('aria-label','司令塔のステンドグラス');
function scrollState(){previous.disabled=rail.scrollLeft<2;next.disabled=rail.scrollLeft+rail.clientWidth>=rail.scrollWidth-3;}
rail.addEventListener('scroll',scrollState,{passive:true});window.addEventListener('resize',scrollState);
const readerHead=header(true),scene=make('div','sg-reader-scene'),selectedArt=make('aside','sg-selected-art');
scene.setAttribute('aria-hidden','true');for(const slot of glassSlots){const panel=art(slot);panel.dataset.key=slot.key;scene.append(panel);}
room.prepend(readerHead,scene,selectedArt);
let readerKey='';
function paint(){
  queued=false;
  const state=board.state;
  for(const slot of glassSlots){if(slot.pending)continue;const count=cards.get(slot.key).querySelector('.sg-count');const destination=state.destinations.find(d=>d.key===slot.key);count.textContent=slot.key==='sourcing'?'購入・在庫・売却':destination?.status||'原稿を確認';}
  status.textContent=state.loading?'保存原稿を読み込み中…':state.complete?`${glassSlots.filter(s=>!s.pending).length} / ${glassSlots.length} 登録済み　·　原稿を選択してください`:state.message||'更新して原稿を確認してください';
  const slot=glassFor(room.dataset.account);
  if(!room.hidden&&slot){
    select(slot.key);
    for(const panel of scene.children)panel.hidden=panel.dataset.key===slot.key;
    if(readerKey!==slot.key){readerKey=slot.key;const panel=art(slot);panel.style.viewTransitionName='sg-panel';selectedArt.replaceChildren(panel,make('span','sg-label',slot.label));}
    doc.getElementById('desk-title').textContent=slot.label+'の原稿';
  }
  scrollState();
}
function schedule(){if(!queued){queued=true;queueMicrotask(paint);}}
const off=board.subscribe(schedule),observer=new MutationObserver(schedule);
observer.observe(room,{attributes:true,attributeFilter:['hidden','data-account']});
observer.observe(board.element,{attributes:true,attributeFilter:['hidden']});
doc.addEventListener('cc:paper-render',schedule);
// Retain manuscript editor and its existing server-backed 「バズった」 action.
// Keep old read-completion semantics explicit instead of relabelling them as posting.
doc.getElementById('desk-done').textContent='読了にする';
doc.querySelector('[data-desk-filter="pin"]').textContent='保存済み';
doc.getElementById('desk-pin').setAttribute('aria-label','この原稿を保存済みにする');
doc.querySelectorAll('a[href="index.html?presentation=book"]').forEach(a=>a.href='book.html');
select(selected);paint();
Object.defineProperty(window,'__stainedGallery',{value:{snapshot:()=>({selected,slots:glassSlots.map(s=>({key:s.key,label:s.label,pending:!!s.pending})),room:room.hidden?null:room.dataset.account,scrollLeft:rail.scrollLeft})}});
window.addEventListener('pagehide',event=>{if(!event.persisted){off();observer.disconnect();doc.removeEventListener('cc:paper-render',schedule);window.removeEventListener('resize',scrollState);}},{once:true});
