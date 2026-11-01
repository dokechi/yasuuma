/* Adapter contracts on the real lounge DOM. Native modal geometry, image paint,
   focus trapping and contrast are verified separately by the Chrome journey. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {installSpatialDesk} from '../command-center-98/lounge/spatial-desk.js';
import {publishingAccounts} from '../command-center-98/lounge/accounts.js';

const {JSDOM} = createRequire(import.meta.url)('jsdom');
const html = fs.readFileSync(new URL('../command-center-98/lounge/index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../command-center-98/lounge/spatial-desk.css', import.meta.url), 'utf8');
const accounts = ['insurance', 'otoku', 'rakuten', 'lottery'];
const flush = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return {promise, resolve}; };
const sceneConfig = Object.fromEntries(accounts.map(key => [key, {url: './assets/test-scene-' + key + '.webp', position: 'center 40%'}]));

function setup(t) {
  const dom = new JSDOM(html, {url: 'https://prototype.invalid/command-center-98/lounge/index.html', runScripts: 'outside-only'});
  const win = dom.window, doc = win.document, $ = selector => doc.querySelector(selector);
  const images = [], observers = [], installed = [], calls = {copy: 0, read: 0, query: 0, select: 0, fetch: 0, storage: 0, destinations: []};
  class Image {
    constructor() { this.src = ''; this.naturalWidth = 0; this.naturalHeight = 0; this.onload = null; this.onerror = null; this.listeners = new Map(); images.push(this); }
    addEventListener(type, callback) { this.listeners.set(type, callback); }
    removeEventListener(type, callback) { if (this.listeners.get(type) === callback) this.listeners.delete(type); }
    decode() { return this.decoding || Promise.resolve(); }
    load() { this.naturalWidth = 1536; this.naturalHeight = 1024; this.listeners.get('load')?.(); return this.onload?.(); }
    fail() { this.onerror?.(); }
  }
  win.Image = Image;
  win.ResizeObserver = class {
    constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
    observe(node) { this.node = node; }
    disconnect() { this.disconnected = true; }
  };
  win.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  // Queue close like the native event, to exercise close/reopen races. This does
  // not emulate browser focus trapping or claim that jsdom paints a top layer.
  win.HTMLDialogElement.prototype.close = function () {
    this.open = false;
    win.queueMicrotask(() => this.dispatchEvent(new win.Event('close')));
  };
  win.fetch = () => { calls.fetch++; throw new Error('Unexpected data request'); };
  const setItem = win.Storage.prototype.setItem;
  win.localStorage.setItem('existing-owner-note', 'untouched');
  win.Storage.prototype.setItem = function (...args) { calls.storage++; return setItem.apply(this, args); };

  const room = $('#room'), desk = $('#desk'), shelf = $('.manuscript-shelf'), article = $('#desk-article');
  const rows = Object.freeze([
    Object.freeze({title: '保存原稿 一', body: '保存された本文一。条件と出典を確認します。'}),
    Object.freeze({title: '保存原稿 二', body: '保存された本文二。そのままコピーします。'})
  ]);
  const source = JSON.stringify(rows);
  const show = row => {
    article.hidden = !row;
    if (row) { $('#draft-title').textContent = row.title; $('#draft-body').textContent = row.body; $('#draft-kind').textContent = '投稿本文'; $('#draft-meta').textContent = '資料確認済み'; }
  };
  const renderList = () => {
    const matching = rows.filter(row => row.title.includes($('#desk-query').value));
    $('#desk-list').replaceChildren();
    for (const row of matching) {
      const button = doc.createElement('button'); button.className = 'manuscript-card'; button.textContent = row.title;
      button.addEventListener('click', () => { calls.select++; show(row); });
      $('#desk-list').append(button);
    }
    if (!matching.length) show(null); else if (article.hidden) show(matching[0]);
  };
  // Synthetic owner callbacks deliberately predate the adapter. Their identity,
  // event count and source text must survive moving the actual controls.
  $('#desk-query').addEventListener('input', () => { calls.query++; renderList(); });
  $('#desk-copy').addEventListener('click', () => { calls.copy++; calls.copied = $('#draft-body').textContent; });
  $('#desk-read').addEventListener('click', () => { calls.read++; $('#desk-scroll').focus(); });
  show(rows[0]); renderList();
  const before = desk.innerHTML;
  const nodes = Object.fromEntries(['desk-query', 'desk-copy', 'desk-read', 'desk-operation', 'draft-kind', 'draft-meta'].map(id => [id, doc.getElementById(id)]));
  const install = options => {
    const api = installSpatialDesk({document: doc, openRoom: key => calls.destinations.push(key), ...options});
    installed.push(api); return api;
  };
  const enter = async key => { doc.body.classList.add('spatial-atelier'); room.dataset.account = key; room.hidden = false; await flush(); };
  const input = async text => { $('#desk-query').value = text; $('#desk-query').dispatchEvent(new win.Event('input', {bubbles: true})); await flush(); };
  const unchanged = () => { assert.equal(JSON.stringify(rows), source); assert.equal(calls.fetch, 0); assert.equal(calls.storage, 0); assert.equal(win.localStorage.getItem('existing-owner-note'), 'untouched'); };
  t.after(() => { for (const api of installed) api.destroy(); dom.window.close(); });
  return {win, doc, $, room, desk, shelf, article, rows, before, nodes, images, observers, calls, install, enter, input, unchanged};
}

test('opt-in mount is idempotent, four direct account transitions remount once, and FP/destroy restore exact DOM', async t => {
  const b = setup(t), api = b.install();
  assert.equal(b.install(), api); assert.equal(b.observers.length, 1);
  assert.equal(b.$('.spatial-desk-nav'), null);
  await b.enter('fp'); assert.equal(b.$('.spatial-desk-nav'), null);
  for (const key of accounts) {
    await b.enter(key);
    assert.equal(b.room.dataset.spatialDesk, 'ready');
    assert.equal(b.$('.spatial-study-scene').dataset.account, key);
    assert.ok(b.$('.spatial-desk-actor').src.endsWith('/' + key + '-desk-actor.webp'));
    assert.equal(b.doc.querySelectorAll('.spatial-desk-nav').length, 1);
    for (const [id, node] of Object.entries(b.nodes)) { assert.equal(b.doc.getElementById(id), node); assert.equal(b.doc.querySelectorAll('#' + id).length, 1); }
    assert.equal(b.nodes['desk-operation'].parentNode, b.desk, 'live operation feedback remains outside the closed tools');
    b.$('#desk-copy').click();
  }
  assert.equal(b.calls.copy, 4); assert.equal(b.calls.copied, b.rows[0].body);
  await b.enter('fp'); assert.equal(b.desk.innerHTML, b.before); assert.equal(b.room.dataset.spatialDesk, undefined);
  await b.enter('lottery'); api.openShelf(); api.destroy(); await flush();
  assert.equal(b.desk.innerHTML, b.before); assert.equal(b.room.dataset.spatialScene, undefined);
  assert.equal(b.$('.spatial-room-name'), null); assert.equal(b.$('.spatial-shelf-dialog'), null);
  assert.ok(b.observers.every(observer => observer.disconnected));
  const reinstalled = b.install(); assert.notEqual(reinstalled, api);
  b.$('#desk-copy').click(); assert.equal(b.calls.copy, 5, 'reinstall does not duplicate the original copy listener');
  reinstalled.destroy(); assert.equal(b.desk.innerHTML, b.before); b.unchanged();
});

test('the same shelf/search/card nodes keep handlers, selection and focus; queued close cannot close a reopened shelf', async t => {
  const b = setup(t), api = b.install(); await b.enter('insurance');
  const opener = b.$('.spatial-shelf-open'); opener.focus(); api.openShelf();
  assert.equal(b.shelf.parentNode.className, 'spatial-shelf-host'); assert.equal(b.doc.activeElement, b.nodes['desk-query']);
  await b.input('保存原稿 二'); assert.equal(b.doc.querySelectorAll('.manuscript-card').length, 1);
  b.$('.manuscript-card').click(); await flush();
  assert.equal(b.calls.query, 1); assert.equal(b.calls.select, 1);
  assert.equal(b.$('#draft-title').textContent, b.rows[1].title); assert.equal(b.$('#draft-body').textContent, b.rows[1].body);
  assert.equal(b.shelf.parentNode, b.$('.desk-content')); assert.equal(b.doc.activeElement, b.$('#desk-scroll'));
  opener.focus(); api.openShelf(); api.closeShelf(); assert.equal(b.doc.activeElement, opener);
  api.openShelf(); await flush();
  assert.equal(b.$('#spatial-shelf-dialog').open, true); assert.equal(b.shelf.parentNode.className, 'spatial-shelf-host');
  // Native Escape is represented by its resulting close event in this DOM test.
  b.$('#spatial-shelf-dialog').close(); await flush();
  assert.equal(b.doc.activeElement, opener); assert.equal(b.shelf.parentNode, b.$('.desk-content')); b.unchanged();
});

test('zero-result search hides moved metadata; data failures disclose the outer drawer without repeated reopening', async t => {
  const b = setup(t), api = b.install(); await b.enter('insurance'); api.openShelf();
  await b.input('存在しない原稿');
  assert.equal(b.doc.querySelectorAll('.manuscript-card').length, 0); assert.equal(b.article.hidden, true);
  assert.equal(b.$('.spatial-draft-metadata').hidden, true);
  assert.equal(b.$('#draft-meta').textContent, '資料確認済み', 'owner may retain old text; the adapter must hide it');
  await b.input(''); assert.equal(b.article.hidden, false); assert.equal(b.$('.spatial-draft-metadata').hidden, false);
  api.closeShelf(); const work = b.$('.spatial-work'); work.open = false;
  b.$('#desk-status').textContent = '保存原稿を読込済み'; await flush(); assert.equal(work.open, false);
  b.$('#desk-status').textContent = '保存原稿の読取に失敗しました'; await flush(); assert.equal(work.open, true);
  work.open = false; await flush(); assert.equal(work.open, false, 'intentional dismissal remains dismissed');
  b.$('#desk-status').textContent = '別の通信エラーを確認してください'; await flush(); assert.equal(work.open, true);
  b.doc.body.classList.remove('spatial-atelier'); await flush();
  assert.equal(b.$('#draft-meta').parentNode, b.article); assert.equal(b.$('.spatial-draft-metadata'), null); b.unchanged();
});

test('read action preserves its existing callback/focus then closes the covering work drawer', async t => {
  const b = setup(t); b.install(); await b.enter('insurance');
  b.$('.spatial-work').open = true; b.nodes['desk-read'].click();
  assert.equal(b.calls.read, 1); assert.equal(b.doc.activeElement, b.$('#desk-scroll')); assert.equal(b.$('.spatial-work').open, false);
  await b.enter('rakuten'); b.$('.spatial-work').open = true; b.nodes['desk-read'].click();
  assert.equal(b.calls.read, 2); assert.equal(b.$('.spatial-work').open, false); b.unchanged();
});

test('picker shows canonical full identity and five destinations; only a different destination calls the supplied route once', async t => {
  const b = setup(t), api = b.install();
  for (const key of accounts) {
    await b.enter(key); const account = publishingAccounts.find(value => value.key === key);
    api.openRoomPicker();
    assert.equal(b.$('#spatial-room-dialog').open, true); assert.equal(b.$('.spatial-account-identity h3').textContent, account.name);
    assert.equal(b.$('.spatial-account-identity p').textContent, account.handle);
    assert.match(b.$('.spatial-room-name').getAttribute('aria-label'), new RegExp(account.handle));
    assert.deepEqual([...b.doc.querySelectorAll('.spatial-destination')].map(node => node.dataset.destination), [...accounts, 'sourcing']);
    b.$('.spatial-destination[aria-current=page]').click();
    assert.equal(b.$('#spatial-room-dialog').open, false); assert.equal(b.doc.activeElement, b.$('.spatial-room-name'));
  }
  assert.deepEqual(b.calls.destinations, []);
  api.openRoomPicker(); b.$('.spatial-destination[data-destination=sourcing]').click();
  assert.deepEqual(b.calls.destinations, ['sourcing']); assert.equal(b.$('#spatial-room-dialog').open, false);
  api.openRoomPicker(); api.closeRoomPicker(); api.openRoomPicker(); await flush();
  assert.equal(b.$('#spatial-room-dialog').open, true, 'queued old close does not reset reopened picker'); b.unchanged();
});

test('interiors swap only after decode; wrong-account late results and image/decode failures leave the usable master', async t => {
  const b = setup(t); b.install({roomScenes: sceneConfig});
  const imageFor = key => b.images.findLast(image => image.src.endsWith('/test-scene-' + key + '.webp'));
  await b.enter('insurance');
  assert.equal(b.room.dataset.spatialScene, 'master'); assert.equal(b.$('.spatial-study-scene').dataset.interiorStatus, 'loading');
  assert.match(b.$('.spatial-study-scene').style.backgroundImage, /castle-cutaway-v1\.webp/);
  b.images[0].load(); const pending = deferred(); imageFor('insurance').decoding = pending.promise;
  const load = imageFor('insurance').load(); await b.enter('otoku'); pending.resolve(); await load;
  assert.equal(b.room.dataset.spatialScene, 'master'); assert.equal(b.$('.spatial-study-scene').dataset.account, 'otoku');
  imageFor('otoku').fail(); assert.equal(b.room.dataset.spatialScene, 'master'); assert.equal(b.$('.spatial-study-scene').dataset.interiorStatus, 'failed');
  await b.enter('insurance'); assert.equal(b.room.dataset.spatialScene, 'interior'); assert.equal(b.$('.spatial-study-scene').style.backgroundSize, 'cover');
  assert.equal(b.$('.spatial-study-scene').style.backgroundPosition, 'center 40%');
  b.win.dispatchEvent(new b.win.Event('resize')); assert.equal(b.$('.spatial-study-scene').style.backgroundSize, 'cover');
  await b.enter('rakuten'); await imageFor('rakuten').load(); assert.equal(b.room.dataset.spatialScene, 'interior');
  await b.enter('lottery'); imageFor('lottery').decoding = Promise.reject(new Error('synthetic decode failure')); await imageFor('lottery').load();
  assert.equal(b.room.dataset.spatialScene, 'master'); assert.equal(b.$('.spatial-study-scene').dataset.interiorStatus, 'failed');
  assert.equal(b.$('#draft-body').textContent, b.rows[0].body); b.$('#desk-copy').click(); assert.equal(b.calls.copied, b.rows[0].body); b.unchanged();
});

test('destroy cancels scene listeners and a pending decode cannot recreate the removed room', async t => {
  const b = setup(t), api = b.install({roomScenes: sceneConfig}); await b.enter('insurance');
  const image = b.images.find(value => value.src.endsWith('/test-scene-insurance.webp')), pending = deferred();
  image.decoding = pending.promise; const load = image.load(); api.destroy();
  assert.equal(image.onload, null); assert.equal(image.onerror, null); assert.equal(b.images[0].listeners.has('load'), false);
  assert.ok(b.observers.every(observer => observer.disconnected)); pending.resolve(); await load;
  b.win.dispatchEvent(new b.win.Event('resize')); await flush();
  assert.equal(b.room.dataset.spatialDesk, undefined); assert.equal(b.room.dataset.spatialScene, undefined);
  assert.equal(b.$('.spatial-study-scene'), null); assert.equal(b.desk.innerHTML, b.before); b.unchanged();
});

test('a partial initial mount rolls back moved nodes, listeners and registration before rethrowing', async t => {
  const b = setup(t); await b.enter('insurance');
  const append = b.win.Element.prototype.append, failure = new Error('synthetic failure after first tool move');
  b.win.Element.prototype.append = function (...nodes) {
    if (this.className === 'spatial-work-body' && nodes.some(node => node.id === 'reader-qol')) throw failure;
    return append.apply(this, nodes);
  };
  try { assert.throws(() => b.install(), error => error === failure); }
  finally { b.win.Element.prototype.append = append; }
  assert.equal(b.desk.innerHTML, b.before, 'even the inserted placeholder and already moved toolbar are restored');
  assert.equal(b.room.dataset.spatialDesk, undefined); assert.equal(b.room.dataset.spatialScene, undefined);
  assert.equal(b.$('.spatial-desk-nav'), null); assert.equal(b.$('.spatial-room-name'), null);
  assert.ok(b.observers.every(observer => observer.disconnected)); assert.equal(b.images[0].listeners.has('load'), false);
  const replacement = b.install(); assert.equal(b.room.dataset.spatialDesk, 'ready', 'failed instance is not cached');
  replacement.destroy(); assert.equal(b.desk.innerHTML, b.before); b.unchanged();
});

test('a late observer mount failure restores the working reader and permits a clean reinstall', async t => {
  const b = setup(t), warnings = [], errors = [];
  b.win.console.warn = (...args) => warnings.push(args);
  b.win.addEventListener('error', event => { errors.push(event.error); event.preventDefault(); });
  b.install({roomPresentation: {insurance: {name: '保険の章'}}});
  const append = b.win.Element.prototype.append, failure = new Error('late presentation mount failure');
  b.win.Element.prototype.append = function (...nodes) {
    if (this.className === 'spatial-work-body' && nodes.some(node => node.id === 'reader-qol')) throw failure;
    return append.apply(this, nodes);
  };
  try { await b.enter('insurance'); }
  finally { b.win.Element.prototype.append = append; }
  assert.deepEqual(errors, [], 'an optional observer failure is handled, not an uncaught browser error');
  assert.equal(warnings.length, 1); assert.equal(warnings[0][1], failure);
  assert.equal(b.desk.innerHTML, b.before, 'the original toolbar, metadata and status return to their exact positions');
  assert.equal(b.room.dataset.spatialDesk, undefined); assert.equal(b.$('.spatial-illustration-stage'), null);
  assert.equal(b.$('.spatial-desk-nav'), null); assert.equal(b.$('.spatial-room-name'), null);
  assert.ok(b.observers.every(observer => observer.disconnected));
  b.nodes['desk-copy'].click(); assert.equal(b.calls.copy, 1); assert.equal(b.calls.copied, b.rows[0].body);
  const replacement = b.install({roomPresentation: {insurance: {name: '保険の章'}}});
  assert.equal(b.room.dataset.spatialDesk, 'ready'); replacement.destroy();
  assert.equal(b.desk.innerHTML, b.before); b.unchanged();
});

test('scene configuration rejects remote/non-asset URLs and arbitrary CSS instead of loading them', t => {
  const b = setup(t);
  for (const url of ['https://untrusted.invalid/room.webp', '../index.html', './assets/../../private.webp', 'data:image/png;base64,AA']) {
    assert.throws(() => b.install({roomScenes: {insurance: {url}}}), /repository asset|lounge\/assets/);
  }
  assert.throws(() => b.install({roomScenes: {insurance: {url: './assets/room.webp', position: 'url(https://untrusted.invalid)'}}}), /Unsupported room scene position/);
  assert.equal(b.images.length, 0); assert.equal(b.$('.spatial-desk-nav'), null); b.unchanged();
});

test('CSS is gated to mounted atelier rooms, preserves hidden controls, and removes the synthetic slab for decoded interiors', t => {
  const b = setup(t), style = b.doc.createElement('style'); style.textContent = css; b.doc.head.append(style);
  const rules = [...style.sheet.cssRules].flatMap(rule => rule.cssRules ? [...rule.cssRules] : [rule]);
  const splitSelectors = selector => {
    let depth = 0, start = 0; const result = [];
    for (let i = 0; i < selector.length; i++) {
      if ('(['.includes(selector[i])) depth++; else if (')]'.includes(selector[i])) depth--;
      else if (selector[i] === ',' && depth === 0) { result.push(selector.slice(start, i).trim()); start = i + 1; }
    }
    result.push(selector.slice(start).trim()); return result;
  };
  for (const rule of rules) if (rule.selectorText) {
    if (rule.selectorText === 'body.spatial-atelier') {
      assert.equal(rule.style.length, 1, 'the sole unmounted rule is a nonvisual readiness token');
      assert.equal(rule.style.getPropertyValue('--spatial-reader-ready'), '1');
      continue;
    }
    assert.ok(splitSelectors(rule.selectorText).every(selector => selector.startsWith("body.spatial-atelier #room[data-spatial-desk='ready']")), rule.selectorText);
  }
  b.doc.body.classList.add('spatial-atelier');
  assert.equal(b.win.getComputedStyle(b.doc.body).getPropertyValue('--spatial-reader-ready').trim(), '1');
  const hidden = rules.find(rule => rule.selectorText?.endsWith(' [hidden]'));
  assert.ok(hidden); assert.equal(hidden.style.getPropertyValue('display'), 'none'); assert.equal(hidden.style.getPropertyPriority('display'), 'important');
  const interior = rules.find(rule => rule.selectorText?.includes("[data-spatial-scene='interior'] .spatial-writing-surface"));
  assert.equal(interior.style.getPropertyValue('display'), 'none');
  const room = rules.find(rule => rule.selectorText === "body.spatial-atelier #room[data-spatial-desk='ready']");
  assert.equal(room.style.getPropertyValue('overflow'), 'clip', 'decorative overflow cannot scroll the room beneath fixed tools');
  const seam = rules.find(rule => rule.selectorText?.includes(":is([data-account='rakuten'],[data-account='lottery']) .spatial-desk-actor"));
  assert.match(seam.style.getPropertyValue('mask-image'), /84%.*transparent 100%/);
  // This jsdom version miscomputes some !important cascades. Do not claim a
  // computed-visibility/contrast pass here; the real Chrome suite owns that.
});


test('explicit paper presentation never fetches legacy art and keeps four identities and the original reader', async t => {
  const b = setup(t);
  const roomPresentation = Object.fromEntries(accounts.map(key => [key, {name: key + 'の章', actorURL: './assets/storybook-' + key + '.webp', fallbackColor: '#ECE1E9'}]));
  const api = b.install({roomPresentation});
  for (const key of accounts) {
    await b.enter(key);
    assert.equal(b.room.dataset.spatialScene, 'paper');
    assert.equal(b.$('.spatial-study-scene').style.backgroundImage, 'none');
    assert.equal(b.$('.spatial-study-scene').parentElement, b.$('.spatial-illustration-stage'));
    assert.equal(b.$('.spatial-desk-actor').parentElement, b.$('.spatial-illustration-stage'));
    assert.equal(b.doc.querySelectorAll('.spatial-illustration-stage').length, 1);
    assert.equal(b.$('.spatial-study-scene').style.backgroundColor, 'rgb(236, 225, 233)');
    assert.ok(b.$('.spatial-desk-actor').src.endsWith('/storybook-' + key + '.webp'));
    assert.equal(b.$('.spatial-room-description').textContent, key + 'の章');
    assert.equal(b.$('.spatial-account-identity p').textContent, publishingAccounts.find(account => account.key === key).handle);
    assert.ok(b.images.every(image => !image.src), 'no master or unconfigured scene request');
    b.$('#desk-copy').click();
  }
  assert.equal(b.calls.copy, 4);
  api.destroy(); assert.equal(b.desk.innerHTML, b.before); b.unchanged();
});

test('paper presentation decodes new scenes independently, ignores late room results, and retains paper on failure', async t => {
  const b = setup(t), roomPresentation = Object.fromEntries(accounts.map(key => [key, {name: key + 'の章'}]));
  b.install({roomPresentation, roomScenes: sceneConfig}); await b.enter('insurance');
  assert.equal(b.$('.spatial-desk-actor').hidden, true); assert.equal(b.$('.spatial-desk-actor').hasAttribute('src'), false);
  const first = b.images.find(image => image.src.endsWith('test-scene-insurance.webp'));
  const delayed = deferred(); first.decoding = delayed.promise; const loading = first.load();
  await b.enter('otoku'); delayed.resolve(); await loading;
  assert.equal(b.room.dataset.spatialScene, 'paper'); assert.equal(b.$('.spatial-study-scene').style.backgroundImage, 'none');
  b.images.find(image => image.src.endsWith('test-scene-otoku.webp')).fail();
  assert.equal(b.room.dataset.spatialScene, 'paper'); assert.equal(b.$('.spatial-study-scene').dataset.interiorStatus, 'failed');
  await b.enter('insurance'); assert.equal(b.room.dataset.spatialScene, 'interior');
  assert.match(b.$('.spatial-study-scene').style.backgroundImage, /test-scene-insurance/);
  assert.ok(b.images.every(image => !image.src.includes('castle-')), 'new rooms do not request legacy art even on failure');
  b.unchanged();
});

test('invalid presentation metadata fails before changing the DOM or loading art', t => {
  const b = setup(t);
  for (const value of [{actorURL:'https://other.invalid/actor.webp'},{actorURL:'../actor.webp'},{actorURL:'data:image/png,x'},{fallbackColor:'url(bad)'},{name:''}]) {
    assert.throws(() => b.install({roomPresentation: {insurance: value}}), /Room actor|fallback|name/);
    assert.equal(b.desk.innerHTML, b.before); assert.equal(b.images.length, 0);
  }
  b.unchanged();
});


test('storybook reader and native presentation sheets parse, stay opt-in, and avoid legacy image dependencies', t => {
  const b = setup(t);
  for (const file of ['../command-center-98/lounge/storybook-reader.css', '../command-center-98/storybook-workspace.css']) {
    const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8');
    const style = b.doc.createElement('style'); style.textContent = source; b.doc.head.append(style);
    assert.ok(style.sheet, file);
    assert.doesNotMatch(source, /castle-(?:cutaway|interior)|desk-actor\.webp|assets\/(?:red|orange|purple|silver)\.webp/);
    const rules = [];
    const walk = list => { for (const rule of list) { if (rule.selectorText) rules.push(rule); if (rule.cssRules) walk(rule.cssRules); } };
    walk(style.sheet.cssRules); assert.ok(rules.length > 50);
    for (const rule of rules) assert.match(rule.selectorText, /^body\.storybook-(?:atelier|host)/, rule.selectorText);
  }
  b.unchanged();
});

test('storybook paper preserves readable text, actionable controls, hidden state and compact mobile notebook geometry', t => {
  const b = setup(t), style = b.doc.createElement('style');
  style.textContent = fs.readFileSync(new URL('../command-center-98/lounge/storybook-reader.css', import.meta.url), 'utf8'); b.doc.head.append(style);
  const all = []; const walk = rules => { for (const r of rules) { if(r.selectorText)all.push(r); if(r.cssRules)walk(r.cssRules); } }; walk(style.sheet.cssRules);
  const rulesFor = suffix => all.filter(r => r.selectorText.endsWith(suffix));
  assert.ok(rulesFor(' #draft-body').every(r => Number.parseInt(r.style.getPropertyValue('font-size')) >= 16));
  assert.ok(rulesFor(' .reader-actions button').some(r => r.style.getPropertyValue('min-height') === '44px'));
  assert.ok(rulesFor(' .reading-desk').some(r => r.style.getPropertyValue('border') === '0' && r.style.getPropertyValue('box-shadow') === 'none'), 'the manuscript is a leaf, not an independent card');
  assert.ok(all.some(r => r.selectorText.endsWith("#room[data-spatial-desk='ready']::before") && r.style.getPropertyValue('background').includes('--sb-book-split')), 'one shared open-book plane holds both leaves');
  assert.ok(all.some(r => r.style.getPropertyValue('--sb-reader-inset').startsWith('112px')));
  assert.ok(rulesFor(' .spatial-illustration-stage').some(r => r.style.getPropertyValue('display') === 'none'), 'mobile omits the tiny decorative cameo');
  assert.ok(rulesFor(' .living-toggle').some(r => r.style.getPropertyValue('width') === '76px' && r.style.getPropertyValue('white-space') === 'nowrap'), 'the two-character tool label remains horizontal');
  assert.ok(rulesFor(' .spatial-desk-actor').some(r => r.style.getPropertyValue('left') === 'var(--story-actor-x,-40%)' && r.style.getPropertyValue('width') === 'var(--story-actor-w,140%)'), 'actor and page art use the same authored canvas coordinates');
  const hidden = all.find(r => r.selectorText === 'body.storybook-atelier [hidden]');
  assert.equal(hidden.style.getPropertyValue('display'), 'none'); assert.equal(hidden.style.getPropertyPriority('display'), 'important');
  assert.equal(all.find(r => r.selectorText === 'body.storybook-atelier').style.getPropertyValue('--storybook-reader-ready'), '1');
  b.unchanged();
});

test('working facing-leaf dock borrows the exact shelf, mobile dialog returns it, account change/destroy restores owner',async t=>{
 const b=setup(t),dock=b.doc.createElement('aside');dock.className='workbook-list';b.room.append(dock);const api=b.install({shelfDock:dock});
 await b.enter('insurance');assert.equal(b.shelf.parentNode,dock);assert.equal(b.$('#desk-query'),b.nodes['desk-query']);b.$('#desk-query').value='一';b.$('#desk-list').scrollTop=31;
 api.openShelf();assert.equal(b.shelf.closest('dialog').id,'spatial-shelf-dialog');api.closeShelf();await flush();assert.equal(b.shelf.parentNode,dock);assert.equal(b.$('#desk-query').value,'一');assert.equal(b.$('#desk-list').scrollTop,31);
 await b.enter('lottery');assert.equal(b.shelf.parentNode,dock);api.destroy();assert.equal(b.desk.innerHTML,b.before);assert.equal(b.shelf.closest('#desk'),b.desk);b.unchanged();
});
test('invalid facing-leaf dock fails before moving existing owner controls',t=>{const b=setup(t),outside=b.doc.createElement('aside');assert.throws(()=>b.install({shelfDock:outside}),/Shelf dock/);assert.equal(b.desk.innerHTML,b.before);b.unchanged();});
test('mounted work-first failure notice does not automatically cover usable cached paper with the legacy drawer',async t=>{const b=setup(t);b.doc.body.dataset.workbookReady='true';b.install();await b.enter('insurance');const paper=b.$('#desk'),work=b.$('.spatial-work');b.$('#desk-status').textContent='保存原稿の読取に失敗しました。保存分は利用できます。';await flush();assert.equal(work.open,false);assert.match(b.$('#desk-status').textContent,/失敗/);assert.equal(b.$('#desk'),paper);assert.equal(b.article.hidden,false);b.unchanged();delete b.doc.body.dataset.workbookReady;b.$('#desk-status').textContent='別の通信エラーです';await flush();assert.equal(work.open,true,'missing working navigation retains the legacy disclosure');});
