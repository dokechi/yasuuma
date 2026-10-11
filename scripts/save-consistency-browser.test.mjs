import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const chrome=process.env.CC_TEST_CHROME||[
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'
].find(p=>fs.existsSync(p));
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('real Chrome retains card editor input on conflicts and permits a safe refresh', {timeout:60000}, async()=>{
  assert.ok(chrome,'Chrome is required: set CC_TEST_CHROME; this test must not silently skip');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc-sourcing-mobile-'));
  const fixture=path.join(dir,'fixture.html');
  const source=read('command-center-98/v160-card-publishing.js');
  const base=read('command-center-98/v142-x-desk.js');
  const dates=base.slice(base.indexOf(' X.deadlineDate='),base.indexOf(' X.recount='));
  const navigation=read('command-center-98/v167-navigation.js');
  const wrap=navigation.slice(navigation.indexOf('  function wrapCard('),navigation.indexOf('  function decorate('));
  const editor=source.slice(source.indexOf('  const modal=by('),source.lastIndexOf('})();'));
  fs.writeFileSync(fixture,'<!doctype html><meta charset="utf-8"><body><button id="xAdd"></button><div id="xEditor"></div><script>var by=id=>document.getElementById(id);var toast=()=>{};var X={state:{items:[]},headers:()=>({}),twitterLength:t=>t.length,update:()=>{throw Error("unexpected update")},load:async()=>{window.refreshed=(window.refreshed||0)+1},clip:async t=>{window.copied=t;return true},request:async options=>{window.savedBody=JSON.parse(options.body);throw Object.assign(Error("conflict"),{status:window.failureStatus})}};'+dates+';(()=>{'+editor+'})();</script>');
  fs.writeFileSync(fixture,fs.readFileSync(fixture,'utf8').replace('<body>','<meta name="viewport" content="width=device-width,initial-scale=1"><body>'));
  fs.appendFileSync(fixture,'<script>window.CCX=X;var serial=0;var openItems=new Map();var context=()=>"x";var app={view:"x"};var time=()=>null;var fmtUpdated=value=>new Date(value).toLocaleString();var stateLabels={};'+wrap+'</script>');
  const proc=spawn(chrome,['--headless','--no-sandbox','--disable-gpu','--no-first-run','--disable-background-networking','--disable-component-update','--remote-debugging-port=0','--user-data-dir='+path.join(dir,'profile'),'about:blank'],{windowsHide:true,stdio:'ignore'});
  let ws;let serial=0;const pending=new Map();
  try{
    const portFile=path.join(dir,'profile','DevToolsActivePort');
    const deadline=Date.now()+15000;
    while(!fs.existsSync(portFile)&&Date.now()<deadline&&proc.exitCode===null)await sleep(50);
    assert.ok(fs.existsSync(portFile),'headless Chrome did not start');
    const port=fs.readFileSync(portFile,'utf8').split('\n')[0];
    const targets=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
    ws=new WebSocket(targets.find(x=>x.type==='page').webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
    ws.onmessage=event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const {resolve,reject}=pending.get(message.id);pending.delete(message.id);message.error?reject(new Error(message.error.message)):resolve(message.result)}};
    const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
    await send('Page.enable');await send('Runtime.enable');
    for(const width of [320,375,390,700,1024]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<=700});
      await send('Page.navigate',{url:pathToFileURL(fixture).href});
      let ready=false;
      for(let n=0;n<100;n++){
        const r=await send('Runtime.evaluate',{expression:'!!window.X?.openEditor',returnByValue:true});
        if(r.result.value){ready=true;break}await sleep(30);
      }
      assert.ok(ready,'production editor block loaded');
      const result=await send('Runtime.evaluate',{awaitPromise:true,returnByValue:true,expression:
        '(async()=>{const checks=[];const ok=(name,value)=>checks.push({name,pass:!!value});X.openEditor({id:"synthetic",updatedAt:"2026-10-11T00:00:00.123456Z",productName:"original"});const node=by("xeProduct");node.value="unsaved synthetic edit";by("xeDraft").value="unsaved draft";for(const status of [409,428]){window.failureStatus=status;await by("xForm").onsubmit({preventDefault(){}});ok("input node retained "+status,by("xeProduct")===node&&node.value==="unsaved synthetic edit");ok("draft retained "+status,by("xeDraft").value==="unsaved draft");ok("modal retained "+status,by("xEditor").classList.contains("open"));ok("conflict shown "+status,by("xeConflict").getAttribute("role")==="alert");const buttons=by("xeConflict").querySelectorAll("button");node.value="edited after failure "+status;by("xeDraft").value="draft after failure "+status;buttons[0].click();await Promise.resolve();ok("latest input backup available "+status,window.copied.includes("edited after failure "+status)&&window.copied.includes("draft after failure "+status));node.value="unsaved synthetic edit";by("xeDraft").value="unsaved draft";buttons[1].click();await Promise.resolve();ok("refresh preserves edit "+status,node.value==="unsaved synthetic edit"&&by("xeDraft").value==="unsaved draft");ok("baseline never silently rebased "+status,X.editorVersion==="2026-10-11T00:00:00.123456Z")}return {width:innerWidth,checks}})()'
      });
      assert.equal(result.exceptionDetails,undefined,'browser evaluation succeeded');
      assert.equal(result.result.value.width,width);
      for(const check of result.result.value.checks)assert.ok(check.pass,width+'px: '+check.name);
      console.log(width+'px: '+result.result.value.checks.length+' browser checks passed');
    }
    for(const timezone of ['UTC','Asia/Tokyo','America/Los_Angeles','America/New_York']){
      await send('Emulation.setTimezoneOverride',{timezoneId:timezone});
      const list=await send('Runtime.evaluate',{returnByValue:true,expression:'(()=>{const host=document.createElement("section");document.body.append(host);const texts=[];const opens=[];for(const [index,deadline] of ["2026-10-18T14:58:00Z","2026-10-18T15:00:00Z"].entries()){const card=document.createElement("article");card.innerHTML="<header class=\\"x-head\\">Synthetic</header><button>Retained action</button>";host.append(card);wrapCard(card,{id:"list-"+index,productName:"Synthetic",status:"draft",applicationDeadline:deadline},"x");texts.push(card.querySelector(".cc-item-meta").textContent);card.querySelector("summary").click();opens.push(card.querySelector("details").open&&card.querySelector(".cc-item-content button").textContent==="Retained action");card.querySelector(".cc-item-close").click();opens.push(!card.querySelector("details").open)}host.remove();return {texts,opens}})()'});
      assert.equal(list.exceptionDetails,undefined,'production collapsed card renders');
      assert.ok(list.result.value.texts[0].includes('締切 2026/10/18 23:58 JST'),timezone+': collapsed deadline');
      assert.ok(list.result.value.texts[1].includes('締切 2026/10/19 00:00 JST'),timezone+': collapsed midnight');
      assert.ok(list.result.value.opens.every(Boolean),timezone+': disclosure and retained action');
      console.log(timezone+': production collapsed card JST and disclosure passed');
      const result=await send('Runtime.evaluate',{awaitPromise:true,returnByValue:true,expression:'(async()=>{const original="2026-10-18T14:58:12.123Z";window.failureStatus=409;X.openEditor({id:"synthetic",updatedAt:"2026-10-11T00:00:00.123456Z",productName:"synthetic",applicationDeadline:original,officialCheckedAt:original,valueHookCheckedAt:original});const inputValues=["xeDeadline","xeOfficialChecked","xeValueChecked"].map(id=>by(id).value);const labels=["xeDeadline","xeOfficialChecked","xeValueChecked"].every(id=>by(id).closest("label").textContent.includes("JST"));await by("xForm").onsubmit({preventDefault(){}});const saved=window.savedBody.candidate;by("xeDeadline").value="2026-10-19T00:00";await by("xForm").onsubmit({preventDefault(){}});return {inputValues,labels,saved,changed:window.savedBody.candidate.applicationDeadline}})()'});
      assert.equal(result.exceptionDetails,undefined);const actual=result.result.value;assert.deepEqual(actual.inputValues,['2026-10-18T23:58','2026-10-18T23:58','2026-10-18T23:58']);assert.ok(actual.labels);for(const field of ['applicationDeadline','officialCheckedAt','valueHookCheckedAt'])assert.equal(actual.saved[field],'2026-10-18T14:58:12.123Z');assert.equal(actual.changed,'2026-10-18T15:00:00.000Z');console.log(timezone+': editor no-change ISO and changed JST input passed');
    }
  }finally{ws?.close();proc.kill();}
});
