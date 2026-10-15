'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {test} = require('node:test');
const loader = require('./app-loader.js');
const manifest = require('./app-assets.json');
// Captured from the effective output of the old wrapper, including its URL rewrite.
const legacy = require('./tests/fixtures/app-assets.legacy.json');
const shell = fs.readFileSync(path.join(__dirname, 'app.html'), 'utf8');

function documentStub() {
  const calls = [];
  const document = {
    calls,
    createElement(tag) {
      assert.equal(tag, 'div');
      return {
        attributes: {},
        setAttribute(key, value) { this.attributes[key] = value; },
        set innerHTML(value) { assert.fail('Error text must not be interpreted as HTML: ' + value); }
      };
    },
    body: {
      replaceChildren(notice) { document.notice = notice; },
      set innerHTML(value) { assert.fail('Error text must not be interpreted as HTML: ' + value); }
    },
    open() { calls.push('open'); },
    write(html) { calls.push('write'); document.html = html; },
    close() { calls.push('close'); }
  };
  return document;
}

function successfulFetch(calls = []) {
  return async (url, options) => {
    calls.push({url, options});
    if (url === loader.MANIFEST_URL) return {ok: true, json: async () => manifest};
    assert.equal(url, manifest.shell);
    return {ok: true, text: async () => shell};
  };
}

test('the manifest preserves every legacy asset in order with explicit read-model and progress additions', () => {
  assert.equal(manifest.shell.split('?')[0], legacy.shell.split('?')[0]);
  assert.equal(manifest.styles.length, 20);
  assert.equal(manifest.scripts.length, legacy.scripts.length + 12);
  const paths=urls=>urls.map(url=>url.split('?')[0]);
  assert.deepEqual(paths(manifest.styles).filter(path=>!['./sourcing-mobile-comparison.css','./v230-request-progress.css','./v231-trade-details.css','./rpg-home.css','./rpg-theme.css','./rpg-account-pages.css','./rpg-workspaces.css','./rpg-daily-desk.css'].includes(path)), paths(legacy.styles));
  assert.deepEqual(paths(manifest.scripts).filter(path=>!['./sourcing-atomic-save.js','./sourcing-mobile-comparison.js','./sourcing-display-model.js','./command-center-data.js','./v230-request-progress.js','./v231-trade-details.js','./fp-finished-images.js','./manual-operation-hub.js','./rpg-home.js','./rpg-workspaces.js','./rpg-daily-store.js','./rpg-daily-desk.js'].includes(path)), paths(legacy.scripts));
  assert.equal(manifest.scripts.findIndex(url=>url.startsWith('./sourcing-display-model.js')),manifest.scripts.findIndex(url=>url.startsWith('./sourcing-mobile-comparison.js'))-1);
  assert.equal(manifest.scripts.findIndex(url=>url.startsWith('./sourcing-mobile-comparison.js')),manifest.scripts.findIndex(url=>url.startsWith('./v216-sourcing-status-flow.js'))-1);
  assert.equal(manifest.scripts.findIndex(url=>url.startsWith('./command-center-data.js')),manifest.scripts.findIndex(url=>url.startsWith('./v155-home.js'))-1);
});

test('every configured asset exists and is loaded once, even across version strings', () => {
  for (const urls of [[manifest.shell], manifest.styles, manifest.scripts]) {
    const files = urls.map(url => url.split('?')[0]);
    assert.equal(new Set(files).size, files.length);
    for (const file of files) assert.ok(fs.statSync(path.join(__dirname, file)).isFile(), file);
  }
});

test('late feature patches and the latest daily-report entry remain present', () => {
  assert.deepEqual(manifest.scripts.filter(url=>!['./fp-finished-images.js','./manual-operation-hub.js','./rpg-home.js','./rpg-workspaces.js','./rpg-daily-store.js','./rpg-daily-desk.js'].includes(url.split('?')[0])).slice(-9,-2), [
    './v222-sourcing-click-fix.js?v=222.1',
    './v223-home-cleanup.js?v=20261003.1',
    './v224-home-menu-fix.js?v=224.2',
    './v228-money-full-copy.js?v=232.2-state',
    './v229-sourcing-mercari-history.js?v=229.4',
    './affiliate-production.js?v=20261008.1-manual',
    './binbo-neko.js?v=20261002.1'
  ]);
  assert.ok(manifest.scripts.includes('./v148-daily-report-link.js?v=20261004.1'));
  assert.ok(manifest.scripts.includes('./v155-home.js?v=20261003.1'));
});

test('manual review additions load after existing home and FP dependencies',()=>{
 const paths=manifest.scripts.map(url=>url.split('?')[0]);
 assert.deepEqual(paths.slice(-6),['./fp-finished-images.js','./manual-operation-hub.js','./rpg-home.js','./rpg-workspaces.js','./rpg-daily-store.js','./rpg-daily-desk.js']);
 assert.ok(paths.indexOf('./fp-finished-images.js')>paths.indexOf('./v151-fp-content-pipeline.js'));
 assert.ok(paths.indexOf('./manual-operation-hub.js')>paths.indexOf('./v155-home.js'));
});
test('RPG assets append last after the manual hub without replacing legacy assets',()=>{
 assert.deepEqual(manifest.styles.slice(-5).map(url=>url.split('?')[0]),['./rpg-home.css','./rpg-theme.css','./rpg-account-pages.css','./rpg-workspaces.css','./rpg-daily-desk.css']);
 assert.deepEqual(manifest.scripts.slice(-4).map(x=>x.split('?')[0]),['./rpg-home.js','./rpg-workspaces.js','./rpg-daily-store.js','./rpg-daily-desk.js']);
 assert.notEqual(manifest.scripts.find(url=>url.startsWith('./manual-operation-hub.js?')),'./manual-operation-hub.js?v=20261008.3-state');
});

test('composition reflects only declared assets and leaves the base shell intact', () => {
  const styles = manifest.styles.map(url => '<link rel="stylesheet" href="' + url + '">').join('');
  const scripts = manifest.scripts.map(url => '<script src="' + url + '"></script>').join('');
  const actual = loader.composeDocument(shell, manifest);
  assert.ok(actual.indexOf(loader.STARTUP_STYLE)<actual.indexOf('<body'));
  assert.ok(actual.indexOf(loader.STARTUP_FINISH)>actual.lastIndexOf('<script src='));
  assert.equal(actual.replace(styles, '').replace(scripts, '').replace(loader.STARTUP_STYLE,'').replace(loader.STARTUP_NOTICE,'').replace(loader.STARTUP_FINISH,''), shell);
  assert.ok(actual.includes('<meta charset="utf-8">'));
  assert.ok(actual.includes('<title>司令塔</title>'));
});

test('generated scripts remain classic blocking parser-inserted tags', () => {
  const html = loader.composeDocument('<head></head><body></body>', manifest);
  const tags = [...html.matchAll(/<script\b[^>]*>/g)].map(match => match[0]);
  assert.deepEqual(tags, [...manifest.scripts.map(url => '<script src="' + url + '">'), '<script>']);
  assert.ok(!/\b(?:async|defer|type)=/.test(tags.join('')));
});

test('attribute encoding preserves query values without allowing markup injection or replacement tokens', () => {
  const url = './fixture.js?v=1&label="<tag>\'&token=$&';
  const html = loader.composeDocument('<head></head><body>日本語</body>', {
    shell: './app.html', styles: ['./fixture.css?v=1&theme=retro'], scripts: [url]
  });
  assert.ok(html.includes('href="./fixture.css?v=1&amp;theme=retro"'));
  assert.ok(html.includes('src="./fixture.js?v=1&amp;label=&quot;&lt;tag&gt;&#39;&amp;token=$&amp;"'));
  assert.ok(html.includes('日本語'));
  assert.equal((html.match(/<script /g) || []).length, 1);
});

test('missing sections and malformed or duplicate manifest entries are rejected before writing', () => {
  for (const html of ['', '<body></body>', '<head></head>', null]) {
    assert.throws(() => loader.composeDocument(html, manifest), /closing head or body/);
  }
  for (const input of [null, {}, {...manifest, styles: null}, {...manifest, scripts: 'bad'},
    {...manifest, shell: 'https://example.invalid/app.html'},
    {...manifest, scripts: ['javascript:alert(1)']},
    {...manifest, scripts: ['./one.js?v=1', './one.js?v=2']},
    {...manifest, styles: ['./one.css', './one.css']}]) {
    assert.throws(() => loader.validateManifest(input));
  }
});

test('boot requests fresh manifest and the same shell URL, then writes and closes one document', async () => {
  const document = documentStub();
  const calls = [];
  assert.equal(await loader.boot({document, fetch: successfulFetch(calls)}), true);
  assert.deepEqual(calls, [
    {url: loader.MANIFEST_URL, options: {cache: 'no-store'}},
    {url: manifest.shell, options: {cache: 'no-store'}}
  ]);
  assert.deepEqual(document.calls, ['open', 'write', 'close']);
  assert.equal(document.html, loader.composeDocument(shell, manifest));
  assert.equal(document.notice, undefined);
});

test('HTTP errors for the manifest and shell show a readable message without replacing the document', async () => {
  for (const failedUrl of [loader.MANIFEST_URL, manifest.shell]) {
    const document = documentStub();
    const fetch = async url => url === failedUrl
      ? {ok: false, status: 503}
      : {ok: true, json: async () => manifest};
    assert.equal(await loader.boot({document, fetch}), false);
    assert.match(document.notice.textContent, /起動に失敗しました：HTTP 503/);
    assert.equal(document.notice.attributes.role, 'alert');
    assert.deepEqual(document.calls, []);
  }
});

test('network exceptions and rejected JSON are rendered only as literal error text', async () => {
  const malicious = '<img/src=x/onerror=alert(1)> & "unexpected"';
  for (const fetch of [
    async () => { throw new Error(malicious); },
    async () => ({ok: true, json: async () => { throw new Error(malicious); }})
  ]) {
    const document = documentStub();
    assert.equal(await loader.boot({document, fetch}), false);
    assert.equal(document.notice.textContent, '起動に失敗しました：' + malicious);
    assert.equal(document.notice.className, 'boot');
    assert.deepEqual(document.calls, []);
  }
});

test('malformed shell responses keep the loading document available for the error', async () => {
  const document = documentStub();
  const fetch = async url => url === loader.MANIFEST_URL
    ? {ok: true, json: async () => manifest}
    : {ok: true, text: async () => 'upstream error page'};
  assert.equal(await loader.boot({document, fetch}), false);
  assert.match(document.notice.textContent, /closing head or body/);
  assert.deepEqual(document.calls, []);
});

test('the unchanged public entry URL boots through the external loader in a browser context', async () => {
  const wrapper = fs.readFileSync(path.join(__dirname, 'app-v130.html'), 'utf8');
  const scripts = [...wrapper.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match => match[1]);
  assert.deepEqual(scripts, ['./app-loader.js?v=20261013.9-detail']);
  assert.ok(!wrapper.includes('h.replace'));
  const document = documentStub();
  const window = {document, fetch: successfulFetch()};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'app-loader.js'), 'utf8'), {window});
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(document.calls, ['open', 'write', 'close']);
  assert.equal(document.html, loader.composeDocument(shell, manifest));
});

// Existing CI invokes this loader suite directly. Include responsive HOME
// CSS-contract/geometry checks here without requiring a separate workflow job.
require('./rpg-home-responsive.test.cjs');

// Whole-application theme contracts share this established CI entry.
require('./rpg-theme.test.cjs');

require('./rpg-workspaces.test.cjs');

test('startup completion releases presentation only and fails closed when the final modules are missing',()=>{
 for(const ready of [true,false]){const removed=[];let reloads=0;const notice={setAttribute(){},append(n){this.child=n},remove:()=>removed.push('ccStartupNotice')};const document={getElementById:id=>id==='ccStartupNotice'?notice:{remove:()=>removed.push(id)},defaultView:{location:{reload:()=>reloads++}},createElement:()=>({addEventListener(name,fn){this.click=fn}})};assert.equal(loader.finishStartup(document,ready),ready);assert.deepEqual(removed,ready?['ccStartupNotice','ccStartupStyle']:[]);if(!ready){assert.match(notice.textContent,/再読み込み/);notice.child.click();assert.equal(reloads,1);}}
 assert.doesNotMatch(loader.finishStartup.toString(),/showRpg|\bload\(|history\.|localStorage|sessionStorage|replaceChildren/);
});


test('startup failure retry is self-contained, touch-sized, and keyboard visible without external CSS',()=>{
 assert.match(loader.STARTUP_STYLE,/#ccStartupNotice button\{[^}]*min-height:44px/);
 assert.match(loader.STARTUP_STYLE,/#ccStartupNotice button:focus-visible\{outline:2px solid #f2d49b/);
 assert.match(loader.STARTUP_STYLE,/align-content:center;gap:20px/);
 assert.match(loader.STARTUP_STYLE,/body>\*:not\(#ccStartupNotice\)\{[^}]*visibility:hidden!important/);
 assert.doesNotMatch(loader.STARTUP_STYLE,/var\(|url\(/);
 const wrapper=fs.readFileSync(path.join(__dirname,'app-v130.html'),'utf8');
 assert.match(wrapper,/html,body\{[^}]*background:#0b111b/);
 assert.doesNotMatch(wrapper,/#008080|#c0c0c0/);
});
