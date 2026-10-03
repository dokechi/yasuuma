/* Dependency-free DOM contract tests. No live API or persistent storage. */
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const D=require('./command-center-data.js');

function harness(){
  const nodes=new Map(),listeners=new Map(),timers=[];
  class Node{
    constructor(id=''){this.id=id;this.dataset={};this.hidden=false;this.textContent='';this.attrs={};this._html='';this.classList={add(){},remove(){},toggle(){}}}
    set innerHTML(html){this._html=html;for(const match of html.matchAll(/\bid="([^"]+)"/g))if(!nodes.has(match[1]))nodes.set(match[1],new Node(match[1]))}
    get innerHTML(){return this._html}
    querySelector(sel){if(sel.startsWith('#'))return nodes.get(sel.slice(1))||null;return new Node()}
    querySelectorAll(){return []}
    insertAdjacentHTML(where,html){this.innerHTML=html}
    insertAdjacentElement(){} appendChild(){} scrollIntoView(){} setAttribute(key,value){this.attrs[key]=value}
    addEventListener(name,fn){(this.events??={})[name]=fn}
  }
  for(const id of ['mainWindow','viewTabs','refreshBtn','fileRefresh','helpModal','homeSystemAlert','homeSystemAlertText'])nodes.set(id,new Node(id));
  const document={getElementById:id=>nodes.get(id)||null,createElement:()=>new Node(),body:new Node(),querySelectorAll:()=>[],querySelector:()=>null,
    addEventListener:(name,fn)=>{const list=listeners.get(name)||[];list.push(fn);listeners.set(name,list)},dispatchEvent:event=>{for(const fn of listeners.get(event.type)||[])fn(event)}};
  const ctx={document,console:{warn(){}},API:'https://isolated.invalid/api',authHeaders:()=>({}),authExpired:()=>assert.fail('unexpected auth'),
    app:{view:'active',busy:false},labels:{ai:'AI'},bump(){},fmtUpdated:value=>'time:'+String(value),esc:value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),
    setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length},clearTimeout(){},AbortController,CustomEvent:class{constructor(type){this.type=type}},Date,
    load:async()=>{},setSelected(){},scrollToList(){},toast(){},openTasks(){},fetch:async()=>({ok:true,json:async()=>({ok:true,items:[],tasks:[]})})};
  ctx.window=ctx;ctx.CCData=D;ctx.scrollTo=()=>{};ctx.CCX={request:async()=>({ok:true,items:[]})};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/v155-home.js','utf8'),ctx);
  return {ctx,H:ctx.CCHome,nodes,timers};
}
test('HOME reports unavailable first-load data instead of empty success or endless loading',()=>{
  const {H,nodes}=harness();H.errors.active=true;H.errors.sourcing=true;H.errors.cards=true;H.render();
  for(const id of ['homeCardsList','homeGalList','homeHouseList','homeSourcingList','homeOtherList']){
    assert.match(nodes.get(id).innerHTML,/取得できませんでした/);assert.doesNotMatch(nodes.get(id).innerHTML,/読み込み中|ありません/);
  }
  assert.equal(nodes.get('homeSystemAlert').hidden,false);
});
test('a failed refresh preserves previous rows and labels them as stale',()=>{
  const {H,nodes}=harness();H.loaded.cards=true;H.errors.cards=true;H.cardItems=[{id:'a',productName:'前回の商品',updatedAt:'2026-10-02'}];H.render();
  assert.match(nodes.get('homeCardsList').innerHTML,/前回取得した情報/);assert.match(nodes.get('homeCardsList').innerHTML,/前回の商品/);
  assert.equal(nodes.get('homeCardsList').dataset.loadState,'stale');
});
test('successful empty source is explicitly empty; invalid dates and titles are rendered safely',()=>{
  const {H,nodes}=harness();H.loaded.cards=true;H.render();assert.match(nodes.get('homeCardsList').innerHTML,/この一覧に表示する情報はありません/);
  H.cardItems=[{id:'safe',productName:'<script>alert(1)</script>',updatedAt:'bad'}];H.render();
  assert.match(nodes.get('homeCardsList').innerHTML,/日時不明/);assert.doesNotMatch(nodes.get('homeCardsList').innerHTML,/<script>/);
});
test('same item ID and timestamp with corrected title is rerendered',()=>{
  const {H,nodes}=harness();H.loaded.cards=true;H.cardItems=[{id:'a',productName:'古い題名',updatedAt:'2026-10-02'}];H.render();
  H.cardItems=[{id:'a',productName:'修正した題名',updatedAt:'2026-10-02'}];H.render();
  assert.match(nodes.get('homeCardsList').innerHTML,/修正した題名/);assert.doesNotMatch(nodes.get('homeCardsList').innerHTML,/古い題名/);
});
test('async source fetch deduplicates display data while retaining untouched raw response',async()=>{
  const {ctx,H,timers}=harness();const items=[{id:'a',lastSeen:'2026-10-01'},{id:'a',lastSeen:'2026-10-03'}];
  ctx.fetch=async()=>({ok:true,json:async()=>({ok:true,items,tasks:[]})});
  await timers.find(t=>t.ms===180).fn();
  assert.equal(H.activeItems.length,1);assert.equal(H.raw.active.items.length,2);assert.equal(H.loading,false);
  assert.equal(H.errors.active,false);
});
test('non-array data is a source error and does not discard cached records',async()=>{
  const {ctx,H,nodes,timers}=harness();H.loaded.active=true;H.activeItems=[{id:'known',title:'保存された表示',domain:'ai'}];
  ctx.fetch=async()=>({ok:true,json:async()=>({ok:true,items:null,tasks:[]})});
  await timers.find(t=>t.ms===180).fn();
  assert.equal(H.errors.active,true);assert.equal(H.activeItems.length,1);assert.match(nodes.get('homeOtherList').innerHTML,/保存された表示/);
});
