/* Read-only forecasts. Candidate allocations reduce forecast stock, never source inventory. */
(function(root,factory){const M=typeof module==='object'&&module.exports?require('./profit-model.js'):root.CCLedgerProfit,api=factory(M);if(typeof module==='object'&&module.exports)module.exports=api;else root.CCLedgerForecast=api;})(typeof window==='undefined'?globalThis:window,function(M){
 'use strict';
 const norm=v=>String(v||'').normalize('NFKC').toLowerCase(),round=v=>Math.round(v*100)/100;
 const active=s=>['completed','in_progress'].includes(s.status);
 const family=p=>JSON.stringify([p.supplier_key,norm(p.sku||p.product_name),norm(p.variant)]);
 const value=(p,keys)=>keys.map(k=>p?.[k]).find(v=>v!==undefined&&v!==null&&v!=='');
 const amount=(p,keys)=>M.known(value(p,keys));
 const size=v=>norm(v).match(/\bus\s*\d+(?:\.\d+)?|\bm\d+|\b\d{2}(?:\.\d+)?\s*cm|(?:^|[^a-z0-9])(2xl|xl|xs|s|m|l)(?=$|[^a-z0-9])/g)?.map(s=>s.trim().replace(/\s|\.0(?=cm)/g,''))||[];
 const colors=v=>{const t=norm(v);return [['black',/black|ブラック|黒/],['white',/white|ホワイト|白/],['navy',/navy|ネイビー|紺/],['grey',/gr[ae]y|\bgry\b|グレー/],['pink',/pink|ピンク/],['beige',/beige|ベージュ/],['green',/green|グリーン|緑/],['blue',/blue|ブルー|青/]].filter(([,r])=>r.test(t)).map(([s])=>s);};
 function plans(signals){return signals.map(s=>{const p=s.payload||{},v=p.sourcing_v2||{},i=v.identity||{},e=v.economics||{};return {id:s.id,title:s.title,at:p.checked_at_jst||e.calculation_checked_at||s.detected_at,model:value(p,['model','manufacturer_model','sku','model_number'])||i.manufacturer_model||i.jan,jan:p.jan||i.jan,size:value(p,['inventory_size','size','size_label'])||i.size,color:value(p,['inventory_color','color'])||i.color,sell:amount(p,['conservative_sale_yen','conservative_sale_price_yen','mercari_conservative_sale_yen'])??M.known(e.conservative_sale_price_yen),fee:amount(p,['mercari_fee_yen_conservative','mercari_fee_yen','selling_fee_yen'])??M.known(e.selling_fee_yen),shipping:amount(p,['selling_shipping_yen','outbound_shipping_yen','shipping_to_buyer_yen'])??M.known(e.outbound_shipping_yen)};}).filter(p=>p.sell!==null&&p.sell>0);}
 function matchingPlan(p,records){const identity=norm([p.sku,p.product_name].join(' ')),ps=size(p.variant),pc=colors(p.variant);return records.filter(r=>{
  const model=norm(r.model),jan=norm(r.jan);if(!model&&!jan)return false;
  const tokens=identity.split(/[^a-z0-9-]+/).filter(Boolean);if(!(model&&tokens.includes(model)||jan&&tokens.includes(jan)))return false;
  const rs=size(r.size),rc=colors(r.color);if(ps.length&&rs.length&&!ps.some(x=>rs.includes(x)))return false;if(pc.length&&rc.length&&!pc.some(x=>rc.includes(x)))return false;
  return true;
 }).sort((a,b)=>(Date.parse(b.at)||0)-(Date.parse(a.at)||0))[0]||null;}
 function forecast({sales,purchases,allocations,components=[],componentAllocations=[],signals=[]}){
  const ps=purchases.filter(p=>p.status==='purchased'),byP=new Map(ps.map(p=>[String(p.id),p])),byC=new Map(components.map(c=>[String(c.id),c]));
  const direct=new Map(),split=new Map(),used=new Map(),componentUsed=new Map(),refs=new Map(),records=plans(signals),output=[];
  const add=(map,key,v)=>{key=String(key);if(!map.has(key))map.set(key,[]);map.get(key).push(v);};
  const reserve=(map,key,qty)=>map.set(String(key),(map.get(String(key))||0)+(M.known(qty)||0));
  for(const a of allocations)add(direct,a.sale_row_id,a);for(const a of componentAllocations)add(split,a.sale_row_id,a);
  for(const p of ps)reserve(used,p.id,p.adjustment_quantity);
  for(const s of sales.filter(active)){
   const ds=direct.get(String(s.id))||[],cs=split.get(String(s.id))||[],links=ds.length?ds:s.cost_purchase_links||[],parts=cs.length?cs:s.cost_component_links||[];
   for(const a of links)reserve(used,a.purchase_id,a.quantity);for(const a of parts)reserve(componentUsed,a.component_id,a.quantity);
   if(!links.length&&!parts.length&&s.matched_purchase_id)reserve(used,s.matched_purchase_id,s.quantity);
   if(s.status!=='completed'||Number(s.quantity)!==1)continue;
   const received=M.projected(s).received;if(received===null)continue;
   const costLinks=s.cost_purchase_links||[],componentLinks=s.cost_component_links||[];
   if(costLinks.length===1&&Number(costLinks[0].quantity)===1){const p=byP.get(String(costLinks[0].purchase_id));if(p)add(refs,family(p),{received,at:s.completed_at||s.sold_at});}
   if(componentLinks.length===1&&Number(componentLinks[0].quantity)===1){const c=byC.get(String(componentLinks[0].component_id));if(c)add(refs,'component:'+c.component_key,{received,at:s.completed_at||s.sold_at});}
  }
  const unitRows=ps.map(p=>({...p,metadata:{...p.metadata,bundle_decomposed:false}})),unitCosts=M.costs(ps.map(p=>({id:p.id,quantity:1})),ps.map(p=>({sale_row_id:p.id,purchase_id:p.id,quantity:1,confidence:'exact'})),unitRows);
  const unit=p=>unitCosts.get(String(p.id))?.purchase_cost_yen??null;
  function reference(key){const recent=(refs.get(key)||[]).sort((a,b)=>(Date.parse(b.at)||0)-(Date.parse(a.at)||0)).slice(0,5);if(!recent.length)return null;const values=recent.map(r=>r.received).sort((a,b)=>a-b),mid=Math.floor(values.length/2);return {received:values.length%2?values[mid]:(values[mid-1]+values[mid])/2,note:'同商品の直近'+recent.length+'件の販売手取り中央値（送料等の仮計算を含む）',basis:'sales_history',at:recent[0].at};}
  function record(p,id,name,remaining,cost,key,component=false){
   if(remaining<=0)return;
   const plan=component?null:matchingPlan(p,records);let ref=null;
   if(plan){const r=M.projected({marketplace:'mercari',product_name:p.product_name+' '+p.variant,gross_sale_yen:plan.sell,fee_yen:plan.fee,shipping_yen:plan.shipping,purchase_cost_yen:cost});if(r.received!==null)ref={received:r.received,note:'保存査定の想定売価 '+plan.sell+'円から販売手数料・発送送料を控除（古い査定・省略仕様は未更新）',basis:'saved_appraisal',at:plan.at};}
   ref=ref||reference(key);
   output.push({id,purchase_id:p.id,ordered_at:p.ordered_at,product_name:name,variant:p.variant,remaining_quantity:remaining,unit_cost_yen:cost,net_per_unit_yen:ref?.received??null,profit_yen:cost!==null&&ref?round((ref.received-cost)*remaining):null,basis:ref?.basis||null,reference_at:ref?.at||null,note:cost===null?'仕入原価・仕入送料を確認中':ref?.note||'保存査定・同商品の販売記録を確認中'});
  }
  for(const p of ps){
   if(p.metadata?.bundle_decomposed){const list=components.filter(c=>String(c.purchase_id)===String(p.id)),parts=list.reduce((n,c)=>n+(M.known(c.quantity_per_bundle)||0),0),cost=unit(p);for(const c of list)record(p,'component:'+c.id,c.component_name||c.component_key,Math.max(0,Number(c.initial_quantity)-(componentUsed.get(String(c.id))||0)),cost!==null&&parts?cost/parts:null,'component:'+c.component_key,true);continue;}
   record(p,'purchase:'+p.id,p.product_name,Math.max(0,Number(p.quantity)-(used.get(String(p.id))||0)),unit(p),family(p));
  }
  return output;
 }
 return {forecast};
});
