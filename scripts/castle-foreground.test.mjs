/* Visual snapshot boundaries. Geometry is stubbed; actual pixel composition is
   verified separately by the real-browser intermediate journey frames. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {captureCastleForeground} from '../command-center-98/lounge/castle-foreground.js';
const {JSDOM} = createRequire(import.meta.url)('jsdom');
function setup(t, body = '<img class="spatial-desk-actor" src="/actor.webp"><section id="desk"><p>Original manuscript</p></section>') {
  const dom = new JSDOM('<!doctype html><body>' + body + '</body>', {url: 'https://castle.invalid/lounge/index.html', runScripts: 'outside-only'});
  t.after(() => dom.window.close());
  const doc = dom.window.document, actor = doc.querySelector('.spatial-desk-actor'), paper = doc.getElementById('desk');
  if (actor) actor.getBoundingClientRect = () => ({left: 20, top: 60, width: 100, height: 160});
  if (paper) paper.getBoundingClientRect = () => ({left: 40, top: 160, width: 300, height: 400});
  return {dom, doc, actor, paper};
}
test('capture is a detached inert visual copy and never moves or changes the live source', t => {
  const {doc, actor, paper} = setup(t); let copies = 0; const button = doc.createElement('button'); button.id = 'live-copy'; button.name = 'source-control'; button.setAttribute('onclick', 'window.unwanted=true'); button.textContent = 'Copy'; button.addEventListener('click', () => copies++); paper.append(button);
  const original = doc.body.innerHTML, parent = paper.parentNode, snapshot = captureCastleForeground(doc);
  assert.equal(snapshot.parentNode, null); assert.equal(snapshot.inert, true); assert.equal(snapshot.getAttribute('aria-hidden'), 'true');
  assert.equal(paper.parentNode, parent); assert.equal(actor.parentNode, parent); assert.equal(doc.body.innerHTML, original);
  assert.equal(snapshot.querySelector('[data-journey-part=paper]').textContent, 'Original manuscriptCopy'); assert.equal(snapshot.querySelectorAll('[id],[name],[onclick]').length, 0);
  snapshot.querySelector('button').click(); assert.equal(copies, 0); button.click(); assert.equal(copies, 1); assert.equal(doc.defaultView.unwanted, undefined);
});
test('geometry is translated into the target surface without inherited paper transform', t => {
  const {doc, actor, paper} = setup(t); paper.style.cssText = 'transform:translateY(12px);margin:8px;position:relative;color:rgb(40, 30, 20);font-size:17px'; actor.style.objectFit = 'contain';
  const snapshot = captureCastleForeground(doc, {offsetX: 11, offsetY: 80, surfaceTop: 52}), copy = snapshot.querySelector('[data-journey-part=paper]'), figure = snapshot.querySelector('[data-journey-part=actor]');
  assert.equal(copy.style.left, '51px'); assert.equal(copy.style.top, '188px'); assert.equal(copy.style.width, '300px'); assert.equal(copy.style.height, '400px'); assert.equal(copy.style.position, 'absolute'); assert.equal(copy.style.transform, 'none'); assert.equal(copy.style.margin, '0px'); assert.equal(copy.style.pointerEvents, 'none'); assert.equal(copy.style.color, 'rgb(40, 30, 20)'); assert.equal(copy.style.fontSize, '17px');
  assert.equal(figure.style.left, '31px'); assert.equal(figure.style.top, '88px'); assert.equal(figure.style.objectFit, 'contain'); assert.equal(figure.src, 'https://castle.invalid/actor.webp'); assert.equal(figure.alt, '');
});
test('cross-document capture creates new target-owned nodes, not adoption of owner DOM', t => {
  const {doc, paper} = setup(t), host = new JSDOM('<!doctype html><body></body>', {url: 'https://castle.invalid/app-v130.html'}); t.after(() => host.window.close());
  const snapshot = captureCastleForeground(doc, {document: host.window.document, offsetY: 52, surfaceTop: 52});
  assert.equal(snapshot.ownerDocument, host.window.document); assert.equal(snapshot.querySelector('[data-journey-part=paper]').ownerDocument, host.window.document); assert.equal(paper.ownerDocument, doc); assert.equal(paper.isConnected, true); assert.equal(snapshot.querySelector('[data-journey-part=paper]').style.top, '160px');
});
test('scroll position becomes restoration metadata without changing the source or clamping disconnected clones', t => {
  const {doc, paper} = setup(t); const scroll = doc.createElement('div'); scroll.textContent = 'Read from this exact position'; scroll.style.cssText = 'height:120px;overflow:auto'; paper.append(scroll); paper.scrollTop = 32; scroll.scrollTop = 146;
  const original = paper.outerHTML, snapshot = captureCastleForeground(doc), copy = snapshot.querySelector('[data-journey-part=paper]');
  assert.equal(copy.dataset.journeyScrollTop, '32'); assert.equal(copy.querySelector('[data-journey-scroll-top]').dataset.journeyScrollTop, '146'); assert.equal(scroll.scrollTop, 146); assert.equal(paper.scrollTop, 32); assert.equal(paper.outerHTML, original); assert.equal(copy.scrollTop, 0);
});
test('hidden descendants and non-rendered roots are excluded', t => {
  const {doc, paper, actor} = setup(t); paper.innerHTML = '<p>Visible</p><p hidden>Hidden attribute</p><p style="display:none">Display none</p><p style="visibility:hidden">Hidden visibility</p>';
  assert.equal(captureCastleForeground(doc).querySelector('[data-journey-part=paper]').textContent, 'Visible');
  actor.style.display = 'none'; paper.style.visibility = 'hidden'; assert.equal(captureCastleForeground(doc), null);
});
test('missing or zero-sized foreground roots return null', t => {
  const {doc, actor, paper} = setup(t); actor.getBoundingClientRect = () => ({left: 0, top: 0, width: 0, height: 0}); paper.getBoundingClientRect = () => ({left: 0, top: 0, width: 0, height: 400}); assert.equal(captureCastleForeground(doc), null); actor.remove(); paper.remove(); assert.equal(captureCastleForeground(doc), null);
});
test('the bounded snapshot contains at most 350 copied elements, leaving all owner nodes intact', t => {
  const {doc, paper} = setup(t); paper.replaceChildren(); for (let i = 0; i < 500; i++) { const row = doc.createElement('p'); row.textContent = 'Original row ' + i; paper.append(row); }
  const snapshot = captureCastleForeground(doc); assert.ok(snapshot.querySelectorAll('*').length <= 350); assert.equal(snapshot.querySelectorAll('*').length, 350); assert.equal(paper.childElementCount, 500); assert.equal(paper.lastElementChild.textContent, 'Original row 499');
});
test('forms, executable/embed nodes and editable fields never survive as live snapshot elements', t => {
  const {doc, paper} = setup(t); paper.innerHTML = '<p>Keep this text</p><form action="/write"><button name="submit">Visual button</button></form><script>window.unwanted=true</script><style>body{display:none}</style><iframe src="/other"></iframe><object data="/other"></object><embed src="/other"><link rel="stylesheet" href="/other"><meta http-equiv="refresh" content="0"><audio src="/other"></audio><video src="/other"></video><input value="private"><textarea>Private field</textarea><select><option>Private selection</option></select>';
  const snapshot = captureCastleForeground(doc); assert.equal(snapshot.querySelectorAll('form,script,style,iframe,object,embed,link,meta,audio,video,input,select,textarea').length, 0); assert.ok(snapshot.textContent.includes('Keep this text')); assert.equal(snapshot.querySelectorAll('[id],[name],[onclick],[action],[href],[contenteditable]').length, 0);
});
test('tools departure captures visible workbench and object reliefs, never hidden reader text',t=>{
 const {doc,paper}=setup(t,'<main id="room" data-living-view="tools"><img class="spatial-desk-actor" src="/actor.webp"><section id="desk" style="visibility:hidden">Private hidden draft</section><section class="living-workbench"><button><span><i style="background:#a87f40">Bound book</i></span>原稿棚</button></section></main>');
 const bench=doc.querySelector('.living-workbench');bench.getBoundingClientRect=()=>({left:40,top:160,width:300,height:400});bench.scrollTop=80;
 const snapshot=captureCastleForeground(doc),copy=snapshot.querySelector('[data-journey-part=paper]');assert.match(copy.textContent,/原稿棚/);assert.ok(copy.querySelector('i'));assert.equal(copy.textContent.includes('Private hidden draft'),false);assert.equal(copy.dataset.journeyScrollTop,'80');assert.equal(paper.style.visibility,'hidden');assert.equal(bench.isConnected,true);
});
test('departure retains asymmetric material borders and independent child transforms without double-transforming the root',t=>{
 const {doc,paper}=setup(t);paper.style.cssText='rotate:3deg;translate:2px 4px;scale:1.1';
 const relief=doc.createElement('span');relief.style.cssText='border:6px solid rgb(40,30,20);border-top:9px solid rgb(120,90,50);border-bottom:9px solid rgb(100,70,40);rotate:-2deg;translate:1px 2px;scale:0.98';paper.append(relief);
 const before=relief.outerHTML,copy=captureCastleForeground(doc).querySelector('[data-journey-part=paper]'),surface=copy.querySelector('span'),computed=doc.defaultView.getComputedStyle(relief);
 for(const property of ['border-top','border-right','border-bottom','border-left','rotate','translate','scale'])assert.equal(surface.style.getPropertyValue(property),computed.getPropertyValue(property),property);
 for(const property of ['rotate','translate','scale'])assert.equal(copy.style.getPropertyValue(property),'none',property+' root already uses painted geometry');
 assert.equal(relief.outerHTML,before);
});
function shelfFixture(t){
 const h=setup(t,'<main id="room"><section id="desk"><p>Current live body</p></section><aside class="workbook-list"><section class="manuscript-shelf"><label><input id="desk-query" type="search" placeholder="原稿を探す"></label><nav><button id="filter" name="filter" onclick="window.bad=true">すべて</button></nav><div id="desk-list"><button>Actual draft one</button><button>Actual draft two</button></div></section></aside></main>'),shelf=h.doc.querySelector('.manuscript-shelf'),list=h.doc.querySelector('#desk-list');shelf.getBoundingClientRect=()=>({left:12,top:200,width:220.28125,height:480});shelf.style.cssText='display:block;box-sizing:border-box;width:220.281px;height:480px';list.scrollTop=155;list.scrollLeft=7;/* Geometry/material assertions use a deterministic clock; scan-time below exercises the real bound. */h.doc.defaultView.performance.now=()=>0;return{...h,shelf,list,options:{strict:true,extraRoots:[{element:shelf,part:'list'}]}};
}
test('strict work-page capture includes the exact live shelf and its scroll in one shared flat copy',t=>{
 const h=shelfFixture(t);h.doc.querySelector('#desk-query').value='price';const before=h.doc.body.innerHTML,result=captureCastleForeground(h.doc,{...h.options,offsetY:-80}),copy=result.querySelector('[data-journey-part=list]');assert.ok(result.querySelector('[data-journey-part=paper]'));assert.equal(copy.style.left,'12px');assert.equal(copy.style.top,'120px');assert.equal(copy.style.width,'220.28125px');assert.equal(copy.style.boxSizing,'border-box');assert.match(copy.textContent,/priceすべてActual draft oneActual draft two/);assert.equal(copy.querySelector('[data-journey-scroll-top]').dataset.journeyScrollTop,'155');assert.equal(copy.querySelector('[data-court-scroll-left]').dataset.courtScrollLeft,'7');assert.equal(copy.querySelectorAll('input,[id],[name],[onclick]').length,0);assert.equal(h.doc.body.innerHTML,before);assert.equal(h.list.scrollTop,155);assert.equal(h.shelf.parentElement.className,'workbook-list');
});
test('the exact noninteractive dock heading travels as a flat sibling without copying its source ID or moving it',t=>{
 const h=shelfFixture(t);h.doc.querySelector('#desk-query').value='actual filter';const heading=h.doc.createElement('h2');heading.className='workbook-list-title';heading.id='live-list-heading';heading.textContent='原稿のしおり';heading.style.cssText='font:750 16px/1.5 system-ui;color:rgb(23,58,53)';heading.getBoundingClientRect=()=>({left:17,top:169,width:210,height:24});h.shelf.before(heading);const before=h.doc.body.innerHTML,result=captureCastleForeground(h.doc,{...h.options,offsetY:-74}),copy=result.querySelector('[data-journey-part=list-title]');assert.ok(copy);assert.equal(copy.tagName,'H2');assert.equal(copy.textContent,'原稿のしおり');assert.equal(copy.style.left,'17px');assert.equal(copy.style.top,'95px');assert.equal(copy.style.height,'24px');assert.equal(copy.style.fontWeight,'750');assert.equal(copy.hasAttribute('id'),false);assert.equal(copy.parentNode,result);assert.equal(h.doc.body.innerHTML,before);assert.equal(heading.nextElementSibling,h.shelf);heading.append(h.doc.createElement('button'));assert.equal(captureCastleForeground(h.doc,h.options),null);
});
test('unfocused exact search placeholder is a styled inert text surface, never an editable copied control',t=>{
 const h=shelfFixture(t),get=h.doc.defaultView.getComputedStyle.bind(h.doc.defaultView);h.doc.defaultView.getComputedStyle=(node,pseudo)=>{if(!pseudo)return get(node);const style=h.doc.createElement('i').style;style.color='rgb(80, 90, 85)';style.opacity='.6';return style;};const result=captureCastleForeground(h.doc,h.options),copy=result.querySelector('[data-journey-filter=search]');assert.equal(copy.textContent,'原稿を探す');assert.equal(copy.tagName,'DIV');assert.equal(copy.style.color,'rgb(80, 90, 85)');assert.equal(copy.style.opacity,'0.6');assert.equal(copy.style.getPropertyPriority('color'),'important');assert.equal(h.doc.querySelector('#desk-query').value,'');
});
for(const reason of ['active-search','unknown-input','editable','shadow','over-budget','text-budget','external-image'])test('strict shelf '+reason+' chooses a whole-page instant fallback rather than partial or unsafe contents',t=>{
 const h=shelfFixture(t);h.doc.querySelector('#desk-query').value='actual filter';if(reason==='active-search')h.doc.querySelector('#desk-query').focus();if(reason==='unknown-input')h.shelf.append(h.doc.createElement('input'));if(reason==='editable')h.shelf.setAttribute('contenteditable','true');if(reason==='shadow')h.shelf.attachShadow({mode:'open'});if(reason==='over-budget')for(let i=0;i<351;i++)h.shelf.append(h.doc.createElement('span'));if(reason==='text-budget')h.list.textContent='x'.repeat(24001);if(reason==='external-image'){const image=h.doc.createElement('img');image.src='https://other.invalid/image';h.shelf.append(image);}const before=h.doc.body.innerHTML;assert.equal(captureCastleForeground(h.doc,h.options),null);assert.equal(h.doc.body.innerHTML,before);
});
for(const reason of ['not-strict','wrong-part','detached','wrong-dock','duplicate','overlapping'])test('extra-root '+reason+' is not an arbitrary source-copy capability',t=>{
 const h=shelfFixture(t),options={...h.options};if(reason==='not-strict')options.strict=false;if(reason==='wrong-part')options.extraRoots=[{element:h.shelf,part:'paper'}];if(reason==='detached')h.shelf.remove();if(reason==='wrong-dock')h.shelf.parentElement.className='other';if(reason==='duplicate')options.extraRoots=[...h.options.extraRoots,...h.options.extraRoots];if(reason==='overlapping')h.paper.append(h.shelf.parentElement);assert.equal(captureCastleForeground(h.doc,options),null);
});
test('strict paper-only phone copy does not invent the intentionally absent shelf',t=>{
 const h=shelfFixture(t);h.shelf.parentElement.hidden=true;const result=captureCastleForeground(h.doc,{strict:true});assert.ok(result);assert.equal(result.querySelector('[data-journey-part=list]'),null);assert.equal(result.textContent,'Current live body');assert.equal(h.shelf.parentElement.hidden,true);
});
function longShelf(t){const h=shelfFixture(t);h.doc.defaultView.performance.now=()=>0;h.doc.querySelector('#desk-query').value='current filter';h.list.replaceChildren();h.list.style.cssText='display:block;overflow-y:auto;padding:0 0 10px';h.list.getBoundingClientRect=()=>({left:12,top:500,width:220,height:180});Object.defineProperties(h.list,{clientWidth:{value:220},clientHeight:{value:180},scrollWidth:{value:220},scrollHeight:{value:40010}});h.list.scrollTop=1600;h.list.scrollLeft=0;for(let i=0;i<500;i++){const row=h.doc.createElement('button');row.className='manuscript-card';row.style.cssText='display:flex;box-sizing:border-box;width:220px;height:80px';row.getBoundingClientRect=()=>({left:12,top:500+i*80-h.list.scrollTop,width:220,height:80});const title=h.doc.createElement('strong');title.textContent='Stored draft '+i;row.append(title);h.list.append(row);}return h;}
test('a large live shelf keeps only exact visible rows plus its full measured scroll extent within the same budget',t=>{
 const h=longShelf(t),before=h.doc.body.innerHTML,result=captureCastleForeground(h.doc,h.options);assert.ok(result);const extent=result.querySelector('[data-journey-list-extent]');assert.ok(extent);assert.equal(extent.style.height,'40000px');assert.equal(extent.style.width,'220px');assert.deepEqual([...extent.children].map(row=>row.textContent),['Stored draft 20','Stored draft 21','Stored draft 22']);assert.deepEqual([...extent.children].map(row=>row.style.top),['1600px','1680px','1760px']);assert.equal(extent.parentElement.dataset.journeyScrollTop,'1600');assert.ok(result.querySelectorAll('*').length<40);assert.equal(h.list.children.length,500);assert.equal(h.list.scrollTop,1600);assert.equal(h.doc.body.innerHTML,before);assert.doesNotMatch(result.textContent,/Stored draft 19|Stored draft 23/);
});
for(const reason of ['unexpected-row','visible-editor','transformed-row','scan-time'])test('visible shelf pruning '+reason+' fails whole-page safely without raising the budget',t=>{
 const h=longShelf(t);if(reason==='unexpected-row')h.list.append(h.doc.createElement('section'));if(reason==='visible-editor')h.list.children[20].append(h.doc.createElement('input'));if(reason==='transformed-row')h.list.children[20].style.transform='scale(.9)';if(reason==='scan-time'){let n=0;h.doc.defaultView.performance.now=()=>n++*2;}assert.equal(captureCastleForeground(h.doc,h.options),null);assert.equal(h.list.children.length,reason==='unexpected-row'?501:500);assert.equal(h.list.scrollTop,1600);
});
