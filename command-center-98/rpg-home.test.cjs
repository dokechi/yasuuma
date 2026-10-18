'use strict';
/* Dependency-free integration contracts: no browser, storage, or live API. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

function harness({active=true,withHub=true,withSourcing=true}={}){
 const registrations=[],listeners=new Map(),observers=[],timers=[],accountCalls=[];
 class Element{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.hidden=false;this._text='';this._classes=new Set();
   this.classList={add:(...v)=>v.forEach(x=>this._classes.add(x)),remove:(...v)=>v.forEach(x=>this._classes.delete(x)),contains:v=>this._classes.has(v),toggle:(v,force)=>{const add=force===undefined?!this._classes.has(v):force;if(add)this._classes.add(v);else this._classes.delete(v);return add;}};}
  set innerHTML(html){this.children=[];const stack=[this];for(const token of html.match(/<[^>]+>|[^<]+/g)||[]){if(token.startsWith('</')){stack.pop();continue;}if(token.startsWith('<')){const tag=token.match(/^<([a-z0-9-]+)/i)?.[1];if(!tag)continue;const node=new Element(tag);for(const attr of token.slice(tag.length+1,-1).matchAll(/([\w-]+)(?:="([^"]*)")?/g))node.setAttribute(attr[1],attr[2]??'');stack.at(-1).append(node);if(!['br','img','hr','input'].includes(tag))stack.push(node);}else{const node=new Element('text');node.textContent=token;stack.at(-1).append(node);}}}
  hasAttribute(k){return k in this.attributes;}
  get className(){return [...this._classes].join(' ')} set className(v){this._classes=new Set(v.split(/\s+/).filter(Boolean))}
  get textContent(){return this._text+this.children.map(n=>n.textContent).join(' ')} set textContent(v){this._text=String(v);this.children=[];}
  append(...nodes){for(const n of nodes){n.parentElement=this;this.children.push(n);}}
  replaceChildren(...nodes){this.children=[];this.append(...nodes);}
  showModal(){this.open=true;}
  close(){this.open=false;this.onclose?.();}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(n=>n!==this);}
  appendChild(n){this.append(n);return n;}
  prepend(...nodes){for(const n of nodes)n.parentElement=this;this.children.unshift(...nodes);}
  insertBefore(n,b){if(!b)return this.appendChild(n);n.parentElement=this;this.children.splice(this.children.indexOf(b),0,n);return n;}
  setAttribute(k,v){this.attributes[k]=String(v);if(k==='id')this.id=String(v);if(k==='class')this.className=String(v);if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(v);}
  getAttribute(k){return this.attributes[k]??null;}
  addEventListener(name,fn){(this.events??={})[name]=fn;}
  click(){const event={target:this,preventDefault(){},stopPropagation(){}};for(let n=this;n;n=n.parentElement){n.onclick?.(event);n.events?.click?.(event);}}
  focus(){doc.activeElement=this;}
  matches(selector){if(selector.startsWith('#'))return this.id===selector.slice(1);if(selector.startsWith('.'))return this.classList.contains(selector.slice(1));const data=selector.match(/^\[data-([\w-]+)(?:=["']?([^"'\]]+)["']?)?\]$/);if(data){const key=data[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase());return key in this.dataset&&(data[2]===undefined||this.dataset[key]===data[2]);}return this.tagName.toLowerCase()===selector;}
  querySelectorAll(selector){return this.children.flatMap(n=>[...(n.matches(selector)?[n]:[]),...n.querySelectorAll(selector)]);}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  closest(selector){return this.matches(selector)?this:this.parentElement?.closest(selector)||null;}
 }
 const doc={documentElement:new Element('html'),body:new Element('body'),head:new Element('head'),createElement:t=>new Element(t),getElementById:id=>doc.documentElement.querySelector('#'+id),querySelector:s=>doc.documentElement.querySelector(s),querySelectorAll:s=>doc.documentElement.querySelectorAll(s),addEventListener:(name,fn,capture=false)=>{registrations.push({name,fn,capture});const items=listeners.get(name)||[];items.push(fn);listeners.set(name,items);},dispatchEvent:event=>{for(const fn of listeners.get(event.type)||[])fn(event);}};
 doc.documentElement.append(doc.head,doc.body);
 const main=new Element();main.id='mainWindow';const home=new Element();home.id='commandHome';const preserved=new Element();preserved.id='legacy-content';home.append(preserved);main.append(home);doc.body.append(main);
 let sourcingClicks=0;if(withSourcing){const source=new Element('button');source.dataset.homeAction='sourcing-queue';source.onclick=()=>{sourcingClicks++;root.CCHome.active=false;};home.append(source);}
 const root={document:doc,CCHome:{active,loading:false,errors:{}},scrollTo(){},requestAnimationFrame:fn=>fn(),setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;},clearTimeout(){},fetch:()=>assert.fail('RPG home must not make new requests'),MutationObserver:class{constructor(fn){this.fn=fn;observers.push(this)}observe(target,options){this.target=target;this.options=options;}}};
 root.CCHome.show=()=>{root.CCHome.active=true;};
 if(withHub)root.CCManualOperationHub={openAccount:key=>{accountCalls.push(key);return true;}};
 root.window=root;root.console=console;const context=vm.createContext(root);
 const source=fs.readFileSync(path.join(__dirname,'rpg-home.js'),'utf8');vm.runInContext(source,context);
 return {root,doc,main,home,preserved,registrations,accountCalls,observers,timers,get sourcingClicks(){return sourcingClicks;},rerun:()=>vm.runInContext(source,context)};
}

test('mount is idempotent and keeps every original HOME node',()=>{
 const h=harness(),page=h.doc.getElementById('ccRpgHome'),back=h.doc.getElementById('ccRpgLegacyReturn');
 assert.ok(page);assert.equal(page.parentElement,h.doc.body);assert.equal(page.hidden,false);
 assert.equal(h.home.children[0],back);assert.ok(h.home.children.includes(h.preserved));assert.equal(h.main.parentElement,h.doc.body);
 assert.equal(h.doc.body.classList.contains('rpg-home-active'),true);
 h.rerun();h.root.CCRpgHome.sync();assert.equal(h.doc.querySelectorAll('#ccRpgHome').length,1);assert.equal(h.doc.querySelectorAll('#ccRpgLegacyReturn').length,1);assert.equal(h.observers.length,1);
});
test('missing dependencies keep the original HOME usable without adding an overlay',()=>{
 for(const options of [{withHub:false},{withSourcing:false}]){const h=harness(options);assert.equal(h.root.CCRpgHome,undefined);assert.equal(h.doc.getElementById('ccRpgHome'),null);assert.equal(h.doc.body.classList.contains('rpg-home-active'),false);assert.ok(h.home.children.includes(h.preserved));}
});
test('Threads account entrances preserve exact account routing and reject unknown keys',()=>{
 const h=harness(),page=h.doc.getElementById('ccRpgHome'),buttons=page.querySelectorAll('[data-rpg-account]');
 assert.deepEqual(buttons.map(n=>n.dataset.rpgAccount),['kyun','choi']);
 for(const b of buttons){assert.equal(b.tagName,'BUTTON');b.querySelector('.rpg-name').click();}
 assert.deepEqual(h.accountCalls,['kyun','choi']);assert.equal(h.root.CCRpgHome.openAccount('other'),false);assert.equal(h.accountCalls.length,2);
 assert.equal(page.querySelectorAll('[data-rpg-fp]').length,1);
});
test('sourcing delegates to the existing route and leaves the RPG overlay',()=>{
 const h=harness();h.doc.querySelector('[data-rpg-sourcing]').click();assert.equal(h.sourcingClicks,1);assert.equal(h.root.CCHome.active,false);assert.equal(h.doc.getElementById('ccRpgHome').hidden,true);assert.equal(h.doc.body.classList.contains('rpg-home-active'),false);
});
test('all-tools and return controls preserve legacy mode until HOME is left',()=>{
 const h=harness(),api=h.root.CCRpgHome,page=h.doc.getElementById('ccRpgHome'),back=h.doc.getElementById('ccRpgLegacyReturn');
 h.doc.querySelector('[data-rpg-tools]').click();assert.equal(page.hidden,true);assert.equal(back.hidden,false);assert.equal(h.doc.activeElement,back);assert.equal(h.doc.body.classList.contains('rpg-home-active'),false);
 h.doc.dispatchEvent({type:'cc:home-render'});assert.equal(page.hidden,true);
 back.click();assert.equal(page.hidden,false);assert.equal(back.hidden,true);assert.equal(h.doc.activeElement,page.querySelector('h1'));
 api.showLegacy();h.root.CCHome.active=false;h.observers[0].fn();assert.equal(back.hidden,true);
 h.root.CCHome.active=true;h.doc.dispatchEvent({type:'cc:home-render'});assert.equal(page.hidden,false);
});
test('non-HOME boot remains hidden; showRpg uses the existing HOME entry',()=>{
 const h=harness({active:false});assert.equal(h.doc.getElementById('ccRpgHome').hidden,true);assert.equal(h.doc.body.classList.contains('rpg-home-active'),false);
 h.root.CCRpgHome.showRpg();assert.equal(h.root.CCHome.active,true);assert.equal(h.doc.getElementById('ccRpgHome').hidden,false);
 assert.equal(h.observers[0].target,h.main);assert.equal(h.observers[0].options.attributes,true);assert.deepEqual(Array.from(h.observers[0].options.attributeFilter),['class']);
});
test('status reflects loading, partial error, loaded, and unknown state without new requests',()=>{
 const h=harness(),H=h.root.CCHome,status=h.doc.getElementById('ccRpgReadStatus');
 assert.equal(status.textContent,'情報の取得状況は未確認');
 H.loading=true;h.doc.dispatchEvent({type:'cc:home-render'});assert.equal(status.textContent,'情報を読み込み中');
 H.loading=false;H.loaded={active:true};H.errors={sourcing:true};h.root.CCRpgHome.sync();assert.equal(status.textContent,'一部の情報は更新未確認');
 H.errors={sourcing:false};h.root.CCRpgHome.sync();assert.equal(status.textContent,'保存原稿・候補を開けます');
});
test('refresh clicks the existing HOME refresh button without issuing its own request',()=>{
 const h=harness();let refreshes=0;const button=h.doc.createElement('button');button.id='refreshBtn';button.onclick=()=>refreshes++;h.main.append(button);
 h.doc.querySelector('[data-rpg-refresh]').click();assert.equal(refreshes,1);
});
test('the production manual-hub bridge opens only supported account reviews',()=>{
 const h=harness({withHub:false});
 const source=fs.readFileSync(path.join(__dirname,'manual-operation-hub.js'),'utf8');
 new Function('window',source)(h.root);
 assert.equal(typeof h.root.CCManualOperationHub.openAccount,'function');h.rerun();assert.ok(h.root.CCRpgHome);
 for(const [key,label] of [['kyun','キュン拾い'],['choi','ちょい上等'],['tiktok','TikTok @sucker0508']]){
  assert.equal(h.root.CCRpgHome.openAccount(key),true);const dialog=h.doc.querySelector('dialog');assert.ok(dialog.open);assert.equal(dialog.querySelector('h2').textContent,label);dialog.close();assert.equal(h.doc.querySelector('dialog'),null);
 }
 assert.equal(h.root.CCManualOperationHub.openAccount('sourcing'),false);assert.equal(h.root.CCManualOperationHub.openAccount('unknown'),false);assert.equal(h.doc.querySelector('dialog'),null);assert.ok(h.home.children.includes(h.preserved));
});
test('CSS only hides legacy navigation while RPG is active and all local artwork exists',()=>{
 const css=fs.readFileSync(path.join(__dirname,'rpg-home.css'),'utf8');
 assert.match(css,/body\.rpg-home-active #mainWindow,body\.rpg-home-active \.home-mobile-nav\{display:none!important\}/);
 assert.match(css,/#ccRpgHome\[hidden\],#ccRpgLegacyReturn\[hidden\]\{display:none!important\}/);
 for(const match of css.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)){
  assert.ok(match[1].startsWith('./assets/rpg-home/'));assert.ok(fs.statSync(path.join(__dirname,match[1].split('?')[0])).isFile(),match[1]);
 }
 assert.ok(fs.statSync(path.join(__dirname,'assets/rpg-home/OFL.txt')).isFile());
});
test('legacy keyboard shortcuts reveal HOME in capture phase without consuming the original event',()=>{
 const h=harness(),page=h.doc.getElementById('ccRpgHome');
 const registration=h.registrations.find(r=>r.name==='keydown');assert.ok(registration);assert.equal(registration.capture,true);
 let continued=0;h.doc.addEventListener('keydown',()=>{continued++;assert.equal(page.hidden,true);});
 for(const [key,altKey] of [['F1',false],['f',true],['V',true],['a',true],['j',true],['h',true]]){
  h.root.CCRpgHome.showRpg();
  h.doc.dispatchEvent({type:'keydown',key,altKey,target:h.doc.body,preventDefault:()=>assert.fail('Do not consume shortcut'),stopPropagation:()=>assert.fail('Do not stop shortcut'),stopImmediatePropagation:()=>assert.fail('Do not stop shortcut')});
  assert.equal(page.hidden,true);assert.equal(h.doc.body.classList.contains('rpg-home-active'),false);assert.equal(h.doc.getElementById('ccRpgLegacyReturn').hidden,false);
 }
 assert.equal(continued,6);
});
test('F5, other keys, and typing targets keep the RPG page visible',()=>{
 const h=harness(),page=h.doc.getElementById('ccRpgHome');
 for(const [key,altKey,target] of [['F5',false,h.doc.body],['f',false,h.doc.body],['z',true,h.doc.body],...['input','textarea','select'].flatMap(tag=>[['F1',false,h.doc.createElement(tag)],['f',true,h.doc.createElement(tag)]]),['F1',false,{isContentEditable:true,tagName:'SPAN'}],['h',true,{isContentEditable:true,tagName:'DIV'}]]){
  h.doc.dispatchEvent({type:'keydown',key,altKey,target});assert.equal(page.hidden,false);
 }
 h.root.CCHome.active=false;h.root.CCRpgHome.sync();h.doc.dispatchEvent({type:'keydown',key:'F1',target:h.doc.body});assert.equal(h.doc.getElementById('ccRpgLegacyReturn').hidden,true);
});
test('RPG stacking stays below retained legacy dialogs and toasts',()=>{
 const css=fs.readFileSync(path.join(__dirname,'rpg-home.css'),'utf8');
 const rule=css.match(/#ccRpgHome\{([^}]+)\}/)?.[1];assert.ok(rule);assert.match(rule,/(?:^|;)z-index:100(?:;|$)/);
});

test('approved homepage routes dispatch to existing workspace and external service bridges',()=>{
 const h=harness(),calls=[];h.root.CCRpgWorkspaces={openSettings:()=>calls.push('settings'),openFp:()=>calls.push('fp'),openSourcing:()=>calls.push('sourcing'),openWatches:()=>calls.push('watches'),openCards:()=>calls.push('cards'),openService:k=>calls.push(k)};const p=h.doc.getElementById('ccRpgHome');
 p.querySelector('[data-rpg-tools]').click();p.querySelector('[data-rpg-fp]').click();p.querySelectorAll('[data-rpg-route]').forEach(b=>b.click());p.querySelectorAll('[data-rpg-service]').forEach(b=>b.click());
 assert.deepEqual(calls,['settings','fp','sourcing','watches','cards','daily','cooney','shiire']);
});

test('HOME keeps approved dresses while detail pages use a distinct cached swimwear asset',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'app-assets.json'),'utf8'));
 const home=fs.readFileSync(path.join(__dirname,'rpg-home.css'),'utf8');
 assert.ok(home.includes('world.png?v=20261012.4-wardrobe'));
 assert.ok(!home.includes('detail-swimwear.png'));
 assert.ok(manifest.styles.includes('./rpg-home.css?v=20261018.36-shuffle'));
 const fontCss=fs.readFileSync(path.join(__dirname,'rpg-home.css'),'utf8');
 assert.match(fontCss,/DotGothic16-Regular\.woff2/);
 assert.match(fontCss,/DotGothic16-Regular\.ttf/);
 for(const file of ['rpg-account-pages.css','rpg-workspaces.css']){
  const css=fs.readFileSync(path.join(__dirname,file),'utf8');
  const references=[...css.matchAll(/detail-swimwear\.png\?([^'"\s)]+)/g)].map(m=>m[1]);
  assert.ok(references.length>0,file);
  assert.ok(references.every(v=>v==='v=20261012.5-detail-swimwear'),file);
  assert.ok(!css.includes('world.png'),file+' must not fall back to HOME dresses');
  assert.ok(manifest.styles.includes('./'+file+'?v='+'20261013.9-detail'),file);
 }
 const png=fs.readFileSync(path.join(__dirname,'assets/rpg-home/world.png'));
 const detail=fs.readFileSync(path.join(__dirname,'assets/rpg-home/detail-swimwear.png'));
 const hash=b=>require('node:crypto').createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
 assert.equal(hash(png),'b0b9dff9109f3a03af7e0732bdf6c616cd52c723','approved HOME bytes must not change');
 assert.notEqual(hash(detail),hash(png),'detail clothing must differ from HOME');
 assert.equal(detail.readUInt32BE(16),png.readUInt32BE(16),'portrait crop width');
 assert.equal(detail.readUInt32BE(20),png.readUInt32BE(20),'portrait crop height');
});
