'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
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
async function run(){
 const home=new Element('home'),legacy=new Element('legacy');home.append(legacy);
 const doc={body:new Element('body'),head:new Element('head'),getElementById:id=>id==='commandHome'?home:null,createElement:tag=>new Element(tag)};
 const local={id:'sns:task:media:one',updatedAt:'2026-10-01T00:00:00Z',payload:{account_name:'キュン拾い',main_post:'古い本文'}};
 const calls=[],responses=[
  {ok:true,events:[{taskId:'media',eventKey:'one',occurredAt:'2026-10-08T00:00:00Z',payload:{account_name:'キュン拾い',body_options:['機能の案','見た目の案'],recommended_option:{text:'機能の案'},self_reply:'購入リンク https://example.com/item',draft_review_points:['価格条件を確認']}}],nextOffset:100},
  {ok:true,events:[{taskId:'media',eventKey:'two',payload:{account_name:'ちょい上等',body_options:['メンズ本文'],self_reply:'メンズ返信'}}],nextOffset:null},
  {ok:true,events:[],nextOffset:null}
 ];
 const root={document:doc,navigator:{clipboard:{writeText:async s=>{root.copied=s;}}},fetch:async(u,o)=>{calls.push({url:String(u),options:o});return{ok:true,json:async()=>responses.shift()};}};
 const source=fs.readFileSync(path.join(__dirname,'../command-center-98/manual-operation-hub.js'),'utf8');
 const URLClass=typeof URL==='function'?URL:null;
 new Function('window','app','API','authHeaders','URL',source)(root,{items:[local]},'https://example.com/api',()=>({'X-Test-Auth':'private-test-only'}),URLClass);
 const hub=home.children[0],grid=hub.children.find(n=>n.className==='manual-operation-grid');assert.equal(grid.children.length,4);assert.equal(home.children[1],legacy);
 assert.equal(grid.children[0].children.find(n=>n.dataset.homeAction).dataset.homeAction,'fp-draft');
 assert.equal(grid.children[3].children.find(n=>n.dataset.homeAction).dataset.homeAction,'sourcing-queue');
 const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
 await grid.children[1].children.find(n=>n.tagName==='button').onclick();await flush();
 let dialog=doc.body.children.find(n=>n.tagName==='dialog');assert.equal(dialog.open,true);
 const text=n=>n.textContent+' '+n.children.map(text).join(' ');
 assert.ok(text(dialog).includes('機能の案'));assert.ok(text(dialog).includes('見た目の案'));assert.ok(text(dialog).includes('購入リンク'));assert.ok(text(dialog).includes('価格条件を確認'));
 assert.ok(!text(dialog).includes('古い本文'));assert.ok(!text(dialog).includes('[object Object]'));
 const more=dialog.children.find(n=>n.tagName==='button'&&n.textContent.startsWith('保存原稿の続き'));assert.equal(more.disabled,false);
 await more.onclick();await flush();assert.equal(more.disabled,true);assert.ok(!text(dialog).includes('メンズ本文'));
 for(const c of calls){const u=new URLClass(c.url);assert.equal(u.searchParams.get('resource'),'task-events');assert.equal(c.options.method,undefined);assert.equal(c.options.cache,'no-store');assert.ok(!c.options.body);}
 assert.equal(calls[0].url.includes('offset=0'),true);assert.equal(calls[1].url.includes('offset=100'),true);
 dialog.children.find(n=>n.textContent==='閉じる').onclick();assert.equal(doc.body.children.includes(dialog),false);assert.equal(home.children[1],legacy);
 await grid.children[2].children.find(n=>n.tagName==='button').onclick();await flush();dialog=doc.body.children.find(n=>n.tagName==='dialog');
 assert.ok(text(dialog).includes('ちょい上等'));assert.ok(!text(dialog).includes('機能の案'));assert.equal(calls.length,3);
 console.log('PASS: four entrances, preserved legacy DOM, account separation, text pair, pagination and read-only requests');
}
run().catch(e=>{console.error(e);process.exitCode=1});
