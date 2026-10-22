/* Read-only suggestions from recorded purchases and completed sales. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CCPurchaseProfitActions=api;})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const DAY=86400000,known=v=>v!==null&&v!==undefined&&v!==''&&typeof v!=='boolean'&&Number.isFinite(Number(v))?Number(v):null;
 const norm=v=>String(v||'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim(),round=n=>Math.round(n*100)/100;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=n=>(n<0?'−¥':'¥')+Math.abs(n).toLocaleString('ja-JP',{maximumFractionDigits:2});
 const stamp=v=>{const n=Date.parse(v);return Number.isFinite(n)?n:null;};
 const date=v=>new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric'}).format(new Date(v));
 const median=values=>{const a=values.slice().sort((a,b)=>a-b),i=Math.floor(a.length/2);return a.length%2?a[i]:(a[i-1]+a[i])/2;};
 const rowId=id=>'purchase-row-'+encodeURIComponent(String(id));
 function build(state,now=Date.now()){
  const empty={available:false,sell:[],restock:[],review:[],latestPurchase:null,latestSale:null};
  if(!Array.isArray(state.purchaseProfit)||!Array.isArray(state.purchases))return empty;
  if(state.salesMonth&&state.purchaseMonth&&state.salesMonth!==state.purchaseMonth)return empty;
  const profits=new Map(state.purchaseProfit.map(r=>[String(r.purchase_id),r])),forecasts=new Map((state.purchaseForecast||[]).map(r=>[r.id,r])),groups=new Map(),entities=[];
  let latestPurchase=null,latestSale=null;
  for(const p of state.purchases.filter(p=>p.status==='purchased')){
   const ordered=stamp(p.ordered_at);if(ordered!==null&&ordered<=now)latestPurchase=Math.max(latestPurchase||0,ordered);
   const r=profits.get(String(p.id));if(!r)continue;
   const list=r.bundle?(r.components||[]):[{...r,id:'purchase:'+p.id}];
   for(const e of list){
    const key=r.bundle?JSON.stringify(['component',norm(e.component_key)||e.id,norm(p.variant)]):JSON.stringify(['item',p.supplier_key,norm(p.sku||p.product_name),norm(p.variant)]);
    const item={purchase_id:p.id,name:r.bundle?(e.component_name||e.component_key):p.product_name,variant:p.variant||'',bundle:r.bundle===true,ordered_at:ordered,remaining:known(e.remaining_quantity),cost:known(e.unit_cost_yen),table_profit:known(e.remaining_profit_yen),table_priced_quantity:known(e.remaining_priced_quantity)??known(e.remaining_quantity),sales:e.sales||[],forecast:forecasts.get(e.id),key};
    entities.push(item);if(!groups.has(key))groups.set(key,{items:[],sales:new Map()});const g=groups.get(key);g.items.push(item);
    for(const s of item.sales){
     const at=stamp(s.sold_at),net=known(s.net_yen),id=s.sale_row_id;
     if(at!==null&&at<=now&&s.status!=='manual')latestSale=Math.max(latestSale||0,at);
     // Shared receipts, bundles sold as a lot and pending transactions cannot teach a unit price.
     if(s.status!=='completed'||Number(s.quantity)!==1||!id||net===null||net<0||at===null||at>now||ordered===null||at<ordered||String(s.note||'').includes('数量比で仮配分'))continue;
     if(!g.sales.has(String(id)))g.sales.set(String(id),{id,at,net,days:Math.ceil((at-ordered)/DAY),estimated:s.estimated===true});
    }
   }
  }
  const sell=[],restock=[],review=[];
  for(const g of groups.values()){
   const recent=[...g.sales.values()].filter(s=>now-s.at<=30*DAY).sort((a,b)=>b.at-a.at).slice(0,5),net=recent.length?median(recent.map(s=>s.net)):null,last=recent[0]?.at??null;
   const candidates=g.items.filter(e=>e.remaining>0&&e.ordered_at!==null&&e.ordered_at<=now).map(e=>{
    const f=e.forecast,at=stamp(f?.reference_at),fresh=at!==null&&at<=now&&now-at<=7*DAY,appraisal=f?.basis==='saved_appraisal'&&fresh?known(f.net_per_unit_yen):null;
    const received=net??appraisal,referenceProfit=received!==null&&e.cost!==null?round(received-e.cost):null,profit=referenceProfit>0&&e.table_profit>0&&e.table_priced_quantity>0?round(e.table_profit/e.table_priced_quantity):null;
    return {...e,profit,reference:last??(appraisal!==null?at:null),basis:net!==null?'sales_history':appraisal!==null?'saved_appraisal':null,count:recent.length,days:recent.length?median(recent.map(s=>s.days)):null};
   });
   // One product/variant per suggestion; show all recorded lots together.
   const priced=candidates.filter(e=>e.profit>0).sort((a,b)=>b.profit-a.profit||a.ordered_at-b.ordered_at);
   if(priced.length){const best=priced[0];sell.push({...best,lot_remaining:best.remaining,remaining:candidates.reduce((n,e)=>n+e.remaining,0),priced_remaining:priced.reduce((n,e)=>n+e.remaining,0)});}
   if(recent.length>=2&&g.items.every(e=>e.remaining!==null&&e.remaining>=0)){
    const latest=g.items.filter(e=>e.cost!==null&&e.ordered_at!==null&&e.ordered_at<=now).sort((a,b)=>b.ordered_at-a.ordered_at)[0];
    if(latest){const profit=round(net-latest.cost);if(profit>0)restock.push({...latest,profit,reference:last,count:recent.length,days:median(recent.map(s=>s.days)),remaining:g.items.reduce((n,e)=>n+(e.remaining||0),0),has_stock:g.items.some(e=>e.remaining>0)});}
   }
   const old=candidates.filter(e=>now-e.ordered_at>=60*DAY).sort((a,b)=>a.ordered_at-b.ordered_at);
   if(old.length)review.push({...old[0],age:Math.floor((now-old[0].ordered_at)/DAY),remaining:old.reduce((n,e)=>n+e.remaining,0),capital:old.every(e=>e.cost!==null)?round(old.reduce((n,e)=>n+e.remaining*e.cost,0)):null});
  }
  sell.sort((a,b)=>Number(b.basis==='sales_history')-Number(a.basis==='sales_history')||b.profit-a.profit||(b.reference||0)-(a.reference||0));
  restock.sort((a,b)=>Number(a.has_stock)-Number(b.has_stock)||b.profit-a.profit||a.days-b.days);
  review.sort((a,b)=>(b.capital??-1)-(a.capital??-1)||b.age-a.age);
  return {available:true,sell:sell.slice(0,3),restock:restock.slice(0,3),review:review.slice(0,3),latestPurchase,latestSale};
 }
 function html(state,now=Date.now()){
  const a=build(state,now);if(!a.available)return '';
  const target=e=>'<button type="button" class="push-button purchase-action-jump" data-profit-purchase="'+esc(e.purchase_id)+'"'+(e.bundle?' data-profit-component="true"':'')+'>商品行を見る</button>';
  const identity=e=>'<b>'+esc(e.name)+'</b>'+(e.variant?'<span>'+esc(e.variant)+'</span>':'')+(e.bundle?'<small>福袋のバラ商品</small>':'');
  const sell=a.sell.map(e=>'<li>'+identity(e)+'<strong>残り見込み '+money(e.table_profit)+'</strong><small>この仕入れ分の残数目安 '+e.lot_remaining+'点'+' · '+(e.basis==='sales_history'?'直近30日の成約 '+e.count+'件／最終 '+date(e.reference):'保存査定 '+date(e.reference))+'</small>'+target(e)+'</li>').join('');
  const restock=a.restock.map(e=>'<li>'+identity(e)+'<strong>前回原価 '+money(e.cost)+'なら１点 '+money(e.profit)+'の目安</strong><small>直近30日の成約 '+e.count+'件 · 購入→成約 中央値 '+e.days+'日 · 残数目安 '+e.remaining+'点'+(e.has_stock?'（手持ちを先に確認）':'')+'</small>'+target(e)+'</li>').join('');
  const review=a.review.map(e=>'<li>'+identity(e)+'<small>購入から '+e.age+'日 · 残数目安 '+e.remaining+'点'+(e.capital!==null?' · 仕入原価 '+money(e.capital)+'分':'')+'</small>'+target(e)+'</li>').join('');
  return '<section class="purchase-profit-actions" aria-label="利益に変える候補"><h2>手持ちから売る候補</h2><p>この購入期間の記録から、直近の成約がある商品を優先。購入表の１点あたり見込みが大きい順に最大３件。金額は表と同じ残り分の見込みです。</p>'+(sell?'<ul class="purchase-action-cards">'+sell+'</ul>':'<p class="purchase-action-empty">直近30日の成約、または７日以内の保存査定から、利益を計算できる残り商品はありません。</p>')+(restock?'<details><summary>再仕入れの調査候補 '+a.restock.length+'件</summary><p>同商品・同仕様の成約が２件以上あるもの。残数目安０を先に表示しています。現在の仕入値・競合・送料を再確認してから判断します。</p><ul class="purchase-action-cards">'+restock+'</ul></details>':'')+(review?'<details><summary>長く残っている記録を確認 '+a.review.length+'件</summary><p>購入から60日以上の記録を、残り分の仕入原価が大きい順に表示。未照合の売却もあるため、売れ残りや値下げ対象とは断定できません。</p><ul class="purchase-action-cards">'+review+'</ul></details>':'')+'<p class="purchase-action-caution">儲けは手数料・送料控除後の概算。掲載済みかは未確認です。商品行・実物・現在の競合価格を確認して出品へ。'+(a.latestPurchase?' この購入期間の最新購入 '+date(a.latestPurchase)+'。':'')+(a.latestSale?' 対応する最新成約記録 '+date(a.latestSale)+'。':'')+'記録以降の取込完了は未確認。</p></section>';
 }
 return {build,html,rowId};
});
