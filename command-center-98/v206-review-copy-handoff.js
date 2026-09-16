/* A review handoff is not a completed image package. No API calls or record writes. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (!root || !root.document || root.CCReviewHandoff) return;
  root.CCReviewHandoff = api;
  const doc = root.document, remembered = new Map(), originals = new WeakMap();
  const pipeline = () => root.__carouselContentPipeline || root.__fpContentPipeline;
  function lookup(id) {
    let rows = [];
    try { if (typeof app !== 'undefined') rows = app.items || []; } catch (_) {}
    return rows.find(item => String(item.id) === String(id)) || remembered.get(String(id));
  }
  // Retain items already rendered by the application; never fetch extra records.
  if (typeof cardHtml === 'function') {
    const previous = cardHtml;
    cardHtml = function (item) {
      if (item && item.id) remembered.set(String(item.id), item);
      return previous.apply(this, arguments);
    };
  }
  const notify = (message, kind) => { if (typeof root.toast === 'function') root.toast(message, kind || 'good'); };
  function getOriginal(button) {
    if (!originals.has(button)) originals.set(button, { label: button.textContent, title: button.getAttribute('title') });
    return originals.get(button);
  }
  function messageNode(modal) {
    let node = modal.querySelector('[data-cc-review-notice]');
    if (!node) {
      node = doc.createElement('div');
      node.dataset.ccReviewNotice = '1';
      node.className = 'fp-package-status blocked cc-review-notice';
      node.setAttribute('role', 'status');
      const title = doc.createElement('b'), detail = doc.createElement('p');
      title.textContent = '画像制作前の最終確認待ち';
      detail.textContent = '原稿・根拠・制作条件を、最終確認の指示付きでコピーできます。完成扱いにはせず、確認に合格してから画像制作へ進みます。';
      node.append(title, detail);
      modal.querySelector('.fp-draft-dialog > main')?.prepend(node);
    }
    return node;
  }
  function refresh() {
    const pipe = pipeline();
    if (!pipe) return;
    doc.querySelectorAll('[data-fp-copy-package]').forEach(button => {
      const item = lookup(button.dataset.fpCopyPackage);
      if (!item) return;
      const state = api.policy(item, pipe), modal = button.closest('[data-fp-modal]');
      if (state.reviewOnly) {
        getOriginal(button);
        button.dataset.ccReviewCopy = '1';
        if (button.disabled === state.allowed) button.disabled = !state.allowed;
        const label = '画像化用にコピー（再確認付き）';
        if (button.textContent !== label) button.textContent = label;
        const hint = state.allowed ? '原稿と一次情報を先に確認する指示を付けてコピーします。' : state.issues.join('／');
        if (button.title !== hint) button.title = hint;
        if (modal) {
          messageNode(modal);
          const old = modal.querySelector('.fp-draft-dialog > main > .fp-package-status:not([data-cc-review-notice])');
          if (old && !old.hidden) { old.hidden = true; old.dataset.ccReviewHidden = '1'; }
          const small = modal.querySelector('.fp-draft-dialog > header small');
          if (small && !small.dataset.ccOriginalLabel) {
            small.dataset.ccOriginalLabel = small.textContent;
            small.textContent = (pipe.house?.(item) ? '家' : 'FP') + 'カルーセル原稿｜最終確認待ち';
          }
        }
      } else if (button.dataset.ccReviewCopy) {
        const original = originals.get(button);
        delete button.dataset.ccReviewCopy;
        if (original) {
          button.textContent = original.label;
          if (original.title === null) button.removeAttribute('title'); else button.title = original.title;
        }
        button.disabled = !(pipe.packageQuality(item).ready && pipe.preflightIssues(item.payload || {}).length === 0);
        if (modal) {
          modal.querySelector('[data-cc-review-notice]')?.remove();
          const old = modal.querySelector('[data-cc-review-hidden]');
          if (old) { old.hidden = false; delete old.dataset.ccReviewHidden; }
          const small = modal.querySelector('[data-cc-original-label]');
          if (small) { small.textContent = small.dataset.ccOriginalLabel; delete small.dataset.ccOriginalLabel; }
        }
      }
    });
  }
  function manualCopy(value, button) {
    const parent = button.closest('.fp-draft-dialog')?.querySelector('main') || button.parentElement;
    parent.querySelector('[data-cc-manual-copy]')?.remove();
    const box = doc.createElement('section'), label = doc.createElement('label'), area = doc.createElement('textarea');
    box.dataset.ccManualCopy = '1'; box.className = 'cc-review-manual-copy';
    label.textContent = '自動コピーが使えません。下の全文を選択してコピーしてください。';
    area.value = value; area.readOnly = true; area.rows = 10; area.setAttribute('aria-label', '最終確認の指示と原稿の全文');
    label.append(area); box.append(label); parent.prepend(box); area.focus(); area.select();
    notify('自動コピーは未完了です。表示した全文を手動でコピーしてください。', 'bad');
  }
  async function copy(value, button) {
    let copied = false;
    try {
      if (typeof root.navigator?.clipboard?.writeText !== 'function') throw Error('Clipboard API unavailable');
      await root.navigator.clipboard.writeText(value); copied = true;
    } catch (_) {
      const area = doc.createElement('textarea');
      const parent = button.closest('.fp-draft-dialog') || doc.body;
      area.value = value; area.style.cssText = 'position:fixed;left:0;top:0;opacity:0;width:1px;height:1px';
      parent.append(area); area.focus(); area.select();
      try { copied = doc.execCommand('copy') === true; } catch (_) {}
      area.remove();
    }
    if (!copied) { manualCopy(value, button); return false; }
    button.focus({ preventScroll: true });
    notify('原稿・一次情報・制作条件と、最終確認の指示をコピーしました。', 'good');
    const modal = button.closest('[data-fp-modal]');
    if (modal) {
      const notice = messageNode(modal);
      notice.querySelector('b').textContent = 'コピーしました';
      notice.querySelector('p').textContent = '画像制作チャットに貼り付けてください。最終確認から開始する指示を含めています。原稿の完成状態は変更していません。';
    }
    return true;
  }
  // Capture phase avoids the original ready-only handler; recheck on every click.
  doc.addEventListener('click', async event => {
    const button = event.target.closest?.('[data-fp-copy-package]');
    if (!button) return;
    const item = lookup(button.dataset.fpCopyPackage), pipe = pipeline();
    if (!item || !pipe) return;
    const state = api.policy(item, pipe);
    if (!state.reviewOnly && !button.dataset.ccReviewCopy) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (!state.allowed) { notify(state.issues.join('／') || '最終確認用コピーの条件が揃っていません。', 'bad'); refresh(); return; }
    try { await copy(api.build(item, pipe), button); }
    catch (error) { notify(error.message || 'コピーを作成できませんでした。', 'bad'); }
  }, true);
  let queued = false;
  function queue() {
    if (queued) return;
    queued = true;
    (root.requestAnimationFrame || (fn => root.setTimeout(fn, 0)))(() => { queued = false; refresh(); });
  }
  const observer = new root.MutationObserver(mutations => {
    if (mutations.some(m => m.type === 'childList' || m.target.matches?.('[data-fp-copy-package]'))) queue();
  });
  observer.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
  const style = doc.createElement('style');
  style.textContent = '.fp-draft-modal [data-cc-review-hidden][hidden]{display:none!important}.cc-review-notice p{margin:5px 0 0;line-height:1.5}.cc-review-manual-copy{padding:10px;background:#fff1b8;border:1px solid #8b6800;margin-bottom:10px}.cc-review-manual-copy textarea{display:block;box-sizing:border-box;width:100%;margin-top:8px;font:inherit;white-space:pre-wrap}@media(max-width:700px){.fp-draft-dialog>footer [data-cc-review-copy]{flex-basis:100%}}';
  doc.head.append(style);
  api.refresh = refresh;
  queue();
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const list = value => Array.isArray(value) ? value : [];
  const text = value => String(value ?? '').trim();
  function isChat(item) {
    const p = item?.payload || {};
    return text(p.execution_source || p.execution_channel || item?.execution_source || item?.execution_channel).toLowerCase() === 'chat';
  }
  function isModelOnlyIssue(value) {
    const code = typeof value === 'string' ? value : value?.code;
    return ['model_execution_unverified', '指定モデルの実行証跡を取得できていない。'].includes(text(code));
  }
  function policy(item, pipe) {
    const p = item?.payload || {}, quality = pipe?.packageQuality?.(item), issues = [];
    const candidate = isChat(item) && pipe?.contentCandidate?.(item)
      && p.draft_status === 'blocked' && p.review_status === 'needs_current_final_review'
      && p.blocked_reason === 'model_execution_unverified' && p.research_status === 'verified';
    if (!candidate || !quality) return { reviewOnly: false, allowed: false, issues: [] };
    if (!['S', 'A'].includes(item.priority) || !(Number(item.score) >= 80 && Number(item.score) <= 100)) issues.push('S/A判定の原稿ではありません');
    issues.push(...list(quality.issues).filter(issue => issue !== '完成原稿が未確定'));
    if (list(p.missing_evidence).length) issues.push('未解決の根拠不足があります');
    if (list(p.public_leak_issues).length) issues.push('公開原稿に内部情報が残っています');
    if (list(p.final_review?.unresolved_items).some(issue => !isModelOnlyIssue(issue))) issues.push('モデル証跡以外の未解決事項があります');
    const slides = list(p.draft_slides), sources = list(p.draft_sources);
    if (slides.length < 6 || slides.length > 8) issues.push('6〜8枚のページ別原稿が必要です');
    if (slides.some((slide, i) => Number(slide.page) !== i + 1 || !text(slide.headline) || !text(slide.body) || !text(slide.visual_mode) || !text(slide.visual))) issues.push('ページ順またはページ別原稿・制作指示が不足しています');
    if (!sources.length || sources.some(source => !text(source.id) || !/^https?:\/\//.test(text(source.url)) || !text(source.claim) || !text(source.checked_at))) issues.push('確認日と主張を含む一次情報が必要です');
    if (sources.some(source => /(?:girlschannel(?:\.net)?|ガールズ[ちチ]ゃんねる|ガルちゃん)/i.test([source.url, source.label, source.title, source.claim, source.note].filter(Boolean).join(' ')))) issues.push('一次情報に内部調査元が混入しています');
    const ids = new Set(sources.map(source => text(source.id)));
    if (slides.some(slide => list(slide.source_refs).some(id => !ids.has(text(id))))) issues.push('ページの根拠IDに対応する一次情報がありません');
    if (!text(p.production_spec?.size) || !text(p.production_spec?.ratio)) issues.push('画像サイズ・比率が未保存です');
    if (list(p.screenshot_requests).some(row => !text(row.id) || !/^https?:\/\//.test(text(row.url)) || !text(row.capture_range || row.capture_area))) issues.push('スクショの取得先・範囲が未保存です');
    if (issues.length) return { reviewOnly: false, allowed: false, issues: [...new Set(issues)] };
    const preflight = pipe.preflightIssues?.(p);
    if (!Array.isArray(preflight)) return { reviewOnly: false, allowed: false, issues: ['制作条件を判定できません'] };
    return { reviewOnly: true, allowed: preflight.length === 0, issues: preflight };
  }
  function build(item, pipe) {
    const state = policy(item, pipe);
    if (!state.allowed) throw Error(state.issues.join('／') || '最終確認用コピーの条件が揃っていません。');
    if (typeof pipe.buildHandoff !== 'function') throw Error('画像化用コピーの作成機能を読み込めませんでした。');
    const p = item.payload;
    const body = pipe.buildHandoff(item)
      .replace(/^以下の確定原稿から、カルーセル画像を作成してください。/, '以下は、最終確認を行ってから画像制作へ渡す原稿と制作条件です。')
      .replaceAll('【ページ別の確定原稿】', '【ページ別の確認対象原稿】')
      .replaceAll('全ページを確定原稿と1枚ずつ照合', '全ページを最終確認に合格した原稿と1枚ずつ照合');
    const header = [
      '【画像制作前の最終確認が必要：この原稿はまだ完成扱いではありません】',
      'これは最終確認へ渡すためのコピーです。コピーできたことは、原稿の承認や指定モデルでの確認完了を意味しません。',
      '未完了の項目：指定モデルでの最終照合の実行確認。保存状態は blocked / needs_current_final_review のままです。',
      '',
      '【先に行う確認】',
      '1. 画像を生成する前に、全ページ、タイトル、キャプションを、以下の一次情報と照合してください。数字・単位・条件・例外・ページ順・語り手の体験・スクショ範囲・選択した制作条件を確認してください。',
      '2. 指定された確認モデルは gpt-6-astra（reasoning_effort=medium）です。正式に利用できる場合だけ使用し、名前を記載しただけでモデルを切り替えたと扱わないでください。実使用を確認できない場合は未確認と報告し、「Astra確認済み」と書かないでください。',
      '3. 指定モデルでの確認、内容の不一致、必要な素材など、必須条件が未解決なら画像生成を開始せず、該当箇所を示してください。修正した場合は修正版を再照合し、合格した版だけ画像化してください。',
      '4. 原稿の意味や数字を推測で補わないでください。内部の需要調査情報は公開素材に追加しないでください。',
      '5. この確認指示・保存状態は画像やキャプションに載せないでください。',
      '',
      '【一次情報ID対応】',
      ...p.draft_sources.map(source => `${source.id}｜${source.label || source.title || ''}｜${source.url}｜確認：${source.checked_at}`),
      ''
    ].join('\n');
    return header + '\n' + body;
  }
  return { version: '206.2', isChat, policy, build };
});