(()=>{
  const H=window.CCHome;
  const home=document.getElementById('commandHome');
  if(!H||!home||window.CCHomeCleanupV223)return;

  const GAL_TASK_ID='6a9e5826d4888191a4d82a643e6d5adf';
  const HOUSE_TASK_ID='6aa77eb5ce7881919d8dc62554833b60';

  const escHtml=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stamp=v=>{const n=Date.parse(v||'');return Number.isFinite(n)?n:0};
  const itemTime=item=>item?.updatedAt||item?.lastSeen||item?.detectedAt||item?.createdAt||item?.occurredAt||null;
  const newest=items=>[...(items||[])].sort((a,b)=>stamp(itemTime(b))-stamp(itemTime(a)));

  function payload(item){return item?.payload||{}}
  function taskId(item){
    if(typeof signalTaskId==='function')return signalTaskId(item);
    const id=String(item?.id||'');
    if(id.startsWith('task:'+GAL_TASK_ID+':'))return GAL_TASK_ID;
    if(id.startsWith('task:'+HOUSE_TASK_ID+':'))return HOUSE_TASK_ID;
    return '';
  }
  function isPostFlow(item){
    const p=payload(item),tid=taskId(item);
    return tid===GAL_TASK_ID||tid===HOUSE_TASK_ID||
      ['fp_post_candidate','house_post_candidate'].includes(String(p.content_type||''))||
      ['fp_psychology','fp_reaction','house_living'].includes(String(p.category||''));
  }
  function isSalesSync(item){
    const p=payload(item),id=String(item?.id||''),title=String(item?.title||'');
    return p.result_kind==='sales_sync'||/^gmail-sales:|^sns:gmail-sales:/.test(id)||/メルカリ売上同期/.test(title);
  }
  function cleanTitle(value){
    return String(value||'無題')
      .replace(/^\[[^\]]+\]\s*/,'')
      .replace(/^投稿候補[｜:：]\s*/,'')
      .trim();
  }
  function timeLabel(value){
    if(!value)return '時刻不明';
    return typeof fmtUpdated==='function'?fmtUpdated(value):new Date(value).toLocaleString('ja-JP');
  }
  function setText(id,value){
    const el=document.getElementById(id);
    if(el&&el.textContent!==value)el.textContent=value;
  }

  function activeCards(){
    return (H.cardItems||[]).filter(item=>!item.isExpired&&!['posted','rejected','expired'].includes(item.status));
  }
  function sourcingItems(){
    const rows=Array.isArray(H.sourcing?.items)?H.sourcing.items:[];
    return rows.filter(x=>!isSalesSync(x)&&(typeof isReadySourcing==='function'?isReadySourcing(x):(!x.sourcingVerdict&&(x.reviewState||'new')==='new')));
  }
  function otherItems(){
    return newest((H.activeItems||[]).filter(item=>{
      if(isSalesSync(item))return false;
      if(item?.domain==='sourcing')return false;
      if(isPostFlow(item))return false;
      return true;
    }));
  }

  function renderRows(host,items,options={}){
    if(!host)return;
    if(!options.ready){
      if(host.dataset.v223Sig!=='loading'){host.dataset.v223Sig='loading';host.innerHTML='<div class="home-empty-row">読み込み中...</div>'}
      return;
    }
    const rows=items.slice(0,options.limit||3);
    const sig=rows.map(x=>String(x?.id||'')+'|'+String(itemTime(x)||'')).join('||')+'|'+rows.length;
    if(host.dataset.v223Sig===sig)return;
    host.dataset.v223Sig=sig;
    if(!rows.length){host.innerHTML='<div class="home-empty-row">新しい情報はありません。</div>';return}
    host.innerHTML=rows.map(item=>{
      const title=options.title?options.title(item):cleanTitle(item?.title);
      const meta=options.meta?options.meta(item):'';
      const target=options.target?options.target(item):'data-home-item="'+escHtml(item.id)+'"';
      return '<button class="home-feed-row" type="button" '+target+'><time>'+escHtml(timeLabel(itemTime(item)))+'</time><span><b>'+escHtml(title)+'</b>'+(meta?'<small>'+escHtml(meta)+'</small>':'')+'</span></button>';
    }).join('');
  }

  function updateCountsAndFeeds(){
    const cards=activeCards();
    const gal=H.galItems||[];
    const house=H.houseItems||[];
    const sourcing=sourcingItems();

    setText('homeCardsCount',H.loaded.cards?'新着 '+cards.length+'件':'--');
    setText('homeGalCount',H.loaded.active?'新着 '+gal.length+'件':'--');
    setText('homeHouseCount',H.loaded.active?'新着 '+house.length+'件':'--');
    setText('homeSourcingCount',H.loaded.sourcing?'新着 '+sourcing.length+'件':'--');

    renderRows(document.getElementById('homeSourcingList'),newest(sourcing),{
      ready:H.loaded.sourcing,
      title:item=>cleanTitle(item.title||'仕入れ'),
      meta:item=>item.priority?(item.priority+' '+(item.score??'')+'点'):'',
      target:item=>'data-home-sourcing-item="'+escHtml(item.id)+'"',
      limit:3
    });

    renderRows(document.getElementById('homeOtherList'),otherItems(),{
      ready:H.loaded.active,
      title:item=>cleanTitle(item.title),
      meta:item=>item.summary||'',
      target:item=>'data-home-item="'+escHtml(item.id)+'"',
      limit:5
    });
  }

  function simplifyHome(){
    home.querySelectorAll('.home-feed-more').forEach(button=>{
      if(button.textContent!=='開く ›')button.textContent='開く ›';
    });

    home.querySelectorAll('.home-feed-card').forEach(card=>{
      if(card.dataset.v223Bound)return;
      card.dataset.v223Bound='1';
      card.setAttribute('role','group');
      card.tabIndex=0;
      const open=()=>card.querySelector('header button')?.click();
      card.addEventListener('click',event=>{
        if(event.target.closest('button,a,input,select,textarea,label'))return;
        open();
      });
      card.addEventListener('keydown',event=>{
        if(event.target!==card||!['Enter',' '].includes(event.key))return;
        event.preventDefault();open();
      });
    });

    document.querySelectorAll('[data-home-shortcut="cooney"]').forEach(button=>{
      const b=button.querySelector('b'),span=button.querySelector('span');
      if(b)b.textContent='クーニーOS';
      else if(button.textContent.trim()==='92')button.textContent='クーニーOS';
      if(span)span.textContent='クーニーOSを開く';
    });

    document.querySelectorAll('[data-home-action="sourcing-queue"]').forEach(button=>{
      const span=button.querySelector('span');
      if(span)span.textContent='保留を見る';
    });
  }

  function run(){
    if(!H.active)return;
    updateCountsAndFeeds();
    simplifyHome();
  }

  let queued=false;
  function queue(){
    if(queued)return;
    queued=true;
    (window.requestAnimationFrame||window.setTimeout)(()=>{
      queued=false;run();
    });
  }

  const observer=new MutationObserver(mutations=>{
    if(!H.active)return;
    if(mutations.some(m=>m.type==='childList'&&m.addedNodes.length))queue();
  });
  observer.observe(home,{childList:true,subtree:true});

  const oldShow=H.show;
  if(typeof oldShow==='function')H.show=function(){const out=oldShow.apply(this,arguments);queue();return out};

  const style=document.createElement('style');
  style.textContent=`
    .home-main-feeds{align-items:start}
    .home-feed-card{min-height:0;cursor:default}
    .home-feed-card:focus-visible{outline:2px dotted #000080;outline-offset:2px}
    .home-feed-more{min-height:24px;padding:3px 7px}
    .home-feed-card>header{padding:6px 8px}
    .home-feed-row{min-height:38px;padding:5px 8px}
    .home-empty-row{min-height:38px;padding:7px}
  `;
  document.head.appendChild(style);

  window.CCHomeCleanupV223={version:'223.1',run,isSalesSync,isPostFlow};
  queue();
})();