'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
async function run(){
 const root=path.resolve(__dirname,'..');
 const front=fs.readFileSync(path.join(root,'command-center-98/affiliate-production.js'),'utf8');
 const back=fs.readFileSync(path.join(root,'supabase/functions/command-center-retro-api/affiliate-production-api.ts'),'utf8');
 new Function(front);
 assert.ok(!front.includes('affiliate_queue'));
 assert.ok(!front.includes('data-queue'));
 assert.ok(back.includes("if(j.posting_mode==='manual')"));
 assert.ok(back.includes('const post=await createBufferPost'));
 const acceptStart=front.indexOf('  async function accept(j){'),acceptEnd=front.indexOf('  function hide()',acceptStart);
 const requests=[];
 const accept=new Function('api',front.slice(acceptStart,acceptEnd)+';return accept;')(async body=>{requests.push(body);return {state:{state:'approved'}};});
 await accept({id:'sample',revision:'rev'});
 assert.deepEqual(requests,[{action:'affiliate_confirm_manual',id:'sample',revision:'rev'}]);
 let src=back.slice(back.indexOf('export async function affiliatePatch'));
 src=src.replace('export async function affiliatePatch(req: Request, body: any, d: Deps): Promise<Response | null>','async function affiliatePatch(req,body,d)')
 .replace(/const values:any/g,'const values').replace(/\(e as any\)/g,'e')
 .replace(/\(p:any,i:number\)/g,'(p,i)').replace(/\(p:any\)/g,'(p)');
 let reads=0,saved;
 const row={payload:{result_kind:'affiliate_job',retained:'original',job:{title:'sample',campaign_id:'c',slides:[1],finished_images:{set_id:'exact'},approval:null}}};
 const context={compact:v=>String(v??''),job:async()=>{reads++;return row;},campaign:async()=>({id:'c'}),revisionOf:async()=>'rev',deliveryIssues:()=>['legacy_conditions_pending'],contentIssues:()=>[],finishedIssues:()=>[],copyRevisionOf:async()=>'copy',storedFinished:async()=>['exact-png'],now:()=>'2026-10-08T00:00:00Z',JOB_TASK:'affiliate-production-jobs-v1',save:async(...args)=>{saved=args;},jobState:async()=>({state:'approved'})};
 const fn=new Function(...Object.keys(context),src+'; return affiliatePatch;')(...Object.values(context));
 const deps={token:'connected-test-only',admin:{from(){throw new Error('unexpected DB access');}},json:(req,b,status=200)=>({b,status})};
 const queue=await fn({}, {action:'affiliate_queue',id:'existing',revision:'rev'},deps);
 assert.equal(queue.status,409);assert.ok(queue.b.error.includes('legacy_conditions_pending'));assert.equal(saved,undefined);
 row.payload.job.posting_mode='manual';
 const manualQueue=await fn({}, {action:'affiliate_queue',id:'existing',revision:'rev'},deps);
 assert.equal(manualQueue.status,403);assert.equal(manualQueue.b.error,'manual_posting_only');assert.equal(saved,undefined);
 const stale=await fn({}, {action:'affiliate_approve',id:'existing',revision:'old'},deps);
 assert.equal(stale.status,409);assert.equal(saved,undefined);
 const current=await fn({}, {action:'affiliate_confirm_manual',id:'existing',revision:'rev'},deps);
 assert.equal(current.status,200);assert.equal(saved[4].job.posting_mode,'manual');assert.equal(saved[4].retained,'original');
 assert.equal(saved[4].job.finished_images.set_id,'exact');assert.equal(saved[4].job.approval.revision,'rev');
 console.log('PASS: manual confirmation, queue rejection, stale revision, payload preservation');
}
run().catch(e=>{console.error(e);process.exitCode=1});
