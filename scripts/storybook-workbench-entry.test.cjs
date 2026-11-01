'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const {openStorybookOverview,openReaderWork,closeReaderWork,toggleLivingTools}=require('./storybook-workbench-entry.cjs');
function fixture(t,{working=true,ready=true,overview=false}={}){
 const dom=new JSDOM('<!doctype html><body><section id="room"><button id="back">Back</button><details class="spatial-work"><summary>Old work</summary><div class="spatial-work-body">Work</div></details><button class="living-toggle">Old tools</button></section><section class="account-board"></section></body>');t.after(()=>dom.window.close());
 const d=dom.window.document,room=d.getElementById('room'),board=d.querySelector('.account-board'),work=d.querySelector('.spatial-work'),events=[];
 room.hidden=overview;board.hidden=!overview;
 const leave=()=>{events.push('owner-back');room.hidden=true;board.hidden=false;if(header)header.hidden=true;};
 d.getElementById('back').addEventListener('click',leave);d.querySelector('.living-toggle').onclick=()=>events.push('old-tools');
 let header=null;
 if(working){d.body.className='storybook-workbench';if(ready)d.body.dataset.workbookReady='true';header=d.createElement('header');header.className='workbook-header';header.hidden=overview;header.innerHTML='<details class="workbook-menu"><summary>Menu</summary><button>本の全景</button><button>作業・読取状況</button></details><button data-working-tools>Tools</button>';d.body.append(header);const menu=header.querySelector('details');menu.querySelectorAll('button')[0].onclick=()=>{menu.open=false;d.getElementById('back').click();};menu.querySelectorAll('button')[1].onclick=()=>{menu.open=false;work.open=true;events.push('work');};header.querySelector('[data-working-tools]').onclick=()=>events.push('working-tools');}
 const visible=n=>{if(n?.dataset.zeroBox==='true')return false;return !!n&&!n.closest('[hidden]')&&!n.parentElement?.closest('details:not([open])')||!!n?.matches('summary')&&!n.closest('[hidden]');};
 class Locator{
  constructor(get){this.get=get;}one(){const nodes=this.get();assert.equal(nodes.length,1,'one real matching control required');return nodes[0];}
  locator(s){return new Locator(()=>this.get().flatMap(n=>[...n.querySelectorAll(s)]));}
  getByRole(role,{name,exact}){assert.equal(role,'button');assert.equal(exact,true);return new Locator(()=>this.get().flatMap(n=>[...n.querySelectorAll('button')]).filter(n=>n.textContent===name));}
  async count(){return this.get().length;}async evaluate(fn){return fn(this.one());}async isVisible(){return visible(this.get()[0]);}
  async waitFor({state='visible'}={}){assert.ok(state==='attached'?this.get().length>0:visible(this.get()[0]),'required '+state+' control');}
  async click(options){assert.equal(options,undefined,'never force clicks');const n=this.one();assert.ok(visible(n),'only visible controls are clicked');events.push(n.textContent);n.click();}
  async press(key){assert.equal(key,'Escape');assert.ok(visible(this.one()));work.open=false;d.querySelector('.workbook-menu')?.removeAttribute('open');events.push('Escape');}
 }
 const frame={locator:s=>new Locator(()=>[...d.querySelectorAll(s)])},page={keyboard:{press:async key=>{assert.equal(key,'Escape');work.open=false;events.push('Escape');}}};return{d,frame,page,events,room,board,work};
}
test('work-first overview is an explicit visible menu action through the original Back control',async t=>{const h=fixture(t);await openStorybookOverview(h.frame);assert.deepEqual(h.events,['Menu','本の全景','owner-back']);assert.ok(h.room.hidden&&!h.board.hidden);});
test('an already visible overview is not routed again',async t=>{const h=fixture(t,{overview:true});await openStorybookOverview(h.frame);assert.deepEqual(h.events,[]);});
test('missing workbench readiness fails instead of pretending the default is an old cover',async t=>{const h=fixture(t,{ready:false});await assert.rejects(openStorybookOverview(h.frame),/required attached/);assert.deepEqual(h.events,[]);assert.equal(h.room.hidden,false);});
test('existing archived presentation keeps its actual original Back and work controls',async t=>{const h=fixture(t,{working:false});await openReaderWork(h.frame);assert.equal(h.work.open,true);await closeReaderWork(h.page,h.frame);assert.equal(h.work.open,false);await toggleLivingTools(h.frame);await openStorybookOverview(h.frame);assert.deepEqual(h.events,['Old work','Old work','Old tools','old-tools','Back','owner-back']);});
test('work disclosure and tools use visible workbench controls without changing reader identity',async t=>{const h=fixture(t),room=h.room;await openReaderWork(h.frame);await openReaderWork(h.frame);assert.equal(h.events.filter(x=>x==='work').length,1);await closeReaderWork(h.page,h.frame);await toggleLivingTools(h.frame);assert.equal(h.room,room);assert.equal(h.room.hidden,false);assert.deepEqual(h.events,['Menu','作業・読取状況','work','Escape','Tools','working-tools']);});
test('overlapping work disclosure is closed using Escape before the overview menu',async t=>{const h=fixture(t);h.work.open=true;await openStorybookOverview(h.frame);assert.deepEqual(h.events,['Escape','Menu','本の全景','owner-back']);assert.equal(h.work.open,false);});

test('an open zero-area details wrapper still exposes its actual absolute-positioned work surface',async t=>{const h=fixture(t);h.work.dataset.zeroBox='true';await openReaderWork(h.frame);assert.equal(await h.frame.locator('.spatial-work').isVisible(),false);assert.equal(await h.frame.locator('.spatial-work-body').isVisible(),true);assert.equal(h.work.open,true);});
test('an already open but hidden work surface fails instead of passing on its open attribute',async t=>{const h=fixture(t);h.work.open=true;h.work.querySelector('.spatial-work-body').hidden=true;await assert.rejects(openReaderWork(h.frame),/required visible/);assert.deepEqual(h.events,[]);});
