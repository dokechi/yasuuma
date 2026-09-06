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
    const help=document.getElementById('helpModal');
    if(help){
      help.querySelectorAll('dd').forEach(el=>{
        if(el.textContent.includes('確認待ちを1件ずつ処理'))el.textContent='未確認を1件ずつ処理';
      });
    }
    document.querySelectorAll('.status-bar .status-panel').forEach(el=>{
      if(/^ver\s/i.test(el.textContent.trim()))el.textContent='ver 1.53';
    });
  }

  if(typeof cardHtml==='function'){
    const originalCardHtml=cardHtml;
    cardHtml=function(x,i){
      let html=originalCardHtml(x,i);
      const updated=stampValue(x);
      const headerStamp='<span class="review-updated" title="この候補が司令塔で最後に更新された日時">更新 '+esc(fmtUpdated(updated))+'</span>';
      html=html.replace(/(<span class="thread-title">.*?<\/span>)(?=<span class="new">|<span class="state-tag">)/, '$1'+headerStamp);
      const oldRow='<tr><th>最終確認</th><td colspan="3">'+esc(fmtDate(x.lastSeen))+'</td></tr>';
      const newRow='<tr><th>更新日時</th><td><b>'+esc(fmtDate(updated))+'</b></td><th>最終検知</th><td>'+esc(fmtDate(x.lastSeen))+'</td></tr>';
      html=html.replace(oldRow,newRow);
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
})();