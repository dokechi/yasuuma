(()=>{
  if(typeof renderSourcing!=='function'||typeof sourcingApp!=='object'||typeof sourcingFields!=='function')return;

  // Read the newer sourcing payload keys that already exist in current records.
  const previousFields=sourcingFields;
  sourcingFields=function(x){
    const base=previousFields(x)||{};
    const p=x?.payload||{};
    const get=keys=>{
      if(typeof sourcingValue==='function')return sourcingValue(p,keys);
      for(const key of keys){
        const value=p?.[key];
        if(value!==undefined&&value!==null&&value!=='')return value;
      }
      return null;
    };
    const buy=base.buy??get(['buy_price_yen','sourcing_cost_yen','purchase_cost_yen','total_cost_yen','buy_price','purchase_price','item_price_yen']);
    const sell=base.sell??get(['conservative_sale_yen','conservative_sale_price_yen','mercari_conservative_sale_yen','conservative_sale_price','sale_price_yen']);
    const quantity=base.quantity??get(['recommended_units','recommended_qty','recommended_quantity','recommend_qty','推奨数']);
    const roi=base.roi??get(['roi','roi_percent','roi_pct','ROI_percent','ROI']);
    return {...base,buy,sell,quantity,roi,roiIsPercent:base.roiIsPercent||get(['roi_percent','roi_pct','ROI_percent'])!==null};
  };

  function rank(score){return score>=85?'S':score>=70?'A':'B'}
  function normalizeBoosts(){
    for(const x of sourcingApp.items||[]){
      const raw=Number(x?.supplierBoost||0);
      const capped=Number.isFinite(raw)?Math.min(10,Math.max(0,raw)):0;
      x.supplierBoost=capped;
      const base=Number(x?.baseScore);
      if(Number.isFinite(base)){
        x.score=Math.min(100,base+capped);
        x.priority=rank(x.score);
      }
    }
    for(const s of sourcingApp.suppliers||[]){
      const raw=Number(s?.priorityBoost||0);
      if(Number.isFinite(raw))s.priorityBoost=Math.min(10,Math.max(0,raw));
    }
  }

  // The old workflow is retained in storage but removed from the normal sourcing UI.
  if(window.CCSourcingWorkflow){
    window.CCSourcingWorkflow.panel=()=>''; 
    window.CCSourcingWorkflow.bind=()=>{};
    window.CCSourcingWorkflow.currentItems=()=>[];
  }

  function cleanLegacyLabels(host){
    host.querySelectorAll('.sourcing-wf,.wf-panel').forEach(el=>el.remove());
    host.querySelectorAll('.sourcing-success').forEach(el=>el.remove());
    host.querySelectorAll('.sourcing-close').forEach(el=>{el.textContent='保留';el.classList.remove('sourcing-close')});
    host.querySelectorAll('.sourcing-miss').forEach(el=>{el.textContent='見送り'});
    host.querySelectorAll('.sourcing-verdict,.state-tag').forEach(el=>{
      const t=(el.textContent||'').trim();
      if(/惜しかった|仕入れ成功/.test(t))el.textContent=t.includes('惜しかった')?'保留':'旧判定';
      if(/見当違い/.test(t))el.textContent='見送り';
      if(t==='未判定')el.textContent='仕入れ候補';
    });
    host.querySelectorAll('.sourcing-hold-reason').forEach(el=>{
      if((el.textContent||'').includes('旧「惜しかった」判定')){
        el.innerHTML='<b>保留理由：</b>未設定';
      }
    });
    host.querySelectorAll('.boost').forEach(el=>{
      const text=String(el.textContent||'').replace('成功店補正','店舗補正');
      const m=text.match(/\+\s*(\d+)点/);
      if(m&&Number(m[1])>10)el.textContent=text.replace(/\+\s*\d+点/,'+10点');
      else el.textContent=text;
    });
  }

  function collapseReasons(host){
    host.querySelectorAll('.sourcing-reason:not([data-clean-v218])').forEach(reason=>{
      reason.dataset.cleanV218='1';
      const details=document.createElement('details');
      details.className='sourcing-reason-details';
      const summary=document.createElement('summary');
      summary.textContent='なぜ候補？';
      const body=document.createElement('div');
      body.className='sourcing-reason-details-body';
      const clone=reason.cloneNode(true);
      clone.querySelector('b')?.remove();
      if(clone.firstChild?.nodeName==='BR')clone.firstChild.remove();
      body.innerHTML=clone.innerHTML;
      details.append(summary,body);
      reason.replaceWith(details);
    });
  }

  function removeRedundantControls(host){
    host.querySelectorAll('.cc-item-close').forEach(el=>el.remove());
  }

  function polish(){
    if(typeof app!=='undefined'&&app.view!=='sourcing')return;
    const host=document.getElementById('sourcingBody');
    if(!host)return;
    normalizeBoosts();
    cleanLegacyLabels(host);
    collapseReasons(host);
    removeRedundantControls(host);
    try{window.CCSourcingPriceWait?.enhance?.()}catch(_){}
  }

  const baseRender=renderSourcing;
  renderSourcing=function(){
    normalizeBoosts();
    baseRender();
    polish();
  };

  let queued=false;
  function queuePolish(){
    if(queued)return;
    queued=true;
    (window.requestAnimationFrame||window.setTimeout)(()=>{
      queued=false;
      polish();
    });
  }
  const observer=new MutationObserver(mutations=>{
    if(typeof app!=='undefined'&&app.view!=='sourcing')return;
    if(mutations.some(m=>m.type==='childList'&&m.addedNodes.length))queuePolish();
  });
  observer.observe(document.body,{childList:true,subtree:true});

  const style=document.createElement('style');
  style.textContent=`
    #sourcingBody .sourcing-wf,#sourcingBody .wf-panel{display:none!important}
    #sourcingBody .cc-item-close{display:none!important}
    .sourcing-reason-details{margin-top:9px;border:1px solid #888;background:#fff}
    .sourcing-reason-details>summary{cursor:pointer;padding:6px 8px;background:#eee;font-weight:700;font-size:12px}
    .sourcing-reason-details-body{padding:7px 8px;line-height:1.5;font-size:12px}
    .sourcing-reason-details[open]>summary{border-bottom:1px solid #aaa}
    .sourcing-card .boost{color:#005500}
  `;
  document.head.appendChild(style);

  normalizeBoosts();
  window.CCSourcingCardCleanup={version:'218.1',polish,normalizeBoosts};
})();