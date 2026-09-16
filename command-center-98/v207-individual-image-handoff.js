/* Image handoff output format only. Never marks a draft ready or writes records. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (!root || !root.document || root.CCIndividualImages) return;
  root.CCIndividualImages = api;
  const doc = root.document, remembered = new Map();
  const pipe = () => root.__carouselContentPipeline || root.__fpContentPipeline;
  const notify = (message, kind = 'good') => { if (typeof root.toast === 'function') root.toast(message, kind); };
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
  async function resolveItem(id) {
    const cached = lookup(id);
    if (cached) return cached;
    // The existing HOME priority board has a private accepted-items cache.
    // Only when that board's copy is clicked, read its existing endpoint and match ID.
    if (typeof authHeaders !== 'function') throw Error('原稿を開き直してからコピーしてください。');
    const response = await root.fetch('https://yibtmqsbyodhsudenktm.supabase.co/functions/v1/command-center-retro-api?view=accepted', { cache: 'no-store', headers: authHeaders() });
    if (!response.ok) throw Error('原稿を取得できませんでした。画面を更新してください。');
    const data = await response.json();
    if (!data?.ok || !Array.isArray(data.items)) throw Error('原稿データを確認できませんでした。');
    const item = data.items.find(row => String(row.id) === String(id));
    if (!item) throw Error('対象の原稿が見つかりません。原稿一覧から開き直してください。');
    remembered.set(String(id), item);
    return item;
  }
  function selection(item) {
    const pipeline = pipe();
    if (!pipeline?.contentCandidate?.(item)) throw Error('画像化用の原稿ではありません。');
    if (pipeline.packageQuality(item).ready && pipeline.preflightIssues(item.payload || {}).length === 0) {
      return { body: pipeline.buildHandoff(item), mode: 'ready' };
    }
    const review = root.CCReviewHandoff, state = review?.policy?.(item, pipeline);
    if (state?.reviewOnly && state.allowed) return { body: review.build(item, pipeline), mode: 'review' };
    throw Error(state?.issues?.join('／') || '原稿の確認・根拠・制作条件が揃っていません。');
  }
  function manualCopy(value, button) {
    const parent = button.closest('.fp-draft-dialog')?.querySelector('main') || button.parentElement || doc.body;
    parent.querySelector('[data-cc-image-manual-copy]')?.remove();
    const box = doc.createElement('section'), label = doc.createElement('label'), area = doc.createElement('textarea');
    box.dataset.ccImageManualCopy = '1';
    box.className = 'cc-image-manual-copy';
    label.textContent = '自動コピーは未完了です。下の全文を選択してコピーしてください。';
    area.value = value; area.readOnly = true; area.rows = 10;
    area.setAttribute('aria-label', '1ページ1画像の生成指示・原稿・一次情報');
    label.append(area); box.append(label); parent.prepend(box); area.focus(); area.select();
    notify('自動コピーできませんでした。表示した全文を手動でコピーしてください。', 'bad');
  }
  async function copy(value, button, count, mode) {
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
    notify('全' + count + 'ページを1枚ずつ生成する指示をコピーしました。' + (mode === 'review' ? '最終確認の指示も含みます。' : ''));
  }
  // Window capture runs before the existing document ready/review handlers. This
  // covers both lexical buildHandoff() and v206 without weakening either gate.
  root.addEventListener('click', async event => {
    const button = event.target.closest?.('[data-fp-copy-package]');
    if (!button || button.disabled) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (button.dataset.ccImageCopyBusy) return;
    button.dataset.ccImageCopyBusy = '1';
    try {
      const item = await resolveItem(button.dataset.fpCopyPackage), current = selection(item);
      const value = api.build(current.body, item, current.mode);
      await copy(value, button, api.spec(item).count, current.mode);
    } catch (error) { notify(error.message || '画像化用コピーを作成できませんでした。', 'bad'); }
    finally { delete button.dataset.ccImageCopyBusy; }
  }, true);

  function refresh() {
    doc.querySelectorAll('[data-fp-modal]').forEach(modal => {
      const button = modal.querySelector('[data-fp-copy-package]');
      const item = button && lookup(button.dataset.fpCopyPackage);
      if (!item) return;
      let count;
      try { count = api.spec(item).count; } catch (_) { return; }
      let note = modal.querySelector('[data-cc-individual-images]');
      if (!note) {
        note = doc.createElement('p'); note.dataset.ccIndividualImages = '1';
        note.className = 'cc-individual-image-note';
        modal.querySelector('.fp-draft-dialog > main')?.prepend(note);
      }
      const label = '画像の出力：全' + count + '枚を、1ページずつ別画像で生成・表示。コラージュは作りません。';
      if (note.textContent !== label) note.textContent = label;
    });
  }
  let queued = false;
  const queue = () => {
    if (queued) return;
    queued = true;
    (root.requestAnimationFrame || (fn => root.setTimeout(fn, 0)))(() => { queued = false; refresh(); });
  };
  const observer = new root.MutationObserver(mutations => { if (mutations.some(m => m.addedNodes.length)) queue(); });
  observer.observe(doc.body, { childList: true, subtree: true });
  const style = doc.createElement('style');
  style.textContent = '.cc-individual-image-note{margin:0 0 10px;padding:8px 10px;background:#fff;border-left:4px solid #000080;color:#111;font-size:12px;line-height:1.6}.cc-image-manual-copy{padding:10px;background:#fff1b8;border:1px solid #8b6800}.cc-image-manual-copy textarea{display:block;box-sizing:border-box;width:100%;margin-top:7px;font:inherit}';
  doc.head.append(style);
  api.refresh = refresh;
  queue();
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
  function contract(item, mode) {
    const { count, size, ratio } = spec(item);
    const order = Array.from({ length: count }, (_, i) => (i + 1) + '/' + count).join(' → ');
    return [
      '【画像出力の必須仕様：1ページ＝1画像／1回の生成＝1ページ】',
      '完成品は全' + count + '枚の独立した画像です。「全' + count + 'ページを並べた1枚の画像」ではありません。',
      '「カルーセル」は別画像を順番に投稿する形式を指します。1枚の中に複数ページを配置する指示ではありません。',
      size || ratio ? 'サイズ・比率：' + [size, ratio].filter(Boolean).join('／') + '。これは各画像1枚の指定であり、全ページを合成したキャンバスの指定ではありません。' : '',
      '',
      '【生成の手順】',
      '0. 下記の原稿照合・一次情報・素材・指定モデルなどの確認条件を先に満たしてください。この出力指定は確認条件を解除しません。',
      mode === 'review' ? 'この原稿は最終確認待ちです。確認を飛ばして生成したり、コピーできたことを完成・承認済みと扱ったりしないでください。' : '',
      '1. 全ページの原稿は、順序と統一デザインを確認するための管理用データです。全ページの文章を1枚の描画対象にしないでください。',
      '2. 画像生成機能を1回呼ぶごとに、対象を1ページだけに限定し、出力も1枚だけにしてください。そのページの文章・図・必要な資料だけを描画し、他ページの原稿・縮小版・予告画像を入れないでください。',
      '3. ' + order + 'の順に、対象ページを単独で生成 → 原稿と照合 → 画像そのものをチャット内に直接表示 → 次のページを単独で生成、を繰り返してください。',
      '4. 各画像にはそのページの現在番号／総ページ数を記載します。総ページ数は番号の情報であり、全ページを1画像に並べる意味ではありません。',
      '5. 連続して生成できる環境では、毎ページの追加確認を求めず同じ手順で進めてください。続行できない場合は、未生成のページ番号を示して停止し、代わりにまとめ画像を作らないでください。',
      '',
      '【禁止する出力】',
      'コラージュ、2列×3段などの複数ページ配置、分割パネル、グリッド、一覧画像、コンタクトシート、全ページの縮小プレビュー。完成品でも確認用でも作らないでください。',
      '単一ページ内の説明図・比較図は原稿どおりで構いません。禁止対象は「別ページ同士を1枚の画像へ並べること」です。',
      '最初に全ページの合成画像を生成して後から切り分ける方法も使わないでください。最初から各ページを個別に描画してください。',
      '画像本体の代わりに文字リンク・ファイル名・ZIPだけを出さないでください。各ページを独立した画像として、指定順に直接表示してください。',
      '',
      '【表示前の検品】',
      '生成した画像に2ページ以上が入っていたら不合格です。その画像を完成品として表示せず、同じ対象ページ1枚だけを再生成してください。正常な別ページの画像や原稿は変更しないでください。',
      '合格条件：独立画像が全' + count + '枚／各画像は1ページ分のみ／順番とページ番号が一致／原稿・数字・選択したデザインを保持。',
      'この手順文を画像やキャプションへ印字しないでください。',
      '【画像出力仕様ここまで】'
    ].filter(line => line !== '').join('\n');
  }
  function build(base, item, mode = 'ready') {
    if (typeof base !== 'string' || !base.trim()) throw Error('画像化用コピーの本文がありません。');
    if (!['ready', 'review'].includes(mode)) throw Error('画像化用コピーの種別が不正です。');
    // Keep the entire existing handoff byte-for-byte; only prepend the output contract.
    return contract(item, mode) + '\n\n' + base;
  }
  return { version: '207.1', spec, contract, build };
});
