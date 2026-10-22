const {test}=require('node:test'),assert=require('node:assert/strict');
const P=require('../../supabase/functions/command-center-sourcing-ledger-api/purchase-profit.js'),M=require('../ledger-profit-model.js'),V=require('../v231-trade-details.js');
const buy={id:10,supplier_key:'shop',supplier_name:'店A',order_id:'one',ordered_at:'2026-08-01T00:00:00Z',product_name:'商品A',sku:'A-100',variant:'白 / M',quantity:10,unit_price_yen:2000,allocated_net_line_yen:20000,order_total_yen:20000,order_shipping_yen:0,status:'purchased'};
const sale={id:1,sale_id:'one',quantity:1,sold_at:'2026-10-01',status:'completed',marketplace:'mercari',product_name:'商品A',net_received_yen:3000,purchase_cost_yen:2000,cost_purchase_links:[{purchase_id:10,quantity:1}]};
const plan={id:'plan',payload:{model:'A-100',conservative_sale_yen:4000,mercari_fee_yen:400,selling_shipping_yen:600}};
const run=extra=>P.build({purchases:[buy],sales:[],signals:[plan],...extra});
test('ten purchases with three sold show three realized margins and seven remaining forecasts without overlap',()=>{
 const sales=[sale,{...sale,id:2},{...sale,id:3}],input={purchases:[buy],sales,signals:[plan]},before=JSON.stringify(input),r=P.build(input).rows[0];
 assert.equal(r.sold_quantity,3);assert.equal(r.sold_profit_yen,3000);assert.equal(r.remaining_quantity,7);assert.equal(r.remaining_profit_yen,7000);assert.equal(JSON.stringify(input),before);
 const html=V.html({purchases:[buy],purchaseProfit:[r],purchaseMonth:'2026-08'});assert.match(html,/8月仕入れ分/);assert.match(html,/¥3,000/);assert.match(html,/¥7,000/);assert.doesNotMatch(html,/<th[^>]*>(販売確認|売れた金額|商品支払額計)<\/th>/);assert.equal((html.match(/<th scope="col">/g)||[]).length,7);
});
test('saved actual allocations and inferred links to the same sale reserve stock and add profit only once',()=>{
 const r=run({sales:[sale],allocations:[{sale_row_id:1,purchase_id:10,quantity:1,confidence:'exact'}]}).rows[0];assert.equal(r.sold_quantity,1);assert.equal(r.sold_profit_yen,1000);assert.equal(r.sold_estimated_quantity,0);assert.equal(r.remaining_quantity,9);
});
test('fees and outbound shipping are deducted and an already-net payment is not charged twice',()=>{
 const s={...sale,net_received_yen:null,gross_sale_yen:4000,fee_yen:400,shipping_yen:600};assert.equal(run({sales:[s]}).rows[0].sold_profit_yen,1000);assert.equal(run({sales:[{...s,net_received_yen:3000}]}).rows[0].sold_profit_yen,1000);
 const rough=run({sales:[{...s,fee_yen:null,shipping_yen:null}]}).rows[0];assert.equal(rough.sold_profit_yen,1380);assert.equal(rough.sold_estimated_quantity,1);
});
test('in-progress sales use the sold column as a labeled estimate, release remaining stock, and cancelled sales contribute neither',()=>{
 const r=run({sales:[{...sale,status:'in_progress'},{...sale,id:2,status:'cancelled'}]}).rows[0];assert.equal(r.sold_quantity,1);assert.equal(r.in_progress_quantity,1);assert.equal(r.sold_profit_yen,1000);assert.equal(r.remaining_quantity,9);assert.equal(r.sold_estimated_quantity,1);assert.match(V.row(buy,r),/取引中 1点含む/);
});
test('a minimum-sold floor is absorbed when inferred sales identify those units',()=>{
 const r=run({purchases:[{...buy,adjustment_quantity:2}],sales:[sale,{...sale,id:2},{...sale,id:3}]}).rows[0];assert.equal(r.sold_quantity,3);assert.equal(r.remaining_quantity,7);assert.equal(r.sold_profit_yen,3000);
 const partial=run({purchases:[{...buy,adjustment_quantity:2}],sales:[sale]}).rows[0];assert.equal(partial.sold_quantity,2);assert.equal(partial.remaining_quantity,8);assert.equal(partial.sold_profit_yen,2000);
});
test('future purchase matches, duplicate quantities beyond stock and cancelled acquisitions cannot create profit',()=>{
 const r=run({purchases:[{...buy,quantity:1,allocated_net_line_yen:2000,order_total_yen:2000}],sales:[sale,{...sale,id:2}]}).rows[0];assert.equal(r.sold_quantity,1);assert.equal(r.sold_profit_yen,1000);assert.equal(r.remaining_quantity,0);
 const future=run({purchases:[{...buy,ordered_at:'2026-11-01'}],sales:[sale]}).rows[0];assert.equal(future.sold_profit_yen,null);assert.equal(future.remaining_quantity,10);
 assert.equal(run({purchases:[{...buy,status:'cancelled'}],sales:[sale]}).rows.length,0);
});
test('persisted allocations take precedence over earlier guessed sales competing for the last unit',()=>{
 const p={...buy,quantity:1,allocated_net_line_yen:2000,order_total_yen:2000},saved={...sale,id:2,net_received_yen:4000},r=run({purchases:[p],sales:[sale,saved],allocations:[{sale_row_id:2,purchase_id:10,quantity:1,confidence:'exact'}]}).rows[0];assert.equal(r.sold_quantity,1);assert.equal(r.sold_profit_yen,2000);assert.equal(r.sales[0].sale_row_id,2);
});
test('missing costs and missing prices stay unknown while explicit zero cost and actual losses remain usable',()=>{
 const unknown=run({purchases:[{...buy,allocated_net_line_yen:null,line_total_yen:null}],sales:[sale]}).rows[0];assert.equal(unknown.sold_profit_yen,null);assert.equal(unknown.sold_unpriced_quantity,1);
 const zero=run({purchases:[{...buy,allocated_net_line_yen:0,order_total_yen:0}],sales:[sale]}).rows[0];assert.equal(zero.sold_profit_yen,3000);
 const loss=run({sales:[{...sale,net_received_yen:1000}]}).rows[0];assert.equal(loss.sold_profit_yen,-1000);assert.match(V.row(buy,loss),/−¥1,000/);
 const blank=run({signals:[]}).rows[0];assert.equal(blank.remaining_profit_yen,null);assert.match(V.row(buy,blank),/査定待ち/);
});
test('a known order payment that already includes shipping never has inbound shipping added again',()=>{
 const p={...buy,quantity:2,allocated_net_line_yen:2200,order_total_yen:2200,order_shipping_yen:200},r=run({purchases:[p],sales:[sale]}).rows[0];assert.equal(r.unit_cost_yen,1100);assert.equal(r.sold_profit_yen,1900);
 const q={...p,allocated_net_line_yen:2000};assert.equal(run({purchases:[q]}).rows[0].unit_cost_yen,1100);
});
test('six sold bundle components recover the complete bag cost exactly once in the parent purchase row',()=>{
 const p={...buy,quantity:1,allocated_net_line_yen:600,order_total_yen:600,metadata:{bundle_decomposed:true}},components=Array.from({length:6},(_,i)=>({id:i+20,purchase_id:10,component_key:'part'+i,component_name:'part'+i,initial_quantity:1,quantity_per_bundle:1})),sales=components.map(c=>({...sale,id:c.id,cost_purchase_links:[],cost_component_links:[{component_id:c.id,quantity:1}],net_received_yen:500})),r=run({purchases:[p],components,sales}).rows[0];assert.equal(r.sold_quantity,6);assert.equal(r.sold_profit_yen,2400);assert.equal(r.remaining_quantity,0);assert.equal(r.remaining_loose_quantity,0);assert.equal(r.remaining_profit_yen,0);assert.equal(r.components.length,6);
});
test('unmatched old-stock profit is excluded and the headline equals exactly the displayed purchase rows',()=>{
 const old={...sale,id:2,cost_purchase_links:[],purchase_cost_yen:null,profit_estimate_policy:'legacy_or_unknown_net_40'},result=run({sales:[sale,old]}),t=V.totals(result.rows);assert.equal(M.projected(old).profit,1200);assert.equal(t.sold,1000);
 const h=V.summary({purchases:[buy],purchaseProfit:[...result.rows,{...result.rows[0],purchase_id:999,sold_profit_yen:99999}],purchaseMonth:'all'});assert.match(h,/>¥1,000<\/strong>/);assert.doesNotMatch(h,/99,999/);
});
test('partial totals disclose unpriced sold units, zero margins remain zero, and unavailable data is not rendered as an overall total',()=>{
 const r=run({sales:[{...sale,net_received_yen:2000}]}).rows[0],state={purchases:[buy],purchaseProfit:[r]};assert.match(V.summary(state),/>¥0<\/strong>/);assert.match(V.summary({...state,purchaseProfit:null}),/>確認中<\/strong>/);
 const unknown={...sale,id:2,marketplace:'yuyutei',net_received_yen:null},mixed=run({sales:[sale,unknown]}).rows[0];assert.equal(mixed.sold_profit_yen,1000);assert.equal(mixed.sold_unpriced_quantity,1);assert.match(V.summary({purchases:[buy],purchaseProfit:[mixed]}),/金額確認中 1点/);
});
test('daily purchase totals deduplicate orders across item rows and keep explicit zero payments',()=>{
 const rows=[buy,{...buy,id:11},{...buy,id:12,order_id:'two',order_total_yen:0}],html=V.html({purchases:rows,purchaseProfit:[]});assert.equal(V.orderTotals(rows).total,20000);assert.equal((html.match(/class="purchase-day-head"/g)||[]).length,1);assert.match(html,/仕入れ計 <strong>¥20,000<\/strong> · 2注文/);
});
