// DOM unit test, with no browser control or calls to live services.
// Install jsdom in a scratch directory and pass AFFILIATE_UI_TEST_MODULES.
import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {createRequire} from 'node:module';import {webcrypto} from 'node:crypto';
const dependencyRoot=process.env.AFFILIATE_UI_TEST_MODULES;
const fixtureRoot=process.env.AFFILIATE_UI_FIXTURE_DIR;
const require=dependencyRoot?createRequire(dependencyRoot+'/package.json'):null;
const {JSDOM,VirtualConsole}=require?require('jsdom'):{};
const wait=async(fn)=>{const start=Date.now();while(!fn()){if(Date.now()-start>5000)throw new Error('DOM state did not settle');await new Promise(r=>setTimeout(r,10))}};
test('Desk hands off all copy, imports ordered files, displays only stored finished images and approves after import',{skip:!dependencyRoot||!fixtureRoot},async()=>{
 const errors=[],v=new VirtualConsole();v.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(await fs.readFile(fixtureRoot+'/fixture.html','utf8'),{runScripts:'dangerously',url:'https://isolated-affiliate-test.invalid/',virtualConsole:v,beforeParse(w){
  Object.defineProperty(w,'crypto',{value:webcrypto});Object.assign(w,{Request,Response,Headers,AbortSignal,TextEncoder,TextDecoder,structuredClone});
  let id=0;w.URL.createObjectURL=()=>`blob:test-${++id}`;w.URL.revokeObjectURL=()=>{};
  w.Image=class{naturalWidth=800;naturalHeight=1000;decode(){return Promise.resolve()}};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'))};
 }});
 try{const w=dom.window,d=w.document;await wait(()=>w.CCAffiliateProduction?.state.data);
  assert.match(d.querySelector('.affiliate-state').textContent,/清書待ち/);assert.equal(d.querySelector('[data-approve]').disabled,true);assert.equal(d.querySelector('[data-import]').disabled,true);
  await d.querySelector('[data-handoff]').onclick();assert.match(d.querySelector('#packet-result').textContent,/全ページ指示あり/);assert.equal(d.querySelector('[data-import]').disabled,false);
  d.querySelector('[data-import]').onclick();const input=d.querySelector('dialog input[type=file]');const files=[];for(let i=9;i>=1;i--)files.push(new w.File([await fs.readFile(`${fixtureRoot}/${String(i).padStart(2,'0')}.png`)],`${String(i).padStart(2,'0')}.png`,{type:'image/png'}));
  Object.defineProperty(input,'files',{value:files,configurable:true});await input.onchange();assert.match(d.querySelector('.affiliate-import-page p').textContent,/1枚目｜01.png/);assert.equal(d.querySelector('[data-save]').disabled,false);
  const first=d.querySelector('[data-move="0"][data-delta="1"]');first.onclick();assert.match(d.querySelector('.affiliate-import-page p').textContent,/1枚目｜02.png/);d.querySelector('[data-move="0"][data-delta="1"]').onclick();
  // Put the pages back into original order after the first two swap tests.
  const old=[...d.querySelectorAll('.affiliate-import-page p')].map(p=>p.textContent);assert.match(old[0],/01.png/);
  await d.querySelector('[data-save]').onclick();await wait(()=>!d.querySelector('[data-approve]').disabled);
  assert.match(d.querySelector('.affiliate-state').textContent,/完成画像・原稿の確認待ち/);assert.equal(d.querySelectorAll('.affiliate-slide img').length,9);assert.ok([...d.querySelectorAll('.affiliate-slide img')].every(i=>i.src.startsWith('data:image/png;base64,')));
  d.querySelector('[data-page="0"]').onclick();assert.match(d.querySelector('#affiliatePreview').textContent,/取り込んだ完成画像/);d.querySelector('#affiliatePreviewClose').onclick();
  await d.querySelector('[data-approve]').onclick();assert.match(d.querySelector('.affiliate-state').textContent,/承認済み・接続待ち/);assert.equal(d.querySelector('[data-queue]'),null);assert.equal(w.CCAffiliateProduction.state.data.jobs[0].dispatch,null);
  await d.querySelector('[data-recheck]').onclick();assert.match(d.querySelector('.affiliate-state').textContent,/自動再確認待ち/);assert.equal(d.querySelector('[data-approve]').disabled,true);assert.equal(w.CCAffiliateProduction.state.data.jobs[0].finished_images,null);assert.deepEqual(errors,[]);
 }finally{dom.window.close()}
});
