'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const file=path.join(__dirname,'../command-center-98/manual-operation-hub.js'),api=require(file);
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.attributes={};this.textContent='';this.value='';}
 append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}}
 prepend(...nodes){for(const n of nodes)n.parent=this;this.children.unshift(...nodes);}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 setAttribute(k,v){this.attributes[k]=v;}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}
 showModal(){this.open=true;}
 close(){this.open=false;this.onclose?.();}
}
const text=n=>n.textContent+' '+n.children.map(text).join(' '),all=(n,tag)=>[...(n.tagName===tag?[n]:[]),...n.children.flatMap(x=>all(x,tag))];
const flush=async()=>{for(let i=0;i<24;i++)await Promise.resolve();};
const button=(d,cls)=>all(d,'button').find(n=>n.className?.split(' ').includes(cls)),input=(d,name)=>[...all(d,'input'),...all(d,'textarea')].find(n=>n.name===name);
const stamp='2026-10-13T00:00:00.000Z',post='https://www.threads.com/@choi_fixture/post/Abc123';
// Exercise the retained management card, not the repurposed public account route.
function setup({configured=true,result=null}={}){
 const home=new Element('home'),doc={body:new Element('body'),head:new Element('head'),getElementById:id=>id==='commandHome'?home:null,createElement:tag=>new Element(tag)};
 const event={id:201,taskId:'threads-library-import-v1',eventKey:'choi:fixture',occurredAt:stamp,payload:{account_name:'ちょい上等',platform:'threads',main_post:'保存原案\nそのまま',self_reply:'保存返信',...(result?{threads_manual_result:result}:{})}};
 let account={accountKey:'choi',id:201,revision:configured?1:0,profile_url:configured?'https://www.threads.com/@choi_fixture':null};
 const calls=[],copied=[],root={document:doc,navigator:{clipboard:{writeText:async s=>copied.push(s)}},crypto:{randomUUID:()=>`synthetic-${calls.length}`}};
 const control={fail:false,pending:null};
 root.fetch=async(u,o={})=>{
  const body=o.body?JSON.parse(o.body):null;calls.push({url:String(u),options:o,body});
  if(o.method!=='PATCH')return {ok:true,json:async()=>new URL(String(u)).searchParams.get('resource')==='threads-manual-accounts'?{ok:true,accounts:[account]}:{ok:true,events:[event],total:1,nextOffset:null}};
  if(control.pending)await control.pending;
  if(control.fail)return {ok:false,status:503,json:async()=>({ok:false,error:'synthetic_failure'})};
  if(body.action==='threads_account_profile'){account={...account,revision:account.revision+1,profile_url:body.profileUrl};return {ok:true,json:async()=>({ok:true,account})};}
  const previous=event.payload.threads_manual_result;
  event.payload.threads_manual_result={contract:'threads-manual-result-v1',source:'manual',status:'posted_manual',confirmed_at:stamp,account_profile_url:'https://www.threads.com/@choi_fixture',account_key:'choi',revision:(previous?.revision||0)+1,post_url:body.postUrl,actual_text:body.actualText??previous?.actual_text??null,posted_at:body.postedAt??previous?.posted_at??null,original_copies:previous?.original_copies||{main_post:event.payload.main_post,self_reply:event.payload.self_reply},metrics:body.metrics?{...Object.fromEntries(api.metricLabels.map(([k])=>[k,null])),...body.metrics,observed_at:body.observedAt||stamp,source:'manual'}:previous?.metrics||null};
  return {ok:true,json:async()=>({ok:true,item:event,result:event.payload.threads_manual_result})};
 };
 new Function('window','app','API','authHeaders','URL',fs.readFileSync(file,'utf8'))(root,{items:[]},'https://example.com/api',()=>({'X-Test':'fixture-only'}),URL);
 return {root,doc,event,calls,copied,control,get editor(){return doc.body.children.find(n=>n.className==='rpg-thread-editor');},open:async()=>{const grid=home.children[0].children.find(n=>n.className==='manual-operation-grid');grid.children[root.CCManualOperationHub.accounts.findIndex(a=>a.key==='choi')].children.find(n=>n.tagName==='button').onclick();await flush();return doc.body.children.find(n=>n.className?.includes('rpg-account-page'));}};
}
const writes=f=>f.calls.filter(c=>c.body),result=extra=>({contract:'threads-manual-result-v1',source:'manual',status:'posted_manual',confirmed_at:stamp,account_profile_url:'https://www.threads.com/@choi_fixture',account_key:'choi',revision:1,post_url:post,actual_text:null,posted_at:null,metrics:null,original_copies:{main_post:'初回原案'},...extra});
async function run(){
 for(const url of ['http://threads.com/@a','https://threads.com.evil/@a','https://a:b@threads.com/@a','https://threads.com:443/@a','https://threads.com/@a?x=1','https://threads.com/@a#x','https://threads.com/@a/../@b','https://threads.com/@..','https://threads.com/@a.','https://threads.com/@a\\b','https://threads.com/@a/post/x'])assert.equal(api.threadsUrl(url,'profile'),null,url);
 assert.deepEqual(api.threadsUrl('https://threads.net/@ABC_xyz/','profile'),{url:'https://www.threads.com/@abc_xyz',handle:'abc_xyz'});
 assert.equal(api.threadsUrl('https://threads.com/@a','post'),null);assert.equal(api.threadsUrl('https://threads.com/@a/post/p?q=1','post'),null);
 for(const [raw,expected] of [['',null],['0',0],['123',123],['1e3',null],['-1',null],['0.5',null],['NaN',null],['1000000001',null]])assert.equal(api.metricNumber(raw),expected);
 assert.equal(api.historyState({payload:{threads_manual_result:result()}},'choi'),'投稿済み');assert.equal(api.historyState({payload:{threads_manual_result:result()}},'kyun'),'');
 assert.equal(api.historyState({payload:{threads_manual_result:result({post_url:'javascript:alert(1)'})}},'choi'),'');
 for(const patch of [{metrics:{views:0}},{metrics:{...Object.fromEntries(api.metricLabels.map(([k])=>[k,null])),source:'manual',observed_at:'invalid'}},{actual_text:{}},{posted_at:'yesterday'},{original_copies:[]},{confirmed_at:null},{confirmed_at:'2026-02-30T00:00:00Z'},{posted_at:'2026-10-13T00:00:00'},{account_profile_url:'https://www.threads.com/@wrong'},{revision:Infinity}]){const malformed=setup({result:result(patch)}),dialog=await malformed.open();assert.equal(api.historyState(malformed.event,'choi'),'');assert.equal(button(dialog,'rpg-thread-record').disabled,true);assert.ok(text(dialog).includes('形式を確認できません'));}
 const f=setup(),d=await f.open();await all(d,'button').find(n=>n.textContent==='保存主投稿をコピー').onclick();assert.deepEqual(f.copied,['保存原案\nそのまま']);assert.equal(api.historyState(f.event,'choi'),'');assert.equal(writes(f).length,0);assert.equal(all(d,'a').find(n=>n.className.includes('rpg-threads-profile-open')).href,'https://www.threads.com/@choi_fixture');
 await button(d,'rpg-thread-record').onclick();let ed=f.editor;assert.ok(ed);assert.equal(all(ed,'details')[0].open,undefined);assert.ok(text(ed).includes('URLだけで保存'));
 input(ed,'postUrl').value='https://evil.test/post/a';await button(ed,'rpg-thread-save').onclick();assert.equal(writes(f).length,0);assert.ok(text(ed).includes('Threadsの投稿URL'));
 input(ed,'postUrl').value=post;await button(ed,'rpg-thread-save').onclick();assert.equal(writes(f).length,0);assert.ok(text(ed).includes('投稿済みで'));
 input(ed,'postUrl').value='https://threads.com/@other/post/a';input(ed,'confirmPosted').checked=true;await button(ed,'rpg-thread-save').onclick();assert.equal(writes(f).length,0);assert.ok(text(ed).includes('一致しません'));
 input(ed,'postUrl').value=post;await button(ed,'rpg-thread-save').onclick();assert.equal(f.editor,undefined);assert.equal(writes(f).length,1);
 const sent=writes(f)[0].body;assert.equal(sent.id,201);assert.equal(sent.confirmPosted,true);for(const k of ['actualText','postedAt','metrics','observedAt'])assert.ok(!(k in sent));
 assert.equal(f.event.payload.main_post,'保存原案\nそのまま');assert.equal(f.event.payload.threads_manual_result.actual_text,null);assert.ok(text(d).includes('実際の投稿本文：未入力'));assert.ok(all(d,'button').find(n=>n.dataset.accountTab==='history').textContent.includes('1'));
 button(d,'rpg-thread-record').onclick();ed=f.editor;assert.equal(input(ed,'postUrl').readOnly,true);input(ed,'actualText').value='実際に編集した本文';input(ed,'likes').value='0';input(ed,'confirmPosted').checked=true;await button(ed,'rpg-thread-save').onclick();assert.equal(f.event.payload.threads_manual_result.metrics.likes,0);assert.equal(f.event.payload.threads_manual_result.metrics.views,null);assert.ok(text(d).includes('保存原案\nそのまま'));assert.ok(text(d).includes('実際に編集した本文'));assert.ok(text(d).includes('未確認'));
 button(d,'rpg-thread-record').onclick();ed=f.editor;input(ed,'actualText').value='';input(ed,'confirmPosted').checked=true;await button(ed,'rpg-thread-save').onclick();assert.ok(!('actualText' in writes(f).at(-1).body));assert.ok(!('metrics' in writes(f).at(-1).body));assert.equal(f.event.payload.threads_manual_result.actual_text,'実際に編集した本文');
 button(d,'rpg-account-back').onclick();assert.equal(f.doc.body.children.length,0);const reopened=await f.open();assert.ok(text(reopened).includes('実際に編集した本文'));
 const failed=setup(),fd=await failed.open();button(fd,'rpg-thread-record').onclick();ed=failed.editor;input(ed,'postUrl').value=post;input(ed,'actualText').value='保持する入力';input(ed,'confirmPosted').checked=true;failed.control.fail=true;await button(ed,'rpg-thread-save').onclick();assert.equal(failed.editor,ed);assert.equal(input(ed,'actualText').value,'保持する入力');assert.ok(text(ed).includes('保存は未確認'));assert.equal(api.historyState(failed.event,'choi'),'');const retryId=writes(failed)[0].body.mutationId;failed.control.fail=false;await button(ed,'rpg-thread-save').onclick();assert.equal(writes(failed)[1].body.mutationId,retryId);assert.equal(failed.editor,undefined);
 const precision=setup({result:result({posted_at:'2026-10-12T10:23:45.123Z',actual_text:'既存本文'})}),pd=await precision.open();button(pd,'rpg-thread-record').onclick();let pe=precision.editor;input(pe,'confirmPosted').checked=true;await button(pe,'rpg-thread-save').onclick();assert.ok(!('postedAt' in writes(precision)[0].body));assert.ok(!('actualText' in writes(precision)[0].body));assert.equal(precision.event.payload.threads_manual_result.posted_at,'2026-10-12T10:23:45.123Z');
 const repeated=setup(),rd=await repeated.open();button(rd,'rpg-thread-record').onclick();ed=repeated.editor;input(ed,'postUrl').value=post;input(ed,'confirmPosted').checked=true;let release;repeated.control.pending=new Promise(r=>release=r);const first=button(ed,'rpg-thread-save').onclick();await button(ed,'rpg-thread-save').onclick();assert.equal(writes(repeated).length,1);assert.equal(button(ed,'rpg-thread-cancel').disabled,true);let blocked=false;ed.oncancel({preventDefault(){blocked=true}});assert.equal(blocked,true);release();await first;
 const unset=setup({configured:false}),ud=await unset.open();assert.equal(button(ud,'rpg-threads-profile-open').disabled,true);button(ud,'rpg-thread-record').onclick();ed=unset.editor;assert.ok(text(ed).includes('プロフィールURL'));input(ed,'profileUrl').value='https://threads.net/@choi_fixture';await button(ed,'rpg-thread-save').onclick();assert.equal(writes(unset).length,0);all(ed,'input').find(n=>n.type==='checkbox').checked=true;await button(ed,'rpg-thread-save').onclick();assert.equal(writes(unset)[0].body.confirmAccount,true);assert.ok(all(ud,'a').some(n=>n.href==='https://www.threads.com/@choi_fixture'));assert.equal(api.historyState(unset.event,'choi'),'');
 const cancelled=setup(),cd=await cancelled.open();button(cd,'rpg-thread-record').onclick();ed=cancelled.editor;input(ed,'postUrl').value=post;button(ed,'rpg-thread-cancel').onclick();assert.equal(writes(cancelled).length,0);button(cd,'rpg-thread-record').onclick();assert.equal(input(cancelled.editor,'postUrl').value,'');button(cd,'rpg-account-back').onclick();assert.equal(cancelled.doc.body.children.length,0);
 const r1={id:'duplicate',occurredAt:stamp,payload:{account_name:'ちょい上等',threads_manual_result:result()}},r2={...r1,payload:{...r1.payload,threads_manual_result:result({revision:2,actual_text:'new'})}};for(const rows of [[r1,r2],[r2,r1]])assert.equal(api.manualResult(api.unique(rows)[0],'choi').revision,2);
 const fresh={id:'duplicate',occurredAt:'2026-10-14T00:00:00Z',payload:{account_name:'ちょい上等',main_post:'更新された原案'}};for(const rows of [[r2,fresh],[fresh,r2]]){const combined=api.unique(rows)[0];assert.equal(api.manualResult(combined,'choi').revision,2);assert.equal(api.payload(combined).main_post,'更新された原案');assert.equal(fresh.payload.threads_manual_result,undefined);assert.equal(api.manualResult(api.unique([combined,fresh])[0],'choi').revision,2);}
 console.log('PASS: URL-only confirmed save, strict URLs/account binding, no inferred publication, null vs zero, immutable original, optional preservation, profile setup, failed-save retention/idempotent retry, duplicate-click lock, cancel/reopen/return');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
