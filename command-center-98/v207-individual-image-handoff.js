/* Chat image handoff controller. Reuses the existing Work/Astra carousel prompt; never alters Work clicks or records. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (!root || !root.document || root.CCIndividualImages) return;
  root.CCIndividualImages = api;
  const doc = root.document, remembered = new Map();
  const pipe = () => root.__carouselContentPipeline || root.__fpContentPipeline;
  const notify = (message, kind = 'good') => { if (typeof root.toast === 'function') root.toast(message, kind); };

  function provenance(item) {
    if (root.CCChatExecution?.isChat?.(item)) return 'chat';
    const p = item?.payload || item?.sourcePayload?.event?.payload || item?.source_payload?.event?.payload || {};
    return String(p.execution_source || p.execution_channel || item?.execution_source || item?.execution_channel || '').trim().toLowerCase();
  }
  const isChat = item => provenance(item) === 'chat';

  if (typeof cardHtml === 'function') {
    const previous = cardHtml;
    cardHtml = function (item) {
      if (item?.id) remembered.set(String(item.id), item);
      return previous.apply(this, arguments);
    };
  }
  function lookup(id) {
    let rows = [];
    try { if (typeof app !== 'undefined') rows = app.items || []; } catch (_) {}
    return rows.find(row => String(row.id) === String(id)) || remembered.get(String(id));
  }

  function selection(item) {
    const pipeline = pipe();
    if (!pipeline?.contentCandidate?.(item)) throw Error('画像化用の原稿ではありません。');
    if (pipeline.packageQuality(item).ready && pipeline.preflightIssues(item.payload || {}).length === 0) {
      return { body: pipeline.buildHandoff(item), mode: 'ready' };
    }
    // Legacy Chat drafts that were blocked only by the old Astra evidence gate may
    // still use the review policy as a safety gate. The copied text itself is the
    // normal buildHandoff() text, exactly like the established Work/Astra path.
    const review = root.CCReviewHandoff, state = review?.policy?.(item, pipeline);
    if (state?.reviewOnly && state.allowed) {
      return { body: pipeline.buildHandoff(item), mode: 'review' };
    }
    throw Error(state?.issues?.join('／') || '原稿の確認・根拠・制作条件が揃っていません。');
  }

  function manualCopy(value, button) {
    const parent = button.closest('.fp-draft-dialog')?.querySelector('main') || button.parentElement || doc.body;
    parent.querySelector('[data-cc-image-manual-copy]')?.remove();
    const box = doc.createElement('section'), label = doc.createElement('label'), area = doc.createElement('textarea');
    box.dataset.ccImageManualCopy = '1'; box.className = 'cc-image-manual-copy';
    label.textContent = '自動コピーは未完了です。下の全文を選択してコピーしてください。';
    area.value = value; area.readOnly = true; area.rows = 10;
    area.setAttribute('aria-label', '画像化用の原稿・一次情報・制作条件');
    label.append(area); box.append(label); parent.prepend(box); area.focus(); area.select();
    notify('自動コピーできませんでした。表示した全文を手動でコピーしてください。', 'bad');
  }
  async function copy(value, button) {
    let copied = false;
    try { await root.navigator.clipboard.writeText(value); copied = true; }
    catch (_) {
      const area = doc.createElement('textarea');
      area.value = value; area.style.cssText = 'position:fixed;left:0;top:0;opacity:0;width:1px;height:1px';
      (button.closest('.fp-draft-dialog') || doc.body).append(area); area.focus(); area.select();
      try { copied = doc.execCommand('copy') === true; } catch (_) {}
      area.remove();
    }
    if (!copied) { manualCopy(value, button); return; }
    button.focus({ preventScroll: true });
    notify('Astra側と同じ制作手順の画像化用コピーを作成しました。Chat内でそのまま実行できます。');
  }

  // Chat only. Non-Chat clicks are deliberately left untouched so the original
  // Work/Astra handler receives them exactly as before this compatibility layer.
  root.addEventListener('click', event => {
    const button = event.target.closest?.('[data-fp-copy-package]');
    if (!button || button.disabled) return;
    const item = lookup(button.dataset.fpCopyPackage);
    if (!item || !isChat(item)) return;

    event.preventDefault(); event.stopImmediatePropagation();
    if (button.dataset.ccImageCopyBusy) return;
    button.dataset.ccImageCopyBusy = '1';
    Promise.resolve().then(async () => {
      try {
        const current = selection(item);
        const value = api.build(current.body, item, current.mode);
        await copy(value, button);
      } catch (error) { notify(error.message || '画像化用コピーを作成できませんでした。', 'bad'); }
      finally { delete button.dataset.ccImageCopyBusy; }
    });
  }, true);

  const style = doc.createElement('style');
  style.textContent = '.cc-image-manual-copy{padding:10px;background:#fff1b8;border:1px solid #8b6800}.cc-image-manual-copy textarea{display:block;box-sizing:border-box;width:100%;margin-top:7px;font:inherit}';
  doc.head.append(style);
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const text = value => String(value ?? '').trim();
  function spec(item) {
    const payload = item?.payload || item?.sourcePayload?.event?.payload || item?.source_payload?.event?.payload || item?.sourcePayload || item?.source_payload || {};
    const slides = payload.draft_slides;
    if (!Array.isArray(slides) || !slides.length) throw Error('ページ別原稿が見つかりません。');
    if (slides.some((slide, i) => !slide || (slide.page != null && Number(slide.page) !== i + 1))) throw Error('ページ順が不連続です。原稿を確認してください。');
    return { count: slides.length, size: text(payload.production_spec?.size), ratio: text(payload.production_spec?.ratio) };
  }
  function build(base, item, mode = 'ready') {
    if (typeof base !== 'string' || !base.trim()) throw Error('画像化用コピーの本文がありません。');
    if (!['ready', 'review'].includes(mode)) throw Error('画像化用コピーの種別が不正です。');
    // Intentionally add nothing. Chat uses the established buildHandoff() program
    // verbatim; only the execution environment differs from Work/Astra.
    return base;
  }
  return { version: '207.2', spec, build };
});
