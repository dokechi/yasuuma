'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const M=require('./rpg-workspaces.js');
const source=fs.readFileSync(path.join(__dirname,'rpg-workspaces.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'rpg-workspaces.css'),'utf8');

test('only exact house/career tags and verified task IDs are archived',()=>{
 for(const row of [
  {payload:{content_type:'house_post_candidate'}},{payload:{category:'house_living'}},
  {taskId:'6aa77eb5ce7881919d8dc62554833b60'},
  {id:'sns:task:6aa9edd177fc8191a1e4b665930ee071:entry'},
  {payload:{content_type:'career_post_candidate'}},{payload:{category:'career_large'}},
  {payload:{logical_task_id:'6aaca7d36874819181caec8ba014556e'}}
 ])assert.equal(M.isArchived(row),true,JSON.stringify(row));
 for(const row of [{payload:{category:'house'}},{payload:{category:'career'}},{payload:{content_type:'house_post_candidate_extra'}},{taskId:'6aa77eb5ce7881919d8dc62554833b60-extra'},{title:'家・上場原稿'}])assert.equal(M.isArchived(row),false);
});

test('unknown, FP, card, affiliate and neko records remain daily at every age',()=>{
 for(const content_type of [undefined,'fp_post_candidate','affiliate_production','binbo_neko','card_post_candidate','unknown']){
  for(const createdAt of ['2000-01-01','2026-10-12','2099-01-01',undefined])assert.equal(M.isDaily({payload:{content_type},createdAt}),true);
 }
 assert.equal(M.isDaily({title:'house career archived old production'}),true);
});

test('sourcing metadata takes priority over conflicting archival metadata',()=>{
 for(const row of [
  {domain:'sourcing',payload:{category:'house_living'}},
  {payload:{domain:'sourcing',content_type:'career_post_candidate'}},
  ...['sourcing_candidate','sourcing_purchase','sourcing_inventory','sourcing_sale'].map(content_type=>({taskId:'6aaca7d36874819181caec8ba014556e',payload:{content_type}}))
 ])assert.equal(M.classify(row),'sourcing');
});

test('display filtering leaves original frozen arrays and records unchanged',()=>{
 const rows=Object.freeze([Object.freeze({id:'unknown'}),Object.freeze({id:'source',domain:'sourcing'}),Object.freeze({id:'house',payload:Object.freeze({category:'house_living'})})]);
 const saved=JSON.stringify(rows),daily=M.dailyItems(rows),archive=M.archiveItems(rows);
 assert.deepEqual(daily.map(x=>x.id),['unknown','source']);assert.deepEqual(archive.map(x=>x.id),['house']);assert.equal(daily[0],rows[0]);assert.equal(archive[0],rows[2]);assert.equal(JSON.stringify(rows),saved);
});

function mount(){
 const ids=new Map(),targets=new Map(),calls=[],listeners=[];
 class Element{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.dataset={};this.children=[];this.textContent='';this.hidden=false;this.events={};this.classList={add(){},remove(){},toggle(){}};}
  append(...items){this.children.push(...items);}after(el){ids.set(el.id,el);}before(){}setAttribute(k,v){this[k]=v;}removeAttribute(k){delete this[k];}
  querySelector(selector){if(selector==='.cc-heading')return this;return null;}querySelectorAll(){return [];}
  addEventListener(name,fn){this.events[name]=fn;}replaceChildren(...items){this.children=items;}remove(){}focus(){}showModal(){}close(){this.events.close?.();}click(){this.events.click?.();}
 }
 for(const id of ['ccDestination','mainWindow','homeOtherList','kpiLabelCount','kpiLabelStored','kpiStored'])ids.set(id,new Element());
 for(const selector of ['#redditViewBtn','#xViewBtn','#fpDraftViewBtn','#menuDaily','#menuCooney','#menuShiireInochi','#commandHome [data-home-action="sourcing-queue"]'])targets.set(selector,{click:()=>calls.push(selector)});
 const app={view:'active',domain:'all',items:Object.freeze([{id:'unknown'},{id:'house',payload:{category:'house_living'}},{id:'source',domain:'sourcing'}])};
 const root={app,document:{body:new Element(),getElementById:id=>ids.get(id)||null,querySelector:s=>targets.get(s)||null,createElement:t=>new Element(t),addEventListener:(...args)=>listeners.push(args)},CCHome:{active:true,activeItems:[],raw:{},show(){this.active=true;calls.push('H.show');},leave(){this.active=false;calls.push('H.leave');}},CCRpgHome:{showRpg:()=>calls.push('home'),showLegacy:()=>calls.push('original')},load:view=>calls.push(view),scopedItems:()=>app.items,renderStats:()=>{},MutationObserver:class{observe(){}},console};
 vm.runInContext(source,vm.createContext(root));return {root,calls,ids,app,listeners};
}

test('mounted API routes to all original sourcing/card/FP and three external services',()=>{
 const {root,calls}=mount(),api=root.CCRpgWorkspaces;
 for(const name of ['openSettings','openSourcing','openWatches','openCards','openFp','openService','openArchive'])assert.equal(typeof api[name],'function',name);
 api.openSourcing();api.openWatches();api.openCards();api.openFp();for(const key of ['daily','cooney','shiire'])assert.equal(api.openService(key),true);
 assert.deepEqual(calls,['#commandHome [data-home-action="sourcing-queue"]','#redditViewBtn','#xViewBtn','#fpDraftViewBtn','#menuDaily','#menuCooney','#menuShiireInochi']);assert.equal(api.openService('unknown'),false);
});

test('mounted scope wrapper is reversible and daily count matches visible source subset',()=>{
 const {root,ids,app}=mount(),original=app.items;
 assert.deepEqual(Array.from(root.scopedItems(),x=>x.id),['unknown','source']);root.renderStats();assert.equal(ids.get('kpiStored').textContent,'2件');
 root.CCRpgWorkspaces.setMode('archive');assert.equal(root.scopedItems(),original);root.CCRpgWorkspaces.setMode('daily');assert.equal(app.items,original);
});

test('loaded archive scope is honest and original pagination remains accessible',()=>{
 assert.match(source,/読込済みの記録だけ/);assert.match(source,/最大100件/);assert.match(source,/全件を網羅しません/);assert.match(source,/task-events の続き/);assert.match(source,/openView\('events',true\)/);
 assert.match(source,/続き100件を読む/);assert.match(source,/resultPage\.nextOffset/);
});

test('module performs no direct network, data persistence, imports or credential writes',()=>{
 assert.doesNotMatch(source,/\bfetch\s*\(|localStorage|sessionStorage|indexedDB|supabase\.|\.from\s*\(|method\s*:\s*['"](?:POST|PATCH|DELETE|PUT)|Bearer\s/);
 assert.doesNotMatch(source,/app\.items\s*=|H\.(?:activeItems|houseItems|galItems)\s*=|sourcingApp\.[a-zA-Z]+\s*=/);
 assert.doesNotMatch(source,/library_file_id|api_key|service_role|sk-[A-Za-z0-9]{10}/);
});

test('neko original controls are untouched and detail art uses proportional alternate-costume crop',()=>{
 assert.match(source,/紹介用原稿・旧ねこ/);assert.match(source,/openView\('binbo-neko'\)/);assert.match(source,/rpg-neko-aux-ready/);
 assert.match(css,/--rpg-fp-character:url\('\.\/assets\/rpg-home\/detail-swimwear\.png(?:\?v=[^']+)?'\)/);assert.match(css,/background-size:310px auto/);assert.match(css,/data-rpg-desk="reddit"/);assert.match(css,/data-rpg-desk="x"/);
 assert.doesNotMatch(css,/\[data-rpg-scope="daily"\][^{]*sourcing[^{]*\{display:none/);
});

test('old navigation relocates only in daily mode and existing logout remains reachable',()=>{
 for(const selector of ['#mainWindow>.title-bar','#mainWindow>.menu-bar','#ccPrimaryNav','.home-mobile-nav'])assert.ok(css.includes('body[data-rpg-scope="daily"] '+selector));
 assert.doesNotMatch(css,/body\[data-rpg-scope="archive"\][^{]*\{display:none/);
 assert.match(source,/ログアウト.*activate\('#fileLogout'\)/);
});

test('the retired original-screen alias opens the castle without enabling legacy archive presentation',()=>{
 const {root,calls}=mount();root.CCHome.active=false;root.CCCastle={show:()=>{root.CCHome.active=true;calls.push('castle');}};root.CCRpgWorkspaces.showOriginal();
 assert.deepEqual(calls,['castle']);assert.equal(root.CCHome.active,true);assert.equal(root.CCRpgWorkspaces.mode,'daily');
});

test('sourcing auxiliary current state tracks each route without altering navigation',()=>{
 const {root,app}=mount();root.CCHome.active=false;
 const aux=root.document.getElementById('rpgSourcingAux');
 for(const view of ['sourcing','reddit','x','binbo-neko','affiliate','fp']){app.view=view;root.CCRpgWorkspaces.setMode('daily');const selected=aux.children.filter(el=>el['aria-current']==='page');assert.equal(selected.length,view==='fp'?0:1);if(selected.length)assert.equal(selected[0].dataset.rpgAuxView,view);}root.CCHome.active=true;root.CCRpgWorkspaces.setMode('daily');assert.equal(aux.children.some(el=>el['aria-current']),false);
 assert.match(source,/back.textContent='← 司令塔'/);
 assert.match(source,/el.setAttribute\('aria-current','page'\)/);
 assert.match(source,/el.removeAttribute\('aria-current'\)/);
 assert.match(css,/\[aria-current="page"\]/);
 assert.match(css,/--rpg-detail-title:clamp\(27px,4vw,38px\)/);
});

test('workspace heroes reuse large scene and portraits with dedicated text and action lanes',()=>{
 assert.match(css,/center top\/max\(940px,100%\) auto no-repeat/);
 assert.match(css,/width:220px;height:225px;background-size:620px auto/);
 assert.match(css,/width:166px;height:190px;background-size:520px auto/);
 assert.match(css,/height:154px;background-position:right -530px/);
 assert.match(css,/padding-right:152px;min-height:180px/);
});

test('mobile refinement keeps portrait dimensions and touch targets while tightening whitespace',()=>{
 const refinement=css.split('/* Secondary destinations stay reachable')[1];
 assert.match(refinement,/min-height:162px/);assert.match(refinement,/row-gap:4px!important/);
 assert.match(refinement,/min-height:44px/);assert.doesNotMatch(refinement,/display:none|visibility:hidden|height:154px|height:190px|background-size/);
 assert.match(refinement,/\.cc-more-button,\.rpg-workspace-settings/);assert.match(refinement,/#ccRefreshSlot/);
});


test('only portrait desks reserve title padding and minimum height',()=>{
 const blocks=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(m=>m[1].includes('.cc-heading>div'));
 assert.ok(blocks.length>3);
 for(const [,selector,body] of blocks)if(/padding-right|min-height/.test(body)){
  for(const key of ['fp','sourcing','reddit','x'])assert.ok(selector.includes('[data-rpg-desk="'+key+'"]'),selector);
 }
 assert.match(css,/\.rpg-workspace-heading \.cc-heading>div\{grid-column:1\/-1;min-width:0\}/);
});
