/* Presentation only. The existing desk owns data, selection, editing and copying. */
import * as application from './app.js?v=20261109.6-everyday';
import {createGlassArt as art} from './stained-art.js?v=20261110.3-silver-architecture';
import {glassSlots,glassFor} from './stained-model.js?v=20261110.2-everyday-glass';
import {installGalleryOrder} from './stained-order.js?v=20261110.9-touch';
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

const references=make('dialog','sg-references');
references.id='writing-references';
references.setAttribute('aria-labelledby','writing-references-title');
const referenceHeading=make('header','sg-reference-heading');
const referenceTitle=make('h2','','原稿の参考元');
referenceTitle.id='writing-references-title';
referenceHeading.append(referenceTitle,button('閉じる',()=>references.close()));
const referenceFilter=make('label','sg-reference-filter','箱・資料');
const referenceSelect=make('select');
referenceFilter.append(referenceSelect);
const referenceContent=make('section','sg-reference-content');
const referenceAnswer=make('p','sg-reference-answer');
const referenceStatus=make('p','sg-reference-status');
referenceStatus.setAttribute('role','status');
const copyStatus=make('span','sg-reference-status');
copyStatus.setAttribute('role','status');
const copyAnswer=button('回答をコピー',async()=>{
  try{
    await navigator.clipboard.writeText(referenceAnswer.textContent);
    copyStatus.textContent='コピーしました。';
  }catch{
    const range=doc.createRange();
    range.selectNodeContents(referenceAnswer);
    const selection=window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    copyStatus.textContent='表示された文をコピーしてください。';
  }
});
const answerActions=make('div','sg-reference-actions');
answerActions.append(copyAnswer,copyStatus);
const referenceList=make('ul','sg-reference-list');
referenceContent.append(referenceAnswer,answerActions,referenceList);
const referenceRetry=button('再読み込み',loadReferences);
const referenceBody=make('div','sg-reference-body');
referenceBody.append(referenceStatus,referenceRetry,referenceContent);
references.append(referenceHeading,referenceFilter,referenceBody);
doc.body.append(references);
let referenceGroups=[],referenceKey='overview',referenceLoading=false;

function referenceSource(source){
  const item=make('li');
  const name=make('h3','',source.name);
  if(source.role)name.append(make('span','sg-reference-role',source.role));
  item.append(name,make('p','',source.note));
  for(const link of source.links||[]){
    try{
      const url=new URL(link.url);
      if(url.protocol!=='https:'||url.username||url.password)continue;
      const a=make('a','',link.label);
      a.href=url.href;
      a.target='_blank';
      a.rel='noopener noreferrer';
      item.append(a);
    }catch{}
  }
  return item;
}
function renderReferences(){
  const group=referenceGroups.find(group=>group.key===referenceSelect.value);
  if(!group)return;
  referenceAnswer.textContent=group.answer;
  copyStatus.textContent='';
  referenceList.replaceChildren(...group.sources.map(referenceSource));
  referenceBody.scrollTop=0;
}
function loadReferences(){
  if(referenceLoading)return;
  referenceFilter.hidden=referenceContent.hidden=referenceRetry.hidden=true;
  if(window.parent===window){
    referenceStatus.textContent='司令塔の本体から開いてください。';
    return;
  }
  referenceLoading=true;
  referenceStatus.textContent='参考元を読み込んでいます…';
  window.parent.postMessage({channel:'cc-castle-v1',type:'writing-references'},window.location.origin);
}
referenceSelect.addEventListener('change',renderReferences);
window.addEventListener('message',event=>{
  const data=event.data;
  if(event.source!==window.parent||event.origin!==window.location.origin||data?.channel!=='cc-castle-v1'||data.type!=='writing-references')return;
  referenceLoading=false;
  if(!references.open)return;
  if(data.error){
    referenceStatus.textContent=data.error;
    referenceRetry.hidden=false;
    return;
  }
  referenceGroups=Array.isArray(data.guide?.groups)?data.guide.groups:[];
  if(!referenceGroups.length){
    referenceStatus.textContent='参考元の登録を確認できませんでした。';
    referenceRetry.hidden=false;
    return;
  }
  referenceSelect.replaceChildren(...referenceGroups.map(group=>{
    const option=make('option','',group.label);
    option.value=group.key;
    return option;
  }));
  referenceSelect.value=referenceGroups.some(group=>group.key===referenceKey)?referenceKey:referenceGroups[0].key;
  referenceFilter.hidden=referenceContent.hidden=false;
  referenceStatus.textContent='';
  renderReferences();
});

function settings(){
  // The existing board makes #app inert. Its settings dialog lives inside #app.
  const app=doc.getElementById('app');app.removeAttribute('inert');
  const dialog=doc.getElementById('settings');
  dialog.addEventListener('close',()=>{if(!board.element.hidden)app.setAttribute('inert','');},{once:true});
  doc.getElementById('settings-open').click();
}
function header(reader=false){
  const h=make('header','sg-header');
  h.append(reader?button('‹ 司令塔',()=>travel(()=>doc.getElementById('back').click()),'sg-title'):make('h1','sg-title','司令塔'));
  const nav=make('nav','sg-tools');nav.setAttribute('aria-label','司令塔の操作');
  const referenceButton=button('原稿の参考元',()=>{
    referenceKey=reader?room.dataset.account:'overview';
    references.showModal();
    loadReferences();
  });
  referenceButton.setAttribute('aria-haspopup','dialog');
  referenceButton.setAttribute('aria-controls',references.id);
  const cooney=make('a','sg-tool sg-cooney','くーにーOS');
  cooney.href='https://cooney-os.vercel.app/';
  cooney.target='_blank';
  cooney.rel='noopener noreferrer';
  cooney.title='くーにーOSを新しいタブで開く';
  nav.append(
    button('原稿を検索',()=>doc.getElementById('lounge-search').click()),
    button('更新',()=>doc.getElementById('desk-refresh').click(),'sg-tool sg-refresh'),
    referenceButton,button('設定',settings),cooney
  );
  h.append(nav);
  return h;
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
for(const slot of glassSlots){
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
    e.preventDefault();const list=[...rail.children],index=list.indexOf(card);
    const next=e.key==='Home'?0:e.key==='End'?list.length-1:Math.max(0,Math.min(list.length-1,index+(e.key==='ArrowRight'?1:-1)));
    const target=list[next];target.focus({preventScroll:true});
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
const orderTrigger=button('並べ替え',()=>{},'sg-tool sg-order-trigger');orderTrigger.setAttribute('aria-label','ステンドグラスを並べ替え');controls.append(previous,orderTrigger,next);footer.append(status,controls);home.append(head,rail,footer);
board.element.append(home);board.element.setAttribute('aria-label','司令塔のステンドグラス');
function scrollState(){previous.disabled=rail.scrollLeft<2;next.disabled=rail.scrollLeft+rail.clientWidth>=rail.scrollWidth-3;}
rail.addEventListener('scroll',scrollState,{passive:true});window.addEventListener('resize',scrollState);
const readerHead=header(true),scene=make('div','sg-reader-scene'),selectedArt=make('aside','sg-selected-art');
scene.setAttribute('aria-hidden','true');for(const slot of glassSlots){const panel=art(slot);panel.dataset.key=slot.key;scene.append(panel);}
room.prepend(readerHead,scene,selectedArt);
const orderDone=button('完了',()=>{},'sg-tool sg-order-done'),orderHint=make('span','sg-order-hint');orderHint.setAttribute('role','status');orderHint.setAttribute('aria-live','polite');controls.prepend(orderDone);footer.prepend(orderHint);
const reorder=installGalleryOrder({rail,done:orderDone,hint:orderHint,trigger:orderTrigger,onChange:keys=>{for(const key of keys){const panel=[...scene.children].find(n=>n.dataset.key===key);if(panel)scene.append(panel);}scrollState();}});
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
Object.defineProperty(window,'__stainedGallery',{value:{snapshot:()=>({selected,slots:reorder.order().map(key=>{const s=glassFor(key);return {key:s.key,label:s.label,pending:!!s.pending};}),room:room.hidden?null:room.dataset.account,scrollLeft:rail.scrollLeft})}});
window.addEventListener('pagehide',event=>{if(!event.persisted){reorder.destroy();off();observer.disconnect();doc.removeEventListener('cc:paper-render',schedule);window.removeEventListener('resize',scrollState);}},{once:true});
