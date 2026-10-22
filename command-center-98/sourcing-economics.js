/* Recalculate saved, per-unit assumptions. Missing evidence is never zero. */
(function(root,factory){
 'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CCSourcingEconomics=api;
})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const value=(p,keys)=>keys.map(k=>p?.[k]).find(v=>v!==null&&v!==undefined&&v!=='');
 function number(v){if(typeof v==='number')return Number.isFinite(v)?v:null;if(typeof v!=='string'||!v.trim())return null;const s=v.trim().replace(/[,￥¥円\s]/g,'');return /^-?\d+(?:\.\d+)?$/.test(s)&&Number.isFinite(Number(s))?Number(s):null;}
 const money=(p,keys)=>number(value(p,keys));
 const url=v=>{try{const u=new URL(v);return /^https?:$/.test(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}};
 function competitor(p,now){
  const records=Array.isArray(p.active_competitors)?p.active_competitors:Array.isArray(p.competitors)?p.competitors:[];
  const scalar=money(p,['lowest_active_price_yen','active_lowest_price_yen','competitor_lowest_price_yen','current_competitor_price_yen','mercari_active_lowest_price_yen','lowest_competitor_price_yen']);
  const rows=[...records];if(scalar!==null)rows.push({price_yen:scalar,url:value(p,['competitor_url','lowest_active_url','mercari_active_lowest_url']),checked_at:value(p,['competitor_checked_at','competition_checked_at','market_checked_at']),same_product:p.competitor_same_product,status:'active'});
  const valid=rows.filter(r=>r&&['active','on_sale','販売中'].includes(r.status)&&r.same_product===true&&url(r.url)&&number(r.price_yen??r.price)>0&&Number.isFinite(Date.parse(r.checked_at))&&Date.parse(r.checked_at)<=now&&now-Date.parse(r.checked_at)<=7*86400000);
  return valid.length?Math.min(...valid.map(r=>number(r.price_yen??r.price))):null;
 }
 function assess(item,fields={},p=item?.payload||{},now=Date.now()){
  const issues=[],missing=[];const buy=number(fields.buy),sell=number(fields.sell);
  if(!(buy>0))missing.push('仕入値');if(!(sell>0))missing.push('想定売価');
  let cost=money(p,['total_cost_yen','total_purchase_cost_yen','送料込み仕入総額_1箱換算']);
  if(cost===null){const incoming=money(p,['inbound_shipping_per_unit_yen','purchase_shipping_per_unit_yen']);if(buy!==null&&incoming!==null&&incoming>=0)cost=buy+incoming;else if(buy!==null&&p.purchase_shipping_included===true)cost=buy;}
  if(cost===null)missing.push('送料込み仕入原価');else if(cost<0||buy!==null&&cost<buy)issues.push('送料込み原価が仕入値未満');
  let fee=money(p,['mercari_fee_yen','selling_fee_yen','販売手数料']);
  const percent=money(p,['selling_fee_percent','mercari_fee_percent','fee_percent']);const rate=percent!==null?percent/100:money(p,['selling_fee_rate','mercari_fee_rate','fee_rate']);
  if(rate!==null&&(rate<0||rate>1))issues.push('手数料率の形式');
  const computedFee=sell>0&&rate!==null&&rate>=0&&rate<=1?Math.ceil(sell*rate):null;
  if(fee===null)fee=computedFee;else if(computedFee!==null&&Math.abs(fee-computedFee)>1)issues.push('販売手数料と売価が不整合');
  if(fee===null)missing.push('販売手数料');else if(fee<0||sell!==null&&fee>sell)issues.push('販売手数料の金額');
  const shipping=money(p,['outbound_shipping_yen','shipping_to_buyer_yen','発送費']);
  if(shipping===null)missing.push('発送費');else if(shipping<0)issues.push('発送費の金額');
  const otherRaw=value(p,['other_cost_yen','packaging_cost_yen']),other=otherRaw===undefined?0:number(otherRaw);
  if(other===null||other<0)missing.push('その他費用');
  const complete=[sell,cost,fee,shipping,other].every(n=>n!==null&&n>=0),profit=complete?sell-cost-fee-shipping-other:null;
  if(buy>0&&sell>0&&sell<=buy)issues.push('想定売価が仕入値以下');
  if(profit!==null&&profit<=0)issues.push('再計算すると利益なし');
  const claimed=number(item?.impact??value(p,['net_profit_yen','estimated_profit_yen','expected_profit_yen']));
  if(claimed!==null&&profit!==null&&Math.abs(claimed-profit)>1)issues.push('保存利益と再計算が不一致');
  const ceiling=competitor(p,now);
  if(ceiling===null)missing.push('同条件の販売中競合（価格・URL・確認日）');else if(sell>ceiling)issues.push('想定売価が保存競合の最安値を超過');
  const status=issues.length?'fail':missing.length?'hold':'pass';
  return {ok:status==='pass',status,issues:[...new Set(issues)],missing:[...new Set(missing)],buy,sell,cost,fee,shipping,other,profit,roi:profit!==null&&cost>0?profit/cost*100:null,competitorPrice:ceiling,
   note:status==='pass'?'保存条件の採算整合を確認':(status==='fail'?'採算NG：':'採算保留：')+[...new Set(issues.length?issues:missing)].join('・')};
 }
 return {number,assess,competitor};
});
