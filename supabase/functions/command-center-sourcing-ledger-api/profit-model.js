/* Shared read-only arithmetic for the ledger API and the browser. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CCLedgerProfit=api;})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const numeric=v=>v===null||v===undefined||typeof v==='boolean'||typeof v==='string'&&!v.trim()||!Number.isFinite(Number(v))?null:Number(v);
 const known=v=>{const n=numeric(v);return n!==null&&n>=0?n:null;};
 const lineCost=p=>known(p.allocated_net_line_yen)??(known(p.order_discount_yen)===0?known(p.line_total_yen):null);
 const market=v=>['yahoo','yahoo_fleamarket','paypay_fleamarket'].includes(v)?'ヤフーフリマ':v==='mercari'?'メルカリ':v==='mercari_shops'?'メルカリShops':['yuyutei','yuyu_tei'].includes(v)?'遊々亭':String(v||'その他');
 function net(s){
  const received=numeric(s.net_received_yen);if(received!==null)return received;
  const gross=known(s.gross_sale_yen),deductions=known(s.aggregate_deductions_yen),fee=known(s.fee_yen),shipping=known(s.shipping_yen);
  if(gross!==null&&deductions!==null)return gross-deductions;
  return gross!==null&&fee!==null&&shipping!==null?gross-fee-shipping:null;
 }
 function month(s){const raw=s.completed_at||s.sold_at;if(!raw||!Number.isFinite(Date.parse(raw)))return '';return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit'}).format(new Date(raw));}
 function result(s){const cost=known(s.purchase_cost_yen),received=net(s);return {cost,received,profit:cost!==null&&received!==null?received-cost:null};}
 function projected(s){const actual=result(s);let cost=actual.cost??known(s.estimated_purchase_cost_yen),received=actual.received,fee=null,shipping=null,legacy=false;const notes=[];
  if(actual.cost===null&&cost!==null)notes.push(s.cost_estimate_note||'仕入原価を推計');
  const yahoo=['yahoo','yahoo_fleamarket','paypay_fleamarket'].includes(s.marketplace),gross=known(s.gross_sale_yen)??(yahoo?known(s.gross_payment_yen):null);
  if(received===null&&(s.marketplace==='mercari'||yahoo)&&gross!==null){const name=String(s.product_name||'');if(!/INNOCN|モニター|トランク|スーツケース|椅子|冷蔵庫/i.test(name)){
   fee=known(s.fee_yen)??(yahoo?Math.ceil(gross*.05):Math.floor(gross*.1));shipping=known(s.shipping_yen)??(/cm|クロッグ|スニーカー|サンダル|シューズ|ブーツ|サイドゴア/i.test(name)&&!/ソックス|靴下|タオル/.test(name)?870:220);received=gross-fee-shipping;
   if(known(s.gross_sale_yen)===null)notes.push('購入者の支払受付額を仮の売価として使用');
   if(known(s.fee_yen)===null)notes.push(yahoo?'ヤフーフリマ手数料を概算5%で仮計算（端数・優遇・同時掲載は未反映）':'販売手数料10%で仮計算');if(known(s.shipping_yen)===null)notes.push('発送送料'+shipping+'円で仮計算');
  }}
  if(cost===null&&received!==null&&s.profit_estimate_policy==='legacy_or_unknown_net_40'){
   legacy=true;notes.push(s.cost_estimate_note||'旧在庫・購入時期未確認：販売の手取りの40%を儲けとして仮計算');
   // A negative receipt remains a loss; the rule must never erase selling costs.
   cost=received>=0?Math.round(received*.6*100)/100:0;
  }
  return {cost,received,profit:cost!==null&&received!==null?Math.round((received-cost)*100)/100:null,estimated:actual.profit===null,legacy,notes,fee,shipping};
 }
 function inProgress(rows,selectedMonth){const list=rows.filter(s=>s.status==='in_progress'&&(!selectedMonth||month({...s,completed_at:null})===selectedMonth)),ready=list.filter(s=>projected(s).profit!==null);return {total:list.length,computed:ready.length,pending:list.length-ready.length,profit:ready.length?Math.round(ready.reduce((n,s)=>n+projected(s).profit,0)*100)/100:null};}
 function summarize(rows,selectedMonth,includeEstimates=false){
  const settled=rows.filter(s=>s.status==='completed'&&(!selectedMonth||month(s)===selectedMonth)),confirmed=settled.filter(s=>result(s).profit!==null),calc=includeEstimates?projected:result,computed=settled.filter(s=>calc(s).profit!==null);
  const totals=computed.reduce((a,s)=>{const r=calc(s);a.cost+=r.cost;a.received+=r.received;a.profit+=r.profit;return a;},{cost:0,received:0,profit:0});
  const groups=[...new Set(settled.map(s=>market(s.marketplace)))].map(name=>{const list=settled.filter(s=>market(s.marketplace)===name),ready=list.filter(s=>calc(s).profit!==null),actual=list.filter(s=>result(s).profit!==null);return {name,confirmed:actual.length,estimated:ready.length-actual.length,computed:ready.length,pending:list.length-ready.length,profit:ready.length?ready.reduce((n,s)=>n+calc(s).profit,0):null};});
  const legacy=includeEstimates?computed.filter(s=>projected(s).legacy):[];
  return {...totals,legacy:legacy.length,legacyProfit:legacy.reduce((n,s)=>n+projected(s).profit,0),confirmed:confirmed.length,confirmedProfit:confirmed.reduce((n,s)=>n+result(s).profit,0),estimated:computed.length-confirmed.length,computed:computed.length,pending:settled.length-computed.length,settled:settled.length,inProgress:rows.filter(s=>s.status==='in_progress'&&(!selectedMonth||month(s)===selectedMonth)).length,groups};
 }
 function costs(sales,allocations,purchases){
  const byId=new Map(purchases.map(p=>[String(p.id),p])),orders=new Map();
  const orderKey=p=>JSON.stringify([p.supplier_key,p.order_id||p.source_message_id||String(p.id)]);
  for(const p of purchases){const key=orderKey(p);if(!orders.has(key))orders.set(key,[]);orders.get(key).push(p);}
  const output=new Map();
  for(const sale of sales){const matches=allocations.filter(a=>String(a.sale_row_id)===String(sale.id)),qty=known(sale.quantity);let total=0,reason='';
   if(!matches.length||!qty||matches.reduce((n,a)=>n+(known(a.quantity)||0),0)!==qty)reason='売れた数量と仕入れの対応を確認中';
   for(const a of reason?[]:matches){const p=byId.get(String(a.purchase_id));if(a.confidence!=='exact'||!p||p.status!=='purchased'){reason='仕入れとの一致を確認中';break;}
    if(p.ordered_at&&sale.sold_at&&Date.parse(p.ordered_at)>Date.parse(sale.sold_at)){reason='販売日より後の仕入れ割当を確認中';break;}
    if(p.metadata?.landed_cost_pending_import_duties===true){reason='輸入諸費用を確認中';break;}
    if(p.metadata?.bundle_decomposed===true){reason='セット原価の配分を確認中';break;}
    const units=known(p.quantity),unitsSold=known(a.quantity),line=lineCost(p),order=orders.get(orderKey(p))||[],shippingValues=order.map(p=>known(p.order_shipping_yen));
    if(!units||!unitsSold||unitsSold>units||line===null||shippingValues.some(v=>v===null)||new Set(shippingValues).size!==1){reason='仕入原価・仕入送料を確認中';break;}
    const totalLines=order.map(lineCost);if(totalLines.some(v=>v===null)){reason='注文全体の原価を確認中';break;}
    const subtotal=totalLines.reduce((a,b)=>a+b,0),orderUnits=order.reduce((n,p)=>n+(known(p.quantity)||0),0),shipping=shippingValues[0];
    if(subtotal===0&&!orderUnits){reason='仕入送料の配分を確認中';break;}
    const share=subtotal>0?line/subtotal:units/orderUnits;total+=(line+shipping*share)/units*unitsSold;
   }
   output.set(String(sale.id),{purchase_cost_yen:reason?null:Math.round(total*100)/100,profit_cost_note:reason||'一致した仕入れと注文送料から計算'});
  }
  return output;
 }
 return {known,market,net,month,result,projected,summarize,inProgress,costs};
});
