/* Compact profit view; source transaction amounts remain in each row's disclosure. */
(function(root,factory){
 'use strict';const model=typeof module==='object'&&module.exports?require('./ledger-profit-model.js'):root.CCLedgerProfit,api=factory(model);
 if(typeof module==='object'&&module.exports){module.exports=api;return;}root.CCTradeDetails=api;
 if(typeof renderSourcing==='function'){const previous=renderSourcing;renderSourcing=function(){previous.apply(this,arguments);api.render();};}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',api.render);else api.render();
})(typeof window==='undefined'?globalThis:window,function(M){
 'use strict';
 const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=v=>M.known(v)===null?'未確認':'¥'+Number(v).toLocaleString('ja-JP',{maximumFractionDigits:2});
 const signed=v=>v===null?'計算待ち':(v<0?'−¥':'¥')+Math.abs(v).toLocaleString('ja-JP',{maximumFractionDigits:2});
 const statuses={completed:'完了',in_progress:'取引中',cancelled:'取消',canceled:'取消'};
 let expanded=true,purchasesExpanded=false;
 function date(value){if(!value||!Number.isFinite(Date.parse(value)))return '未確認';return new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric'}).format(new Date(value));}
 function row(sale){
  const cancelled=['cancelled','canceled'].includes(sale.status),r=M.result(sale),status=statuses[sale.status]||'状態確認中',profit=sale.status==='completed'?r.profit:null;
  const detail='<details class="trade-raw"><summary>内訳を見る</summary><dl>'+[['販売総額',sale.gross_sale_yen],['支払受付額',sale.gross_payment_yen],['純受取',sale.net_received_yen],['販売手数料',sale.fee_yen],['発送送料',sale.shipping_yen],['控除合計',sale.aggregate_deductions_yen]].map(([k,v])=>'<div><dt>'+k+'</dt><dd>'+money(v)+'</dd></div>').join('')+'</dl><p>'+escape(sale.profit_cost_note||(r.cost===null?'仕入原価は確認中です':'仕入原価を確認済みです'))+'</p><p>取引ID '+escape(sale.sale_id||'未確認')+' / '+escape(sale.quantity??'未確認')+'点<br>成約 '+date(sale.sold_at)+' / 完了 '+date(sale.completed_at)+'</p>'+(M.known(sale.unverified_recorded_yen)!==null?'<p>金額基準未確認の旧記録 '+money(sale.unverified_recorded_yen)+'</p>':'')+'</details>';
  return '<tr'+(cancelled?' class="trade-cancelled"':'')+'><td class="trade-product"><b>'+escape(sale.product_name||'商品名未確認')+'</b>'+detail+'</td><td>'+escape(M.market(sale.marketplace))+'<small>'+escape(status)+' · '+date(sale.completed_at||sale.sold_at)+'</small></td><td class="num">'+(cancelled?'—':money(r.cost))+'</td><td class="num">'+(cancelled?'—':signed(r.received))+(r.received===null&&M.known(sale.gross_sale_yen)!==null?'<small>売価 '+money(sale.gross_sale_yen)+'<br>手数料等を確認中</small>':'')+'</td><td class="num trade-profit '+(profit!==null&&profit<0?'negative':'')+'">'+(cancelled?'集計対象外':signed(profit))+'</td></tr>';
 }
 function summary(state,rows,available){
  const s=M.summarize(rows,state.purchaseMonth==='all'?'':state.purchaseMonth),period=state.purchaseMonth&&state.purchaseMonth!=='all'?escape(state.purchaseMonth.replace('-','年')+'月'):'累計',partial=state.salesTruncated===true,known=available&&s.confirmed>0;
  const label=!available?'読取を確認中':s.pending||partial?'確認できた分の儲け':'儲け';
  const cards='<div class="profit-overview"><div class="profit-card profit-primary"><span>'+period+' · '+label+'</span><strong class="'+(s.profit<0?'negative':'')+'">'+(!available?'確認中':known?signed(s.profit):s.settled?'計算待ち':'—')+'</strong></div><div class="profit-card"><span>仕入れ（売れた分の原価）</span><strong>'+ (known?money(s.cost):'—')+'</strong></div><div class="profit-card"><span>販売（手数料・送料を引いた手取り）</span><strong>'+(known?signed(s.received):'—')+'</strong></div></div>';
  const note=!available?'取引の読取を確認できませんでした。上の「更新」で再試行できます。':s.settled?'この3額は計算できた '+s.confirmed+'件の合計です。'+(s.pending?' 未計算 '+s.pending+'件（原価・手数料・送料等を確認中）。':'')+' 取引中 '+s.inProgress+'件は確定後に加算します。':'この期間に確定した販売はありません。取引中 '+s.inProgress+'件。';
  const breakdown=s.groups.length?'<details class="profit-markets"><summary>販路別の儲け</summary><ul>'+s.groups.map(g=>'<li><b>'+escape(g.name)+'</b><strong>'+signed(g.profit)+'</strong><small>確認 '+g.confirmed+'件'+(g.pending?' / 未計算 '+g.pending+'件':'')+'</small></li>').join('')+'</ul></details>':'';
  return '<section id="ledgerProfitSummary" aria-label="仕入れ・販売・儲け">'+cards+'<p class="profit-note">'+note+'</p>'+(partial?'<p class="trade-unavailable">取引データは一部のみです。期間全体の合計ではありません。</p>':'')+breakdown+'</section>';
 }
 function html(state){
  const available=Array.isArray(state.sales)&&state.salesMonth===state.purchaseMonth,rows=available?state.sales:[],count=rows.length+'件';
  const table=available&&rows.length?'<div class="trade-table-wrap" tabindex="0" aria-label="仕入れ・販売・儲けの明細"><table class="trade-table"><thead><tr><th scope="col">商品</th><th scope="col">販路・状態</th><th scope="col">仕入原価</th><th scope="col">販売の手取り</th><th scope="col">儲け</th></tr></thead><tbody>'+rows.map(row).join('')+'</tbody></table></div>':available?'<p>この期間の売却明細はありません。</p>':'<p class="trade-unavailable">売却明細は読取を確認中です。</p>';
  return summary(state,rows,available)+'<details id="tradeDetails" class="trade-details"'+(expanded?' open':'')+'><summary>商品ごとの儲け <span>'+count+'</span></summary>'+table+'<p class="trade-basis-note">儲け＝販売の手取り−売れた分の仕入原価。仕入送料は注文内で配分し、売れ残りの原価は在庫として持ちます。集計は完了日を基準にし、不明な取引は成約日を使います。取消は除外します。</p><p class="trade-progress-link"><a href="#request-daily-trade-import" data-trade-progress>取込状況・未計算の理由</a></p></details>';
 }
 function render(){
  if(typeof sourcingApp==='undefined'||sourcingApp.sub!=='purchases')return;
  const host=document.getElementById('sourcingBody');if(!host)return;
  host.querySelector('#tradeDetails')?.remove();host.querySelector('#ledgerProfitSummary')?.remove();const tabs=host.querySelector('.ledger-month-tabs');
  if(tabs)tabs.insertAdjacentHTML('afterend',html(sourcingApp));else host.insertAdjacentHTML('afterbegin',html(sourcingApp));
  host.querySelector('#tradeDetails')?.addEventListener('toggle',e=>{expanded=e.currentTarget.open;});
  if(!host.querySelector('#purchaseArchive')){
   const archive=document.createElement('details');archive.id='purchaseArchive';archive.className='purchase-archive';archive.open=purchasesExpanded;
   const title=document.createElement('summary');title.textContent='購入・在庫の詳しい記録';archive.append(title);
   const nodes=[...host.children].filter(n=>n.matches('.purchase-summary,.purchase-note,.purchase-order,.ledger-sales-note,.bundle-global-summary,.empty'));
   if(nodes.length){host.append(archive);for(const node of nodes)archive.append(node);archive.addEventListener('toggle',()=>{purchasesExpanded=archive.open;});}
  }

  host.querySelector('[data-trade-progress]')?.addEventListener('click',()=>{document.getElementById('menuTasks')?.click();const target=document.querySelector('#taskModal [data-request-id="request-daily-trade-import"]');if(target){target.querySelector('.request-result')?.setAttribute('open','');target.scrollIntoView?.({block:'start'});}});
 }
 return {html,row,money,render,summary};
});
