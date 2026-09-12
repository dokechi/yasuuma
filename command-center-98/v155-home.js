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
    activeMeta:null,
    sourcing:null,
    tasks:[],
    taskCounts:null,
    loaded:{active:false,sourcing:false,tasks:false},
    errors:{active:false,sourcing:false,tasks:false},
    refreshedAt:null
  };

  const html=`
    <section class="command-home" id="commandHome" aria-labelledby="homeTitle">
      <section class="home-window home-decision-window">
        <div class="home-window-title"><span id="homeTitle">今日の判断</span><small id="homeUpdated">実データを集計中...</small></div>
        <div class="home-window-body">
          <div class="home-decision-grid" aria-label="今日確認する件数">
            <button class="home-metric is-urgent" type="button" data-home-action="pending"><span class="home-metric-label">要判断</span><b class="home-metric-value" id="homeDecisionPending">--</b><span class="home-metric-note">未確認の案件</span></button>
            <button class="home-metric is-urgent" type="button" data-home-action="deadlines"><span class="home-metric-label">締切要確認</span><b class="home-metric-value" id="homeDecisionDeadline">--</b><span class="home-metric-note" id="homeDecisionDeadlineNote">期限超過と14日以内</span></button>
            <button class="home-metric" type="button" data-home-action="priority"><span class="home-metric-label">最優先</span><b class="home-metric-value" id="homeDecisionPriority">--</b><span class="home-metric-note">Sランクの未確認</span></button>
            <button class="home-metric is-urgent" type="button" data-home-action="sourcing-queue"><span class="home-metric-label">仕入れ判断</span><b class="home-metric-value" id="homeDecisionSourcing">--</b><span class="home-metric-note">条件確認済み候補</span></button>
          </div>
          <section class="home-priority-box" aria-labelledby="homePriorityTitle">
            <div class="home-priority-head"><b id="homePriorityTitle">先に見る案件</b><span>締切と優先度順</span></div>
            <div class="home-priority-list" id="homePriorityList" aria-live="polite"><div class="home-empty-row">集計中...</div></div>
          </section>
        </div>
      </section>

      <div class="home-panel-grid">
        <section class="home-panel home-panel-sourcing" aria-labelledby="homeSourcingTitle">
          <div class="home-panel-title"><span id="homeSourcingTitle">仕入れ</span><small id="homeSourcingUpdated">確認中...</small></div>
          <div class="home-panel-body" id="homeSourcingBody">
            <button class="home-row is-alert" type="button" data-home-action="sourcing-queue"><span>仕入れ判断</span><b id="homeSourcingQueue">--</b></button>
            <button class="home-row" type="button" data-home-action="sourcing-success"><span>仕入れできた</span><b id="homeSourcingSuccess">--</b></button>
            <button class="home-row" type="button" data-home-action="sourcing-close"><span>惜しかった</span><b id="homeSourcingClose">--</b></button>
            <button class="home-row" type="button" data-home-action="sourcing-suppliers"><span>仕入れ先</span><b id="homeSourcingSuppliers">--</b></button>
            <div class="home-panel-highlight" id="homeSourcingHighlight"><b>直近の重要候補</b><span>読み込み中...</span></div>
            <div class="home-panel-error" id="homeSourcingError" hidden>仕入れデータを取得できません。更新で再試行できます。</div>
          </div>
        </section>

        <section class="home-panel home-panel-information" aria-labelledby="homeInformationTitle">
          <div class="home-panel-title"><span id="homeInformationTitle">情報</span><small>未確認を分野別に集計</small></div>
          <div class="home-panel-body">
            <button class="home-row" type="button" data-home-domain="money"><span>FP・家計</span><b id="homeInfoMoney">--</b></button>
            <button class="home-row" type="button" data-home-domain="subsidy"><span>補助金</span><b id="homeInfoSubsidy">--</b></button>
            <button class="home-row" type="button" data-home-domain="ai"><span>AI実務</span><b id="homeInfoAi">--</b></button>
            <button class="home-row" type="button" data-home-domain="deal"><span>お得</span><b id="homeInfoDeal">--</b></button>
            <div class="home-panel-highlight" id="homeInformationHighlight"><b>最新の未確認</b><span>読み込み中...</span></div>
            <div class="home-panel-error" id="homeInformationError" hidden>情報データを取得できません。更新で再試行できます。</div>
          </div>
        </section>

        <section class="home-panel home-panel-monitoring" aria-labelledby="homeMonitoringTitle">
          <div class="home-panel-title"><span id="homeMonitoringTitle">監視タスク</span><small>ChatGPT通知</small></div>
          <div class="home-panel-body">
            <button class="home-row" type="button" data-home-action="tasks"><span>稼働中</span><b id="homeTaskEnabled">--</b></button>
            <button class="home-row" type="button" data-home-action="tasks"><span>通知ON</span><b id="homeTaskNotify">--</b></button>
            <button class="home-row is-alert" type="button" data-home-action="tasks"><span>結果連携待ち</span><b id="homeTaskWaiting">--</b></button>
            <div class="home-panel-meta" id="homeTaskLastRun">最終実行を確認中...</div>
            <div class="home-panel-error" id="homeTaskError" hidden>監視タスクを取得できません。更新で再試行できます。</div>
          </div>
        </section>

        <section class="home-panel home-panel-shortcuts" aria-labelledby="homeShortcutsTitle">
          <div class="home-panel-title"><span id="homeShortcutsTitle">その他の入口</span><small>既存機能はそのまま開きます</small></div>
          <div class="home-panel-body home-shortcut-body">
            <button class="push-button small" type="button" data-home-shortcut="daily">作業日報</button>
            <button class="push-button small" type="button" data-home-shortcut="cooney">92</button>
            <button class="push-button small" type="button" data-home-shortcut="x">カード投稿</button>
            <button class="push-button small" type="button" data-home-shortcut="reddit">海外差</button>
            <button class="push-button small" type="button" data-home-domain="money">FP</button>
            <button class="push-button small" type="button" data-home-domain="ai">AI</button>
            <span class="home-shortcut-note">粗利・月間目標は確実な実データがないためHOMEには表示していません。</span>
          </div>
        </section>
      </div>
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
  mobile.innerHTML='<button class="push-button selected" type="button" data-home-action="home">HOME</button><button class="push-button" type="button" data-home-action="sourcing-queue">仕入れ</button><button class="push-button" type="button" data-home-action="pending">未確認</button><button class="push-button" type="button" data-home-action="tasks">監視</button>';
  document.body.appendChild(mobile);

  const setText=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
  const countText=value=>Number.isFinite(Number(value))?Number(value).toLocaleString('ja-JP')+'件':'--';
  const maxDate=values=>values.map(v=>new Date(v)).filter(d=>Number.isFinite(d.getTime())).sort((a,b)=>b-a)[0]||null;
  const parseDeadline=value=>{
    if(!value||!/^\d{4}-\d{2}-\d{2}/.test(String(value)))return null;
    const d=new Date(String(value).slice(0,10)+'T23:59:59');
    return Number.isFinite(d.getTime())?d:null;
  };
  const deadlineState=()=>{
    const today=new Date();today.setHours(0,0,0,0);
    const end=new Date(today);end.setDate(end.getDate()+14);end.setHours(23,59,59,999);
    const overdue=[],soon=[];
    for(const item of H.activeItems){const date=parseDeadline(item.deadline);if(!date)continue;if(date<today)overdue.push({item,date});else if(date<=end)soon.push({item,date})}
    overdue.sort((a,b)=>a.date-b.date);soon.sort((a,b)=>a.date-b.date);
    return {overdue,soon,all:[...overdue,...soon]};
  };
  const priorityItems=()=>{
    const due=deadlineState().all.map(x=>x.item),seen=new Set(due.map(x=>String(x.id)));
    const ranked=H.activeItems.filter(x=>!seen.has(String(x.id))&&x.priority==='S').sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0)||new Date(b.lastSeen||0)-new Date(a.lastSeen||0));
    return [...due,...ranked].slice(0,3);
  };
  const updateLabel=()=>{
    const parts=[];
    if(H.errors.active||H.errors.sourcing||H.errors.tasks)parts.push('一部取得失敗');
    if(H.refreshedAt)parts.push('更新 '+fmtUpdated(H.refreshedAt));
    setText('homeUpdated',parts.join(' / ')||(H.loading?'実データを集計中...':'更新待ち'));
  };

  function renderActive(){
    const ready=H.loaded.active;
    const items=H.activeItems;
    const deadlines=deadlineState();
    setText('homeDecisionPending',ready?countText(items.length):'--');
    setText('homeDecisionPriority',ready?countText(items.filter(x=>x.priority==='S').length):'--');
    setText('homeDecisionDeadline',ready?countText(deadlines.all.length):'--');
    setText('homeDecisionDeadlineNote',ready?'超過 '+deadlines.overdue.length+'件 / 14日内 '+deadlines.soon.length+'件':'期限超過と14日以内');
    for(const domain of ['money','subsidy','ai','deal'])setText('homeInfo'+domain[0].toUpperCase()+domain.slice(1),ready?countText(items.filter(x=>x.domain===domain).length):'--');
    const list=document.getElementById('homePriorityList');
    const important=priorityItems();
    if(!ready)list.innerHTML='<div class="home-empty-row">実データを集計中...</div>';
    else if(!important.length)list.innerHTML='<div class="home-empty-row">期限間近またはSランクの未確認はありません。</div>';
    else list.innerHTML=important.map(item=>{
      const date=parseDeadline(item.deadline),today=new Date();today.setHours(0,0,0,0);
      const urgency=date?(date<today?'期限超過 '+String(item.deadline).slice(0,10):'期限 '+String(item.deadline).slice(0,10)):'Sランク '+esc(item.score??'')+'点';
      return '<button class="home-priority-item" type="button" data-home-item="'+esc(item.id)+'"><span class="home-priority-title">['+esc(labels[item.domain]||item.domain||'情報')+'] '+esc(item.title||'無題')+'</span><span class="home-priority-meta">'+esc(urgency)+'</span><span class="home-priority-next">次: '+esc(item.next||item.summary||'詳細を確認')+'</span></button>';
    }).join('');
    const newest=[...items].sort((a,b)=>new Date(b.lastSeen||0)-new Date(a.lastSeen||0))[0];
    document.querySelector('#homeInformationHighlight span').textContent=ready?(newest?.title||'未確認なし'):'読み込み中...';
    document.getElementById('homeInformationError').hidden=!H.errors.active;
  }

  function renderSourcingHome(){
    const data=H.sourcing||{},items=Array.isArray(data.items)?data.items:[],counts=data.counts||{};
    const ready=H.loaded.sourcing;
    const queue=ready?items.filter(x=>typeof isReadySourcing==='function'?isReadySourcing(x):(!x.sourcingVerdict&&(x.reviewState||'new')==='new')).sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0)||new Date(b.lastSeen||0)-new Date(a.lastSeen||0)):[];
    setText('homeDecisionSourcing',ready?countText(queue.length):'--');
    setText('homeSourcingQueue',ready?countText(queue.length):'--');
    setText('homeSourcingSuccess',ready?countText(counts.success??items.filter(x=>x.sourcingVerdict==='success').length):'--');
    setText('homeSourcingClose',ready?countText(counts.close??items.filter(x=>x.sourcingVerdict==='close').length):'--');
    setText('homeSourcingSuppliers',ready?Number(counts.suppliers??data.suppliers?.length??0).toLocaleString('ja-JP')+'店':'--');
    setText('homeSourcingUpdated',ready?'更新 '+fmtUpdated(data.generatedAt||maxDate(items.map(x=>x.lastSeen))):'確認中...');
    document.querySelector('#homeSourcingHighlight span').textContent=ready?(queue[0]?.title||'仕入れ判断待ちなし'):'読み込み中...';
    document.getElementById('homeSourcingError').hidden=!H.errors.sourcing;
  }

  function renderTasksHome(){
    const c=H.taskCounts||{},tasks=H.tasks||[],ready=H.loaded.tasks;
    const total=Number(c.enabled??tasks.filter(x=>x.enabled).length),bridged=Number(c.bridged??tasks.filter(x=>x.enabled&&x.bridge).length),waiting=Math.max(0,total-bridged);
    setText('homeTaskEnabled',ready?countText(total):'--');
    setText('homeTaskNotify',ready?countText(c.notify??tasks.filter(x=>x.notifications).length):'--');
    setText('homeTaskWaiting',ready?countText(waiting):'--');
    const latest=maxDate(tasks.map(x=>x.lastRun));
    setText('homeTaskLastRun',ready?(latest?'最終実行 '+fmtDate(latest):'最終実行の記録なし'):'最終実行を確認中...');
    document.getElementById('homeTaskError').hidden=!H.errors.tasks;
  }

  function renderHome(){renderActive();renderSourcingHome();renderTasksHome();updateLabel()}

  async function readJson(url){
    const response=await fetch(url,{cache:'no-store',headers:authHeaders()});
    if(response.status===401){authExpired();throw new Error('認証期限切れ')}
    const data=await response.json();
    if(!response.ok||!data?.ok)throw new Error(data?.error||('HTTP '+response.status));
    return data;
  }
  async function fetchActive(){
    try{const data=await readJson(API+'?view=history');H.activeMeta=data;H.activeItems=(Array.isArray(data.items)?data.items:[]).filter(x=>(x.reviewState||'new')==='new');H.loaded.active=true;H.errors.active=false}
    catch(error){H.errors.active=true;console.warn('HOME active summary unavailable',error)}
  }
  async function fetchSourcingHome(){
    try{H.sourcing=await readJson(API+'?resource=sourcing');H.loaded.sourcing=true;H.errors.sourcing=false}
    catch(error){H.errors.sourcing=true;console.warn('HOME sourcing summary unavailable',error)}
  }
  async function fetchTasksHome(){
    try{const data=await readJson(API+'?resource=tasks');H.tasks=Array.isArray(data.tasks)?data.tasks:[];H.taskCounts=data.counts||{};H.loaded.tasks=true;H.errors.tasks=false}
    catch(error){H.errors.tasks=true;console.warn('HOME task summary unavailable',error)}
  }
  async function refreshHome(){
    if(H.loading)return;
    H.loading=true;updateLabel();
    await Promise.allSettled([fetchActive(),fetchSourcingHome(),fetchTasksHome()]);
    H.refreshedAt=new Date();H.loading=false;renderHome();
  }

  function showHome(){
    H.active=true;root.classList.add('home-active');document.body.classList.add('home-mode');document.getElementById('commandHome').hidden=false;
    homeButton.classList.add('selected');homeButton.setAttribute('aria-pressed','true');
    tabs.querySelectorAll('button[data-view]').forEach(button=>button.classList.remove('selected'));
    mobile.querySelectorAll('button').forEach(button=>button.classList.toggle('selected',button.dataset.homeAction==='home'));
    window.scrollTo({top:0,behavior:'instant'});renderHome();
  }
  function leaveHome(){
    H.active=false;root.classList.remove('home-active');document.body.classList.remove('home-mode');document.getElementById('commandHome').hidden=true;
    homeButton.classList.remove('selected');homeButton.setAttribute('aria-pressed','false');
    mobile.querySelectorAll('button').forEach(button=>button.classList.remove('selected'));
  }
  async function openActive(domain='all',rank='all',itemId=null){
    if(app.busy){toast('読み込み完了後に開いてください','bad');return}
    leaveHome();app.domain=domain;app.rank='all';setSelected('#domainTabs button[data-domain]','domain',domain);
    await load('active');
    if(rank==='S'){app.rank='S';renderList()}
    if(itemId){const item=document.getElementById('card-'+cssSafe(itemId));item?.scrollIntoView({block:'start',behavior:'instant'})}
    else scrollToList();
  }
  async function runAction(action){
    if(action==='home'){showHome();return}
    if(action==='tasks'){openTasks();return}
    if(action==='pending'){await openActive();return}
    if(action==='priority'){await openActive('all','S');return}
    if(action==='deadlines'){
      const first=deadlineState().all[0]?.item;
      await openActive('all','all',first?.id||null);return;
    }
    const sourcing={
      'sourcing-queue':'queue','sourcing-success':'success','sourcing-close':'close','sourcing-suppliers':'suppliers'
    }[action];
    if(sourcing){leaveHome();await openSourcingSection(sourcing)}
  }

  homeButton.addEventListener('click',()=>{bump(homeButton);showHome();if(!H.loading)refreshHome()});
  tabs.addEventListener('click',event=>{
    if(event.target.closest('button[data-view], #xViewBtn, #redditViewBtn'))leaveHome();
  },true);
  document.addEventListener('click',event=>{
    const action=event.target.closest('[data-home-action]');
    if(action){bump(action);runAction(action.dataset.homeAction);return}
    const domain=event.target.closest('[data-home-domain]');
    if(domain){bump(domain);openActive(domain.dataset.homeDomain);return}
    const item=event.target.closest('[data-home-item]');
    if(item){bump(item);openActive('all','all',item.dataset.homeItem);return}
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

  document.querySelectorAll('.status-bar .status-panel').forEach(el=>{if(/^ver\s/i.test(el.textContent.trim()))el.textContent='ver 1.61'});
  const helpNote=document.querySelector('#helpModal .help-note');
  if(helpNote)helpNote.textContent=helpNote.textContent.replace(/ver\s+[\d.]+/i,'ver 1.61');
  showHome();
  renderHome();
  setTimeout(refreshHome,180);
})();
