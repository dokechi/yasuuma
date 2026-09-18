(()=>{
  if(typeof renderSourcing!=='function'||typeof sourcingApp!=='object')return;

  const tabs=document.getElementById('sourcingTabs');
  if(!tabs||tabs.dataset.statusFlowV216==='1')return;
  tabs.dataset.statusFlowV216='1';

  const h=s=>typeof esc==='function'?esc(s):String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const bySub=sub=>tabs.querySelector('button[data-sourcing-sub="'+sub+'"]');

  const queue=bySub('queue');
  const success=bySub('success');
  const close=bySub('close');
  const miss=bySub('miss');
  const purchases=bySub('purchases');
  const research=bySub('research');
  const discoveries=bySub('discoveries');
  const suppliers=bySub('suppliers');
  const storeAudit=bySub('store-audit');

  function setButtonLabel(button,label,countId){
    if(!button)return;
    const count=countId?document.getElementById(countId):button.querySelector('.sourcing-tab-count');
    button.replaceChildren(document.createTextNode(label+' '));
    if(count)button.appendChild(count);
  }

  setButtonLabel(queue,'仕入れ候補','sourcingQueueCount');
  setButtonLabel(purchases,'実仕入れ','sourcingPurchaseCount');
  setButtonLabel(miss,'見送り','sourcingMissCount');
  setButtonLabel(discoveries,'店の発見','sourcingDiscoveryCount');
  setButtonLabel(suppliers,'仕入れ先台帳','sourcingSupplierCount');
  if(storeAudit)setButtonLabel(storeAudit,'店舗判定','sourcingStoreAuditCount');

  const hold=document.createElement('button');
  hold.type='button';
  hold.className='push-button small';
  hold.dataset.sourcingSub='hold';
  hold.innerHTML='保留 <span class="sourcing-tab-count" id="sourcingHoldCount">0</span>';

  const legacy=document.createElement('span');
  legacy.className='sourcing-tabs-legacy';
  [success,close,research].filter(Boolean).forEach(x=>legacy.appendChild(x));

  function group(label,kind,buttons){
    const el=document.createElement('div');
    el.className='sourcing-tab-group '+kind;
    const tag=document.createElement('span');
    tag.className='sourcing-tab-group-label';
    tag.textContent=label;
    el.appendChild(tag);
    buttons.filter(Boolean).forEach(x=>el.appendChild(x));
    return el;
  }

  const productGroup=group('商品','product',[queue,hold,purchases,miss]);
  const storeGroup=group('店舗','store',[discoveries,storeAudit,suppliers]);
  tabs.replaceChildren(productGroup,storeGroup,legacy);
  tabs.classList.add('sourcing-tabs-v216');

  const intro=document.querySelector('#sourcingHub .sourcing-intro');
  if(intro)intro.innerHTML='<b>仕入れ専用。</b> 商品は「仕入れ候補 → 保留 / 実仕入れ / 見送り」で管理。<b>実仕入れはGmailの購入履歴を正本</b>として表示します。保留は、値下げ待ち・実売不足・送料確認など、まだ追う案件です。';

  function researchCount(){
    if(typeof sourcingResults==='undefined'||!sourcingResults.loaded||typeof sourcingResearchRecords!=='function')return 0;
    try{return sourcingResearchRecords('research').length}catch{return 0}
  }

  function pendingPurchaseOrders(){
    const rows=Array.isArray(sourcingApp.purchases)?sourcingApp.purchases:[];
    return new Set(rows.filter(x=>x.status==='unknown').map(x=>x.order_id||x.source_message_id||x.id)).size;
  }

  function formatPurchaseCount(){
    const badge=document.getElementById('sourcingPurchaseCount');
    if(!badge)return;
    const confirmed=Number(sourcingApp.purchaseCounts?.orders||0);
    const pending=pendingPurchaseOrders();
    badge.innerHTML='<span class="sourcing-count-main">'+h(confirmed)+'</span>'+(pending?'<span class="sourcing-count-pending" title="Gmailで仕入確定前の注文">未確定'+h(pending)+'</span>':'');
  }

  function syncCounts(){
    const c=sourcingApp.counts||{};
    const queueCount=document.getElementById('sourcingQueueCount');
    const holdCount=document.getElementById('sourcingHoldCount');
    const missCount=document.getElementById('sourcingMissCount');
    const discoveryCount=document.getElementById('sourcingDiscoveryCount');
    const supplierCount=document.getElementById('sourcingSupplierCount');
    if(queueCount)queueCount.textContent=String((sourcingApp.items||[]).filter(x=>typeof isReadySourcing==='function'&&isReadySourcing(x)).length);
    if(holdCount)holdCount.textContent=String(Number(c.close||0)+researchCount());
    if(missCount)missCount.textContent=String(c.miss??0);
    if(discoveryCount)discoveryCount.textContent=(typeof sourcingResults!=='undefined'&&sourcingResults.error)?'!':(typeof sourcingResults!=='undefined'&&sourcingResults.loaded&&typeof sourcingResearchRecords==='function'?String(sourcingResearchRecords('supplier').length):'…');
    if(supplierCount)supplierCount.textContent=String(c.suppliers??(sourcingApp.suppliers||[]).length);
    formatPurchaseCount();
  }

  function syncSelected(){
    document.querySelectorAll('#sourcingTabs button[data-sourcing-sub]').forEach(b=>b.classList.toggle('selected',b.dataset.sourcingSub===sourcingApp.sub));
  }

  function relabelRendered(){
    const host=document.getElementById('sourcingBody');
    if(!host)return;

    host.querySelectorAll('.sourcing-success').forEach(b=>b.remove());
    host.querySelectorAll('.sourcing-close').forEach(b=>b.textContent='保留');
    host.querySelectorAll('.sourcing-miss').forEach(b=>b.textContent='見送り');

    host.querySelectorAll('.sourcing-verdict').forEach(el=>{
      const t=(el.textContent||'').trim();
      if(t.includes('惜しかった'))el.textContent='保留';
      else if(t.includes('見当違い'))el.textContent='見送り';
      else if(t==='未判定')el.textContent='仕入れ候補';
    });

    const caption=host.querySelector('.sourcing-caption b');
    if(caption){
      const t=(caption.textContent||'').trim();
      if(t==='仕入れ判断待ち')caption.textContent='仕入れ候補';
      if(t==='今は見当違い')caption.textContent='見送り';
    }

    if(sourcingApp.sub==='suppliers'){
      host.querySelectorAll('.supplier-table th').forEach(th=>{
        const t=(th.textContent||'').trim();
        if(t==='惜しい')th.textContent='保留';
        if(t==='今違う')th.textContent='見送り';
      });
    }

    if(sourcingApp.sub==='purchases'&&Number(sourcingApp.counts?.success||0)>0&&!host.querySelector('.legacy-success-note')){
      const note=document.createElement('p');
      note.className='purchase-note legacy-success-note';
      note.textContent='旧「仕入れできた」判定 '+Number(sourcingApp.counts.success)+'件は履歴として保持しています。実仕入れ件数には含めず、Gmailで確認できた注文を正本にしています。';
      const first=host.firstElementChild;
      if(first)first.insertAdjacentElement('afterend',note);else host.appendChild(note);
    }
  }

  function holdReasonHtml(x){
    const note=String(x?.verdictNote||'').trim();
    return '<div class="sourcing-hold-reason"><b>保留理由：</b>'+h(note||'旧「惜しかった」判定（理由未登録）')+'</div>';
  }

  function bindHoldCards(host){
    host.querySelectorAll('[data-sourcing-reset]').forEach(btn=>btn.onclick=()=>sourcingReset(btn.dataset.sourcingReset,btn));
    host.querySelectorAll('[data-delete]').forEach(btn=>btn.onclick=()=>hardDelete(btn.dataset.delete,btn));
  }

  function renderHold(){
    const host=document.getElementById('sourcingBody');
    if(!host)return;
    if(typeof sourcingResults!=='undefined'&&!sourcingResults.loaded&&!sourcingResults.pending&&!sourcingResults.error&&typeof loadSourcingResults==='function')void loadSourcingResults();

    const items=(sourcingApp.items||[]).filter(x=>x.sourcingVerdict==='close').sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0)||new Date(b.lastSeen||0)-new Date(a.lastSeen||0));
    const researchN=researchCount();
    let html='<div class="sourcing-caption"><b>保留</b><span>'+(items.length+researchN)+'件</span></div>'+
      '<p class="purchase-note">まだ追う案件です。値下げ待ち・実売不足・送料確認・在庫復活待ち・相場待ちなどをここにまとめます。</p>';

    if(items.length){
      html+='<div class="sourcing-hold-section"><div class="sourcing-hold-section-title">判定済みの保留 <b>'+items.length+'</b></div><div class="sourcing-grid">'+items.map((x,i)=>sourcingCardHtml(x,i)).join('')+'</div></div>';
    }else{
      html+='<div class="sourcing-hold-empty">判定済みの保留はありません。</div>';
    }

    html+='<details class="sourcing-hold-research" '+(!items.length?'open':'')+'><summary>追加調査中 <b>'+researchN+'</b></summary>'+(typeof sourcingResultPanel==='function'?sourcingResultPanel('research'):'<div class="empty">追加調査を読み込めません。</div>')+'</details>';
    host.innerHTML=html;

    items.forEach(x=>{
      const card=host.querySelector('#card-'+cssSafe(x.id));
      const body=card?.querySelector('.sourcing-card-body');
      if(body)body.insertAdjacentHTML('beforeend',holdReasonHtml(x));
    });
    relabelRendered();
    bindHoldCards(host);
    syncCounts();
    syncSelected();
  }

  const baseRender=renderSourcing;
  renderSourcing=function(){
    if(sourcingApp.sub==='hold'){
      renderHold();
      return;
    }
    baseRender();
    syncCounts();
    syncSelected();
    relabelRendered();
  };

  const baseJudge=sourcingJudge;
  sourcingJudge=async function(id,verdict,btn){
    if(verdict!=='close'&&verdict!=='miss')return baseJudge(id,verdict,btn);
    if(!id||app.busy)return;
    let note=null;
    if(verdict==='close'){
      note=window.prompt('保留理由を入力してください。\n例：値下げ待ち / 実売不足 / 送料確認 / 在庫復活待ち / 相場待ち','');
      if(note===null)return;
      note=String(note).trim();
      if(!note){toast('保留理由が必要です','bad');return}
    }
    bump(btn);
    setStatus(verdict==='close'?'保留として記録中...':'見送りとして記録中...',true);
    try{
      const r=await fetch(API,{method:'PATCH',headers:{'Content-Type':'application/json','Authorization':'Bearer '+AUTH},body:JSON.stringify({action:'sourcing_verdict',id,verdict,note})});
      const d=await r.json();
      if(!r.ok||!d?.ok)throw new Error(d?.error||'保存失敗');
      toast(verdict==='close'?'保留として記録しました。':'見送りとして記録しました。','good');
      await load('sourcing');
    }catch(e){
      setStatus('保存エラー');
      toast(verdict==='close'?'保留を保存できませんでした':'見送りを保存できませんでした','bad');
    }
  };

  const style=document.createElement('style');
  style.textContent=`
    .sourcing-tabs-v216{display:flex;align-items:flex-start;gap:8px;padding-top:10px}
    .sourcing-tab-group{position:relative;display:flex;align-items:center;gap:4px;flex-wrap:wrap;padding:5px 6px 4px;border:1px solid #808080;border-right-color:#fff;border-bottom-color:#fff;background:#c0c0c0}
    .sourcing-tab-group-label{position:absolute;left:6px;top:-12px;padding:0 4px;background:#c0c0c0;color:#444;font-size:10px;line-height:12px}
    .sourcing-tab-group.product{flex:0 1 auto}
    .sourcing-tab-group.store{flex:0 1 auto}
    .sourcing-tabs-legacy{display:none!important}
    #sourcingPurchaseCount{display:inline-flex;align-items:center;gap:3px;min-width:0;margin-left:5px;padding:0;background:transparent;border:0;line-height:16px}
    #sourcingPurchaseCount .sourcing-count-main{display:inline-block;min-width:18px;padding:0 4px;background:#fff;border:1px solid #777;text-align:center;font-size:10px}
    #sourcingPurchaseCount .sourcing-count-pending{display:inline-block;padding:0 4px;background:#fff6b5;border:1px solid #9b8e51;color:#6b5100;font-size:9px;font-style:normal;white-space:nowrap}
    .sourcing-hold-section-title{margin:7px 1px 5px;font-family:"MS Gothic",monospace;font-size:12px}
    .sourcing-hold-section-title b,.sourcing-hold-research summary b{display:inline-block;min-width:18px;margin-left:4px;padding:0 4px;background:#fff;border:1px solid #777;text-align:center}
    .sourcing-hold-empty{margin:6px 0;padding:10px;background:#fff;border:1px solid #aaa;color:#666}
    .sourcing-hold-research{margin-top:10px;border:1px solid #808080;background:#d8d8d8}
    .sourcing-hold-research>summary{padding:6px 8px;cursor:pointer;font-weight:700}
    .sourcing-hold-research>[class],.sourcing-hold-research>p{margin-left:8px;margin-right:8px}
    .sourcing-hold-reason{margin-top:8px;padding:6px 8px;background:#fff6b5;border:1px solid #b8a94b;font-size:11px;line-height:1.45}
    .legacy-success-note{padding:6px 8px;background:#f4f4f4;border:1px solid #aaa}
    @media(max-width:760px){.sourcing-tabs-v216{display:block;padding-top:12px}.sourcing-tab-group{margin-bottom:16px}.sourcing-tab-group .push-button{min-height:38px}.sourcing-tab-group.store{margin-bottom:4px}}
  `;
  document.head.appendChild(style);

  syncCounts();
  syncSelected();
  window.CCSourcingStatusFlow={version:'216.1',renderHold,syncCounts};
})();