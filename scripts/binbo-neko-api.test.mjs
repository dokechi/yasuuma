import {test} from 'node:test';import assert from 'node:assert/strict';import {fixture,review} from './binbo-neko-fixture.mjs';
import {nekoGet,nekoPatch} from '../supabase/functions/command-center-retro-api/binbo-neko-api.ts';
import {JOB_TASK,REVIEW_TASK,revisionOf} from '../supabase/functions/shared/binbo-neko.mjs';
export function setup(){const j=fixture(),tables={command_center_task_events:[{id:1,task_id:JOB_TASK,event_key:j.id,payload:{result_kind:'binbo_neko_draft',job:j},occurred_at:j.generated_at}],command_center_sourcing_reviews:[review()],command_center_sourcing_purchases:[],command_center_tasks:[]};
 class Q{filters=[];op='select';value=null;one=false;start=0;end=Infinity;constructor(table){this.table=table}select(){return this}eq(k,v){this.filters.push([k,v]);return this}order(){return this}limit(n){this.end=n-1;return this}range(a,b){this.start=a;this.end=b;return this}single(){this.one=true;return this}maybeSingle(){this.one=true;return this}insert(v){this.op='insert';this.value=v;return this}update(v){this.op='update';this.value=v;return this}
 then(resolve,reject){return Promise.resolve().then(()=>{const rows=tables[this.table];let matches=rows.filter(r=>this.filters.every(([k,v])=>k==='payload'?JSON.stringify(r[k])===v:r[k]===v));if(this.op==='insert'){if(rows.some(r=>r.task_id===this.value.task_id&&r.event_key===this.value.event_key))return{data:null,error:{message:'duplicate'}};const r={...this.value,id:rows.length+1};rows.push(r);matches=[r]}if(this.op==='update')matches.forEach(r=>Object.assign(r,structuredClone(this.value)));matches=matches.slice(this.start,this.end+1);return{data:structuredClone(this.one?matches[0]||null:matches),error:null}}).then(resolve,reject)}
 }
 return {j,tables,d:{admin:{from:t=>new Q(t)},json:(_r,b,status=200)=>new Response(JSON.stringify(b),{status})}};
}
const req=()=>new Request('https://example.com/',{method:'PATCH'});
test('Packet is read-only; copy/recheck/skip only change private review rows',async()=>{
 const {j,tables,d}=setup(),revision=await revisionOf(j),before=JSON.stringify(tables.command_center_sourcing_reviews);
 let r=await nekoPatch(req(),{action:'neko_packet',id:j.id,revision},d);assert.equal(r.status,200);assert.match((await r.json()).packet,/清書/);assert.equal(tables.command_center_task_events.length,1);
 for(const action of ['neko_copied','neko_recheck','neko_skip']){r=await nekoPatch(req(),{action,id:j.id,revision},d);assert.equal(r.status,200)}
 assert.equal(tables.command_center_task_events.length,2);assert.equal(tables.command_center_task_events[1].task_id,REVIEW_TASK);assert.equal(JSON.stringify(tables.command_center_sourcing_reviews),before);assert.deepEqual(tables.command_center_task_events[0].payload.job,j);
});
test('Stale revision, stock changes, source holds and publisher actions cannot produce a packet',async()=>{
 const {j,tables,d}=setup(),revision=await revisionOf(j);
 assert.equal((await nekoPatch(req(),{action:'neko_packet',id:j.id,revision:'old'},d)).status,409);
 tables.command_center_sourcing_reviews[0].verdict='close';assert.equal((await nekoPatch(req(),{action:'neko_packet',id:j.id,revision},d)).status,409);
 assert.equal((await nekoPatch(req(),{action:'neko_publish',id:j.id,revision},d)).status,400);assert.equal(tables.command_center_task_events.length,1);
 const data=await (await nekoGet(new Request('https://example.com/?resource=binbo-neko'),d)).json();assert.equal(data.jobs[0].state_key,'waiting');assert.equal(data.manual.affiliate_link,true);
});
test('Purchase pagination catches an exact purchase beyond the first 500 rows',async()=>{
 const {j,tables,d}=setup();tables.command_center_sourcing_purchases=Array.from({length:501},(_,i)=>({id:i,sku:i===500?'ABC123':'OTHER'+i,status:'purchased'}));const data=await(await nekoGet(new Request('https://example.com/?resource=binbo-neko'),d)).json();assert.equal(data.jobs[0].state_key,'waiting');assert.ok(data.jobs[0].issues.some(x=>x.includes('購入記録')));
});
