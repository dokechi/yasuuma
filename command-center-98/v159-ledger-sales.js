(()=>{
  const money=v=>'¥'+Number(v||0).toLocaleString('ja-JP');
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const bundleState={month:null,pending:null,components:[],summaries:[]};

  function purchaseGroups(){
    const groups=new Map();
    for(const p of sourcingApp.purchases||[]){
      const key=(p.supplier_key||'')+'|'+(p.order_id||p.source_message_id||p.id);
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(p);
    }
    return [...groups.values()];
  }

  function isDecomposedBundle(p){return p?.metadata?.bundle_decomposed===true&&!!p?.metadata?.bundle_key}
  function isComponentPurchase(p){
    if(isDecomposedBundle(p))return true;
    const text=(String(p?.product_name||'')+' '+String(p?.variant||'')).toUpperCase();
    return (text.includes('HONMA')&&text.includes('福袋'))||text.includes('LUCKY_BAG')||text.includes('まとめ商品');
  }
  function hasBundleRisk(p){return String(p?.sku||'').toUpperCase()==='E2JJ050'}
  function componentsFor(p){return (bundleState.components||[]).filter(x=>Number(x.purchase_id)===Number(p?.id))}
  function globalBundleSummary(key){return (bundleState.summaries||[]).find(x=>x.bundle_key===key)||null}
  function componentLabel(key,name){
    if(key.includes('POLO_WHITE'))return '白ポロ';
    if(key.includes('POLO_NAVY'))return '紺ポロ';
    if(key.includes('_CAP'))return 'キャップ';
    if(key.includes('SOCKS'))return 'ソックス';
    if(key.includes('TOWEL'))return 'タオル';
    return name||key;
  }
  function bundleRowStats(p){
    const cs=componentsFor(p);if(!cs.length)return null;
    const remaining=cs.map(x=>Math.max(0,Number(x.remaining_quantity||0)));
    const complete=Math.min(...remaining);
    return {
      components:cs,
      complete,
      loose:remaining.reduce((a,v)=>a+Math.max(0,v-complete),0),
      sold:cs.reduce((a,x)=>a+Number(x.sold_quantity||0),0),
      amount:cs.reduce((a,x)=>a+Number(x.sold_amount_yen||0),0),
      matched:cs.reduce((a,x)=>a+Number(x.matched_sales||0),0)
    };
  }

  async function loadBundleData(){
    if(typeof sourcingApp==='undefined'||typeof LEDGER_API==='undefined')return;
    const month=String(sourcingApp.purchaseMonth||'');
    if(bundleState.month===month)return;
    if(bundleState.pending)return bundleState.pending;
    bundleState.pending=(async()=>{
      try{
        const r=await fetch(LEDGER_API+'?month='+encodeURIComponent(month),{cache:'no-store',headers:typeof authHeaders==='function'?authHeaders():{}});
        if(r.status===401){if(typeof authExpired==='function')authExpired();return}
        const d=await r.json();if(!r.ok||!d?.ok)throw new Error(d?.error||'bundle ledger');
        bundleState.components=Array.isArray(d.bundleComponents)?d.bundleComponents:[];
        bundleState.summaries=Array.isArray(d.bundleSummaries)?d.bundleSummaries:[];
        bundleState.month=month;
        sourcingApp.bundleComponents=bundleState.components;
        sourcingApp.bundleSummaries=bundleState.summaries;
        if(typeof app!=='undefined'&&app.view==='sourcing'&&sourcingApp.sub==='purchases')renderSourcing();
      }catch(e){console.warn('bundle inventory unavailable',e)}
      finally{bundleState.pending=null}
    })();
    return bundleState.pending;
  }

  function badge(p){
    const br=isDecomposedBundle(p)?bundleRowStats(p):null;
    if(br)return '<span class="ledger-sale-tag bundle">分解済 '+br.sold+'点</span>';
    const sold=Number(p?.sold_quantity||0),status=String(p?.inventory_match_status||'none');
    if(isComponentPurchase(p))return '<span class="ledger-sale-tag component">構成品</span>';
    if(!sold)return '<span class="ledger-sale-tag none">照合0件</span>';
    if(status==='review')return '<span class="ledger-sale-tag high">高確度 '+sold+'点</span>';
    return '<span class="ledger-sale-tag exact">照合済 '+sold+'点</span>';
  }

  function tip(p){
    const br=isDecomposedBundle(p)?bundleRowStats(p):null;
    if(br){
      const detail=br.components.map(x=>componentLabel(x.component_key,x.component_name)+' 残'+Number(x.remaining_quantity||0)+'/'+Number(x.initial_quantity||0)).join(' / ');
      return esc('福袋の仕入原価は親行で保持し、在庫だけ5構成品へ分解。売却は構成品単位で古い仕入れロットからFIFO減算。 '+detail);
    }
    const sold=Number(p?.sold_quantity||0),matched=Number(p?.matched_sales||0),qty=Number(p?.quantity||0);
    const lines=['Gmailのメルカリ購入・支払完了を基準に在庫を減算。','同一商品を複数回仕入れた場合は古い仕入れからFIFOで割当。','仕入 '+qty+'点 / 売却割当 '+sold+'点 / 照合取引 '+matched+'件。','キャンセル成立分は在庫を減らしていません。'];
    if(hasBundleRisk(p))lines.push('2点まとめ等で中身を特定できない取引は未割当のため、実在庫は表示より少ない可能性があります。');
    if(isComponentPurchase(p))lines.push('未分解のセット商品は構成品販売と直接対応できないため要確認です。');
    return esc(lines.join(' '));
  }

  function remainingHtml(p){
    if(isDecomposedBundle(p)){
      const br=bundleRowStats(p);
      if(!br)return '読込中…<span class="ledger-sale-sub muted">構成品を集計中</span>';
      const sub=br.loose?'<span class="ledger-sale-sub bundle-sub">＋ バラ'+br.loose+'点</span>':br.complete===0?'<span class="ledger-sale-sub done">このロットはセット完売</span>':'';
      return br.complete+'セット'+sub+'<span class="ledger-sale-tip">'+tip(p)+'</span>';
    }
    if(isComponentPurchase(p))return '要確認<span class="ledger-sale-sub warn">構成品販売あり</span><span class="ledger-sale-tip">'+tip(p)+'</span>';
    const rem=Math.max(0,Number(p?.remaining_quantity??p?.quantity??0));
    const sold=Number(p?.sold_quantity||0),qty=Number(p?.quantity||0),over=Math.max(0,sold-qty);
    let sub='';
    if(over)sub='<span class="ledger-sale-sub bad">割当超過 '+over+'点</span>';
    else if(hasBundleRisk(p))sub='<span class="ledger-sale-sub warn">まとめ売り未割当あり</span>';
    else if(!sold)sub='<span class="ledger-sale-sub muted">売却一致なし</span>';
    return rem+'点'+sub+'<span class="ledger-sale-tip">'+tip(p)+'</span>';
  }

  function bundlePanel(p){
    const br=bundleRowStats(p);if(!br)return '';
    return '<div class="bundle-components-panel"><div class="bundle-components-title"><b>福袋を構成品へ分解</b><span>この仕入ロット：'+br.complete+'セット組成可'+(br.loose?' ＋ バラ'+br.loose+'点':'')+'</span></div><div class="bundle-component-grid">'+br.components.map(x=>'<div class="bundle-component"><small>'+esc(componentLabel(x.component_key,x.component_name))+'</small><b>残 '+Number(x.remaining_quantity||0)+'</b><span>仕入 '+Number(x.initial_quantity||0)+' / 売却 '+Number(x.sold_quantity||0)+'</span></div>').join('')+'</div><p>※ 原価は福袋の親行にそのまま保持。在庫だけ構成品単位で管理しています。</p></div>';
  }

  function insertGlobalBundleSummary(host){
    if(host.querySelector('.bundle-global-summary'))return;
    const keys=[...new Set((sourcingApp.purchases||[]).filter(isDecomposedBundle).map(p=>p.metadata.bundle_key))];
    if(!keys.length)return;
    const summaries=keys.map(globalBundleSummary).filter(Boolean);if(!summaries.length)return;
    const html=summaries.map(s=>'<div class="bundle-global-summary"><b>HONMA福袋 在庫再計算：</b><span class="bundle-before">'+Number(s.initial_bundle_quantity||0)+'袋</span><span class="bundle-arrow">→</span><strong>'+Number(s.complete_sets_remaining||0)+'セット組成可</strong><span>＋ バラ'+Number(s.loose_component_units||0)+'点</span><small>5構成品の実残数から算出</small></div>').join('');
    const note=host.querySelector('.ledger-sales-note');
    (note||host.querySelector('.ledger-month-tabs')||host.firstElementChild)?.insertAdjacentHTML(note?'afterend':'beforebegin',html);
  }

  function enhanceLedgerSales(){
    if(typeof sourcingApp==='undefined'||sourcingApp.sub!=='purchases')return;
    const host=document.getElementById('sourcingBody');if(!host)return;
    void loadBundleData();
    const groups=purchaseGroups();
    host.querySelectorAll('.purchase-order').forEach((section,sectionIndex)=>{
      const table=section.querySelector('.purchase-table');if(!table||table.dataset.salesEnhanced)return;
      const rows=groups[sectionIndex]||[];
      table.dataset.salesEnhanced='1';table.classList.add('purchase-sales-table');
      const hr=table.querySelector('thead tr');if(hr)hr.insertAdjacentHTML('beforeend','<th class="sale-col">販売確認</th><th class="sale-col">売れた金額</th><th class="sale-col">残数</th>');
      table.querySelectorAll('tbody tr').forEach((tr,rowIndex)=>{
        const p=rows[rowIndex];
        if(!p){tr.insertAdjacentHTML('beforeend','<td class="sale-empty">照合待ち</td><td class="sale-empty">—</td><td class="sale-empty">要確認</td>');return}
        const br=isDecomposedBundle(p)?bundleRowStats(p):null;
        const sold=br?br.sold:Number(p.sold_quantity||0),amount=br?br.amount:Number(p.sold_amount_yen||0),status=String(p.inventory_match_status||'none');
        if(br)tr.classList.add('sale-linked-bundle');
        else if(isComponentPurchase(p))tr.classList.add('sale-linked-component');
        else if(status==='review')tr.classList.add('sale-linked-high');
        else if(sold>0)tr.classList.add('sale-linked-exact');
        else tr.classList.add('sale-linked-none');
        const amountHtml=amount?money(amount):'<span class="ledger-sale-zero">—</span>';
        tr.insertAdjacentHTML('beforeend','<td>'+badge(p)+'</td><td class="num ledger-sale-money">'+amountHtml+'</td><td class="num ledger-sale-rem">'+remainingHtml(p)+'</td>');
      });
      const decomposed=rows.filter(isDecomposedBundle);
      if(decomposed.length&&bundleState.month===String(sourcingApp.purchaseMonth||'')){
        const wrap=section.querySelector('.purchase-table-wrap');
        decomposed.forEach(p=>{const panel=bundlePanel(p);if(panel)wrap?.insertAdjacentHTML('afterend',panel)});
      }
    });
    if(!host.querySelector('.ledger-sales-note')){
      const tabs=host.querySelector('.ledger-month-tabs');
      const note='<div class="ledger-sales-note"><b>残数：</b> メルカリの「購入・支払完了（発送依頼）」で即時減算し、同一商品はFIFOで割当。キャンセル成立分は除外。<span>「照合0件」は売却メールとの一致がまだない行。セット仕入れは構成品まで分解できたものから実残数へ切替えます。</span></div>';
      (tabs||host.firstElementChild)?.insertAdjacentHTML(tabs?'afterend':'beforebegin',note);
    }
    insertGlobalBundleSummary(host);
  }

  const style=document.createElement('style');style.textContent=`
    .ledger-sales-note{margin:0 0 8px;padding:7px 9px;background:#fff;border:2px solid;border-color:#808080 #fff #fff #808080;box-shadow:inset 1px 1px #000;font-size:11px;line-height:1.45}.ledger-sales-note span{color:#725300}
    .purchase-sales-table{min-width:1120px}.purchase-sales-table th.sale-col{background:#d9e8d2;min-width:95px}.purchase-sales-table tr.sale-linked-exact{background:#f1fff1}.purchase-sales-table tr.sale-linked-high{background:#f4f7ff}.purchase-sales-table tr.sale-linked-component{background:#effbff}.purchase-sales-table tr.sale-linked-bundle{background:#ecfff5}.purchase-sales-table tr.sale-linked-none{background:#fff}
    .ledger-sale-tag{display:inline-block;padding:1px 4px;border:1px solid #777;background:#fff;font-weight:700;white-space:nowrap}.ledger-sale-tag.exact{color:#006000}.ledger-sale-tag.high{color:#000080}.ledger-sale-tag.none{color:#666;background:#f4f4f4}.ledger-sale-tag.component{color:#7a5600;background:#fff8cf}.ledger-sale-tag.bundle{color:#005a3a;background:#e6fff1;border-color:#39785d}
    .ledger-sale-money{font-weight:700;color:#005000}.ledger-sale-zero{color:#777;font-weight:400}.ledger-sale-rem{position:relative;font-weight:800;white-space:nowrap}.ledger-sale-sub{display:block;margin-top:2px;font-size:9px;font-weight:400;white-space:nowrap}.ledger-sale-sub.warn{color:#7a5600}.ledger-sale-sub.bad{color:#9b0000;font-weight:700}.ledger-sale-sub.muted{color:#777}.ledger-sale-sub.bundle-sub{color:#005a3a;font-weight:700}.ledger-sale-sub.done{color:#006000}
    .ledger-sale-tip{display:none;position:absolute;right:0;top:100%;z-index:20;width:330px;padding:6px 8px;background:#ffffdf;border:1px solid #000;box-shadow:2px 2px #777;text-align:left;white-space:normal;font-weight:400;line-height:1.45}.ledger-sale-rem:hover .ledger-sale-tip,.ledger-sale-rem:focus-within .ledger-sale-tip{display:block}.sale-empty{color:#777;text-align:center}
    .bundle-global-summary{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 8px;padding:8px 10px;background:#e6fff1;border:2px solid;border-color:#fff #48705d #48705d #fff;box-shadow:inset 1px 1px #bfe9d2;font-size:12px}.bundle-global-summary b{color:#004d32}.bundle-global-summary .bundle-before{text-decoration:line-through;color:#666}.bundle-global-summary .bundle-arrow{font-weight:900}.bundle-global-summary strong{font-size:15px;color:#005a3a}.bundle-global-summary small{margin-left:auto;color:#555}
    .bundle-components-panel{margin:4px 6px 7px;padding:7px;background:#f4fff8;border:1px solid #6a9b82;font-size:11px}.bundle-components-title{display:flex;justify-content:space-between;gap:12px;margin-bottom:6px}.bundle-components-title b{color:#005a3a}.bundle-component-grid{display:grid;grid-template-columns:repeat(5,minmax(82px,1fr));gap:4px}.bundle-component{background:#fff;border:1px solid #aaa;padding:5px}.bundle-component small,.bundle-component span{display:block;color:#666}.bundle-component b{display:block;margin:2px 0;font-size:14px}.bundle-components-panel p{margin:5px 0 0;color:#555}
    @media(max-width:760px){.purchase-sales-table{min-width:1050px}.ledger-sales-note{font-size:12px}.bundle-global-summary small{width:100%;margin-left:0}.bundle-component-grid{grid-template-columns:repeat(2,minmax(110px,1fr))}}
  `;document.head.appendChild(style);

  const previous=renderSourcing;renderSourcing=function(){previous();enhanceLedgerSales()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhanceLedgerSales);else enhanceLedgerSales();
  window.CCLedgerSales={enhance:enhanceLedgerSales,refreshBundles:()=>{bundleState.month=null;return loadBundleData()}};
})();
