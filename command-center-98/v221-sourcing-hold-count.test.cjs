const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'v221-sourcing-hold-first.js'),'utf8');
const priorSource=fs.readFileSync(require('node:path').join(__dirname,'v216-sourcing-status-flow.js'),'utf8');
function sourceFunction(name){
  const start=priorSource.indexOf('  function '+name+'(');
  assert.ok(start>=0);
  return priorSource.slice(start,priorSource.indexOf('\n  }',start)+4);
}

function harness(){
  const badge={textContent:''},caption={textContent:''},sections=[];
  const host={querySelector(selector){
    if(selector==='.sourcing-caption')return {querySelector:()=>caption};
    return null;
  },querySelectorAll:()=>[],appendChild:section=>sections.push(section)};
  const items=[...Array.from({length:12},(_,i)=>({id:'new'+i,ready:true})),
    {id:'close1',sourcingVerdict:'close'},{id:'close2',sourcingVerdict:'close'},
    {id:'miss',sourcingVerdict:'miss'},{id:'purchased',sourcingVerdict:'success'}];
  const context={sourcingApp:{sub:'hold',items,counts:{close:2}},sourcingResults:{loaded:false},
    research:[],sourcingResearchRecords:()=>context.research,isReadySourcing:x=>x.ready===true,
    cssSafe:x=>x,sourcingCardHtml:x=>x.id,window:{},
    document:{getElementById:id=>id==='sourcingBody'?host:id==='sourcingHoldCount'?badge:null,
      querySelector:()=>null,createElement:()=>({}),head:{appendChild(){}}},
    formatPurchaseCount(){},
  };
  vm.createContext(context);
  vm.runInContext(sourceFunction('researchCount')+'\n'+sourceFunction('syncCounts')+'\nrenderSourcing=function(){syncCounts()};',context);
  vm.runInContext(source,context);
  return {context,badge,caption,sections};
}

test('hold and every other tab use the same target definition without changing records',()=>{
  const h=harness(),before=JSON.stringify(h.context.sourcingApp.items);
  h.context.sourcingResults.loaded=true;h.context.research=Array(217).fill({});
  for(const sub of ['hold','purchases','miss','supplier','hold']){
    h.context.sourcingApp.sub=sub;h.context.renderSourcing();
    assert.equal(h.badge.textContent,'231',sub);
    if(sub==='hold')assert.equal(h.caption.textContent,'231件');
  }
  assert.equal(JSON.stringify(h.context.sourcingApp.items),before);
  assert.match(h.sections[0].innerHTML,/new0/);
  assert.match(h.sections[0].innerHTML,/new11/);
});

test('async research arrival updates the badge on purchases and remains stable after tab switches',async()=>{
  const h=harness();h.context.renderSourcing();assert.equal(h.badge.textContent,'14');
  h.context.sourcingApp.sub='purchases';h.context.renderSourcing();assert.equal(h.badge.textContent,'14');
  await Promise.resolve();
  h.context.research=Array(217).fill({});h.context.sourcingResults.loaded=true;
  h.context.renderSourcing();assert.equal(h.badge.textContent,'231');
  h.context.sourcingApp.sub='hold';h.context.renderSourcing();
  assert.equal(h.badge.textContent,'231');assert.equal(h.caption.textContent,'231件');
  h.context.sourcingApp.sub='purchases';h.context.renderSourcing();assert.equal(h.badge.textContent,'231');
});

test('count reflects current records and final readiness predicate rather than stale server totals',()=>{
  const h=harness();h.context.sourcingApp.counts.close=999;
  h.context.sourcingApp.items[0].ready=false;
  h.context.sourcingApp.sub='purchases';h.context.renderSourcing();assert.equal(h.badge.textContent,'13');
  h.context.sourcingApp.items=[];h.context.renderSourcing();assert.equal(h.badge.textContent,'0');
});
