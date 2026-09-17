(()=>{
  const money=v=>'¥'+Number(v||0).toLocaleString('ja-JP');
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  function purchaseGroups(){
    const groups=new Map();
    for(const p of sourcingApp.purchases||[]){
      const key=(p.supplier_key||'')+'|'+(p.order_id||p.source_message_id||p.id);
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(p);
    }
    return [...groups.values()];
  }

  function isComponentPurchase(p){
    const text=(String(p?.product_name||'')+' '+String(p?.variant||'')).toUpperCase();
    return (text.includes('HONMA')&&text.includes('福袋'))||text.includes('LUCKY_BAG')||text.includes('まとめ商品');
  }

  function hasBundleRisk(p){
    return String(p?.sku||'').toUpperCase()==='E2JJ050';
  }

  function badge(p){
    const sold=Number(p?.sold_quantity||0);
    const status=String(p?.inventory_match_status||'none');
    if(isComponentPurchase(p))return '<span class="ledger-sale-tag component">構成品</span>';
    if(!sold)return '<span class="ledger-sale-tag none">照合0件</span>';
    if(status==='review')return '<span class="ledger-sale-tag high">高確度 '+sold+'点</span>';
    return '<span class="ledger-sale-tag exact">照合済 '+sold+'点</span>';
  }

  function tip(p){
    const sold=Number(p?.sold_quantity||0),matched=Number(p?.matched_sales||0),qty=Number(p?.quantity||0);
    const lines=[
      'Gmailのメルカリ購入・支払完了を基準に在庫を減算。',
      '同一商品を複数回仕入れた場合は古い仕入れからFIFOで割当。',
      '仕入 '+qty+'点 / 売却割当 '+sold+'点 / 照合取引 '+matched+'件。',
      'キャンセル成立分は在庫を減らしていません。'
    ];
    if(hasBundleRisk(p))lines.push('2点まとめ等で中身を特定できない取引は未割当のため、実在庫は表示より少ない可能性があります。');
    if(isComponentPurchase(p))lines.push('福袋・まとめ仕入れは構成品単位の販売と直接対応できないため残数を確定していません。');
    return esc(lines.join(' '));
  }

  function remainingHtml(p){
    if(isComponentPurchase(p))return '要確認<span class="ledger-sale-sub warn">構成品販売あり</span><span class="ledger-sale-tip">'+tip(p)+'</span>';
    const rem=Math.max(0,Number(p?.remaining_quantity??p?.quantity??0));
    const sold=Number(p?.sold_quantity||0),qty=Number(p?.quantity||0);
    const over=Math.max(0,sold-qty);
    let sub='';
    if(over)sub='<span class="ledger-sale-sub bad">割当超過 '+over+'点</span>';
    else if(hasBundleRisk(p))sub='<span class="ledger-sale-sub warn">まとめ売り未割当あり</span>';
    else if(!sold)sub='<span class="ledger-sale-sub muted">売却一致なし</span>';
    return rem+'点'+sub+'<span class="ledger-sale-tip">'+tip(p)+'</span>';
  }

  function enhanceLedgerSales(){
    if(typeof sourcingApp==='undefined'||sourcingApp.sub!=='purchases')return;
    const host=document.getElementById('sourcingBody');
    if(!host)return;
    const groups=purchaseGroups();
    host.querySelectorAll('.purchase-order').forEach((section,sectionIndex)=>{
      const table=section.querySelector('.purchase-table');
      if(!table||table.dataset.salesEnhanced)return;
      const rows=groups[sectionIndex]||[];
      table.dataset.salesEnhanced='1';
      table.classList.add('purchase-sales-table');
      const hr=table.querySelector('thead tr');
      if(hr)hr.insertAdjacentHTML('beforeend','<th class="sale-col">販売確認</th><th class="sale-col">売れた金額</th><th class="sale-col">残数</th>');
      table.querySelectorAll('tbody tr').forEach((tr,rowIndex)=>{
        const p=rows[rowIndex];
        if(!p){tr.insertAdjacentHTML('beforeend','<td class="sale-empty">照合待ち</td><td class="sale-empty">—</td><td class="sale-empty">要確認</td>');return}
        const sold=Number(p.sold_quantity||0),amount=Number(p.sold_amount_yen||0),status=String(p.inventory_match_status||'none');
        if(isComponentPurchase(p))tr.classList.add('sale-linked-component');
        else if(status==='review')tr.classList.add('sale-linked-high');
        else if(sold>0)tr.classList.add('sale-linked-exact');
        else tr.classList.add('sale-linked-none');
        const amountHtml=amount?money(amount):'<span class="ledger-sale-zero">—</span>';
        tr.insertAdjacentHTML('beforeend','<td>'+badge(p)+'</td><td class="num ledger-sale-money">'+amountHtml+'</td><td class="num ledger-sale-rem">'+remainingHtml(p)+'</td>');
      });
    });
    if(!host.querySelector('.ledger-sales-note')){
      const tabs=host.querySelector('.ledger-month-tabs');
      const note='<div class="ledger-sales-note"><b>残数：</b> メルカリの「購入・支払完了（発送依頼）」で即時減算し、同一商品はFIFOで割当。キャンセル成立分は除外。<span>「照合0件」は売却メールとの一致がまだない行。まとめ売り・福袋は無理に割り当てず要確認に残します。</span></div>';
      (tabs||host.firstElementChild)?.insertAdjacentHTML(tabs?'afterend':'beforebegin',note);
    }
  }

  const style=document.createElement('style');
  style.textContent=`
    .ledger-sales-note{margin:0 0 8px;padding:7px 9px;background:#fff;border:2px solid;border-color:#808080 #fff #fff #808080;box-shadow:inset 1px 1px #000;font-size:11px;line-height:1.45}.ledger-sales-note span{color:#725300}
    .purchase-sales-table{min-width:1120px}.purchase-sales-table th.sale-col{background:#d9e8d2;min-width:95px}.purchase-sales-table tr.sale-linked-exact{background:#f1fff1}.purchase-sales-table tr.sale-linked-high{background:#f4f7ff}.purchase-sales-table tr.sale-linked-component{background:#effbff}.purchase-sales-table tr.sale-linked-none{background:#fff}
    .ledger-sale-tag{display:inline-block;padding:1px 4px;border:1px solid #777;background:#fff;font-weight:700;white-space:nowrap}.ledger-sale-tag.exact{color:#006000}.ledger-sale-tag.high{color:#000080}.ledger-sale-tag.none{color:#666;background:#f4f4f4}.ledger-sale-tag.component{color:#7a5600;background:#fff8cf}
    .ledger-sale-money{font-weight:700;color:#005000}.ledger-sale-zero{color:#777;font-weight:400}.ledger-sale-rem{position:relative;font-weight:800;white-space:nowrap}.ledger-sale-sub{display:block;margin-top:2px;font-size:9px;font-weight:400;white-space:nowrap}.ledger-sale-sub.warn{color:#7a5600}.ledger-sale-sub.bad{color:#9b0000;font-weight:700}.ledger-sale-sub.muted{color:#777}
    .ledger-sale-tip{display:none;position:absolute;right:0;top:100%;z-index:20;width:310px;padding:6px 8px;background:#ffffdf;border:1px solid #000;box-shadow:2px 2px #777;text-align:left;white-space:normal;font-weight:400;line-height:1.45}.ledger-sale-rem:hover .ledger-sale-tip,.ledger-sale-rem:focus-within .ledger-sale-tip{display:block}.sale-empty{color:#777;text-align:center}
    @media(max-width:760px){.purchase-sales-table{min-width:1050px}.ledger-sales-note{font-size:12px}}
  `;
  document.head.appendChild(style);

  const previous=renderSourcing;
  renderSourcing=function(){previous();enhanceLedgerSales()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhanceLedgerSales);else enhanceLedgerSales();
  window.CCLedgerSales={enhance:enhanceLedgerSales};
})();
