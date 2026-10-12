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
 const calls=[],copied=[],root={document:doc,navigator:{clipboard:{writeText:async s=>copied.push(s)}},fetch:async(u,o)=>{calls.push({u:String(u),o});const response=responses.shift();if(response instanceof Error)throw response;return {ok:true,json:async()=>response};}};
 new Function('window','app','API','authHeaders','URL',fs.readFileSync(file,'utf8'))(root,{items:local},'https://example.com/api',()=>({}),URL);
 return {root,doc,calls,copied,open:async()=>{root.CCManualOperationHub.openAccount('kyun');await flush();return doc.body.children.find(n=>n.tagName==='dialog');}};
}
async function run(){
 const event=item('original',{title:'保存済みの商品',payload:{account_name:'キュン拾い',main_post:'本文\nそのまま',purchase_url:'https://example.com/buy?q=1',source_url:'https://example.com/source',sources:[{url:'https://example.com/comparison',title:'価格の比較記録'},{url:'javascript:alert(1)',title:'危険なURL'}]}});
 const fixture=setup([],[{ok:true,events:[event,item('past',{status:'posted'})],total:2,nextOffset:null}]);
 const d=await fixture.open();assert.ok(d.className.includes('rpg-account-page'));assert.equal(d.dataset.account,'kyun');
 assert.equal(all(d,'h2')[0].textContent,'キュン拾い');
 let current=all(d,'div').find(n=>n.className==='rpg-account-current'),history=all(d,'details').find(n=>n.className==='rpg-account-history');
 assert.equal(current.hidden,false);assert.equal(history.hidden,true);assert.ok(text(current).includes('投稿状態未確認'));assert.ok(!text(current).includes('past'));
 const tab=key=>all(d,'button').find(n=>n.dataset.accountTab===key);
 assert.equal(tab('current').textContent,'今回（1）');assert.equal(tab('history').textContent,'履歴（1）');
 tab('history').onclick();history=all(d,'details').find(n=>n.className==='rpg-account-history');current=all(d,'div').find(n=>n.className==='rpg-account-current');
 assert.equal(history.hidden,false);assert.equal(history.open,true);assert.equal(current.hidden,true);assert.ok(text(history).includes('past'));assert.equal(tab('history').attributes['aria-pressed'],'true');
 tab('current').onclick();
 const links=all(d,'a');assert.deepEqual(links.map(a=>a.href),['https://example.com/source','https://example.com/comparison']);assert.ok(links.every(a=>a.rel==='noopener noreferrer'&&a.target==='_blank'));
 await all(d,'button').find(b=>b.textContent==='保存主投稿をコピー').onclick();await all(d,'button').find(b=>b.textContent==='保存購入リンクをコピー').onclick();assert.deepEqual(fixture.copied,['本文\nそのまま','https://example.com/buy?q=1']);
 assert.ok(!all(d,'button').some(b=>/投稿済みに|投稿する/.test(b.textContent)));
 assert.deepEqual(api.savedSources({url:'javascript:alert(1)',payload:{source_url:'https://u:p@example.com/private',sources:[null,{url:'data:text/html,no'},'https://example.com/public','https://example.com/public']}}),[{url:'https://example.com/public',label:'保存された出典'}]);
 all(d,'button').find(b=>b.textContent==='← 司令塔').onclick();assert.equal(d.open,false);
 const choi=setup([],[{ok:true,events:[],total:0,nextOffset:null}]);choi.root.CCManualOperationHub.openAccount('choi');await flush();const c=choi.doc.body.children.find(n=>n.tagName==='dialog');assert.equal(c.dataset.account,'choi');assert.equal(all(c,'h2')[0].textContent,'ちょい上等');assert.ok(text(c).includes('別保存先の原稿はまだ連携されていません。'));assert.equal(all(c,'a').length,0);
 const css=fs.readFileSync(path.join(__dirname,'../command-center-98/rpg-account-pages.css'),'utf8');assert.ok(css.includes('[data-account="choi"]'));assert.ok(css.includes('[hidden]{display:none!important}'));assert.ok(css.includes('100dvh'));assert.ok(css.includes('detail-swimwear.png'));assert.ok(!css.includes('position:fixed'));
 for(const {o} of fixture.calls){assert.equal(o.method,undefined);assert.equal(o.body,undefined);}
 console.log('PASS: account page titles, real tabs/counts/history, original body/link copy, saved safe source links, no publication control, close and responsive art hooks');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
