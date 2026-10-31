/* Isolated spatial prototype. No data requests, persistence, or source-record changes.
   The bootstrap opts in with body.spatial-prototype and calls this installer. */
import {publishingAccounts} from './accounts.js?v=20261031.9-world';

// Observed rectangles from command-castle-cutaway-v1-zones.json. The same
// master artwork underlies the overview and these four publishing rooms.
const rooms = Object.freeze({
  insurance: {name: '書簡の書斎', rect: [.085, .33, .35, .28]},
  otoku: {name: '紫の目利き書庫', rect: [.17, .06, .27, .25]},
  rakuten: {name: '琥珀の贈りもの室', rect: [.58, .34, .34, .27]},
  lottery: {name: '緑青の天文室', rect: [.62, .05, .25, .27]}
});
const installations = new WeakMap();

export function installSpatialDesk({document: doc = globalThis.document, openRoom, roomScenes = {}} = {}) {
  if (installations.has(doc)) return installations.get(doc);
  const win = doc.defaultView;
  const room = doc.getElementById('room');
  const desk = doc.getElementById('desk');
  const shelf = room?.querySelector('.manuscript-shelf');
  if (!win || !room || !desk || !shelf) throw new Error('Spatial desk needs the existing lounge reader.');
  const assetRoot = new URL('./assets/', import.meta.url);
  const masterURL = new URL('castle-cutaway-v1.webp', assetRoot).href;
  const interiors = new Map();
  for (const key of Object.keys(rooms)) {
    const config = roomScenes[key];
    if (!config) continue;
    if (typeof config.url !== 'string') throw new TypeError('A room scene needs a repository asset URL: ' + key);
    const url = new URL(config.url, import.meta.url);
    if (url.protocol !== assetRoot.protocol || url.origin !== assetRoot.origin || !url.pathname.startsWith(assetRoot.pathname) || !/\.(webp|png|jpe?g|avif)$/i.test(url.pathname)) {
      throw new TypeError('Room scenes must use raster images in lounge/assets: ' + key);
    }
    const position = config.position ?? 'center';
    if (typeof position !== 'string' || !/^(?:(?:left|center|right|top|bottom|-?(?:\d+(?:\.\d+)?|\.\d+)(?:%|px))\s*){1,4}$/.test(position.trim())) {
      throw new TypeError('Unsupported room scene position: ' + key);
    }
    interiors.set(key, {url: url.href, position: position.trim(), state: 'idle', image: null});
  }

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
  const nav = make('nav', 'spatial-desk-nav');
  nav.setAttribute('aria-label', '部屋の道具');
  const shelfButton = make('button', 'spatial-shelf-open', '原稿棚');
  shelfButton.type = 'button';
  shelfButton.setAttribute('aria-haspopup', 'dialog');
  shelfButton.setAttribute('aria-controls', 'spatial-shelf-dialog');
  shelfButton.setAttribute('aria-expanded', 'false');
  const work = make('details', 'spatial-work');
  const summary = make('summary', '', '作業・状態');
  const workBody = make('div', 'spatial-work-body');
  const metadata = make('div', 'spatial-draft-metadata');
  const article = doc.getElementById('desk-article');
  const status = doc.getElementById('desk-status');
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

  const identity = make('button', 'spatial-room-name');
  identity.type = 'button';
  identity.setAttribute('aria-haspopup', 'dialog');
  identity.setAttribute('aria-controls', 'spatial-room-dialog');
  identity.setAttribute('aria-expanded', 'false');
  const picker = make('dialog', 'spatial-room-dialog');
  picker.id = 'spatial-room-dialog';
  picker.setAttribute('aria-labelledby', 'spatial-room-dialog-title');
  const pickerHeading = make('header', 'spatial-shelf-heading');
  const pickerTitle = make('h2', '', 'この部屋と行き先');
  pickerTitle.id = 'spatial-room-dialog-title';
  const pickerClose = make('button', '', '閉じる');
  pickerClose.type = 'button';
  pickerClose.setAttribute('aria-label', '部屋の行き先を閉じる');
  pickerHeading.append(pickerTitle, pickerClose);
  const accountIdentity = make('section', 'spatial-account-identity');
  accountIdentity.setAttribute('aria-label', '現在のアカウント');
  const accountName = make('h3'), accountHandle = make('p'), roomName = make('p', 'spatial-room-description');
  accountIdentity.append(accountName, accountHandle, roomName);
  const destinations = make('nav', 'spatial-quick-destinations');
  destinations.setAttribute('aria-label', '持ち場を切り替える');
  picker.append(pickerHeading, accountIdentity, destinations);

  let active = false, destroyed = false, shelfAnchor = null, previousFocus = null;
  let closeFocus = null, lastStatus = null, currentAccount = null, pickerOpen = false;
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
    Object.hasOwn(rooms, room.dataset.account) && !room.hidden;
  const syncState = () => {
    if (!active) return;
    metadata.hidden = !!article?.hidden;
    const message = status?.textContent || '';
    // Preserve the existing reader's automatic failure disclosure even though
    // its original status details now lives inside the secondary-tools drawer.
    if (message !== lastStatus && /失敗|未確認|できません|エラー/.test(message)) work.open = true;
    lastStatus = message;
  };
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
  const restorePicker = () => {
    if (!pickerOpen) return;
    pickerOpen = false;
    identity.setAttribute('aria-expanded', 'false');
    if (active && isEligible()) identity.focus({preventScroll: true});
  };
  const closeRoomPicker = ({restoreFocus = true} = {}) => {
    if (!restoreFocus) { pickerOpen = false; identity.setAttribute('aria-expanded', 'false'); }
    if (picker.open) picker.close();
    restorePicker();
  };
  const openRoomPicker = () => {
    if (!active || !isEligible() || picker.open) return false;
    closeShelf();
    work.open = false;
    picker.showModal();
    pickerOpen = true;
    identity.setAttribute('aria-expanded', 'true');
    pickerClose.focus({preventScroll: true});
    return true;
  };
  identity.addEventListener('click', openRoomPicker);
  pickerClose.addEventListener('click', () => closeRoomPicker());
  picker.addEventListener('close', () => { if (!picker.open) restorePicker(); });
  for (const destination of [...publishingAccounts.filter(account => Object.hasOwn(rooms, account.key)), {key: 'sourcing', name: '仕入れ帳', handle: ''}]) {
    const button = make('button', 'spatial-destination');
    button.type = 'button';
    button.dataset.destination = destination.key;
    button.append(make('strong', '', destination.name), make('span', '', destination.handle || '購入・在庫・売却'));
    button.disabled = typeof openRoom !== 'function';
    button.addEventListener('click', () => {
      if (destination.key === currentAccount) { closeRoomPicker(); return; }
      closeRoomPicker({restoreFocus: false});
      // The bootstrap owns the existing safe home→route handoff. In particular,
      // sourcing keeps its direct native ledger route, not a new mandatory room.
      openRoom?.(destination.key);
    });
    destinations.append(button);
  }
  const openShelf = () => {
    if (!active || !isEligible() || dialog.open) return false;
    closeRoomPicker({restoreFocus: false});
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
    if (event.key === 'Escape' && work.open && !dialog.open && !picker.open) {
      work.open = false;
      summary.focus({preventScroll: true});
      event.stopPropagation();
    }
  };
  const onOutside = event => { if (active && work.open && !work.contains(event.target)) work.open = false; };
  // Bubble after the existing button listener has scrolled/focused the reader.
  // Do not leave the new tool disclosure covering its requested destination.
  workBody.addEventListener('click', event => {
    if (active && event.target.closest?.('#desk-read')) work.open = false;
  });
  room.addEventListener('keydown', onKey);
  room.addEventListener('pointerdown', onOutside);

  // Preserve the master illustration's aspect ratio while fitting each observed
  // normalized room rectangle, rather than stretching or replacing its scene.
  const master = new win.Image();
  const resizeScene = () => {
    if (!active || room.dataset.spatialScene === 'interior' || !master.naturalWidth || !master.naturalHeight) return;
    const [x, y, w, h] = rooms[currentAccount].rect;
    const width = room.clientWidth, height = room.clientHeight;
    const scale = Math.max(width / (master.naturalWidth * w), height / (master.naturalHeight * h));
    const imageWidth = master.naturalWidth * scale, imageHeight = master.naturalHeight * scale;
    scene.style.backgroundSize = `${imageWidth}px ${imageHeight}px`;
    scene.style.backgroundPosition = `${(width - imageWidth * w) / 2 - imageWidth * x}px ${(height - imageHeight * h) / 2 - imageHeight * y}px`;
  };
  master.addEventListener('load', resizeScene);
  const showInterior = key => {
    const interior = interiors.get(key);
    if (destroyed || !active || currentAccount !== key || interior?.state !== 'ready') return;
    scene.style.backgroundImage = `url(${JSON.stringify(interior.url)})`;
    scene.style.backgroundSize = 'cover';
    scene.style.backgroundPosition = interior.position;
    scene.dataset.interiorStatus = 'ready';
    room.dataset.spatialScene = 'interior';
  };
  const prepareInterior = key => {
    const interior = interiors.get(key);
    if (!interior) return;
    if (interior.state === 'ready') { showInterior(key); return; }
    if (interior.state === 'loading' || interior.state === 'failed') {
      scene.dataset.interiorStatus = interior.state;
      return;
    }
    interior.state = 'loading';
    scene.dataset.interiorStatus = 'loading';
    const image = new win.Image();
    interior.image = image;
    const finish = success => {
      if (destroyed || interior.state !== 'loading') return;
      image.onload = null;
      image.onerror = null;
      interior.image = null;
      interior.state = success ? 'ready' : 'failed';
      // An asset may finish after a different account has opened. Cache it,
      // but never replace that account's scene or delay its working reader.
      if (!active || currentAccount !== key) return;
      if (success) showInterior(key);
      else scene.dataset.interiorStatus = 'failed';
    };
    image.onload = async () => {
      try {
        if (typeof image.decode === 'function') await image.decode();
        finish(image.naturalWidth > 0 && image.naturalHeight > 0);
      } catch { finish(false); }
    };
    image.onerror = () => finish(false);
    image.src = interior.url;
  };
  const resizeObserver = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(resizeScene) : null;
  resizeObserver?.observe(room);
  win.addEventListener('resize', resizeScene);

  const deactivate = () => {
    active = false;
    currentAccount = null;
    if (dialog.open) dialog.close();
    restoreShelf();
    closeRoomPicker({restoreFocus: false});
    work.open = false;
    restoreMoves();
    delete room.dataset.spatialDesk;
    delete room.dataset.spatialScene;
    for (const node of [scene, surface, actor, nav, dialog, identity, picker]) node.remove();
  };
  const sync = () => {
    if (destroyed) return;
    const next = isEligible() ? room.dataset.account : null;
    if (next === currentAccount) return;
    // Account→account remains eligible, but must still restore and remount so
    // crop, companion, identity, drawer state, and focus belong to the new room.
    if (active) deactivate();
    if (next) {
      active = true;
      currentAccount = next;
      const config = rooms[next], account = publishingAccounts.find(value => value.key === next);
      const [x, y, w, h] = config.rect;
      scene.dataset.account = next;
      const interior = interiors.get(next);
      // Always paint the existing master first. High-resolution art is an
      // enhancement after a successful decode, never a blank-room dependency.
      room.dataset.spatialScene = 'master';
      scene.dataset.interiorStatus = interior?.state || 'unconfigured';
      scene.style.backgroundImage = `url(${JSON.stringify(masterURL)})`;
      scene.style.backgroundSize = `${100 / w}% ${100 / h}%`;
      scene.style.backgroundPosition = `${100 * x / (1 - w)}% ${100 * y / (1 - h)}%`;
      if (!master.src) master.src = masterURL;
      actor.src = new URL(`./assets/${next}-desk-actor.webp`, import.meta.url).href;
      identity.textContent = account.name + ' ⌄';
      identity.setAttribute('aria-label', account.name + ' ' + account.handle + '。現在の部屋と行き先を開く');
      accountName.textContent = account.name;
      accountHandle.textContent = account.handle;
      roomName.textContent = config.name;
      for (const button of destinations.children) {
        if (button.dataset.destination === next) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
      }
      room.prepend(scene, surface, actor);
      room.append(nav, dialog, picker);
      room.querySelector('.room-caption')?.append(identity);
      room.dataset.spatialDesk = 'ready';
      for (const selector of ['.desk-toolbar', '#reader-qol', '.desk-footer', '#draft-kind', '#draft-meta', '#desk-connect']) {
        move(desk.querySelector(selector), ['#draft-kind', '#draft-meta'].includes(selector) ? metadata : workBody);
      }
      workBody.append(metadata);
      lastStatus = null;
      syncState();
      // Live copy/error feedback remains beside the paper, not in a closed drawer.
      move(doc.getElementById('desk-operation'), desk);
      resizeScene();
      prepareInterior(next);
    }
  };
  const observer = new win.MutationObserver(() => { sync(); syncState(); });
  observer.observe(room, {attributes: true, attributeFilter: ['data-account', 'hidden']});
  observer.observe(doc.body, {attributes: true, attributeFilter: ['class']});
  if (article) observer.observe(article, {attributes: true, attributeFilter: ['hidden']});
  if (status) observer.observe(status, {childList: true, characterData: true, subtree: true});
  const api = {openShelf, closeShelf, openRoomPicker, closeRoomPicker, destroy() {
    if (destroyed) return;
    observer.disconnect();
    resizeObserver?.disconnect();
    win.removeEventListener('resize', resizeScene);
    master.removeEventListener('load', resizeScene);
    for (const interior of interiors.values()) {
      if (interior.image) { interior.image.onload = null; interior.image.onerror = null; interior.image = null; }
    }
    room.removeEventListener('keydown', onKey);
    room.removeEventListener('pointerdown', onOutside);
    deactivate();
    installations.delete(doc);
    destroyed = true;
  }};
  installations.set(doc, api);
  sync();
  return api;
}
