import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('the merchant room follows native routes, returns home, and retains the original handlers',()=>{
 const observers=[];
 const classes=()=>{const set=new Set();return {contains:x=>set.has(x),toggle:(x,on)=>on?set.add(x):set.delete(x),add:x=>set.add(x)};};
 const elements=new Map();let refreshes=0,settings=0,later=null,searches=0;
 const node=()=>({hidden:false,dataset:{},classList:classes(),listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},click(){this.listeners.click?.();},querySelector(selector){return elements.get(selector);}});
 const main=node();main.dataset.ccView='sourcing';main.prepend=el=>elements.set(el.id,el);
 for(const id of ['[data-lounge-home]','[data-lounge-later]','[data-lounge-search]','[data-lounge-refresh]','[data-lounge-tools]','loungeWorkspaceTitle','loungeWorkspaceDescription'])elements.set(id,node());
 const refresh=node();refresh.click=()=>refreshes++;elements.set('refreshBtn',refresh);elements.set('mainWindow',main);
 const body=node(),document={body,getElementById:id=>elements.get(id),createElement:node,addEventListener(){}};
 const window={document,CCHome:{active:false},CCCastle:{search(){searches++;},later(value){later=value;},show(){window.CCHome.active=true;body.classList.add('castle-visible');}},CCRpgWorkspaces:{openSettings(){settings++;}},fetch(){throw Error('presentation must never request or change source data');}};
 class MutationObserver{constructor(fn){observers.push(fn);}observe(){}}
 vm.runInNewContext(fs.readFileSync(new URL('../lounge-workspace.js',import.meta.url),'utf8'),{window,MutationObserver});
 const sync=()=>observers.forEach(fn=>fn()),header=elements.get('loungeWorkspaceHeader');
 assert.equal(header.hidden,false);assert.equal(elements.get('loungeWorkspaceTitle').textContent,'仕入れ帳');
 elements.get('[data-lounge-refresh]').click();elements.get('[data-lounge-tools]').click();assert.equal(refreshes,1);assert.equal(settings,1);elements.get('[data-lounge-later]').click();assert.equal(later.place,'shiire');assert.equal(later.native,'sourcing');elements.get('[data-lounge-search]').click();assert.equal(searches,1);
 elements.get('[data-lounge-home]').click();sync();assert.equal(header.hidden,true);assert.equal(body.classList.contains('lounge-workspace'),false);
 window.CCHome.active=false;body.classList.toggle('castle-visible',false);main.dataset.ccView='reddit';sync();assert.equal(header.hidden,false);assert.equal(elements.get('loungeWorkspaceTitle').textContent,'海外時計・価格差');
 main.dataset.ccView='fp';sync();assert.equal(header.hidden,true);assert.equal(body.classList.contains('lounge-workspace'),false);
 main.dataset.ccView='sourcing';sync();assert.equal(header.hidden,false);assert.equal(elements.get('loungeWorkspaceTitle').textContent,'仕入れ帳');
});
