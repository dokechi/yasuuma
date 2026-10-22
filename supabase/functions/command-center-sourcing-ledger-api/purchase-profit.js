/* Purchase-led presentation. Inferred matches never write sales, purchases or stock. */
(function(root,factory){const M=typeof module==='object'&&module.exports?require('./profit-model.js'):root.CCLedgerProfit,F=typeof module==='object'&&module.exports?require('./profit-forecast.js'):root.CCLedgerForecast,api=factory(M,F);if(typeof module==='object'&&module.exports)module.exports=api;else root.CCPurchaseProfit=api;})(typeof window==='undefined'?globalThis:window,function(M,F){
 'use strict';
 const round=n=>Math.round(n*100)/100,active=s=>['completed','in_progress'].includes(s.status);
 const add=(map,key,v)=>{key=String(key);if(!map.has(key))map.set(key,[]);map.get(key).push(v);};
 function build({sales,purchases,allocations=[],components=[],componentAllocations=[],signals=[]}){
  const ps=purchases.filter(p=>p.status==='purchased'),byP=new Map(ps.map(p=>[String(p.id),p])),byC=new Map(components.map(c=>[String(c.id),c])),direct=new Map(),split=new Map(),entities=new Map(),rawSold=new Map();
  const unitRows=ps.map(p=>({...p,metadata:{...p.metadata,bundle_decomposed:false}})),costs=M.costs(ps.map(p=>({id:p.id,quantity:1})),ps.map(p=>({sale_row_id:p.id,purchase_id:p.id,quantity:1,confidence:'exact'})),unitRows);
  const unit=p=>costs.get(String(p.id))?.purchase_cost_yen??null;
  const newEntity=(id,p,quantity,cost)=>({id,purchase_id:p.id,initial_quantity:quantity,unit_cost_yen:cost,sold_quantity:0,sales:[]});
  for(const p of ps){
   const cs=components.filter(c=>String(c.purchase_id)===String(p.id));
   if(p.metadata?.bundle_decomposed){const parts=cs.reduce((n,c)=>n+Number(c.quantity_per_bundle||0),0);for(const c of cs)entities.set('component:'+c.id,newEntity('component:'+c.id,p,Number(c.initial_quantity),unit(p)!==null&&parts?unit(p)/parts:null));}
   else entities.set('purchase:'+p.id,newEntity('purchase:'+p.id,p,Number(p.quantity),unit(p)));
  }
  for(const a of allocations)add(direct,a.sale_row_id,a);
  for(const a of componentAllocations)add(split,a.sale_row_id,a);
  const cleanSales=[],ordered=sales.filter(active).sort((a,b)=>Number((direct.get(String(b.id))||[]).length+(split.get(String(b.id))||[]).length>0)-Number((direct.get(String(a.id))||[]).length+(split.get(String(a.id))||[]).length>0)||(Date.parse(a.sold_at)||0)-(Date.parse(b.sold_at)||0)||Number(a.id)-Number(b.id));
  for(const s of ordered){
   const ds=direct.get(String(s.id))||[],cs=split.get(String(s.id))||[];
   for(const a of ds)rawSold.set(String(a.purchase_id),(rawSold.get(String(a.purchase_id))||0)+Number(a.quantity||0));
   let links=s.cost_purchase_links||[],parts=s.cost_component_links||[];
   if(!links.length&&!parts.length){
    if(ds.length&&ds.every(a=>['exact','high'].includes(a.confidence))&&ds.reduce((n,a)=>n+Number(a.quantity||0),0)===Number(s.quantity))links=ds;
    else if(cs.length&&cs.every(a=>['exact','high'].includes(a.confidence))&&cs.reduce((n,a)=>n+Number(a.quantity||0),0)>=Number(s.quantity))parts=cs;
   }
   const clean={...s,matched_purchase_id:null,cost_purchase_links:[],cost_component_links:[]};cleanSales.push(clean);
   if(links.length&&parts.length)continue;
   const list=(links.length?links:parts).map(a=>{const c=a.component_id?byC.get(String(a.component_id)):null,p=byP.get(String(c?.purchase_id??a.purchase_id)),id=c?'component:'+c.id:'purchase:'+a.purchase_id;return {a,p,entity:entities.get(id),quantity:M.known(a.quantity)};});
   const demand=new Map();for(const x of list)if(x.entity)demand.set(x.entity.id,(demand.get(x.entity.id)||0)+(x.quantity||0));
   if(!list.length||list.some(x=>!x.p||!x.entity||!x.quantity||!Number.isFinite(Date.parse(x.p.ordered_at))||!Number.isFinite(Date.parse(s.sold_at))||Date.parse(x.p.ordered_at)>Date.parse(s.sold_at)||x.entity.sold_quantity+demand.get(x.entity.id)>x.entity.initial_quantity))continue;
   clean.cost_purchase_links=links.map(a=>({purchase_id:a.purchase_id,quantity:a.quantity}));clean.cost_component_links=parts.map(a=>({component_id:a.component_id,quantity:a.quantity}));
   const r=M.projected(s),quantity=list.reduce((n,x)=>n+x.quantity,0);let assigned=0;
   list.forEach((x,index)=>{
    const net=r.received===null?null:index===list.length-1?round(r.received-assigned):round(r.received*x.quantity/quantity);if(net!==null)assigned+=net;
    const cost=x.entity.unit_cost_yen===null?null:round(x.entity.unit_cost_yen*x.quantity),exact=ds.some(a=>String(a.purchase_id)===String(x.a.purchase_id)&&a.confidence==='exact'&&Number(a.quantity)===x.quantity);
    x.entity.sold_quantity+=x.quantity;
    x.entity.sales.push({sale_row_id:s.id,sale_id:s.sale_id||null,product_name:s.product_name,marketplace:s.marketplace,status:s.status,quantity:x.quantity,sold_at:s.sold_at,net_yen:net,cost_yen:cost,profit_yen:net!==null&&cost!==null?round(net-cost):null,estimated:r.estimated||!exact||list.length>1||s.status==='in_progress',note:[s.cost_estimate_note,...r.notes,list.length>1?'複数商品への手取りは数量比で仮配分':''].filter(Boolean).join(' / ')});
   });
  }
  // A minimum-sold floor is absorbed by newly found sales, rather than subtracted twice.
  const forecastPurchases=ps.map(p=>{
   const entity=entities.get('purchase:'+p.id),adjustment=M.known(p.adjustment_quantity)||0,manual=entity&&adjustment?Math.max(0,(rawSold.get(String(p.id))||0)+adjustment-entity.sold_quantity):0;
   if(entity&&manual){entity.manual_quantity=Math.min(manual,Math.max(0,entity.initial_quantity-entity.sold_quantity));entity.sold_quantity+=entity.manual_quantity;}
   return {...p,adjustment_quantity:entity?.manual_quantity||0};
  });
  const forecasts=F.forecast({sales:cleanSales,purchases:forecastPurchases,allocations:[],components,componentAllocations:[],signals,includeSoldOut:true});
  for(const f of forecasts){
   const e=entities.get(f.id);if(!e)continue;
   e.remaining_quantity=f.remaining_quantity;e.remaining_profit_yen=f.remaining_quantity===0?0:f.profit_yen;e.net_per_unit_yen=f.net_per_unit_yen;e.reference_note=f.note;e.reference_at=f.reference_at;e.basis=f.basis;
   if(e.manual_quantity)e.sales.push({quantity:e.manual_quantity,status:'manual',profit_yen:f.net_per_unit_yen!==null&&e.unit_cost_yen!==null?round((f.net_per_unit_yen-e.unit_cost_yen)*e.manual_quantity):null,estimated:true,note:'実数確認済みの販売数。手取りは保存査定・同商品の販売記録による目安'});
  }
  function summarize(list){
   const entries=list.flatMap(e=>e.sales),priced=entries.filter(s=>s.profit_yen!==null),qty=s=>s.reduce((n,r)=>n+r.quantity,0),remaining=list.filter(e=>e.remaining_quantity>0),pricedRemaining=remaining.filter(e=>e.remaining_profit_yen!==null);
   return {sold_quantity:list.reduce((n,e)=>n+e.sold_quantity,0),sold_profit_yen:priced.length?round(priced.reduce((n,s)=>n+s.profit_yen,0)):null,sold_priced_quantity:qty(priced),sold_unpriced_quantity:qty(entries.filter(s=>s.profit_yen===null)),sold_estimated_quantity:qty(priced.filter(s=>s.estimated)),in_progress_quantity:qty(entries.filter(s=>s.status==='in_progress')),remaining_profit_yen:!remaining.length?0:pricedRemaining.length?round(pricedRemaining.reduce((n,e)=>n+e.remaining_profit_yen,0)):null,remaining_priced_quantity:pricedRemaining.reduce((n,e)=>n+e.remaining_quantity,0),remaining_unpriced_quantity:remaining.filter(e=>e.remaining_profit_yen===null).reduce((n,e)=>n+e.remaining_quantity,0),sales:entries};
  }
  const rows=ps.map(p=>{
   const cs=components.filter(c=>String(c.purchase_id)===String(p.id)),list=p.metadata?.bundle_decomposed?cs.map(c=>entities.get('component:'+c.id)).filter(Boolean):[entities.get('purchase:'+p.id)].filter(Boolean),summary=summarize(list);
   let remaining=p.quantity,loose=0;
   if(p.metadata?.bundle_decomposed&&list.length){remaining=Math.min(...cs.map(c=>Math.floor((entities.get('component:'+c.id)?.remaining_quantity??0)/Number(c.quantity_per_bundle||1))));loose=list.reduce((n,e)=>n+(e.remaining_quantity||0),0)-remaining*cs.reduce((n,c)=>n+Number(c.quantity_per_bundle||1),0);}
   else if(list.length)remaining=list[0].remaining_quantity??Math.max(0,p.quantity-list[0].sold_quantity);
   return {purchase_id:p.id,ordered_at:p.ordered_at,unit_cost_yen:unit(p),...summary,remaining_quantity:remaining,remaining_loose_quantity:loose,bundle:p.metadata?.bundle_decomposed===true,components:p.metadata?.bundle_decomposed?cs.map(c=>({...entities.get('component:'+c.id),component_name:c.component_name,component_key:c.component_key})):[],reference_note:list.map(e=>e.reference_note).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(' / ')};
  });
  return {rows,forecast:forecasts.filter(f=>f.remaining_quantity>0)};
 }
 return {build};
});
