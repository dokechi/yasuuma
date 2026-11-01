/* One temporary presentation lease of the already-created courtyard canvas.
   This module never creates a graphics context, routes, fetches, or moves reader
   content. The application commits its real destination independently. */
const leases = new WeakMap();
const rooms = new Set(['insurance', 'otoku', 'rakuten', 'lottery', 'sourcing']);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const detached = (node, doc) => node?.nodeType === 1 && node.ownerDocument === doc && !node.isConnected && !node.parentNode;

export function createCourtPassage({document: doc = globalThis.document, reducedMotion = () => false} = {}) {
 const win = doc?.defaultView;
 if (!win || !doc.body) throw new Error('A court passage needs a mounted document.');
 const quiet = win.matchMedia?.('(prefers-reduced-motion: reduce)');
 let current = null, disposed = false, serial = 0;
 const canMove = () => {
  try { return !disposed && !doc.hidden && !quiet?.matches && !reducedMotion() && typeof win.Element?.prototype.animate === 'function' && win.getComputedStyle(doc.documentElement).getPropertyValue('--court-passage-ready').trim() === '1'; }
  catch { return false; }
 };
 const notify = (type, record, cancelled) => doc.dispatchEvent(new win.CustomEvent(type, {detail: {room: record.room, direction: record.direction, duration: record.duration, ...(cancelled === undefined ? {} : {cancelled})}}));
 function release(record, cancelled = true) {
  if (!record || record.released) return;
  record.released = true;
  if (current === record) current = null;
  win.cancelAnimationFrame(record.raf); win.clearTimeout(record.watchdog);
  for (const remove of record.listeners) remove();
  try { record.clock?.cancel(); } catch {}
  // Restore only our lease. Never pull a canvas back from a newer/foreign owner.
  if (leases.get(record.canvas) === record) {
   leases.delete(record.canvas);
   try {
    if (record.marker.parentNode === record.parent) record.parent.insertBefore(record.canvas, record.marker);
    else record.parent.insertBefore(record.canvas, record.next?.parentNode === record.parent ? record.next : null);
    if (record.style === null) record.canvas.removeAttribute('style'); else record.canvas.setAttribute('style', record.style);
   } catch { /* The application may already have retired its original surface. */ }
   record.marker.remove();
   // Normal demand rendering may resume only after the canvas is back in place.
   try { record.handle?.finish({cancelled, direction: record.direction}); } catch {}
  }
  record.layer.remove();
  if (record.started) notify('court:passage-end', record, cancelled);
 }
 function cancel() { serial++; release(current); }
 function state() { return current ? {active: true, room: current.room, direction: current.direction, phase: current.phase, progress: current.progress, duration: current.duration} : {active: false, room: null, direction: null, phase: 'idle', progress: 0}; }
 function setRoom(record, values = {}) {
  if (current !== record || record.released) return false;
  for (const [key, slot] of [['roomBackdrop', record.backdrop], ['foreground', record.foreground]]) {
   if (!(key in values)) continue;
   const node = values[key];
   if (node !== null && !detached(node, doc)) continue;
   slot.replaceChildren();
   if (node) {
    node.inert = true; node.setAttribute('aria-hidden', 'true'); node.style.pointerEvents = 'none'; slot.append(node);
    // Setting scrollTop while detached clamps to zero in actual browsers.
    for (const scroller of [node, ...node.querySelectorAll('[data-journey-scroll-top],[data-court-scroll-left]')]) {
     const top = Number(scroller.getAttribute('data-journey-scroll-top'));
     if (scroller.hasAttribute('data-journey-scroll-top') && finite(top) && top >= 0) scroller.scrollTop = Math.min(top, 1e8);
     const left = Number(scroller.getAttribute('data-court-scroll-left'));
     if (scroller.hasAttribute('data-court-scroll-left') && finite(left) && left >= 0) scroller.scrollLeft = Math.min(left, 1e8);
    }
   }
  }
  return true;
 }
 function frameHidden(record) {
  const frame = record.sourceFrame;
  if (!frame) return false;
  try { const style = win.getComputedStyle(frame); return frame.hidden || style.display === 'none' || style.visibility === 'hidden'; } catch { return true; }
 }
 function hostSizeMatches(record) { return win.innerWidth === record.hostWidth && win.innerHeight === record.hostHeight; }
 function expectedNativeHide(record) {
  return record.nativeHideAcknowledged && record.sourceFrame?.isConnected && record.sourceFrame.contentDocument === record.sourceDocument && hostSizeMatches(record) && !doc.hidden && !record.sourceDocument.hidden && frameHidden(record);
 }
 function unchangedReturnFrame(record) {
  if (record.room !== 'sourcing' || record.direction !== 'out' || !record.sourceFrame?.isConnected || frameHidden(record) || !hostSizeMatches(record)) return false;
  try {
   const rect = record.sourceFrame.getBoundingClientRect(), view = record.sourceDocument.defaultView, surface = record.surface;
   return ['left', 'top', 'width', 'height'].every(key => rect[key] === surface[key]) && view.innerWidth === surface.width && view.innerHeight === surface.height;
  } catch { return false; }
 }
 function acknowledgeNativeHide(record) {
  // Only the route adapter holding this token can acknowledge the existing
  // matching cc:castle-native event. This is not a generic pause exemption.
  if (current !== record || record.released || record.room !== 'sourcing' || record.direction !== 'in' || !record.sourceFrame?.isConnected || record.sourceFrame.ownerDocument !== doc || record.sourceFrame.contentDocument !== record.sourceDocument || !hostSizeMatches(record) || doc.hidden || record.sourceDocument.hidden) return false;
  record.nativeHideAcknowledged = true; return true;
 }
 function paint(record, elapsed) {
  if (current !== record || record.released) return false;
  if (!canMove() || record.sourceDocument.hidden || !record.parent.isConnected || !hostSizeMatches(record) || record.sourceFrame && (!record.sourceFrame.isConnected || frameHidden(record) && !expectedNativeHide(record))) { release(record); return false; }
  const time = clamp(finite(elapsed) ? elapsed : 0, 0, record.duration);
  const u = record.direction === 'out' ? 1 - time / record.duration : time / record.duration;
  try {
   // Host acknowledgement is intent, not evidence that the native workspace
   // exists. Recheck even while paused; never expose the child placeholder.
   if (record.room === 'sourcing' && record.direction === 'in' && u >= .48 && (!record.nativeHideAcknowledged || record.nativeVisible?.() !== true)) { release(record); return false; }
   // A paused ordinary WAAPI clock retains its frame without occupying the GPU.
   // All lifecycle and native-visibility checks still run above this dedup.
   if (record.lastPaintedTime === time) return true;
   const result = record.handle.paint(u, {width: record.surface.width, height: record.surface.height});
   if (!result || result.ok !== true) { release(record); return false; }
   if (current !== record || record.released) return false;
   record.lastPaintedTime = time;
   record.progress = u; record.phase = typeof result.phase === 'string' ? result.phase : u < .44 ? 'approach' : u <= .52 ? 'sealed' : u < .94 ? 'reveal' : 'inside';
   record.layer.dataset.phase = record.phase;
   // Reader and companion are one solid plane: the paper masks the original
   // character crop on compact layouts. Swap only behind the opaque door.
   const visible = u >= .48;
   record.backdrop.style.visibility = record.foreground.style.visibility = visible ? 'visible' : 'hidden';
   return true;
  } catch { release(record); return false; }
 }
 function travel(spec = {}) {
  const intent = ++serial; release(current);
  if (serial !== intent || !canMove() || spec.quick || !rooms.has(spec.room) || !['in', 'out'].includes(spec.direction)) return null;
  const {canvas, renderer, surface} = spec, sourceDocument = canvas?.ownerDocument;
  let sourceFrame = null;
  try {
   sourceFrame = sourceDocument?.defaultView?.frameElement || null;
   if (sourceFrame && (sourceFrame.ownerDocument !== doc || !sourceFrame.isConnected || sourceFrame.hidden || win.getComputedStyle(sourceFrame).display === 'none')) return null;
   if (canvas?.tagName !== 'CANVAS' || !canvas.isConnected || !canvas.parentNode || leases.has(canvas) || typeof renderer?.beginPassage !== 'function' || sourceDocument.hidden || sourceDocument.defaultView.location.origin !== win.location.origin) return null;
  } catch { return null; }
  if (!surface || !['left', 'top', 'width', 'height'].every(key => finite(surface[key])) || surface.width <= 0 || surface.height <= 0 || surface.width > 20000 || surface.height > 20000 || Math.abs(surface.left) > 20000 || Math.abs(surface.top) > 20000) return null;
  const savedSize = spec.returnState;
  // A Fold resize while reading invalidates the captured camera/room geometry.
  // The real Back remains correct; do not stretch a historical presentation.
  if (spec.direction === 'out' && savedSize && (!finite(savedSize.width) || !finite(savedSize.height) || Math.abs(savedSize.width - surface.width) > 1 || Math.abs(savedSize.height - surface.height) > 1)) return null;
  const duration = finite(spec.duration) ? clamp(spec.duration, 400, 1400) : 900;
  const layer = doc.createElement('div'); layer.className = 'court-passage'; layer.dataset.room = spec.room; layer.dataset.direction = spec.direction; layer.dataset.phase = 'preparing';
  layer.inert = true; layer.setAttribute('aria-hidden', 'true');
  Object.assign(layer.style, {left: surface.left + 'px', top: surface.top + 'px', width: surface.width + 'px', height: surface.height + 'px', pointerEvents: 'none'});
  const backdrop = doc.createElement('div'), foreground = doc.createElement('div'); backdrop.className = 'court-passage-backdrop'; foreground.className = 'court-passage-foreground';
  layer.append(backdrop, foreground);
  const record = {layer, backdrop, foreground, canvas, sourceDocument, sourceFrame, hostWidth: win.innerWidth, hostHeight: win.innerHeight, nativeHideAcknowledged: false, nativeVisible: typeof spec.nativeVisible === 'function' ? spec.nativeVisible : null, surface: {...surface}, room: spec.room, direction: spec.direction, duration, parent: canvas.parentNode, next: canvas.nextSibling, style: canvas.getAttribute('style'), marker: sourceDocument.createComment('court-passage: original canvas position'), handle: null, clock: null, listeners: [], raf: 0, watchdog: 0, released: false, started: false, progress: spec.direction === 'out' ? 1 : 0, phase: 'preparing'};
  current = record; leases.set(canvas, record);
  const listen = (target, type, callback, options) => { target.addEventListener(type, callback, options); record.listeners.push(() => target.removeEventListener(type, callback, options)); };
  try {
   record.handle = renderer.beginPassage({room: spec.room, ...(spec.returnState ? {returnState: spec.returnState} : {}), onInvalidated() { if (current === record) cancel(); }});
   if (!record.handle || typeof record.handle.paint !== 'function' || typeof record.handle.finish !== 'function') { release(record); return null; }
   if (current !== record || record.released) { try { record.handle.finish({cancelled: true, direction: record.direction}); } catch {} return null; }
   record.parent.insertBefore(record.marker, canvas);
   doc.body.append(layer); layer.append(canvas);
   Object.assign(canvas.style, {position: 'absolute', inset: '0', left: '0', top: '0', right: 'auto', bottom: 'auto', display: 'block', width: '100%', height: '100%', margin: '0', padding: '0', border: '0', transform: 'none', translate: 'none', rotate: 'none', scale: 'none', opacity: '1', visibility: 'visible', pointerEvents: 'none'});
   setRoom(record, spec);
   if (!paint(record, 0)) return null;
   // A real WAAPI clock, not a private seek hook: normal browser animation tools
   // can pause/scrub this presentation while the original route remains live.
   record.clock = layer.animate([{opacity: 1}, {opacity: 1}], {duration, easing: 'linear', fill: 'both'});
   record.clock.id = 'court-passage-clock';
   Promise.resolve(record.clock.finished).then(() => { if (current === record && paint(record, duration)) release(record, false); }).catch(() => { if (current === record) release(record); });
   const interrupt = event => {
    if (event.type === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;
    if (current === record) cancel();
   };
   for (const observed of new Set([doc, sourceDocument])) {
    for (const type of ['pointerdown', 'keydown', 'input', 'copy', 'cut', 'paste']) listen(observed, type, interrupt, true);
    listen(observed, 'visibilitychange', () => { if (observed.hidden && current === record) cancel(); });
    listen(observed.defaultView, 'pagehide', interrupt);
    listen(observed.defaultView, 'resize', event => {
     if (observed !== doc && (expectedNativeHide(record) || unchangedReturnFrame(record))) return;
     interrupt(event);
    });
    listen(observed.defaultView, 'orientationchange', interrupt);
   }
   listen(canvas, 'webglcontextlost', interrupt, true);
   const tick = () => { if (current === record && paint(record, Number(record.clock.currentTime) || 0)) record.raf = win.requestAnimationFrame(tick); };
   record.raf = win.requestAnimationFrame(tick);
   // Scrubbing/pausing uses ordinary WAAPI, but a broken or abandoned clock
   // may not lease the only canvas indefinitely. Hard ceiling: 6.4–7.4 seconds;
   // any actual input interrupts sooner and the canonical destination is live.
   record.watchdog = win.setTimeout(() => { if (current === record) cancel(); }, duration + 6000);
   record.started = true; notify('court:passage-start', record);
   if (current !== record || record.released) return null;
   return Object.freeze({returnState: record.handle.returnState, setRoom: values => setRoom(record, values), acknowledgeNativeHide: () => acknowledgeNativeHide(record), cancel() { if (current === record) cancel(); }});
  } catch { release(record); return null; }
 }
 const motion = () => { if (quiet?.matches) cancel(); };
 quiet?.addEventListener?.('change', motion);
 return {travel, cancel, state, destroy() { if (disposed) return; disposed = true; cancel(); quiet?.removeEventListener?.('change', motion); }};
}
