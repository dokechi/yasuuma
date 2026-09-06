(()=>{
  const byView=(view)=>({active:'未確認',history:'確認済み',accepted:'採用済み',rejected:'却下済み'}[view]||null);
  const stampValue=(x)=>x?.updatedAt||x?.lastSeen||null;

  function relabelTabs(){
    const active=document.querySelector('#viewTabs [data-view="active"]');
    const history=document.querySelector('#viewTabs [data-view="history"]');
    if(active)active.textContent='未確認';
    if(history)history.textContent='確認済み';
  }

  function relabelStatic(){
    relabelTabs();
    if(typeof stateLabels!=='undefined')stateLabels.new='未確認';
    const help=document.getElementById('helpModal');
    if(help){
      help.querySelectorAll('dd').forEach(el=>{
        if(el.textContent.includes('確認待ちを1件ずつ処理'))el.textContent='未確認を1件ずつ処理';
      });
    }
    document.querySelectorAll('.status-bar .status-panel').forEach(el=>{
      if(/^ver\s/i.test(el.textContent.trim()))el.textContent='ver 1.54';
    });
  }

  if(typeof filtered==='function'){
    const originalFiltered=filtered;
    filtered=function(){
      const items=originalFiltered();
      return app.view==='history'?items.filter(x=>(x.reviewState||'new')!=='new'):items;
    };
  }

  async function hydrateAllUnconfirmed(){
    if(typeof app==='undefined'||app.view!=='active')return;
    try{
      const learnedById=new Map((app.items||[]).map(x=>[String(x.id),x]));
      const r=await fetch(API+'?view=history',{cache:'no-store',headers:authHeaders()});
      if(r.status===401){authExpired();return}
      const d=await r.json();
      if(!r.ok||!d?.ok)throw new Error(d?.error||('HTTP '+r.status));
      if(app.view!=='active')return;
      const all=(Array.isArray(d.items)?d.items:[])
        .filter(x=>(x.reviewState||'new')==='new')
        .map(x=>{
          const learned=learnedById.get(String(x.id));
          return learned?{...x,score:learned.score,baseScore:learned.baseScore,feedbackPenalty:learned.feedbackPenalty}:x;
        })
        .sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0)||new Date(b.lastSeen||0)-new Date(a.lastSeen||0));
      app.items=all;
      app.data={...(app.data||{}),generatedAt:d.generatedAt??app.data?.generatedAt,storedCount:d.storedCount??app.data?.storedCount,unconfirmedCount:all.length};
      renderAll();
      setStatus('準備完了｜未確認 '+all.length+'件');
    }catch(e){
      console.warn('all unconfirmed hydrate failed',e);
    }
  }

  if(typeof load==='function'){
    const originalLoad=load;
    load=async function(view=app.view){
      await originalLoad(view);
      if(view==='active'&&app.view==='active')await hydrateAllUnconfirmed();
    };
  }

  if(typeof cardHtml==='function'){
    const originalCardHtml=cardHtml;
    cardHtml=function(x,i){
      let html=originalCardHtml(x,i);
      const updated=stampValue(x);
      const headerStamp='<span class="review-updated" title="司令塔がこの候補を最後に更新・検知した日時">更新 '+esc(fmtUpdated(updated))+'</span>';
      html=html.replace(/(<span class="thread-title">.*?<\/span>)(?=<span class="new">|<span class="state-tag">)/, '$1'+headerStamp);
      const oldRow='<tr><th>最終確認</th><td colspan="3">'+esc(fmtDate(x.lastSeen))+'</td></tr>';
      const newRow='<tr><th>更新・検知</th><td colspan="3"><b>'+esc(fmtDate(updated))+'</b></td></tr>';
      html=html.replace(oldRow,newRow).replace('未処理に戻す','未確認に戻す');
      return html;
    };
  }

  if(typeof renderList==='function'){
    const originalRenderList=renderList;
    renderList=function(){
      originalRenderList();
      const caption=byView(app.view);
      if(caption){
        const el=document.getElementById('listCaption');
        if(el)el.textContent=caption;
      }
    };
  }

  if(typeof renderStats==='function'){
    const originalRenderStats=renderStats;
    renderStats=function(){
      originalRenderStats();
      if(app.view==='active'){
        const el=document.getElementById('kpiLabelCount');
        if(el)el.textContent='未確認';
      }else if(app.view==='history'){
        const el=document.getElementById('kpiLabelCount');
        if(el)el.textContent='確認済み';
      }
    };
  }

  const style=document.createElement('style');
  style.textContent=`
    .review-updated{margin-left:auto;padding:1px 5px;border:1px solid #777;background:#fff;color:#333;font-size:11px;font-weight:400;white-space:nowrap}
    .thread .review-updated + .new{margin-left:2px}
    @media(max-width:700px){.review-updated{width:auto;margin-left:0}}
  `;
  document.head.appendChild(style);

  relabelStatic();
  if(typeof app!=='undefined'&&app.items?.length){
    try{renderList();renderStats()}catch(e){console.warn('review status patch render skipped',e)}
  }

  let initialChecks=0;
  const hydrateInitial=()=>{
    initialChecks++;
    if(typeof app==='undefined'||app.busy){if(initialChecks<80)setTimeout(hydrateInitial,150);return}
    if(app.view==='active')hydrateAllUnconfirmed();
  };
  setTimeout(hydrateInitial,220);
})();