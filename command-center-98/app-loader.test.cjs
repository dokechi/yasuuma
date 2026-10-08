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
    assert.equal(url, legacy.shell);
    return {ok: true, text: async () => shell};
  };
}

test('the manifest preserves every legacy asset in order with explicit read-model and progress additions', () => {
  assert.equal(manifest.shell, legacy.shell);
  assert.equal(manifest.styles.length, 14);
  assert.equal(manifest.scripts.length, legacy.scripts.length + 5);
  const paths=urls=>urls.map(url=>url.split('?')[0]);
  assert.deepEqual(paths(manifest.styles).filter(path=>!['./v230-request-progress.css','./v231-trade-details.css'].includes(path)), paths(legacy.styles));
  assert.deepEqual(paths(manifest.scripts).filter(path=>!['./command-center-data.js','./v230-request-progress.js','./v231-trade-details.js','./fp-finished-images.js','./manual-operation-hub.js'].includes(path)), paths(legacy.scripts));
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
  assert.deepEqual(manifest.scripts.filter(url=>!['./fp-finished-images.js','./manual-operation-hub.js'].includes(url.split('?')[0])).slice(-9,-2), [
    './v222-sourcing-click-fix.js?v=222.1',
    './v223-home-cleanup.js?v=20261003.1',
    './v224-home-menu-fix.js?v=224.2',
    './v228-money-full-copy.js?v=232.1-theme-adaptive',
    './v229-sourcing-mercari-history.js?v=229.3',
    './affiliate-production.js?v=20261008.1-manual',
    './binbo-neko.js?v=20261002.1'
  ]);
  assert.ok(manifest.scripts.includes('./v148-daily-report-link.js?v=20261004.1'));
  assert.ok(manifest.scripts.includes('./v155-home.js?v=20261003.1'));
});

test('manual review additions load after existing home and FP dependencies',()=>{
 const paths=manifest.scripts.map(url=>url.split('?')[0]);
 assert.deepEqual(paths.slice(-2),['./fp-finished-images.js','./manual-operation-hub.js']);
 assert.ok(paths.indexOf('./fp-finished-images.js')>paths.indexOf('./v151-fp-content-pipeline.js'));
 assert.ok(paths.indexOf('./manual-operation-hub.js')>paths.indexOf('./v155-home.js'));
});
test('composition reflects only declared assets and leaves the base shell intact', () => {
  const styles = manifest.styles.map(url => '<link rel="stylesheet" href="' + url + '">').join('');
  const scripts = manifest.scripts.map(url => '<script src="' + url + '"></script>').join('');
  const actual = loader.composeDocument(shell, manifest);
  assert.equal(actual, shell.replace('</head>', styles + '</head>').replace('</body>', scripts + '</body>'));
  assert.equal(actual.replace(styles, '').replace(scripts, ''), shell);
  assert.ok(actual.includes('<meta charset="utf-8">'));
  assert.ok(actual.includes('<title>司令塔</title>'));
});

test('generated scripts remain classic blocking parser-inserted tags', () => {
  const html = loader.composeDocument('<head></head><body></body>', manifest);
  const tags = [...html.matchAll(/<script\b[^>]*>/g)].map(match => match[0]);
  assert.deepEqual(tags, manifest.scripts.map(url => '<script src="' + url + '">'));
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
    {url: './app.html?v=195', options: {cache: 'no-store'}}
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
  assert.deepEqual(scripts, ['./app-loader.js?v=20261003.1']);
  assert.ok(!wrapper.includes('h.replace'));
  const document = documentStub();
  const window = {document, fetch: successfulFetch()};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'app-loader.js'), 'utf8'), {window});
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(document.calls, ['open', 'write', 'close']);
  assert.equal(document.html, loader.composeDocument(shell, manifest));
});
