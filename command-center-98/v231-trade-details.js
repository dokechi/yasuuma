/* One purchase table is the source of both visible profit totals. */
(function(root,factory){
 'use strict';const M=typeof module==='object'&&module.exports?require('./ledger-profit-model.js'):root.CCLedgerProfit,A=typeof module==='object'&&module.exports?require('./purchase-profit-actions.js'):root.CCPurchaseProfitActions,api=factory(M,A);
 if(typeof module==='object'&&module.exports){module.exports=api;return;}root.CCTradeDetails=api;
 if(typeof purchaseLedgerHtml==='function')purchaseLedgerHtml=function(){return api.html(sourcingApp);};
 if(typeof renderSourcing==='function'){const previous=renderSourcing;renderSourcing=function(){previous.apply(this,arguments);api.render();};}
 document.addEventListener('click',function(event){const button=event.target.closest?.('[data-profit-purchase]');if(!button)return;const target=document.getElementById(A.rowId(button.dataset.profitPurchase));if(target){target.scrollIntoView({block:'center',behavior:'auto'});target.focus({preventScroll:true});}});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',api.render);else api.render();
})(typeof window==='undefined'?globalThis:window,function(M,A){
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const numeric=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
 const money=v=>!numeric(v)?'—':(v<0?'−¥':'¥')+Math.abs(Number(v)).toLocaleString('ja-JP',{maximumFractionDigits:2});
 const day=v=>v&&Number.isFinite(Date.parse(v))?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(v)):'日付未確認';
 const orderKey=p=>JSON.stringify([p.supplier_key,p.order_id||p.source_message_id||p.id]);
 function orderTotals(rows){
  const orders=new Map();for(const p of rows){const key=orderKey(p);if(!orders.has(key))orders.set(key,[]);orders.get(key).push(M.known(p.order_total_yen));}
  let total=0,unknown=0;for(const values of orders.values()){if(values.some(v=>v===null)||new Set(values).size!==1)unknown++;else total+=values[0];}
  return {total,unknown,orders:orders.size};
 }
 function purchaseSummary(state){const rows=(state.purchases||[]).filter(p=>p.status==='purchased'),t=orderTotals(rows);return '<p class="purchase-paid-line">仕入れ計 <b>'+money(t.total)+(t.unknown?' ＋ 金額確認中':'')+'</b><span>'+t.orders+'注文 · '+rows.reduce((n,p)=>n+Number(p.quantity||0),0)+'点</span></p>';}
 function totals(rows){
  const sold=rows.filter(r=>numeric(r.sold_profit_yen)),remaining=rows.filter(r=>numeric(r.remaining_profit_yen)&&r.remaining_priced_quantity>0);
  return {sold:sold.length?sold.reduce((n,r)=>n+r.sold_profit_yen,0):null,remaining:remaining.length?remaining.reduce((n,r)=>n+r.remaining_profit_yen,0):null,soldPriced:rows.reduce((n,r)=>n+r.sold_priced_quantity,0),soldPending:rows.reduce((n,r)=>n+r.sold_unpriced_quantity,0),soldEstimated:rows.reduce((n,r)=>n+r.sold_estimated_quantity,0),remainingPriced:rows.reduce((n,r)=>n+r.remaining_priced_quantity,0),remainingPending:rows.reduce((n,r)=>n+r.remaining_unpriced_quantity,0)};
 }
 function summary(state){
  const available=Array.isArray(state.purchaseProfit),ids=new Set((state.purchases||[]).filter(p=>p.status==='purchased').map(p=>String(p.id))),rows=available?state.purchaseProfit.filter(r=>ids.has(String(r.purchase_id))):[],t=totals(rows),period=state.purchaseMonth&&state.purchaseMonth!=='all'?Number(state.purchaseMonth.slice(5))+'月仕入れ分':'記録済みの仕入れ分';
  return '<section id="ledgerProfitSummary" aria-label="購入表の儲け集計"><p class="purchase-profit-period">'+esc(period)+' · この下の購入表を集計</p><div class="purchase-profit-totals"><div class="purchase-profit-total"><span>売れた分の儲け'+(t.soldEstimated?'（概算含む）':'')+'</span><strong class="'+(t.sold<0?'negative':'')+'">'+(available?money(t.sold):'確認中')+'</strong><small>'+t.soldPriced+'点を計算'+(t.soldPending?' · 金額確認中 '+t.soldPending+'点':'')+'</small></div><div class="purchase-profit-total forecast"><span>残りの見込み</span><strong class="'+(t.remaining<0?'negative':'')+'">'+(available?money(t.remaining):'確認中')+'</strong><small>'+t.remainingPriced+'点に見込みあり'+(t.remainingPending?' · 査定なし '+t.remainingPending+'点':'')+'</small></div></div>'+purchaseSummary(state)+'<details class="purchase-profit-method"><summary>計算の内訳</summary><p>儲け＝販売の手取り−売れた数量分の仕入原価。販売手数料・発送送料を引き、仕入送料も原価に含めます。売れた分には取引中の見込みを含みます。</p><p>残りの見込みは、保存した査定の売価、同商品の販売手取りを使い、実際の仕入原価で再計算します。売れた分を残りの見込みへ重ねて計上しません。</p><p>手数料等が未記録の販売は、メルカリ10%、ヤフーフリマ概算5%、発送送料は小物・衣類等220円、靴類870円を仮置き。控除済みの受取額からは重ねて引きません。型番等から推定した照合・FIFOのロット割当・福袋の均等原価配分は概算です。残数も記録から求めた目安で、未照合の売却は反映できていません。</p><p>月タブは仕入れ月で絞ります。その後に売れた分も、その商品行に反映します。購入と対応がない旧在庫の40%仮利益は、この表に加算しません。金額未確認・査定なしは0円として扱いません。全購入の取込完了は未確認です。</p></details></section>';
 }
 function profitDetail(r){
  const sales=(r.sales||[]).filter(s=>s.quantity),parts=(r.components||[]);
  if(!sales.length&&!r.basis&&!r.remaining_priced_quantity)return '';
  const list=sales.map(s=>'<li>'+esc(s.status==='manual'?'実数確認分':M.market(s.marketplace))+' · '+s.quantity+'点'+(s.status==='in_progress'?'（取引中）':'')+'：'+money(s.profit_yen)+(s.estimated?' 概算':'')+'<small>'+(numeric(s.net_yen)?'手取り '+money(s.net_yen)+' − 原価 '+money(s.cost_yen)+'。 ':'')+esc(s.note||'')+'</small></li>').join('');
  return '<details class="purchase-profit-detail"><summary>内訳</summary>'+(sales.length?'<ul>'+list+'</ul>':'')+(r.reference_note?'<p>残りの見込み：'+esc(r.reference_note)+'</p>':'')+(parts.length?'<ul>'+parts.map(c=>'<li>'+esc(c.component_name||c.component_key)+'：残 '+c.remaining_quantity+'点</li>').join('')+'</ul>':'')+'</details>';
 }
 function row(p,r){
  const unit=r?.unit_cost_yen??null,original=M.known(p.unit_price_yen),remaining=r&&numeric(r.remaining_profit_yen)&&r.remaining_priced_quantity>0;
  let profit='<span class="purchase-profit-empty">計算を確認中</span>';
  if(r){
   const sold=r.sold_quantity?'<div class="purchase-profit-amount'+(r.sold_profit_yen<0?' negative':'')+'"><small>売れた分'+(r.sold_estimated_quantity?' · 概算':'')+'</small><b>'+money(r.sold_profit_yen)+'</b><span>'+r.sold_quantity+'点'+(r.in_progress_quantity?'（取引中 '+r.in_progress_quantity+'点含む）':'')+'</span>'+(r.sold_unpriced_quantity?'<span>金額確認中 '+r.sold_unpriced_quantity+'点</span>':'')+'</div>':'';
   const forecast=remaining?'<div class="purchase-profit-amount forecast'+(r.remaining_profit_yen<0?' negative':'')+'"><small>残り見込み</small><b>'+money(r.remaining_profit_yen)+'</b>'+(r.remaining_unpriced_quantity?'<span>査定あり '+r.remaining_priced_quantity+'点分</span>':'')+'</div>':r.sold_quantity&&(r.remaining_quantity||r.remaining_loose_quantity)?'<small class="purchase-profit-empty">残りは査定待ち</small>':'';
   profit=sold||forecast?sold+forecast+profitDetail(r):'<span class="purchase-profit-empty">査定待ち</span>';
  }
  const rem=!r?'—':esc(r.remaining_quantity)+(r.bundle?'袋分':'')+(r.remaining_loose_quantity?'<small>＋ バラ'+r.remaining_loose_quantity+'点</small>':'');
  const cost=unit!==null?'<b>'+money(unit)+'</b><small>仕入送料込み</small>':'<b>'+money(M.known(p.allocated_net_unit_yen))+'</b><small>商品支払額・送料等確認中</small>';
  return '<tr id="'+esc(A.rowId(p.id))+'" tabindex="-1" data-purchase-id="'+esc(p.id)+'"><td class="purchase-product"><b>'+esc(p.product_name)+'</b></td><td>'+esc(p.sku||'—')+'</td><td>'+esc(p.variant||'—')+'</td><td class="num">'+esc(p.quantity)+'</td><td class="num purchase-unit-cost">'+cost+(original!==null&&(unit===null||Math.abs(original-unit)>.01)?'<small>注文時 '+money(original)+'</small>':'')+'</td><td class="purchase-profit-cell">'+profit+'</td><td class="num purchase-remaining">'+rem+'<small>目安</small></td></tr>';
 }
 function groups(rows){const orders=new Map();for(const p of rows){const key=orderKey(p);if(!orders.has(key))orders.set(key,{first:p,items:[]});orders.get(key).items.push(p);}return [...orders.values()].sort((a,b)=>(Date.parse(b.first.ordered_at)||0)-(Date.parse(a.first.ordered_at)||0)||Number(b.first.id)-Number(a.first.id));}
 function orderHtml(g,profits){const p=g.first,url=typeof p.source_url==='string'&&/^https:\/\//.test(p.source_url)?p.source_url:null;return '<section class="purchase-order"><div class="purchase-order-head"><span><b>'+esc(p.supplier_name||p.supplier_key)+'</b>　注文 '+esc(p.order_id||'—')+'</span></div><div class="purchase-table-wrap" tabindex="0" aria-label="購入商品の儲け"><table class="purchase-table purchase-profit-table"><thead><tr><th scope="col">商品</th><th scope="col">型番</th><th scope="col">サイズ／色</th><th scope="col">仕入数</th><th scope="col">仕入単価</th><th scope="col">儲け</th><th scope="col">残数</th></tr></thead><tbody>'+g.items.map(p=>row(p,profits.get(String(p.id)))).join('')+'</tbody></table></div>'+(url?'<div class="purchase-source"><a href="'+esc(url)+'" target="_blank" rel="noopener">'+(/^https:\/\/mail\.google\.com\//.test(url)?'Gmail元メールを開く':'注文の記録を開く')+'</a></div>':'')+'</section>';}
 function html(state){
  const purchases=state.purchases||[],rows=purchases.filter(p=>p.status==='purchased'),profits=new Map((state.purchaseProfit||[]).map(r=>[String(r.purchase_id),r])),days=new Map();
  for(const g of groups(rows)){const key=day(g.first.ordered_at);if(!days.has(key))days.set(key,[]);days.get(key).push(g);}
  let content='';for(const [date,orders]of days){const t=orderTotals(orders.flatMap(g=>g.items));content+='<section class="purchase-day"><div class="purchase-day-head"><b>'+esc(date)+'</b><span>仕入れ計 <strong>'+money(t.total)+(t.unknown?' ＋ 金額確認中':'')+'</strong> · '+t.orders+'注文</span></div>'+orders.map(g=>orderHtml(g,profits)).join('')+'</section>';}
  const pending=purchases.filter(p=>p.status==='unknown');
  return '<div class="purchase-profit-ledger">'+summary(state)+A.html(state)+(content||'<p class="empty">この期間の購入記録はありません。</p>')+(pending.length?'<details class="purchase-pending"><summary>予約・未納／要確認</summary>'+groups(pending).map(g=>orderHtml(g,new Map())).join('')+'</details>':'')+'</div>';
 }
 function render(){if(typeof sourcingApp==='undefined'||sourcingApp.sub!=='purchases')return;const host=document.getElementById('sourcingBody');if(!host||host.querySelector('.purchase-profit-ledger'))return;const tabs=host.querySelector('.ledger-month-tabs');if(tabs)tabs.remove();host.innerHTML=html(sourcingApp);if(tabs)host.prepend(tabs);}
 return {html,row,money,render,summary,purchaseSummary,orderTotals,totals};
});
