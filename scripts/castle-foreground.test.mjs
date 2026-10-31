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
