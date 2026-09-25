const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
const ui=require('../command-center-98/v228-money-full-copy.js');
const adaptive=require('../command-center-98/v226-adaptive-carousel.js');
const seed={payload:{execution_source:'chat',execution_channel:'chat',source_task_id:ui.TASK_ID,content_type:'fp_post_candidate',adaptive_scope:'money_chat',generation_version:'adaptive-carousel-test',editorial_workflow_version:ui.EDITORIAL_VERSION,structure_contract_version:adaptive.MONEY_STRUCTURE_VERSION,entrance_contract_version:adaptive.MONEY_ENTRANCE_VERSION}};
const clone=x=>JSON.parse(JSON.stringify(x));
const okAdaptive={adaptive:()=>true,quality:()=>({ready:true,issues:[]}),preflightIssues:()=>[]};
let count=0;
function check(name,fn){fn();count++;console.log('PASS '+name);}
function sample(n,topic){
 const item=clone(seed),p=item.payload;
 item.id='task:'+ui.TASK_ID+':money-chat:test-'+topic;
 p.post_title=topic;p.draft_revision='test-'+topic;p.draft_status='ready';p.editorial_stage='final';
 p.image_ready=false;p.asset_status='awaiting_pre_image_review';p.blocked_reason='';p.missing_evidence=[];p.unresolved_research_items=[];
 p.draft_slides=Array.from({length:n},(_,i)=>({page:i+1,role:'説明',page_contract:{display_copy:topic+' '+(i+1),visual_subject:topic+'の場面',phenomenon:topic+' '+i}}));
 p.image_render_plan={draft_revision:p.draft_revision,pages:p.draft_slides.map(s=>({page:s.page,hero:topic+'の具体物',composition:'中央に具体物、上部に見出し',text_role:'本文で判断基準を示す'}))};
 p.content_lock={locked:true,draft_revision:p.draft_revision,locked_at:'2026-09-25T08:00:00Z',snapshot:clone(adaptive.lockSnapshot(p))};
 for(const name of ['final_review','logic_institution_review'])p[name]={status:'passed',checked_revision:p.draft_revision,reviewed_snapshot:clone(p.content_lock.snapshot),unresolved_items:[]};
 p.pre_image_review={required:true,status:'pending'};
 return item;
}
for(const [n,topic] of [[3,'保険'],[5,'家計'],[7,'働き方']]){
 const item=sample(n,topic);
 check(topic+'：承認前は画像指示を出さない',()=>assert.throws(()=>ui.buildZankureImage(item,okAdaptive),/未完了/));
 check(topic+'：全文と根拠確認を出す',()=>{const copy=ui.buildPreImageCheck(item,okAdaptive);assert(copy.includes(topic+' '+n));assert(copy.includes('元の読者の疑問'));});
 item.payload.image_ready=true;item.payload.asset_status='ready_for_image_generation';
 item.payload.pre_image_review={status:'approved_by_user',checked_revision:item.payload.draft_revision,checked_locked_at:item.payload.content_lock.locked_at,screenshot_decisions:Object.fromEntries(item.payload.draft_slides.map(s=>[s.page,'unnecessary']))};
 check(topic+'：ページ数に依存せず承認後に画像指示',()=>{const out=ui.buildZankureImage(item,okAdaptive);assert(out.includes('【'+n+'/'+n+'】'));assert(!out.includes('車・'));assert(out.includes(topic+'の具体物'));});
 item.payload.draft_revision+='-changed';
 check(topic+'：改稿後は旧承認を無効化',()=>assert.throws(()=>ui.buildZankureImage(item,okAdaptive)));
}
check('Workを対象外に保つ',()=>{const x=sample(5,'別タスク');x.payload.execution_source='work';assert.equal(ui.applies(x),false);});
check('デモは全文確認でき、画像化できない',()=>{const x=sample(5,'確認用');x.payload.draft_status='awaiting_review';const a={...okAdaptive,quality:()=>({ready:false,issues:['確認待ち']})};assert(ui.buildPreImageCheck(x,a).includes(x.payload.draft_slides[4].page_contract.display_copy));assert.throws(()=>ui.buildZankureImage(x,a));});
let src=fs.readFileSync(require('node:path').join(__dirname,'../supabase/functions/command-center-retro-api/index.ts'),'utf8');
src=stripTypeScriptTypes(src);
const snap=src.slice(src.indexOf('function moneyEntranceSnapshot'),src.indexOf('function moneyStructureReady'));
const block=src.slice(src.indexOf('      if(action==="fp_image_review")'),src.indexOf('      if(action==="fp_performance")'));
const context={JSON,Date,Set};vm.createContext(context);
vm.runInContext(snap+'globalThis.handle=async function(row,body){const id=row.id,action="fp_image_review",req={};const fpSignal=async()=>row;const json=(_r,data,status=200)=>({status,...data});const mapRow=x=>x;const saveFpPayload=async(r,p,cas)=>{if(!cas)throw new Error("CAS required");return {...r,payload:p}};'+block+'}',context);
(async()=>{
 for(const n of [3,5,7]){
  const row=sample(n,'case'+n),p=row.payload;
  const body={confirmed:true,unchangedCopy:true,draftRevision:p.draft_revision,lockedAt:p.content_lock.locked_at,screenshotDecisions:Object.fromEntries(p.draft_slides.map(s=>[s.page,'unnecessary']))};
  const good=await context.handle(row,body);assert.equal(good.status,200,JSON.stringify(good));count++;
  for(const [name,change] of [
   ['古い版',(r,b)=>b.draftRevision='old'],
   ['未承認',(r,b)=>b.confirmed=false],
   ['本文改変',r=>r.payload.draft_slides[0].page_contract.display_copy='変更'],
   ['未照合',r=>r.payload.final_review.status='pending'],
   ['画像設計不足',r=>r.payload.image_render_plan.pages.pop()],
   ['必須スクショ未取得',(r,b)=>b.screenshotDecisions[1]='required'],
   ['Work',r=>r.payload.execution_channel='work'],
   ['別タスク',r=>r.payload.source_task_id='other'],
   ['根拠不足',r=>r.payload.missing_evidence=['未取得']]
  ]){const r=clone(row),b=clone(body);change(r,b);const out=await context.handle(r,b);assert(out.status>=400,name);count++;}
 }
 console.log('PASS backend: 3/5/7枚・承認・版照合・資料不足・Work除外・CAS');
 console.log(JSON.stringify({passed:count,failed:0}));
})().catch(e=>{console.error(e);process.exit(1)});


