/* A reversible, presentation-only passage between the castle and its rooms.
   Routing never waits for this renderer. It owns only its own inert layer. */
const WIDTH = 1536, HEIGHT = 1024, DURATION = 780;
const ROOMS = Object.freeze({
  insurance: {rect: [.085, .33, .35, .28], actor: [.24, .45, .14, .15]},
  otoku: {rect: [.17, .06, .27, .25], actor: [.31, .14, .075, .17]},
  rakuten: {rect: [.58, .34, .34, .27], actor: [.65, .43, .16, .16]},
  lottery: {rect: [.62, .05, .25, .27], actor: [.69, .18, .12, .14]},
  sourcing: {rect: [.325, .66, .43, .27], actor: [.57, .76, .13, .16]}
});
const IN_PHASES = [[0, 'press'], [100, 'approach'], [350, 'threshold'], [540, 'reveal'], [680, 'settle']];
const OUT_PHASES = [[0, 'depart'], [100, 'threshold'], [430, 'withdraw'], [680, 'settle']];
const finite = value => typeof value === 'number' && Number.isFinite(value);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function createCastleJourney({document: doc = globalThis.document, assetRoot, reducedMotion = () => false} = {}) {
  const win = doc?.defaultView;
  if (!win || !doc.body) throw new Error('A journey needs a mounted document.');
  const assets = new URL(assetRoot || './assets/', import.meta.url);
  if (assets.protocol !== new URL(import.meta.url).protocol || assets.origin !== new URL(import.meta.url).origin || !assets.pathname.endsWith('/')) {
    throw new TypeError('Journey artwork must use a same-origin asset directory.');
  }
  let current = null, disposed = false, serial = 0;
  const interiorCache = new Map();
  const quiet = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  const make = (tag, name) => { const node = doc.createElement(tag); node.className = 'castle-journey-' + name; return node; };
  const image = (name, file) => {
    const node = make('img', name); node.decoding = 'sync'; node.src = new URL(file, assets).href; node.alt = ''; node.draggable = false; return node;
  };
  const canMove = () => { try { return !disposed && !doc.hidden && !quiet?.matches && !reducedMotion() && typeof win.Element?.prototype.animate === 'function'; } catch { return false; } };
  function release(record, cancelled = true) {
    if (!record) return;
    win.cancelAnimationFrame(record.raf); win.clearTimeout(record.watchdog);
    for (const animation of record.animations) { try { animation.cancel(); } catch {} }
    // Keep only the decoded bitmap node, never its old paper/actor snapshot tree.
    if (record.interior?.parentNode === record.layer && interiorCache.get(record.room) === record.interior) record.interior.remove();
    record.layer.remove();
    if (current === record) current = null;
    if (record.started) doc.dispatchEvent(new win.CustomEvent('castle:journey-end', {detail: {room: record.room, direction: record.direction, duration: record.duration, cancelled}}));
  }
  function cancel() { serial++; release(current); }
  function phase(record) {
    const time = clamp((Number(record.primary?.currentTime) || 0) / record.duration * DURATION, 0, DURATION);
    const phases = record.direction === 'out' ? OUT_PHASES : IN_PHASES;
    return phases.filter(([at]) => at <= time).at(-1)[1];
  }
  function state() {
    return current ? {active: true, room: current.room, direction: current.direction, phase: phase(current), duration: current.duration} : {active: false, room: null, direction: null, phase: 'idle', duration: DURATION};
  }
  function travel(spec = {}) {
    // A newer intent wins even if it asks for an instant/quiet route.
    const intent = ++serial; release(current);
    if (serial !== intent || !canMove() || spec.quick || !Object.hasOwn(ROOMS, spec.room) || !['in', 'out', 'switch'].includes(spec.direction)) return false;
    const origin = spec.origin;
    if (!origin || !['left', 'top', 'width', 'height', 'stageLeft', 'stageTop', 'scale'].every(key => finite(origin[key])) || origin.width <= 0 || origin.height <= 0 || origin.scale <= 0 || origin.scale > 20) return false;
    const duration = finite(spec.duration) ? clamp(spec.duration, 400, 1200) : DURATION;
    const width = win.innerWidth, top = clamp(finite(spec.surfaceTop) ? spec.surfaceTop : 0, 0, Math.max(0, win.innerHeight - 100)), height = win.innerHeight - top;
    if (!(width > 0 && height > 0)) return false;
    const rect = ROOMS[spec.room].rect, [rx, ry, rw, rh] = rect;
    const sourceRoom = Object.hasOwn(ROOMS, spec.sourceRoom) ? spec.sourceRoom : spec.room;
    const startX = origin.left + origin.stageLeft, startY = origin.top - top + origin.stageTop;
    const closeScale = Math.max(width / (WIDTH * rw), height / (HEIGHT * rh)) * 1.04;
    const closeX = width / 2 - (rx + rw / 2) * WIDTH * closeScale;
    const closeY = height / 2 - (ry + rh / 2) * HEIGHT * closeScale;
    const start = `translate(${startX}px,${startY}px) scale(${origin.scale})`;
    const near = `translate(${closeX}px,${closeY}px) scale(${closeScale})`;
    // Preserve enough approach distance to recognize the same building. A
    // phone already focused on the room must not zoom backwards to meet a ratio.
    const middleScale = Math.max(origin.scale, Math.min(closeScale, width * .62 / (WIDTH * rw), height * .62 / (HEIGHT * rh)));
    const startCenterX = startX + (rx + rw / 2) * WIDTH * origin.scale, startCenterY = startY + (ry + rh / 2) * HEIGHT * origin.scale;
    const middleX = startCenterX + (width / 2 - startCenterX) * .65 - (rx + rw / 2) * WIDTH * middleScale;
    const middleY = startCenterY + (height / 2 - startCenterY) * .65 - (ry + rh / 2) * HEIGHT * middleScale;
    const middle = `translate(${middleX}px,${middleY}px) scale(${middleScale})`;
    const initialClip = `inset(${clamp(origin.top - top, 0, height)}px ${clamp(width - origin.left - origin.width, 0, width)}px ${clamp(height - (origin.top - top) - origin.height, 0, height)}px ${clamp(origin.left, 0, width)}px)`;
    const roomX = startX + WIDTH * rx * origin.scale, roomY = startY + HEIGHT * ry * origin.scale;
    const roomWidth = WIDTH * rw * origin.scale, roomHeight = HEIGHT * rh * origin.scale;
    const doorWidth = width * 1.12, doorHeight = height * 1.16;
    const portalStart = `translate(${roomX}px,${roomY}px) scale(${roomWidth / doorWidth},${roomHeight / doorHeight})`;
    const portalMiddle = `translate(${middleX + WIDTH * rx * middleScale}px,${middleY + HEIGHT * ry * middleScale}px) scale(${WIDTH * rw * middleScale / doorWidth},${HEIGHT * rh * middleScale / doorHeight})`;
    const portalNear = `translate(${-width * .06}px,${-height * .08}px) scale(1)`;
    const portalPast = `translate(${-width * .2}px,${-height * .24}px) scale(1.25)`;
    const layer = doc.createElement('div'); layer.className = 'castle-journey'; layer.dataset.room = spec.room; layer.dataset.direction = spec.direction;
    layer.dataset.phase = spec.direction === 'out' ? 'depart' : 'press'; layer.dataset.roomRect = rect.join(',');
    layer.setAttribute('aria-hidden', 'true'); layer.inert = true;
    layer.style.top = top + 'px'; layer.style.pointerEvents = 'none'; layer.style.setProperty('--journey-duration', duration + 'ms');
    const sky = make('div', 'sky'); sky.style.backgroundImage = `url("${new URL('castle-sky-v1.webp', assets).href}")`;
    const world = make('div', 'world'), camera = make('div', 'camera');
    camera.style.transform = start;
    const castle = image('castle', 'castle-silhouette-v1.webp'); castle.width = WIDTH; castle.height = HEIGHT; camera.append(castle);
    for (const [key, config] of Object.entries(ROOMS)) {
      const actor = image('actor', key + '-desk-actor.webp'), [x, y, w, h] = config.actor;
      actor.dataset.actor = key; Object.assign(actor.style, {left: x * 100 + '%', top: y * 100 + '%', width: w * 100 + '%', height: h * 100 + '%'}); camera.append(actor);
    }
    world.append(camera);
    // A cold/failed high-resolution image must never reveal an empty sky. This
    // uses the castle bitmap already displayed on home and needs no decode wait.
    const fallback = make('div', 'fallback'), fallbackArt = image('fallback-art', 'castle-silhouette-v1.webp');
    fallbackArt.width = WIDTH; fallbackArt.height = HEIGHT; fallbackArt.style.transform = near; fallback.append(fallbackArt);
    let interior = interiorCache.get(spec.room);
    if (!interior?.complete || !interior.naturalWidth) {
      interior = image('interior', 'castle-interior-' + spec.room + '-v1.webp');
      const cachedRoom = spec.room, imageNode = interior;
      interior.addEventListener('error', () => { imageNode.style.visibility = 'hidden'; if (interiorCache.get(cachedRoom) === imageNode) interiorCache.delete(cachedRoom); }, {once: true});
      interior.dataset.room = spec.room; interiorCache.set(spec.room, interior);
    }
    const source = spec.direction === 'switch' ? image('source-interior', 'castle-interior-' + sourceRoom + '-v1.webp') : null;
    // The caller supplies a sanitized, detached snapshot, never the live reader.
    // Refuse connected/foreign nodes rather than stealing application content.
    const foreground = spec.foreground?.nodeType === 1 && spec.foreground.ownerDocument === doc && !spec.foreground.isConnected && !spec.foreground.parentNode ? spec.foreground : null;
    if (foreground) { foreground.classList.add('castle-journey-foreground'); foreground.setAttribute('aria-hidden', 'true'); foreground.inert = true; }
    const threshold = make('div', 'threshold'); threshold.style.width = doorWidth + 'px'; threshold.style.height = doorHeight + 'px';
    const leafLeft = make('div', 'leaf'), leafRight = make('div', 'leaf'); leafLeft.dataset.side = 'left'; leafRight.dataset.side = 'right';
    const handle = make('span', 'handle'); leafLeft.append(handle);
    const light = make('div', 'light'), lintel = make('div', 'lintel'), postLeft = make('div', 'post'), postRight = make('div', 'post');
    postLeft.dataset.side = 'left'; postRight.dataset.side = 'right'; threshold.append(leafLeft, leafRight, light, lintel, postLeft, postRight);
    layer.append(sky, fallback, interior, world); if (source) layer.append(source); if (foreground) layer.append(foreground); layer.append(threshold);
    const record = {id: intent, layer, interior, room: spec.room, direction: spec.direction, duration, started: false, animations: [], primary: null, raf: null, watchdog: null};
    current = record;
    try {
      doc.body.append(layer);
      if (foreground) {
        for (const node of [foreground, ...foreground.querySelectorAll('[data-journey-scroll-top]')]) {
          const top = Number(node.getAttribute('data-journey-scroll-top'));
          if (node.hasAttribute('data-journey-scroll-top') && finite(top) && top >= 0) node.scrollTop = Math.min(top, 1e8);
        }
      }
      const reverse = spec.direction === 'out';
      const animate = (node, frames, easing = 'linear', reverseEffect = reverse) => {
        const animation = node.animate(frames, {duration, easing, direction: reverseEffect ? 'reverse' : 'normal', fill: 'both'});
        record.animations.push(animation);
        // Attach rejection handling immediately: cancellation is a normal intent.
        Promise.resolve(animation.finished).catch(() => {});
        return animation;
      };
      record.primary = animate(layer, reverse ? [
        {opacity: 1, clipPath: 'inset(0)', offset: 0},
        {opacity: 1, clipPath: 'inset(0)', offset: .87},
        {opacity: .77, clipPath: 'inset(0)', offset: .9},
        {opacity: 0, clipPath: initialClip, offset: 1}
      ] : [
        {opacity: 1, clipPath: 'inset(0)', offset: 0},
        {opacity: 1, clipPath: 'inset(0)', offset: .24},
        {opacity: 1, clipPath: 'inset(0)', offset: .87},
        {opacity: 0, clipPath: 'inset(0)', offset: 1}
      ], 'linear', false);
      animate(camera, [
        {transform: start, offset: 0},
        {transform: start, offset: .09, easing: 'cubic-bezier(.35,0,.65,1)'},
        {transform: middle, offset: .30, easing: 'cubic-bezier(.2,.65,.25,1)'},
        {transform: near, offset: .50}, {transform: near, offset: 1}
      ]);
      // Sky travels at one fifth of the castle's camera delta, bounded so its
      // cover plate never uncovers an edge on a narrow/short viewport.
      const skyX = clamp((closeX - startX) * .2, -width * .035, width * .035), skyY = clamp((closeY - startY) * .2, -height * .035, height * .035);
      animate(sky, [{transform: 'translate(0,0) scale(1.08)', offset: 0}, {transform: `translate(${skyX}px,${skyY}px) scale(1.08)`, offset: .5}, {transform: `translate(${skyX}px,${skyY}px) scale(1.08)`, offset: 1}]);
      animate(world, [{opacity: source ? 0 : 1, offset: 0}, {opacity: source ? 0 : 1, offset: .49}, {opacity: 0, offset: .53}, {opacity: 0, offset: 1}]);
      animate(fallback, [{opacity: 0, offset: 0}, {opacity: 0, offset: .49}, {opacity: 1, offset: .53}, {opacity: 1, offset: 1}]);
      animate(interior, [{opacity: 0, transform: 'scale(1.035)', offset: 0}, {opacity: 0, transform: 'scale(1.035)', offset: .49}, {opacity: 1, transform: 'scale(1.035)', offset: .53}, {opacity: 1, transform: 'scale(1)', offset: 1}]);
      if (source) animate(source, [{opacity: 1, transform: 'scale(1)', offset: 0}, {opacity: 1, transform: 'scale(1.035)', offset: .46}, {opacity: 0, transform: 'scale(1.035)', offset: .54}, {opacity: 0, transform: 'scale(1.035)', offset: 1}]);
      animate(threshold, [
        {transform: source ? portalNear : portalStart, opacity: 0, offset: 0},
        {transform: source ? portalNear : portalStart, opacity: 1, offset: .06},
        {transform: source ? portalNear : portalStart, opacity: 1, offset: .09, easing: 'cubic-bezier(.35,0,.65,1)'},
        {transform: source ? portalNear : portalMiddle, opacity: 1, offset: .30, easing: 'cubic-bezier(.2,.65,.25,1)'},
        {transform: portalNear, opacity: 1, offset: .50},
        {transform: portalNear, opacity: 1, offset: .61},
        {transform: portalPast, opacity: 1, offset: 1}
      ]);
      animate(leafLeft, [{transform: 'rotateY(0deg)', offset: 0}, {transform: 'rotateY(0deg)', offset: .54}, {transform: 'rotateY(-112deg)', offset: .84}, {transform: 'rotateY(-112deg)', offset: 1}]);
      animate(leafRight, [{transform: 'rotateY(0deg)', offset: 0}, {transform: 'rotateY(0deg)', offset: .54}, {transform: 'rotateY(112deg)', offset: .84}, {transform: 'rotateY(112deg)', offset: 1}]);
      animate(handle, [{transform: 'rotate(0deg)', offset: 0}, {transform: 'rotate(18deg)', offset: .1}, {transform: 'rotate(18deg)', offset: .52}, {transform: 'rotate(0deg)', offset: .7}, {transform: 'rotate(0deg)', offset: 1}]);
      animate(light, [{opacity: 0, transform: 'scaleX(1)', offset: 0}, {opacity: .6, transform: 'scaleX(1)', offset: .13}, {opacity: 1, transform: 'scaleX(1)', offset: .51}, {opacity: .8, transform: 'scaleX(18)', offset: .67}, {opacity: 0, transform: 'scaleX(22)', offset: .84}, {opacity: 0, transform: 'scaleX(22)', offset: 1}]);
      if (foreground) {
        for (const node of [foreground, ...foreground.querySelectorAll('[data-journey-part]')]) {
          if (node.dataset.journeyPart === 'actor') animate(node, reverse ? [
            {opacity: 1, offset: 0}, {opacity: 1, offset: .5}, {opacity: 0, offset: .501}, {opacity: 0, offset: 1}
          ] : [
            {opacity: 0, offset: 0}, {opacity: 0, offset: .499}, {opacity: 1, offset: .5}, {opacity: 1, offset: 1}
          ], 'linear', false);
          if (node.dataset.journeyPart === 'paper') animate(node, reverse ? [
            {opacity: 1, transform: 'translateY(0px)', offset: 0},
            {opacity: 0, transform: 'translateY(8px)', offset: .22},
            {opacity: 0, transform: 'translateY(8px)', offset: 1}
          ] : [
            {opacity: 0, transform: 'translateY(8px)', offset: 0},
            {opacity: 0, transform: 'translateY(8px)', offset: .84},
            {opacity: 1, transform: 'translateY(0px)', offset: 1}
          ], 'linear', false);
        }
      }
      // One timeline means inspectors can pause/seek every layer to the same ms.
      const startTime = doc.timeline?.currentTime;
      if (finite(startTime)) for (const animation of record.animations) animation.startTime = startTime;
      record.started = true;
      doc.dispatchEvent(new win.CustomEvent('castle:journey-start', {detail: {room: record.room, direction: record.direction, duration}}));
      if (current !== record) return false;
      const tick = () => {
        if (current !== record) return;
        if (!canMove()) return cancel();
        layer.dataset.phase = phase(record); record.raf = win.requestAnimationFrame(tick);
      };
      record.raf = win.requestAnimationFrame(tick);
      // Defensive only: a broken animation promise cannot leave a stale layer.
      record.watchdog = win.setTimeout(() => { if (current === record) release(record); }, duration + 6000);
      Promise.resolve(record.primary.finished).then(() => { if (current === record) release(record, false); }).catch(() => { if (current === record) release(record); });
      return true;
    } catch {
      release(record); return false;
    }
  }
  const key = event => { if (event.key === 'Escape') cancel(); };
  const visibility = () => { if (doc.hidden) cancel(); };
  const motion = () => { if (quiet?.matches) cancel(); };
  doc.addEventListener('keydown', key); doc.addEventListener('visibilitychange', visibility); quiet?.addEventListener?.('change', motion);
  return {travel, cancel, state, destroy() { if (disposed) return; disposed = true; cancel(); interiorCache.clear(); doc.removeEventListener('keydown', key); doc.removeEventListener('visibilitychange', visibility); quiet?.removeEventListener?.('change', motion); }};
}
