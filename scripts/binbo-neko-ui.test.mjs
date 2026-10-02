// Isolated DOM test. No browser automation and no calls to live services.
import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createRequire} from 'node:module';import {fixture} from './binbo-neko-fixture.mjs';
const root=process.env.BINBO_NEKO_UI_MODULES;const {JSDOM}=root?createRequire(root+'/package.json')('jsdom'):{};
async function dom(copyFails=false){const j={...fixture(),revision:'revision-one',state_key:'ready',state_label:'原稿が届いています',issues:[]},calls=[],copied=[];
 const w=new JSDOM('<body><div id="mainWindow"></div><div id="ccPrimaryNav"><button data-home-action="more">その他</button></div><div id="viewTabs"><button id="refreshBtn">更新</button></div><div id="domainTabs"></div><div id="commandHome"></div><div id="sourcingHub"></div><div id="affiliateDesk"></div><div id="regularHub"><h2 class="section-title"></h2><div id="listFilter"></div><div id="list"></div></div></body>',{runScripts:'outside-only',url:'https://example.invalid/'}).window;
 Object.assign(w,{API:'https://api.example',app:{view:'active'},load:async()=>{},authHeaders:()=>({Authorization:'Bearer test'}),authExpired:()=>assert.fail('unexpected auth expiry'),toast:()=>{},AbortSignal});
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async text=>{if(copyFails)throw new Error('denied');copied.push(text)}}});
 w.fetch=async(url,opts)=>{if(opts.method==='PATCH'){const b=JSON.parse(opts.body);calls.push(b);if(b.action==='neko_packet')return new Response(JSON.stringify({ok:true,packet:'Complete packet: sources + all pages + finishing instructions'}));if(b.action==='neko_copied'){j.state_key='copied';j.state_label='コピー済み'}if(b.action==='neko_skip')j.state_key='skipped';if(b.action==='neko_recheck')j.state_key='waiting';return new Response(JSON.stringify({ok:true}));}return new Response(JSON.stringify({ok:true,jobs:[j],task:{is_enabled:true},last_run:null}));};
 // The production navigation moves Refresh outside viewTabs before this script loads.
 w.document.body.append(w.document.getElementById('refreshBtn'));
 w.eval(await readFile(new URL('../command-center-98/binbo-neko.js',import.meta.url),'utf8'));await w.load('binbo-neko');return {w,calls,copied};
}
test('Tab has one handoff button; one complete copy is recorded only after clipboard success',{skip:!root},async()=>{
 const {w,calls,copied}=await dom();try{const d=w.document;assert.equal(d.querySelectorAll('#binboNekoBtn').length,1);assert.equal(d.querySelectorAll('[data-packet]').length,1);assert.equal(d.querySelector('[data-publish]'),null);await d.querySelector('[data-packet]').onclick();assert.equal(copied.length,1);assert.deepEqual(calls.map(c=>c.action),['neko_packet','neko_copied']);assert.equal(w.CCBinboNeko.state.filter,'copied');await w.load('affiliate');assert.equal(d.querySelector('#binboNekoDesk').hidden,true);}finally{w.close()}
});
test('Clipboard failure exposes one selected packet and does not claim copied',{skip:!root},async()=>{
 const {w,calls,copied}=await dom(true);try{await w.document.querySelector('[data-packet]').onclick();assert.equal(copied.length,0);assert.deepEqual(calls.map(c=>c.action),['neko_packet']);const t=w.document.querySelector('dialog textarea');assert.match(t.value,/Complete packet/);assert.equal(t.selectionStart,0);assert.equal(t.selectionEnd,t.value.length);}finally{w.close()}
});
