/* Read-only request progress. Existing authenticated task-event storage; no public task data. */
(function(root,factory){
  const model=factory();
  if(typeof module==='object'&&module.exports)module.exports=model;
  else{root.CCRequestProgressModel=model;mount(root,model)}
  function mount(w,M){
    if(!w.CCHome||typeof API==='undefined'||typeof authHeaders!=='function'||w.CCRequestProgress)return;
    const d=w.document,home=d.getElementById('commandHome'),taskBody=d.querySelector('#taskModal .task-body');
    if(!home||!taskBody)return;
    const P=w.CCRequestProgress={events:[],loaded:false,error:null,loading:false,fetchedAt:null,pending:null};
    const panel=d.createElement('section');panel.className='home-window request-progress';panel.id='requestProgress';panel.setAttribute('aria-labelledby','requestProgressTitle');
    panel.innerHTML='<div class="home-window-title"><span id="requestProgressTitle">依頼の進捗</span><button type="button" class="push-button small" data-request-refresh>↻ 更新</button></div><div class="request-intro">判断待ち・停止を先頭に、同じ状態では収益に直結する仕事を優先。</div><div class="request-sync" role="status" data-request-sync></div><div data-request-list></div><details class="request-help"><summary>更新の仕組み・状態の見方</summary><p>私の作業報告を既存の認証付き台帳へ反映し、この画面は開いている間、1分ごとと戻った時に読み直します。すべての実行サービスから自動通知を受ける接続はまだありません。未連携・確認期限切れ・通信失敗は「状況不明」です。画面の再取得だけで進捗日時は進みません。</p><p>受付／待機／作業中／私の確認待ち／問題で停止／完了。完了は開ける成果物・確認結果と確認日時が記録された仕事だけです。候補の発見と継続調査の完了は別に扱います。日時は日本時間です。</p></details>';
    home.querySelector('.home-workspaces')?.before(panel);
    // Improve the existing monitor dialog instead of adding another management screen.
    const monitor=d.createElement('div');monitor.id='requestMonitorExisting';
    while(taskBody.firstChild)monitor.appendChild(taskBody.firstChild);
    const controls=d.createElement('div');controls.className='request-switch';controls.innerHTML='<button type="button" class="push-button selected" data-request-tab="progress" aria-pressed="true">依頼の進捗</button><button type="button" class="push-button" data-request-tab="monitor" aria-pressed="false">定期監視</button>';
    const modal=d.createElement('section');modal.className='request-progress';modal.id='requestProgressModal';modal.innerHTML='<div class="request-sync" role="status" data-request-sync></div><button class="push-button small" type="button" data-request-refresh>↻ 進捗を更新</button><div data-request-list></div>';
    taskBody.append(controls,modal,monitor);monitor.hidden=true;
    d.getElementById('taskModalTitle').textContent='依頼の進捗・定期監視';
    // Enabled is a schedule setting, never evidence that a worker is running.
    const legend=monitor.querySelector('.task-legend');if(legend)legend.textContent='有効／停止は定期実行の設定です。現在の実行状況を示すものではありません。';
    const stat=monitor.querySelector('#taskEnabled')?.previousElementSibling;if(stat)stat.textContent='設定が有効';
    function chooseTab(kind){monitor.hidden=kind!=='monitor';modal.hidden=kind==='monitor';controls.querySelectorAll('button').forEach(b=>{const active=b.dataset.requestTab===kind;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active))})}
    controls.addEventListener('click',e=>{const b=e.target.closest('[data-request-tab]');if(b)chooseTab(b.dataset.requestTab)});
    // Source-task links continue to open the original monitor detail.
    d.addEventListener('click',e=>{if(e.target.closest('[data-source-task]'))chooseTab('monitor');if(e.target.closest('#menuTasks,[data-home-action="tasks"]'))chooseTab('progress')},true);
    const escape=M.escape;
    const date=value=>M.time(value)===null?'未記録':new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
    function card(x){return '<article class="request-card request-'+x.status+'" data-request-id="'+escape(x.id)+'"><div class="request-heading"><span class="request-state">'+M.labels[x.status]+'</span><span class="request-priority">優先 '+escape(x.priorityLabel)+'</span><h3>'+escape(x.title)+'</h3></div>'+
      '<div class="request-body"><div><p class="request-summary">'+escape(x.summary||'進捗の報告はまだありません。')+'</p><p class="request-next"><b>次にすること</b> '+escape(x.nextAction||'次の作業を確認します。')+'</p>'+(x.reason?'<p class="request-warning">'+escape(x.reason)+'</p>':'')+(x.decision?'<p class="request-decision"><b>判断が必要</b> '+escape(x.decision)+'</p>':'')+'</div><dl class="request-times"><dt>最後に進んだ日時</dt><dd>'+escape(date(x.progressAt))+'</dd><dt>状態を確認した日時</dt><dd>'+escape(date(x.observedAt))+'</dd>'+(x.validUntil?'<dt>実行確認の有効期限</dt><dd>'+escape(date(x.validUntil))+'</dd>':'')+'</dl></div><div class="request-artifacts"><b>成果物・確認結果</b> '+(x.artifacts.length?x.artifacts.map(a=>'<a href="'+escape(a.url)+'" target="_blank" rel="noopener noreferrer">'+escape(a.label||'成果物を開く')+' ↗</a>').join(' '):'<span>まだありません</span>')+(x.status==='completed'?'<span class="request-verified">確認済み '+escape(date(x.verifiedAt))+'</span>':'')+'</div>'+(x.resultText?'<details class="request-result"><summary>成果詳細・原稿を開く</summary><div class="request-result-text">'+escape(x.resultText)+'</div></details>':'')+'</article>'}
    P.render=()=>{
      const rows=M.rows(P.events,{now:Date.now(),sourceError:!!P.error});P.rows=rows;
      const sync=P.error?'状況不明：台帳を取得できません。'+(P.loaded?'前回の記録を参考表示しています。':''):(P.loading?'台帳を読み込み中…':P.loaded?'作業報告連動・1分ごとに再取得｜最終取得 '+date(P.fetchedAt)+' JST':'状況不明：まだ台帳を取得していません。');
      d.querySelectorAll('[data-request-sync]').forEach(el=>{el.textContent=sync;el.classList.toggle('request-warning',!!P.error)});
      d.querySelectorAll('[data-request-refresh]').forEach(b=>b.disabled=P.loading);
      const markup=rows.length?rows.map(card).join(''):'<p class="request-empty">'+(P.error?'状況不明：取得できませんでした。更新ボタンで再試行できます。':P.loaded?'登録された依頼はありません。':'依頼を読み込み中…')+'</p>';
      d.querySelectorAll('[data-request-list]').forEach(el=>{if(el.innerHTML!==markup){const open=new Set([...el.querySelectorAll('.request-result[open]')].map(n=>n.closest('[data-request-id]').dataset.requestId));el.innerHTML=markup;el.querySelectorAll('[data-request-id]').forEach(n=>{if(open.has(n.dataset.requestId))n.querySelector('.request-result')?.setAttribute('open','')})}});
      if(!P.deepLinked&&/^#request-[a-z0-9-]+$/.test(w.location.hash)&&P.loaded){const id=w.location.hash.slice(1),target=panel.querySelector('[data-request-id="'+id+'"]');if(target){target.querySelector('.request-result')?.setAttribute('open','');target.scrollIntoView?.({block:'start'});P.deepLinked=true}}
    };
    P.refresh=()=>{
      if(P.pending)return P.pending;
      P.loading=true;P.render();
      P.pending=(async()=>{
        const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
        try{
          const events=[];let offset=0;
          do{
            const response=await w.fetch(API+'?resource=task-events&taskId='+M.taskId+'&limit=100&offset='+offset,{cache:'no-store',headers:authHeaders(),signal:controller.signal});
            if(response.status===401){P.events=[];P.loaded=false;throw Error('認証期限切れ')}
            const data=await response.json();if(!response.ok||!data?.ok||!Array.isArray(data.events))throw Error('進捗の取得に失敗');
            events.push(...data.events);
            const next=data.nextOffset;if(next!==null&&next!==undefined&&(!Number.isInteger(next)||next<=offset))throw Error('進捗のページ情報が不正');offset=next??null;
            if(events.length>5000)throw Error('進捗が多すぎるため一覧を確認できません');
          }while(offset!==null);
          P.events=events;P.loaded=true;P.error=null;P.fetchedAt=new Date().toISOString();
        }catch(e){P.error=String(e.message||e)}finally{clearTimeout(timer);P.loading=false;P.pending=null;P.render()}
      })();return P.pending;
    };
    d.addEventListener('click',e=>{if(e.target.closest('[data-request-refresh]'))P.refresh()});
    d.addEventListener('visibilitychange',()=>{if(!d.hidden)P.refresh()});
    w.addEventListener('focus',()=>{if(!d.hidden)P.refresh()});
    d.addEventListener('cc:home-render',()=>{if(!P.loaded&&!P.pending)P.refresh()});
    P.timer=w.setInterval(()=>{if(!d.hidden)P.refresh()},60000);
    P.render();P.refresh();
  }
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const taskId='assistant-progress-v1';
  const labels={received:'受付',waiting:'待機',running:'作業中',needs_review:'私の確認待ち',blocked:'問題で停止',completed:'完了',unknown:'状況不明'};
  const ranks={needs_review:0,blocked:1,unknown:2,running:3,received:4,waiting:5,completed:6};
  const priorities={1:'最優先',2:'高',3:'通常',4:'低',5:'最低'};
  const time=value=>typeof value==='string'&&value.trim()&&Number.isFinite(Date.parse(value))?Date.parse(value):null;
  function safeUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}}
  function escape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function normalize(event,{now=Date.now(),sourceError=false}={}){
    const p=event?.payload;
    if(event?.taskId!==taskId||p?.kind!=='request_progress'||p.version!==1||!/^request-[a-z0-9-]+$/.test(p.request_id||''))return null;
    let status=Object.hasOwn(labels,p.status)?p.status:'unknown',reason='';
    const observed=time(p.observed_at),until=time(p.valid_until),progress=time(p.last_progress_at);
    const artifacts=(Array.isArray(p.artifacts)?p.artifacts:[]).map(a=>({url:safeUrl(a?.url),label:String(a?.label||'成果物を開く')})).filter(a=>a.url);
    const verification=p.verification||{},verifiedAt=time(verification.checked_at);
    if(sourceError){status='unknown';reason='更新できないため現在の状態を確認できません。前回記録：'+(labels[p.status]||'状況不明')}
    else if(observed===null||observed>now+300000){status='unknown';reason='状態の確認日時を検証できません。'}
    else if(status==='running'&&(until===null||until<=now||until<=observed||until>observed+4*60*60*1000)){status='unknown';reason='実行確認の期限切れ、または実行確認の記録がありません。'}
    else if(status==='completed'&&(p.recurring===true||!artifacts.length||verifiedAt===null||verifiedAt>now+300000||verification.status!=='passed'||!artifacts.some(a=>a.url===safeUrl(verification.url)))){status='unknown';reason=p.recurring===true?'継続する調査は候補が見つかっただけでは完了にしません。':'成果物リンクと完了確認の記録が不足しています。'}
    if(status==='blocked'&&!reason)reason=String(p.blocker||'停止理由の確認が必要です。');
    if(status==='unknown'&&!reason)reason=String(p.unknown_reason||'実行状況を確認できる記録がありません。');
    const priority=Object.hasOwn(priorities,p.priority)?Number(p.priority):3;
    return {id:p.request_id,title:String(event.title||'依頼名未登録'),summary:String(event.summary||''),status,reportedStatus:p.status,priority,priorityLabel:priorities[priority],nextAction:String(p.next_action||''),decision:String(p.decision_needed||''),observedAt:observed!==null?p.observed_at:null,progressAt:progress!==null&&progress<=now+300000?p.last_progress_at:null,validUntil:status==='running'?p.valid_until:null,artifacts,resultText:String(p.result_text||''),verifiedAt:verifiedAt!==null?verification.checked_at:null,reason};
  }
  function rows(events,options={}){
    const newest=new Map();
    for(const event of Array.isArray(events)?events:[]){const row=normalize(event,options);if(!row)continue;const previous=newest.get(row.id);if(!previous||(time(row.observedAt)??-Infinity)>(time(previous.observedAt)??-Infinity))newest.set(row.id,row)}
    return [...newest.values()].sort((a,b)=>ranks[a.status]-ranks[b.status]||a.priority-b.priority||(time(b.progressAt)??-Infinity)-(time(a.progressAt)??-Infinity)||a.id.localeCompare(b.id));
  }
  return Object.freeze({taskId,labels,time,safeUrl,escape,normalize,rows});
});
