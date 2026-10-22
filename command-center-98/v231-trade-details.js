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
 function purchaseSummary(state,available){
  if(!available||!Array.isArray(state.purchases))return '';
  const rows=state.purchases.filter(p=>p.status==='purchased'),orders=new Map();
  for(const p of rows){const key=JSON.stringify([p.supplier_key,p.order_id||p.source_message_id||p.id]);if(!orders.has(key))orders.set(key,[]);orders.get(key).push(M.known(p.order_total_yen));}
  let total=0,unknown=0;for(const values of orders.values()){if(values.some(v=>v===null)||new Set(values).size!==1)unknown++;else total+=values[0];}
  const times=rows.map(p=>Date.parse(p.ordered_at)).filter(Number.isFinite).sort((a,b)=>a-b),range=times.length?date(new Date(times[0]).toISOString())+'〜'+date(new Date(times[times.length-1]).toISOString()):'日付確認中';
  return '<div class="purchase-paid-overview"><div><span>仕入れの支払額（記録済み・在庫分も含む）</span><strong>'+ (orders.size?money(total):'—')+(unknown?' ＋ 未確認':'')+'</strong></div><p>注文日 '+range+' · '+orders.size+'注文'+(unknown?'（金額未確認 '+unknown+'注文）':'')+'。ポイント・値引を反映した保存額を注文ごとに集計しています。全購入の取込完了は未確認です。</p></div>';
 }
 function row(sale){
  const cancelled=['cancelled','canceled'].includes(sale.status),r=M.projected(sale),actual=M.result(sale),status=statuses[sale.status]||'状態確認中',profit=['completed','in_progress'].includes(sale.status)?r.profit:null;
  const detail='<details class="trade-raw"><summary>内訳を見る</summary><dl>'+[['販売総額',sale.gross_sale_yen],['支払受付額',sale.gross_payment_yen],['純受取',sale.net_received_yen],['販売手数料',sale.fee_yen],['発送送料',sale.shipping_yen],['控除合計',sale.aggregate_deductions_yen]].map(([k,v])=>'<div><dt>'+k+'</dt><dd>'+money(v)+'</dd></div>').join('')+'</dl><p>'+escape(sale.profit_cost_note||(r.cost===null?'仕入原価は確認中です':'仕入原価を確認済みです'))+'</p><p>取引ID '+escape(sale.sale_id||'未確認')+' / '+escape(sale.quantity??'未確認')+'点<br>成約 '+date(sale.sold_at)+' / 完了 '+date(sale.completed_at)+'</p>'+(M.known(sale.unverified_recorded_yen)!==null?'<p>金額基準未確認の旧記録 '+money(sale.unverified_recorded_yen)+'</p>':'')+'</details>';
  const estimateNote=r.estimated&&r.notes.length?'<div class="trade-estimate"><b>見込みの根拠</b><ul>'+r.notes.map(n=>'<li>'+escape(n)+'</li>').join('')+'</ul></div>':'';
  return '<tr'+(cancelled?' class="trade-cancelled"':'')+'><td class="trade-product"><b>'+escape(sale.product_name||'商品名未確認')+'</b>'+detail+estimateNote+'</td><td>'+escape(M.market(sale.marketplace))+'<small>'+escape(status)+' · '+date(sale.completed_at||sale.sold_at)+'</small></td><td class="num">'+(cancelled?'—':money(r.cost))+(actual.cost===null&&r.cost!==null?'<small>'+(r.legacy?'仮原価 · 手取り60%':'見込み')+'</small>':'')+'</td><td class="num">'+(cancelled?'—':signed(r.received))+(actual.received===null&&r.received!==null?'<small>見込み</small>':'')+(r.received===null&&M.known(sale.gross_sale_yen)!==null?'<small>売価 '+money(sale.gross_sale_yen)+'<br>手数料等を確認中</small>':'')+'</td><td class="num trade-profit '+(profit!==null&&profit<0?'negative':'')+'">'+(cancelled?'集計対象外':profit===null?'売価・原価を確認中':signed(profit))+(profit!==null&&(r.estimated||sale.status==='in_progress')?'<small>'+(r.legacy?'手取り40% · 推定':'見込み')+'</small>':'')+'</td></tr>';
 }
 function inventoryDetails(state){
  const rows=state.purchaseForecast;if(!Array.isArray(rows)||!rows.length)return '';
  return '<details class="trade-details inventory-profit-details"><summary>在庫ごとの見込み利益 <span>'+rows.length+'行</span></summary><div class="trade-table-wrap"><table class="trade-table"><thead><tr><th>商品</th><th>参考残数</th><th>想定手取り / 点</th><th>原価 / 点</th><th>見込み利益計</th></tr></thead><tbody>'+rows.map(r=>'<tr><td class="trade-product"><b>'+escape(r.product_name)+'</b><small>'+escape(r.variant||'')+'</small><small>'+escape(r.note)+' / 参照 '+date(r.reference_at)+'</small></td><td class="num">'+escape(r.remaining_quantity)+'</td><td class="num">'+signed(r.net_per_unit_yen)+'</td><td class="num">'+money(r.unit_cost_yen)+'</td><td class="num trade-profit'+(r.profit_yen<0?' negative':'')+'">'+(r.profit_yen===null?'想定売価・原価を確認中':signed(r.profit_yen))+'</td></tr>').join('')+'</tbody></table></div><p class="trade-basis-note">保存査定、同商品の販売手取りから、売れた場合の利益を概算。仕入送料は原価に含みます。完了分・取引中・候補照合分を引いた参考残数で、未照合の売却分は残数へ反映できていません。相場の下落、値下げ、売れ残りは未反映です。</p></details>';
 }
 function summary(state,rows,available){
  const s=M.summarize(rows,state.purchaseMonth==='all'?'':state.purchaseMonth,true),period=state.purchaseMonth&&state.purchaseMonth!=='all'?escape(state.purchaseMonth.replace('-','年')+'月'):'累計',partial=state.salesTruncated===true,known=available&&s.computed>0;
  const incomplete=available&&(s.pending>0||s.estimated>0||partial),subset=incomplete?'計算済み '+s.computed+'件の':'';
  const amount=!available?'確認中':known?signed(s.profit):incomplete?'未確定':'—';
  const coverage=available&&s.settled?'<small class="profit-coverage">'+(partial?'取得できた取引のうち': '完了 '+s.settled+'件のうち')+'計算済み '+s.computed+'件'+(s.estimated?'（実額 '+s.confirmed+'件・見込み '+s.estimated+'件）':'')+(s.pending?' · 未計算 '+s.pending+'件':'')+'</small>':'';
  const subtotal=s.legacy?'<p class="profit-subtotal">手取り40%の仮計算 '+s.legacy+'件 · 儲け '+signed(s.legacyProfit)+'</p>':'';
  const profitLabel=incomplete&&known?'計算済み '+s.computed+'件の儲け'+(s.estimated?'（見込み含む）':''):'全体の儲け';
  const progress=M.inProgress(rows,state.purchaseMonth==='all'?'':state.purchaseMonth),inventory=Array.isArray(state.purchaseForecast)?state.purchaseForecast:null,priced=inventory?.filter(r=>r.profit_yen!==null)||[],inventoryProfit=priced.reduce((n,r)=>n+r.profit_yen,0),purchasePeriod=state.purchaseMonth==='all'?'累計仕入れ分':period+'仕入れ分';
  const cards='<div class="profit-overview"><div class="profit-card profit-primary'+(incomplete?' profit-incomplete':'')+'"><span>'+period+' · '+profitLabel+'</span><strong class="'+(s.profit<0?'negative':'')+'">'+amount+'</strong>'+coverage+subtotal+'</div><div class="profit-card"><span>取引中の見込み利益</span><strong class="'+(progress.profit<0?'negative':'')+'">'+(available&&progress.computed?signed(progress.profit):'—')+'</strong><small class="profit-coverage">'+progress.total+'件のうち '+progress.computed+'件を計算'+(progress.pending?' · 売価・原価未確認 '+progress.pending+'件':'')+'。取引完了前の目安です。</small></div><div class="profit-card"><span>在庫の見込み利益（'+purchasePeriod+'）</span><strong class="'+(inventoryProfit<0?'negative':'')+'">'+(available&&priced.length?signed(inventoryProfit):'—')+'</strong><small class="profit-coverage">'+(inventory?inventory.length+'行のうち '+priced.length+'行を計算'+(inventory.length>priced.length?' · 未査定 '+(inventory.length-priced.length)+'行':''):'査定の読取を確認中')+'。記録上の参考残数を売れた場合の目安です。</small></div></div><p class="profit-note">売れた商品の原価（'+(incomplete?'計算済み '+s.computed+'件':'全件')+'） '+(known?money(s.cost):'—')+' / '+subset+'販売（手数料・送料を引いた手取り） '+(known?signed(s.received):'—')+'</p>';
  const note=!available?'取引の読取を確認できませんでした。上の「更新」で再試行できます。':s.settled?(incomplete?(s.pending?'未計算 '+s.pending+'件は金額に含まれていません。':'')+(s.estimated?'見込みを含むため、実額の合計は未確定です。'+(s.confirmed?'実額確認済み '+s.confirmed+'件の儲け '+signed(s.confirmedProfit)+'。':'実額を確認できた取引はまだありません。'):'全体の儲けはまだ分かりません。表示金額は計算済み分だけです。'):'原価・手数料・送料を確認できた全 '+s.confirmed+'件の合計です。')+' 取引中 '+s.inProgress+'件は確定後に加算します。':'この期間に確定した販売はありません。取引中 '+s.inProgress+'件。';
  const breakdown=s.groups.length?'<details class="profit-markets"><summary>販路別の儲け</summary><ul>'+s.groups.map(g=>'<li><b>'+escape(g.name)+'</b><strong>'+(g.pending||g.estimated||partial?'未確定':signed(g.profit))+'</strong><small>実額 '+g.confirmed+'件・見込み '+g.estimated+'件'+(g.pending?' / 未計算 '+g.pending+'件':'')+(g.computed&&(g.pending||g.estimated||partial)?' · 計算済み分の儲け '+signed(g.profit):'')+'</small></li>').join('')+'</ul></details>':'';
  const assumptions=s.estimated||progress.computed?'<details class="profit-assumptions"><summary>見込みの計算条件</summary><p>販売手数料が不明な分は、メルカリ10%、ヤフーフリマ概算5%（端数・優遇・同時掲載は未反映）。発送送料が不明な分は、小物・衣類等220円、靴類870円を仮置きしています。ヤフーの売価が不明な分は支払受付額を仮売価として使います。控除済みの受取額からは重ねて引きません。</p><p>実額原価→購入候補の原価→旧在庫・購入時期未確認の手取り40%の順で計算。候補は商品種別・サイズ・色、購入時期、残数を確認し、省略された仕様は見込みと表示します。最近の仕入れと対応があるのに原価・数量・内訳が解けない分は、40%に置き換えず確認中にします。</p><p>HONMA福袋のばら売りは、ポロシャツ白・紺、キャップ、ソックス3足組、タオル、バッグの6構成へ福袋原価を均等配分した見込みです。40%ルールの60%分は仮原価で、実際の仕入額には加算しません。購入記録が分かれば実額を優先します。</p></details>':'';
  return '<section id="ledgerProfitSummary" aria-label="仕入れ・販売・儲け">'+purchaseSummary(state,available)+cards+'<p class="profit-note">'+note+'</p>'+(partial?'<p class="trade-unavailable">取引データは一部のみです。期間全体の合計ではありません。</p>':'')+breakdown+assumptions+'</section>';
 }
 function html(state){
  const available=Array.isArray(state.sales)&&state.salesMonth===state.purchaseMonth,rows=available?state.sales:[],count=rows.length+'件';
  const table=available&&rows.length?'<div class="trade-table-wrap" tabindex="0" aria-label="仕入れ・販売・儲けの明細"><table class="trade-table"><thead><tr><th scope="col">商品</th><th scope="col">販路・状態</th><th scope="col">仕入原価</th><th scope="col">販売の手取り</th><th scope="col">儲け</th></tr></thead><tbody>'+rows.map(row).join('')+'</tbody></table></div>':available?'<p>この期間の売却明細はありません。</p>':'<p class="trade-unavailable">売却明細は読取を確認中です。</p>';
  return summary(state,rows,available)+inventoryDetails(state)+'<details id="tradeDetails" class="trade-details"'+(expanded?' open':'')+'><summary>商品ごとの儲け <span>'+count+'</span></summary>'+table+'<p class="trade-basis-note">儲け＝販売の手取り−売れた分の仕入原価。仕入送料は注文内で配分。取引中は完了を待たず見込み利益を表示し、完了分とは分けて集計します。取消は除外します。</p><p class="trade-progress-link"><a href="#request-daily-trade-import" data-trade-progress>取込状況・未計算の理由</a></p></details>';
 }
 function render(){
  if(typeof sourcingApp==='undefined'||sourcingApp.sub!=='purchases')return;
  const host=document.getElementById('sourcingBody');if(!host)return;
  host.querySelector('#tradeDetails')?.remove();host.querySelector('.inventory-profit-details')?.remove();host.querySelector('#ledgerProfitSummary')?.remove();const tabs=host.querySelector('.ledger-month-tabs');
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
 return {html,row,money,render,summary,purchaseSummary,inventoryDetails};
});
