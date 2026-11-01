import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{JSDOM}=require('jsdom');
const dir=new URL('../command-center-98/lounge/',import.meta.url);
const text=fs.readFileSync(new URL('storybook-atelier.js',dir),'utf8');
const source=text.replace(/^import \* as application from .*;\n/m,'').replace(/\bimport\(/g,'load(').replaceAll('import.meta.url',JSON.stringify('https://example.test/lounge/storybook-atelier.js'));
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
async function boot({missing='',sceneFailure=false,artFailure=false,brokenImage=false}={}){
 const dom=new JSDOM('<body class="storybook-atelier spatial-atelier"><section id="room" data-spatial-desk="ready" data-account="insurance"><div class="spatial-study-scene"></div><img class="spatial-desk-actor"></section><dialog id="settings"></dialog><button id="settings-open"></button><div class="system-management"></div></body>',{url:'https://example.test/lounge/index.html',pretendToBeVisual:true});
 const {window}=dom,document=window.document,board={element:document.createElement('section')},calls=[];
 const actor=document.querySelector('img');Object.defineProperties(actor,{complete:{value:true},naturalWidth:{value:brokenImage?0:1536}});
 const app={getAccountBoard:()=>board,getLivingDesk:()=>null,openSupplementaryReader:()=>{}};
 const scene={setArtBuilder(){},open(){},snapshot:()=>({}),destroy(){}};
 const load=async url=>{calls.push(url);if(url.includes('storybook-scene')){if(sceneFailure)throw Error('optional scene missing');return {mountStorybook:()=>scene,storyChapters:[{key:'insurance',place:'letter'}]};}if(url.includes('spatial-desk'))return {installSpatialDesk(){calls.push('install-reader');return {};}};if(url.includes('storybook-art'))return {buildStorybookArt(){if(artFailure)throw Error('optional art failed');const e=document.createElement('div');e.className='story-paper-art';return e;}};if(url.includes('living-'))throw Error('not relevant');if(url.includes('storybook-passage'))return {installStorybookPassage:()=>({snapshot:()=>({}),destroy(){}})};throw Error(url);};
 const getComputedStyle=()=>({getPropertyValue:key=>key===missing?'':'1'}),quiet={warn(){}};
 await new AsyncFunction('window','document','getComputedStyle','MutationObserver','application','load','console',source)(window,document,getComputedStyle,window.MutationObserver,app,load,quiet);
 return {dom,window,document,calls,actor,close(){window.dispatchEvent(new window.Event('pagehide'));window.close();}};
}
test('critical bright static leaf is independent and never claims enhancement readiness',()=>{
 const html=fs.readFileSync(new URL('index.html',dir),'utf8'),critical=html.match(/<style id="storybook-critical">([\s\S]*?)<\/style>/)[1];
 assert.match(critical,/#F7F8F2/);assert.match(critical,/account-board:not\(\.storybook-mounted\)/);assert.match(critical,/#world,#town/);assert.doesNotMatch(critical,/--(?:storybook|spatial)-(?:ready|reader-ready|palette-ready)\s*:/);
 assert.doesNotMatch(text,/^import .*storybook-scene/m);assert.match(text,/await import\('\.\/storybook-scene/);
});
for(const token of ['--storybook-palette-ready','--storybook-ready','--storybook-reader-ready','--spatial-reader-ready'])test('missing '+token+' keeps original reader unmoved',async()=>{const b=await boot({missing:token});assert(!b.calls.includes('install-reader'));assert.equal(b.document.body.dataset.spatial,'fallback');assert(b.document.getElementById('room'));b.close();});
test('optional scene import failure does not stop stable application owner',async()=>{const b=await boot({sceneFailure:true});assert(!b.calls.includes('install-reader'));assert.equal(b.document.body.dataset.spatial,'fallback');b.close();});
test('late decorative builder failure stays local and removes wrong-room illustration',async()=>{const b=await boot({artFailure:true});assert.equal(b.document.getElementById('room').dataset.storyScene,'fallback');assert.equal(b.document.querySelector('.spatial-study-scene').children.length,0);b.close();});
test('failed image remains hidden fallback after subsequent load/decorate events',async()=>{const b=await boot({brokenImage:true});assert.equal(b.actor.hidden,true);assert.equal(b.document.getElementById('room').dataset.storyScene,'fallback');b.actor.dispatchEvent(new b.window.Event('load'));assert.equal(b.actor.hidden,true);assert.equal(b.document.getElementById('room').dataset.storyScene,'fallback');b.close();});
