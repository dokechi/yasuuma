// Production DOM integration with fully synthetic responses and no external I/O.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const root=process.env.COMMAND_CENTER_UI_MODULES;
const {JSDOM,VirtualConsole}=root?createRequire(root+'/package.json')('jsdom'):{};
const wait=async check=>{const start=Date.now();while(!check()){if(Date.now()-start>5000)throw Error('Synthetic DOM did not settle');await new Promise(r=>setTimeout(r,10))}};
async function setup(legacyEntry=false){
 const dir=new URL('../command-center-98/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL(legacyEntry?'tests/fixtures/app-assets.legacy.json':'app-assets.json',dir),'utf8'));
 let html=await fs.readFile(new URL('app.html',dir),'utf8');
 const core=await import('../supabase/functions/shared/affiliate-production.mjs');
 for(const url of manifest.styles)html=html.replace('</head>','<style>'+await fs.readFile(new URL(url.split('?')[0],dir),'utf8')+'</style></head>');
 // Inline the base menu script as well. jsdom does not fetch any external resources.
 html=html.replace(/<script src="\.\/v148-daily-report-link\.js[^\"]*"><\/script>/,'<script>'+await fs.readFile(new URL('v148-daily-report-link.js',dir),'utf8')+'</script>');
 for(const url of manifest.scripts){let code=await fs.readFile(new URL(url.split('?')[0],dir),'utf8');if(url.startsWith('./affiliate-production.js'))code=code.replace(/import\('[^']+'\)/,'Promise.resolve(window.__testAffiliateCore)');const end=html.lastIndexOf('</body>');html=html.slice(0,end)+'<script>'+code.replaceAll('</script','<\\/script')+'</script>'+html.slice(end);}
 const errors=[],calls=[],opened=[],v=new VirtualConsole();v.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://synthetic-command-center.invalid/',pretendToBeVisual:true,virtualConsole:v,beforeParse(w){
  Object.assign(w,{__testAffiliateCore:core,AbortSignal,structuredClone,TextEncoder,TextDecoder,scrollTo:()=>{}});w.HTMLElement.prototype.scrollIntoView=()=>{};w.open=(...args)=>opened.push(args);
  w.URL.createObjectURL=()=> 'blob:synthetic';w.URL.revokeObjectURL=()=>{};
  w.fetch=async(input,options={})=>{assert.equal((options.method||'GET').toUpperCase(),'GET','Navigation must not mutate data');calls.push(String(input));return new Response(JSON.stringify({ok:true,items:[],tasks:[],events:[],purchases:[],suppliers:[],programs:[],accounts:[],jobs:[],campaigns:[],counts:{},readyCount:0,total:0,nextOffset:null,publisher_connected:false}));};
 }});
 await wait(()=>dom.window.CCHome?.loaded.active&&!dom.window.CCHome.loading);
 return {dom,w:dom.window,d:dom.window.document,errors,calls,opened};
}
test('all original modules initialize with cleaned HOME, route groups and no runtime errors',{skip:!root},async()=>{
 const {dom,d,w,errors}=await setup();try{
  assert.ok(w.CCHome.readModel);assert.equal(d.querySelectorAll('#menuShiireInochi').length,1);
  assert.equal(d.querySelectorAll('.home-workspace').length,3);
  assert.deepEqual([...d.querySelector('#ccPrimaryNav').children].map(b=>b.dataset.homeAction||b.dataset.homeShortcut),['home','affiliate','binbo-neko','sourcing-queue','fp-draft','house-draft','x','daily','more']);
  const groupLabels=[...d.querySelectorAll('#ccMore .cc-route-heading')].map(h=>h.textContent);assert.deepEqual(groupLabels,['制作','情報・履歴','業務ツール']);
  for(const heading of d.querySelectorAll('#ccMore .cc-route-heading'))assert.ok(heading.nextElementSibling.classList.contains('home-launcher-card'));
  assert.deepEqual(errors,[]);
 }finally{await new Promise(resolve=>setTimeout(resolve,30));dom.window.close()}
});
test('latest-work entrypoints, HOME return, repeated More toggles and Escape keep routes usable',{skip:!root},async()=>{
 const {dom,d,w,errors}=await setup();try{
  d.querySelector('.home-workspace[data-cc-view="affiliate"]').click();await wait(()=>w.CCAffiliateProduction?.state.data);assert.equal(d.querySelector('#ccPageTitle').textContent,'半自動の投稿制作');assert.equal(d.querySelector('#affiliateDesk').hidden,false);
  d.querySelector('[data-home-action="home"]').click();assert.equal(w.CCHome.active,true);
  d.querySelector('.home-workspace[data-cc-view="binbo-neko"]').click();await wait(()=>w.CCBinboNeko?.state.data);assert.equal(d.querySelector('#ccPageTitle').textContent,'貧乏ねこ');assert.equal(d.querySelector('#binboNekoDesk').hidden,false);
  d.querySelector('[data-home-action="home"]').click();assert.equal(w.CCHome.active,true);
  const more=d.querySelector('#ccPrimaryNav [data-home-action="more"]');
  for(let i=0;i<2;i++){more.click();assert.equal(d.querySelector('#ccMore').hidden,false);d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(d.querySelector('#ccMore').hidden,true);assert.equal(d.activeElement,more)}
  assert.deepEqual(errors,[]);
 }finally{await new Promise(resolve=>setTimeout(resolve,30));dom.window.close()}
});
test('materials shortcut reuses the single existing secure external opener',{skip:!root},async()=>{
 const {dom,d,opened,errors}=await setup();try{
  d.querySelector('.home-workspace[data-home-shortcut="shiire"]').click();
  assert.deepEqual(opened,[['https://shiireinochi.vercel.app/','_blank','noopener,noreferrer']]);assert.deepEqual(errors,[]);
 }finally{await new Promise(resolve=>setTimeout(resolve,30));dom.window.close()}
});

test('cached legacy entry still initializes HOME and all navigation without the new helper tag',{skip:!root},async()=>{
 const {dom,d,w,errors}=await setup(true);try{
  assert.equal(w.CCData,undefined);assert.ok(w.CCHome?.readModel);assert.equal(w.CCHome.loaded.active,true);
  assert.equal(d.querySelectorAll('.home-workspace').length,3);
  assert.equal(d.querySelector('#ccPrimaryNav').children.length,9);
  d.querySelector('.home-workspace[data-cc-view="binbo-neko"]').click();await wait(()=>w.CCBinboNeko?.state.data);
  assert.equal(d.querySelector('#ccPageTitle').textContent,'貧乏ねこ');assert.equal(d.querySelector('#binboNekoDesk').hidden,false);
  assert.deepEqual(errors,[]);
 }finally{await new Promise(resolve=>setTimeout(resolve,30));dom.window.close()}
});
