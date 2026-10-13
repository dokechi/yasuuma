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
function item(eventKey,extra={}){return {id:'task:media:'+eventKey,taskId:'media',eventKey,occurredAt:stamp,payload:{account_name:'キュン拾い',main_post:eventKey},...extra};}
function setup(local,responses){
 const home=new Element('home'),doc={body:new Element('body'),head:new Element('head'),getElementById:id=>id==='commandHome'?home:null,createElement:tag=>new Element(tag)};
 const calls=[],copied=[],root={document:doc,navigator:{clipboard:{writeText:async s=>copied.push(s)}},fetch:async(u,o)=>{if(new URL(String(u)).searchParams.get('resource')==='threads-manual-accounts')return {ok:true,json:async()=>({ok:true,accounts:[{accountKey:'kyun',id:1,revision:0,profile_url:null},{accountKey:'choi',id:2,revision:0,profile_url:null}]})};calls.push({u:String(u),o});const response=responses.shift();if(response instanceof Error)throw response;return {ok:true,json:async()=>response};}};
 new Function('window','app','API','authHeaders','URL',fs.readFileSync(file,'utf8'))(root,{items:local},'https://example.com/api',()=>({}),URL);
 return {root,doc,calls,copied,open:async()=>{root.CCManualOperationHub.openAccount('kyun');await flush();return doc.body.children.find(n=>n.tagName==='dialog');}};
}
async function run(){
 const live=item('suppressed-copy'),suppressed={...live,suppressed:true};
 for(const rows of [[live,suppressed],[suppressed,live]])assert.equal(api.unique(rows)[0].suppressed,true,'suppression wins equal timestamps independent of order');
 const newer=item('suppressed-copy',{occurredAt:'2026-10-03T00:00:00Z',payload:{account_name:'キュン拾い',main_post:'fresh-body'}});
 for(const rows of [[suppressed,newer],[newer,suppressed]]){const combined=api.unique(rows)[0];assert.equal(api.isSuppressed(combined),true);assert.equal(api.payload(combined).main_post,'fresh-body');assert.equal(newer.suppressed,undefined);assert.equal(api.isSuppressed(api.unique([combined,newer])[0]),true);}
 const known=item('suppressed-copy',{threadsPostedAt:stamp});
 for(const rows of [[known,newer],[newer,known]]){const combined=api.unique(rows)[0];assert.equal(api.historyState(combined,'kyun'),'投稿済み');assert.equal(api.payload(combined).main_post,'fresh-body');assert.equal(newer.threadsPostedAt,undefined);assert.equal(api.historyState(api.unique([combined,newer])[0],'kyun'),'投稿済み');}
 for(const rows of [[suppressed,{...newer,suppressed:false}],[{...newer,suppressed:false},suppressed]])assert.equal(api.isSuppressed(api.unique(rows)[0]),true,'suppression is a tombstone; false is not an undo');
 assert.equal(api.historyState(item('other-platform',{status:'posted',platform:'x',posted_at:stamp}),'kyun'),'');
 assert.equal(api.historyState(item('explicit-threads',{status:'posted',platform:'threads'}),'kyun'),'投稿済み');
 assert.equal(api.historyState(item('specific-threads',{status:'posted',platform:'x',threadsPostedAt:stamp}),'kyun'),'投稿済み');
 assert.equal(api.historyState(item('posted-performance-x',{status:'posted',payload:{performance:{platform:'x',posted_at:stamp}}}),'kyun'),'');
 assert.equal(api.historyState(item('performance-x',{payload:{performance:{platform:'x',posted_at:stamp}}}),'kyun'),'');
 assert.equal(api.historyState(item('performance-threads',{payload:{performance:{platform:'threads',posted_at:stamp}}}),'kyun'),'投稿済み');
 assert.equal(api.matchesAccount({title:'キュン拾い',payload:{category:'キュン拾い'}},'kyun'),false);
 assert.equal(api.historyState(item('unknown'),'kyun'),'');
 assert.equal(api.historyState(item('copied',{status:'copied'}),'kyun'),'');
 assert.equal(api.historyState(item('posted',{status:'posted'}),'kyun'),'投稿済み');
 assert.equal(api.historyState(item('rejected',{reviewState:'rejected'}),'kyun'),'見送り');
 assert.equal(api.historyState(item('skipped',{payload:{state:'skipped'}}),'kyun'),'見送り');
 assert.equal(api.historyState(item('threads',{threadsPostedAt:stamp}),'kyun'),'投稿済み');
 assert.equal(api.historyState(item('x-only',{postedAt:stamp}),'kyun'),'','X-only timestamp is not Threads posting');
 const fixture=setup([live],[{ok:true,events:[suppressed,item('unknown-original'),item('posted-original',{status:'posted'}),item('skipped-original',{status:'skipped'}),item('rejected-original',{reviewState:'rejected'})],total:6,nextOffset:5},{ok:true,events:[item('foreign',{payload:{account_name:'ちょい上等',main_post:'foreign-original'}})],total:6,nextOffset:null}]);
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
 const fp=setup([],[{ok:true,events:[],total:0,nextOffset:null}]);fp.root.CCManualOperationHub.openAccount('tiktok');await flush();const fpDialog=fp.doc.body.children.find(n=>n.tagName==='dialog');const route=all(fpDialog,'button').find(b=>b.dataset.homeAction==='fp-draft');assert.equal(route.textContent,'FP原稿を見る（既存FP）');route.onclick();assert.ok(!fp.doc.body.children.includes(fpDialog));
 console.log('PASS: suppression tie, explicit accounts, folded posted/skipped/rejected history, unknown state, original copy, honest coverage/empty/error states and GET-only access');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
