const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
const H=require('../../manual-operation-hub.js');
function boot(fetcher,{mode=null,active=true}={}){
 const {window,document}=parseHTML('<html><head></head><body><section id="ccRpgHome"><footer class="rpg-footer"></footer></section></body></html>');
 window.location={origin:'https://example.com'};
 window.CCHome={active};window.CCManualOperationHub=H;
 window.CCRpgHome={showRpg(){},showLegacy(){}};window.CCRpgWorkspaces={};
 window.localStorage={getItem(){return mode},setItem(){}};
 window.__fpContentPipeline={buildDraftCopy:item=>'台本：'+item.payload.draft_slides.map(x=>x.body).join('\n')};
 const sent=[];window.fetch=fetcher;const context=vm.createContext({window,document,URL,AbortController,setTimeout,clearTimeout,MutationObserver:window.MutationObserver,API:'https://api.example.com/',authHeaders:()=>({'Authorization':'synthetic-only'})});
 vm.runInContext(fs.readFileSync('../castle-parent.js','utf8'),context);
 const frame=document.getElementById('ccCastleFrame');frame.contentWindow={postMessage:m=>sent.push(m)};
 const ready=()=>{const e=new window.Event('message');Object.assign(e,{origin:window.location.origin,source:frame.contentWindow,data:{channel:'cc-castle-v1',type:'ready'}});window.dispatchEvent(e)};
 return {window,document,sent,ready};
}
test('host uses saved sourcing payload and FP page text without treating copying as posting',()=>{
 const b=boot();const rows=b.window.CCCastle.drafts([
  {id:'fp1',payload:{content_type:'fp_post_candidate',post_title:'台本タイトル',draft_slides:[{body:'ページ原文'}]}},
  {id:'kyun1',payload:{account:'キュン拾い',body_variants:['本文原文'],ordinary_url:'https://example.com/item'}},
 ],[{id:'s1',title:'商品',summary:'保存概要',url:'https://example.com/shop',payload:{buy:1200,sell:3500,quantity:2},sourcingVerdict:'hold'}]);
 assert.equal(rows.find(x=>x.place==='fp').body,'台本：ページ原文');
 assert.equal(rows.find(x=>x.place==='kyun').body,'本文原文');
 const s=rows.find(x=>x.place==='shiire');assert.match(s.body,/仕入価格：1200/);assert.match(s.body,/想定売価：3500/);assert.match(s.body,/保存概要/);assert.equal(s.link,'https://example.com/shop');
 assert.equal(rows.find(x=>x.place==='kyun').source.status,'投稿状態未確認');
});
test('host paginates all events, performs GET only, and marks interrupted reads incomplete',async()=>{
 const requests=[];let fail=false;
 const b=boot(async(url,options)=>{requests.push({url:new URL(url),options});if(fail&&url.searchParams.get('offset')==='1')throw Error('connection lost');return {ok:true,status:200,json:async()=>['sourcing','castle-signals'].includes(url.searchParams.get('resource'))?{ok:true,items:[],nextOffset:null}:{ok:true,events:[{id:'record'+(url.searchParams.get('offset')||'0'),taskId:'task',eventKey:'event'+(url.searchParams.get('offset')||'0'),title:'原稿',payload:{account:'キュン拾い',main_post:'保存原文'}}],nextOffset:url.searchParams.get('offset')==='0'?1:null}};});
 b.ready();await b.window.CCCastle.refresh();
 assert.equal(b.sent.at(-1).complete,true);assert.equal(b.sent.at(-1).drafts.length,2);
 assert.ok(requests.every(x=>!x.options.method||x.options.method==='GET'));
 assert.ok(!JSON.stringify(b.sent).includes('synthetic-only'));
 fail=true;await b.window.CCCastle.refresh();assert.equal(b.sent.at(-1).complete,false);assert.match(b.sent.at(-1).message,/一部の読取/);
});

test('default startup stays pending until the trusted castle frame is visible',async()=>{
 const b=boot(async()=>({ok:true,json:async()=>({ok:true,events:[],items:[],nextOffset:null})}));
 let opened=false;b.window.CCCastle.whenReady().then(()=>opened=true);
 const frame=b.document.getElementById('ccCastleFrame');assert.equal(frame.hidden,true);
 const foreign=new b.window.Event('message');Object.assign(foreign,{origin:'https://other.example',source:frame.contentWindow,data:{channel:'cc-castle-v1',type:'ready'}});b.window.dispatchEvent(foreign);
 await Promise.resolve();assert.equal(opened,false);
 b.ready();await Promise.resolve();assert.equal(opened,true);assert.equal(frame.hidden,false);assert.equal(b.window.CCCastle.whenReady(),null);
 await b.window.CCCastle.refresh();
});
test('intentional classic mode and direct workspace startup do not wait for a hidden castle',()=>{
 for(const options of [{mode:'classic'},{active:false}]){const b=boot(null,options);assert.equal(b.window.CCCastle.whenReady(),null);assert.equal(b.document.getElementById('ccCastleFrame').hidden,true);}
});

// The legacy home may still be loading (or contain old versions) when the castle opens.
test('castle reads every saved-signal page and prefers the latest edited original',async()=>{
 const requests=[];const b=boot(async url=>{const resource=url.searchParams.get('resource'),offset=url.searchParams.get('offset');requests.push(resource+':'+offset);
 const payload={content_type:'fp_post_candidate',draft_slides:[{body:'最新版の本文'}]};
 const data=resource==='castle-signals'?{ok:true,items:[offset==='0'?{id:'task:t:e',updatedAt:'2026-10-16T00:00:00Z',payload}:{id:'saved-only',payload}],nextOffset:offset==='0'?1:null}:resource==='task-events'?{ok:true,events:[{id:1,taskId:'t',eventKey:'e',occurredAt:'2026-10-01T00:00:00Z',payload:{...payload,draft_slides:[{body:'旧版'}]}}],nextOffset:null}:{ok:true,items:[]};
 return {ok:true,json:async()=>data};});
 b.window.CCHome.activeItems=[{id:'stale-home',payload:{account:'キュン拾い',main_post:'古い表示'}}];
 b.ready();await b.window.CCCastle.refresh();const message=b.sent.at(-1);
 assert.equal(message.complete,true);assert.equal(message.drafts.length,2);assert.ok(message.drafts.every(x=>x.body==='台本：最新版の本文'));assert.ok(requests.includes('castle-signals:1'));assert.match(message.message,/FP・TikTok 2件/);
});
test('missing pagination or malformed sourcing never removes cached originals',async()=>{
 for(const broken of ['castle-signals','sourcing']){
  const b=boot(async url=>({ok:true,json:async()=>url.searchParams.get('resource')===broken?{ok:true,items:broken==='sourcing'?null:[]}:{ok:true,items:[],events:[],nextOffset:null}}));
  b.ready();await b.window.CCCastle.refresh();assert.equal(b.sent.at(-1).complete,false);assert.match(b.sent.at(-1).message,/保持/);
 }
});
