/* The public entry point stays app-v130.html. app-assets.json owns asset order. */
(function (root, factory) {
  'use strict';
  const loader = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = loader;
  } else {
    loader.boot({document: root.document, fetch: root.fetch.bind(root)});
  }
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';

  const MANIFEST_URL = './app-assets.json?v=20261003.1';

  function escapeAttribute(value) {
    return value.replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function validateAsset(url, extension) {
    // These are repository-relative assets, never executable markup or remote URLs.
    if (typeof url !== 'string' || !new RegExp('^\\./[a-zA-Z0-9_-]+\\.' + extension + '(?:\\?[^\\s#]*)?$').test(url)) {
      throw new Error('Invalid ' + extension + ' asset in app-assets.json');
    }
  }

  function validateManifest(manifest) {
    if (!manifest || typeof manifest !== 'object') throw new Error('Invalid app-assets.json');
    validateAsset(manifest.shell, 'html');
    for (const [key, extension] of [['styles', 'css'], ['scripts', 'js']]) {
      if (!Array.isArray(manifest[key])) throw new Error('Missing ' + key + ' in app-assets.json');
      const seen = new Set();
      for (const url of manifest[key]) {
        validateAsset(url, extension);
        const path = url.split('?')[0];
        if (seen.has(path)) throw new Error('Duplicate asset in app-assets.json: ' + path);
        seen.add(path);
      }
    }
    return manifest;
  }

  const STARTUP_STYLE = '<style id="ccStartupStyle">html,body{background:#0b111b!important}body{overflow:hidden!important}body>*:not(#ccStartupNotice){opacity:0!important;pointer-events:none!important}#ccStartupNotice{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;margin:0;padding:24px;background:#0b111b;color:#f4e5c5;font:16px/1.7 system-ui,sans-serif}</style>';
  const STARTUP_NOTICE = '<div id="ccStartupNotice" role="status" aria-live="polite">司令塔を開いています…</div>';
  function finishStartup(document, ready) {
    if (!ready) {
      const notice = document.getElementById('ccStartupNotice');
      notice.setAttribute('role', 'alert');
      notice.textContent = '画面を読み込めませんでした。再読み込みしてください。';
      const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = '再読み込み';
      retry.addEventListener('click', () => document.defaultView.location.reload());
      notice.append(retry);
      return false;
    }
    document.getElementById('ccStartupNotice')?.remove();
    document.getElementById('ccStartupStyle')?.remove();
    return ready;
  }
  const STARTUP_FINISH = '<script>(' + finishStartup.toString() + ')(document,!!(window.CCRpgHome&&window.CCRpgWorkspaces));</script>';

  function composeDocument(html, manifest) {
    validateManifest(manifest);
    if (typeof html !== 'string' || !html.includes('</head>') || !html.includes('</body>')) {
      throw new Error('app.html is missing its closing head or body tag');
    }
    const styles = manifest.styles.map(url => '<link rel="stylesheet" href="' + escapeAttribute(url) + '">').join('');
    const scripts = manifest.scripts.map(url => '<script src="' + escapeAttribute(url) + '"></script>').join('');
    // A single insertion per section preserves the shell and the legacy cascade/order.
    const guarded = manifest.scripts.some(url => url.split('?')[0] === './rpg-home.js');
    if (guarded) html = html.replace('<head>', '<head>' + STARTUP_STYLE).replace(/<body([^>]*)>/, '<body$1>' + STARTUP_NOTICE);
    return html.replace('</head>', () => styles + '</head>').replace('</body>', () => scripts + (guarded ? STARTUP_FINISH : '') + '</body>');
  }

  function showBootError(document, error) {
    const notice = document.createElement('div');
    notice.className = 'boot';
    notice.setAttribute('role', 'alert');
    // Error messages may come from a network response. Never interpret them as HTML.
    notice.textContent = '起動に失敗しました：' + String(error && error.message || error);
    document.body.replaceChildren(notice);
  }

  async function boot(options) {
    const {document, fetch} = options;
    try {
      const manifestResponse = await fetch(MANIFEST_URL, {cache: 'no-store'});
      if (!manifestResponse.ok) throw new Error('HTTP ' + manifestResponse.status + ' (app-assets.json)');
      const manifest = validateManifest(await manifestResponse.json());
      const shellResponse = await fetch(manifest.shell, {cache: 'no-store'});
      if (!shellResponse.ok) throw new Error('HTTP ' + shellResponse.status);
      const html = composeDocument(await shellResponse.text(), manifest);
      // Keep parser-inserted, blocking scripts: feature patches depend on earlier globals.
      // Dynamic/async script insertion or innerHTML would change execution semantics.
      document.open();
      document.write(html);
      document.close();
      return true;
    } catch (error) {
      showBootError(document, error);
      return false;
    }
  }

  return {MANIFEST_URL, STARTUP_STYLE, STARTUP_NOTICE, STARTUP_FINISH, finishStartup, validateManifest, composeDocument, boot};
});
