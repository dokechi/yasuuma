/* Shared navigation and progressive disclosure for HOME destinations.
 * Presentation only: existing data, editors, actions and validation stay in place.
 */
(()=>{
  const H=window.CCHome, root=document.getElementById('mainWindow');
  const body=root?.querySelector('.window-body'), nav=document.querySelector('.home-primary-nav');
  if(!H||!body||!nav||window.CCNavigation)return;
  const by=id=>document.getElementById(id);
  const regularViews=['active','history','accepted','rejected','saved','events'];
  const names={all:'すべての情報',money:'FP・家計',subsidy:'補助金',company:'会社',ai:'AI',deal:'お得',sns:'SNS候補'};
  const statusNames={active:'未確認',history:'確認済み',accepted:'採用',rejected:'却下',saved:'保存済み',events:'タスク結果'};
  const deskNames={x:'カード投稿',fp:'お金投稿',house:'家投稿',listed:'上場',sourcing:'仕入れ',reddit:'海外差'};
  const openItems=new Map();
  let signature='', serial=0;
  const time=item=>[item?.lastSeen,item?.occurredAt,item?.detectedAt,item?.createdAt,item?.updatedAt].find(v=>Number.isFinite(Date.parse(v)));
  const stamp=value=>{const t=Date.parse(value);return Number.isFinite(t)?t:0};
  const context=()=>H.active?'home':[app.view,regularViews.includes(app.view)?app.domain:app.view==='x'?window.CCX?.state.tab:app.view==='reddit'?window.CCReddit?.state.tab:app.view==='sourcing'?sourcingApp.sub:''].join(':');

  body.prepend(nav);
  nav.id='ccPrimaryNav';
  const shell=document.createElement('section');
  shell.id='ccDestination';shell.hidden=true;
  shell.innerHTML='<div class="cc-heading"><button class="push-button" data-home-action="home">← HOME</button><div><h1 id="ccPageTitle" tabindex="-1"></h1><p id="ccPageDescription"></p></div><button class="push-button cc-more-button" data-cc-more aria-expanded="false" aria-controls="ccMore">その他</button><span id="ccRefreshSlot"></span></div>';
  nav.after(shell);
  by('ccRefreshSlot').append(by('refreshBtn'));
  const more=document.createElement('section');more.id='ccMore';more.hidden=true;
  more.setAttribute('aria-label','その他の画面');
  more.innerHTML='<div class="cc-more-head"><b>その他の画面</b><button class="push-button small" data-cc-more>閉じる</button></div><div class="home-launcher-grid">'+by('homeLauncher').querySelector('.home-launcher-grid').innerHTML+
    '<button class="home-launcher-card" data-home-domain="all"><b>すべての情報</b><span>未確認の新着を見る</span></button><button class="home-launcher-card" data-home-domain="money"><b>FP・家計</b><span>家計の情報を見る</span></button><button class="home-launcher-card" data-home-domain="sns"><b>SNS候補</b><span>投稿用の情報を見る</span></button><button class="home-launcher-card" data-cc-view="events"><b>タスク結果</b><span>保存された結果を見る</span></button><button class="home-launcher-card" data-cc-view="saved"><b>保存済み</b><span>保存した情報を見る</span></button></div>';
  shell.after(more);
  nav.querySelector('[data-home-action="more"]').setAttribute('aria-controls','ccMore');
  const toggleMore=()=>{more.hidden=!more.hidden;syncMore();if(!more.hidden)more.querySelector('button')?.focus()};
  function syncMore(){document.querySelectorAll('[data-cc-more],#ccPrimaryNav [data-home-action="more"]').forEach(b=>b.setAttribute('aria-expanded',String(!more.hidden)))}

  function disclosure(nodes,label){
    const existing=nodes.filter(Boolean);if(!existing.length)return;
    const details=document.createElement('details');details.className='cc-guide';
    const summary=document.createElement('summary');summary.textContent=label;details.append(summary);
    existing[0].before(details);existing.forEach(node=>details.append(node));return details;
  }
  const overview=disclosure([body.querySelector('.hero')],'集計を見る');
  if(overview)overview.id='ccOverview';
  disclosure([document.querySelector('.x-intro'),by('xStats')],'この画面の説明・集計');
  disclosure([document.querySelector('.reddit-intro'),by('redditSummary')],'この画面の説明・集計');
  disclosure([document.querySelector('.sourcing-intro'),document.querySelector('.cashflow-purpose')],'仕入れの説明');
  by('viewTabs').querySelector('.label').textContent='状態：';
  by('domainTabs').querySelector('.label').textContent='分野：';
  by('viewTabs').setAttribute('aria-label','情報の状態');
  by('domainTabs').setAttribute('aria-label','情報の分野');
  document.querySelectorAll('#viewTabs button').forEach(button=>{
    if(!regularViews.includes(button.dataset.view)||button.dataset.view==='events')button.classList.add('cc-legacy-route');
  });
  const filters=document.createElement('div');filters.id='ccFilters';
  filters.innerHTML='<label id="ccStateLabel">状態 <select id="ccStateFilter">'+regularViews.filter(v=>v!=='events').map(v=>'<option value="'+v+'">'+statusNames[v]+'</option>').join('')+'</select></label><label>分野 <select id="ccDomainFilter">'+Object.entries(names).map(([key,label])=>'<option value="'+key+'">'+label+'</option>').join('')+'</select></label>';
  body.querySelector('.toolbar').before(filters);
  by('ccStateFilter').addEventListener('change',event=>{by('viewTabs').querySelector('[data-view="'+event.target.value+'"]').click()});
  by('ccDomainFilter').addEventListener('change',event=>{by('domainTabs').querySelector('[data-domain="'+event.target.value+'"]').click()});

  function sync(){
    const home=H.active, view=app.view, generic=regularViews.includes(view);
    root.classList.add('cc-navigation');root.classList.toggle('cc-generic',generic&&!home);
    shell.hidden=home;if(overview)overview.hidden=home||!generic;
    filters.hidden=home||!generic;by('ccStateLabel').hidden=view==='events';
    by('ccStateFilter').value=view;by('ccDomainFilter').value=app.domain;
    by('ccStateFilter').disabled=by('ccDomainFilter').disabled=!!app.busy;
    root.dataset.ccView=home?'home':view;
    const name=deskNames[view]||(view==='events'?'タスク結果':names[app.domain]||'情報');
    by('ccPageTitle').textContent=name;
    by('ccPageDescription').textContent=generic
      ? (view==='events'?(names[app.domain]||'すべての情報')+'の保存結果':statusNames[view]+' · 新しい情報から表示')
      : {x:'新着から候補を選び、原稿を確認できます。',fp:'お金の投稿原稿を、新しいものから確認できます。',house:'家の投稿原稿を、新しいものから確認できます。',listed:'上場企業の投稿原稿を、新しいものから確認できます。',sourcing:'候補・調査・購入履歴を切り替えて確認できます。',reddit:'海外との価格差と投稿候補を確認できます。'}[view]||'';
    document.title=home?'司令塔':name+'｜司令塔';
    if(['fp','house'].includes(view))by('listCaption').textContent='完成原稿';
    const target=home?'home':{x:'x',fp:'fp-draft',house:'house-draft',sourcing:'sourcing-queue'}[view]||'more';
    document.querySelectorAll('#ccPrimaryNav button,.home-mobile-nav button').forEach(button=>{
      const selected=(button.dataset.homeAction||button.dataset.homeShortcut)===target;
      button.classList.toggle('selected',selected);
      if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
    });
    document.querySelectorAll('#viewTabs [data-view],#domainTabs [data-domain],#xTabs [data-x-tab],#redditTabs [data-reddit-tab],#sourcingTabs [data-sourcing-sub]').forEach(button=>button.setAttribute('aria-pressed',String(button.classList.contains('selected'))));
    by('refreshBtn').disabled=!!(app.busy||window.CCX?.state.loading||window.CCReddit?.state.loading||home&&H.loading);
    const next=context();
    if(next!==signature){signature=next;more.hidden=true;syncMore()}
  }

  function focusPage(){
    sync();if(H.active)return;
    window.scrollTo({top:0,behavior:'instant'});by('ccPageTitle').focus({preventScroll:true});
  }
  // Keep existing consumers, but stop jumping below the page identity/navigation.
  scrollToList=function(){focusPage()};

  function wrapCard(article,item,kind){
    if(article.querySelector(':scope > .cc-item'))return;
    if(item?.id)article.dataset.ccItemId=String(item.id);
    const key=kind+':'+String(item?.id||article.id||serial++), scope=context();
    const originalHeader=article.querySelector(':scope > [class$="-head"],:scope > .thread-head');
    const title=item?.payload?.post_title||item?.payload?.draft_title||item?.productName||item?.title||originalHeader?.textContent.trim()||'詳細';
    const excerpt=item?.summary||item?.valueHook||item?.conditions||item?.demandSummary||'';
    const state=kind==='x'?({inbox:'未判定',candidate:'投稿候補',draft:'下書き',approved:'投稿待ち',posted:'投稿済み',rejected:'見送り',expired:'期限切れ'}[item.isExpired?'expired':item.status]||'')
      :kind==='reddit'?(window.CCReddit.statusText[item.status]||'')
      :kind==='sourcing'?({success:'仕入れできた',close:'惜しかった',miss:'今は見当違い'}[item.sourcingVerdict]||'候補')
      :stateLabels[item?.reviewState||'new'];
    const date=kind==='x'?(item.updatedAt||item.detectedAt||item.createdAt):time(item), meta=[date?'更新 '+fmtUpdated(date):'',state];
    if(kind==='x'){meta.push(item.organizer||'');if(item.applicationDeadline)meta.push('締切 '+fmtUpdated(item.applicationDeadline))}
    if(kind==='sourcing'){meta.push(item.supplierName||item.source||'');if(item.impact!=null)meta.push('想定純利益 '+yen(item.impact))}
    const details=document.createElement('details');details.className='cc-item';details.dataset.ccKey=key;
    const summary=document.createElement('summary');summary.className='cc-item-summary';
    const heading=document.createElement('strong');heading.textContent=title;
    const metadata=document.createElement('span');metadata.className='cc-item-meta';metadata.textContent=meta.filter(Boolean).join(' · ');
    const description=document.createElement('span');description.className='cc-item-excerpt';description.textContent=excerpt;
    const cue=document.createElement('span');cue.className='cc-item-cue';cue.textContent='詳細を開く';
    summary.append(heading,metadata,description,cue);details.append(summary);
    summary.setAttribute('role','button');summary.tabIndex=0;
    summary.addEventListener('click',event=>{event.preventDefault();details.open=!details.open});
    summary.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();summary.click()}});
    const content=document.createElement('div');content.className='cc-item-content';
    while(article.firstChild)content.append(article.firstChild);
    details.append(content);article.append(details);
    const close=document.createElement('button');close.type='button';close.className='push-button small cc-item-close';close.textContent='詳細を閉じる';
    close.addEventListener('click',()=>{details.open=false;summary.focus({preventScroll:true});summary.scrollIntoView({block:'nearest'})});content.append(close);
    details.open=openItems.get(scope)===key;
    summary.setAttribute('aria-expanded',String(details.open));
    details.addEventListener('toggle',()=>{
      if(!details.isConnected)return;
      cue.textContent=details.open?'詳細を閉じる':'詳細を開く';
      summary.setAttribute('aria-expanded',String(details.open));
      if(details.open){
        openItems.set(scope,key);
        article.parentElement.querySelectorAll(':scope > article > .cc-item[open]').forEach(other=>{if(other!==details)other.open=false});
      }else if(openItems.get(scope)===key)openItems.delete(scope);
    });
    if(['fp','house'].includes(app.view)&&window.__carouselContentPipeline?.contentCandidate(item)){
      const button=document.createElement('button');button.type='button';button.className='push-button cc-open-draft';button.dataset.fpOpen=item.id;button.textContent='原稿を開く';article.append(button);
    }
  }
  function decorate(){
    if(H.active)return;
    if(regularViews.includes(app.view)||['fp','house'].includes(app.view)){
      if(app.view!=='events')by('list').querySelectorAll(':scope > article.thread').forEach(article=>wrapCard(article,app.items.find(item=>'card-'+cssSafe(item.id)===article.id),'information'));
    }else if(app.view==='x'){
      const rows=window.CCX.active();by('xList').querySelectorAll(':scope > article.x-card').forEach((article,i)=>wrapCard(article,rows[i],'x'));
    }else if(app.view==='reddit'){
      const rows=window.CCReddit.active();by('redditBody').querySelectorAll(':scope > article.reddit-card').forEach((article,i)=>wrapCard(article,rows[i],'reddit'));
    }else if(app.view==='sourcing'){
      by('sourcingBody').querySelectorAll('.sourcing-grid > article.sourcing-card').forEach(article=>wrapCard(article,sourcingApp.items.find(item=>'card-'+cssSafe(item.id)===article.id),'sourcing'));
    }
  }
  function reveal(id){
    decorate();const article=by('card-'+cssSafe(id))||Array.from(document.querySelectorAll('[data-cc-item-id]')).find(node=>node.dataset.ccItemId===String(id)), details=article?.querySelector(':scope > .cc-item');
    if(details){details.open=true;details.querySelector('summary').focus({preventScroll:true});article.scrollIntoView({block:'start',behavior:'instant'})}
  }
  window.CCNavigation={sync,focusPage,reveal,toggleMore};
  const X=window.CCX;
  if(X){
    by('xAdd').onclick=()=>X.openEditor(null);
    const recent=document.createElement('button');recent.type='button';recent.className='push-button small';recent.dataset.xTab='recent';recent.textContent='新着';by('xTabs').prepend(recent);
    const active=X.active;
    X.active=()=>X.state.tab==='recent'
      ?X.state.items.filter(item=>!item.isExpired&&!['posted','rejected','expired'].includes(item.status)).sort((a,b)=>stamp(b.updatedAt||b.detectedAt||b.createdAt)-stamp(a.updatedAt||a.detectedAt||a.createdAt))
      :active();
    X.load=async()=>{
      if(X.state.loading)return;
      X.state.loading=true;X.show();sync();
      by('xList').innerHTML='<div class="x-empty">カード投稿を読み込み中...</div>';
      setStatus('カード投稿を読み込み中...',true);
      try{
        const data=await X.request({headers:authHeaders()});
        X.state.items=data.items||[];X.state.counts=data.counts||{};X.render();
        if(window.CCWorkflow?.ensure){
          try{await window.CCWorkflow.ensure(X.state.items);if(app.view==='x')X.render()}
          catch(error){console.warn('workflow load failed',error);toast('AI工程を読み込めませんでした','bad')}
        }
        setStatus('準備完了');
      }catch(error){
        by('xList').innerHTML='<div class="x-empty"><b>カード投稿を取得できませんでした。</b><p>上の更新ボタンから再試行できます。</p></div>';
        setStatus('通信エラー');
      }finally{X.state.loading=false;sync()}
    };
  }
  const originalLoad=load;
  load=async function(view=app.view){
    if(app.busy||window.CCX?.state.loading||window.CCReddit?.state.loading)return;
    const entering=H.active||H.wasHome||app.view!==view;
    if(entering&&view==='x'&&X)X.state.tab='recent';
    if(H.active)H.leave();
    H.wasHome=false;
    const pending=originalLoad(view);sync();if(entering)focusPage();
    try{return await pending}finally{sync();decorate()}
  };
  const originalRender=renderList;
  renderList=function(){const result=originalRender.apply(this,arguments);decorate();sync();return result};
  const originalSourcing=renderSourcing;
  renderSourcing=function(){const result=originalSourcing.apply(this,arguments);decorate();sync();return result};
  for(const desk of [window.CCX,window.CCReddit]){
    if(!desk)continue;
    const render=desk.render;desk.render=function(){const result=render.apply(this,arguments);
      if(desk===X&&X.state.tab==='recent'&&!X.active().length)by('xList').innerHTML='<div class="x-empty"><b>新着の候補はありません。</b><p>投稿済み・見送り・期限切れは、上の状態から確認できます。</p></div>';
      decorate();sync();return result};
  }
  document.addEventListener('click',event=>{
    const moreButton=event.target.closest('[data-cc-more]');
    if(moreButton){toggleMore();return}
    const view=event.target.closest('button[data-cc-view]');
    if(view){app.domain='all';app.rank='all';setSelected('#domainTabs [data-domain]','domain','all');load(view.dataset.ccView);return}
    if(event.target.closest('#domainTabs')){sync();decorate()}
    if(event.target.closest('#ccMore [data-home-action],#ccMore [data-home-domain],#ccMore [data-home-shortcut]')){more.hidden=true;syncMore()}
    queueMicrotask(sync);
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!more.hidden){more.hidden=true;syncMore();(shell.hidden?nav.querySelector('[data-home-action="more"]'):shell.querySelector('[data-cc-more]')).focus()}});
  // Async workflow decorators update existing bodies; only new list children need wrapping.
  ['list','xList','redditBody','sourcingBody'].forEach(id=>{const host=by(id);if(host)new MutationObserver(()=>{decorate();sync()}).observe(host,{childList:true})});
  document.querySelectorAll('.status-panel').forEach(node=>{if(/^ver\s/i.test(node.textContent))node.textContent='ver 1.67'});
  sync();decorate();
})();
