'use strict';
const {JSDOM}=require('jsdom'),{readFileSync}=require('node:fs'),assert=require('node:assert/strict');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jBf8AAAAASUVORK5CYII=','base64');
const source=readFileSync(require('node:path').join(__dirname,'../command-center-98/threads-images.js'),'utf8');
async function until(fn){for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,2));}throw Error('UI did not reach expected state');}
async function run(){
 const dom=new JSDOM('<!doctype html><html lang="ja"><head></head><body><pre id="copy">Original English manuscript</pre><div id="host"></div></body></html>',{url:'https://dokechi.github.io/yasuuma/command-center-98/app-v130.html',runScripts:'outside-only'}),w=dom.window,host=w.document.getElementById('host');
 const calls=[],downloads=[],assets=new Map();let revision=0,images=[{url:'https://images.example.test/one.png',label:'Existing image'}],fail=false,hold=null,serial=0;
 w.authHeaders=()=>({authorization:'Bearer synthetic-fixture'});w.CCCastle={refresh:()=>{}};
 w.Image=class{naturalWidth=240;naturalHeight=180;decode(){return Promise.resolve();}};
 w.URL.createObjectURL=()=> 'blob:fixture-'+(++serial);w.URL.revokeObjectURL=()=>{};
 w.HTMLAnchorElement.prototype.click=function(){downloads.push({href:this.href,name:this.download});};
 w.fetch=async(url,options={})=>{
  if(String(url).startsWith('data:image/'))return new Response(Buffer.from(String(url).split(',')[1],'base64'),{headers:{'Content-Type':'image/png'}});
  assert.equal(new URL(String(url)).hostname,'yibtmqsbyodhsudenktm.supabase.co');assert.equal(options.headers.authorization,'Bearer synthetic-fixture');
  const body=options.body?JSON.parse(options.body):null;calls.push({body});
  if(body){if(hold)await hold;if(fail)return new Response(JSON.stringify({ok:false,error:'synthetic_failure'}),{status:503});assert.equal(body.expectedRevision,revision);
   images=body.images.map(x=>{if(!x.dataUrl)return x;const assetKey='threads:1:'+String(assets.size+1).repeat(64);assets.set(assetKey,x.dataUrl);const {dataUrl,...meta}=x;return {...meta,assetKey};});revision++;}
  return new Response(JSON.stringify({ok:true,id:1,accountKey:'choi',manifest:{contract:'threads-post-images-v1',revision,images},assets:images.map(x=>x.assetKey?{...x,dataUrl:assets.get(x.assetKey)}:x)}),{headers:{'Content-Type':'application/json'}});
 };
 w.eval(source);let controller=w.CCThreadsImages.mount(host,{id:'1',accountKey:'choi'});
 const text=()=>host.textContent,buttons=()=>[...host.querySelectorAll('button')],button=name=>buttons().find(b=>b.textContent===name),writes=()=>calls.filter(c=>c.body),labels=()=>[...host.querySelectorAll('figcaption')].map(n=>n.textContent);
 await until(()=>text().includes('画像と順番を読込済み'));assert.equal(host.querySelectorAll('figure').length,1);assert.equal(button('画像と順番を保存').disabled,true);
 const input=host.querySelector('input[type=file]');Object.defineProperty(input,'files',{configurable:true,value:[new w.File([png],'new.png',{type:'image/png'})]});input.dispatchEvent(new w.Event('change'));
 await until(()=>host.querySelectorAll('figure').length===2);assert.equal(writes().length,0);assert.equal(button('画像と順番を保存').disabled,false);assert.equal(host.querySelector('[aria-label="1枚目を前へ"]').disabled,true);
 host.querySelector('[aria-label="2枚目を前へ"]').click();assert.ok(labels()[0].includes('new.png'));assert.ok(labels()[1].includes('Existing image'));
 fail=true;await button('画像と順番を保存').onclick();assert.ok(text().includes('変更はこの画面に残っています'));assert.equal(host.querySelectorAll('figure').length,2);const retryId=writes()[0].body.mutationId;
 fail=false;await button('画像と順番を保存').onclick();assert.equal(writes()[1].body.mutationId,retryId);assert.ok(text().includes('画像と順番を保存しました'));assert.equal(button('画像と順番を保存').disabled,true);assert.equal(assets.size,1);assert.ok(assets.values().next().value.endsWith(png.toString('base64')));
 controller.destroy();controller=w.CCThreadsImages.mount(host,{id:'1',accountKey:'choi'});await until(()=>text().includes('読込済み'));assert.ok(labels()[0].includes('new.png'));assert.ok(labels()[1].includes('Existing image'));
 await button('この画像を保存').onclick();assert.equal(downloads.length,1);assert.match(downloads[0].name,/^01-new\.png$/);assert.ok(text().includes('保存を開始しました'));
 host.querySelector('[aria-label="2枚目を下書きから外す"]').click();assert.equal(host.querySelectorAll('figure').length,1);assert.equal(images.length,2);
 let release;hold=new Promise(r=>release=r);const saving=button('画像と順番を保存').onclick();await button('画像と順番を保存').onclick();assert.equal(writes().length,3);assert.equal(button('画像を追加').disabled,true);release();await saving;hold=null;assert.equal(images.length,1);
 assert.equal(w.document.getElementById('copy').textContent,'Original English manuscript');assert.equal(writes().some(c=>c.body.action!=='threads_images_save'),false);
 Object.defineProperty(input,'files',{configurable:true,value:[new w.File(['<svg/>'],'bad.svg',{type:'image/svg+xml'})]});
 const currentInput=host.querySelector('input[type=file]');Object.defineProperty(currentInput,'files',{configurable:true,value:[new w.File(['<svg/>'],'bad.svg',{type:'image/svg+xml'})]});currentInput.dispatchEvent(new w.Event('change'));await until(()=>text().includes('1枚6MB以内'));assert.equal(host.querySelectorAll('figure').length,1);
 controller.destroy();dom.window.close();console.log('PASS: real DOM upload selection, exact FileReader bytes, order, unsaved isolation, failed-save retention and idempotent retry, reload, per-image download, duplicate-click guard, removal, invalid files, original manuscript preserved');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
