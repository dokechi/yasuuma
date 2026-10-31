'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const file=path.join(__dirname,'../command-center-98/manual-operation-hub.js');
const api=require(file);
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.attributes={};this.textContent='';}
 append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}}
 prepend(...nodes){for(const n of nodes)n.parent=this;this.children.unshift(...nodes);}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 setAttribute(k,v){this.attributes[k]=v;}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}
 showModal(){this.open=true;}
 close(){this.open=false;this.onclose?.();}
}
const text=n=>n.textContent+' '+n.children.map(text).join(' ');
const all=(n,tag)=>[...(n.tagName===tag?[n]:[]),...n.children.flatMap(x=>all(x,tag))];
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
const stamp='2026-10-01T00:00:00Z';
function item(eventKey,extra={}){return {id:'task:media:'+eventKey,taskId:'media',eventKey,occurredAt:stamp,payload:{account_name:'ちょい上等',main_post:eventKey},...extra};}
// Exercise the retained management card, not the repurposed public account route.
function setup(local,responses){
 const home=new Element('home'),doc={body:new Element('body'),head:new Element('head'),getElementById:id=>id==='commandHome'?home:null,createElement:tag=>new Element(tag)};
 const calls=[],copied=[],root={document:doc,navigator:{clipboard:{writeText:async s=>copied.push(s)}},fetch:async(u,o)=>{if(new URL(String(u)).searchParams.get('resource')==='threads-manual-accounts')return {ok:true,json:async()=>({ok:true,accounts:[{accountKey:'choi',id:1,revision:0,profile_url:null},{accountKey:'kyun',id:2,revision:0,profile_url:null}]})};calls.push({u:String(u),o});const response=responses.shift();if(response instanceof Error)throw response;return {ok:true,json:async()=>response};}};
 new Function('window','app','API','authHeaders','URL',fs.readFileSync(file,'utf8'))(root,{items:local},'https://example.com/api',()=>({}),URL);
 return {root,doc,calls,copied,open:async()=>{const grid=home.children[0].children.find(n=>n.className==='manual-operation-grid');grid.children[root.CCManualOperationHub.accounts.findIndex(a=>a.key==='choi')].children.find(n=>n.tagName==='button').onclick();await flush();return doc.body.children.find(n=>n.tagName==='dialog');}};
}
async function run(){
 const live=item('suppressed-copy'),suppressed={...live,suppressed:true};
 for(const rows of [[live,suppressed],[suppressed,live]])assert.equal(api.unique(rows)[0].suppressed,true,'suppression wins equal timestamps independent of order');
 const newer=item('suppressed-copy',{occurredAt:'2026-10-03T00:00:00Z',payload:{account_name:'ちょい上等',main_post:'fresh-body'}});
 for(const rows of [[suppressed,newer],[newer,suppressed]]){const combined=api.unique(rows)[0];assert.equal(api.isSuppressed(combined),true);assert.equal(api.payload(combined).main_post,'fresh-body');assert.equal(newer.suppressed,undefined);assert.equal(api.isSuppressed(api.unique([combined,newer])[0]),true);}
 const known=item('suppressed-copy',{threadsPostedAt:stamp});
 for(const rows of [[known,newer],[newer,known]]){const combined=api.unique(rows)[0];assert.equal(api.historyState(combined,'choi'),'投稿済み');assert.equal(api.payload(combined).main_post,'fresh-body');assert.equal(newer.threadsPostedAt,undefined);assert.equal(api.historyState(api.unique([combined,newer])[0],'choi'),'投稿済み');}
 for(const rows of [[suppressed,{...newer,suppressed:false}],[{...newer,suppressed:false},suppressed]])assert.equal(api.isSuppressed(api.unique(rows)[0]),true,'suppression is a tombstone; false is not an undo');
 assert.equal(api.historyState(item('other-platform',{status:'posted',platform:'x',posted_at:stamp}),'choi'),'');
 assert.equal(api.historyState(item('explicit-threads',{status:'posted',platform:'threads'}),'choi'),'投稿済み');
 assert.equal(api.historyState(item('specific-threads',{status:'posted',platform:'x',threadsPostedAt:stamp}),'choi'),'投稿済み');
 assert.equal(api.historyState(item('posted-performance-x',{status:'posted',payload:{performance:{platform:'x',posted_at:stamp}}}),'choi'),'');
 assert.equal(api.historyState(item('performance-x',{payload:{performance:{platform:'x',posted_at:stamp}}}),'choi'),'');
 assert.equal(api.historyState(item('performance-threads',{payload:{performance:{platform:'threads',posted_at:stamp}}}),'choi'),'投稿済み');
 assert.equal(api.matchesAccount({title:'ちょい上等',payload:{category:'ちょい上等'}},'choi'),false);
 assert.equal(api.historyState(item('unknown'),'choi'),'');
 assert.equal(api.historyState(item('copied',{status:'copied'}),'choi'),'');
 assert.equal(api.historyState(item('posted',{status:'posted'}),'choi'),'投稿済み');
 assert.equal(api.historyState(item('rejected',{reviewState:'rejected'}),'choi'),'見送り');
 assert.equal(api.historyState(item('skipped',{payload:{state:'skipped'}}),'choi'),'見送り');
 assert.equal(api.historyState(item('threads',{threadsPostedAt:stamp}),'choi'),'投稿済み');
 assert.equal(api.historyState(item('x-only',{postedAt:stamp}),'choi'),'','X-only timestamp is not Threads posting');
 const fixture=setup([live],[{ok:true,events:[suppressed,item('unknown-original'),item('posted-original',{status:'posted'}),item('skipped-original',{status:'skipped'}),item('rejected-original',{reviewState:'rejected'})],total:6,nextOffset:5},{ok:true,events:[item('foreign',{payload:{account_name:'キュン拾い',main_post:'foreign-original'}})],total:6,nextOffset:null}]);
 const d=await fixture.open();let output=text(d);
 assert.ok(!output.includes('suppressed-copy'));assert.ok(output.includes('投稿状態未確認'));assert.ok(!output.includes('未投稿'));
 assert.ok(output.includes('読込 5件 / 全 6件'));assert.ok(output.includes('続きあり'));
 const history=all(d,'details').find(n=>text(n).includes('投稿済み・見送りの履歴'));
 assert.ok(history);assert.ok(!history.open);assert.equal(all(history,'article').length,3);
 assert.ok(!text(history).includes('unknown-original'));
 await all(d,'button').find(b=>b.textContent==='保存主投稿をコピー').onclick();assert.equal(fixture.copied[0],'unknown-original');
 await all(d,'button').find(b=>b.textContent.startsWith('保存原稿の続き')).onclick();await flush();output=text(d);assert.ok(output.includes('読込 6件 / 全 6件'));assert.ok(output.includes('読込完了'));assert.ok(!output.includes('foreign-original'));
 for(const {o} of fixture.calls){assert.equal(o.method,undefined);assert.equal(o.body,undefined);}
 const empty=setup([],[{ok:true,events:[],total:0,nextOffset:null}]);const emptyDialog=await empty.open();
 assert.ok(text(emptyDialog).includes('この保存先では原稿を確認できません。別保存先の原稿はまだ連携されていません。'));assert.ok(!text(emptyDialog).includes('設定が必要'));assert.ok(text(emptyDialog).includes('読込 0件 / 全 0件'));
 for(const bad of [new Error('offline'),{ok:true,events:null,nextOffset:null},{ok:true,events:[],nextOffset:0},{ok:true,events:[]}]){
  const failure=setup([item('retained')],[bad]);const fd=await failure.open();assert.ok(text(fd).includes('読取未確認'));assert.ok(text(fd).includes('retained'));assert.ok(!text(fd).includes('読込完了'));assert.equal(all(fd,'button').find(b=>b.textContent.startsWith('保存原稿の続き')).disabled,false);
 }
 // Coverage must stay visible independently from copy/save feedback, including a failed next page.
 const savedTime='2026-10-02T09:12:34+09:00',source=Object.freeze({checked_at_price_stock:savedTime});
 assert.equal(api.savedPriceStockCheck(source).value,savedTime);assert.equal(api.savedPriceStockCheck(source).label,'2026/10/02 09:12:34（日本時間）');assert.equal(source.checked_at_price_stock,savedTime);
 for(const bad of [undefined,null,'',0,Date.now(),{},'now','today','2026-10-13','2026-10-13T09:00:00','2026-02-30T09:00:00Z','2026-13-01T09:00:00Z','2026-10-13T24:00:00Z','2026-10-13T09:60:00Z','2026-10-13T09:00:60Z','2026-10-13T09:00:00Z trailing'])assert.deepEqual(api.savedPriceStockCheck({checked_at_price_stock:bad}),{value:null,label:'未確認'},String(bad));
 assert.equal(api.savedPriceStockCheck({checked_at_mercari:savedTime,updatedAt:savedTime}).label,'未確認','other observation/update times cannot become price/stock confirmation');
 for(const tz of ['UTC','Asia/Tokyo','America/Los_Angeles']){
  const {spawnSync}=require('node:child_process'),result=spawnSync(process.execPath,['-e',`const a=require(${JSON.stringify(file)}),raw='2026-10-02T00:12:34Z',p=Object.freeze({checked_at_price_stock:raw});console.log(JSON.stringify({checked:a.savedPriceStockCheck(p),original:p.checked_at_price_stock,localInput:a.localDateTime(raw)}));`],{env:{...process.env,TZ:tz},encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);const value=JSON.parse(result.stdout);assert.deepEqual(value.checked,{value:'2026-10-02T00:12:34Z',label:'2026/10/02 09:12:34（日本時間）'},tz);assert.equal(value.original,'2026-10-02T00:12:34Z');
  if(tz==='UTC')assert.equal(value.localInput,'2026-10-02T00:12','existing local datetime inputs must remain device-local');
 }
 assert.equal(api.savedPriceStockCheck({checked_at_price_stock:'2026-10-01T15:00:00Z'}).label,'2026/10/02 00:00:00（日本時間）','JST midnight is the next calendar day, not 24:00');

 let releaseRetry;const pendingRetry=new Promise(resolve=>{releaseRetry=resolve;});
 const readFixture=setup([],[{ok:true,events:[item('kept-first',{payload:{account_name:'ちょい上等',main_post:'kept-first',checked_at_price_stock:savedTime}})],total:3,nextOffset:1},new Error('next-page-offline'),pendingRetry]);
 const rd=await readFixture.open(),summary=all(rd,'div').find(n=>n.className==='rpg-account-read-summary'),more=all(rd,'button').find(b=>b.textContent.startsWith('保存原稿の続き'));
 assert.equal(summary.parent,rd,'coverage is not folded inside details');assert.ok(text(summary).includes('確認用 1件'));assert.ok(text(summary).includes('読込 1件 / 全 3件'));assert.ok(text(summary).includes('続きあり'));
 const card=all(rd,'article')[0],stampBlock=all(card,'section').find(n=>n.className==='rpg-account-price-stock-check');assert.ok(text(stampBlock).includes('保存時点'));assert.ok(text(stampBlock).includes('2026/10/02 09:12:34（日本時間）'));assert.ok(card.children.indexOf(stampBlock)<card.children.findIndex(n=>n.className==='rpg-account-copy'));
 await more.onclick();await flush();assert.ok(text(summary).includes('読取未確認'));assert.ok(text(summary).includes('読込 1件 / 全 3件'));assert.ok(text(rd).includes('kept-first'));assert.equal(more.disabled,false);
 await all(rd,'button').find(b=>b.textContent==='保存主投稿をコピー').onclick();assert.ok(text(all(rd,'p').find(n=>n.className==='rpg-account-status')).includes('原文をコピーしました'));assert.ok(text(summary).includes('next-page-offline'),'copy feedback cannot replace the persistent read warning');assert.equal(readFixture.copied[0],'kept-first');
 const retry=more.onclick();await flush();assert.ok(text(summary).includes('読込中'));assert.ok(text(summary).includes('読取未確認'),'starting a retry is not a successful read');
 releaseRetry({ok:true,events:[item('next-ok'),item('missing-time')],total:3,nextOffset:null});await retry;await flush();
 assert.ok(text(summary).includes('読込 3件 / 全 3件'));assert.ok(text(summary).includes('読込完了'));assert.ok(!text(summary).includes('読取未確認'));assert.ok(text(rd).includes('kept-first'));assert.ok(text(rd).includes('next-ok'));assert.equal(more.disabled,true);
 const missingStamp=all(rd,'section').filter(n=>n.className==='rpg-account-price-stock-check')[1];assert.ok(text(missingStamp).includes('未確認'));
 for(const {o} of readFixture.calls){assert.equal(o.method,undefined);assert.equal(o.body,undefined);}
 const fp=setup([],[{ok:true,events:[],total:0,nextOffset:null}]);fp.root.CCManualOperationHub.openAccount('tiktok');await flush();const fpDialog=fp.doc.body.children.find(n=>n.tagName==='dialog');const route=all(fpDialog,'button').find(b=>b.dataset.homeAction==='fp-draft');assert.equal(route.textContent,'FP原稿を見る（既存FP）');route.onclick();assert.ok(!fp.doc.body.children.includes(fpDialog));
 console.log('PASS: suppression tie, explicit accounts, folded posted/skipped/rejected history, unknown state, original copy, honest coverage/empty/error states and GET-only access');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
