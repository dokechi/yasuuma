(()=>{
  if(typeof API==='undefined'||typeof authHeaders!=='function')return;
  const root=document.getElementById('mainWindow');
  const body=root?.querySelector('.window-body');
  const tabs=document.getElementById('viewTabs');
  if(!root||!body||!tabs||document.getElementById('commandHome'))return;

  const H=window.CCHome={
    active:true,
    loading:false,
    activeItems:[],
    galItems:[],
    houseItems:[],
    activeMeta:null,
    sourcing:null,
    cardItems:[],
    tasks:[],
    taskCounts:null,
    loaded:{active:false,sourcing:false,cards:false,tasks:false},
    errors:{active:false,sourcing:false,cards:false,tasks:false},
    refreshedAt:null
  };

  const destinations={
    home:{label:'HOME',description:'新しい情報を見る',action:'home'},
    cards:{label:'カード投稿',description:'投稿候補を開く',shortcut:'x'},
    gal:{label:'お金投稿',description:'お金の完成原稿を開く',action:'fp-draft'},
    house:{label:'家投稿',description:'家の完成原稿を開く',action:'house-draft'},
    sourcing:{label:'仕入れ',description:'仕入れ候補を開く',action:'sourcing-queue'},
    daily:{label:'作業日報',description:'別タブで日報を開く',shortcut:'daily'},
    more:{label:'その他',description:'すべての入口',action:'more'},
    cooney:{label:'92',description:'別タブで92を開く',shortcut:'cooney'},
    reddit:{label:'海外差',description:'海外情報を見る',shortcut:'reddit'},
    subsidy:{label:'補助金',description:'補助金の情報',domain:'subsidy'},
    company:{label:'会社',description:'会社・業界の情報',domain:'company'},
    ai:{label:'AI',description:'AI実務の情報',domain:'ai'},
    deal:{label:'お得',description:'お得情報',domain:'deal'},
    tasks:{label:'監視',description:'監視タスクを確認',action:'tasks'}
  };
  const destinationButton=(key,className='push-button')=>{
    const item=destinations[key];
    const target=item.action?'data-home-action="'+item.action+'"':item.domain?'data-home-domain="'+item.domain+'"':'data-home-shortcut="'+item.shortcut+'"';
    return '<button class="'+className+'" type="button" '+target+'><b>'+item.label+'</b><span>'+item.description+'</span></button>';
  };

  const html=`
    <section class="command-home" id="commandHome" aria-labelledby="homeTitle">
      <nav class="home-primary-nav" aria-label="主要画面">
        ${['home','cards','gal','house','sourcing','daily','more'].map(key=>destinationButton(key,'home-nav-button'+(key==='home'?' selected':''))).join('')}
      </nav>

      <section class="home-system-alert" id="homeSystemAlert" hidden aria-live="polite">
        <div><b>更新できない情報があります</b><span id="homeSystemAlertText">取得状況を確認してください。</span></div>
        <button class="push-button small" type="button" data-home-action="refresh">再読み込み</button>
      </section>

      <section class="home-window home-feed-window">
        <div class="home-window-title"><span id="homeTitle">新着</span><small id="homeUpdated">実データを集計中...</small></div>
        <div class="home-window-body home-main-feeds">
          <section class="home-feed-card" aria-labelledby="homeCardsTitle">
            <header><button type="button" data-home-shortcut="x" id="homeCardsTitle">カード投稿</button><span id="homeCardsCount">--</span></header>
            <div class="home-feed-list" id="homeCardsList" aria-live="polite"><div class="home-empty-row">読み込み中...</div></div>
            <button class="home-feed-more" type="button" data-home-shortcut="x">カード投稿を開く</button>
          </section>
          <section class="home-feed-card" aria-labelledby="homeGalTitle">
            <header><button type="button" data-home-action="fp-draft" id="homeGalTitle">お金投稿</button><span id="homeGalCount">--</span></header>
            <div class="home-feed-list" id="homeGalList" aria-live="polite"><div class="home-empty-row">読み込み中...</div></div>
            <button class="home-feed-more" type="button" data-home-action="fp-draft">お金原稿を開く</button>
          </section>
          <section class="home-feed-card" aria-labelledby="homeHouseTitle">
            <header><button type="button" data-home-action="house-draft" id="homeHouseTitle">家投稿</button><span id="homeHouseCount">--</span></header>
            <div class="home-feed-list" id="homeHouseList" aria-live="polite"><div class="home-empty-row">読み込み中...</div></div>
            <button class="home-feed-more" type="button" data-home-action="house-draft">家原稿を開く</button>
          </section>
          <section class="home-feed-card" aria-labelledby="homeSourcingTitle">
            <header><button type="button" data-home-action="sourcing-queue" id="homeSourcingTitle">仕入れ</button><span id="homeSourcingCount">--</span></header>
            <div class="home-feed-list" id="homeSourcingList" aria-live="polite"><div class="home-empty-row">読み込み中...</div></div>
            <button class="home-feed-more" type="button" data-home-action="sourcing-queue">仕入れを開く</button>
          </section>
        </div>
      </section>

      <section class="home-window home-other-window">
        <div class="home-window-title"><span>その他の新着</span><small>カード・お金・家・仕入れ以外</small></div>
        <div class="home-other-list" id="homeOtherList" aria-live="polite"><div class="home-empty-row">読み込み中...</div></div>
      </section>

      <section class="home-window home-launcher-window" id="homeLauncher">
        <div class="home-window-title"><span>その他の入口</span><small>目的の画面へ直接移動</small></div>
        <div class="home-launcher-grid">
          ${['cooney','reddit','subsidy','company','ai','deal','tasks'].map(key=>destinationButton(key,'home-launcher-card')).join('')}
        </div>
      </section>
    </section>`;

  body.querySelector('.hero')?.insertAdjacentHTML('beforebegin',html);
  const homeButton=document.createElement('button');
  homeButton.type='button';
  homeButton.className='push-button small selected';
  homeButton.id='homeViewBtn';
  homeButton.textContent='HOME';
  homeButton.setAttribute('aria-pressed','true');
  tabs.querySelector('.label')?.insertAdjacentElement('afterend',homeButton);

  const mobile=document.createElement('nav');
  mobile.className='home-mobile-nav';
  mobile.setAttribute('aria-label','ホームの主要画面');
  mobile.innerHTML='<button class="push-button selected" type="button" data-home-action="home">HOME</button><button class="push-button" type="button" data-home-shortcut="x">カード</button><button class="push-button" type="button" data-home-action="fp-draft">お金</button><button class="push-button" type="button" data-home-action="house-draft">家</button><button class="push-button" type="button" data-home-action="sourcing-queue">仕入れ</button>';
  document.body.appendChild(mobile);

  const setText=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
  const countText=value=>Number.isFinite(Number(value))?Number(value).toLocaleString('ja-JP')+'件':'--';
  const timeValue=value=>{const result=value?new Date(value).getTime():0;return Number.isFinite(result)?result:0};
  const itemTime=item=>item?.updatedAt||item?.lastSeen||item?.detectedAt||item?.createdAt||item?.applicationDeadline||null;
  const newest=(items,getTime=itemTime)=>[...(items||[])].sort((a,b)=>timeValue(getTime(b))-timeValue(getTime(a)));
  // HOME must follow the current content type, not a historical task id.
  // This keeps the feed current even when the generating task is replaced.
  const isGalItem=item=>{
    const payload=item?.payload||{};
    return payload.content_type==='fp_post_candidate';
  };
  const isHouseItem=item=>{
    const payload=item?.payload||{};
    return payload.content_type==='house_post_candidate';
  };
  const isCompletedGal=item=>{
    if(!isGalItem(item))return false;
    const quality=window.__fpContentPipeline?.packageQuality;
    if(typeof quality==='function')return quality(item).ready;
    const payload=item?.payload||{};
    return payload.draft_status==='ready'&&Array.isArray(payload.draft_slides)&&payload.draft_slides.length>=5;
  };
  const isCompletedHouse=item=>{
    if(!isHouseItem(item))return false;
    const quality=window.__carouselContentPipeline?.packageQuality;
    if(typeof quality==='function')return quality(item).ready;
    const payload=item?.payload||{};
    return payload.draft_status==='ready'&&Array.isArray(payload.draft_slides)&&payload.draft_slides.length>=5;
  };
  const galItemTime=item=>{
    const values=[
      item?.lastSeen,item?.occurredAt,item?.detectedAt,item?.createdAt,item?.updatedAt,
      item?.payload?.occurred_at,item?.payload?.detected_at,item?.payload?.created_at,item?.payload?.updated_at
    ].filter(value=>timeValue(value));
    if(!values.length)return null;
    return values.sort((a,b)=>timeValue(b)-timeValue(a))[0];
  };
  const galTitle=item=>item?.payload?.post_title||item?.payload?.draft_title||item?.payload?.draft_cover||item?.title||'投稿原稿';
  const galStatus=item=>{
    const issues=window.__fpContentPipeline?.preflightIssues;
    const p=item?.payload||{};
    if(String(item?.id||'')==='task:6aa9ee1043388191a2eac3bb2702092a:money-chat:6279063:zankure-current-structure-v1'&&p.pre_image_review?.status!=='approved_by_user')return '画像化前チェック待ち';
    if(p.pre_image_review?.required===true &&
      (p.pre_image_review.status!=='approved_by_user'||p.pre_image_review.checked_revision!==p.draft_revision||p.pre_image_review.checked_locked_at!==p.content_lock?.locked_at))return '画像化前チェック待ち';
    if(item?.reviewState==='accepted')return '画像化候補';
    if(typeof issues==='function'&&issues(item?.payload||{}).length===0)return '画像化可能';
    return '制作条件を選ぶ';
  };
  const timeLabel=value=>value?fmtUpdated(value):'時刻不明';
  const renderFeed=(id,items,options={})=>{
    const host=document.getElementById(id);
    if(!host)return;
    if(!options.ready){host.innerHTML='<div class="home-empty-row">読み込み中...</div>';return}
    if(!items.length){host.innerHTML='<div class="home-empty-row">新しい情報はありません。</div>';return}
    host.innerHTML=items.slice(0,options.limit||3).map(item=>{
      const title=options.title?options.title(item):(item.title||'無題');
      const meta=options.meta?options.meta(item):'';
      const target=options.target?options.target(item):'data-home-item="'+esc(item.id)+'"';
      const timestamp=options.time?options.time(item):itemTime(item);
      return '<button class="home-feed-row" type="button" '+target+'><time>'+esc(timeLabel(timestamp))+'</time><span><b>'+esc(title)+'</b>'+(meta?'<small>'+esc(meta)+'</small>':'')+'</span></button>';
    }).join('');
  };
  const updateLabel=()=>{
    const parts=[];
    if(H.errors.active||H.errors.sourcing||H.errors.cards||H.errors.tasks)parts.push('一部取得失敗');
    if(H.refreshedAt)parts.push('更新 '+fmtUpdated(H.refreshedAt));
    setText('homeUpdated',parts.join(' / ')||(H.loading?'実データを集計中...':'更新待ち'));
  };

  function renderActive(){
    const ready=H.loaded.active;
    const items=H.activeItems;
    const otherItems=newest(items.filter(item=>item.domain!=='sourcing'&&!isGalItem(item)&&!isHouseItem(item)));
    renderFeed('homeOtherList',otherItems,{ready,title:item=>'['+(labels[item.domain]||item.domain||'情報')+'] '+(item.title||'無題'),meta:item=>item.summary||'',limit:5});
  }

  function renderGalHome(){
    const ready=H.loaded.active;
    const items=newest(H.galItems,galItemTime);
    setText('homeGalCount',ready?'投稿原稿 '+countText(items.length):'--');
    renderFeed('homeGalList',items,{
      ready,title:galTitle,meta:galStatus,time:galItemTime,
      target:item=>'data-home-fp-item="'+esc(item.id)+'"',limit:3
    });
  }

  function renderHouseHome(){
    const ready=H.loaded.active;
    const items=newest(H.houseItems,galItemTime);
    setText('homeHouseCount',ready?'投稿原稿 '+countText(items.length):'--');
    renderFeed('homeHouseList',items,{
      ready,title:galTitle,meta:galStatus,time:galItemTime,
      target:item=>'data-home-house-item="'+esc(item.id)+'"',limit:3
    });
  }

  function renderCardsHome(){
    const ready=H.loaded.cards;
    const statusLabels={inbox:'未判定',candidate:'投稿候補',draft:'下書き',approved:'投稿待ち'};
    const items=newest(H.cardItems.filter(item=>!item.isExpired&&!['posted','rejected','expired'].includes(item.status)));
    setText('homeCardsCount',ready?'候補 '+countText(items.length):'--');
    renderFeed('homeCardsList',items,{ready,title:item=>item.productName||'カード情報',meta:item=>statusLabels[item.status]||'候補',target:item=> 'data-home-card-item="'+esc(item.id)+'"',limit:3});
  }

  function renderSourcingHome(){
    const data=H.sourcing||{},items=Array.isArray(data.items)?data.items:[];
    const ready=H.loaded.sourcing;
    const queue=ready?newest(items.filter(x=>typeof isReadySourcing==='function'?isReadySourcing(x):(!x.sourcingVerdict&&(x.reviewState||'new')==='new'))):[];
    setText('homeSourcingCount',ready?'候補 '+countText(queue.length):'--');
    renderFeed('homeSourcingList',queue,{ready,title:item=>item.title||'仕入れ候補',meta:item=>item.priority?item.priority+' '+(item.score??'')+'点':'',target:item=> 'data-home-sourcing-item="'+esc(item.id)+'"',limit:3});
  }

  function renderSystemAlert(){
    const failed=[];
    if(H.errors.active)failed.push('情報');
    if(H.errors.cards)failed.push('カード投稿');
    if(H.errors.sourcing)failed.push('仕入れ');
    if(H.errors.tasks)failed.push('監視タスク');
    const alert=document.getElementById('homeSystemAlert');
    alert.hidden=!failed.length;
    setText('homeSystemAlertText',failed.length?failed.join('・')+'を更新できませんでした。':'');
  }

  function renderHome(){renderActive();renderGalHome();renderHouseHome();renderCardsHome();renderSourcingHome();renderSystemAlert();updateLabel()}

  async function readJson(url){
    const response=await fetch(url,{cache:'no-store',headers:authHeaders()});
    if(response.status===401){authExpired();throw new Error('認証期限切れ')}
    const data=await response.json();
    if(!response.ok||!data?.ok)throw new Error(data?.error||('HTTP '+response.status));
    return data;
  }
  async function fetchActive(){
    try{const data=await readJson(API+'?view=history');const items=Array.isArray(data.items)?data.items:[];H.activeMeta=data;H.activeItems=items.filter(x=>(x.reviewState||'new')==='new');H.galItems=items.filter(isCompletedGal);H.houseItems=items.filter(isCompletedHouse);H.loaded.active=true;H.errors.active=false}
    catch(error){H.errors.active=true;console.warn('HOME active summary unavailable',error)}
  }
  async function fetchSourcingHome(){
    try{H.sourcing=await readJson(API+'?resource=sourcing');H.loaded.sourcing=true;H.errors.sourcing=false}
    catch(error){H.errors.sourcing=true;console.warn('HOME sourcing summary unavailable',error)}
  }
  async function fetchCardsHome(){
    try{
      if(!window.CCX?.request)throw new Error('カード投稿機能を読み込めません');
      const data=await window.CCX.request({headers:authHeaders()});
      H.cardItems=Array.isArray(data.items)?data.items:[];H.loaded.cards=true;H.errors.cards=false;
    }catch(error){H.errors.cards=true;console.warn('HOME card summary unavailable',error)}
  }
  async function fetchTasksHome(){
    try{const data=await readJson(API+'?resource=tasks');H.tasks=Array.isArray(data.tasks)?data.tasks:[];H.taskCounts=data.counts||{};H.loaded.tasks=true;H.errors.tasks=false}
    catch(error){H.errors.tasks=true;console.warn('HOME task summary unavailable',error)}
  }
  async function refreshHome(){
    if(H.loading)return;
    H.loading=true;updateLabel();
    await Promise.allSettled([fetchActive(),fetchCardsHome(),fetchSourcingHome(),fetchTasksHome()]);
    H.refreshedAt=new Date();H.loading=false;renderHome();
  }

  function showHome(){
    H.active=true;root.classList.add('home-active');document.body.classList.add('home-mode');document.getElementById('commandHome').hidden=false;
    homeButton.classList.add('selected');homeButton.setAttribute('aria-pressed','true');
    tabs.querySelectorAll('button[data-view]').forEach(button=>button.classList.remove('selected'));
    mobile.querySelectorAll('button').forEach(button=>button.classList.toggle('selected',button.dataset.homeAction==='home'));
    window.scrollTo({top:0,behavior:'instant'});renderHome();window.CCNavigation?.sync();
  }
  function leaveHome(){
    if(H.active)H.wasHome=true;
    H.active=false;root.classList.remove('home-active');document.body.classList.remove('home-mode');document.getElementById('commandHome').hidden=true;
    homeButton.classList.remove('selected');homeButton.setAttribute('aria-pressed','false');
    mobile.querySelectorAll('button').forEach(button=>button.classList.remove('selected'));
    window.CCNavigation?.sync();
  }
  async function openActive(domain='all',rank='all',itemId=null){
    if(app.busy){toast('読み込み完了後に開いてください','bad');return}
    leaveHome();app.domain=domain;app.rank='all';setSelected('#domainTabs button[data-domain]','domain',domain);
    await load('active');
    if(rank==='S'){app.rank='S';renderList()}
    if(itemId&&window.CCNavigation){window.CCNavigation.reveal(itemId)}
    else if(itemId){const item=document.getElementById('card-'+cssSafe(itemId));item?.scrollIntoView({block:'start',behavior:'instant'})}
    else scrollToList();
  }
  async function openFpDraft(itemId=null){
    if(app.busy){toast('読み込み完了後に開いてください','bad');return}
    leaveHome();
    await load('fp');
    if(itemId&&window.CCNavigation){window.CCNavigation.reveal(itemId)}
    else if(itemId){document.getElementById('card-'+cssSafe(itemId))?.scrollIntoView({block:'start',behavior:'instant'})}
    else scrollToList();
  }
  async function openHouseDraft(itemId=null){
    if(app.busy){toast('読み込み完了後に開いてください','bad');return}
    leaveHome();
    await load('house');
    if(itemId&&window.CCNavigation){window.CCNavigation.reveal(itemId)}
    else if(itemId){document.getElementById('card-'+cssSafe(itemId))?.scrollIntoView({block:'start',behavior:'instant'})}
    else scrollToList();
  }
  async function runAction(action){
    if(action==='home'){showHome();return}
    if(action==='refresh'){await refreshHome();return}
    if(action==='more'){if(window.CCNavigation)window.CCNavigation.toggleMore();else document.getElementById('homeLauncher')?.scrollIntoView({block:'start',behavior:'smooth'});return}
    if(action==='fp-draft'){await openFpDraft();return}
    if(action==='house-draft'){await openHouseDraft();return}
    if(action==='tasks'){openTasks();return}
    if(action==='pending'){await openActive();return}
    if(action==='priority'){await openActive('all','S');return}
    if(action==='deadlines'){await openActive();return}
    const sourcing={
      'sourcing-queue':'queue','sourcing-success':'success','sourcing-close':'close','sourcing-suppliers':'suppliers'
    }[action];
    if(sourcing){leaveHome();await openSourcingSection(sourcing)}
  }

  H.show=showHome;H.leave=leaveHome;
  homeButton.addEventListener('click',()=>{bump(homeButton);showHome();if(!H.loading)refreshHome()});
  tabs.addEventListener('click',event=>{
    if(event.target.closest('button[data-view], #xViewBtn, #redditViewBtn'))leaveHome();
  },true);
  document.addEventListener('click',async event=>{
    const cardItem=event.target.closest('[data-home-card-item]');
    if(cardItem){if(app.busy||window.CCX?.state.loading)return;leaveHome();await load('x');window.CCNavigation?.reveal(cardItem.dataset.homeCardItem);return}
    const sourcingItem=event.target.closest('[data-home-sourcing-item]');
    if(sourcingItem){if(app.busy)return;await runAction('sourcing-queue');window.CCNavigation?.reveal(sourcingItem.dataset.homeSourcingItem);return}
    const action=event.target.closest('[data-home-action]');
    if(action){bump(action);runAction(action.dataset.homeAction);return}
    const domain=event.target.closest('[data-home-domain]');
    if(domain){bump(domain);openActive(domain.dataset.homeDomain);return}
    const fpItem=event.target.closest('[data-home-fp-item]');
    if(fpItem){bump(fpItem);openFpDraft(fpItem.dataset.homeFpItem);return}
    const houseItem=event.target.closest('[data-home-house-item]');
    if(houseItem){bump(houseItem);openHouseDraft(houseItem.dataset.homeHouseItem);return}
    const item=event.target.closest('[data-home-item]');
    if(item){bump(item);openActive(H.activeItems.find(row=>String(row.id)===item.dataset.homeItem)?.domain||'all','all',item.dataset.homeItem);return}
    const shortcut=event.target.closest('[data-home-shortcut]');
    if(!shortcut)return;
    bump(shortcut);
    const target={daily:'menuDaily',cooney:'menuCooney',x:'xViewBtn',reddit:'redditViewBtn'}[shortcut.dataset.homeShortcut];
    if(['xViewBtn','redditViewBtn'].includes(target))leaveHome();
    document.getElementById(target)?.click();
  });
  const interceptRefresh=event=>{if(!H.active)return;event.preventDefault();event.stopImmediatePropagation();if(typeof closeMenus==='function')closeMenus();bump(event.currentTarget);refreshHome()};
  document.getElementById('refreshBtn')?.addEventListener('click',interceptRefresh,true);
  document.getElementById('fileRefresh')?.addEventListener('click',interceptRefresh,true);
  document.addEventListener('keydown',event=>{if(H.active&&event.key==='F5'){event.preventDefault();event.stopImmediatePropagation();refreshHome()}},true);

  document.querySelectorAll('.status-bar .status-panel').forEach(el=>{if(/^ver\s/i.test(el.textContent.trim()))el.textContent='ver 1.66'});
  const helpNote=document.querySelector('#helpModal .help-note');
  if(helpNote)helpNote.textContent=helpNote.textContent.replace(/ver\s+[\d.]+/i,'ver 1.66');
  showHome();
  renderHome();
  setTimeout(refreshHome,180);
})();

