import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import "./profit-model.js";
const Profit=(globalThis as any).CCLedgerProfit;
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPA=Deno.env.get("SUPABASE_URL")||"";
const KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const admin=createClient(SUPA,KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const enc=new TextEncoder();
const ALLOWED=new Set(["https://dokechi.github.io"]);
function cors(req:Request){const o=req.headers.get("origin")||"";const h=new Headers({"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Vary":"Origin"});if(ALLOWED.has(o))h.set("Access-Control-Allow-Origin",o);h.set("Access-Control-Allow-Methods","GET,OPTIONS");h.set("Access-Control-Allow-Headers","authorization,content-type");return h}
function json(req:Request,b:any,s=200){return new Response(JSON.stringify(b),{status:s,headers:cors(req)})}
async function hmac(v:string){const k=await crypto.subtle.importKey("raw",enc.encode(KEY),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const b=await crypto.subtle.sign("HMAC",k,enc.encode(v));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function same(a:string,b:string){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}
async function auth(req:Request){const raw=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"").trim();if(!raw)return false;const [e,s]=raw.split(".");const exp=Number(e);if(!exp||exp<Date.now())return false;return same(s||"",await hmac(`retro|${e}`))}
function monthBounds(m:string){if(!/^\d{4}-\d{2}$/.test(m))return null;const [y,mo]=m.split("-").map(Number);if(mo<1||mo>12)return null;const start=`${y}-${String(mo).padStart(2,"0")}-01T00:00:00+09:00`;const ny=mo===12?y+1:y;const nm=mo===12?1:mo+1;const end=`${ny}-${String(nm).padStart(2,"0")}-01T00:00:00+09:00`;return {start,end}}
function stats(rows:any[]){const orders=new Map<string,{total:number,shipping:number}>(),suppliers=new Set<string>();let units=0,spend=0;for(const x of rows){const key=String(x.order_id||x.source_message_id||x.id);if(!orders.has(key))orders.set(key,{total:Number(x.order_total_yen||0),shipping:Number(x.order_shipping_yen||0)});if(x.supplier_key)suppliers.add(String(x.supplier_key));units+=Number(x.quantity||0);spend+=Number(x.allocated_net_line_yen??x.line_total_yen??0)}let paidTotal=0,shippingTotal=0;for(const o of orders.values()){paidTotal+=o.total;shippingTotal+=o.shipping}return {lines:rows.length,orders:orders.size,units,spend,paidTotal,shippingTotal,suppliers:suppliers.size}}
// Read-only presentation contract. No inferred deductions, profit, or inventory writes.
function knownYen(value:any){if(value===null||value===undefined||value===""||typeof value==="boolean")return null;const n=Number(value);return Number.isFinite(n)&&n>=0?n:null}
function saleInMonth(row:any,b:any){if(!b)return true;const start=Date.parse(b.start),end=Date.parse(b.end);return [row.sold_at,row.metadata?.completed_at,row.metadata?.settled_at].some(value=>{const time=Date.parse(value);return Number.isFinite(time)&&time>=start&&time<end})}
function saleDetail(row:any){
 const m=row.metadata||{},basis=String(m.amount_basis||""),recorded=knownYen(row.sale_price_yen);
 return {id:row.id,sale_id:row.sale_id,marketplace:row.marketplace,product_name:row.product_name,quantity:row.quantity,status:row.status,sold_at:row.sold_at,
  completed_at:m.completed_at||m.settled_at||null,
  gross_sale_yen:knownYen(m.gross_sale_yen)??(basis==="gross_sale_yen"?recorded:null),
  gross_payment_yen:knownYen(m.gross_payment_yen)??(basis==="gross_payment_yen"?recorded:null),
  net_received_yen:knownYen(m.net_received_yen)??(basis==="net_received_yen"?recorded:null),
  fee_yen:knownYen(m.fee_yen),shipping_yen:knownYen(m.shipping_yen),aggregate_deductions_yen:knownYen(m.aggregate_deductions_yen),
  amount_basis:["gross_sale_yen","gross_payment_yen","net_received_yen"].includes(basis)?basis:null,
  unverified_recorded_yen:["gross_sale_yen","gross_payment_yen","net_received_yen"].includes(basis)?null:recorded,
  cost_match_status:m.match_status==="needs_purchase_match"?"unmatched":row.matched_purchase_id?"matched_reference":"unconfirmed"};
}
// Exact allocation IDs only. This read never changes source transactions or inventory.
async function profitCosts(sales:any[]){
 const fail={available:false,costs:new Map<string,any>()};
 if(!sales.length)return {available:true,costs:new Map<string,any>()};
 try{
  const allocations:any[]=[];
  for(let i=0;i<sales.length;i+=200){
   const response=await admin.from("command_center_sourcing_sale_allocations").select("sale_row_id,purchase_id,quantity,confidence",{count:"exact"}).in("sale_row_id",sales.slice(i,i+200).map(s=>s.id)).limit(10001);
   if(response.error||response.count===null||response.count!==(response.data||[]).length)return fail;
   allocations.push(...(response.data||[]));
  }
  const response=await admin.from("command_center_sourcing_purchases").select("id,supplier_key,order_id,source_message_id,quantity,line_total_yen,allocated_net_line_yen,order_shipping_yen,order_discount_yen,status,metadata",{count:"exact"}).eq("status","purchased").limit(10001);
  if(response.error||response.count===null||response.count!==(response.data||[]).length)return fail;
  return {available:true,costs:Profit.costs(sales,allocations,response.data||[])};
 }catch{return fail;}
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(req)});
 if(!(await auth(req)))return json(req,{ok:false,error:"unauthorized"},401);
 if(req.method!=="GET")return json(req,{ok:false,error:"method_not_allowed"},405);
 try{
  const u=new URL(req.url),month=u.searchParams.get("month")||"",b=monthBounds(month);
  let q=admin.from("command_center_sourcing_inventory").select("id,ordered_at,supplier_key,supplier_name,order_id,source_message_id,source_subject,line_no,product_name,sku,variant,quantity,unit_price_yen,line_total_yen,allocated_net_line_yen,allocated_net_unit_yen,order_subtotal_yen,order_shipping_yen,order_discount_yen,order_total_yen,status,source_url,metadata,sold_quantity,remaining_quantity,sold_amount_yen,matched_sales,inventory_match_status,adjustment_quantity").order("ordered_at",{ascending:false}).order("order_id",{ascending:false}).order("line_no",{ascending:true}).limit(3000);
  if(b)q=q.gte("ordered_at",b.start).lt("ordered_at",b.end);
  let salesQuery=admin.from("command_center_sourcing_sales").select("id,sale_id,marketplace,product_name,quantity,status,sold_at,sale_price_yen,matched_purchase_id,metadata").order("sold_at",{ascending:false,nullsFirst:false}).order("id",{ascending:false}).limit(3001);
  // A September sale completed in October is also visible in October, with both dates shown.
  if(b){const start=new Date(b.start).toISOString(),end=new Date(b.end).toISOString(),wideStart=new Date(Date.parse(b.start)-86400000).toISOString().slice(0,10),wideEnd=new Date(Date.parse(b.end)+86400000).toISOString().slice(0,10);salesQuery=salesQuery.or(`and(sold_at.gte.${start},sold_at.lt.${end}),and(metadata->>completed_at.gte.${wideStart},metadata->>completed_at.lt.${wideEnd}),and(metadata->>settled_at.gte.${wideStart},metadata->>settled_at.lt.${wideEnd})`)}
  const [{data:p,error:pe},{data:s,error:se},{count:unresolvedSales,error:ue},{data:saleRows,error:saleError}]=await Promise.all([q,admin.from("command_center_suppliers").select("supplier_key,supplier_name,purchase_order_count,purchase_unit_count,purchase_spend_yen,last_purchase_at,success_count,priority_boost,trust_score").gt("purchase_order_count",0).order("purchase_spend_yen",{ascending:false}),admin.from("command_center_sourcing_sales").select("id",{count:"exact",head:true}).eq("status","completed").is("matched_purchase_id",null).or("inventory_key.is.null,inventory_key.eq.UNKNOWN_BUNDLE"),salesQuery]);
  if(pe)throw pe;if(se)throw se;if(ue)throw ue;
  const rows=p||[],bundlePurchaseIds=rows.filter((x:any)=>x.metadata?.bundle_decomposed===true).map((x:any)=>x.id);let bundleComponents:any[]=[];let bundleSummaries:any[]=[];
  if(bundlePurchaseIds.length){const {data:bc,error:bce}=await admin.from("command_center_sourcing_bundle_component_inventory").select("id,purchase_id,bundle_key,component_key,component_name,variant,initial_quantity,sold_quantity,remaining_quantity,sold_amount_yen,matched_sales,inventory_match_status").in("purchase_id",bundlePurchaseIds).order("purchase_id",{ascending:true}).order("component_key",{ascending:true});if(bce)throw bce;bundleComponents=bc||[];const keys=[...new Set(bundleComponents.map((x:any)=>x.bundle_key).filter(Boolean))];if(keys.length){const {data:bs,error:bse}=await admin.from("command_center_sourcing_bundle_summary").select("bundle_key,initial_bundle_quantity,complete_sets_remaining,loose_component_units,component_types").in("bundle_key",keys);if(bse)throw bse;bundleSummaries=bs||[]}}
  const confirmed=rows.filter((x:any)=>x.status==="purchased"),pending=rows.filter((x:any)=>x.status==="unknown"),preorder=pending.filter((x:any)=>x.metadata?.bucket==="preorder_unshipped"),needsReview=pending.filter((x:any)=>x.metadata?.bucket!=="preorder_unshipped");
  const visibleSales=saleError?[]:(saleRows||[]).slice(0,3000).filter((row:any)=>saleInMonth(row,b));
  const projection=await profitCosts(visibleSales);
  const details=visibleSales.map((row:any)=>({...saleDetail(row),...(projection.costs.get(String(row.id))||{purchase_cost_yen:null,profit_cost_note:"仕入原価の読取を確認中"})}));
  return json(req,{ok:true,profitAvailable:projection.available,profitDateBasis:"completed_at_fallback_sold_at",generatedAt:new Date().toISOString(),month:month||null,counts:stats(confirmed),pendingCounts:stats(pending),preorderCounts:stats(preorder),needsReviewCounts:stats(needsReview),allCounts:stats(rows),sales:saleError?null:details,salesAvailable:!saleError,salesTruncated:!saleError&&(saleRows||[]).length>3000,salesDateBasis:"sold_or_completed_or_settled",purchases:rows,supplierPurchases:s||[],bundleComponents,bundleSummaries,unresolvedSales:unresolvedSales||0,inventoryBasis:"mercari_fifo_bundle_components_manual_floor"});
 }catch(e){return json(req,{ok:false,error:String((e as any)?.message||e)},500)}
});
