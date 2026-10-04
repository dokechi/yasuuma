/* Read-only sale details. Amounts are already classified by the authenticated ledger API. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports){module.exports=api;return}
  root.CCTradeDetails=api;
  if(typeof renderSourcing==='function'){
    const previous=renderSourcing;
    renderSourcing=function(){previous.apply(this,arguments);api.render()};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',api.render);else api.render();
})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=value=>value===null||value===undefined||value===''||typeof value==='boolean'||!Number.isFinite(Number(value))||Number(value)<0?'未確認':'¥'+Number(value).toLocaleString('ja-JP');
  const statuses={completed:'完了',in_progress:'進行中',cancelled:'取消',canceled:'取消'};
  const markets={mercari:'メルカリ',yahoo:'Yahoo!',mercari_shops:'メルカリShops'};
  let expanded=true;
  function date(value){if(!value)return '未確認';const d=new Date(value);return Number.isNaN(d.getTime())?'未確認':new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(d)}
  function row(sale){
    const cancelled=['cancelled','canceled'].includes(sale.status);
    const old=money(sale.unverified_recorded_yen)!=='未確認'?'<small>旧記録額 '+money(sale.unverified_recorded_yen)+'（金額基準未確認）</small>':'';
    const deductions=money(sale.aggregate_deductions_yen)!=='未確認'?'<small>控除合計 '+money(sale.aggregate_deductions_yen)+'<br>内訳未確認の場合は配分しません</small>':'';
    return '<tr'+(cancelled?' class="trade-cancelled"':'')+'><td class="trade-product">'+escape(sale.product_name||'商品名未確認')+'<small>'+escape(sale.sale_id||'取引ID未確認')+' / '+escape(sale.quantity??'未確認')+'点</small>'+old+'</td>'+
      '<td>'+escape(markets[sale.marketplace]||sale.marketplace||'取引先未確認')+'<br><b>'+escape(statuses[sale.status]||('要確認（'+(sale.status||'状態不明')+'）'))+'</b>'+(cancelled?'<small>成立額に含めません</small>':'')+'</td>'+
      '<td>成約・支払 '+date(sale.sold_at)+'<small>完了・確定 '+date(sale.completed_at)+'</small></td>'+
      '<td class="num">'+money(sale.gross_sale_yen)+'</td><td class="num">'+money(sale.gross_payment_yen)+'</td><td class="num">'+money(sale.net_received_yen)+'</td>'+
      '<td class="num">手数料 '+money(sale.fee_yen)+'<small>送料 '+money(sale.shipping_yen)+'</small>'+deductions+'</td>'+
      '<td>'+(sale.cost_match_status==='matched_reference'?'仕入れ照合先あり<small>原価・利益は未表示</small>':(sale.cost_match_status==='unmatched'?'原価未照合':'原価照合未確認')+'<small>利益未確定</small>')+'</td></tr>';
  }
  function html(state){
    const available=Array.isArray(state.sales)&&state.salesMonth===state.purchaseMonth;
    const rows=available?state.sales:[];
    const count=rows.length+'件 / 完了 '+rows.filter(s=>s.status==='completed').length+' / 進行中 '+rows.filter(s=>s.status==='in_progress').length+' / 取消 '+rows.filter(s=>['cancelled','canceled'].includes(s.status)).length;
    const body=!available?'<p class="trade-unavailable" role="status">売却明細を取得できませんでした。上部の「更新」で再試行してください。</p>':!rows.length?'<p>この月の成約・支払または完了・売上確定の売却明細はありません。</p>':'<div class="trade-table-wrap" tabindex="0" aria-label="売却明細。横にスクロールできます"><table class="trade-table"><thead><tr><th scope="col">売却商品 / 取引ID</th><th scope="col">販売先 / 状態</th><th scope="col">日付（日本時間）</th><th scope="col">販売総額</th><th scope="col">支払受付額</th><th scope="col">純受取</th><th scope="col">手数料 / 送料</th><th scope="col">原価照合</th></tr></thead><tbody>'+rows.map(row).join('')+'</tbody></table></div>';
    return '<details id="tradeDetails" class="trade-details"'+(expanded?' open':'')+'><summary>売却明細 <span>'+escape(state.purchaseMonth||'')+(available?' · '+count:'')+'</span></summary><p class="trade-basis-note">選択月に成約・支払、または完了・売上確定した取引を表示します。販売総額と支払受付額・純受取を区別し、原本にない金額は「未確認」です。取消行の金額は取消前の記録です。旧記録額は基準を確認するまで集計しません。仕入れ行の「売れた金額」は既存の割当額で、確定利益ではありません。</p>'+(state.salesTruncated?'<p class="trade-unavailable">表示上限に達したため、月の明細は一部です。</p>':'')+body+'<p class="trade-progress-link"><a href="#request-daily-trade-import" data-trade-progress>取込状況・保留理由を確認</a></p></details>';
  }
  function render(){
    if(typeof sourcingApp==='undefined'||sourcingApp.sub!=='purchases')return;
    const host=document.getElementById('sourcingBody');if(!host)return;
    host.querySelector('#tradeDetails')?.remove();
    const tabs=host.querySelector('.ledger-month-tabs');
    if(tabs)tabs.insertAdjacentHTML('afterend',html(sourcingApp));else host.insertAdjacentHTML('afterbegin',html(sourcingApp));
    const panel=host.querySelector('#tradeDetails');if(panel)panel.addEventListener('toggle',()=>{expanded=panel.open});
    panel?.querySelector('[data-trade-progress]')?.addEventListener('click',()=>{
      document.getElementById('menuTasks')?.click();
      const target=document.querySelector('#taskModal [data-request-id="request-daily-trade-import"]');
      if(target){target.querySelector('.request-result')?.setAttribute('open','');target.scrollIntoView?.({block:'start'})}
    });
  }
  return {html,row,money,render};
});
