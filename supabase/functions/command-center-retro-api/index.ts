import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPA = Deno.env.get("SUPABASE_URL") || "";
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const admin = createClient(SUPA, KEY, { auth: { persistSession:false, autoRefreshToken:false } });
const enc = new TextEncoder();
const TTL = 60 * 60 * 24 * 30;
const ALLOWED_ORIGINS = new Set(["https://dokechi.github.io"]);

function cors(req:Request){
  const origin=req.headers.get("origin")||"";
  const h=new Headers({"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Vary":"Origin"});
  if(ALLOWED_ORIGINS.has(origin)) h.set("Access-Control-Allow-Origin",origin);
  h.set("Access-Control-Allow-Methods","GET,POST,PATCH,DELETE,OPTIONS");
  h.set("Access-Control-Allow-Headers","authorization,content-type");
  return h;
}
function json(req:Request, body:unknown, status=200){return new Response(JSON.stringify(body),{status,headers:cors(req)})}
async function sha256(v:string){const b=await crypto.subtle.digest("SHA-256",enc.encode(v));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function hmac(v:string){const k=await crypto.subtle.importKey("raw",enc.encode(KEY),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const b=await crypto.subtle.sign("HMAC",k,enc.encode(v));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function same(a:string,b:string){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}
async function issue(){const exp=Date.now()+TTL*1000;const body=`retro|${exp}`;return `${exp}.${await hmac(body)}`}
async function auth(req:Request){const raw=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"").trim();if(!raw)return false;const [e,s]=raw.split(".");const exp=Number(e);if(!exp||exp<Date.now())return false;return same(s||"",await hmac(`retro|${e}`))}
function mapRow(x:any, scoreOverride?:number, penalty=0){return {id:x.id,domain:x.domain,priority:x.priority,basePriority:x.priority,score:scoreOverride??x.score,baseScore:x.score,feedbackPenalty:penalty,title:x.title,summary:x.summary,reason:x.reason,next:x.next_action,impact:x.impact_yen,impactLabel:x.impact_label,deadline:x.deadline,confidence:x.confidence,source:x.source_title,url:x.source_url,reviewState:x.review_state,lastSeen:x.last_seen_at,payload:x.payload||{}}}
function rankFromScore(v:number){return v>=85?"S":v>=70?"A":"B"}
function supplierInfo(sourceTitle:any, sourceUrl:any){
  let host="",key="",homepage="";
  try{const u=new URL(String(sourceUrl||""));host=u.hostname.replace(/^www\./,"");const seg=u.pathname.split("/").filter(Boolean)[0]||"";if(host==="store.shopping.yahoo.co.jp"&&seg){key=host+"/"+seg;homepage=`https://${host}/${seg}/`}else{key=host;homepage=`${u.protocol}//${u.host}/`}}catch{}
  const name=String(sourceTitle||host||"仕入れ先不明").trim();if(!key)key="name:"+normText(name);return {key,name,host,homepage:homepage||null};
}
function mapSupplier(x:any){return {supplierKey:x.supplier_key,name:x.supplier_name,host:x.canonical_host,url:x.homepage_url,firstSeen:x.first_seen_at,lastSeen:x.last_seen_at,lastSuccess:x.last_success_at,successCount:x.success_count||0,closeCount:x.close_count||0,missCount:x.miss_count||0,candidateCount:x.candidate_count||0,trustScore:x.trust_score||50,priorityBoost:x.priority_boost||0,notes:x.notes||{}}}
function normText(v:any){return String(v||"").toLowerCase().normalize("NFKC").replace(/[\s\p{P}\p{S}]+/gu,"")}
function bigrams(v:any){const s=normText(v);const out=new Set<string>();if(s.length<2){if(s)out.add(s);return out}for(let i=0;i<s.length-1;i++)out.add(s.slice(i,i+2));return out}
function titleSimilarity(a:any,b:any){const A=bigrams(a),B=bigrams(b);if(!A.size||!B.size)return 0;let inter=0;for(const g of A)if(B.has(g))inter++;return inter/(A.size+B.size-inter)}
function learningPenalty(row:any, negatives:any[]){let best=0;for(const n of negatives){if(!n||n.domain!==row.domain)continue;let p=0;if(row.source_title&&n.source_title&&normText(row.source_title)===normText(n.source_title))p+=8;const sim=titleSimilarity(row.title,n.title);if(sim>=.55)p+=18;else if(sim>=.35)p+=10;else if(sim>=.20)p+=5;if(p>best)best=p}return Math.min(25,best)}
async function negativeExamples(){const [{data:deleted},{data:rejected}]=await Promise.all([admin.from("command_center_feedback").select("domain,source_title,title").eq("action","deleted").order("created_at",{ascending:false}).limit(150),admin.from("command_center_signals").select("domain,source_title,title").eq("review_state","rejected").order("updated_at",{ascending:false}).limit(100)]);return [...(deleted||[]),...(rejected||[])]}
function mapTask(x:any){return {taskId:x.task_id,title:x.title,domain:x.domain,schedule:x.schedule,timingMode:x.timing_mode,enabled:x.is_enabled,notifications:x.notifications_enabled,email:x.email_enabled,lastRun:x.last_run_time,prompt:x.task_prompt,bridge:x.result_ingest_enabled,bridgeNote:x.result_ingest_note,updatedAt:x.updated_at,syncedAt:x.synced_at}}
function mapEvent(x:any){return {id:x.id,taskId:x.task_id,eventKey:x.event_key,domain:x.domain,priority:x.priority,score:x.score,title:x.title,summary:x.summary,url:x.source_url,impact:x.impact_yen,deadline:x.deadline,occurredAt:x.occurred_at,payload:x.payload||{}}}

function fpShort(v:any,max=500){const s=String(v??"").trim();return s?s.slice(0,max):null}
function fpMetric(v:any,max=1000000000,decimal=false){if(v===null||v===undefined||v==="")return null;const n=Number(v);if(!Number.isFinite(n)||n<0||n>max)throw new Error("invalid_fp_metric");return decimal?Math.round(n*10)/10:Math.round(n)}
async function fpSignal(id:string){
  const fields="id,domain,priority,score,title,summary,reason,next_action,impact_yen,impact_label,deadline,confidence,source_title,source_url,review_state,last_seen_at,payload";
  const {data,error}=await admin.from("command_center_signals").select(fields).eq("id",id).maybeSingle();
  const allowed=new Set(["fp_post_candidate","house_post_candidate"]);
  if(error)throw error;if(!data||!allowed.has(String(data.payload?.content_type||"")))throw new Error("content_signal_not_found");return data
}
async function saveFpPayload(row:any,payload:any){
  const {data,error}=await admin.from("command_center_signals").update({payload,updated_at:new Date().toISOString()}).eq("id",row.id)
    .select("id,domain,priority,score,title,summary,reason,next_action,impact_yen,impact_label,deadline,confidence,source_title,source_url,review_state,last_seen_at,payload").single();
  if(error)throw error;return data
}
function moneyEntranceSnapshot(p:any){
  return {
    post_title:p.post_title??null,
    draft_title:p.draft_title??null,
    draft_cover:p.draft_cover??null,
    caption:p.caption??p.draft_caption??p.post_caption??null,
    page_count_reason:p.page_count_reason??null,
    question_lineage:p.question_lineage??null,
    premise_checks:Array.isArray(p.premise_checks)?p.premise_checks:[],
    draft_slides:Array.isArray(p.draft_slides)?p.draft_slides:[],
    draft_sources:Array.isArray(p.draft_sources)?p.draft_sources:[],
    entrance_contract_version:p.entrance_contract_version??null,
    entrance_options:Array.isArray(p.entrance_options)?p.entrance_options:[],
    selected_entrance:p.selected_entrance??null,
    entrance_selection:p.entrance_selection??null,
    structure_contract_version:p.structure_contract_version??null,
    story_spine:p.story_spine??null
  };
}
function moneyStructureReady(p:any){
  if(String(p?.structure_contract_version||"")!=="money-story-spine-v1-20260924")return false;
  const spine=p?.story_spine,slides=Array.isArray(p?.draft_slides)?p.draft_slides:[],beats=Array.isArray(spine?.beats)?spine.beats:[];
  if(!spine||typeof spine!=="object"||Array.isArray(spine)||!String(spine?.central_question||"").trim()||!String(spine?.final_answer||"").trim())return false;
  if(!slides.length||beats.length!==slides.length)return false;
  const seen=new Set<string>();
  for(let i=0;i<slides.length;i++){
    const slide=slides[i]||{},beat=beats[i]||{},page=Number(slide?.page)||i+1;
    const bp=Number(beat?.page),role=String(beat?.role||"").trim(),bPhen=String(beat?.phenomenon||"").trim(),sPhen=String(slide?.page_contract?.phenomenon||"").trim();
    if(bp!==page||!role||!bPhen||!sPhen||bPhen.replace(/\s+/g," ")!==sPhen.replace(/\s+/g," "))return false;
    const key=sPhen.replace(/\s+/g," ").toLowerCase();
    if(seen.has(key))return false;seen.add(key);
  }
  return true;
}

function isSystemSignal(row:any){
  const id=String(row?.id||"");
  const title=String(row?.title||"");
  const kind=String(row?.payload?.result_kind||"");
  return kind==="sales_sync"||/^gmail-sales:|^sns:gmail-sales:/.test(id)||/メルカリ売上同期/.test(title);
}
async function allSourcingSignals(){
  const rows:any[]=[];
  for(let offset=0;;offset+=1000){const {data,error}=await admin.from("command_center_signals").select("id,domain,priority,score,title,summary,reason,next_action,impact_yen,impact_label,deadline,confidence,source_title,source_url,review_state,last_seen_at,updated_at,payload").eq("domain","sourcing").order("id",{ascending:true}).range(offset,offset+999);if(error)throw error;rows.push(...(data||[]));if((data||[]).length<1000)break}
  return rows.filter((x:any)=>!isSystemSignal(x));
}
function readySourcing(row:any,reviewIds:Set<string>){return row.review_state==='new'&&!reviewIds.has(row.id)&&['S','A'].includes(row.priority)&&!['research','supplier','run_summary'].includes(row.payload?.result_kind)}
async function syncSupplierLedger(signals:any[]){
  const now=new Date().toISOString();
  const supplierRows:any[]=[];const candidateRows:any[]=[];const seen=new Set<string>();
  for(const x of signals){const si=supplierInfo(x.source_title,x.source_url);if(!seen.has(si.key)){seen.add(si.key);supplierRows.push({supplier_key:si.key,supplier_name:si.name,canonical_host:si.host||null,homepage_url:si.homepage,last_seen_at:x.last_seen_at||now,updated_at:now})}candidateRows.push({signal_id:String(x.id),supplier_key:si.key,supplier_name:si.name,title:x.title||null,source_url:x.source_url||null,latest_score:Number(x.score)||0,last_seen_at:x.last_seen_at||now})}
  if(supplierRows.length){const {error}=await admin.from("command_center_suppliers").upsert(supplierRows,{onConflict:"supplier_key"});if(error)throw error}
  if(candidateRows.length){const {error}=await admin.from("command_center_supplier_candidates").upsert(candidateRows,{onConflict:"signal_id"});if(error)throw error}
  const [{data:suppliers,error:se},{data:reviews,error:re},{data:cands,error:ce}]=await Promise.all([
    admin.from("command_center_suppliers").select("supplier_key,supplier_name,canonical_host,homepage_url,first_seen_at,last_seen_at,last_success_at,success_count,close_count,miss_count,candidate_count,trust_score,priority_boost,notes,created_at,updated_at"),
    admin.from("command_center_sourcing_reviews").select("signal_id,verdict,supplier_key,judged_at,expires_at"),
    admin.from("command_center_supplier_candidates").select("signal_id,supplier_key,last_seen_at")
  ]);if(se)throw se;if(re)throw re;if(ce)throw ce;
  const reviewMap=new Map<string,any>();for(const r of reviews||[]){const a=reviewMap.get(r.supplier_key)||{success:0,close:0,miss:0,lastSuccess:null};a[r.verdict]=(a[r.verdict]||0)+1;if(r.verdict==="success"&&(!a.lastSuccess||new Date(r.judged_at)>new Date(a.lastSuccess)))a.lastSuccess=r.judged_at;reviewMap.set(r.supplier_key,a)}
  const candMap=new Map<string,any>();for(const c of cands||[]){const a=candMap.get(c.supplier_key)||{count:0,lastSeen:null};a.count++;if(!a.lastSeen||new Date(c.last_seen_at)>new Date(a.lastSeen))a.lastSeen=c.last_seen_at;candMap.set(c.supplier_key,a)}
  const updates=(suppliers||[]).map((s:any)=>{const r=reviewMap.get(s.supplier_key)||{success:0,close:0,miss:0,lastSuccess:null};const c=candMap.get(s.supplier_key)||{count:0,lastSeen:s.last_seen_at};const boost=r.success>0?Math.min(10,5+Math.max(0,r.success-1)*2+Math.min(3,r.close)):Math.min(5,r.close);const trust=Math.min(100,50+r.success*15+r.close*3);return {supplier_key:s.supplier_key,supplier_name:s.supplier_name,canonical_host:s.canonical_host,homepage_url:s.homepage_url,last_seen_at:c.lastSeen||s.last_seen_at,last_success_at:r.lastSuccess,success_count:r.success,close_count:r.close,miss_count:r.miss,candidate_count:c.count,trust_score:trust,priority_boost:boost,updated_at:now}});
  if(updates.length){const {error}=await admin.from("command_center_suppliers").upsert(updates,{onConflict:"supplier_key"});if(error)throw error}
}
async function sourcingVerdict(id:string,verdict:string,note:string|null){
  const {data:row,error}=await admin.from("command_center_signals").select("id,domain,priority,score,title,summary,reason,next_action,impact_yen,impact_label,source_title,source_url,payload,last_seen_at").eq("id",id).maybeSingle();if(error)throw error;if(!row||row.domain!=="sourcing")throw new Error("sourcing_signal_not_found");
  const si=supplierInfo(row.source_title,row.source_url);const expires=verdict==="miss"?new Date(Date.now()+14*86400000).toISOString():null;
  const {error:ue}=await admin.from("command_center_sourcing_reviews").upsert({signal_id:id,verdict,supplier_key:si.key,supplier_name:si.name,source_url:row.source_url||null,note:note||null,snapshot:{title:row.title,summary:row.summary,score:row.score,impact_yen:row.impact_yen,payload:row.payload||{}},judged_at:new Date().toISOString(),expires_at:expires},{onConflict:"signal_id"});if(ue)throw ue;
  const state=verdict==="success"?"accepted":"read";const {error:se}=await admin.from("command_center_signals").update({review_state:state,review_note:`sourcing:${verdict}`,updated_at:new Date().toISOString()}).eq("id",id);if(se)throw se;
  await syncSupplierLedger([row]);return {row,si,state};
}

async function logDeletedSignal(row:any){
  const signalKey=String(row.id||"");
  const {data:existing}=await admin.from("command_center_feedback").select("id").eq("action","deleted").eq("signal_key",signalKey).maybeSingle();
  if(existing?.id) return;
  const sourceHash=row.source_url ? await sha256(String(row.source_url)) : null;
  const {error}=await admin.from("command_center_feedback").insert({
    action:"deleted",
    signal_key:signalKey,
    domain:String(row.domain||"other"),
    source_title:row.source_title||null,
    title:row.title||null,
    source_url_hash:sourceHash,
    priority:row.priority||null,
    score:Number.isFinite(Number(row.score))?Number(row.score):null,
    feedback_note:"user hard-deleted from command-center history; suppress exact signal key on future insert",
    features:{reason:row.reason||null,next_action:row.next_action||null,impact_label:row.impact_label||null}
  });
  if(error) throw error;
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers:cors(req)});
  if(req.method==="POST"){
    try{
      const body=await req.json().catch(()=>({}));
      if(body?.action!=="login") return json(req,{ok:false,error:"bad_action"},400);
      const code=String(body?.access_code||"");
      const {data,error}=await admin.from("command_center_access").select("access_code_sha256").eq("singleton",true).maybeSingle();
      if(error||!data?.access_code_sha256) return json(req,{ok:false,error:"access_not_configured"},500);
      const got=await sha256(code);
      if(!same(got,data.access_code_sha256)) return json(req,{ok:false,error:"invalid_access_code"},401);
      return json(req,{ok:true,token:await issue(),expiresIn:TTL});
    }catch(e){return json(req,{ok:false,error:String((e as any)?.message||e)},500)}
  }
  if(!(await auth(req))) return json(req,{ok:false,error:"unauthorized"},401);
  const u=new URL(req.url);
  if(u.searchParams.get("ping")==="1") return json(req,{ok:true});

  if(req.method==="PATCH"){
    try{
      const body=await req.json().catch(()=>({}));const id=String(body?.id||"");const action=String(body?.action||"");
      if(action==="fp_entrance"){
        if(!id)return json(req,{ok:false,error:"invalid_request"},400);
        const row=await fpSignal(id),p=row.payload||{},key=String(body?.entranceKey||"").toLowerCase();
        const allowed=new Set(["michael","marina","ben"]);
        if(p?.content_type!=="fp_post_candidate"||p?.category!=="fp_psychology"||String(p?.entrance_contract_version||"")!=="money-entrance-v1-20260924"||!allowed.has(key))return json(req,{ok:false,error:"invalid_entrance_request"},400);
        if(!moneyStructureReady(p))return json(req,{ok:false,error:"structure_not_ready"},409);
        const options=Array.isArray(p.entrance_options)?p.entrance_options:[],option=options.find((x:any)=>String(x?.key||"").toLowerCase()===key);
        if(String(p.editorial_workflow_version||"")==="money-spine-editor-v1-20260925"){
          if(String(p.source_task_id||"")!=="6aa9ee1043388191a2eac3bb2702092a"||String(p.editorial_stage||"")==="final")return json(req,{ok:false,error:"editorial_selection_closed"},409);
          if(!option||!String(option.hook||option.headline||"").trim())return json(req,{ok:false,error:"entrance_option_missing"},400);
          const now=new Date().toISOString(),base=String(p.entrance_base_revision||p.draft_revision||"money-spine-r1").replace(/-(michael|marina|ben)$/i,""),revision=`${base}-${key}`;
          const next:any={...p,selected_entrance:key,entrance_selection:{selected_key:key,selected_at:now,source:"command_center_user"},draft_revision:revision,editorial_stage:"selected",draft_status:"awaiting_editorial",image_ready:false,asset_status:"awaiting_editorial",blocked_reason:"awaiting_editorial"};
          delete next.content_lock;delete next.final_review;delete next.logic_institution_review;
          const fresh=await saveFpPayload(row,next);
          return json(req,{ok:true,item:mapRow(fresh),selectedKey:key,selectedLabel:String(option.label||key)});
        }
        const reviewed=new Set((Array.isArray(p.final_review?.reviewed_entrances)?p.final_review.reviewed_entrances:[]).map((x:any)=>String(x).toLowerCase()));
        if(!option||!reviewed.has(key))return json(req,{ok:false,error:"entrance_not_pre_reviewed"},400);
        const slides=Array.isArray(p.draft_slides)?structuredClone(p.draft_slides):[];
        if(!slides.length||!slides[0]?.page_contract)return json(req,{ok:false,error:"entrance_slide_missing"},400);
        slides[0]={...slides[0],headline:String(option.headline||slides[0].headline||""),body:String(option.body||slides[0].body||""),page_contract:{...slides[0].page_contract,display_copy:String(option.display_copy||"")}};
        const now=new Date().toISOString(),base=String(p.entrance_base_revision||p.draft_revision||"money-r1").replace(/-(michael|marina|ben)$/i,""),revision=`${base}-${key}`;
        const entranceSelection={selected_key:key,selected_at:now,source:"command_center_user"};
        const next:any={...p,selected_entrance:key,entrance_selection:entranceSelection,draft_slides:slides,draft_revision:revision};
        if(option.post_title)next.post_title=String(option.post_title);
        next.draft_cover=String(option.draft_cover||option.headline||p.draft_cover||p.post_title||"");
        const snapshot=moneyEntranceSnapshot(next);
        next.content_lock={locked:true,draft_revision:revision,locked_at:now,snapshot};
        next.final_review={...(p.final_review||{}),status:"passed",checked_revision:revision,selected_entrance:key,entrance_selection_applied_at:now,selection_mode:"pre_reviewed_variant"};
        if(String(p.logic_review_contract_version||"")==="money-logic-institution-review-v1-20260925"){
          const logic=p.logic_institution_review||{};
          const logicReviewed=new Set((Array.isArray(logic.reviewed_entrances)?logic.reviewed_entrances:[]).map((x:any)=>String(x).toLowerCase()));
          if(String(logic.status||"")!=="passed"||!logicReviewed.has(key))return json(req,{ok:false,error:"logic_review_not_pre_reviewed"},409);
          next.logic_institution_review={...logic,status:"passed",checked_revision:revision,selected_entrance:key,entrance_selection_applied_at:now,reviewed_snapshot:snapshot};
        }
        const fresh=await saveFpPayload(row,next);
        return json(req,{ok:true,item:mapRow(fresh),selectedKey:key,selectedLabel:String(option.label||key)});
      }
      if(action==="fp_preflight"){
        if(!id)return json(req,{ok:false,error:"invalid_request"},400);
        const row=await fpSignal(id),p=row.payload||{};
        const incoming=body?.screenshotDecisions&&typeof body.screenshotDecisions==="object"?body.screenshotDecisions:{},normalized:any={};
        const requests=Array.isArray(p.screenshot_requests)?p.screenshot_requests.slice(0,20):[];
        for(const shot of requests){const shotId=String(shot?.id||"").slice(0,120),decision=String(incoming?.[shotId]||""),allowed=shot?.required?["assistant","user"]:["assistant","user","skip"];if(!shotId||!allowed.includes(decision))return json(req,{ok:false,error:"invalid_screenshot_decision"},400);normalized[shotId]=decision}
        const now=new Date().toISOString();
        if(body?.adaptive===true){
          const payload={...p,screenshot_decisions:normalized,production_preflight:{status:"ready",mode:"adaptive",design_direction:null,color_palette:null,cover_mode:null,screenshot_decisions:normalized,confirmed_at:now}};
          const fresh=await saveFpPayload(row,payload);return json(req,{ok:true,item:mapRow(fresh)});
        }
        const design=String(body?.designDirection||""),color=String(body?.colorPalette||""),cover=String(body?.coverMode||"");
        const allowedDesign=new Set(row.payload?.content_type==="house_post_candidate"?["house","editorial","notebook"]:["friendly","editorial","notebook"]),allowedColor=new Set(["teal","warm","blue"]),allowedCover=new Set(["photo","character","type_only"]);
        if(!allowedDesign.has(design))return json(req,{ok:false,error:"invalid_design_direction"},400);
        if(!allowedColor.has(color))return json(req,{ok:false,error:"invalid_color_palette"},400);
        if(!allowedCover.has(cover))return json(req,{ok:false,error:"invalid_cover_mode"},400);
        const payload={...p,design_direction:design,color_palette:color,cover_mode:cover,screenshot_decisions:normalized,production_preflight:{status:"ready",mode:"legacy",design_direction:design,color_palette:color,cover_mode:cover,screenshot_decisions:normalized,confirmed_at:now}};
        const fresh=await saveFpPayload(row,payload);return json(req,{ok:true,item:mapRow(fresh)});
      }
      if(action==="fp_image_review"){
        const target="task:6aa9ee1043388191a2eac3bb2702092a:money-chat:6279063:zankure-current-structure-v1";
        if(id!==target||body?.confirmed!==true||body?.unchangedCopy!==true)return json(req,{ok:false,error:"invalid_image_review_request"},400);
        const row=await fpSignal(id),p=row.payload||{},lock=p.content_lock||{};
        if(p.execution_source!=="chat"||p.draft_status!=="ready"||p.image_ready!==false||p.asset_status!=="awaiting_pre_image_review"||lock.locked!==true||
          String(body?.draftRevision||"")!==String(p.draft_revision||"")||String(lock.draft_revision||"")!==String(p.draft_revision||"")||
          String(body?.lockedAt||"")!==String(lock.locked_at||""))return json(req,{ok:false,error:"image_review_stale_or_unready"},409);
        const slides=Array.isArray(p.draft_slides)?p.draft_slides:[],incoming=body?.screenshotDecisions||{},decisions:any={};
        if(slides.length!==6||!p.image_render_plan||p.image_render_plan.draft_revision!==p.draft_revision)return json(req,{ok:false,error:"image_render_plan_missing"},409);
        for(const slide of slides){
          const page=String(slide?.page||""),decision=String(incoming?.[page]||"");
          if(!page||!["optional","unnecessary"].includes(decision))return json(req,{ok:false,error:"screenshot_decision_missing_or_required_asset"},400);
          decisions[page]=decision;
        }
        const next={...p,image_ready:true,asset_status:"ready_for_image_generation",pre_image_review:{required:true,status:"approved_by_user",checked_revision:p.draft_revision,checked_locked_at:lock.locked_at,
          screenshot_decisions:decisions,confirmation:"user_read_external_review_unmodified_copy",approved_at:new Date().toISOString()}};
        const fresh=await saveFpPayload(row,next);return json(req,{ok:true,item:mapRow(fresh)});
      }
      if(action==="fp_performance"){
        if(!id||!body?.performance||typeof body.performance!=="object")return json(req,{ok:false,error:"invalid_request"},400);
        const row=await fpSignal(id),p=row.payload||{},input=body.performance,platform=String(input.platform||""),posted=new Date(String(input.posted_at||""));
        if(!["instagram","tiktok","youtube"].includes(platform)||!Number.isFinite(posted.getTime()))return json(req,{ok:false,error:"invalid_fp_performance"},400);
        const performance={platform,posted_at:posted.toISOString(),reach:fpMetric(input.reach),non_follower_pct:fpMetric(input.non_follower_pct,100,true),shares:fpMetric(input.shares),saves:fpMetric(input.saves),likes:fpMetric(input.likes),comments:fpMetric(input.comments),profile_views:fpMetric(input.profile_views),note:fpShort(input.note),recorded_at:new Date().toISOString()};
        if(performance.reach===null)return json(req,{ok:false,error:"reach_required"},400);
        const payload={...p,performance};const fresh=await saveFpPayload(row,payload);return json(req,{ok:true,item:mapRow(fresh)});
      }
      if(action==="sourcing_verdict"){
        const verdict=String(body?.verdict||"");if(!id||!["success","close","miss"].includes(verdict))return json(req,{ok:false,error:"invalid_sourcing_verdict"},400);
        const out=await sourcingVerdict(id,verdict,body?.note?String(body.note):null);return json(req,{ok:true,id,verdict,supplierKey:out.si.key,state:out.state});
      }
      if(action==="sourcing_reset"){
        if(!id)return json(req,{ok:false,error:"invalid_request"},400);const {error:de}=await admin.from("command_center_sourcing_reviews").delete().eq("signal_id",id);if(de)throw de;const {error:se}=await admin.from("command_center_signals").update({review_state:"new",review_note:null,updated_at:new Date().toISOString()}).eq("id",id);if(se)throw se;return json(req,{ok:true,id,verdict:null,state:"new"});
      }
      const state=String(body?.state||"");if(!id||!["new","read","accepted","rejected"].includes(state)) return json(req,{ok:false,error:"invalid_request"},400);
      const {error}=await admin.from("command_center_signals").update({review_state:state,updated_at:new Date().toISOString()}).eq("id",id);if(error) throw error;return json(req,{ok:true,id,state});
    }catch(e){return json(req,{ok:false,error:String((e as any)?.message||e)},500)}
  }

  if(req.method==="DELETE"){
    try{
      const body=await req.json().catch(()=>({}));
      const id=String(body?.id||"");
      if(!id) return json(req,{ok:false,error:"invalid_request"},400);
      const {data:row,error:readError}=await admin.from("command_center_signals")
        .select("id,domain,priority,score,title,reason,next_action,impact_label,source_title,source_url")
        .eq("id",id).maybeSingle();
      if(readError) throw readError;
      if(!row) return json(req,{ok:true,id,deleted:false,alreadyMissing:true});
      await logDeletedSignal(row);
      const {error:deleteError}=await admin.from("command_center_signals").delete().eq("id",id);
      if(deleteError) throw deleteError;
      return json(req,{ok:true,id,deleted:true,suppressed:true});
    }catch(e){return json(req,{ok:false,error:String((e as any)?.message||e)},500)}
  }

  if(req.method!=="GET") return json(req,{ok:false,error:"method_not_allowed"},405);
  try{
    const resource=u.searchParams.get("resource")||"signals";
    if(resource==="tasks"){
      const {data,error}=await admin.from("command_center_tasks").select("task_id,title,domain,schedule,timing_mode,is_enabled,notifications_enabled,email_enabled,last_run_time,task_prompt,result_ingest_enabled,result_ingest_note,updated_at,synced_at").order("is_enabled",{ascending:false}).order("title",{ascending:true});
      if(error) throw error;
      const rows=(data||[]).map(mapTask);
      return json(req,{ok:true,generatedAt:new Date().toISOString(),tasks:rows,counts:{total:rows.length,enabled:rows.filter((x:any)=>x.enabled).length,bridged:rows.filter((x:any)=>x.bridge).length,notify:rows.filter((x:any)=>x.notifications).length,email:rows.filter((x:any)=>x.email).length}});
    }
    if(resource==="sourcing-overview"){
      const [signals,{data:reviews,error}]=await Promise.all([allSourcingSignals(),admin.from("command_center_sourcing_reviews").select("signal_id")]);if(error)throw error;
      const reviewIds=new Set<string>((reviews||[]).map((x:any)=>String(x.signal_id)));
      return json(req,{ok:true,readyCount:signals.filter(x=>readySourcing(x,reviewIds)).length,generatedAt:new Date().toISOString()});
    }
    if(resource==="task-events"){
      const rawLimit=Number(u.searchParams.get("limit")||50),rawOffset=Number(u.searchParams.get("offset")||0);
      const limit=Number.isFinite(rawLimit)?Math.min(100,Math.max(1,Math.floor(rawLimit))):50;
      const offset=Number.isFinite(rawOffset)?Math.max(0,Math.floor(rawOffset)):0;
      let query=admin.from("command_center_task_events").select("id,task_id,event_key,domain,priority,score,title,summary,source_url,impact_yen,deadline,occurred_at,payload",{count:"exact"});
      const domain=u.searchParams.get("domain"),taskId=u.searchParams.get("taskId");if(domain)query=query.eq("domain",domain);if(taskId)query=query.eq("task_id",taskId);
      const {data,error,count}=await query.order("occurred_at",{ascending:false}).order("id",{ascending:false}).range(offset,offset+limit-1);if(error)throw error;
      const rows=data||[];let deleted=new Set<string>();
      const keys=rows.filter((x:any)=>x.domain==='sourcing').map((x:any)=>'task:'+x.task_id+':'+x.event_key);
      if(keys.length){const {data:feedback,error:fe}=await admin.from("command_center_feedback").select("signal_key").eq("action","deleted").in("signal_key",keys);if(fe)throw fe;deleted=new Set((feedback||[]).map((x:any)=>x.signal_key))}
      return json(req,{ok:true,generatedAt:new Date().toISOString(),events:rows.map((x:any)=>({...mapEvent(x),suppressed:deleted.has('task:'+x.task_id+':'+x.event_key)})),total:count??rows.length,nextOffset:offset+rows.length<(count??0)?offset+rows.length:null});
    }
    if(resource==="sourcing"){
      const [{data:signals,error:sg},{data:reviews,error:rv}]=await Promise.all([
        allSourcingSignals().then(data=>({data,error:null})),
        admin.from("command_center_sourcing_reviews").select("signal_id,verdict,supplier_key,supplier_name,source_url,note,snapshot,judged_at,expires_at")
      ]);if(sg)throw sg;if(rv)throw rv;
      await syncSupplierLedger(signals||[]);
      const {data:suppliers,error:sp}=await admin.from("command_center_suppliers").select("supplier_key,supplier_name,canonical_host,homepage_url,first_seen_at,last_seen_at,last_success_at,success_count,close_count,miss_count,candidate_count,trust_score,priority_boost,notes").order("priority_boost",{ascending:false}).order("success_count",{ascending:false}).order("last_seen_at",{ascending:false});if(sp)throw sp;
      const reviewBy=new Map((reviews||[]).map((r:any)=>[r.signal_id,r]));const supplierBy=new Map((suppliers||[]).map((r:any)=>[r.supplier_key,r]));
      const items=(signals||[]).map((x:any)=>{const si=supplierInfo(x.source_title,x.source_url);const r=reviewBy.get(x.id);const sup=supplierBy.get(si.key);const boost=Math.min(10,Math.max(0,Number(sup?.priority_boost||0)));const adjusted=Math.min(100,Number(x.score||0)+boost);return {...mapRow(x,adjusted,0),priority:rankFromScore(adjusted),sourcingVerdict:r?.verdict||null,verdictNote:r?.note||null,judgedAt:r?.judged_at||null,verdictExpiresAt:r?.expires_at||null,supplierKey:si.key,supplierName:si.name,supplierBoost:boost,supplierTrust:Number(sup?.trust_score||50)}});
      return json(req,{ok:true,generatedAt:new Date().toISOString(),items,suppliers:(suppliers||[]).map(mapSupplier),counts:{total:items.length,unjudged:items.filter((x:any)=>!x.sourcingVerdict).length,success:items.filter((x:any)=>x.sourcingVerdict==="success").length,close:items.filter((x:any)=>x.sourcingVerdict==="close").length,miss:items.filter((x:any)=>x.sourcingVerdict==="miss").length,suppliers:(suppliers||[]).length,provenSuppliers:(suppliers||[]).filter((x:any)=>Number(x.success_count)>0).length}});
    }
    const view=u.searchParams.get("view")||"active";
    const {count}=await admin.from("command_center_signals").select("id",{count:"exact",head:true});
    if(view==="active"){
      const [{data,error},negatives]=await Promise.all([admin.from("command_center_signals").select("id,domain,priority,score,title,summary,reason,next_action,impact_yen,impact_label,deadline,confidence,source_title,source_url,review_state,last_seen_at,updated_at,payload").eq("review_state","new").order("score",{ascending:false}).order("last_seen_at",{ascending:false}).limit(40),negativeExamples()]);
      if(error)throw error;
      const learned=(data||[]).filter((x:any)=>!isSystemSignal(x)).map((x:any)=>{const penalty=learningPenalty(x,negatives);return mapRow(x,Math.max(0,Number(x.score||0)-penalty),penalty)}).sort((a:any,b:any)=>b.score-a.score||new Date(b.lastSeen||0).getTime()-new Date(a.lastSeen||0).getTime()).slice(0,5);
      return json(req,{ok:true,generatedAt:new Date().toISOString(),items:learned,agents:{connected:7,total:7},storedCount:count??0,view,learning:true});
    }
    let q=admin.from("command_center_signals").select("id,domain,priority,score,title,summary,reason,next_action,impact_yen,impact_label,deadline,confidence,source_title,source_url,review_state,last_seen_at,updated_at,payload");
    if(view==="sourcing") q=q.eq("domain","sourcing").order("last_seen_at",{ascending:false}).limit(100);
    else if(["read","accepted","rejected"].includes(view)) q=q.eq("review_state",view).order("updated_at",{ascending:false}).limit(100);
    else q=q.order("updated_at",{ascending:false}).limit(100);
    const {data,error}=await q;if(error)throw error;
    return json(req,{ok:true,generatedAt:new Date().toISOString(),items:(data||[]).filter((x:any)=>!isSystemSignal(x)).map((x:any)=>mapRow(x)),agents:{connected:7,total:7},storedCount:count??0,view});
  }catch(e){return json(req,{ok:false,error:String((e as any)?.message||e)},500)}
});

