/* Isolated spatial prototype. No requests, persistence, or source-record changes.
   The bootstrap opts in with body.spatial-prototype and calls this installer. */
const installations = new WeakMap();

export function installSpatialDesk({document: doc = globalThis.document} = {}) {
  if (installations.has(doc)) return installations.get(doc);
  const win = doc.defaultView;
  const room = doc.getElementById('room');
  const desk = doc.getElementById('desk');
  const shelf = room?.querySelector('.manuscript-shelf');
  if (!win || !room || !desk || !shelf) throw new Error('Spatial desk needs the existing lounge reader.');

  const make = (tag, className, text) => {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const scene = make('div', 'spatial-study-scene');
  const surface = make('div', 'spatial-writing-surface');
  const actor = make('img', 'spatial-desk-actor');
  for (const node of [scene, surface, actor]) node.setAttribute('aria-hidden', 'true');
  actor.alt = '';
  actor.draggable = false;
  actor.src = new URL('./assets/insurance-desk-actor.webp', import.meta.url).href;
  const nav = make('nav', 'spatial-desk-nav');
  nav.setAttribute('aria-label', '書斎の道具');
  const shelfButton = make('button', 'spatial-shelf-open', '原稿棚');
  shelfButton.type = 'button';
  shelfButton.setAttribute('aria-haspopup', 'dialog');
  shelfButton.setAttribute('aria-controls', 'spatial-shelf-dialog');
  shelfButton.setAttribute('aria-expanded', 'false');
  const work = make('details', 'spatial-work');
  const summary = make('summary', '', '作業・状態');
  const workBody = make('div', 'spatial-work-body');
  workBody.id = 'spatial-work-body';
  summary.setAttribute('aria-controls', workBody.id);
  work.append(summary, workBody);
  nav.append(shelfButton, work);

  const dialog = make('dialog', 'spatial-shelf-dialog');
  dialog.id = 'spatial-shelf-dialog';
  dialog.setAttribute('aria-labelledby', 'spatial-shelf-title');
  const heading = make('header', 'spatial-shelf-heading');
  const title = make('h2', '', '原稿棚');
  title.id = 'spatial-shelf-title';
  const close = make('button', '', '閉じる');
  close.type = 'button';
  close.setAttribute('aria-label', '原稿棚を閉じる');
  const shelfHost = make('div', 'spatial-shelf-host');
  heading.append(title, close);
  dialog.append(heading, shelfHost);

  let active = false, destroyed = false, shelfAnchor = null, previousFocus = null;
  let closeFocus = null;
  const moves = [];
  const move = (node, destination) => {
    if (!node?.parentNode) return;
    const marker = doc.createComment('spatial-desk: original position');
    node.before(marker);
    moves.push({node, marker});
    destination.append(node);
  };
  const restoreMoves = () => {
    for (const {node, marker} of moves.splice(0).reverse()) {
      marker.replaceWith(node);
    }
  };
  const isEligible = () => doc.body.classList.contains('spatial-prototype') &&
    room.dataset.account === 'insurance' && !room.hidden;
  const restoreShelf = () => {
    if (!shelfAnchor) return;
    shelfAnchor.replaceWith(shelf); shelfAnchor = null;
    shelfButton.setAttribute('aria-expanded', 'false');
    const target = closeFocus || previousFocus || shelfButton;
    closeFocus = null;
    previousFocus = null;
    if (active && isEligible() && target?.isConnected) target.focus({preventScroll: true});
  };
  const closeShelf = ({focusReader = false} = {}) => {
    if (!shelfAnchor) return;
    if (focusReader) closeFocus = doc.getElementById('desk-scroll');
    if (dialog.open) dialog.close();
    restoreShelf();
  };
  const openShelf = () => {
    if (!active || !isEligible() || dialog.open) return false;
    previousFocus = doc.activeElement;
    work.open = false;
    shelfAnchor = doc.createComment('spatial-desk: original shelf position');
    shelf.before(shelfAnchor);
    shelfHost.append(shelf);
    try {
      dialog.showModal();
      shelfButton.setAttribute('aria-expanded', 'true');
      shelf.querySelector('input')?.focus({preventScroll: true});
    } catch (error) {
      restoreShelf();
      throw error;
    }
    return true;
  };
  shelfButton.addEventListener('click', openShelf);
  close.addEventListener('click', () => closeShelf());
  dialog.addEventListener('close', () => { if (!dialog.open) restoreShelf(); });
  // A selected card's original listener renders the manuscript first. Moving
  // the existing shelf retains its search/filter/card handlers and scroll.
  dialog.addEventListener('click', event => {
    if (event.target.closest?.('.manuscript-card')) win.queueMicrotask(() => closeShelf({focusReader: true}));
    if (event.target === dialog) {
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeShelf();
    }
  }, true);
  const onKey = event => {
    if (event.key === 'Escape' && work.open && !dialog.open) {
      work.open = false;
      summary.focus({preventScroll: true});
      event.stopPropagation();
    }
  };
  const onOutside = event => { if (active && work.open && !work.contains(event.target)) work.open = false; };
  room.addEventListener('keydown', onKey);
  room.addEventListener('pointerdown', onOutside);

  // Preserve the master illustration's aspect ratio. Fit its normalized study
  // rectangle (.085, .33, .35, .28) over the room, rather than stretching it.
  const master = new win.Image();
  const resizeScene = () => {
    if (!active || !master.naturalWidth || !master.naturalHeight) return;
    const width = room.clientWidth, height = room.clientHeight;
    const scale = Math.max(width / (master.naturalWidth * .35), height / (master.naturalHeight * .28));
    const imageWidth = master.naturalWidth * scale, imageHeight = master.naturalHeight * scale;
    scene.style.backgroundSize = `${imageWidth}px ${imageHeight}px`;
    scene.style.backgroundPosition = `${(width - imageWidth * .35) / 2 - imageWidth * .085}px ${(height - imageHeight * .28) / 2 - imageHeight * .33}px`;
  };
  master.addEventListener('load', resizeScene);
  master.src = new URL('./assets/castle-cutaway-v1.webp', import.meta.url).href;
  const resizeObserver = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(resizeScene) : null;
  resizeObserver?.observe(room);
  win.addEventListener('resize', resizeScene);

  const sync = () => {
    if (destroyed) return;
    const next = isEligible();
    if (next === active) return;
    active = next;
    if (active) {
      room.prepend(scene, surface, actor);
      room.append(nav, dialog);
      room.dataset.spatialDesk = 'ready';
      for (const selector of ['.desk-toolbar', '#reader-qol', '.desk-footer', '#draft-kind', '#draft-meta', '#desk-connect']) {
        move(desk.querySelector(selector), workBody);
      }
      // Live copy/error feedback remains beside the paper, not in a closed drawer.
      move(doc.getElementById('desk-operation'), desk);
      resizeScene();
    } else {
      if (dialog.open) dialog.close();
      restoreShelf();
      work.open = false;
      restoreMoves();
      delete room.dataset.spatialDesk;
      for (const node of [scene, surface, actor, nav, dialog]) node.remove();
    }
  };
  const observer = new win.MutationObserver(sync);
  observer.observe(room, {attributes: true, attributeFilter: ['data-account', 'hidden']});
  observer.observe(doc.body, {attributes: true, attributeFilter: ['class']});
  const api = {openShelf, closeShelf, destroy() {
    if (destroyed) return;
    observer.disconnect();
    resizeObserver?.disconnect();
    win.removeEventListener('resize', resizeScene);
    room.removeEventListener('keydown', onKey);
    room.removeEventListener('pointerdown', onOutside);
    active = false;
    if (dialog.open) dialog.close();
    restoreShelf();
    restoreMoves();
    for (const node of [scene, surface, actor, nav, dialog]) node.remove();
    delete room.dataset.spatialDesk;
    installations.delete(doc);
    destroyed = true;
  }};
  installations.set(doc, api);
  sync();
  return api;
}
