/* Chat-only recovery path for drafts with substantive evidence gaps. No DB writes and no Work-side changes. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (!root || !root.document || root.CCChatResearchHandoff) return;
  root.CCChatResearchHandoff = api;

  const doc = root.document;
  const remembered = new Map();
  const originals = new WeakMap();
  const pipeline = () => root.__carouselContentPipeline || root.__fpContentPipeline;

  function lookup(id) {
    let rows = [];
    try { if (typeof app !== 'undefined') rows = app.items || []; } catch (_) {}
    return rows.find(item => String(item?.id) === String(id)) || remembered.get(String(id));
  }

  if (typeof cardHtml === 'function') {
    const previous = cardHtml;
    cardHtml = function (item) {
      if (item?.id) remembered.set(String(item.id), item);
      return previous.apply(this, arguments);
    };
  }

  const notify = (message, kind = 'good') => {
    if (typeof root.toast === 'function') root.toast(message, kind);
  };

  function originalState(button) {
    if (!originals.has(button)) {
      originals.set(button, {
        label: button.textContent,
        title: button.getAttribute('title'),
        disabled: !!button.disabled
      });
    }
    return originals.get(button);
  }

  function noticeNode(modal) {
    let node = modal.querySelector('[data-cc-research-notice]');
    if (!node) {
      node = doc.createElement('div');
      node.dataset.ccResearchNotice = '1';
      node.className = 'fp-package-status blocked cc-research-notice';
      node.setAttribute('role', 'status');
      const title = doc.createElement('b');
      const detail = doc.createElement('p');
      node.append(title, detail);
      modal.querySelector('.fp-draft-dialog > main')?.prepend(node);
    }
    return node;
  }

  function showResearchState(button, item) {
    originalState(button);
    button.dataset.ccResearchCopy = '1';
    button.disabled = false;
    button.textContent = '追加調査用にコピー';
    button.title = '不足している根拠をChatで追加調査するための指示をコピーします。画像化はまだ行いません。';

    const modal = button.closest('[data-fp-modal]') || button.closest('.fp-draft-modal') || button.closest('.fp-draft-dialog');
    if (!modal) return;
    const node = noticeNode(modal);
    node.querySelector('b').textContent = '根拠不足：追加調査が必要';
    node.querySelector('p').textContent = 'Chat版だけの追加調査用コピーを作れます。根拠が揃うまで画像化はしません。Work版のタスク・原稿・状態は変更しません。';
  }

  function restore(button) {
    if (!button.dataset.ccResearchCopy) return;
    const original = originals.get(button);
    delete button.dataset.ccResearchCopy;
    if (original) {
      button.textContent = original.label;
      if (original.title === null) button.removeAttribute('title'); else button.title = original.title;
      button.disabled = original.disabled;
    }
    const modal = button.closest('[data-fp-modal]') || button.closest('.fp-draft-modal') || button.closest('.fp-draft-dialog');
    modal?.querySelector('[data-cc-research-notice]')?.remove();
  }

  function refresh() {
    const pipe = pipeline();
    doc.querySelectorAll('[data-fp-copy-package]').forEach(button => {
      const item = lookup(button.dataset.fpCopyPackage);
      if (!item) return;
      if (api.needsResearch(item, pipe)) showResearchState(button, item);
      else restore(button);
    });
  }

  function manualCopy(value, button) {
    const parent = button.closest('.fp-draft-dialog')?.querySelector('main') || button.parentElement || doc.body;
    parent.querySelector('[data-cc-research-manual-copy]')?.remove();
    const box = doc.createElement('section');
    const label = doc.createElement('label');
    const area = doc.createElement('textarea');
    box.dataset.ccResearchManualCopy = '1';
    box.className = 'cc-research-manual-copy';
    label.textContent = '自動コピーが使えません。下の追加調査指示を選択してコピーしてください。';
    area.value = value;
    area.readOnly = true;
    area.rows = 12;
    area.setAttribute('aria-label', 'Chat版の追加調査指示');
    label.append(area);
    box.append(label);
    parent.prepend(box);
    area.focus();
    area.select();
    notify('自動コピーできませんでした。表示した追加調査指示を手動でコピーしてください。', 'bad');
  }

  async function copy(value, button) {
    let copied = false;
    try {
      if (typeof root.navigator?.clipboard?.writeText !== 'function') throw Error('Clipboard API unavailable');
      await root.navigator.clipboard.writeText(value);
      copied = true;
    } catch (_) {
      const area = doc.createElement('textarea');
      const parent = button.closest('.fp-draft-dialog') || doc.body;
      area.value = value;
      area.style.cssText = 'position:fixed;left:0;top:0;opacity:0;width:1px;height:1px';
      parent.append(area);
      area.focus();
      area.select();
      try { copied = doc.execCommand('copy') === true; } catch (_) {}
      area.remove();
    }
    if (!copied) {
      manualCopy(value, button);
      return false;
    }

    button.focus({ preventScroll: true });
    notify('Chat版の追加調査指示をコピーしました。Work版は変更しません。', 'good');
    const modal = button.closest('[data-fp-modal]') || button.closest('.fp-draft-modal') || button.closest('.fp-draft-dialog');
    if (modal) {
      const node = noticeNode(modal);
      node.querySelector('b').textContent = '追加調査用コピーを作成しました';
      node.querySelector('p').textContent = 'Chatへ貼り付けて不足根拠を調査してください。根拠が揃うまで画像化しない指示を含めています。';
    }
    return true;
  }

  doc.addEventListener('click', async event => {
    const button = event.target.closest?.('[data-fp-copy-package]');
    if (!button) return;
    const item = lookup(button.dataset.fpCopyPackage);
    const pipe = pipeline();
    if (!item || !api.needsResearch(item, pipe)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      await copy(api.build(item), button);
    } catch (error) {
      notify(error.message || '追加調査用コピーを作成できませんでした。', 'bad');
    }
  }, true);

  let queued = false;
  function queue() {
    if (queued) return;
    queued = true;
    (root.requestAnimationFrame || (fn => root.setTimeout(fn, 0)))(() => {
      queued = false;
      refresh();
    });
  }

  const observer = new root.MutationObserver(mutations => {
    if (mutations.some(m => m.type === 'childList' || m.target.matches?.('[data-fp-copy-package]'))) queue();
  });
  observer.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });

  const style = doc.createElement('style');
  style.textContent = '.cc-research-notice p{margin:5px 0 0;line-height:1.5}.cc-research-manual-copy{padding:10px;background:#fff1b8;border:1px solid #8b6800;margin-bottom:10px}.cc-research-manual-copy textarea{display:block;box-sizing:border-box;width:100%;margin-top:8px;font:inherit;white-space:pre-wrap}';
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

  function gapText(value) {
    if (typeof value === 'string') return text(value);
    return text(value?.message || value?.reason || value?.code || value?.label || value?.detail);
  }

  function modelOnlyGap(value) {
    const valueText = gapText(value).toLowerCase();
    if (!valueText) return false;
    return [
      'final_review',
      'verified_model_execution',
      'model_execution_unverified',
      'pre_image_review'
    ].includes(valueText)
      || /(?:astra|指定モデル|model[_ ]?execution|実行証跡|最終照合の実行確認)/i.test(gapText(value));
  }

  function substantiveGaps(item) {
    const p = item?.payload || {};
    const missing = list(p.missing_evidence).filter(value => !modelOnlyGap(value));
    const unresolved = list(p.final_review?.unresolved_items).filter(value => !modelOnlyGap(value));
    return [...missing, ...unresolved];
  }

  function needsResearch(item, pipe) {
    if (!isChat(item)) return false;
    if (pipe?.contentCandidate && !pipe.contentCandidate(item)) return false;
    return substantiveGaps(item).length > 0;
  }

  function lineList(values) {
    return values.map(value => '- ' + (gapText(value) || JSON.stringify(value))).join('\n');
  }

  function build(item) {
    if (!needsResearch(item)) throw Error('追加調査が必要なChat原稿ではありません。');
    const p = item?.payload || {};
    const gaps = substantiveGaps(item);
    const lineage = p.question_lineage || {};
    const demand = p.demand_evidence || {};
    const slides = list(p.draft_slides);
    const sources = list(p.draft_sources);
    const premises = list(p.premise_checks);
    const screenshots = list(p.screenshot_requests);

    const slideText = slides.map((slide, index) => [
      `【${Number(slide.page) || index + 1}/${slides.length}】 ${text(slide.headline)}`,
      text(slide.body),
      text(slide.teaser) ? `teaser: ${text(slide.teaser)}` : '',
      list(slide.source_refs).length ? `source_refs: ${list(slide.source_refs).map(text).join(', ')}` : ''
    ].filter(Boolean).join('\n')).join('\n\n');

    const sourceText = sources.map(source => [
      `- [${text(source.id)}] ${text(source.label || source.title)}`,
      `  claim: ${text(source.claim)}`,
      `  URL: ${text(source.url)}`,
      text(source.checked_at) ? `  確認: ${text(source.checked_at)}` : '',
      text(source.note) ? `  note: ${text(source.note)}` : ''
    ].filter(Boolean).join('\n')).join('\n');

    const premiseText = premises.map(row => [
      `- ${text(row.claim)}`,
      `  status: ${text(row.status)}`,
      text(row.official_url) ? `  URL: ${text(row.official_url)}` : '',
      text(row.note) ? `  note: ${text(row.note)}` : ''
    ].filter(Boolean).join('\n')).join('\n');

    const screenshotText = screenshots.map(row => [
      `- ${text(row.label || row.id)}`,
      `  URL: ${text(row.url)}`,
      `  範囲: ${text(row.capture_range || row.capture_area)}`,
      text(row.purpose) ? `  目的: ${text(row.purpose)}` : ''
    ].filter(Boolean).join('\n')).join('\n');

    return [
      '【Chat版｜追加調査用】',
      'この原稿は根拠不足のため画像化を停止しています。以下の不足項目を追加調査してください。',
      'このコピーはChat版だけの作業です。Work版のタスク、プロンプト、保存済み原稿、採否、状態、スケジュールは変更しないでください。',
      '',
      '【調査ルール】',
      '1. 不足項目ごとに、制度・数字・条件を支える一次情報または最も直接的な公式資料を実際に開いて確認してください。検索結果のスニペット、SNS、掲示板の多数意見だけで確定しないでください。',
      '2. 確認できない事実は推測で埋めず、未確認のまま残してください。',
      '3. 既存のChat版原稿は全面的に書き直さず、追加調査の結果と矛盾する箇所・根拠が不足している箇所だけ必要な範囲で修正してください。',
      '4. 調査後、タイトル、キャプション、全ページ、数字、単位、条件、例外、source_refsと一次情報の対応を再照合してください。',
      '5. substantiveな根拠不足が1件でも残る場合は画像生成へ進まないでください。',
      '',
      '【今回解消する根拠不足】',
      lineList(gaps),
      '',
      '【中心疑問】',
      `source_question: ${text(lineage.source_question) || '未保存'}`,
      `selected_question: ${text(lineage.selected_question || p.topic) || '未保存'}`,
      `answer_target: ${text(lineage.answer_target) || '未保存'}`,
      '',
      '【内部の元ネタ情報｜公開原稿へは出さない】',
      `source_title: ${text(p.source_title) || '未保存'}`,
      `source_url: ${text(p.source_url || item?.source_url) || '未保存'}`,
      `source_post_summary: ${text(p.source_post_summary) || '未保存'}`,
      list(p.source_anchor_comment_nos).length ? `source_anchor_comment_nos: ${list(p.source_anchor_comment_nos).join(', ')}` : '',
      '',
      '【需要確認の現状｜内部資料】',
      `verdict: ${text(demand.verdict) || '未保存'}`,
      `checked_scope: ${text(demand.checked_scope || p.checked_scope) || '未保存'}`,
      `question_demand: ${text(demand.question_demand) || '未保存'}`,
      list(demand.evidence_comment_nos).length ? `evidence_comment_nos: ${list(demand.evidence_comment_nos).join(', ')}` : '',
      '',
      '【現在のChat版公開原稿】',
      `タイトル: ${text(p.post_title || item?.title)}`,
      text(p.draft_cover) ? `表紙: ${text(p.draft_cover)}` : '',
      slideText || 'ページ別原稿なし',
      '',
      '【キャプション】',
      text(p.caption) || '未保存',
      '',
      '【確認済み一次情報】',
      sourceText || 'なし',
      '',
      '【前提チェック】',
      premiseText || 'なし',
      '',
      '【スクショ指示】',
      screenshotText || 'なし',
      '',
      '【終了条件】',
      '不足根拠を解消できた項目と、解消できなかった項目を分けて示してください。修正が必要な場合はChat版原稿だけを修正し、Work版には触れないでください。'
    ].filter(Boolean).join('\n');
  }

  return { version: '210.1', isChat, modelOnlyGap, substantiveGaps, needsResearch, build };
});