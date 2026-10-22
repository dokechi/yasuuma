const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../ledger-profit-model.js'),R=require('../ledger-profit-reconcile.js'),V=require('../v231-trade-details.js');
const sale={id:1,product_name:'以前から持っていた品',quantity:1,status:'completed',sold_at:'2026-10-01T00:00:00Z',marketplace:'mercari',gross_sale_yen:10000,fee_yen:1000,shipping_yen:500};
const buy={id:10,product_name:'NIKE Tiempo Legend 10 Pro',sku:null,variant:'COPA/WHITE / 26.5cm',quantity:1,status:'purchased',ordered_at:'2026-09-01T00:00:00Z',allocated_net_line_yen:2000,order_shipping_yen:100,supplier_key:'shop',order_id:'order'};
const project=(sales,purchases=[],allocations=[])=>R.project(sales,purchases,allocations,[],[],{legacyUnknownNet40:true});
test('unknown stock earns 40% of net after both selling deductions; its 60% cost remains explicitly provisional',()=>{
 const row={...sale,...project([sale]).get('1')},r=M.projected(row);assert.equal(r.received,8500);assert.equal(r.profit,3400);assert.equal(r.cost,5100);assert.equal(r.legacy,true);assert.equal(M.result(row).profit,null);
 assert.equal(M.projected({...row,net_received_yen:8500}).profit,3400);assert.equal(M.projected({...row,net_received_yen:0}).profit,0);
 const html=V.row(row);assert.match(html,/手取り40% · 推定/);assert.match(html,/仮原価 · 手取り60%/);
});
test('real or candidate acquisition costs supersede the legacy policy automatically, including zero cost and losses',()=>{
 const row={...sale,profit_estimate_policy:'legacy_or_unknown_net_40'};
 for(const field of ['purchase_cost_yen','estimated_purchase_cost_yen']){const r=M.projected({...row,[field]:9000});assert.equal(r.profit,-500);assert.equal(r.legacy,false);assert.equal(M.projected({...row,[field]:0}).profit,8500);}
 assert.equal(M.projected({...row,net_received_yen:-100}).profit,-100);
});
test('an unknown receipt cannot be guessed from buyer payment or a large parcel solely to enable the 40% rule',()=>{
 const policy={profit_estimate_policy:'legacy_or_unknown_net_40'};
 for(const row of [{...sale,gross_sale_yen:null,gross_payment_yen:10000,fee_yen:null,shipping_yen:null},{...sale,product_name:'トランク',fee_yen:null,shipping_yen:null}])assert.equal(M.projected({...row,...policy}).profit,null);
});
test('a product family, compatible size and available earlier stock can yield a provisional purchase candidate without changing inventory',()=>{
 const s={...sale,product_name:'新品 ナイキ ティエンポ レジェンド10 PRO HG 26.5cm'},wrongSize={...buy,id:11,variant:'COPA/WHITE / 27.5cm'},input=JSON.stringify([s,buy,wrongSize]),r=project([s],[buy,wrongSize]).get('1');
 assert.equal(r.estimated_purchase_cost_yen,2050);assert.deepEqual(r.estimated_purchase_ids,[10]);assert.match(r.cost_estimate_note,/購入候補から推定/);assert.equal(r.profit_estimate_policy,undefined);assert.equal(JSON.stringify([s,buy,wrongSize]),input);
});
test('known recent candidates with wrong size, future dates, exhausted stock or missing acquisition cost do not become old stock',()=>{
 const s={...sale,product_name:'新品 ナイキ ティエンポ レジェンド10 PRO HG 26.5cm'};
 for(const p of [{...buy,variant:'COPA/WHITE / 27.5cm'},{...buy,ordered_at:'2026-11-01'}, {...buy,quantity:0},{...buy,allocated_net_line_yen:null}])assert.equal(project([s],[p]).has('1'),false);
 const a={sale_row_id:1,purchase_id:10,quantity:1,confidence:'exact'};assert.equal(project([sale],[{...buy,allocated_net_line_yen:null}],[a]).has('1'),false);
});
test('a recent assigned product cannot switch to the legacy rule after its known inventory has been exhausted',()=>{
 const rows=[{...sale,product_name:'商品A'},{...sale,id:2,product_name:'商品A'}],p={...buy,product_name:'商品A'},a={sale_row_id:1,purchase_id:10,quantity:1,confidence:'exact'},r=project(rows,[p],[a]);assert.ok(r.has('1'));assert.equal(r.has('2'),false);
});
test('explicit garment color conflicts stay pending rather than matching a different color or applying 40%',()=>{
 const s={...sale,product_name:'G/FORE 半袖モックネック 新品36 ピンク'},p={...buy,product_name:'G/FORE レディース モックネック半袖',variant:'04グレー / 36(S)'};assert.equal(project([s],[p]).has('1'),false);
});
test('a named toddler size can use the corresponding recorded height range as a marked candidate',()=>{
 const s={...sale,product_name:'新品 Disney公式 ミッキー コスプレ 2T 90cm'},p={...buy,product_name:'ディズニー ミッキーマウス キッズ コスチューム',variant:'ブラック / 85～95cm'};assert.equal(project([s],[p]).get('1').estimated_purchase_cost_yen,2100);
});
test('cost per pack is not silently used as the cost of one card',()=>{const s={...sale,product_name:'スクラッチカードダス 仮面ライダー 単品'},p={...buy,product_name:'スクラッチカードダス 仮面ライダー 6パック'};assert.equal(project([s],[p]).has('1'),false);});
test('cancelled and in-progress trades never add provisional earnings to the completed total',()=>{
 const rows=[sale,{...sale,id:2,status:'in_progress'},{...sale,id:3,status:'cancelled'}],p=project(rows),flat=rows.map(s=>({...s,...p.get(String(s.id))})),sum=M.summarize(flat,'',true);assert.equal(p.has('3'),false);assert.equal(sum.legacy,1);assert.equal(sum.profit,3400);assert.equal(sum.inProgress,1);
});
test('legacy policy needs a successful full-source reconciliation and is not enabled by the arithmetic module alone',()=>{assert.equal(R.project([sale],[],[]).size,0);assert.equal(M.projected(sale).profit,null);});
