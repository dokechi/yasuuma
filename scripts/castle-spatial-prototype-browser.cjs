/* Real DOM/Chrome integration with synthetic records. No credentials or external APIs. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const {chromium} = require('playwright-core');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'artifacts/castle-spatial-prototype');
const accounts = [
  {key: 'insurance', name: '保険', handle: '@sucker0508', intro: '保険の備えを、手紙にして確かめる。'},
  {key: 'otoku', name: 'まだ安く買えるはず', handle: '@thats_a_steal0601', intro: 'お得な買い物は、条件と価格を確かめてから。'},
  {key: 'rakuten', name: '楽天犬', handle: '@bonya0914', intro: '楽天犬と選ぶ、暮らしに合う贈りもの。'},
  {key: 'lottery', name: '抽選', handle: '@chusen1101', intro: '抽選の締切と応募条件を、星図のように見渡す。'}
];
const rows = accounts.flatMap(account => Array.from({length: 8}, (_, i) => ({
  id: account.key + i, place: account.key === 'insurance' ? 'kyun' : account.key,
  title: `${account.name} 保存原稿 ${i + 1} — 確かめてから、伝える`,
  body: `${account.intro}\n\n原稿 ${i + 1} の固有本文です。\n\n` +
    '保存された原稿の本文です。条件と出典を確認し、そのままコピーできます。\n\n'.repeat(8),
  kind: '投稿本文', checkedAt: '2026-10-31', source: {id: account.key + i, account: account.key},
  posting: {main: account.key + '本文'}, createdAt: 1, updatedAt: 10 - i
})));
const alternate = {...rows.find(row => row.id === 'otoku0'), id: 'otoku0-alt', kind: 'B案',
  body: 'お得の B案。別の本文を選んでも、ほかのアカウントの原稿には混ざりません。', updatedAt: 9.5};
rows.push(alternate);
const draft = (key, index = 0) => rows.find(row => row.id === key + index);
const fixture = '<style>body{margin:0}iframe{display:block;width:100vw;height:100dvh;border:0}</style>' +
  '<script>window.__nativeEvents=[];addEventListener("message",e=>{if(e.origin===location.origin&&e.data?.channel==="cc-castle-v1"&&e.data.type==="native")window.__nativeEvents.push(e.data)});</script>' +
  '<iframe src="/command-center-98/lounge/spatial-prototype.html"></iframe>';
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/fixture.html') return res.writeHead(200, {'Content-Type': 'text/html'}).end(fixture);
  const file = path.join(root, pathname);
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (err, data) => err ? res.writeHead(404).end() : res.writeHead(200, {
    'Content-Length': data.length,
    'Content-Type': file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' :
      file.endsWith('.html') ? 'text/html' : 'application/octet-stream'
  }).end(data));
});

// Resolve the light drawer's actual inherited background, not the old dark room
// toolbar color. Inspect real computed styles after all cascade layers apply.
function drawerContrast() {
  const root = document.querySelector('.spatial-work-body');
  const rgb = s => (s.match(/[\d.]+/g) || []).map(Number);
  const lum = c => c.slice(0, 3).map(v => {
    v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
  }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  return [...root.querySelectorAll('h3,strong,summary,p,button,a')]
    .filter(n => n.checkVisibility() && !n.disabled && n.textContent.trim()).map(n => {
      const style = getComputedStyle(n); let p = n, background = style.backgroundColor;
      while ((background === 'transparent' || background === 'rgba(0, 0, 0, 0)') && p.parentElement) {
        p = p.parentElement; background = getComputedStyle(p).backgroundColor;
      }
      const foregroundRGB = rgb(style.color), backgroundRGB = rgb(background);
      const a = lum(foregroundRGB), b = lum(backgroundRGB);
      const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      return {selector: n.id || n.tagName, text: n.textContent.slice(0, 50), color: style.color,
        background, ratio, pass: foregroundRGB.length >= 3 && backgroundRGB.length >= 3 && ratio >= 4.5};
    });
}

(async () => {
  fs.mkdirSync(out, {recursive: true});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({headless: true,
    executablePath: process.env.CC_TEST_CHROME || ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p)),
    args: ['--no-sandbox']});
  const results = [];
  const prepare = async (page) => {
    await page.addInitScript(() => {
      HTMLMediaElement.prototype.play = () => Promise.resolve();
      Object.defineProperty(navigator, 'clipboard', {value: {writeText: async text => { window.__copied = text; }}});
    });
    await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
    await page.goto(origin + '/fixture.html');
    const f = page.frameLocator('iframe');
    await f.locator('.castle-room-hotspot').first().waitFor();
    const cf = page.frames().find(frame => frame.url().includes('/lounge/'));
    const send = data => page.evaluate(data => document.querySelector('iframe').contentWindow.postMessage(
      {channel: 'cc-castle-v1', ...data}, location.origin), data);
    await send({type: 'records', drafts: rows, complete: true, loading: false, message: '保存原稿を読込済み'});
    await f.locator('.castle-room-hotspot[data-room=insurance] .castle-room-count').getByText('保存原稿 8本', {exact: true}).waitFor();
    await cf.evaluate(() => Promise.all([document.fonts.ready,
      ...[...document.querySelectorAll('.castle-stage img')].map(image => image.decode())]));
    return {f, cf, send};
  };
  try {
    for (const [width, height] of [[1440, 900], [800, 648], [390, 900], [320, 640]]) {
      const page = await browser.newPage({viewport: {width, height}, reducedMotion: 'reduce'});
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      const requestedAssets = [];
      page.on('request', request => { if (/\.(webp|png|avif)(?:\?|$)/.test(request.url())) requestedAssets.push(request.url()); });
      const {f, cf, send} = await prepare(page);
      assert.deepEqual(requestedAssets.filter(url => url.includes('/castle-interior-')), [], 'Room interiors must remain lazy until that room opens.');
      const worldNames = ['castle-silhouette-v1.webp', 'castle-sky-v1.webp', ...['insurance', 'otoku', 'rakuten', 'lottery', 'sourcing'].map(key => key + '-desk-actor.webp')];
      const worldAssets = worldNames.map(name => ({name, bytes: fs.statSync(path.join(root, 'command-center-98/lounge/assets', name)).size}));
      const worldBytes = worldAssets.reduce((sum, asset) => sum + asset.bytes, 0);
      assert.ok(worldBytes <= 1_600_000, 'Startup world art exceeds the 1.6 MB binary budget: ' + worldBytes);
      const startup = {requested: requestedAssets.slice(), worldAssets, worldBytes, lazyInteriors: true};
      const screenshot = name => page.screenshot({path: path.join(out, `${width}-${height}-${name}.png`)});
      const waitRoom = async key => {
        await f.locator(`#room[data-account=${key}][data-spatial-desk=ready][data-spatial-scene=interior]`).waitFor();
        await f.locator('#draft-body').waitFor();
        const asset = await f.locator('.spatial-desk-actor').evaluate(async image => {
          await image.decode(); return {src: image.currentSrc, width: image.naturalWidth, height: image.naturalHeight};
        });
        assert.ok(asset.src.endsWith(`/${key}-desk-actor.webp`) && asset.width > 0 && asset.height > 0, JSON.stringify(asset));
        assert.ok((await f.locator('.spatial-study-scene').evaluate(n => getComputedStyle(n).backgroundImage))
          .includes(`castle-interior-${key}-v1.webp`));
        assert.equal(await f.locator('.castle-journey').count(), 0, 'Reduced motion must create no travel layer.');
        return asset;
      };
      const readGeometry = async () => {
        const geometry = await f.locator('#draft-body').evaluate(n => ({bodyTop: n.getBoundingClientRect().top,
          titleTop: document.getElementById('draft-title').getBoundingClientRect().top, viewport: innerHeight,
          readerHeight: document.getElementById('desk-scroll').clientHeight,
          overflow: document.documentElement.scrollWidth > innerWidth,
          actions: [...document.querySelectorAll('.reader-actions button')].map(button => {
            const r = button.getBoundingClientRect(); return {id: button.id, width: r.width, height: r.height, top: r.top, bottom: r.bottom};
          })}));
        assert.ok(geometry.titleTop >= 0 && geometry.bodyTop < height - 80, JSON.stringify(geometry));
        assert.ok(geometry.readerHeight >= 180, JSON.stringify(geometry));
        assert.equal(geometry.overflow, false);
        assert.ok(geometry.actions.every(r => r.width >= 44 && r.height >= 44 && r.top >= 0 && r.bottom <= height), JSON.stringify(geometry.actions));
        return geometry;
      };
      const switchRoom = async (from, to) => {
        await f.locator('.spatial-room-name').click();
        await f.locator('#spatial-room-dialog[open]').waitFor();
        assert.equal(await f.locator('.spatial-destination').count(), 5);
        assert.equal(await f.locator('.spatial-account-identity h3').textContent(), from.name);
        assert.equal(await f.locator('.spatial-account-identity p').first().textContent(), from.handle);
        assert.equal(await f.locator(`.spatial-destination[data-destination=${from.key}]`).getAttribute('aria-current'), 'page');
        if (from.key === 'insurance') await screenshot('room-picker');
        await f.locator(`.spatial-destination[data-destination=${to.key}]`).click();
        await waitRoom(to.key);
        assert.equal(await f.locator('#spatial-room-dialog[open]').count(), 0);
      };

      await screenshot('home');
      assert.equal(await f.locator('.castle-room-hotspot').count(), 8);
      assert.equal(await f.locator('.castle-room-hotspot:disabled').count(), 3);
      assert.equal(await f.locator('.castle-quick-open').count(), 5);
      const quickGeometry = await f.locator('.castle-quick-open').evaluateAll(nodes => nodes.map(n => {
        const r = n.getBoundingClientRect(); return {width: r.width, height: r.height};
      }));
      assert.ok(quickGeometry.every(r => r.width >= 44 && r.height >= 44));
      assert.equal(await cf.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (width <= 700) {
        await f.locator('.castle-overview').click(); await screenshot('overview');
        assert.equal(await f.locator('.castle-room-hotspot:visible').count(), 8);
        for (const [key, name] of Object.entries({insurance: '保険', otoku: 'お得', rakuten: '楽天', lottery: '抽選', sourcing: '仕入れ'})) {
          assert.equal(await f.locator(`.castle-room-hotspot[data-room=${key}] .castle-room-marker`).textContent(), name);
        }
        await f.locator('.castle-overview').click();
        await f.getByRole('button', {name: '次の部屋を見る', exact: true}).click();
        assert.equal(await f.locator('.spatial-castle').getAttribute('data-selected'), 'otoku');
        await f.getByRole('button', {name: '前の部屋を見る', exact: true}).click();
      }
      await f.locator('.castle-quick-open[data-room=insurance]').click();
      const roomResults = [];
      for (const [index, account] of accounts.entries()) {
        if (index) await switchRoom(accounts[index - 1], account);
        const asset = await waitRoom(account.key);
        assert.equal(await f.locator('#draft-body').textContent(), draft(account.key).body);
        assert.equal(await f.locator('#draft-title').textContent(), draft(account.key).title);
        assert.equal(await f.locator('#desk-operation').textContent(), '', 'A previous account copy must not look like a current-draft copy.');
        const reading = await readGeometry();
        await screenshot(account.key === 'insurance' ? 'study' : `${account.key}-study`);
        await f.locator('#desk-copy').click();
        assert.equal(await cf.evaluate(() => window.__copied), draft(account.key).body);
        assert.match(await f.locator('#desk-operation').textContent(), /本文をコピーしました/);
        if (account.key === 'otoku') {
          assert.equal(await f.locator('#desk-variants button').count(), 2);
          await f.locator('#desk-variants').getByRole('button', {name: 'B案', exact: true}).click();
          assert.equal(await f.locator('#draft-body').textContent(), alternate.body);
          assert.equal(await f.locator('#desk-operation').textContent(), '');
          await f.locator('#desk-copy').click();
          assert.equal(await cf.evaluate(() => window.__copied), alternate.body);
          await screenshot('otoku-variant');
          await f.locator('#desk-variants').getByRole('button', {name: '投稿本文', exact: true}).click();
          assert.equal(await f.locator('#draft-body').textContent(), draft('otoku').body);
        }
        await f.locator('.spatial-work > summary').click();
        assert.ok(await f.locator('#desk-refresh').isVisible());
        const contrast = await cf.evaluate(drawerContrast);
        assert.ok(contrast.length >= 5, 'Drawer must expose real identity, status and action samples.');
        assert.deepEqual(contrast.filter(sample => !sample.pass), [], JSON.stringify(contrast));
        await screenshot(account.key === 'insurance' ? 'tools' : `${account.key}-tools`);
        await f.locator('#desk-read').click();
        assert.equal(await f.locator('.spatial-work').getAttribute('open'), null, 'Read jump must close the covering work drawer.');
        assert.equal(await f.locator('#desk-scroll').evaluate(n => n === document.activeElement), true);
        assert.equal(await f.locator('#room').evaluate(n=>n.scrollTop),0,'decorative actor overflow must not shift the room after read jump');
        roomResults.push({account: account.key, reading, actor: asset, contrast});
        if (account.key === 'insurance') {
          await f.locator('.spatial-shelf-open').click();
          await f.locator('#spatial-shelf-dialog[open]').waitFor();
          await f.locator('#desk-query').fill('保存原稿 2');
          assert.equal(await f.locator('#desk-list .manuscript-card').count(), 1);
          await screenshot('shelf');
          await f.locator('#desk-list .manuscript-card').click();
          await f.locator('#spatial-shelf-dialog').waitFor({state: 'hidden'});
          assert.equal(await f.locator('#draft-title').textContent(), draft('insurance', 1).title);
          assert.equal(await f.locator('#desk-operation').textContent(), '');
          // Escape restores focus to the disclosure without triggering room back.
          await f.locator('.spatial-room-name').click(); await page.keyboard.press('Escape');
          await f.locator('#spatial-room-dialog').waitFor({state: 'hidden'});
          assert.equal(await f.locator('.spatial-room-name').evaluate(n => n === document.activeElement), true);
        }
      }
      await f.locator('#back').click(); await f.locator('.account-board').waitFor();
      assert.equal(await f.locator('.castle-quick-open[data-room=lottery]').evaluate(n => n === document.activeElement), true);
      // The manuscript-first route remains the same original list and record.
      await f.locator('.board-primary').click(); await f.locator('.account-columns-scroll').waitFor();
      const listDraft = f.locator('.account-column[data-account=otoku] .account-draft').first();
      await listDraft.click(); await waitRoom('otoku');
      assert.equal(await f.locator('#draft-body').textContent(), draft('otoku').body);
      assert.equal(await f.locator('#desk .manuscript-shelf').count(), 1, 'The original shelf must be restored outside its closed dialog.');
      await f.locator('#back').click(); await f.locator('.account-board').waitFor();
      assert.equal(await listDraft.evaluate(n => n === document.activeElement), true);
      await f.locator('.board-primary').click();
      await send({type: 'status', loading: false, message: '保存原稿の読み込みに失敗しました。再試行できます。'});
      await f.locator('.account-board[data-state=attention]').waitFor();
      assert.equal(await f.locator('.castle-room-hotspot[data-room=insurance] .castle-room-count').textContent(), '原稿を確認');
      assert.equal(await f.locator('.account-column[data-account=insurance] .account-draft').count(), 8);
      await screenshot('error');
      assert.deepEqual(errors, []);
      results.push({width, height, startup, quickGeometry, rooms: roomResults, errors});
      await page.close();
    }

    const motion = await browser.newPage({viewport: {width: 800, height: 700}, reducedMotion: 'no-preference'});
    const {f: mf, cf: mcf} = await prepare(motion);
    assert.equal(await mf.locator('.castle-stage').evaluate(n => getComputedStyle(n).transitionDuration), '0.22s');
    const immediate = await mcf.evaluate(async () => {
      document.querySelector('.castle-room-hotspot[data-room=insurance]').click();
      await Promise.resolve();
      const layer = document.querySelector('.castle-journey');
      return {roomVisible: !document.getElementById('room').hidden, layer: !!layer,
        pointerEvents: layer && getComputedStyle(layer).pointerEvents,
        durations: layer ? layer.getAnimations({subtree: true}).map(animation => animation.effect.getTiming().duration) : []};
    });
    assert.equal(immediate.roomVisible, true, 'Travel must not delay access to the working room.');
    assert.equal(immediate.layer, true);
    assert.equal(immediate.pointerEvents, 'none');
    assert.ok(immediate.durations.length >= 2 && immediate.durations.every(duration => duration === 780), JSON.stringify(immediate));
    await mf.locator('.castle-journey').waitFor({state: 'detached'});
    await mf.locator('#back').click(); await mf.locator('.account-board').waitFor();
    await motion.emulateMedia({reducedMotion: 'reduce'});
    assert.equal(await mf.locator('.castle-stage').evaluate(n => getComputedStyle(n).transitionDuration), '0s');
    await mf.locator('.castle-quick-open[data-room=otoku]').click();
    await mf.locator('#room[data-account=otoku]').waitFor();
    assert.equal(await mf.locator('.castle-journey').count(), 0);
    results.push({motion: immediate, reducedMotion: 'no layer, no transition'});
    await motion.close();
    // A missing presentation stylesheet must fall back to the original real
    // account/reader controls, not strand data behind an unfinished scene.
    const fallback=await browser.newPage({viewport:{width:800,height:700},reducedMotion:'reduce'});
    await fallback.addInitScript(()=>{HTMLMediaElement.prototype.play=()=>Promise.resolve();Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>window.__copied=text}});});
    await fallback.route('**/*',route=>{
      const url=route.request().url();
      if(url.includes('/castle-scene.css'))return route.fulfill({status:503,contentType:'text/css',body:''});
      return url.startsWith(origin)?route.continue():route.abort();
    });
    await fallback.goto(origin+'/fixture.html');const ff=fallback.frameLocator('iframe');
    await ff.locator('body[data-spatial=fallback]').waitFor();
    await fallback.evaluate(drafts=>document.querySelector('iframe').contentWindow.postMessage({channel:'cc-castle-v1',type:'records',drafts,complete:true,loading:false,message:'保存原稿を読込済み'},location.origin),rows);
    await ff.locator('.account-tile[data-destination=insurance]').click();await ff.locator('#draft-body').waitFor();
    assert.equal(await ff.locator('#draft-body').textContent(),draft('insurance').body);
    await ff.locator('#desk-copy').click();assert.equal(await fallback.frames().find(frame=>frame.url().includes('/lounge/')).evaluate(()=>window.__copied),draft('insurance').body);
    await fallback.screenshot({path:path.join(out,'800-700-style-fallback.png')});await fallback.close();
    results.push({failedPresentationStyles:'original account/reader route and exact copy retained'});
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
    console.log('PASS spatial castle: eight destinations, four matched rooms and actors, direct five-route picker, account-isolated copy/variants, paper/shelf/tools contrast, focus/back, lazy interiors and bounded world assets, preserved records, responsive geometry and nonblocking reduced-motion-safe travel.');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
