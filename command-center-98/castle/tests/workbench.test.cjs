// DOM integration, not a browser/layout emulator. Run with linkedom on NODE_PATH.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {parseHTML}=require('linkedom');
test('an empty recommendation area keeps purchases reachable and never hides read failures or local notes',async()=>{const b=boot({embedded:true,seeds:{kyun:[],choi:[],fp:[],shiire:[]}});b.window.CCSourcingArchive={enabled:true};b.context.packet={drafts:[],complete:true,loading:false,message:'読込完了'};b.read("openWorkspace('shiire');production.receive(packet)");assert.equal(b.$('#draftTitle').textContent,'おすすめ・紹介メモはありません');assert.match(b.$('#draftBody').textContent,/購入・在庫/);assert.equal(b.$('#productionNative').textContent,'購入・在庫');b.advance(2000);assert.equal(b.$('#draftTitle').textContent,'おすすめ・紹介メモはありません');await b.click('#productionNative');assert.ok(b.messages.some(m=>m.type==='native'&&m.action==='sourcing'));b.context.packet={drafts:[],complete:false,loading:false,message:'保存元の読取に失敗しました'};b.read('production.receive(packet)');assert.notEqual(b.$('#draftTitle').textContent,'おすすめ・紹介メモはありません');assert.match(b.$('#draftBody').textContent,/失敗/);b.read("const own=notebook.save({place:'shiire',title:'手元のメモ',body:'本人の編集内容'}).draft;refreshDrafts();selectId(own.id)");b.context.packet={drafts:[],complete:true,loading:false,message:'読込完了'};b.read('production.receive(packet)');assert.equal(b.$('#draftTitle').textContent,'手元のメモ');assert.equal(b.$('#draftBody').textContent,'本人の編集内容');});
test('partial reads never announce success; final success has one transient status location',()=>{
 const b=boot({hash:'',embedded:true}),detail=b.$('#productionStatus').closest('details');
 b.context.packet={drafts:[live()],complete:false,loading:true,message:'原稿を読み込み中…'};b.read('production.receive(packet)');assert.equal(detail.dataset.level,'loading');assert.match(b.$('#productionSummary').textContent,/読込中/);assert.equal(b.$('#toast').classList.contains('show'),false);b.advance(5000);assert.equal(detail.dataset.level,'loading');
 b.context.packet={drafts:[live()],complete:true,loading:false,message:'原稿の読み込み完了'};b.read('production.receive(packet)');assert.equal(detail.dataset.level,'success');assert.match(b.$('#productionSummary').textContent,/反映しました/);assert.equal(b.$('#toast').classList.contains('show'),false);b.advance(1901);assert.equal(detail.dataset.level,'idle');assert.doesNotMatch(b.$('#productionSummary').textContent,/読込中|反映しました/);
 b.context.packet={drafts:[],complete:false,loading:false,message:'原稿取得に失敗しました。保存済み原稿は保持しています。'};b.read('production.receive(packet)');b.advance(5000);assert.equal(detail.dataset.level,'warning');assert.equal(detail.open,true);assert.equal(b.read('notebook.sources().length'),1);
});
test('a held active original stays pending rather than success until accepted',async()=>{
 const b=boot({embedded:true});b.context.packet={drafts:[live()],complete:true,loading:false,message:'読み込み完了'};b.read('production.receive(packet);selectId("live-kyun-test-0")');b.context.packet={drafts:[live('更新後の原稿')],complete:true,loading:false,message:'読み込み完了'};b.read('production.receive(packet)');b.advance(3000);assert.equal(b.$('#productionStatus').closest('details').dataset.level,'pending');assert.equal(b.$('#productionNotice').hidden,false);await b.click('#productionNotice');assert.equal(b.$('#productionStatus').closest('details').dataset.level,'success');
});
test('a failed browser save remains visible and cannot produce a success status',()=>{
 const store=storage();store.setItem=()=>{throw Error('quota')};const b=boot({hash:'',store,embedded:true});b.context.packet={drafts:[live()],complete:true,loading:false,message:'読み込み完了'};b.read('production.receive(packet)');b.advance(5000);assert.equal(b.$('#storageWarning').hidden,false);assert.notEqual(b.$('#productionStatus').closest('details').dataset.level,'success');assert.equal(b.read('notebook.sources().length'),1);
});
test('accepting an older held payload cannot overwrite a newer read or warning',async()=>{
 const b=boot({embedded:true}),detail=b.$('#productionStatus').closest('details');b.context.packet={drafts:[live()],complete:true,loading:false,message:'完了'};b.read('production.receive(packet);selectId("live-kyun-test-0")');b.context.packet={drafts:[live('更新後')],complete:true,loading:false,message:'前の読込が完了'};b.read('production.receive(packet)');
 await b.emit(b.window,'message',{origin:'https://example.com',source:b.window.parent,data:{channel:'cc-castle-v1',type:'status',loading:true,message:'新しい原稿を読み込み中…'}});assert.equal(detail.dataset.level,'loading');await b.click('#productionNotice');assert.equal(detail.dataset.level,'loading');assert.match(b.$('#productionStatus').textContent,/新しい原稿/);
 b.context.packet={drafts:[live('次の更新')],complete:false,loading:false,message:'一部の原稿取得に失敗しました'};b.read('production.receive(packet)');assert.equal(detail.dataset.level,'warning');assert.equal(b.$('#productionNotice').hidden,false);await b.click('#productionNotice');b.advance(3000);assert.equal(detail.dataset.level,'warning');assert.equal(detail.open,true);
});
function storage(){const map=new Map();return {get length(){return map.size},key:i=>[...map.keys()][i]??null,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),map};}
test('search defaults to the room, offers one-click whole scope, reveals matching variants and returns to the same results',async()=>{
 const b=boot();await b.click('#searchDrafts');assert.equal(b.$('#searchScope').value,'kyun');const scopeAll=[...b.document.querySelectorAll('#drawerBody button')].find(n=>n.textContent==='全体で探す');await b.click(scopeAll);assert.equal(b.$('#searchScope').value,'');const input=b.$('#drawerBody input');input.value='長い原稿';await b.emit(input,'input');b.$('#deskDrawer').scrollTop=120;await b.click(b.$('.draft-pick'));assert.equal(b.$('#returnList').hidden,false);await b.click('#returnList');assert.equal(b.$('#drawerBody input').value,'長い原稿');assert.equal(b.$('#deskDrawer').scrollTop,120);await b.click('#drawerClose');await b.click('#searchDrafts');assert.equal(b.$('#drawerBody input').value,'長い原稿');assert.equal(b.$('#searchScope').value,'');
 await b.click('#drawerBack');assert.equal(b.$('#drawerTitle').textContent,'机の引き出し');await b.click(b.button('お気に入り'));await b.click('#drawerBack');assert.equal(b.$('#drawerTitle').textContent,'机の引き出し');
 const home=boot({hash:''});await home.click('#homeSearchDrafts');assert.equal(home.$('#searchScope').value,'');assert.match(home.$('.search-count').textContent,/全持ち場/);
});
test('matched variant names, manuscript counts, comparison choices and room completion scope are explicit',async()=>{
 const b=boot();b.context.packet={drafts:['甲案','乙案'].map((kind,i)=>({id:'v'+i,place:'kyun',title:'同名商品',body:kind+'の本文',kind,source:{id:'item',account:'kyun',label:kind}})),complete:true,message:''};b.read('production.receive(packet)');assert.match(b.$('#draftCount').textContent,/4原稿・5案/);await b.click('#searchDrafts');const input=b.$('#drawerBody input');input.value='乙案';await b.emit(input,'input');assert.equal(b.$('#drawerBody details').open,true);assert.match(b.$('#drawerBody .draft-pick small').textContent,/乙案/);await b.click('#drawerClose');b.read("selectId('v0')");await b.menu('2つの原稿を比較');assert.match([...b.document.querySelectorAll('#compareSelect option')].find(n=>n.value==='v1').textContent,/乙案/);await b.click('#closeCompare');
 b.read("notebook.finish(notebook.get('v0'));notebook.finish(notebook.list('choi')[0]);desk.update()");assert.equal(b.$('#doneCount').textContent,'1');await b.click('#doneStack');assert.equal(b.document.querySelectorAll('.history-card').length,1);assert.match(b.$('#drawerTitle').textContent,/キュン拾い.*1件/);
});
test('hiding a local original survives reload and remains exportable and restorable without touching history',async()=>{
 const b=boot();await b.menu('＋ 原稿を書く');await b.save({title:'保持する原稿',body:'失わない本文',link:'https://example.com/item'});const id=b.read('activeDraft.id');await b.click('#copy');await b.menu('この端末で非表示にする');assert.equal(b.read('notebook.get('+JSON.stringify(id)+')'),null);const c=boot({store:b.store});assert.equal(c.read('notebook.hiddenDrafts().length'),1);assert.match(c.read('notebook.export()'),/失わない本文/);assert.equal(c.read('notebook.copies().length'),1);await c.menu('非表示の原稿を復元');await c.click(c.button('一覧に戻す'));assert.equal(c.read('notebook.get('+JSON.stringify(id)+').body'),'失わない本文');assert.equal(c.read('notebook.copies().length'),1);assert.equal(c.$('#resumeWork'),null);assert.equal(c.$('#copyLink').textContent,'リンクをコピー');
});
test('workflow navigation keeps one home return, direct rooms, search and one backup entry',async()=>{
 const b=boot();assert.equal(b.$('#switch'),null);assert.equal(b.document.querySelectorAll('[data-go]').length,4);assert.match(b.$('#return').textContent,/読了にして戻る/);assert.match(b.$('#doneStack').textContent,/読了履歴/);
 await b.click('#searchDrafts');assert.ok(b.$('#drawerBody input[type=search]'));await b.click('#drawerClose');await b.click('#deskMenu');
 assert.deepEqual([...b.document.querySelectorAll('.drawer-section')].map(n=>n.textContent),['探す','この原稿を操作','管理']);assert.equal([...b.document.querySelectorAll('#drawerBody button')].filter(n=>n.textContent.includes('書き出す')).length,1);
 await b.click(b.button('表示設定'));assert.equal([...b.document.querySelectorAll('#drawerBody button')].filter(n=>n.textContent.includes('書き出す')).length,0);
 assert.deepEqual([...b.document.querySelectorAll('#productionShortcuts button')].map(n=>n.textContent),['海外時計','カード','作業日報','クーニー','仕入れ命']);
 await b.click('#drawerClose');await b.click('[data-go=shiire]');assert.deepEqual([...b.document.querySelectorAll('#productionTools button')].filter(n=>!n.hidden).map(n=>n.textContent),['候補','購入・在庫','原稿を更新']);
});
test('explicit source variants group only for display and retain selection, snapshots and independent records',async()=>{
 const b=boot();const make=(id,sourceId,account='kyun')=>({id,place:'kyun',title:'同じ見出し',body:'本文 '+id,kind:id,source:{id:sourceId,account,label:id},createdAt:1,updatedAt:1});
 b.context.packet={drafts:[make('a','record-1'),make('b','record-1'),make('c','record-2'),make('d','record-1','choi'),make('e','undefined'),make('f','undefined')],complete:true,message:'保存原稿'};b.read('production.receive(packet)');
 b.read("selectId('a')");assert.equal(b.$('#variantPicker').hidden,false);assert.equal(b.document.querySelectorAll('#variantSelect option').length,2);assert.equal(b.document.querySelectorAll('.draft-tabs button:not([hidden])').length,8);
 b.$('#variantSelect').value='b';await b.emit(b.$('#variantSelect'),'change');assert.equal(b.$('#draftBody').textContent,'本文 b');assert.equal(b.document.querySelectorAll('.draft-tabs button[aria-selected=true]').length,1);assert.equal(b.document.querySelector('.draft-tabs button[aria-selected=true]').hidden,false);await b.click(b.document.querySelector('.draft-tabs button[aria-selected=true]'));assert.equal(b.$('#draftBody').textContent,'本文 b');
 b.$('#paperScroll').scrollTop=72;await b.emit(b.$('#paperScroll'),'scroll');b.advance(200);await b.click('#copy');assert.equal(b.copied.at(-1),'本文 b');assert.equal(b.read('notebook.sources().length'),6);assert.equal(b.read('JSON.parse(notebook.export()).drafts.length'),18);
 await b.click('#searchDrafts');assert.equal(b.document.querySelectorAll('#drawerBody details').length,1);assert.match(b.$('#drawerBody summary').textContent,/2案/);await b.click('#drawerClose');
 b.read("selectId('c')");assert.equal(b.$('#variantPicker').hidden,true);b.read("selectId('b')");assert.equal(b.$('#paperScroll').scrollTop,72);
});
function boot({hash='#kyun',store=storage(),width=400,height=860,motion=false,serviceWorker,seeds,embedded=false}={}){
 const {document,window}=parseHTML(fs.readFileSync('./index.html','utf8'));let active=null,seq=0,clock=0,copied=[];const timers=new Map(),images=[],animations=[];
 Object.defineProperty(document,'activeElement',{get:()=>active});document.hidden=false;
 const proto=window.HTMLElement.prototype;
 proto.focus=function(){active=this};proto.select=function(){this.selectedText=true};
 proto.getBoundingClientRect=function(){return {left:20,top:100,right:180,bottom:340,width:160,height:240}};
 proto.showModal=function(){this.setAttribute('open','');this.open=true};proto.close=function(){this.removeAttribute('open');this.open=false};
 window.HTMLCanvasElement.prototype.getContext=()=>null;
 // linkedom's select.value is intentionally read-only; emulate the native setter.
 Object.defineProperty(window.HTMLSelectElement.prototype,'value',{configurable:true,get(){return [...this.querySelectorAll('option')].find(o=>o.hasAttribute('selected'))?.value||this.querySelector('option')?.value||''},set(v){for(const o of this.querySelectorAll('option')){if(o.value===String(v))o.setAttribute('selected','');else o.removeAttribute('selected');}}});
 if(motion)proto.animate=function(frames,options){const a={node:this,frames,options,finished:new Promise(()=>{}),cancelled:false,cancel(){this.cancelled=true}};animations.push(a);return a};
 for(const el of document.querySelectorAll('*'))el.scrollTop=0;
 const messages=[];window.parent=embedded?{postMessage:m=>messages.push(m)}:undefined;window.location={origin:'https://example.com'};window.innerWidth=width;window.innerHeight=height;window.matchMedia=()=>({matches:false,addEventListener(){}});
 const location={hash,pathname:'/index.html',search:'',reload(){location.reloaded=true}},history={state:null,pushState(s,_,u){this.state=s;location.hash=u.startsWith('#')?u:''},replaceState(s,_,u){this.state=s;location.hash=u.startsWith('#')?u:''},back(){location.hash='';this.state=null}};
 class Image{constructor(){this.complete=false;this.naturalWidth=0;images.push(this)}}
 const navigator={onLine:true,clipboard:{writeText:async t=>copied.push(t)},vibrate:()=>true};
 if(serviceWorker)navigator.serviceWorker=serviceWorker;
 const context=vm.createContext({document,window,location,history,Image,navigator,performance:{now:()=>clock},Date:class extends Date{constructor(...args){super(...(args.length?args:[1728993600000+clock]));}static now(){return 1728993600000+clock;}},localStorage:store,URL,Blob,console,setTimeout:(fn,delay=0)=>{const id=++seq;timers.set(id,{fn,at:clock+delay});return id},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>{const id=++seq;timers.set(id,{fn,at:clock+16});return id},cancelAnimationFrame:id=>timers.delete(id)});
 const source=['notebook','interaction','world','workbench','skirt-action','character-rig','scene-manifest','scene-motion','persona-lines','persona','character-scenes','music','feedback','production','app'].map(n=>fs.readFileSync(`./${n}.js`,'utf8').replace(/^import .*$/gm,'').replaceAll('export ','')).join('\n');
 vm.runInContext('globalThis.CCCastleInitialDrafts='+JSON.stringify(seeds||JSON.parse(fs.readFileSync('tests/seeds.json','utf8')))+';'+source,context);
 const $=s=>document.querySelector(s),read=s=>vm.runInContext(s,context);
 async function emit(node,type,props={}){const e=new window.Event(type,{bubbles:true,cancelable:true});Object.assign(e,props);node.dispatchEvent(e);for(let i=0;i<8;i++)await Promise.resolve();}
 async function click(s){await emit(typeof s==='string'?$(s):s,'click')}
 function button(label){return [...document.querySelectorAll('#drawerBody button')].find(n=>n.textContent===label)}
 async function menu(label){await click('#deskMenu');if(label){const node=button(label);assert.ok(node,`Missing menu ${label}`);await click(node)}}
 async function save(fields){const form=$('#drawerBody form');for(const [k,v]of Object.entries(fields))form.querySelector(`[name=${k}]`).value=v;await emit(form,'submit');}
 function advance(ms){const target=clock+ms;for(let n=0;n<1000;n++){const entry=[...timers].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!entry)break;clock=entry[1].at;timers.delete(entry[0]);entry[1].fn(clock);}clock=target;}
 return {$,read,click,emit,menu,button,save,advance,store,document,window,location,images,animations,navigator,copied,context,messages};
}
test('direct management action forwards only the explicit original ID and keeps data and app updates distinct',async()=>{const b=boot({embedded:true});b.context.packet={drafts:[{id:'live-test',place:'kyun',title:'原稿',body:'本文',source:{id:'task:media:target',account:'kyun',label:'A案'}}],complete:true,message:''};b.read('production.receive(packet)');b.read("selectId('live-test')");await b.click('#productionNative');const direct=b.messages.find(m=>m.type==='native');assert.equal(direct.recordId,'task:media:target');await b.click('#productionRefresh');assert.equal(b.messages.filter(m=>m.type==='refresh').length,1);await b.emit(b.window,'message',{origin:'https://example.com',source:b.window.parent,data:{channel:'cc-castle-v1',type:'host-update'}});assert.equal(b.$('#hostUpdate').textContent,'管理画面アプリ更新');assert.equal(b.document.querySelectorAll('#productionRefresh').length,1);});
test('real DOM adds a draft, copies body/link separately, edits seal, deletes and undoes',async()=>{
 const b=boot();await b.menu('＋ 原稿を書く');await b.save({title:'自分の原稿',body:'実際の本文\n二行目',link:'https://example.com/item'});
 assert.equal(b.$('#draftTitle').textContent,'自分の原稿');assert.equal(b.read('tabs.length'),4);assert.equal(b.$('#deskDrawer').open,false);
 await b.click('#copy');assert.equal(b.copied.at(-1),'実際の本文\n二行目');assert.equal(b.$('#copySeal').hidden,false);
 await b.click('#copyLink');assert.equal(b.copied.at(-1),'https://example.com/item');assert.equal(b.read('notebook.copies().length'),2);
 await b.menu('編集する');await b.save({body:'編集後の本文'});assert.equal(b.$('#copySeal').hidden,true);assert.equal(b.read('notebook.copies().some(c=>c.text.includes("二行目"))'),true);
 await b.menu('この端末で非表示にする');assert.notEqual(b.$('#draftTitle').textContent,'自分の原稿');await b.click('#undoAction');assert.equal(b.read('notebook.all().some(d=>d.title==="自分の原稿")'),true);
});
test('selected draft, per-draft scroll, favorite, font, focus and quiet survive a reload',async()=>{
 const b=boot();await b.click('#tab-2');b.$('#paperScroll').scrollTop=240;await b.emit(b.$('#paperScroll'),'scroll');b.advance(200);await b.click('#pinDraft');assert.equal(b.$('#paperScroll').scrollTop,240);assert.equal(b.read('currentDraft'),0);
 await b.click('#focusMode');await b.menu('表示設定');const selects=[...b.document.querySelectorAll('#drawerBody select')];selects[0].value='large';await b.emit(selects[0],'change');selects[1].value='true';await b.emit(selects[1],'change');
 const c=boot({store:b.store});assert.equal(c.$('#draftTitle').textContent,'長い原稿も、そのまま読める。');assert.equal(c.$('#paperScroll').scrollTop,240);assert.equal(c.$('#app').dataset.font,'large');assert.equal(c.$('#app').dataset.focus,'on');assert.equal(c.read('reduced.matches'),true);assert.equal(c.$('#pinDraft').getAttribute('aria-pressed'),'true');
});
test('comparison copy uses its own manuscript; unfolded tray and fold preserve current work',async()=>{
 const b=boot({width:850,height:900});await b.menu('作業中の仮置きに置く');await b.click('#drawerClose');await b.menu('作業中の仮置き');assert.equal(b.$('#trayRail').hidden,false);assert.equal(b.$('#trayItems .draft-pick strong').textContent,b.$('#draftTitle').textContent);
 await b.menu('2つの原稿を比較');assert.equal(b.$('#trayRail').hidden,true);assert.equal(b.$('#comparePane').hidden,false);const current=b.$('#draftBody').textContent,other=b.$('#compareBody').textContent;assert.notEqual(current,other);await b.click('#compareCopy');assert.equal(b.copied.at(-1),other);assert.equal(b.$('#copySeal').hidden,true);
 b.$('#paperScroll').scrollTop=80;b.window.innerWidth=360;await b.emit(b.window,'resize');assert.equal(b.$('#draftBody').textContent,current);assert.equal(b.$('#paperScroll').scrollTop,80);assert.equal(b.$('#comparePane').hidden,false);
 await b.click('#closeCompare');await b.menu('作業中の仮置き');assert.equal(b.$('#deskDrawer').open,true);assert.ok(b.$('#drawerBody .draft-pick'));
});
test('import is staged, safe as text, applied only on request and undoable as one batch',async()=>{
 const b=boot(),original=b.$('#draftBody').textContent;const data=JSON.stringify({drafts:[{id:'import-1',place:'kyun',title:'<img src=x onerror=bad()>',body:'届いた本文',link:'https://example.com/'}]});
 b.$('#importFile').files=[{size:data.length,text:async()=>data}];await b.emit(b.$('#importFile'),'change');assert.equal(b.$('#freshNotice').hidden,false);assert.equal(b.$('#draftBody').textContent,original);assert.equal(b.read('notebook.get("import-1")'),null);
 await b.click('#freshNotice');assert.equal(b.$('#drawerBody img'),null);await b.click(b.button('この原稿を取り込む'));assert.equal(b.read('notebook.get("import-1").body'),'届いた本文');assert.equal(b.$('#draftBody').textContent,original);await b.click('#undoAction');assert.equal(b.read('notebook.get("import-1")'),null);
});
test('external storage updates leave active reading intact until explicitly accepted',async()=>{
 const b=boot(),id=b.read('activeDraft.id'),before=b.$('#draftBody').textContent;
 const d=JSON.parse(b.read('JSON.stringify(activeDraft)'));d.body='別の画面の更新';b.store.setItem('castle-production.v1.draft:'+id,JSON.stringify(d));await b.emit(b.window,'storage',{key:'castle-production.v1.draft:'+id});
 assert.equal(b.$('#draftBody').textContent,before);assert.equal(b.$('#freshNotice').hidden,false);await b.click('#freshNotice');assert.equal(b.$('#draftBody').textContent,'別の画面の更新');
});
test('search and favorites open the exact cross-room manuscript; completion records and undo work',async()=>{
 const b=boot();await b.menu('＋ 原稿を書く');await b.save({place:'fp',title:'検索の対象',body:'珍しい検索語α'});assert.equal(b.read('place'),'fp');await b.click('#pinDraft');await b.click('[data-go=kyun]');await b.menu('原稿を探す');b.$('#searchScope').value='';await b.emit(b.$('#searchScope'),'change');const input=b.$('#drawerBody input');input.value='検索語α';await b.emit(input,'input');assert.equal(b.document.querySelectorAll('.draft-pick').length,1);await b.click(b.$('.draft-pick'));assert.equal(b.$('#draftTitle').textContent,'検索の対象');
 await b.click('#return');assert.equal(b.read('view'),'home');assert.equal(b.read('notebook.completed("fp").length'),1);assert.equal(b.$('.station[data-place=fp]').classList.contains('visited-today'),true);await b.click('#undoAction');assert.equal(b.read('notebook.completed("fp").length'),0);
});
test('map opens all four places and late room imagery never changes the current room',async()=>{
 const b=boot({hash:''});await b.click('#homeMode');assert.equal(b.$('#app').dataset.homeMode,'map');for(const key of ['choi','fp','shiire','kyun']){await b.click('[data-place='+key+']');assert.equal(b.read('place'),key);assert.equal(b.read('view'),'work');await b.click('#back');}
 await b.click('[data-place=fp]');const fp=b.images.find(i=>i.src==='assets/room-fp-v1-display.webp');assert.ok(fp);await b.click('[data-go=shiire]');fp.onload();assert.notEqual(b.$('#app').dataset.roomReady,'fp');const shiire=b.images.find(i=>i.src==='assets/room-shiire-v1-display.webp');shiire.onload();assert.equal(b.$('#app').dataset.roomReady,'shiire');
});
test('clipboard denial records no copy until the user confirms manual copying',async()=>{
 const b=boot();b.navigator.clipboard.writeText=async()=>{throw Error('denied')};await b.click('#copy');assert.equal(b.read('notebook.copies().length'),0);assert.equal(b.$('#copySeal').hidden,true);assert.equal(b.$('#copyFallback').open,true);await b.click('#manualCopied');assert.equal(b.read('notebook.copies().length'),1);assert.equal(b.$('#copySeal').hidden,false);
});
test('empty room remains operable; add and undo bring drafts back',async()=>{
 const b=boot();for(let i=0;i<3;i++)await b.menu('この端末で非表示にする');assert.equal(b.read('tabs.length'),0);assert.equal(b.$('#copy').disabled,true);await b.menu('＋ 原稿を書く');await b.save({title:'空から作る',body:'本文'});assert.equal(b.read('tabs.length'),1);assert.equal(b.$('#copy').disabled,false);await b.click('#undoAction');assert.equal(b.read('tabs.length'),0);
});
test('storage failure is visible while the current draft remains usable and exportable',async()=>{
 const s=storage();s.setItem=()=>{throw Error('quota')};const b=boot({store:s});await b.menu('＋ 原稿を書く');await b.save({title:'保存容量不足',body:'消さない本文'});assert.equal(b.$('#storageWarning').hidden,false);assert.equal(b.$('#draftBody').textContent,'消さない本文');assert.ok(b.read('notebook.export()').includes('消さない本文'));await b.click('#copy');assert.equal(b.copied.at(-1),'消さない本文');
});

test('waiting app updates cannot replace a staged import or interrupt reading automatically',async()=>{
 const messages=[],worker={postMessage:m=>messages.push(m)},registration={waiting:worker,addEventListener(){}};
 const listeners={};const sw={controller:{},ready:Promise.resolve(registration),register:async()=>registration,addEventListener(type,fn){listeners[type]=fn;}};
 const b=boot({serviceWorker:sw});for(let i=0;i<8;i++)await Promise.resolve();const before=b.$('#draftBody').textContent;
 listeners.controllerchange();assert.equal(b.read('location.reloaded'),undefined);assert.equal(messages.length,0);assert.equal(b.$('#freshNotice').hidden,false);assert.equal(b.$('#deskDrawer').open,undefined);
 const data=JSON.stringify([{id:'incoming',place:'kyun',title:'新着',body:'確認してから'}]);b.$('#importFile').files=[{size:data.length,text:async()=>data}];await b.emit(b.$('#importFile'),'change');await b.click('#freshNotice');assert.equal(b.$('#drawerTitle').textContent,'届いた原稿を確認');await b.click(b.button('今回は受け取らない'));
 assert.equal(b.read('notebook.get("incoming")'),null);assert.equal(b.$('#freshNotice').hidden,false);assert.equal(b.$('#draftBody').textContent,before);await b.click('#freshNotice');assert.equal(b.$('#drawerTitle').textContent,'更新の準備ができました');assert.equal(messages.length,0);await b.click(b.button('保存して更新'));assert.equal(messages[0].type,'SKIP_WAITING');listeners.controllerchange();assert.equal(b.read('location.reloaded'),true);
});
test('late clipboard completion stores its original snapshot without sealing an edited draft',async()=>{
 const b=boot(),before=b.$('#draftBody').textContent;let resolve;b.navigator.clipboard.writeText=()=>new Promise(r=>resolve=r);await b.click('#copy');await b.menu('編集する');await b.save({body:'コピー中に編集した本文'});resolve();for(let i=0;i<8;i++)await Promise.resolve();assert.equal(b.read('notebook.copies()[0].text'),before);assert.equal(b.$('#copySeal').hidden,true);assert.equal(b.$('#draftBody').textContent,'コピー中に編集した本文');
});
test('first entry embellishment is bounded, later visits are short, quiet keeps controls live',async()=>{
 const b=boot({hash:'',motion:true});await b.click('.station[data-place=choi]');assert.equal(b.$('#app').classList.contains('first-visit'),true);b.advance(430);assert.equal(b.$('#app').classList.contains('first-visit'),false);await b.click('#back');await b.click('.station[data-place=choi]');assert.equal(b.$('#app').classList.contains('first-visit'),false);
 await b.menu('表示設定');const quiet=b.document.querySelectorAll('#drawerBody select')[1];quiet.value='true';await b.emit(quiet,'change');await b.click('#drawerClose');const count=b.animations.length;await b.click('#tab-1');await b.click('#copy');assert.equal(b.animations.length,count);assert.equal(b.copied.at(-1),b.$('#draftBody').textContent);
});
test('favorite list opens the saved draft and unsupported vibration has no fake control',async()=>{
 const b=boot();await b.click('#tab-2');const title=b.$('#draftTitle').textContent;await b.click('#pinDraft');await b.click('[data-go=shiire]');await b.menu('お気に入り');assert.equal(b.$('#drawerBody .draft-pick strong').textContent,title);await b.click(b.$('#drawerBody .draft-pick'));assert.equal(b.read('place'),'kyun');assert.equal(b.$('#draftTitle').textContent,title);delete b.navigator.vibrate;await b.menu('表示設定');assert.ok(b.$('#drawerBody').textContent.includes('振動を利用できません'));assert.equal(b.document.querySelectorAll('#drawerBody select').length,4);
});

const live=(body='本番の原文')=>({id:'live-kyun-test-0',place:'kyun',title:'本番原稿',body,link:'https://example.com/product',kind:'保存本文案1',createdAt:1,updatedAt:1,source:{id:'task:test',account:'kyun',label:'保存本文案1'}});
test('production contains no sample records, connects real text, and stages later server updates',async()=>{
 const b=boot({seeds:{kyun:[],choi:[],fp:[],shiire:[]}});assert.equal(b.read('notebook.all().length'),0);
 b.context.packet={drafts:[live()],complete:true,message:'本番読取完了'};b.read('production.receive(packet)');assert.equal(b.$('#draftBody').textContent,'本番の原文');await b.click('#copy');assert.equal(b.copied.at(-1),'本番の原文');
 b.context.packet={drafts:[live('サーバーで更新された本文')],complete:true,message:'更新'};b.read('production.receive(packet)');assert.equal(b.$('#draftBody').textContent,'本番の原文');assert.equal(b.$('#productionNotice').hidden,false);await b.click('#productionNotice');assert.equal(b.$('#draftBody').textContent,'サーバーで更新された本文');assert.equal(b.$('#copySeal').hidden,true);
});
test('editing a source makes a separate local draft, with undo and immutable server copy',async()=>{
 const b=boot({seeds:{kyun:[],choi:[],fp:[],shiire:[]}});b.context.packet={drafts:[live()],complete:true};b.read('production.receive(packet)');await b.menu('端末の別原稿として編集');await b.save({body:'自分の下書き'});assert.equal(b.read('activeDraft.source'),undefined);assert.equal(b.read('notebook.get("live-kyun-test-0").body'),'本番の原文');assert.equal(b.read('notebook.all().length'),2);await b.click('#undoAction');assert.equal(b.read('notebook.all().length'),1);
});
test('partial reads retain cached sources; a complete snapshot removes stale ones without deleting local drafts',()=>{
 const b=boot({seeds:{kyun:[],choi:[],fp:[],shiire:[]}});b.context.row=live();b.read('notebook.replaceSources([row],{complete:true})');b.read('notebook.save({place:"kyun",title:"手書き",body:"残す"})');b.read('notebook.replaceSources([],{complete:false})');assert.equal(b.read('notebook.all().length'),2);b.read('notebook.replaceSources([],{complete:true})');assert.equal(b.read('notebook.all().length'),1);assert.equal(b.read('notebook.all()[0].body'),'残す');
});
test('imported snapshots cannot claim to be live server records or overwrite a source',()=>{
 const b=boot({seeds:{kyun:[],choi:[],fp:[],shiire:[]}});b.context.row=live();b.read('notebook.replaceSources([row],{complete:true})');b.context.incoming=JSON.stringify({drafts:[live('外部ファイル本文')]});b.read('notebook.applyImport(notebook.parseImport(incoming))');assert.equal(b.read('notebook.get("live-kyun-test-0").body'),'本番の原文');assert.equal(b.read('notebook.all().filter(x=>x.source).length'),1);
});

function sceneSource(key,id){return key==='shiire'?'assets/user-'+({welcome:19080,work:19017,rest:19016,tea:19020,special:19018})[id]+'-display.webp':key==='fp'&&id==='tea'?'assets/user-19079-display.webp':`assets/scene-${key}-${id}-v1.jpg`;}
test('inline and full views stay unready through decoding; a departed room cannot commit its late decode',async()=>{
 const b=boot();await sceneLoaded(b,'kyun','welcome');const draft=b.read('activeDraft.id');let finish;
 b.$('#sceneFullImage').decode=()=>new Promise(resolve=>finish=resolve);
 await b.click('[data-go=choi]');await b.click('#sceneExpand');assert.equal(b.$('#sceneDialog').dataset.ready,'false');await sceneLoaded(b,'choi','welcome');assert.equal(b.$('#characterScenes').dataset.ready,'false');assert.equal(b.$('#sceneDialog').dataset.ready,'false');
 b.$('#sceneFullImage').decode=undefined;await b.click('[data-go=fp]');await sceneLoaded(b,'fp','welcome');finish();for(let i=0;i<12;i++)await Promise.resolve();assert.equal(b.$('#sceneImage').src,sceneSource('fp','welcome'));assert.equal(b.$('#sceneFullImage').src,sceneSource('fp','welcome'));assert.equal(b.$('#sceneDialog').dataset.ready,'true');assert.equal(b.$('#characterScenes').dataset.ready,'true');await b.click('[data-go=kyun]');assert.equal(b.read('activeDraft.id'),draft);
});
async function sceneLoaded(b,key,id){
 const src=sceneSource(key,id),pending=b.images.findLast(i=>i.src===src);
 assert.ok(pending,`requested ${src}`);pending.onload();for(let i=0;i<12;i++)await Promise.resolve();
}
test('all twenty scene choices preserve manuscript, scroll and saved records; full view closes to work',async()=>{
 const b=boot();await sceneLoaded(b,'kyun','welcome');
 for(const key of ['kyun','choi','fp','shiire']){
  if(key!=='kyun'){await b.click(`[data-go=${key}]`);await sceneLoaded(b,key,'welcome');}
  b.$('#paperScroll').scrollTop=94;const id=b.read('activeDraft.id'),before=JSON.stringify([...b.store.map].filter(([k])=>k!=='castle-town.persona.v1'));
  for(const scene of ['welcome','work','rest','tea','special']){
   b.$('#sceneSelect').value=scene;await b.emit(b.$('#sceneSelect'),'change');await sceneLoaded(b,key,scene);
   assert.equal(b.$('#characterScenes').dataset.scene,scene);assert.equal(b.$('#app').dataset.sceneCharacter,key);if(key==='fp')assert.match(b.$('#sceneImage').alt,/FP・TikTok/);assert.equal(b.$('#sceneImage').src,sceneSource(key,scene));
   assert.equal(b.read('activeDraft.id'),id);assert.equal(b.$('#paperScroll').scrollTop,94);
  }
  assert.equal(JSON.stringify([...b.store.map].filter(([k])=>k!=='castle-town.persona.v1')),before);
 }
 await b.click('#sceneExpand');assert.equal(b.$('#sceneDialog').open,true);assert.equal(b.$('#sceneFullImage').src,b.$('#sceneImage').src);
 await b.click('#sceneClose');assert.equal(b.$('#sceneDialog').open,false);assert.equal(b.read('view'),'work');
});
test('slow old-scene loads and failed images cannot replace another room or block copy',async()=>{
 const b=boot();const old=b.images.find(i=>i.src.includes('scene-kyun-welcome'));
 await b.click('[data-go=choi]');await sceneLoaded(b,'choi','welcome');const src=b.$('#sceneImage').src;
 old.onload();for(let i=0;i<10;i++)await Promise.resolve();assert.equal(b.$('#sceneImage').src,src);
 b.$('#sceneSelect').value='tea';await b.emit(b.$('#sceneSelect'),'change');b.images.find(i=>i.src.includes('scene-choi-tea')).onerror();for(let i=0;i<10;i++)await Promise.resolve();
 assert.equal(b.$('#sceneImage').src,src);await b.click('#copy');assert.equal(b.copied.at(-1),b.read('activeDraft.body'));
});
test('automatic art cycles every ten seconds in full view without changing text; manual art stays fixed',async()=>{
 const b=boot();await sceneLoaded(b,'kyun','welcome');const quote=b.$('#greetingText').textContent,body=b.$('#draftBody').textContent;
 b.advance(9999);assert.equal(b.images.some(i=>i.src.includes('scene-kyun-work')),false);
 await b.click('#sceneExpand');await b.emit(b.$('#paperScroll'),'scroll');
 for(const id of ['work','rest','tea','special','welcome']){b.advance(id==='work'?1:10000);await sceneLoaded(b,'kyun',id);assert.equal(b.$('#characterScenes').dataset.scene,id);assert.equal(b.$('#greetingText').textContent,quote);}
 b.$('#sceneFullSelect').value='tea';await b.emit(b.$('#sceneFullSelect'),'change');await sceneLoaded(b,'kyun','tea');assert.equal(b.$('#sceneSelect').value,'tea');b.advance(100000);await b.click('#tab-1');assert.equal(b.$('#characterScenes').dataset.scene,'tea');assert.notEqual(b.$('#draftBody').textContent,body);
});
test('failed automatic art advances to other scenes and retries the failed image on the next round',async()=>{
 const b=boot();await sceneLoaded(b,'kyun','welcome');const quote=b.$('#greetingText').textContent,body=b.$('#draftBody').textContent;
 b.advance(10000);b.images.find(i=>i.src===sceneSource('kyun','work')).onerror();for(let i=0;i<12;i++)await Promise.resolve();
 b.advance(9999);assert.equal(b.images.some(i=>i.src===sceneSource('kyun','rest')),false);b.advance(1);await sceneLoaded(b,'kyun','rest');
 for(const id of ['tea','special','welcome','work']){b.advance(10000);await sceneLoaded(b,'kyun',id);assert.equal(b.$('#characterScenes').dataset.scene,id);}
 assert.equal(b.images.filter(i=>i.src===sceneSource('kyun','work')).length,2);assert.equal(b.$('#greetingText').textContent,quote);assert.equal(b.$('#draftBody').textContent,body);
});
test('a failed first image recovers automatically without a room change',async()=>{
 const b=boot(),quote=b.$('#greetingText').textContent;b.images.find(i=>i.src===sceneSource('kyun','welcome')).onerror();for(let i=0;i<12;i++)await Promise.resolve();
 b.advance(10000);await sceneLoaded(b,'kyun','work');assert.equal(b.$('#characterScenes').dataset.ready,'true');assert.equal(b.$('#greetingText').textContent,quote);
});
test('a stalled image times out and a late success cannot replace the following image',async()=>{
 const b=boot();await sceneLoaded(b,'kyun','welcome');const body=b.$('#draftBody').textContent;
 b.advance(10000);const stalled=b.images.find(i=>i.src===sceneSource('kyun','work'));
 b.advance(11999);assert.equal(b.$('#characterScenes').dataset.loading,'true');b.advance(1);for(let i=0;i<12;i++)await Promise.resolve();assert.equal(b.$('#characterScenes').dataset.loading,'false');
 b.advance(10000);await sceneLoaded(b,'kyun','rest');stalled.onload();for(let i=0;i<12;i++)await Promise.resolve();assert.equal(b.$('#characterScenes').dataset.scene,'rest');assert.equal(b.$('#draftBody').textContent,body);await b.click('#copy');assert.equal(b.copied.at(-1),body);
});
test('hidden rotation pauses and resumes with a fresh ten second interval',async()=>{
 const b=boot();await sceneLoaded(b,'kyun','welcome');b.advance(8000);b.document.hidden=true;await b.emit(b.document,'visibilitychange');b.advance(50000);assert.equal(b.$('#characterScenes').dataset.scene,'welcome');
 b.document.hidden=false;await b.emit(b.document,'visibilitychange');b.advance(9999);assert.equal(b.$('#characterScenes').dataset.scene,'welcome');b.advance(1);await sceneLoaded(b,'kyun','work');assert.equal(b.$('#characterScenes').dataset.scene,'work');
});
test('a manual image interrupted by hiding finishes on resume without resuming rotation',async()=>{
 const b=boot();await sceneLoaded(b,'kyun','welcome');b.$('#sceneSelect').value='tea';await b.emit(b.$('#sceneSelect'),'change');
 b.document.hidden=true;await b.emit(b.document,'visibilitychange');await sceneLoaded(b,'kyun','tea');assert.equal(b.$('#characterScenes').dataset.scene,'welcome');
 b.document.hidden=false;await b.emit(b.document,'visibilitychange');await sceneLoaded(b,'kyun','tea');b.advance(30000);assert.equal(b.$('#characterScenes').dataset.scene,'tea');
});
test('host pause clears scene timers; a failed copy never selects a reward',async()=>{
 const b=boot();await sceneLoaded(b,'kyun','welcome');b.navigator.clipboard.writeText=async()=>{throw Error('denied')};await b.click('#copy');assert.equal(b.images.some(i=>i.src.includes('scene-kyun-special')),false);
 await b.emit(b.window,'castle:pause');b.advance(100000);assert.equal(b.$('#characterScenes').dataset.scene,'welcome');
});

test('a repeated-touch reply survives delayed art, automatic scenes and the old greeting timeout',async()=>{
 const b=boot(),greeting=b.$('#greetingText').textContent;await b.click('#sceneTouch');assert.equal(b.$('#greetingText').textContent,greeting);
 b.advance(400);await b.click('#sceneTouch');const reply=b.$('#greetingText').textContent;assert.notEqual(reply,greeting);
 await sceneLoaded(b,'kyun','welcome');b.advance(10000);await sceneLoaded(b,'kyun','work');assert.equal(b.$('#greetingText').textContent,reply);
 b.$('#sceneSelect').value='tea';await b.emit(b.$('#sceneSelect'),'change');await sceneLoaded(b,'kyun','tea');b.advance(5000);assert.equal(b.$('#greetingText').textContent,reply);assert.equal(b.$('#sceneCaption').textContent,reply);
});
test('full view shares touch history; rest, work and pause preserve dialogue and drafts',async()=>{
 const b=boot();await sceneLoaded(b,'kyun','welcome');const body=b.$('#draftBody').textContent,first=b.$('#greetingText').textContent;
 await b.click('#sceneTouch');b.advance(400);await b.click('#sceneExpand');await b.click('#sceneTalk');const reply=b.$('#sceneCaption').textContent;assert.notEqual(reply,first);
 b.advance(400);await b.click('#sceneFullTouch');assert.equal(b.$('#sceneCaption').textContent,reply);
 await b.click('#sceneRest');await sceneLoaded(b,'kyun','rest');assert.equal(b.$('#characterScenes').dataset.scene,'rest');
 await b.click('#sceneContinue');assert.equal(b.$('#sceneDialog').open,false);assert.equal(b.document.activeElement,b.$('#draft'));await sceneLoaded(b,'kyun','work');assert.equal(b.$('#characterScenes').dataset.scene,'work');assert.equal(b.$('#draftBody').textContent,body);
 await b.emit(b.window,'castle:pause');await b.click('#sceneTalk');assert.equal(b.$('#sceneCaption').textContent,reply);
 await b.emit(b.window,'castle:resume');assert.equal(b.$('#greetingText').textContent,reply);await b.click('#sceneTalk');assert.equal(b.$('#greetingText').textContent,reply);
});
test('copy and empty-room actions preserve the dialogue without source labels',async()=>{
 const b=boot();await sceneLoaded(b,'kyun','welcome');const initial=b.$('#greetingText').textContent;
 b.navigator.clipboard.writeText=async()=>{throw Error('denied')};await b.click('#copy');assert.equal(b.$('#greetingText').textContent,initial);
 b.navigator.clipboard.writeText=async()=>{};await b.click('#copy');assert.equal(b.$('#greetingText').textContent,initial);
 for(const id of ['#quoteSource','#sceneSource','#sceneMood'])assert.equal(b.$(id),null);
 const empty=boot({seeds:{kyun:[],choi:[],fp:[],shiire:[]}}),line=empty.$('#greetingText').textContent;await empty.click('#sceneContinue');assert.equal(empty.$('#greetingText').textContent,line);assert.equal(empty.read('notebook.all().length'),0);
});
test('all four rooms use their approved situation-specific lines; metadata never enters either view',async()=>{
 const b=boot();
 for(const key of ['kyun','choi','fp','shiire']){
  if(key!=='kyun')await b.click('[data-go='+key+']');
  const body=b.$('#draftBody').textContent,welcome=b.read('PERSONA_DIALOGUE.'+key+'.welcome'),repeat=b.read('PERSONA_DIALOGUE.'+key+'.repeatTouch');
  assert.equal(b.$('#greetingText').textContent,welcome);assert.equal(b.$('#sceneCaption').textContent,welcome);
  await b.click('#sceneTouch');assert.equal(b.$('#greetingText').textContent,welcome);b.advance(400);await b.click('#sceneTouch');assert.equal(b.$('#greetingText').textContent,repeat);assert.equal(b.$('#sceneCaption').textContent,repeat);
  assert.equal(b.$('#draftBody').textContent,body);assert.doesNotMatch(b.$('.greeting').textContent+b.$('.scene-conversation').textContent,/出典|あやせif|桐乃|新垣あやせ|加藤恵|一色いろは|アスナ|次のセリフ/);
 }
 await b.click('[data-go=choi]');assert.equal(b.$('#greetingText').dataset.reply,'choi:welcome');
});

test('an empty room fills automatically after an earlier empty partial result',()=>{
 const b=boot({seeds:{kyun:[],choi:[],fp:[],shiire:[]}});
 b.context.packet={drafts:[],complete:false,loading:true,message:'仕入れ・原稿を読み込み中'};b.read('production.receive(packet)');
 assert.match(b.$('#draftTitle').textContent,/読み込み中/);assert.doesNotMatch(b.$('#draftBody').textContent,/引き出し/);
 b.context.packet={drafts:[live()],complete:false,loading:true,message:'履歴は読込中'};b.read('production.receive(packet)');
 assert.equal(b.$('#draftBody').textContent,'本番の原文');assert.equal(b.$('#productionNotice').hidden,true);
});
test('new records in other rooms apply automatically while the current text is unchanged',async()=>{
 const b=boot({seeds:{kyun:[],choi:[],fp:[],shiire:[]}});b.context.packet={drafts:[live()],complete:false,loading:true};b.read('production.receive(packet)');
 const sourcing={...live('すぐに読める候補'),id:'live-shiire-now',place:'shiire',title:'取得済み候補'};
 b.context.packet={drafts:[live(),sourcing],complete:false,loading:true};b.read('production.receive(packet)');assert.equal(b.$('#productionNotice').hidden,true);
 await b.click('[data-go=shiire]');assert.equal(b.$('#draftBody').textContent,'すぐに読める候補');assert.equal(b.$('#productionNotice').hidden,true);
});
test('only changed active text is held; other rooms become readable and switching accepts updates',async()=>{
 const b=boot({seeds:{kyun:[],choi:[],fp:[],shiire:[]}});b.context.packet={drafts:[live()],complete:true};b.read('production.receive(packet)');
 const others=['choi','fp','shiire'].map(place=>({...live(place+'の本文'),id:'live-'+place,place}));
 b.context.packet={drafts:[live('更新された本文'),...others],complete:true};b.read('production.receive(packet)');
 assert.equal(b.$('#draftBody').textContent,'本番の原文');assert.equal(b.$('#productionNotice').hidden,false);assert.equal(b.read('notebook.sources().length'),4);
 for(const place of ['choi','fp','shiire']){await b.click('[data-go='+place+']');assert.equal(b.$('#draftBody').textContent,place+'の本文');assert.equal(b.$('#copy').disabled,false);assert.equal(b.$('#productionNotice').hidden,true);}
 await b.click('[data-go=kyun]');assert.equal(b.$('#draftBody').textContent,'更新された本文');
});
