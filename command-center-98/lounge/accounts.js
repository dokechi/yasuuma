// Current publishing identities. Slots are presentation only, never new accounts.
export const publishingAccounts=Object.freeze([
 {key:'insurance',place:'kyun',name:'保険',handle:'@sucker0508',tone:'rose'},
 {key:'otoku',place:'otoku',name:'まだ安く買えるはず',handle:'@thats_a_steal0601',tone:'violet'},
 {key:'rakuten',place:'rakuten',name:'楽天犬',handle:'@bonya0914',tone:'amber'},
 ...[4,5,6].map(n=>({key:'planned-'+n,name:'アカウント '+n,pending:true}))
]);
export function draftsForAccount(rows,account){
 if(!account||account.pending)return [];
 return rows.filter(d=>d.place===account.place&&d.source?.account===account.key)
  .sort((a,b)=>b.updatedAt-a.updatedAt);
}
export function timeOfDay(date=new Date()){const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',hour:'2-digit',hourCycle:'h23'}).format(date));return hour>=6&&hour<16?'day':hour>=16&&hour<19?'dusk':'night';}
export function createAccountBoard({host,rows,open,onLounge,onRefresh}){
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const btn=(text,fn)=>{const b=el('button',text);b.type='button';b.onclick=fn;return b;};
 const panel=el('section',undefined,'account-board');panel.setAttribute('aria-label','司令塔の8パネル');
 const sky=el('div',undefined,'account-sky');sky.setAttribute('aria-hidden','true');panel.append(sky);
 const updateTime=()=>{panel.dataset.time=timeOfDay();panel.dataset.paused=String(document.hidden);};updateTime();const timer=setInterval(updateTime,60000);timer.unref?.();document.addEventListener('visibilitychange',updateTime);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
 const header=el('header',undefined,'account-board-heading'),titles=el('div');
 titles.append(el('small','PUBLISHING DESK'),el('h1','今日は、どこから？'),el('p','6つのアカウントと仕入れ。自分の持ち場へ。'));
 const actions=el('nav');actions.setAttribute('aria-label','投稿一覧の操作');
 const refresh=btn('↻ 原稿を更新',onRefresh),lounge=btn('ラウンジ・管理へ',()=>{hide();onLounge();});const mode=btn('6アカウントの原稿一覧',()=>{tiles.hidden=!tiles.hidden;scroller.hidden=!tiles.hidden;mode.textContent=tiles.hidden?'← 8パネルへ':'6アカウントの原稿一覧';});actions.append(mode,refresh,lounge);header.append(titles,actions);
 const status=el('p','本体の保存原稿を確認しています…','account-board-status');status.setAttribute('role','status');
 const scroller=el('div',undefined,'account-columns-scroll');scroller.tabIndex=0;scroller.setAttribute('aria-label','アカウント一覧。横にスクロールできます');
 const columns=el('div',undefined,'account-columns');scroller.append(columns);scroller.hidden=true;
 const tiles=el('nav',undefined,'account-tiles');tiles.setAttribute('aria-label','6アカウント・仕入れ・予備');
 panel.append(header,status,tiles,scroller);host.append(panel);
 function render({message,loading=false,complete=false}={}){
  const left=scroller.scrollLeft,scrolls=new Map([...columns.children].map(c=>[c.dataset.account,c.querySelector('.account-drafts')?.scrollTop||0]));
  columns.replaceChildren();tiles.replaceChildren();refresh.disabled=loading;
  const destinations=[...publishingAccounts,{key:'sourcing',place:'shiire',name:'仕入れ',tone:'green'},{key:'reserve',name:'予備の持ち場',pending:true}];
  for(const [i,a] of destinations.entries()){
   const tile=btn('',()=>{hide();open(a);});tile.className='account-tile';tile.dataset.destination=a.key;tile.disabled=!!a.pending;
   const art=el('img');art.src='assets/panel-'+a.key+'.webp';art.alt='';art.loading='eager';art.onerror=()=>{art.onerror=null;art.src='assets/'+(['red','purple','orange','silver','purple','red','orange','silver'][i])+'-face.webp';};
   const caption=el('span',undefined,'account-tile-caption');caption.append(el('small',String(i+1).padStart(2,'0')+' / '+(a.pending?'準備中':a.key==='sourcing'?'SOURCING':'THREADS')),el('strong',a.name),el('span',a.handle|| (a.pending?'名前・用途は未設定':'購入・在庫・売却')));
   if(!a.pending&&a.key!=='sourcing')caption.append(el('small',new Set(draftsForAccount(rows(),a).map(d=>d.source.id)).size+'本の保存原稿'));
   tile.append(art,caption);tiles.append(tile);
  }
  status.textContent=message||(complete?'保存原稿を読込済み。追加3枠は未設定です。':'読込済みの原稿を表示しています。');
  for(const [i,a]of publishingAccounts.entries()){
   const column=el('section',undefined,'account-column');column.dataset.account=a.key;column.dataset.tone=a.tone||'empty';
   const heading=el('header'),number=el('small',String(i+1).padStart(2,'0'),'account-number');heading.append(number,el('h2',a.name));
   const drafts=draftsForAccount(rows(),a);
   if(a.pending){heading.append(el('span','追加予定・未設定','account-handle'));column.append(heading,el('div','名前と投稿先が決まったら、この列を使います。','account-placeholder'));}
   else{
    const profile=el('a',a.handle+' ↗','account-handle');profile.href='https://www.threads.com/'+a.handle;profile.target='_blank';profile.rel='noopener noreferrer';
    const groups=new Map();for(const d of drafts){const k=d.source.id;if(!groups.has(k))groups.set(k,d);}
    heading.append(profile,el('p',groups.size+'本の保存原稿','account-count'));column.append(heading);
    const list=el('div',undefined,'account-drafts');
    if(!groups.size)list.append(el('p',loading?'読み込み中…':complete?'このアカウントの保存原稿はまだありません。':'保存原稿の読取状況を確認してください。','account-placeholder'));
    for(const d of groups.values()){
     const card=btn('',()=>{hide();open(a,d.id);});card.className='account-draft';card.dataset.draftId=d.id;
     card.append(el('small',d.checkedAt||'日付未確認'),el('strong',d.title),el('span',d.body.slice(0,110)),el('small',[d.posting?.reply?'本文＋返信':'本文',d.source.imageCount?'画像 '+d.source.imageCount+'枚':''].filter(Boolean).join(' · ')));
     list.append(card);
    }
    column.append(list,btn('このアカウントを開く',()=>{hide();open(a);}));list.scrollTop=scrolls.get(a.key)||0;
   }
   columns.append(column);
  }
  scroller.scrollLeft=left;
 }
 function show(){updateTime();panel.hidden=false;document.getElementById('app')?.classList.add('board-home');}
 function hide(){panel.hidden=true;document.getElementById('app')?.classList.remove('board-home');}
 render();return {render,show,hide,element:panel};
}
