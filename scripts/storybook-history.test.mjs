/* Real app/desk/account owners with synthetic DOM, source records and a deterministic
   browser-history clock. This does not claim native browser paint or traversal QA. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {createDesk} from '../command-center-98/lounge/desk.js';
const {JSDOM}=createRequire(import.meta.url)('jsdom');
const html=fs.readFileSync(new URL('../command-center-98/lounge/index.html',import.meta.url),'utf8');
const source=fs.readFileSync(new URL('../command-center-98/lounge/app.js',import.meta.url),'utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function setup(t){
 const dom=new JSDOM(html,{url:'https://history.invalid/command-center-98/lounge/index.html',runScripts:'outside-only'}),win=dom.window,doc=win.document,$=id=>doc.getElementById(id);
 const descriptors=new Map();for(const [key,value]of Object.entries({window:win,document:doc,location:win.location,navigator:win.navigator})){descriptors.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});}
 win.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
 win.HTMLDialogElement.prototype.showModal=function(){this.open=true;};win.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new win.Event('close'));};
 win.HTMLElement.prototype.scrollIntoView=()=>{};Object.defineProperty($('desk-scroll'),'clientHeight',{value:300});
 const copies=[],errors=[],frames=[],timers=new Map(),pending=[],entries=[null];let index=0,serial=0,pushes=0,replaces=0;
 Object.defineProperty(win.navigator,'clipboard',{value:{writeText:async text=>copies.push(text)},configurable:true});
 win.fetch=()=>{throw Error('History cannot request data');};win.addEventListener('error',event=>{errors.push(event.error);event.preventDefault();});
 const history={get state(){return entries[index];},get length(){return entries.length;},pushState(state){entries.splice(++index,entries.length,state);pushes++;},replaceState(state){entries[index]=state;replaces++;},back(){pending.push(-1);},forward(){pending.push(1);}};
 Object.defineProperty(win,'history',{value:history});win.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};win.setTimeout=fn=>{timers.set(++serial,fn);return serial;};win.clearTimeout=id=>timers.delete(id);
 win.createDesk=createDesk;win.createEntrySound=()=>({cancel(){},begin(){},arrive(){}});win.createInteractionSound=()=>({cancel(){},play(){}});win.createMusicControls=()=>({refresh(){}});win.createInteractionFeedback=()=>({clear(){}});
 const script=source.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')+'\nwindow.__historyQA={desk:()=>desk,phase:()=>phase,openSupplementaryReader};';
 win.eval(script);const desk=win.__historyQA.desk();
 const rows=['insurance','otoku','rakuten','lottery','fp'].flatMap(key=>['a','b'].map((letter,i)=>({id:key+'-'+letter,place:key==='insurance'?'kyun':key,title:key+' 原稿 '+letter,body:key+' exact body '+letter,kind:'本文',source:{id:key+'-'+letter,account:key==='fp'?'tiktok':key},createdAt:1,updatedAt:2-i})));
 const original=JSON.stringify(rows);desk.receive({drafts:rows,complete:true,loading:false,message:'合成の保存原稿'});
 const travel=async()=>{assert.ok(pending.length,'a browser traversal was actually requested');index=Math.max(0,Math.min(entries.length-1,index+pending.shift()));win.dispatchEvent(new win.PopStateEvent('popstate',{state:history.state}));await flush();};
 const frame=async()=>{const callbacks=frames.splice(0);for(const fn of callbacks)fn(0);await flush();};
 const state=async value=>{history.replaceState(value);win.dispatchEvent(new win.PopStateEvent('popstate',{state:value}));await flush();};
 const open=async(key,id)=>{desk.accountBoard.open(key,id);await flush();};
 const back=async()=>{history.back();await travel();};const forward=async()=>{history.forward();await travel();};
 const query=async value=>{$('desk-query').value=value;$('desk-query').dispatchEvent(new win.Event('input',{bubbles:true}));await flush();};
 const unchanged=()=>{assert.equal(JSON.stringify(rows),original);assert.deepEqual(errors,[]);};
 t.after(()=>{win.dispatchEvent(new win.PageTransitionEvent('pagehide'));dom.window.close();for(const [key,descriptor]of descriptors){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
 return {win,doc,$,desk,history,rows,copies,errors,frames,timers,pending,entries,open,back,forward,travel,frame,state,query,unchanged,get pushes(){return pushes;},get replaces(){return replaces;}};
}

test('Back then Forward restores exact purple account, selected draft, search, scroll and active reader without another push',async t=>{
 const h=setup(t);await h.open('lottery','lottery-b');await h.query('原稿 b');h.$('desk-scroll').scrollTop=137;
 assert.equal(h.history.state.shireitoAccount,'lottery');assert.equal(h.history.state.shireitoDraft,'lottery-b');
 const pushes=h.pushes;await h.back();assert.equal(h.desk.accountBoard.element.hidden,false);assert.equal(h.$('app').hasAttribute('inert'),true);
 await h.forward();assert.equal(h.pushes,pushes);assert.equal(h.$('room').dataset.account,'lottery');assert.equal(h.$('draft-body').textContent,'lottery exact body b');
 assert.equal(h.$('desk-query').value,'原稿 b');assert.equal(h.$('desk-scroll').scrollTop,137);assert.equal(h.desk.accountBoard.element.hidden,true);assert.equal(h.$('app').hasAttribute('inert'),false);
 assert.match(h.$('desk-routes').textContent,/@chusen1101/);h.$('desk-copy').click();await flush();assert.deepEqual(h.copies,['lottery exact body b']);h.unchanged();
});

test('owner-selected manuscript updates the current history ID without adding navigation entries',async t=>{
 const h=setup(t);await h.open('rakuten');const pushes=h.pushes;
 h.$('desk-list').querySelector('[data-draft-id="rakuten-b"]').click();await flush();assert.equal(h.history.state.shireitoDraft,'rakuten-b');assert.equal(h.pushes,pushes);
 await h.back();await h.forward();assert.equal(h.$('draft-body').textContent,'rakuten exact body b');assert.equal(h.$('room').dataset.account,'rakuten');h.unchanged();
});

test('history resume retains owner pin filter, while an ordinary explicit list click still resets that filter',async t=>{
 const h=setup(t);await h.open('otoku','otoku-b');h.$('desk-pin').click();h.doc.querySelector('[data-desk-filter="pin"]').click();await flush();
 await h.back();await h.forward();assert.equal(h.doc.querySelector('[data-desk-filter="pin"]').getAttribute('aria-pressed'),'true');assert.equal(h.$('draft-body').textContent,'otoku exact body b');
 await h.back();await h.open('otoku','otoku-a');assert.equal(h.doc.querySelector('[data-desk-filter="all"]').getAttribute('aria-pressed'),'true');assert.equal(h.$('draft-body').textContent,'otoku exact body a');h.unchanged();
});

test('normal replay uses the current publishing account and preserves its owner view without duplicating an entry',async t=>{
 const h=setup(t);await h.open('rakuten','rakuten-b');await h.query('原稿 b');h.$('desk-scroll').scrollTop=91;
 h.$('again').click();assert.equal(h.pending.length,1);await h.travel();await h.frame();
 assert.equal(h.$('room').dataset.account,'rakuten');assert.equal(h.$('draft-body').textContent,'rakuten exact body b');assert.equal(h.$('desk-query').value,'原稿 b');assert.equal(h.$('desk-scroll').scrollTop,91);assert.equal(h.history.length,2);h.unchanged();
});

test('a newer direct room wins over an older queued context RAF',async t=>{
 const h=setup(t);await h.open('insurance');await h.open('lottery','lottery-b');assert.equal(h.pending.length,1);await h.travel();
 await h.open('rakuten','rakuten-b');await h.frame();assert.equal(h.$('room').dataset.account,'rakuten');assert.equal(h.$('draft-body').textContent,'rakuten exact body b');assert.equal(h.history.state.shireitoAccount,'rakuten');h.unchanged();
});

test('several queued account requests use the latest owner request and request history Back once',async t=>{
 const h=setup(t);await h.open('insurance');await h.open('otoku','otoku-b');await h.open('lottery','lottery-b');assert.equal(h.pending.length,1);
 await h.travel();await h.frame();assert.equal(h.$('room').dataset.account,'lottery');assert.equal(h.$('draft-body').textContent,'lottery exact body b');assert.equal(h.history.state.shireitoAccount,'lottery');assert.equal(h.desk.accountBoard.element.hidden,true);assert.equal(h.$('app').hasAttribute('inert'),false);h.unchanged();
});

test('legacy room-only entries use safe explicit defaults and FP keeps the same original reader owner',async t=>{
 const h=setup(t);await h.open('lottery');await h.state({shireitoRoom:'purple'});assert.equal(h.$('room').dataset.account,'otoku');assert.equal(h.$('draft-body').textContent,'otoku exact body a');assert.equal(h.desk.accountBoard.element.hidden,true);
 const pushes=h.pushes;await h.state({shireitoRoom:'silver'});assert.equal(h.$('room').dataset.account,'fp');assert.equal(h.$('draft-body').textContent,'fp exact body a');assert.equal(h.$('app').hasAttribute('inert'),false);assert.equal(h.pushes,pushes);h.unchanged();
});

test('malformed account/room pairs cannot enter a room, and cross-account draft IDs never bypass owner isolation',async t=>{
 const h=setup(t);await h.open('insurance');await h.state({shireitoRoom:'red',shireitoAccount:'lottery',shireitoDraft:'lottery-b'});assert.equal(h.$('room').hidden,true);assert.equal(h.desk.accountBoard.element.hidden,false);
 await h.state({shireitoRoom:'purple',shireitoAccount:'lottery',shireitoDraft:'rakuten-b'});assert.equal(h.$('room').dataset.account,'lottery');assert.equal(h.$('draft-body').textContent,'lottery exact body a');
 assert.deepEqual(Object.keys(h.history.state).sort(),['shireitoAccount','shireitoDraft','shireitoRoom']);assert.equal(h.history.state.shireitoDraft,'lottery-a');h.unchanged();
});

test('late entrance timer cannot paint or push over a newer room intent',async t=>{
 const h=setup(t);h.$('reduce-setting').checked=false;h.$('reduce-setting').dispatchEvent(new h.win.Event('change'));
 h.doc.querySelector('.place-label[data-room="red"]').click();const late=[...h.timers.values()][0];assert.equal(typeof late,'function');
 await h.open('lottery','lottery-b');const pushes=h.pushes;late();await flush();assert.equal(h.$('room').dataset.account,'lottery');assert.equal(h.$('draft-body').textContent,'lottery exact body b');assert.equal(h.pushes,pushes);h.unchanged();
});


test('a same-account history target keeps its own draft ID rather than the outgoing selected draft',async t=>{
 const h=setup(t);await h.open('lottery','lottery-b');const pushes=h.pushes;
 await h.state({shireitoRoom:'purple',shireitoAccount:'lottery',shireitoDraft:'lottery-a'});
 assert.equal(h.$('draft-body').textContent,'lottery exact body a');assert.equal(h.history.state.shireitoDraft,'lottery-a');assert.equal(h.pushes,pushes);h.unchanged();
});

test('a selected variant is recorded from the existing live card and survives browser traversal',async t=>{
 const h=setup(t),variants=h.rows.map(row=>row.id.startsWith('rakuten-')?{...row,kind:row.id.endsWith('b')?'B案':'本文',source:{...row.source,id:'rakuten-group'}}:row);
 h.desk.receive({drafts:variants,complete:true,loading:false});await h.open('rakuten');
 [...h.$('desk-variants').querySelectorAll('button')].find(node=>node.textContent==='B案').click();await flush();
 assert.equal(h.history.state.shireitoDraft,'rakuten-b');await h.back();await h.forward();
 assert.equal(h.$('draft-body').textContent,'rakuten exact body b');assert.equal(h.$('desk-variants').querySelector('[aria-pressed="true"]').textContent,'B案');h.unchanged();
});

test('FP as the first Settings destination returns to the bright board and reopens its exact saved draft',async t=>{
 const h=setup(t);assert.equal(h.win.__historyQA.openSupplementaryReader('fp'),true);await flush();
 h.$('desk-list').querySelector('[data-draft-id="fp-b"]').click();await flush();h.$('desk-scroll').scrollTop=83;
 assert.equal(h.history.state.shireitoDraft,'fp-b');h.$('back').click();await h.travel();assert.equal(h.desk.accountBoard.element.hidden,false);assert.equal(h.$('room').hidden,true);
 const pushes=h.pushes;await h.forward();assert.equal(h.$('room').dataset.account,'fp');assert.equal(h.$('draft-body').textContent,'fp exact body b');assert.equal(h.$('desk-scroll').scrollTop,83);assert.equal(h.$('app').hasAttribute('inert'),false);assert.equal(h.pushes,pushes);h.unchanged();
});

test('malformed history primitive fields fail closed and BFCache pagehide keeps the selection observer active',async t=>{
 const h=setup(t);await h.open('insurance');await h.state({shireitoRoom:'purple',shireitoAccount:{toString:null}});assert.equal(h.$('room').hidden,true);
 await h.open('rakuten');h.win.dispatchEvent(new h.win.PageTransitionEvent('pagehide',{persisted:true}));
 h.$('desk-list').querySelector('[data-draft-id="rakuten-b"]').click();await flush();assert.equal(h.history.state.shireitoDraft,'rakuten-b');h.unchanged();
});


test('an explicit older FP history ID restores that validated source rather than the latest FP selection',async t=>{
 const h=setup(t);h.win.__historyQA.openSupplementaryReader('fp');await flush();
 h.$('desk-list').querySelector('[data-draft-id="fp-b"]').click();await flush();
 const pushes=h.pushes;await h.state({shireitoRoom:'silver',shireitoAccount:'fp',shireitoDraft:'fp-a'});
 assert.equal(h.$('draft-body').textContent,'fp exact body a');assert.equal(h.history.state.shireitoDraft,'fp-a');assert.equal(h.pushes,pushes);
 await h.state({shireitoRoom:'silver',shireitoAccount:'fp',shireitoDraft:'lottery-b'});
 assert.equal(h.$('draft-body').textContent,'fp exact body a','FP resume cannot select a publishing source');h.unchanged();
});
