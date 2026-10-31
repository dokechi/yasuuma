const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {parseHTML}=require('linkedom');
const H=require('../../manual-operation-hub.js');
test('bridge excludes verified archives and retired identities without altering supported source records',()=>{
 const b=boot();b.window.CCThreadsArchive=require('../../threads-archive.js');
 const rows=[...b.window.CCThreadsArchive.eventIds,5000].map(id=>({id:'task:threads-library-import-v1:'+id,eventRecordId:id,taskId:'threads-library-import-v1',payload:{account:'@sucker0508',body_variants:['Synthetic saved copy']}}));
 rows.push({id:'legacy-kyun',payload:{account:'キュン拾い',main_post:'Retired account text'}});
 const original=JSON.stringify(rows),result=b.window.CCCastle.drafts(rows);
 assert.equal(result.length,1);assert.equal(result[0].source.recordId,'5000');assert.equal(result[0].source.account,'tiktok');assert.equal(result[0].source.readContract,'threads-active-v1');assert.equal(JSON.stringify(rows),original);
});
function boot(fetcher,{mode=null,active=true,purchaseOpen}={}){
 const {window,document}=parseHTML('<html><head></head><body><section id="ccRpgHome"><footer class="rpg-footer"></footer></section></body></html>');
 window.location={origin:'https://example.com'};
 window.CCHome={active};window.CCManualOperationHub=H;
 window.CCRpgHome={showRpg(){},showLegacy(){}};window.CCRpgWorkspaces={};
 window.localStorage={getItem(){return mode},setItem(){}};
 window.__fpContentPipeline={buildDraftCopy:item=>'台本：'+item.payload.draft_slides.map(x=>x.body).join('\n')};
 const sent=[];window.fetch=fetcher;const context=vm.createContext({window,document,URL,AbortController,setTimeout,clearTimeout,MutationObserver:window.MutationObserver,API:'https://api.example.com/',authHeaders:()=>({'Authorization':'synthetic-only'})});
 if(purchaseOpen)context.openSourcingSection=purchaseOpen;
 // The host imports the real search-normalization module; do not stub its read pipeline.
 const hostFile=path.resolve(__dirname,'../../castle-parent.js');
 vm.runInContext(fs.readFileSync(hostFile,'utf8'),context,{filename:hostFile,importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER});
 const frame=document.getElementById('ccCastleFrame');frame.contentWindow={postMessage:m=>sent.push(m)};
 const ready=()=>{const e=new window.Event('message');Object.assign(e,{origin:window.location.origin,source:frame.contentWindow,data:{channel:'cc-castle-v1',type:'ready'}});window.dispatchEvent(e)};
 return {window,document,sent,ready};
}
test('purchase and inventory navigation opens the existing purchase ledger through the trusted frame only',()=>{
 const opened=[],b=boot(undefined,{purchaseOpen:sub=>opened.push(sub)}),frame=b.document.getElementById('ccCastleFrame');let left=0;b.window.CCHome.leave=()=>left++;
 const send=(origin,source)=>{const e=new b.window.Event('message');Object.assign(e,{origin,source,data:{channel:'cc-castle-v1',type:'native',action:'sourcing'}});b.window.dispatchEvent(e);};
 send('https://other.example',frame.contentWindow);send('https://example.com',{});assert.deepEqual(opened,[]);
 send('https://example.com',frame.contentWindow);assert.deepEqual(opened,['purchases']);assert.equal(left,1);assert.equal(frame.hidden,true);
});
test('trusted original-record ID is forwarded without title inference or credential changes',()=>{const b=boot(),calls=[],frame=b.document.getElementById('ccCastleFrame');b.window.CCManualOperationHub.openAccount=(key,options)=>calls.push({key,options});const e=new b.window.Event('message');Object.assign(e,{origin:'https://example.com',source:frame.contentWindow,data:{channel:'cc-castle-v1',type:'native',action:'kyun',recordId:'task:media:original'}});b.window.dispatchEvent(e);assert.equal(calls.length,1);assert.equal(calls[0].key,'kyun');assert.equal(calls[0].options.recordId,'task:media:original');});
test('host uses saved sourcing payload and FP page text without treating copying as posting',()=>{
 const b=boot();const rows=b.window.CCCastle.drafts([
  {id:'fp1',payload:{content_type:'fp_post_candidate',post_title:'台本タイトル',draft_slides:[{body:'ページ原文'}]}},
  {id:'insurance1',taskId:'insurance-threads-v1',title:'保険の保存原稿',payload:{draft:'本文原文'}},
 ],[{id:'s1',title:'商品',summary:'保存概要',url:'https://example.com/shop',payload:{buy:1200,sell:3500,quantity:2},sourcingVerdict:'hold'}]);
 assert.equal(rows.find(x=>x.place==='fp').body,'台本：ページ原文');
 assert.equal(rows.find(x=>x.place==='kyun').body,'本文原文');
 const s=rows.find(x=>x.place==='shiire');assert.match(s.body,/仕入価格：1200/);assert.match(s.body,/想定売価：3500/);assert.match(s.body,/保存概要/);assert.equal(s.link,'https://example.com/shop');
 assert.equal(rows.find(x=>x.place==='kyun').source.account,'insurance');
 assert.equal(rows.find(x=>x.place==='kyun').source.status,'確認用下書き');
 assert.equal(rows.find(x=>x.place==='kyun').posting.main,'本文原文');
});
test('unfinished FP editorial choices do not hide saved pages or mutate approval state',()=>{
 const b=boot();b.window.__fpContentPipeline={buildDraftCopy(){throw Error('入口を選んでください')}};
 const item={id:'unselected',payload:{content_type:'fp_post_candidate',post_title:'未選択の台本',draft_slides:[{page_contract:{display_copy:'保存された表示全文'},body:'旧本文'},{headline:'見出し',body:'二枚目の本文'},{page_contract:{reader_question:'保存された問い',answer:'保存された答え',composition:'保存構成'}}],entrance_options:[{label:'入口A',display_copy:'保存された入口案'}],selected_entrance:null,pre_image_review:{status:'pending'},caption:'保存キャプション'}};
 const before=JSON.stringify(item),rows=b.window.CCCastle.drafts([item]);
 assert.equal(rows.length,1);assert.match(rows[0].body,/保存された表示全文/);assert.match(rows[0].body,/二枚目の本文/);assert.match(rows[0].body,/保存された問い/);assert.match(rows[0].body,/表示本文は未確定/);assert.match(rows[0].body,/保存された入口案/);assert.doesNotMatch(rows[0].body,/旧本文/);assert.match(rows[0].source.status,/未確定/);assert.equal(JSON.stringify(item),before);
 delete b.window.__fpContentPipeline;assert.equal(b.window.CCCastle.drafts([item]).length,1);
});
test('host opens the current lounge with a cache version matching its manifest asset',()=>{
 const b=boot(),src=b.document.getElementById('ccCastleFrame').getAttribute('src'),url=new URL(src,'https://example.com/command-center-98/');
 assert.equal(url.pathname,'/command-center-98/lounge/index.html');assert.ok(url.searchParams.get('v'));
 const manifest=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../app-assets.json'),'utf8'));
 assert.equal(url.searchParams.get('v'),new URL(manifest.scripts.find(x=>x.startsWith('./castle-parent.js?')),'https://example.com/').searchParams.get('v'));
 const shell=fs.readFileSync(path.resolve(__dirname,'../../lounge/index.html'),'utf8');assert.match(shell,/<script type="module" src="app\.js\?v=/);
});
test('host paginates all events, performs GET only, and marks interrupted reads incomplete',async()=>{
 const requests=[];let fail=false;
 const b=boot(async(url,options)=>{requests.push({url:new URL(url),options});if(fail&&url.searchParams.get('offset')==='1')throw Error('connection lost');return {ok:true,status:200,json:async()=>['sourcing','castle-signals'].includes(url.searchParams.get('resource'))?{ok:true,items:[],nextOffset:null}:{ok:true,events:[{id:'record'+(url.searchParams.get('offset')||'0'),taskId:'insurance-threads-v1',eventKey:'event'+(url.searchParams.get('offset')||'0'),title:'原稿',payload:{draft:'保存原文'}}],nextOffset:url.searchParams.get('offset')==='0'?1:null}};});
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
test('direct workspace startup does not wait for a hidden castle',()=>{
 for(const options of [{active:false}]){const b=boot(null,options);assert.equal(b.window.CCCastle.whenReady(),null);assert.equal(b.document.getElementById('ccCastleFrame').hidden,true);}
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

test('sourcing is visible while the first events request is still pending',async()=>{
 let release;const gate=new Promise(resolve=>release=resolve),requests=[];
 const b=boot(async url=>{const key=url.searchParams.get('resource');requests.push(key);if(key==='task-events')await gate;return {ok:true,json:async()=>key==='sourcing'?{ok:true,items:[{id:'shop-now',title:'今すぐ表示する候補',payload:{buy:800}}]}:{ok:true,items:[],events:[],nextOffset:null}};});
 b.ready();const done=b.window.CCCastle.refresh();await new Promise(resolve=>setImmediate(resolve));
 assert.ok(requests.includes('task-events'));const early=b.sent.filter(x=>x.type==='records').at(-1);
 assert.equal(early.loading,true);assert.equal(early.complete,false);assert.equal(early.drafts.find(x=>x.place==='shiire').title,'今すぐ表示する候補');
 release();await done;assert.equal(b.sent.at(-1).complete,true);assert.equal(b.sent.at(-1).loading,false);
});
test('a malformed FP record cannot hide valid sourcing records or claim complete',async()=>{
 const b=boot(async url=>({ok:true,json:async()=>url.searchParams.get('resource')==='sourcing'?{ok:true,items:[{id:'valid',title:'保存された仕入れ候補'}]}:{ok:true,items:[{id:'bad',payload:{content_type:'fp_post_candidate',draft_slides:[null]}}],events:[],nextOffset:null}}));
 b.ready();await b.window.CCCastle.refresh();const last=b.sent.at(-1);assert.equal(last.complete,false);assert.equal(last.loading,false);assert.equal(last.drafts.length,1);assert.equal(last.drafts[0].place,'shiire');assert.match(last.message,/形式未確認/);
});

test('stored classic mode is retired and legacy aliases return only to castle or management',()=>{const b=boot(null,{mode:'classic'});assert.ok(b.window.CCCastle.whenReady());b.ready();assert.equal(b.document.getElementById('ccCastleFrame').hidden,false);assert.equal(b.document.getElementById('ccRpgHome').children.length,0);b.window.CCRpgHome.showRpg();assert.equal(b.document.getElementById('ccCastleFrame').hidden,false);let settings=0;b.window.CCRpgWorkspaces.openSettings=()=>settings++;b.window.CCRpgHome.showLegacy();assert.equal(settings,1);});
