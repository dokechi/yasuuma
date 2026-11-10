import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const {JSDOM}=createRequire(import.meta.url)('jsdom');
const source=readFileSync(new URL('../command-center-98/lounge/stained-order.js',import.meta.url),'utf8');
const {normalizeOrder}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function setup(t,saved){
 const dom=new JSDOM('<nav></nav><button id="done"></button><span id="hint"></span>',{url:'https://qa.invalid',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document,rail=d.querySelector('nav');
 for(const k of ['a','b','c']){const c=d.createElement('button');c.className='sg-card';c.dataset.key=k;c.innerHTML='<span class="sg-label">'+k+'</span>';rail.append(c);c.scrollIntoView=()=>{};c.getBoundingClientRect=()=>({left:[...rail.children].indexOf(c)*100,width:100});}
 rail.getBoundingClientRect=()=>({left:0,right:300});Object.defineProperties(rail,{clientWidth:{value:300},scrollWidth:{value:300}});
 if(saved)w.localStorage.setItem('cc-stained-order-v1',JSON.stringify(saved));
 w.eval(source.replace(/export /g,''));const ctl=w.installGalleryOrder({rail,done:d.querySelector('#done'),hint:d.querySelector('#hint'),holdMs:10});
 let opens=0;rail.addEventListener('click',()=>opens++);
 const pointer=(target,type,x)=>{const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:1,clientX:x,clientY:20,button:0,isPrimary:true});target.dispatchEvent(e);};
 t.after(()=>{ctl.destroy();w.close();});return {w,d,rail,ctl,pointer,opens:()=>opens};
}
test('saved keys are deduplicated, obsolete keys removed, new accounts appended',()=>{assert.deepEqual(normalizeOrder(['b','b','removed'],['a','b','c']),['b','a','c']);assert.deepEqual(normalizeOrder({bad:true},['a','b']),['a','b']);});
test('load order and keyboard reorder retain the same account nodes and persist',t=>{const h=setup(t,['c','a']),a=h.rail.children[1];assert.deepEqual([...h.ctl.order()],['c','a','b']);a.dispatchEvent(new h.w.KeyboardEvent('keydown',{key:'ArrowRight',altKey:true,bubbles:true}));assert.deepEqual(JSON.parse(h.w.localStorage.getItem('cc-stained-order-v1')),['c','b','a']);assert.equal(h.rail.lastChild,a);assert.equal(h.opens(),0);});
test('quick tap opens while swipe cancels long press and suppresses accidental opening',async t=>{const h=setup(t),a=h.rail.firstChild;h.pointer(a,'pointerdown',50);h.pointer(a,'pointerup',50);a.click();assert.equal(h.opens(),1);h.pointer(a,'pointerdown',50);h.pointer(a,'pointermove',10);h.pointer(a,'pointerup',10);a.click();await new Promise(r=>setTimeout(r,20));assert.equal(h.opens(),1);assert.equal(h.d.querySelector('#done').hidden,true);});
test('held drag reorders and saves, completion restores normal tapping',async t=>{const h=setup(t),a=h.rail.firstChild;h.pointer(a,'pointerdown',50);await new Promise(r=>setTimeout(r,20));assert.equal(h.d.querySelector('#done').hidden,false);h.pointer(h.rail,'pointermove',270);h.pointer(h.rail,'pointerup',270);a.click();assert.equal(h.opens(),0);assert.deepEqual([...h.ctl.order()],['b','c','a']);assert.deepEqual(JSON.parse(h.w.localStorage.getItem('cc-stained-order-v1')),['b','c','a']);h.d.querySelector('#done').click();h.pointer(a,'pointerdown',250);h.pointer(a,'pointerup',250);a.click();assert.equal(h.opens(),1);});
test('cancelled drag restores its original order',async t=>{const h=setup(t),a=h.rail.firstChild;h.pointer(a,'pointerdown',50);await new Promise(r=>setTimeout(r,20));h.pointer(h.rail,'pointermove',270);h.pointer(h.rail,'pointercancel',270);assert.deepEqual([...h.ctl.order()],['a','b','c']);assert.equal(h.w.localStorage.getItem('cc-stained-order-v1'),null);});
