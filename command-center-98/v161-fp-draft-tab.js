(()=>{
  if(typeof API==='undefined'||typeof load!=='function'||typeof authHeaders!=='function')return;

  const TASK_ID='6a9e5826d4888191a4d82a643e6d5adf';
  const CHAT_TASK_ID='6aa9ee1043388191a2eac3bb2702092a';
  const TASK_IDS=new Set([TASK_ID,CHAT_TASK_ID]);
  const tabs=document.getElementById('viewTabs');
  if(!tabs||document.getElementById('fpDraftViewBtn'))return;

  const button=document.createElement('button');
  button.type='button';
  button.id='fpDraftViewBtn';
  button.className='push-button small';
  button.dataset.view='fp';
  button.setAttribute('aria-label','ガルちゃん×FP原稿作成を開く');
  button.innerHTML='<span>FP原稿</span><span class="fp-tab-badge" id="fpDraftTabBadge">…</span>';
  const saved=tabs.querySelector('[data-view="saved"]');
  saved?.insertAdjacentElement('beforebegin',button);

  const taskId=item=>{
    if(typeof signalTaskId==='function')return signalTaskId(item);
    const match=String(item?.id||'').match(/^(?:sns:)*task:([a-zA-Z0-9-]+):/);
    return match?match[1]:'';
  };
  const visibleDraft=item=>{
    if(!TASK_IDS.has(taskId(item)))return false;
    const payload=item?.payload||{};
    if(payload.content_type!=='fp_post_candidate'&&!['fp_psychology','fp_reaction'].includes(payload.category))return false;
    return Array.isArray(payload.draft_slides)&&payload.draft_slides.length>0;
  };
  const completed=item=>{
    if(!visibleDraft(item))return false;
    const payload=item?.payload||{};
    const quality=window.__fpContentPipeline?.packageQuality;
    const legacy=window.__fpContentPipeline?.legacyPublished;
    if(typeof legacy==='function'&&legacy(item))return true;
    if(typeof quality==='function')return quality(item).ready;
    return payload.draft_status==='ready'&&Array.isArray(payload.draft_slides)&&payload.draft_slides.length>=5;
  };
  const fpNewestTime=item=>{
    const values=[item?.lastSeen,item?.occurredAt,item?.detectedAt,item?.createdAt,item?.updatedAt,item?.payload?.occurred_at,item?.payload?.detected_at,item?.payload?.created_at,item?.payload?.updated_at];
    for(const value of values){const time=Date.parse(value);if(Number.isFinite(time))return time}
    return 0;
  };
  const sortNewest=items=>items.sort((a,b)=>fpNewestTime(b)-fpNewestTime(a));
  const setText=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
  const setBadge=count=>setText('fpDraftTabBadge',Number(count||0).toLocaleString('ja-JP'));

  function leaveOtherDesks(){
    window.CCX?.hide?.();
    window.CCReddit?.hide?.();
    const home=window.CCHome;
    if(home)home.active=false;
    document.getElementById('mainWindow')?.classList.remove('home-active');
    document.body.classList.remove('home-mode','x-mode');
    const homePanel=document.getElementById('commandHome');
    if(homePanel)homePanel.hidden=true;
    const homeButton=document.getElementById('homeViewBtn');
    homeButton?.classList.remove('selected');
    homeButton?.setAttribute('aria-pressed','false');
    document.getElementById('sourcingHub')?.setAttribute('hidden','');
    const regular=document.getElementById('regularHub');
    if(regular)regular.hidden=false;
    const domains=document.getElementById('domainTabs');
    if(domains)domains.hidden=true;
  }

  function renderFpStats(data,items){
    const imageHistory=items.filter(item=>['published','ready','complete','partial','revision_pending','needs_regeneration'].includes(String(item.payload?.image_status||''))).length;
    const reviewPending=items.filter(item=>item.payload?.review_status==='needs_current_final_review'||item.payload?.workflow_lane==='needs_current_final_review').length;
    const onHold=items.filter(item=>item.payload?.workflow_lane==='hold'||['medium','weak'].includes(String(item.payload?.demand_evidence?.verdict||''))).length;
    setText('kpiLabelCount','原稿総数');
    setText('kpiCount',items.length+'件');
    setText('kpiLabelS','画像履歴あり');
    setText('kpiS',imageHistory+'件');
    setText('kpiLabelImpact','Astra再確認待ち');
    setText('kpiImpact',reviewPending+'件');
    document.getElementById('kpiImpact')?.classList.remove('has-value');
    setText('kpiLabelStored','需要保留');
    setText('kpiStored',onHold+'件');
    setText('agentCount',(data.agents?.connected??7)+'/'+(data.agents?.total??7));
    setText('generatedAt','更新 '+fmtUpdated(data.generatedAt));
  }

  function renderFpList(data,items){
    app.data=data;
    app.items=items;
    renderList();
    setText('listCaption','ガルちゃん×FP原稿作成');
    setText('visibleCount',items.length+'件');
    const filter=document.getElementById('listFilter');
    if(filter){filter.hidden=false;filter.innerHTML='<span><b>全原稿</b> · 完成／再確認待ち／画像改修／保留</span>'}
    renderFpStats(data,items);
    setBadge(items.length);
  }

  async function fetchFpItems(){
    const response=await fetch(API+'?view=history',{cache:'no-store',headers:authHeaders()});
    if(response.status===401){authExpired();throw new Error('認証の有効期限が切れました')}
    const data=await response.json();
    if(!response.ok||!data?.ok)throw new Error(data?.error||('HTTP '+response.status));
    return {data,items:sortNewest((Array.isArray(data.items)?data.items:[]).filter(visibleDraft))};
  }

  async function loadFp(){
    if(app.busy)return;
    app.busy=true;
    app.view='fp';app.domain='all';app.rank='all';
    leaveOtherDesks();
    setSelected('#viewTabs button[data-view]','view','fp');
    button.setAttribute('aria-pressed','true');
    const refresh=document.getElementById('refreshBtn');
    if(refresh)refresh.disabled=true;
    setStatus('FP原稿を読み込み中...',true);
    showLoading();
    try{
      const {data,items}=await fetchFpItems();
      if(app.view!=='fp')return;
      renderFpList(data,items);
      const ready=items.filter(completed).length;
      setStatus('準備完了｜FP原稿 '+items.length+'件（完成・制作済み '+ready+'件を含む）');
    }catch(error){
      const host=document.getElementById('list');
      if(host)host.innerHTML='<div class="empty"><b>FP原稿を取得できませんでした。</b><br><small>'+esc(error.message||error)+'</small><br><br><button class="push-button" onclick="load(\'fp\')">再試行</button></div>';
      setStatus('通信エラー');
      toast('FP原稿の読み込みに失敗しました','bad');
    }finally{
      app.busy=false;
      if(refresh)refresh.disabled=false;
    }
  }

  const previousLoad=load;
  load=async function(view=app.view){
    button.setAttribute('aria-pressed',view==='fp'?'true':'false');
    if(view==='fp')return loadFp();
    return previousLoad(view);
  };

  async function refreshBadge(){
    try{const {items}=await fetchFpItems();setBadge(items.length)}
    catch(error){setText('fpDraftTabBadge','!');console.warn('FP draft tab count unavailable',error)}
  }

  const style=document.createElement('style');
  style.textContent=`
    #viewTabs>#fpDraftViewBtn{width:92px;min-width:92px;background:#fff3a8;font-weight:700}
    #viewTabs>#fpDraftViewBtn.selected{background:#fff0a0}
    .fp-tab-badge{display:inline-grid;place-items:center;min-width:18px;height:17px;padding:0 4px;background:#fff;border:1px solid #777;font-size:10px;line-height:1}
    @media(max-width:700px){#viewTabs>#fpDraftViewBtn{width:88px;min-width:88px;min-height:36px}}
  `;
  document.head.appendChild(style);

  document.querySelectorAll('.status-bar .status-panel').forEach(el=>{if(/^ver\s/i.test(el.textContent.trim()))el.textContent='ver 1.61'});
  const helpNote=document.querySelector('#helpModal .help-note');
  if(helpNote)helpNote.textContent=helpNote.textContent.replace(/ver\s+[\d.]+/i,'ver 1.61');
  window.__fpDraftTab={taskId:TASK_ID,chatTaskId:CHAT_TASK_ID,visibleDraft,completed,load:loadFp,refreshBadge};
  setTimeout(refreshBadge,500);
})();
