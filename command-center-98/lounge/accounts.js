// Current publishing identities. Slots are presentation only, never new accounts.
export const publishingAccounts=Object.freeze([
 {key:'insurance',place:'kyun',name:'保険',handle:'@sucker0508',tone:'rose'},
 {key:'otoku',place:'otoku',name:'まだ安く買えるはず',handle:'@thats_a_steal0601',tone:'violet'},
 {key:'rakuten',place:'rakuten',name:'楽天犬',handle:'@bonya0914',tone:'amber'},
 {key:'lottery',place:'lottery',name:'抽選日記',handle:'@chusen1101',tone:'green',artKey:'planned-4'},
 ...[5,6].map(n=>({key:'planned-'+n,name:'アカウント '+n,pending:true}))
]);
export function draftsForAccount(rows,account){
 if(!account||account.pending)return [];
 return rows.filter(d=>d.place===account.place&&d.source?.account===account.key)
  .sort((a,b)=>b.updatedAt-a.updatedAt);
}
export function copiesForAccount(rows,account,getDraft=()=>null){if(!account||account.pending)return [];return rows.filter(c=>c.place===account.place&&(c.source?.account||getDraft(c.draftId)?.source?.account)===account.key);}
export function timeOfDay(date=new Date()){const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',hour:'2-digit',hourCycle:'h23'}).format(date));return hour>=6&&hour<16?'day':hour>=16&&hour<19?'dusk':'night';}
export function createAccountBoard({host,rows,open,onLounge,onRefresh,onLegacy}){
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const btn=(text,fn)=>{const b=el('button',text);b.type='button';b.onclick=fn;return b;};
 let lastVisited=null,returnFocus=null,roomClock=null;
 const spatialLayout=()=>document.body.classList.contains('spatial-atelier');
 const subscribers=new Set();let snapshot={destinations:[],message:'',loading:false,complete:false,lastVisited:null,visitVersion:0};
 const destinations=()=>[...publishingAccounts,{key:'sourcing',place:'shiire',name:'仕入れ',tone:'green'},{key:'reserve',name:'予備の持ち場',pending:true}];
 const underlying=document.getElementById('app');let priorInert=false;
 function isolate(active){if(!underlying)return;if(active&&!underlying.hasAttribute('inert')){priorInert=false;underlying.setAttribute('inert','');}else if(!active&&!priorInert)underlying.removeAttribute('inert');}
 priorInert=!!underlying?.hasAttribute('inert');
 const panel=el('section',undefined,'account-board');panel.setAttribute('aria-label','司令塔の8パネル');
 const sky=el('div',undefined,'account-sky');sky.setAttribute('aria-hidden','true');panel.append(sky);
 const updateTime=()=>{panel.dataset.time=timeOfDay();panel.dataset.paused=String(document.hidden);if(roomClock)roomClock.textContent=({day:'昼の航路',dusk:'夕の航路',night:'夜の航路'})[panel.dataset.time]+' / '+new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit'}).format(new Date());};updateTime();const timer=setInterval(updateTime,60000);timer.unref?.();document.addEventListener('visibilitychange',updateTime);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
 const header=el('header',undefined,'account-board-heading'),titles=el('div');
 titles.append(el('small','THE WANDERING ATELIER'),el('h1','司令塔'),el('p','歯車の向こうに、今日の物語を。'));
 const atmosphere=el('div',undefined,'room-atmosphere');atmosphere.setAttribute('aria-hidden','true');atmosphere.innerHTML='<span class=hearth-glow></span><span class=hearth-reflection></span><span class=brass-reflection></span><span class=window-sky><i class=window-cloud></i><i class=window-stars></i><i class=window-lamps></i></span><span class=room-motes>✧　·　　✦　　·</span>';panel.prepend(atmosphere);
 const threshold=el('div',undefined,'door-threshold');threshold.setAttribute('aria-hidden','true');threshold.innerHTML='<span class=threshold-light></span><span class=threshold-sigil>✦</span>';document.body.append(threshold);let transitionTimer;document.addEventListener('visibilitychange',()=>{threshold.dataset.paused=String(document.hidden);});
 function markVisited(){for(const tile of tiles.children){const selected=tile.dataset.destination===lastVisited;tile.dataset.lastVisited=String(selected);if(selected)tile.setAttribute('aria-label',tile.textContent+'、最後に開いた持ち場');else tile.removeAttribute('aria-label');}}
 function travel(a,id,options){if(a.pending)return;returnFocus={account:a.key,id};lastVisited=a.key;snapshot={...snapshot,lastVisited,visitVersion:snapshot.visitVersion+1};for(const subscriber of subscribers)subscriber(snapshot);const index=[...publishingAccounts.map(a=>a.key),'sourcing','reserve'].indexOf(a.key),angle=(index*45)+'deg',color={rose:'#ef9e87',violet:'#bc9fea',amber:'#ffd27c',green:'#9cd4b1'}[a.tone]||'#e7c88b';panel.dataset.destination=a.key;threshold.dataset.destination=a.key;panel.style.setProperty('--dial-angle',angle);panel.style.setProperty('--selected-light',color);threshold.style.setProperty('--dial-angle',angle);threshold.style.setProperty('--selected-light',color);foyer.querySelector('p').textContent=a.name+'の扉に、灯りをともしました。';markVisited();threshold.dataset.tone=a.tone||'green';threshold.classList.remove('is-travelling');void threshold.offsetWidth;threshold.classList.add('is-travelling');clearTimeout(transitionTimer);transitionTimer=setTimeout(()=>threshold.classList.remove('is-travelling'),550);transitionTimer.unref?.();hide();open(a,id,options);}
 const foyer=el('div',undefined,'room-foyer');foyer.innerHTML='<div class=magic-dial aria-hidden=true><i></i><span>✦</span></div><div><small>あなたの持ち場</small><p>原稿を整える。仕入れを見渡す。</p></div><span class=room-clock>日本時間の空と灯り</span>';
 roomClock=foyer.querySelector('.room-clock');updateTime();
 const actions=el('nav');actions.setAttribute('aria-label','投稿一覧の操作');
 const refresh=btn('↻ 原稿を更新',()=>{if(!refresh.disabled)onRefresh();}),lounge=btn('ラウンジ・管理へ',()=>{hide();onLounge();});const mode=btn('6アカウントの原稿一覧',()=>{tiles.hidden=!tiles.hidden;scroller.hidden=!tiles.hidden;mode.textContent=tiles.hidden?'← 8パネルへ':'6アカウントの原稿一覧';mode.setAttribute('aria-pressed',String(tiles.hidden));panel.dataset.view=tiles.hidden?'list':'tiles';hint.hidden=!tiles.hidden;accountJump.hidden=!tiles.hidden;});mode.className='board-primary';mode.setAttribute('aria-pressed','false');refresh.className='board-refresh';lounge.className='board-lounge';actions.append(mode,refresh,lounge);header.append(titles,actions);
 const status=el('p','本体の保存原稿を確認しています…','account-board-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
 const summary=el('span','','board-summary');const voyage=el('div',undefined,'board-voyage');voyage.append(summary,roomClock);foyer.append(voyage);
 const accountJump=el('nav',undefined,'account-jump');accountJump.setAttribute('aria-label','一覧のアカウントへ移動');accountJump.hidden=true;
 const footer=el('footer',undefined,'board-footer'),hint=el('span','横にスクロールして、ほかのアカウントへ','board-scroll-hint');hint.hidden=true;footer.append(hint);if(onLegacy)footer.append(btn('旧データの保管庫',onLegacy));
 const scroller=el('div',undefined,'account-columns-scroll');scroller.tabIndex=0;scroller.setAttribute('aria-label','アカウント一覧。横にスクロールできます');
 const columns=el('div',undefined,'account-columns');scroller.append(columns);scroller.hidden=true;
 const tiles=el('nav',undefined,'account-tiles');tiles.setAttribute('aria-label','6アカウント・仕入れ・予備');
 panel.append(header,foyer,status,accountJump,tiles,scroller,footer);host.append(panel);isolate(true);
 function render({message,loading=false,complete=false}={}){
  const focused=document.activeElement,focusAccount=focused?.closest?.('[data-account]')?.dataset.account,focusDraft=focused?.dataset?.draftId,focusTile=focused?.dataset?.destination,focusKind=focused?.closest?.('.account-jump')?'jump':focused?.classList?.contains('account-handle')?'profile':focused?.parentElement?.classList?.contains('account-column')?'open':null,tilesTop=tiles.scrollTop;
  const left=scroller.scrollLeft,scrolls=new Map([...columns.children].map(c=>[c.dataset.account,c.querySelector('.account-drafts')?.scrollTop||0]));
  columns.replaceChildren();tiles.replaceChildren();accountJump.replaceChildren();refresh.disabled=loading;
  const allRows=rows(),attention=!loading&&!complete&&/失敗|未確認|できません|エラー|再試行/.test(message||'');panel.dataset.state=loading?'loading':attention?'attention':complete?'ready':'idle';refresh.textContent=loading?'更新しています…':attention?'↻ 再読み込み':'↻ 原稿を更新';
  const total=new Set(publishingAccounts.flatMap(a=>draftsForAccount(allRows,a).map(d=>a.key+':'+d.source.id))).size;summary.textContent=complete?'保存原稿 '+total+'本':'保存原稿の状態を確認';
  const nextDestinations=[];
  for(const [i,a] of destinations().entries()){
   const tile=btn('',()=>travel(a));tile.className='account-tile';tile.dataset.destination=a.key;tile.dataset.tone=a.tone||'sealed';tile.disabled=!!a.pending;
   const frame=el('span',undefined,'portal-frame');frame.setAttribute('aria-hidden','true');frame.innerHTML='<i class=portal-corner></i><i class=portal-hinge></i>';
   const crest=el('span',undefined,'portal-crest');crest.setAttribute('aria-hidden','true');const symbols={insurance:'M12 3 5 6v6c0 4 7 8 7 8s7-4 7-8V6Z M8 11h8 M12 7v8',otoku:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z M12 8v8 M8 12h8',rakuten:'M3 11 12 3l9 8 M6 9v12h12V9 M10 21v-7h4v7',lottery:'m12 2 3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z',sourcing:'M12 3v18 M4 7h16 M5 7l-3 7h6Z M19 7l-3 7h6Z M7 21h10'};crest.innerHTML='<svg viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=1.2 stroke-linejoin=round><path d="'+(symbols[a.key]||'M8 11V7a4 4 0 0 1 8 0v4 M6 11h12v10H6Z M12 15v3')+'"/></svg>';
   tile.append(frame,crest);
   const art=el('img');if(!spatialLayout())art.src='assets/panel-'+(a.artKey||a.key)+'.webp';art.alt='';art.loading='eager';art.onerror=()=>{art.onerror=null;art.src='assets/'+(['red','purple','orange','silver','purple','red','orange','silver'][i])+'-face.webp';};
   const caption=el('span',undefined,'account-tile-caption');caption.append(el('small',String(i+1).padStart(2,'0')+' / '+(a.pending?'封印された扉':({insurance:'手紙の書斎',otoku:'宵色の回廊',rakuten:'陽だまりの食卓',lottery:'星巡りの観測室',sourcing:'商人の工房'})[a.key])),el('strong',a.name),el('span',a.handle|| (a.pending?'名前・用途は未設定':a.key==='sourcing'?'購入・在庫・売却':'投稿先未登録')));
   const count=a.pending?'未設定':a.key==='sourcing'?'管理画面へ':complete?'保存原稿 '+new Set(draftsForAccount(allRows,a).map(d=>d.source.id)).size+'本':loading?'読込中':'原稿を確認';nextDestinations.push({...a,status:count});const meta=el('span',count,'account-tile-state');caption.append(meta);
   const arrow=el('span',a.pending?'—':'↗','account-tile-arrow');arrow.setAttribute('aria-hidden','true');tile.append(art,caption,arrow);tiles.append(tile);
  }
  status.textContent=message||(loading?'保存原稿を読み込んでいます…':complete?'保存原稿を読込済み。追加2枠は未設定です。':'保存原稿はまだ確認できていません。更新して再試行できます。');
  for(const [i,a]of publishingAccounts.entries()){
   const column=el('section',undefined,'account-column');column.dataset.account=a.key;column.dataset.tone=a.tone||'empty';
   const heading=el('header'),number=el('small',String(i+1).padStart(2,'0'),'account-number');heading.append(number,el('h2',a.name));
   const drafts=draftsForAccount(allRows,a);
   const jump=btn(a.name,()=>{scroller.scrollTo?.({left:column.offsetLeft-columns.offsetLeft,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'instant':'smooth'});column.querySelector('button')?.focus({preventScroll:true});});jump.dataset.account=a.key;accountJump.append(jump);
   if(a.pending){heading.append(el('span','追加予定・未設定','account-handle'));column.append(heading,el('div','名前と投稿先が決まったら、この列を使います。','account-placeholder'));}
   else{
    const profile=el(a.handle?'a':'span',a.handle?a.handle+' ↗':'投稿先未登録','account-handle');if(a.handle){profile.href='https://www.threads.com/'+a.handle;profile.target='_blank';profile.rel='noopener noreferrer';}
    const groups=new Map();for(const d of drafts){const k=d.source.id;if(!groups.has(k))groups.set(k,d);}
    heading.append(profile,el('p',groups.size+'本の保存原稿','account-count'));column.append(heading);
    const list=el('div',undefined,'account-drafts');
    if(!groups.size)list.append(el('p',loading?'読み込み中…':complete?'このアカウントの保存原稿はまだありません。':'保存原稿の読取状況を確認してください。','account-placeholder'));
    for(const d of groups.values()){
     const card=btn('',()=>travel(a,d.id));card.className='account-draft';card.dataset.draftId=d.id;
     card.append(el('small',d.checkedAt||'日付未確認'),el('strong',d.title),el('span',d.body.slice(0,110)),el('small',[d.posting?.reply?'本文＋返信':'本文',d.source.imageCount?'画像 '+d.source.imageCount+'枚':'',a.key==='lottery'?d.source.status:''].filter(Boolean).join(' · ')));
     list.append(card);
    }
    column.append(list,btn('このアカウントを開く',()=>travel(a)));
   }
   columns.append(column);
  }
  snapshot={destinations:nextDestinations,message:status.textContent,loading,complete,lastVisited,visitVersion:snapshot.visitVersion};for(const subscriber of subscribers)subscriber(snapshot);
  markVisited();scroller.scrollLeft=left;tiles.scrollTop=tilesTop;for(const column of columns.children){const list=column.querySelector('.account-drafts');if(list)list.scrollTop=scrolls.get(column.dataset.account)||0;}
  if(!panel.hidden){const candidates=[...panel.querySelectorAll('button,a')],column=[...columns.children].find(c=>c.dataset.account===focusAccount);const restore=focusTile?candidates.find(b=>b.dataset.destination===focusTile):focusDraft?candidates.find(b=>b.dataset.draftId===focusDraft&&b.closest('[data-account]')?.dataset.account===focusAccount):focusKind==='jump'?[...accountJump.children].find(b=>b.dataset.account===focusAccount):focusKind==='profile'?column?.querySelector('.account-handle'):focusKind==='open'?[...(column?.children||[])].find(b=>b.tagName==='BUTTON'):null;restore?.focus?.({preventScroll:true});}
 }
 function show(){updateTime();panel.hidden=false;isolate(true);document.getElementById('app')?.classList.add('board-home');
  const column=[...columns.children].find(c=>c.dataset.account===returnFocus?.account);const preferred=!scroller.hidden?(returnFocus?.id?[...columns.querySelectorAll('[data-draft-id]')].find(b=>b.dataset.draftId===returnFocus.id&&b.closest('[data-account]')?.dataset.account===returnFocus.account):[...(column?.children||[])].find(b=>b.tagName==='BUTTON')):[...tiles.children].find(b=>b.dataset.destination===returnFocus?.account);(preferred||mode).focus?.({preventScroll:true});if(!scroller.hidden&&returnFocus?.id&&preferred){const list=preferred.closest('.account-drafts');if(list&&preferred.getBoundingClientRect&&list.getBoundingClientRect)list.scrollTop+=preferred.getBoundingClientRect().top-list.getBoundingClientRect().top;}}
 function hide(){panel.hidden=true;isolate(false);document.getElementById('app')?.classList.remove('board-home');}
 render();return {render,show,hide,element:panel,get state(){return snapshot;},subscribe(fn){subscribers.add(fn);fn(snapshot);return()=>subscribers.delete(fn);},open(key,id,options){const account=destinations().find(a=>a.key===key);if(account&&!account.pending)travel(account,id,options);}};
}
