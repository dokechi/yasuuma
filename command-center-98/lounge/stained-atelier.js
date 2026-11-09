/* Presentation only. The existing desk owns data, selection, editing and copying. */
import * as application from './app.js?v=20261109.1-manga';
import {glassSlots,glassFor,adjacentSlot} from './stained-model.js?v=20261109.2-stained';
const doc=document,board=application.getAccountBoard(),owner=application.getPaperDesk();
const room=doc.getElementById('room');
const make=(tag,cls,text)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
const button=(text,action,cls='sg-tool')=>{const b=make('button',cls,text);b.type='button';b.addEventListener('click',action);return b;};
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
let selected='insurance',queued=false;
let serial=0;
function art(slot){
  const wrapper=make('span','sg-art');wrapper.setAttribute('aria-hidden','true');
  // Clip the approved artwork in the browser; never redraw its glass or sprite.
  const clip='sg-clip-'+(++serial),x=slot.center-85;
  wrapper.innerHTML=`<svg viewBox="0 0 170 660" xmlns="http://www.w3.org/2000/svg" focusable="false"><defs><clipPath id="${clip}"><path d="M85 3 L116 25 Q150 57 150 110 L150 151 L164 168 L150 184 L150 557 L125 591 L125 609 L130 621 L128 639 Q85 661 42 639 L40 621 L45 609 L45 591 L20 557 L20 184 L6 168 L20 151 L20 110 Q20 57 54 25 Z"/></clipPath></defs><image href="assets/stained/gallery-${slot.sheet}.png" x="${-x}" y="-120" width="1670" height="941" clip-path="url(#${clip})"/></svg>`;
  return wrapper;
}
function settings(){
  // The existing board makes #app inert. Its settings dialog lives inside #app.
  const app=doc.getElementById('app');app.removeAttribute('inert');
  const dialog=doc.getElementById('settings');
  dialog.addEventListener('close',()=>{if(!board.element.hidden)app.setAttribute('inert','');},{once:true});
  doc.getElementById('settings-open').click();
}
function header(reader=false){
  const h=make('header','sg-header');
  h.append(reader?button('‹ 司令塔',()=>doc.getElementById('back').click(),'sg-title'):make('h1','sg-title','司令塔　原稿'));
  const nav=make('nav','sg-tools');nav.setAttribute('aria-label','司令塔の操作');
  nav.append(button('原稿を検索',()=>doc.getElementById('lounge-search').click()),button('更新',()=>doc.getElementById('desk-refresh').click()),button('設定',settings));h.append(nav);return h;
}
const home=make('section','sg-home'),head=header(),rail=make('nav','sg-rail');
rail.setAttribute('aria-label','8つの持ち場と2つの空き枠。左右にスクロールして選択');
const cards=new Map();
function select(key){
  selected=key;
  for(const [k,card]of cards){const yes=k===key;card.dataset.selected=String(yes);if(yes)card.setAttribute('aria-current','true');else card.removeAttribute('aria-current');}
}
for(const [index,slot]of glassSlots.entries()){
  const card=button('',()=>{if(slot.pending)return;select(slot.key);board.open(slot.key);},'sg-card');
  card.dataset.key=slot.key;card.dataset.empty=String(!!slot.pending);card.setAttribute('aria-label',slot.label+(slot.pending?'、空き枠': 'の原稿を開く'));
  if(slot.pending)card.setAttribute('aria-disabled','true');
  card.append(make('span','sg-beam'),art(slot),make('span','sg-label',slot.label));
  const count=make('span','sg-count',slot.pending?'空き枠':'読み込み中');card.append(count);
  card.addEventListener('pointerenter',()=>{if(matchMedia('(hover: hover)').matches)select(slot.key);});
  card.addEventListener('focus',()=>select(slot.key));
  card.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?glassSlots.length-1:adjacentSlot(index,e.key==='ArrowRight'?1:-1);
    const target=cards.get(glassSlots[next].key);target.focus({preventScroll:true});target.scrollIntoView({behavior:reduced()?'instant':'smooth',block:'nearest',inline:'center'});
  });cards.set(slot.key,card);rail.append(card);
}
// Native touch scrolling and trackpad gestures; wheel also works with a mouse.
rail.addEventListener('wheel',e=>{if(Math.abs(e.deltaY)>Math.abs(e.deltaX)&&rail.scrollWidth>rail.clientWidth){const old=rail.scrollLeft;rail.scrollLeft+=e.deltaY;if(old!==rail.scrollLeft)e.preventDefault();}},{passive:false});
const footer=make('footer','sg-footer'),status=make('span','sg-status','原稿を確認しています…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const controls=make('div','sg-scroll-controls');
const previous=button('‹',()=>rail.scrollBy({left:-rail.clientWidth*.7,behavior:reduced()?'instant':'smooth'}));previous.setAttribute('aria-label','左へスクロール');
const next=button('›',()=>rail.scrollBy({left:rail.clientWidth*.7,behavior:reduced()?'instant':'smooth'}));next.setAttribute('aria-label','右へスクロール');
controls.append(previous,make('span','','左右にスワイプ'),next);footer.append(status,controls);home.append(head,rail,footer);board.element.append(home);board.element.setAttribute('aria-label','司令塔のステンドグラス');
function scrollState(){previous.disabled=rail.scrollLeft<2;next.disabled=rail.scrollLeft+rail.clientWidth>=rail.scrollWidth-3;}
rail.addEventListener('scroll',scrollState,{passive:true});window.addEventListener('resize',scrollState);
const readerHead=header(true),scene=make('div','sg-reader-scene'),selectedArt=make('aside','sg-selected-art');
scene.setAttribute('aria-hidden','true');for(const slot of glassSlots)scene.append(art(slot));
room.prepend(readerHead,scene,selectedArt);
let readerKey='';
function paint(){
  queued=false;
  const state=board.state;
  for(const slot of glassSlots){if(slot.pending)continue;const count=cards.get(slot.key).querySelector('.sg-count');const destination=state.destinations.find(d=>d.key===slot.key);count.textContent=slot.key==='sourcing'?'購入・在庫・売却':destination?.status||'原稿を確認';}
  status.textContent=state.loading?'保存原稿を読み込み中…':state.complete?'8 / 10 登録済み　·　原稿を選択してください':state.message||'更新して原稿を確認してください';
  const slot=glassFor(room.dataset.account);
  if(!room.hidden&&slot){
    select(slot.key);
    if(readerKey!==slot.key){readerKey=slot.key;selectedArt.replaceChildren(art(slot),make('span','sg-label',slot.label));}
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
