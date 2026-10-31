import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createCastleJourney} from '../command-center-98/lounge/castle-journey.js';
const {JSDOM} = createRequire(import.meta.url)('jsdom');
const origin = {left: 16, top: 120, width: 768, height: 360, stageLeft: 114, stageTop: 0, scale: .35};
const spec = (room = 'insurance', extra = {}) => ({direction: 'in', room, origin, surfaceTop: 52, ...extra});
const flush = () => new Promise(resolve => setImmediate(resolve));
function setup(t, options = {}) {
  const dom = new JSDOM('<!doctype html><body><button id="copy">Copy</button><p id="draft">Owner text</p></body>', {url: 'https://journey.invalid/', pretendToBeVisual: true});
  const win = dom.window, doc = win.document, animations = [], rafs = new Map(); let next = 0;
  Object.defineProperties(win, {innerWidth: {value: 800, configurable: true}, innerHeight: {value: 648, configurable: true}});
  Object.defineProperty(doc, 'timeline', {value: {currentTime: 125}});
  const media = {matches: false, listeners: new Set(), addEventListener(type, f) { this.listeners.add(f); }, removeEventListener(type, f) { this.listeners.delete(f); }, change(value) { this.matches = value; for (const f of this.listeners) f({matches: value}); }};
  win.matchMedia = () => media;
  win.requestAnimationFrame = fn => { rafs.set(++next, fn); return next; }; win.cancelAnimationFrame = id => rafs.delete(id);
  win.Element.prototype.animate = function (frames, timing) {
    let resolve, reject;
    const animation = {node: this, frames, timing, currentTime: 0, startTime: null, playState: 'running', finished: new Promise((yes, no) => { resolve = yes; reject = no; }), cancel() { this.playState = 'idle'; reject(new Error('cancelled')); }, finish() { this.currentTime = timing.duration; this.playState = 'finished'; resolve(); }};
    animations.push(animation); return animation;
  };
  const renderer = createCastleJourney({document: doc, ...options});
  t.after(() => { renderer.destroy(); dom.window.close(); });
  const seek = time => { for (const a of animations) a.currentTime = time; const pending = [...rafs.values()]; rafs.clear(); for (const fn of pending) fn(); };
  return {win, doc, animations, rafs, media, renderer, seek};
}
test('selected room receives one inert physical doorway with the exact castle geometry and shared 780ms timeline', t => {
  const {doc, animations, renderer, seek} = setup(t); doc.querySelector('#copy').focus();
  assert.equal(renderer.travel(spec()), true);
  const layer = doc.querySelector('.castle-journey');
  assert.equal(layer.style.top, '52px'); assert.equal(layer.style.pointerEvents, 'none'); assert.equal(layer.getAttribute('aria-hidden'), 'true'); assert.equal(layer.inert, true);
  assert.equal(doc.activeElement.id, 'copy'); assert.equal(doc.querySelector('#draft').textContent, 'Owner text');
  assert.equal(layer.dataset.roomRect, '0.085,0.33,0.35,0.28');
  assert.equal(layer.querySelectorAll('.castle-journey-actor').length, 5); assert.equal(layer.querySelectorAll('.castle-journey-leaf').length, 2); assert.ok(layer.querySelector('.castle-journey-handle'));
  const camera = animations.find(a => a.node.className === 'castle-journey-camera');
  assert.equal(camera.frames[0].transform, 'translate(130px,68px) scale(0.35)');
  const close = camera.frames[2].transform.match(/translate\(([-\d.]+)px,([-\d.]+)px\) scale\(([-\d.]+)\)/).slice(1).map(Number), [x, y, scale] = close;
  assert.ok(Math.abs(x + (.085 + .35 / 2) * 1536 * scale - 400) < .001); assert.ok(Math.abs(y + (.33 + .28 / 2) * 1024 * scale - 298) < .001);
  assert.ok(animations.every(a => a.timing.duration === 780 && a.startTime === 125));
  for (const [time, phase] of [[0, 'press'], [120, 'approach'], [450, 'threshold'], [650, 'reveal'], [750, 'settle']]) { seek(time); assert.equal(layer.dataset.phase, phase); assert.equal(renderer.state().phase, phase); }
});
test('all five destinations select their own interior, including native sourcing', t => {
  const {doc, renderer} = setup(t);
  for (const room of ['insurance', 'otoku', 'rakuten', 'lottery', 'sourcing']) { assert.equal(renderer.travel(spec(room)), true); assert.match(doc.querySelector('.castle-journey-interior').src, new RegExp('castle-interior-' + room + '-v1.webp$')); assert.equal(doc.querySelectorAll('.castle-journey').length, 1); }
});
test('a late finish from a replaced journey cannot remove or change the newest room', async t => {
  const {doc, animations, renderer} = setup(t); renderer.travel(spec()); const old = animations[0]; renderer.travel(spec('otoku')); old.finish(); await flush();
  assert.equal(renderer.state().room, 'otoku'); assert.equal(doc.querySelector('.castle-journey').dataset.room, 'otoku');
  const newest = animations.findLast(a => a.node.className === 'castle-journey'); newest.finish(); await flush(); assert.equal(renderer.state().active, false); assert.equal(doc.querySelector('.castle-journey'), null);
});
test('quick navigation cancels an existing journey and creates no waiting layer', async t => {
  const {doc, renderer} = setup(t); renderer.travel(spec()); assert.equal(renderer.travel(spec('rakuten', {quick: true})), false); await flush(); assert.equal(renderer.state().active, false); assert.equal(doc.querySelector('.castle-journey'), null);
});
test('OS and in-app reduced motion prevent motion and cancel current movement', t => {
  let quiet = false; const {renderer, media, seek} = setup(t, {reducedMotion: () => quiet});
  media.change(true); assert.equal(renderer.travel(spec()), false); media.change(false); renderer.travel(spec()); media.change(true); assert.equal(renderer.state().active, false);
  media.change(false); renderer.travel(spec()); quiet = true; seek(200); assert.equal(renderer.state().active, false); assert.equal(renderer.travel(spec()), false);
});
test('Escape, hidden document, and destroy clean up without changing focus or source DOM', t => {
  const {doc, win, renderer, media} = setup(t); doc.querySelector('#copy').focus(); renderer.travel(spec()); doc.dispatchEvent(new win.KeyboardEvent('keydown', {key: 'Escape'})); assert.equal(renderer.state().active, false);
  renderer.travel(spec()); Object.defineProperty(doc, 'hidden', {configurable: true, value: true}); doc.dispatchEvent(new win.Event('visibilitychange')); assert.equal(renderer.state().active, false); assert.equal(renderer.travel(spec()), false);
  Object.defineProperty(doc, 'hidden', {configurable: true, value: false}); renderer.travel(spec()); renderer.destroy(); renderer.destroy(); assert.equal(media.listeners.size, 0); assert.equal(renderer.travel(spec()), false); assert.equal(doc.activeElement.id, 'copy'); assert.equal(doc.querySelector('#draft').textContent, 'Owner text');
});
test('reverse journey starts opaque in the current room and returns through the original geometry', t => {
  const {renderer, animations, seek, doc} = setup(t); renderer.travel(spec('lottery', {direction: 'out'}));
  const layer = animations[0], camera = animations.find(a => a.node.className === 'castle-journey-camera');
  assert.equal(layer.frames[0].opacity, 1); assert.equal(layer.timing.direction, 'normal'); assert.equal(camera.timing.direction, 'reverse'); assert.equal(camera.frames[0].transform, 'translate(130px,68px) scale(0.35)');
  seek(500); assert.equal(doc.querySelector('.castle-journey').dataset.phase, 'withdraw');
});
test('room switching crosses between named interiors, not an unrelated castle center', t => {
  const {renderer, doc, animations} = setup(t); renderer.travel(spec('rakuten', {direction: 'switch', sourceRoom: 'otoku'}));
  assert.match(doc.querySelector('.castle-journey-source-interior').src, /castle-interior-otoku-v1.webp$/); assert.match(doc.querySelector('.castle-journey-interior').src, /castle-interior-rakuten-v1.webp$/);
  assert.equal(animations.find(a => a.node.className === 'castle-journey-world').frames[0].opacity, 0);
});
test('invalid geometry, sealed/unknown rooms and unavailable animation fail safely', t => {
  const {renderer, win, doc} = setup(t);
  for (const value of [spec('reserve'), spec('insurance', {origin: {...origin, scale: NaN}}), spec('insurance', {origin: {...origin, width: 0}}), spec('insurance', {direction: 'bogus'})]) assert.equal(renderer.travel(value), false);
  delete win.Element.prototype.animate; assert.equal(renderer.travel(spec()), false); assert.equal(doc.querySelector('.castle-journey'), null);
});
test('partial WAAPI failure rolls back its layer and cannot strand navigation', async t => {
  const {renderer, doc, win} = setup(t); const animate = win.Element.prototype.animate; let calls = 0;
  win.Element.prototype.animate = function (...args) { if (++calls === 3) throw new Error('compositor failed'); return animate.apply(this, args); };
  assert.equal(renderer.travel(spec()), false); await flush(); assert.equal(renderer.state().active, false); assert.equal(doc.querySelector('.castle-journey'), null);
});

test('optional pacing is bounded, scales phase time, and lifecycle reports completion vs cancellation', async t => {
  const {renderer, doc, animations, seek} = setup(t), events = [];
  for (const type of ['castle:journey-start', 'castle:journey-end']) doc.addEventListener(type, e => events.push({type, ...e.detail}));
  assert.equal(renderer.travel(spec('insurance', {duration: 520})), true);
  assert.ok(animations.every(a => a.timing.duration === 520)); seek(450 / 780 * 520); assert.equal(renderer.state().phase, 'threshold');
  animations[0].finish(); await flush(); assert.equal(events.at(-1).cancelled, false); assert.equal(events.at(-1).duration, 520);
  renderer.travel(spec('otoku', {duration: 99999})); assert.equal(renderer.state().duration, 1200); renderer.cancel(); await flush(); assert.equal(events.at(-1).cancelled, true);
  renderer.travel(spec('rakuten', {duration: 1})); assert.equal(renderer.state().duration, 400); renderer.cancel();
});
test('a new intent issued by an end-event listener wins over the outer pending travel', t => {
  const {renderer, doc} = setup(t); renderer.travel(spec());
  doc.addEventListener('castle:journey-end', () => renderer.travel(spec('lottery')), {once: true});
  assert.equal(renderer.travel(spec('otoku')), false); assert.equal(renderer.state().room, 'lottery'); assert.equal(doc.querySelectorAll('.castle-journey').length, 1);
});

test('detached actor/paper snapshots animate in sequence and restore scroll only after attachment', t => {
  const {renderer, doc, animations} = setup(t), foreground = doc.createElement('div');
  foreground.innerHTML = '<img data-journey-part="actor"><section data-journey-part="paper"><div data-journey-scroll-top="140">The exact owner manuscript</div></section>';
  const scroller = foreground.querySelector('[data-journey-scroll-top]'); let scroll = 0;
  Object.defineProperty(scroller, 'scrollTop', {get: () => scroll, set: value => { assert.equal(scroller.isConnected, true); scroll = value; }});
  assert.equal(renderer.travel(spec('insurance', {foreground})), true); assert.equal(scroll, 140); assert.equal(foreground.inert, true);
  const actor = animations.find(a => a.node.dataset.journeyPart === 'actor'), paper = animations.find(a => a.node.dataset.journeyPart === 'paper');
  assert.equal(actor.frames[1].offset, .72); assert.equal(paper.frames[1].offset, .84); assert.equal(paper.frames.at(-1).transform, 'translateY(0px)'); assert.equal(paper.timing.duration, 780);
  renderer.cancel(); assert.equal(foreground.isConnected, false); assert.equal(doc.querySelector('#draft').textContent, 'Owner text');
});
test('reverse snapshots begin fully visible and leave without rotating or replacing owner text', t => {
  const {renderer, doc, animations} = setup(t), foreground = doc.createElement('div');
  foreground.innerHTML = '<img data-journey-part="actor"><section data-journey-part="paper">Unchanged manuscript</section>';
  renderer.travel(spec('insurance', {direction: 'out', foreground}));
  for (const kind of ['paper', 'actor']) { const a = animations.find(a => a.node.dataset.journeyPart === kind); assert.equal(a.frames[0].opacity, 1); assert.equal(a.timing.direction, 'normal'); assert.equal(a.frames.at(-1).opacity, 0); }
  const paper = animations.find(a => a.node.dataset.journeyPart === 'paper'); assert.equal(paper.frames[0].transform, 'translateY(0px)'); assert.equal(paper.frames[1].offset, .22); assert.equal(foreground.textContent, 'Unchanged manuscript');
});
test('connected or foreign foreground nodes are never moved or removed', t => {
  const {renderer, doc} = setup(t), live = doc.querySelector('#draft'), other = new JSDOM('<!doctype html><body><div>Foreign owner</div></body>'); t.after(() => other.window.close());
  assert.equal(renderer.travel(spec('insurance', {foreground: live})), true); renderer.cancel(); assert.equal(doc.querySelector('#draft'), live); assert.equal(live.isConnected, true);
  const foreign = other.window.document.createElement('section'); foreign.textContent = 'Foreign detached'; renderer.travel(spec('otoku', {foreground: foreign})); assert.equal(foreign.parentNode, null); renderer.cancel(); assert.equal(foreign.ownerDocument, other.window.document);
  const holder = doc.createElement('div'), child = doc.createElement('section'); holder.append(child); renderer.travel(spec('rakuten', {foreground: child})); renderer.cancel(); assert.equal(child.parentNode, holder);
});

test('late or failed interiors retain cached close-up architecture without awaiting/replaying a route', t => {
  const {renderer, doc, win, animations} = setup(t); renderer.travel(spec('insurance'));
  const fallback = doc.querySelector('.castle-journey-fallback'), interior = doc.querySelector('.castle-journey-interior'), art = fallback.querySelector('img');
  assert.equal(fallback.nextElementSibling, interior); assert.match(art.src, /castle-silhouette-v1.webp$/);
  const camera = animations.find(a => a.node.className === 'castle-journey-camera'); assert.equal(art.style.transform, camera.frames[2].transform);
  const backing = animations.find(a => a.node === fallback); assert.equal(backing.frames.at(-1).opacity, 1);
  interior.dispatchEvent(new win.Event('error')); assert.equal(interior.style.visibility, 'hidden'); assert.equal(fallback.isConnected, true); assert.equal(renderer.state().room, 'insurance');
  renderer.travel(spec('otoku')); interior.dispatchEvent(new win.Event('load')); assert.equal(renderer.state().room, 'otoku'); assert.equal(doc.querySelectorAll('.castle-journey').length, 1);
});
