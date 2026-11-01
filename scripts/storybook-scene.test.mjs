/* Presentation contracts on an actual DOM with a synchronous account-owner
   fixture. Native focus traps, geometry and image paint belong to Chrome QA. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mountStorybook,storyChapters} from '../command-center-98/lounge/storybook-scene.js';
import {publishingAccounts} from '../command-center-98/lounge/accounts.js';
const {JSDOM}=createRequire(import.meta.url)('jsdom');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const keys=['insurance','otoku','rakuten','lottery','sourcing'];

function setup(t,{delayedBack=false,...options}={}) {
 const dom=new JSDOM('<!doctype html><body><button id="back">戻る</button><button id="town-search">検索</button><button id="town-later">あとで</button><button id="settings-open">設定</button><section class="account-board" data-view="tiles"><button class="board-primary">原稿一覧</button><button class="board-refresh">更新</button></section><article id="original-reader"><h2>既存の原稿</h2><p>保存された本文を変更しません。</p></article></body>',{url:'https://storybook.invalid/lounge/',pretendToBeVisual:true});
 const win=dom.window,doc=win.document,host=doc.querySelector('.account-board'),subscribers=new Set(),instances=[];
 const calls={routes:[],travel:[],cancel:0,back:0,refresh:0,list:0,search:0,later:0,settings:0,fetch:0,storage:0};
 const destinations=Object.freeze([...publishingAccounts,{key:'sourcing',place:'shiire',name:'仕入れ',tone:'green'},{key:'reserve',name:'予備の持ち場',pending:true}].map(account=>Object.freeze({...account,status:account.pending?'未設定':account.key==='sourcing'?'管理画面へ':'原稿を確認'})));
 const before=doc.querySelector('#original-reader').outerHTML,records=JSON.stringify(destinations);
 let state={destinations,message:'保存原稿の読取状況は未確認です。',loading:false,complete:false,lastVisited:null,visitVersion:0};
 const emit=patch=>{state={...state,...patch};for(const listener of subscribers)listener(state);};
 const show=()=>{host.hidden=false;host.querySelector('.board-primary').focus();};
 const board={element:host,get state(){return state;},subscribe(fn){subscribers.add(fn);fn(state);return()=>subscribers.delete(fn);},open(key){const account=destinations.find(value=>value.key===key);if(!account||account.pending)return;calls.routes.push(key);emit({lastVisited:key,visitVersion:state.visitVersion+1});host.hidden=true;}};
 host.querySelector('.board-primary').addEventListener('click',()=>{calls.list++;host.dataset.view=host.dataset.view==='list'?'tiles':'list';});
 host.querySelector('.board-refresh').addEventListener('click',()=>calls.refresh++);
 doc.getElementById('back').addEventListener('click',()=>{calls.back++;if(!delayedBack)show();});
 for(const [id,key]of [['town-search','search'],['town-later','later'],['settings-open','settings']])doc.getElementById(id).addEventListener('click',()=>calls[key]++);
 win.fetch=()=>{calls.fetch++;throw Error('Unexpected transport');};
 win.Storage.prototype.setItem=function(){calls.storage++;throw Error('Unexpected persistence');};
 const mount=extra=>{const instance=mountStorybook({document:doc,board,onTravel:value=>calls.travel.push(value),onCancel:()=>calls.cancel++,...options,...extra});instances.push(instance);return instance;};
 const scene=mount();
 t.after(()=>{for(const value of instances)value.destroy();win.close();});
 return {win,doc,host,board,scene,calls,subscribers,emit,show,mount,$:selector=>doc.querySelector(selector),unchanged(){assert.equal(doc.querySelector('#original-reader').outerHTML,before);assert.equal(JSON.stringify(destinations),records);assert.equal(calls.fetch,0);assert.equal(calls.storage,0);}};
}

test('five active chapters and three sealed slots preserve all eight canonical identities including @chusen1101',t=>{
 const h=setup(t);
 assert.deepEqual(storyChapters.map(chapter=>chapter.key),keys);
 const slots=[...h.doc.querySelectorAll('[data-story-destination]')];
 assert.equal(slots.length,8);assert.equal(slots.filter(button=>button.disabled).length,3);
 assert.deepEqual(slots.map(button=>button.dataset.storyDestination),[...keys,'planned-5','planned-6','reserve']);
 for(const account of publishingAccounts.filter(account=>!account.pending)) {
  h.scene.select(account.key);
  assert.match(h.$('.story-account-identity').textContent,new RegExp(account.handle));
  assert.ok(h.$('.story-account-identity').textContent.includes(account.name));
  assert.ok(h.$('[data-story-instant="'+account.key+'"]').getAttribute('aria-label').includes(account.name));
 }
 h.scene.select('lottery');assert.match(h.$('.story-account-identity').textContent,/@chusen1101/);
 const preparing=h.$('.story-preparing');assert.equal(preparing.open,false);preparing.querySelector('summary').click();assert.equal(preparing.open,true);
 const pending=[...preparing.querySelectorAll('[data-story-destination]')];assert.deepEqual(pending.map(node=>node.getAttribute('aria-label')),['追加アカウント5、未設定','追加アカウント6、未設定','予備、未設定']);
 for(const node of pending){assert.equal(node.disabled,true);node.click();}assert.equal(h.scene.snapshot().selected,'lottery');
 preparing.querySelector('summary').click();assert.equal(preparing.open,false);
 assert.deepEqual(h.calls.routes,[]);h.unchanged();
});

test('chapter selection is not navigation; actual scene and instant buttons delegate once to the existing owner',async t=>{
 const h=setup(t);h.$('[data-story-chapter=otoku]').click();
 assert.equal(h.scene.snapshot().selected,'otoku');assert.deepEqual(h.calls.routes,[]);assert.equal(h.calls.travel.length,0);
 const sceneButton=h.$('.story-open-scene');sceneButton.focus();sceneButton.click();
 assert.deepEqual(h.calls.routes,['otoku']);assert.equal(h.host.hidden,true);assert.equal(h.calls.travel.length,1);assert.equal(h.calls.travel[0].room,'otoku');assert.equal(h.calls.travel[0].instant,false);
 await flush();h.show();await flush();assert.equal(h.doc.activeElement,sceneButton);
 const quick=h.$('[data-story-instant=lottery]');quick.focus();quick.click();
 assert.deepEqual(h.calls.routes,['otoku','lottery']);assert.equal(h.calls.travel.at(-1).instant,true);
 await flush();h.show();await flush();assert.equal(h.doc.activeElement,quick);h.unchanged();
});

test('invalid and sealed destinations never route or cancel an otherwise valid selection',t=>{
 const h=setup(t);h.scene.select('rakuten');const cancel=h.calls.cancel;
 for(const key of ['missing','planned-5','planned-6','reserve'])assert.equal(h.scene.open(key),false);
 assert.equal(h.scene.select('missing'),false);assert.equal(h.scene.snapshot().selected,'rakuten');assert.equal(h.calls.cancel,cancel);assert.deepEqual(h.calls.routes,[]);h.unchanged();
});

test('owner visits synchronize selection while ordinary status updates do not undo the reader’s chosen chapter',async t=>{
 const h=setup(t);h.board.open('rakuten');
 assert.equal(h.scene.snapshot().selected,'rakuten');assert.equal(h.$('.story-open-scene').dataset.storyOpen,'rakuten');
 await flush();h.show();await flush();h.scene.select('otoku');
 h.emit({loading:true,message:'確認中です。'});assert.equal(h.scene.snapshot().selected,'otoku');assert.equal(h.$('.story-refresh').disabled,true);
 h.emit({loading:false,message:'保存原稿の確認が終わりました。'});assert.equal(h.scene.snapshot().selected,'otoku');assert.equal(h.$('.story-refresh').disabled,false);
 h.board.open('lottery');assert.equal(h.scene.snapshot().selected,'lottery');assert.match(h.$('.story-account-identity').textContent,/@chusen1101/);h.unchanged();
});

test('unknown totals stay unknown, available local counts are scoped, and sourcing invents no inventory',t=>{
 const h=setup(t),readState=h.$('.story-read-state');assert.equal(readState.open,false);assert.equal(readState.querySelector('summary').textContent,'読取未確認');readState.querySelector('summary').click();assert.equal(readState.open,true);assert.ok(readState.contains(h.$('.story-memo')));assert.ok(readState.contains(h.$('.story-status')));assert.match(h.$('.story-memo p').textContent,/未確認/);assert.doesNotMatch(h.$('.story-memo p').textContent,/0本/);
 h.emit({loading:true});assert.equal(readState.querySelector('summary').textContent,'読込中');h.emit({loading:false,complete:true});assert.equal(readState.querySelector('summary').textContent,'読取状況');h.emit({complete:false,message:'保存原稿の読取に失敗しました。'});assert.equal(readState.querySelector('summary').textContent,'読取未確認');
 h.scene.setLivingStatus({rooms:[{key:'insurance',totalCount:null,loadedCount:2,unreadCount:1}]});
 assert.match(h.$('.story-memo p').textContent,/利用できる保存原稿 2本/);assert.match(h.$('.story-memo p').textContent,/全体は未確認/);
 h.scene.setLivingStatus({rooms:[{key:'insurance',totalCount:0,loadedCount:0,unreadCount:0}]});
 assert.match(h.$('.story-memo p').textContent,/保存原稿 0本/);assert.doesNotMatch(h.$('.story-memo p').textContent,/全体は未確認/);
 h.scene.select('sourcing');h.scene.setLivingStatus({rooms:[{key:'sourcing',totalCount:null,loadedCount:0}]});
 assert.match(h.$('.story-memo p').textContent,/仕入れ帳で確認/);assert.doesNotMatch(h.$('.story-memo p').textContent,/0本|在庫.*0/);h.unchanged();
});

test('existing utilities, refresh and list owner stay authoritative; list mode hides the storybook and restores it',async t=>{
 const h=setup(t);
 for(const button of h.doc.querySelectorAll('.story-utilities button'))button.click();
 h.$('.story-refresh').click();assert.deepEqual([h.calls.search,h.calls.later,h.calls.settings,h.calls.refresh],[1,1,1,1]);
 h.emit({loading:true});h.$('.story-refresh').click();assert.equal(h.calls.refresh,1);
 h.$('.story-list').click();await flush();assert.equal(h.calls.list,1);assert.equal(h.scene.element.hidden,true);assert.equal(h.scene.snapshot().view,'list');
 h.host.querySelector('.board-primary').click();await flush();assert.equal(h.scene.element.hidden,false);assert.equal(h.scene.snapshot().view,'book');
 assert.equal(h.$('[data-story-instant=insurance]').isConnected,true);h.unchanged();
});

test('while awaiting the original return owner only the latest queued room is opened',async t=>{
 const h=setup(t,{delayedBack:true});h.scene.open('insurance');await flush();
 h.scene.open('otoku');h.scene.open('lottery');
 assert.equal(h.scene.snapshot().queued,'lottery');assert.deepEqual(h.calls.routes,['insurance']);
 h.show();await flush();await flush();
 assert.deepEqual(h.calls.routes,['insurance','lottery']);assert.equal(h.scene.snapshot().queued,null);assert.equal(h.host.hidden,true);assert.equal(h.calls.travel.at(-1).room,'lottery');h.unchanged();
});

test('a direct newer route wins over a queued route after synchronous return but before its observer flushes',async t=>{
 const h=setup(t);h.scene.open('insurance');await flush();
 h.scene.open('otoku');assert.equal(h.host.hidden,false,'the existing back handler is synchronous');
 h.scene.open('lottery');await flush();await flush();
 assert.deepEqual(h.calls.routes,['insurance','lottery']);assert.equal(h.scene.snapshot().selected,'lottery');assert.equal(h.scene.snapshot().queued,null);
 h.show();await flush();await flush();assert.deepEqual(h.calls.routes,['insurance','lottery'],'a later return cannot reopen the stale queued room');assert.equal(h.host.hidden,false);h.unchanged();
});

for(const broken of ['onCancel','onTravel'])test('optional '+broken+' failure cannot block selection, original routing, return or cleanup',async t=>{
 const h=setup(t,{[broken]:()=>{throw Error('Optional presentation failed');}});
 assert.equal(h.scene.select('otoku'),true);assert.equal(h.scene.open('otoku'),true);assert.deepEqual(h.calls.routes,['otoku']);
 await flush();h.show();await flush();assert.equal(h.doc.activeElement,h.$('[data-story-instant=otoku]'));
 assert.doesNotThrow(()=>h.scene.destroy());assert.equal(h.subscribers.size,0);assert.equal(h.doc.querySelector('.storybook'),null);h.unchanged();
});

test('destroy clears queued work and owner observers; remount has one live action and no duplicate routes',async t=>{
 const h=setup(t,{delayedBack:true});h.scene.open('insurance');await flush();h.scene.open('otoku');const oldQuick=h.$('[data-story-instant=lottery]');
 h.scene.destroy();h.show();h.emit({lastVisited:'rakuten',visitVersion:10});await flush();await flush();
 assert.deepEqual(h.calls.routes,['insurance']);assert.equal(h.subscribers.size,0);assert.equal(h.doc.querySelector('.storybook'),null);
 oldQuick.click();assert.deepEqual(h.calls.routes,['insurance']);assert.equal(h.scene.open('lottery'),false);assert.equal(h.scene.select('lottery'),false);
 const next=h.mount();assert.equal(h.subscribers.size,1);assert.equal(h.doc.querySelectorAll('.storybook').length,1);assert.equal(next.snapshot().selected,'rakuten');
 h.$('[data-story-instant=lottery]').click();assert.deepEqual(h.calls.routes,['insurance','lottery']);
 next.destroy();next.destroy();assert.equal(h.subscribers.size,0);h.unchanged();
});

test('art failure is decorative only and fallback artwork cannot detach an existing owner node',t=>{
 const h=setup(t,{buildArt:()=>{throw Error('art unavailable');}});
 assert.ok(h.$('.story-paper-fallback'));h.scene.setArtBuilder(()=>h.doc.querySelector('#original-reader'));
 assert.ok(h.$('.story-paper-fallback'));assert.equal(h.$('#original-reader').parentElement,h.doc.body);
 const other=new JSDOM('<!doctype html><body>');t.after(()=>other.window.close());
 const art=h.scene.makeScene(other.window.document,'lottery');assert.equal(art.ownerDocument,other.window.document);assert.equal(art.dataset.storyRoom,'lottery');assert.equal(art.getAttribute('aria-hidden'),'true');
 assert.equal(h.scene.open('insurance'),true);assert.deepEqual(h.calls.routes,['insurance']);h.unchanged();
});
