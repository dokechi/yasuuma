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
function setup(t,{workbench=false,stored={},initialState=null,receive=true,embedded=false}={}){
 const dom=new JSDOM(html,{url:'https://history.invalid/command-center-98/lounge/index.html',runScripts:'outside-only'}),win=dom.window,doc=win.document,$=id=>doc.getElementById(id);
 const messages=[],parent={postMessage(message,origin){messages.push({message,origin});}};if(embedded)Object.defineProperty(win,'parent',{value:parent});
 doc.body.classList.toggle('storybook-workbench',workbench);for(const [key,value]of Object.entries(stored))win.localStorage.setItem('castle-production.v1.'+key,JSON.stringify(value));
 const writes=[],setItem=win.Storage.prototype.setItem;win.Storage.prototype.setItem=function(key,value){writes.push(key);return setItem.call(this,key,value);};
 const initialFocus=doc.createElement('button');initialFocus.textContent='initial outside focus';doc.body.append(initialFocus);initialFocus.focus();
 const descriptors=new Map();for(const [key,value]of Object.entries({window:win,document:doc,location:win.location,navigator:win.navigator})){descriptors.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});}
 win.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
 win.HTMLDialogElement.prototype.showModal=function(){this.open=true;};win.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new win.Event('close'));};
 win.HTMLElement.prototype.scrollIntoView=()=>{};Object.defineProperty($('desk-scroll'),'clientHeight',{value:300});
 const copies=[],errors=[],frames=[],timers=new Map(),pending=[],entries=[initialState];let index=0,serial=0,pushes=0,replaces=0;
 Object.defineProperty(win.navigator,'clipboard',{value:{writeText:async text=>copies.push(text)},configurable:true});
 win.fetch=()=>{throw Error('History cannot request data');};win.addEventListener('error',event=>{errors.push(event.error);event.preventDefault();});
 const history={get state(){return entries[index];},get length(){return entries.length;},pushState(state){entries.splice(++index,entries.length,state);pushes++;},replaceState(state){entries[index]=state;replaces++;},back(){pending.push(-1);},forward(){pending.push(1);}};
 Object.defineProperty(win,'history',{value:history});win.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};win.setTimeout=fn=>{timers.set(++serial,fn);return serial;};win.clearTimeout=id=>timers.delete(id);
 win.createDesk=createDesk;win.createEntrySound=()=>({cancel(){},begin(){},arrive(){}});win.createInteractionSound=()=>({cancel(){},play(){}});win.createMusicControls=()=>({refresh(){}});win.createInteractionFeedback=()=>({clear(){}});
 const script=source.replace(/^import .*;\n/gm,'').replace(/^export /gm,'')+'\nwindow.__historyQA={desk:()=>desk,phase:()=>phase,openSupplementaryReader,openWorkingChapter,startWorkingChapter,resolveWorkingChapter};';
 win.eval(script);const desk=win.__historyQA.desk();
 const rows=['insurance','otoku','rakuten','lottery','fp'].flatMap(key=>['a','b'].map((letter,i)=>({id:key+'-'+letter,place:key==='insurance'?'kyun':key,title:key+' 原稿 '+letter,body:key+' exact body '+letter,kind:'本文',source:{id:key+'-'+letter,account:key==='fp'?'tiktok':key},createdAt:1,updatedAt:2-i})));
 const original=JSON.stringify(rows);if(receive)desk.receive({drafts:rows,complete:true,loading:false,message:'合成の保存原稿'});
 const travel=async()=>{assert.ok(pending.length,'a browser traversal was actually requested');index=Math.max(0,Math.min(entries.length-1,index+pending.shift()));win.dispatchEvent(new win.PopStateEvent('popstate',{state:history.state}));await flush();};
 const frame=async()=>{const callbacks=frames.splice(0);for(const fn of callbacks)fn(0);await flush();};
 const state=async value=>{history.replaceState(value);win.dispatchEvent(new win.PopStateEvent('popstate',{state:value}));await flush();};
 const open=async(key,id)=>{desk.accountBoard.open(key,id);await flush();};
 const back=async()=>{history.back();await travel();};const forward=async()=>{history.forward();await travel();};
 const query=async value=>{$('desk-query').value=value;$('desk-query').dispatchEvent(new win.Event('input',{bubbles:true}));await flush();};
 const unchanged=()=>{assert.equal(JSON.stringify(rows),original);assert.deepEqual(errors,[]);};
 t.after(()=>{win.dispatchEvent(new win.PageTransitionEvent('pagehide'));dom.window.close();for(const [key,descriptor]of descriptors){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
 return {win,doc,$,desk,history,rows,copies,errors,writes,messages,parent,initialFocus,api:win.__historyQA,frames,timers,pending,entries,open,back,forward,travel,frame,state,query,unchanged,get pushes(){return pushes;},get replaces(){return replaces;}};
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

const cachedDraft=(key,id='b')=>({id:key+'-'+id,place:key==='insurance'?'kyun':key,title:key+' 原稿 '+id,body:key+' exact body '+id,kind:'本文',source:{id:key+'-'+id,account:key},createdAt:1,updatedAt:1});
const semanticWrites=h=>h.writes.filter(key=>key.startsWith('castle-production.v1.')&&!key.startsWith('castle-production.v1.source:'));
test('work-first startup shows the original insurance paper passively without marks, focus, visit or a history push',async t=>{
 const h=setup(t,{workbench:true});await flush();
 assert.equal(h.$('room').dataset.account,'insurance');assert.equal(h.$('draft-body').textContent,'insurance exact body a');assert.equal(h.$('app').hasAttribute('inert'),false);assert.equal(h.desk.accountBoard.state.visitVersion,0);
 assert.equal(h.history.length,1);assert.equal(h.pushes,0);assert.equal(h.history.state.shireitoInitial,true);assert.equal(h.doc.activeElement,h.initialFocus);assert.equal(h.$('announcer').textContent,'');
 assert.deepEqual(semanticWrites(h),[]);assert.deepEqual(h.desk.notebook.pref('seenRevisions',{}),{});assert.equal(h.desk.notebook.usedToday('kyun'),false);assert.equal(h.desk.notebook.copies().length,0);assert.equal(h.desk.notebook.completed('kyun').length,0);
 assert.equal(h.api.startWorkingChapter(),false);assert.equal(h.api.openWorkingChapter('lottery',{initial:true}),false);assert.equal(h.$('room').dataset.account,'insurance');h.unchanged();
});
test('work-first resume keeps saved same-account ID, query, filter and scroll without rewriting reading preferences',async t=>{
 const stored={'source:lottery-b':cachedDraft('lottery'),'pref:lastWork':{place:'lottery',id:'lottery-b'},'selected:lottery':'lottery-b','read:lottery-b':137,'pin:lottery-b':true,'pref:view:lottery':{query:'原稿 b',filter:'pin'}};
 const h=setup(t,{workbench:true,stored});await flush();assert.equal(h.$('room').dataset.account,'lottery');assert.equal(h.$('draft-body').textContent,'lottery exact body b');assert.equal(h.$('desk-query').value,'原稿 b');assert.equal(h.doc.querySelector('[data-desk-filter=pin]').getAttribute('aria-pressed'),'true');assert.equal(h.$('desk-scroll').scrollTop,137);assert.equal(h.history.state.shireitoDraft,'lottery-b');assert.deepEqual(semanticWrites(h),[]);h.unchanged();
});
test('valid account/draft deep-link history wins over last work and keeps unrelated entry metadata',async t=>{
 const h=setup(t,{workbench:true,initialState:{shireitoRoom:'purple',shireitoAccount:'rakuten',shireitoDraft:'rakuten-b',keep:'entry-metadata'},stored:{'pref:lastWork':{place:'lottery',id:'lottery-b'}}});await flush();
 assert.equal(h.$('room').dataset.account,'rakuten');assert.equal(h.$('draft-body').textContent,'rakuten exact body b');assert.equal(h.history.state.keep,'entry-metadata');assert.equal(h.history.state.shireitoDraft,'rakuten-b');assert.equal(h.pushes,0);assert.deepEqual(semanticWrites(h),[]);h.unchanged();
});
test('late initial records may resolve an exact saved ID but cannot reselect after explicit manuscript or chapter intent',async t=>{
 const h=setup(t,{workbench:true,receive:false,stored:{'pref:lastWork':{place:'otoku',id:'otoku-b'}}});assert.equal(h.$('room').dataset.account,'otoku');assert.equal(h.$('desk-article').hidden,true);
 h.desk.receive({drafts:h.rows.filter(d=>d.id==='otoku-a'),complete:false});await flush();assert.equal(h.$('draft-body').textContent,'otoku exact body a');assert.deepEqual(semanticWrites(h),[]);
 h.$('desk-list').querySelector('[data-draft-id="otoku-a"]').click();await flush();h.desk.receive({drafts:h.rows,complete:true});await flush();assert.equal(h.$('draft-body').textContent,'otoku exact body a');
 assert.equal(h.api.openWorkingChapter('rakuten',{draftId:'rakuten-b'}),true);await flush();h.desk.receive({drafts:h.rows,complete:true});await flush();assert.equal(h.$('room').dataset.account,'rakuten');assert.equal(h.$('draft-body').textContent,'rakuten exact body b');h.unchanged();
});
test('explicit copy and favorite actions keep original semantics after a passive first page',async t=>{
 const h=setup(t,{workbench:true});await flush();assert.deepEqual(semanticWrites(h),[]);
 h.$('desk-copy').click();await flush();assert.deepEqual(h.copies,['insurance exact body a']);assert.equal(h.desk.notebook.copies().length,1);assert.equal(h.desk.notebook.usedToday('kyun'),true);assert.ok(h.desk.notebook.pref('seenRevisions',{})['insurance-a']);
 h.$('desk-pin').click();assert.equal(h.desk.notebook.flag('pin','insurance-a'),true);assert.equal(h.desk.notebook.completed('kyun').length,0);h.unchanged();
});
test('same active chapter is a strict no-op and never applies a pending changed current manuscript',async t=>{
 const h=setup(t,{workbench:true});await flush();const body=h.$('draft-body'),old=body.textContent,version=h.desk.accountBoard.state.visitVersion;
 h.desk.receive({drafts:h.rows.map(d=>d.id==='insurance-a'?{...d,body:'new held body'}:d),complete:true});await flush();assert.equal(h.$('desk-pending').hidden,false);
 assert.equal(h.api.openWorkingChapter('insurance'),true);assert.equal(h.api.openWorkingChapter('insurance',{draftId:'insurance-a'}),true);await flush();
 assert.equal(h.$('draft-body'),body);assert.equal(body.textContent,old);assert.equal(h.$('desk-pending').hidden,false);assert.equal(h.desk.accountBoard.state.visitVersion,version);assert.deepEqual(semanticWrites(h),[]);h.unchanged();
});
test('work-first direct chapter switching is immediate and browser Back/Forward restores exact identities without another push',async t=>{
 const h=setup(t,{workbench:true});await flush();assert.equal(h.api.openWorkingChapter('lottery',{draftId:'lottery-b'}),true);assert.equal(h.$('room').dataset.account,'lottery');assert.equal(h.pending.length,0);await flush();assert.equal(h.history.length,2);
 const pushes=h.pushes;await h.back();assert.equal(h.$('room').dataset.account,'insurance');await h.forward();assert.equal(h.$('room').dataset.account,'lottery');assert.equal(h.$('draft-body').textContent,'lottery exact body b');assert.equal(h.pushes,pushes);assert.equal(h.api.startWorkingChapter(),false);h.unchanged();
});
test('initial in-app Back shows overview synchronously, and no later record or repeated start returns to work',async t=>{
 const h=setup(t,{workbench:true});await flush();h.$('back').click();await flush();assert.equal(h.pending.length,0);assert.equal(h.$('room').hidden,true);assert.equal(h.desk.accountBoard.element.hidden,false);assert.equal(h.history.state,null);assert.equal(h.history.length,1);
 assert.equal(h.api.startWorkingChapter(),false);h.desk.receive({drafts:h.rows,complete:true});await flush();assert.equal(h.$('room').hidden,true);assert.deepEqual(semanticWrites(h),[]);h.unchanged();
});
test('invalid or archived default preferences never open a foreign identity; a missing saved ID stays within its account',async t=>{
 const h=setup(t,{workbench:true,stored:{'pref:lastWork':{place:'fp',id:'fp-b'},lastPlace:'choi'}});await flush();assert.equal(h.$('room').dataset.account,'insurance');
 assert.equal(h.api.openWorkingChapter('planned-5'),false);assert.equal(h.api.openWorkingChapter('fp'),false);assert.equal(h.api.openWorkingChapter('lottery',{draftId:'insurance-a'}),true);await flush();assert.equal(h.$('room').dataset.account,'lottery');assert.equal(h.$('draft-body').textContent,'lottery exact body a');h.unchanged();
});

test('all workbench in-app returns are synchronous overview changes, while replay and later explicit routes add no Back loop',async t=>{
 const h=setup(t,{workbench:true});await flush();h.api.openWorkingChapter('lottery',{draftId:'lottery-b'});await flush();const length=h.history.length;
 h.$('again').click();assert.equal(h.pending.length,0);await h.frame();assert.equal(h.$('room').dataset.account,'lottery');assert.equal(h.history.length,length);assert.equal(h.history.state.shireitoDraft,'lottery-b');
 h.$('back').click();await flush();assert.equal(h.pending.length,0);assert.equal(h.$('room').hidden,true);assert.equal(h.history.state,null);
 h.api.openWorkingChapter('rakuten');assert.equal(h.$('room').dataset.account,'rakuten');assert.equal(h.pending.length,0);assert.equal(h.api.startWorkingChapter(),false);h.unchanged();
});
test('existing shelf/account callbacks switch immediately under work-first and newer intent wins over a cancelled entrance',async t=>{
 const h=setup(t,{workbench:true});await flush();await h.open('otoku','otoku-b');assert.equal(h.pending.length,0);assert.equal(h.$('room').dataset.account,'otoku');
 h.$('back').click();h.$('reduce-setting').checked=false;h.$('reduce-setting').dispatchEvent(new h.win.Event('change'));h.doc.querySelector('.place-label[data-room="red"]').click();const late=[...h.timers.values()][0];
 h.api.openWorkingChapter('rakuten',{draftId:'rakuten-b'});const pushes=h.pushes;late();await flush();assert.equal(h.$('room').dataset.account,'rakuten');assert.equal(h.$('draft-body').textContent,'rakuten exact body b');assert.equal(h.pushes,pushes);assert.equal(h.api.startWorkingChapter(),false);h.unchanged();
});
test('a valid supplementary FP history intent survives passive startup without becoming a default publishing account',async t=>{
 const h=setup(t,{workbench:true,initialState:{shireitoRoom:'silver',shireitoAccount:'fp',shireitoDraft:'fp-b'}});await flush();
 assert.equal(h.$('room').dataset.account,'fp');assert.equal(h.$('draft-body').textContent,'fp exact body b');assert.equal(h.history.state.shireitoDraft,'fp-b');assert.equal(h.api.resolveWorkingChapter().key,'fp');assert.equal(h.api.openWorkingChapter('fp'),false);assert.equal(h.pushes,0);assert.deepEqual(semanticWrites(h),[]);h.unchanged();
});

test('remembered native sourcing starts via the existing trusted bridge without passive notes, focus or repeated routing',async t=>{
 const h=setup(t,{workbench:true,embedded:true,stored:{'pref:lastWork':{place:'shiire',native:'sourcing',title:'仕入れ帳'}}});await flush();
 assert.equal(h.$('room').dataset.account,'sourcing');assert.deepEqual(h.messages.filter(x=>x.message.type==='native').map(x=>JSON.parse(JSON.stringify(x.message))),[{channel:'cc-castle-v1',type:'native',action:'sourcing'}]);assert.ok(h.messages.every(x=>x.origin===h.win.location.origin));
 assert.deepEqual(semanticWrites(h),[]);assert.equal(h.doc.activeElement,h.initialFocus);assert.equal(h.pushes,0);h.desk.receive({drafts:h.rows,complete:true});await flush();assert.equal(h.messages.filter(x=>x.message.type==='native').length,1);assert.equal(h.api.startWorkingChapter(),false);h.unchanged();
});
test('only the actual trusted parent can select five working chapters; working intent before resume cancels native auto-return',async t=>{
 const h=setup(t,{workbench:true,embedded:true});await flush();h.api.openWorkingChapter('sourcing');assert.equal(h.$('room').dataset.account,'sourcing');
 const send=(key,{origin=h.win.location.origin,source=h.parent}={})=>h.win.dispatchEvent(new h.win.MessageEvent('message',{origin,source,data:{channel:'cc-castle-v1',type:'working-chapter',key}}));
 send('lottery',{origin:'https://foreign.invalid'});send('lottery',{source:{}});send('planned-5');send('fp');assert.equal(h.$('room').dataset.account,'sourcing');
 send('lottery');assert.equal(h.$('room').dataset.account,'lottery');h.win.dispatchEvent(new h.win.MessageEvent('message',{origin:h.win.location.origin,source:h.parent,data:{channel:'cc-castle-v1',type:'resume'}}));await flush();
 assert.equal(h.$('room').dataset.account,'lottery');assert.equal(h.pending.length,0);assert.equal(h.$('draft-body').textContent,'lottery exact body a');h.unchanged();
});
test('a complete empty remembered account stays visibly empty rather than routing to another account',async t=>{
 const h=setup(t,{workbench:true,receive:false,stored:{'pref:lastWork':{place:'rakuten',id:'deleted-rakuten'}}});h.desk.receive({drafts:h.rows.filter(d=>d.place!=='rakuten'),complete:true});await flush();
 assert.equal(h.$('room').dataset.account,'rakuten');assert.equal(h.$('desk-article').hidden,true);assert.equal(h.$('desk-empty').hidden,false);assert.equal(h.$('desk-copy').disabled,true);assert.deepEqual(semanticWrites(h),[]);assert.equal(h.pushes,0);h.unchanged();
});

test('passive restored scroll, native pause and pagehide save no semantic read state',async t=>{
 const h=setup(t,{workbench:true,embedded:true,stored:{'source:insurance-b':cachedDraft('insurance'),'pref:lastWork':{place:'kyun',id:'insurance-b'},'read:insurance-b':101}});await flush();
 h.$('desk-scroll').dispatchEvent(new h.win.Event('scroll'));for(const fn of [...h.timers.values()])fn();
 h.win.dispatchEvent(new h.win.MessageEvent('message',{origin:h.win.location.origin,source:h.parent,data:{channel:'cc-castle-v1',type:'pause'}}));
 h.win.dispatchEvent(new h.win.PageTransitionEvent('pagehide',{persisted:true}));await flush();assert.deepEqual(semanticWrites(h),[]);assert.equal(h.desk.notebook.position('insurance-b'),101);assert.equal(h.$('draft-body').textContent,'insurance exact body b');h.unchanged();
});
test('an editable owner initial-load callback does not turn passive text into a seen revision',async t=>{
 const h=setup(t,{workbench:true,receive:false});h.win.CCPostLearning={draftBinding:d=>d?.source?.account==='insurance'?{id:d.id}:null,mount(_host,_ref,options){options.onChange('existing saved edited body');options.onReady(true);return {text:()=> 'existing saved edited body',destroy(){},copy(){}};}};
 h.desk.receive({drafts:h.rows,complete:true});await flush();assert.deepEqual(semanticWrites(h),[]);assert.deepEqual(h.desk.notebook.pref('seenRevisions',{}),{});assert.equal(h.$('desk-copy').textContent,'最終稿をコピー');h.unchanged();
});

test('work-first Settings opens supplementary FP from the active page through the same owner and keeps browser history exact',async t=>{
 const h=setup(t,{workbench:true});await flush();assert.equal(h.$('room').dataset.account,'insurance');
 assert.equal(h.api.openSupplementaryReader('fp'),true);assert.equal(h.$('room').dataset.account,'fp');assert.equal(h.pending.length,0);await flush();assert.equal(h.$('draft-body').textContent,'fp exact body a');assert.equal(h.history.length,2);
 h.$('desk-list').querySelector('[data-draft-id="fp-b"]').click();await flush();const pushes=h.pushes;assert.equal(h.api.openSupplementaryReader('fp'),true);assert.equal(h.pushes,pushes);
 await h.back();assert.equal(h.$('room').dataset.account,'insurance');await h.forward();assert.equal(h.$('room').dataset.account,'fp');assert.equal(h.$('draft-body').textContent,'fp exact body b');assert.equal(h.pushes,pushes);
 h.$('back').click();assert.equal(h.pending.length,0);assert.equal(h.$('room').hidden,true);h.api.openWorkingChapter('lottery');assert.equal(h.$('room').dataset.account,'lottery');h.unchanged();
});

test('explicit detached tools apply-update acknowledges reading, but merely receiving that update stays passive',async t=>{
 const h=setup(t,{workbench:true});await flush();h.desk.receive({drafts:h.rows.map(d=>d.id==='insurance-a'?{...d,body:'explicitly adopted body'}:d),complete:true});await flush();assert.deepEqual(semanticWrites(h),[]);
 assert.equal(h.desk.living.applyPending(),true);await flush();assert.equal(h.$('draft-body').textContent,'explicitly adopted body');assert.ok(h.desk.notebook.pref('seenRevisions',{})['insurance-a']);assert.equal(h.desk.notebook.usedToday('kyun'),true);assert.equal(h.desk.notebook.copies().length,0);h.unchanged();
});
test('copying from an existing detached history dialog retains explicit copy and reading semantics',async t=>{
 const prior={id:'prior',draftId:'insurance-a',place:'kyun',title:'insurance 原稿 a',text:'insurance exact body a',kind:'body',time:1,source:{id:'insurance-a',account:'insurance'}};
 const h=setup(t,{workbench:true,stored:{'copy:prior':prior}});await flush();h.desk.living.history();assert.deepEqual(semanticWrites(h),[]);h.$('desk-history-list').querySelector('button').click();await flush();assert.deepEqual(h.copies,['insurance exact body a']);assert.equal(h.desk.notebook.copies().length,2);assert.ok(h.desk.notebook.pref('seenRevisions',{})['insurance-a']);assert.equal(h.desk.notebook.usedToday('kyun'),true);h.unchanged();
});
