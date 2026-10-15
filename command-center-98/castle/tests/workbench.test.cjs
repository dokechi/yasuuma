// DOM integration, not a browser/layout emulator. Run with linkedom on NODE_PATH.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {parseHTML}=require('linkedom');
function storage(){const map=new Map();return {get length(){return map.size},key:i=>[...map.keys()][i]??null,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),map};}
function boot({hash='#kyun',store=storage(),width=400,height=860,motion=false,serviceWorker,seeds}={}){
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
 window.innerWidth=width;window.innerHeight=height;window.matchMedia=()=>({matches:false,addEventListener(){}});
 const location={hash,pathname:'/index.html',search:'',reload(){location.reloaded=true}},history={state:null,pushState(s,_,u){this.state=s;location.hash=u.startsWith('#')?u:''},replaceState(s,_,u){this.state=s;location.hash=u.startsWith('#')?u:''},back(){location.hash='';this.state=null}};
 class Image{constructor(){this.complete=false;this.naturalWidth=0;images.push(this)}}
 const navigator={onLine:true,clipboard:{writeText:async t=>copied.push(t)},vibrate:()=>true};
 if(serviceWorker)navigator.serviceWorker=serviceWorker;
 const context=vm.createContext({document,window,location,history,Image,navigator,localStorage:store,URL,Blob,console,setTimeout:(fn,delay=0)=>{const id=++seq;timers.set(id,{fn,at:clock+delay});return id},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>{const id=++seq;timers.set(id,{fn,at:clock+16});return id},cancelAnimationFrame:id=>timers.delete(id)});
 const source=['notebook','world','workbench','skirt-action','character-rig','feedback','production','app'].map(n=>fs.readFileSync(`./${n}.js`,'utf8').replace(/^import .*$/gm,'').replaceAll('export ','')).join('\n');
 vm.runInContext('globalThis.CCCastleInitialDrafts='+JSON.stringify(seeds||JSON.parse(fs.readFileSync('tests/seeds.json','utf8')))+';'+source,context);
 const $=s=>document.querySelector(s),read=s=>vm.runInContext(s,context);
 async function emit(node,type,props={}){const e=new window.Event(type,{bubbles:true,cancelable:true});Object.assign(e,props);node.dispatchEvent(e);for(let i=0;i<8;i++)await Promise.resolve();}
 async function click(s){await emit(typeof s==='string'?$(s):s,'click')}
 function button(label){return [...document.querySelectorAll('#drawerBody button')].find(n=>n.textContent===label)}
 async function menu(label){await click('#deskMenu');if(label){const node=button(label);assert.ok(node,`Missing menu ${label}`);await click(node)}}
 async function save(fields){const form=$('#drawerBody form');for(const [k,v]of Object.entries(fields))form.querySelector(`[name=${k}]`).value=v;await emit(form,'submit');}
 function advance(ms){const target=clock+ms;for(let n=0;n<1000;n++){const entry=[...timers].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!entry)break;clock=entry[1].at;timers.delete(entry[0]);entry[1].fn(clock);}clock=target;}
 return {$,read,click,emit,menu,button,save,advance,store,document,window,location,images,animations,navigator,copied,context};
}
test('real DOM adds a draft, copies body/link separately, edits seal, deletes and undoes',async()=>{
 const b=boot();await b.menu('＋ 原稿を書く');await b.save({title:'自分の原稿',body:'実際の本文\n二行目',link:'https://example.com/item'});
 assert.equal(b.$('#draftTitle').textContent,'自分の原稿');assert.equal(b.read('tabs.length'),4);assert.equal(b.$('#deskDrawer').open,false);
 await b.click('#copy');assert.equal(b.copied.at(-1),'実際の本文\n二行目');assert.equal(b.$('#copySeal').hidden,false);
 await b.click('#copyLink');assert.equal(b.copied.at(-1),'https://example.com/item');assert.equal(b.read('notebook.copies().length'),2);
 await b.menu('編集する');await b.save({body:'編集後の本文'});assert.equal(b.$('#copySeal').hidden,true);assert.equal(b.read('notebook.copies().some(c=>c.text.includes("二行目"))'),true);
 await b.menu('原稿を取り除く');assert.notEqual(b.$('#draftTitle').textContent,'自分の原稿');await b.click('#undoAction');assert.equal(b.read('notebook.all().some(d=>d.title==="自分の原稿")'),true);
});
test('selected draft, per-draft scroll, favorite, font, focus and quiet survive a reload',async()=>{
 const b=boot();await b.click('#tab-2');b.$('#paperScroll').scrollTop=240;await b.emit(b.$('#paperScroll'),'scroll');b.advance(200);await b.click('#pinDraft');assert.equal(b.$('#paperScroll').scrollTop,240);assert.equal(b.read('currentDraft'),0);
 await b.click('#focusMode');await b.menu('表示と操作');const selects=[...b.document.querySelectorAll('#drawerBody select')];selects[0].value='large';await b.emit(selects[0],'change');selects[1].value='true';await b.emit(selects[1],'change');
 const c=boot({store:b.store});assert.equal(c.$('#draftTitle').textContent,'長い原稿も、そのまま読める。');assert.equal(c.$('#paperScroll').scrollTop,240);assert.equal(c.$('#app').dataset.font,'large');assert.equal(c.$('#app').dataset.focus,'on');assert.equal(c.read('reduced.matches'),true);assert.equal(c.$('#pinDraft').getAttribute('aria-pressed'),'true');
});
test('comparison copy uses its own manuscript; unfolded tray and fold preserve current work',async()=>{
 const b=boot({width:850,height:900});await b.menu('仮置き皿に置く');await b.click('#drawerClose');await b.menu('仮置き皿');assert.equal(b.$('#trayRail').hidden,false);assert.equal(b.$('#trayItems .draft-pick strong').textContent,b.$('#draftTitle').textContent);
 await b.menu('2つの原稿を比較');assert.equal(b.$('#trayRail').hidden,true);assert.equal(b.$('#comparePane').hidden,false);const current=b.$('#draftBody').textContent,other=b.$('#compareBody').textContent;assert.notEqual(current,other);await b.click('#compareCopy');assert.equal(b.copied.at(-1),other);assert.equal(b.$('#copySeal').hidden,true);
 b.$('#paperScroll').scrollTop=80;b.window.innerWidth=360;await b.emit(b.window,'resize');assert.equal(b.$('#draftBody').textContent,current);assert.equal(b.$('#paperScroll').scrollTop,80);assert.equal(b.$('#comparePane').hidden,false);
 await b.click('#closeCompare');await b.menu('仮置き皿');assert.equal(b.$('#deskDrawer').open,true);assert.ok(b.$('#drawerBody .draft-pick'));
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
 const b=boot();await b.menu('＋ 原稿を書く');await b.save({place:'fp',title:'検索の対象',body:'珍しい検索語α'});assert.equal(b.read('place'),'fp');await b.click('#pinDraft');await b.click('[data-go=kyun]');await b.menu('原稿を探す');const input=b.$('#drawerBody input');input.value='検索語α';await b.emit(input,'input');assert.equal(b.document.querySelectorAll('.draft-pick').length,1);await b.click(b.$('.draft-pick'));assert.equal(b.$('#draftTitle').textContent,'検索の対象');
 await b.click('#return');assert.equal(b.read('view'),'home');assert.equal(b.read('notebook.completed("fp").length'),1);assert.equal(b.$('.station[data-place=fp]').classList.contains('visited-today'),true);await b.click('#undoAction');assert.equal(b.read('notebook.completed("fp").length'),0);
});
test('map opens all four places and late room imagery never changes the current room',async()=>{
 const b=boot({hash:''});await b.click('#homeMode');assert.equal(b.$('#app').dataset.homeMode,'map');for(const key of ['choi','fp','shiire','kyun']){await b.click('[data-place='+key+']');assert.equal(b.read('place'),key);assert.equal(b.read('view'),'work');await b.click('#back');}
 await b.click('[data-place=fp]');const fp=b.images.find(i=>i.src==='assets/room-fp-v1.webp');assert.ok(fp);await b.click('[data-go=shiire]');fp.onload();assert.notEqual(b.$('#app').dataset.roomReady,'fp');const shiire=b.images.find(i=>i.src==='assets/room-shiire-v1.webp');shiire.onload();assert.equal(b.$('#app').dataset.roomReady,'shiire');
});
test('clipboard denial records no copy until the user confirms manual copying',async()=>{
 const b=boot();b.navigator.clipboard.writeText=async()=>{throw Error('denied')};await b.click('#copy');assert.equal(b.read('notebook.copies().length'),0);assert.equal(b.$('#copySeal').hidden,true);assert.equal(b.$('#copyFallback').open,true);await b.click('#manualCopied');assert.equal(b.read('notebook.copies().length'),1);assert.equal(b.$('#copySeal').hidden,false);
});
test('empty room remains operable; add and undo bring drafts back',async()=>{
 const b=boot();for(let i=0;i<3;i++)await b.menu('原稿を取り除く');assert.equal(b.read('tabs.length'),0);assert.equal(b.$('#copy').disabled,true);await b.menu('＋ 原稿を書く');await b.save({title:'空から作る',body:'本文'});assert.equal(b.read('tabs.length'),1);assert.equal(b.$('#copy').disabled,false);await b.click('#undoAction');assert.equal(b.read('tabs.length'),0);
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
 await b.menu('表示と操作');const quiet=b.document.querySelectorAll('#drawerBody select')[1];quiet.value='true';await b.emit(quiet,'change');await b.click('#drawerClose');const count=b.animations.length;await b.click('#tab-1');await b.click('#copy');assert.equal(b.animations.length,count);assert.equal(b.copied.at(-1),b.$('#draftBody').textContent);
});
test('favorite list opens the saved draft and unsupported vibration has no fake control',async()=>{
 const b=boot();await b.click('#tab-2');const title=b.$('#draftTitle').textContent;await b.click('#pinDraft');await b.click('[data-go=shiire]');await b.menu('お気に入り');assert.equal(b.$('#drawerBody .draft-pick strong').textContent,title);await b.click(b.$('#drawerBody .draft-pick'));assert.equal(b.read('place'),'kyun');assert.equal(b.$('#draftTitle').textContent,title);delete b.navigator.vibrate;await b.menu('表示と操作');assert.ok(b.$('#drawerBody').textContent.includes('振動を利用できません'));assert.equal(b.document.querySelectorAll('#drawerBody select').length,4);
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
