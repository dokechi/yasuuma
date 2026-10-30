import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createAccountBoard} from '../command-center-98/lounge/accounts.js';
const {parseHTML}=createRequire(import.meta.url)('linkedom');

function setup(){
 const {window,document}=parseHTML('<html><body><main id="app"></main></body></html>');
 Object.assign(globalThis,{window,document});
 let writes=0;Object.defineProperty(window,'localStorage',{value:{setItem(){writes++;},getItem(){return null;}},configurable:true});
 const opened=[];let insideClick=false;
 const board=createAccountBoard({host:document.body,rows:()=>[],open:(account,id)=>opened.push({account:account.key,id,synchronous:insideClick}),onLounge(){},onRefresh(){}});
 function click(key){insideClick=true;document.querySelector('.account-tile[data-destination="'+key+'"]').onclick();insideClick=false;}
 return {window,document,board,opened,click,writes:()=>writes};
}

test('door selection updates the dial and opens immediately; last visited survives render only in this visit',()=>{
 const b=setup();
 assert.equal(b.document.querySelectorAll('[data-last-visited="true"]').length,0);
 b.click('rakuten');
 assert.deepEqual(b.opened,[{account:'rakuten',id:undefined,synchronous:true}],'opening cannot wait for animation or a timeout');
 assert.equal(b.board.element.dataset.destination,'rakuten');
 assert.equal(b.board.element.style.getPropertyValue('--dial-angle'),'90deg');
 assert.equal(b.document.querySelector('.door-threshold').dataset.destination,'rakuten');
 b.board.show();b.board.render({complete:true});
 const marked=b.document.querySelectorAll('.account-tile[data-last-visited="true"]');assert.equal(marked.length,1);assert.equal(marked[0].dataset.destination,'rakuten');assert.match(marked[0].getAttribute('aria-label'),/楽天犬.*最後に開いた/);
 b.click('insurance');b.board.show();
 assert.equal(b.board.element.style.getPropertyValue('--dial-angle'),'0deg');
 assert.equal(b.document.querySelector('.account-tile[data-last-visited="true"]').dataset.destination,'insurance');
 assert.equal(b.writes(),0,'decorative navigation state must not persist tracking data');
 b.window.dispatchEvent(new b.window.Event('pagehide'));
 const fresh=setup();assert.equal(fresh.document.querySelectorAll('[data-last-visited="true"]').length,0,'a fresh visit has no remembered destination');fresh.window.dispatchEvent(new fresh.window.Event('pagehide'));
});

test('ambient room effects pause while the document is hidden',()=>{
 const b=setup();Object.defineProperty(b.document,'hidden',{value:true,configurable:true});b.document.dispatchEvent(new b.window.Event('visibilitychange'));assert.equal(b.board.element.dataset.paused,'true');
 Object.defineProperty(b.document,'hidden',{value:false,configurable:true});b.document.dispatchEvent(new b.window.Event('visibilitychange'));assert.equal(b.board.element.dataset.paused,'false');
 b.window.dispatchEvent(new b.window.Event('pagehide'));
});
