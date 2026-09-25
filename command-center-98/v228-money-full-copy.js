/* Money Chat: one authoritative display_copy for preview and review export.
 * Read-only adapter; never rewrites payloads, LOCKs, reviews or Work data.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (!root || !root.document || root.CCMoneyFullCopy) return;
  root.CCMoneyFullCopy = api;
  api.install(root);
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const VERSION = '230.1';
  const TASK_ID = '6aa9ee1043388191a2eac3bb2702092a';
  const EDITORIAL_VERSION = 'money-spine-editor-v1-20260925';
  const list = x => Array.isArray(x) ? x : [];
  const text = x => typeof x === 'string' ? x : '';
  const trim = x => text(x).trim();
  const escape = x => text(x).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const unique = xs => [...new Set(xs.filter(Boolean))];
  const awaitingEditorial = p => p.editorial_workflow_version === EDITORIAL_VERSION && p.editorial_stage !== 'final';
  function payload(item) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('原稿データを取得できません。');
    const p = Object.prototype.hasOwnProperty.call(item, 'payload') ? item.payload : item;
    if (!p || typeof p !== 'object' || Array.isArray(p) || !Object.keys(p).length) throw new Error('原稿データが空です。');
    return p;
  }
  function applies(item) {
    let p; try { p = payload(item); } catch (_) { return false; }
    if (p.execution_source === 'work' || p.execution_channel === 'work') return false;
    if ((p.execution_source || p.execution_channel) !== 'chat') return false;
    if (p.source_task_id && p.source_task_id !== TASK_ID) return false;
    return p.content_type === 'fp_post_candidate' &&
      (p.source_task_id === TASK_ID || p.adaptive_scope === 'money_chat') &&
      (trim(p.generation_version).startsWith('adaptive-carousel-') || p.adaptive_design?.mode === 'adaptive');
  }
  function canonicalPages(item) {
    const p = payload(item);
    return list(p.draft_slides).map((slide, index) => {
      const c = slide?.page_contract || {};
      return { page:Number(slide?.page) || index + 1, role:text(slide?.role),
        copy:text(c.display_copy), missing:!trim(c.display_copy),
        attribution:c.direct_quote === true ? text(c.quote_source?.public_attribution) : '',
        phenomenon:text(c.phenomenon), reader_question:text(c.reader_question),
        answer:text(c.answer), visual_subject:text(c.visual_subject), visual_type:text(c.visual_type),
        source_refs:list(c.source_refs), calculation:c.calculation ?? null,
        required_assets:list(c.required_assets) };
    });
  }
  function inspect(item, adaptive) {
    const p = payload(item), pages = canonicalPages(item), issues = [], assetIssues = [];
    if (!applies(item)) throw new Error('現行お金Chatの原稿ではありません。');
    if (awaitingEditorial(p)) return {draftReady:false,imageReady:false,
      issues:[p.entrance_selection?.source === 'command_center_user' ? '高度AIによる原稿完成待ち' : '入口を1つ選んでください'],assetIssues:[],pages};
    if (!pages.length) issues.push('ページ別原稿がありません。');
    pages.forEach(row => { if (row.missing) issues.push(row.page + 'ページ目のdisplay_copyが未保存です。'); });
    try {
      if (!adaptive || typeof adaptive.quality !== 'function' || !adaptive.adaptive?.(item)) throw new Error('品質検査を読み込めません。');
      const q = adaptive.quality(item, null);
      if (!q || typeof q.ready !== 'boolean' || !Array.isArray(q.issues)) throw new Error('品質検査の結果が不正です。');
      issues.push(...q.issues);
      if (!q.ready && !q.issues.length) issues.push('品質検査を通過していません。');
      if (typeof adaptive.preflightIssues !== 'function') throw new Error('画像化前の検査を読み込めません。');
      const pf = adaptive.preflightIssues(p, null);
      if (!Array.isArray(pf)) throw new Error('画像化前の検査結果が不正です。');
      assetIssues.push(...pf);
    } catch (error) { issues.push(error.message || '品質検査でエラーが発生しました。'); }
    if (p.draft_status !== 'ready') issues.push('保存された原稿状態は ' + (text(p.draft_status) || '未設定') + ' です。');
    if (trim(p.blocked_reason)) issues.push('保留理由: ' + p.blocked_reason);
    if (p.image_ready === false) assetIssues.push('画像化可能フラグがfalseです。');
    if (/^(?:blocked|awaiting|pending|failed)/.test(text(p.asset_status))) assetIssues.push('素材・画像化状態: ' + p.asset_status);
    return { draftReady:issues.length === 0, imageReady:issues.length === 0 && assetIssues.length === 0,
      issues:unique(issues), assetIssues:unique(assetIssues), pages };
  }
  function statusLines(p, state) {
    const strictIds = list(p.community_research?.strict_topic_ids).map(text).filter(Boolean);
    const minimum = Number(p.community_research?.min_topics) || 2;
    const demandStatus = (text(p.community_research?.status) || '未設定') +
      (strictIds.length ? '（' + strictIds.length + '/' + minimum + 'トピック）' : '');
    return [
      '原稿版: ' + (text(p.draft_revision) || '未設定'),
      '原稿状態: ' + (text(p.draft_status) || '未設定'),
      '画像化: ' + (state.imageReady ? '可能' : '保留（確認用コピーのみ）'),
      '保存された保留理由: ' + (text(p.blocked_reason) || 'なし'),
      '需要判定: ' + demandStatus,
      '保存済み最終照合: ' + (text(p.final_review?.status) || '未設定') + '（画像化可否とは別判定）',
      ...(!state.imageReady && trim(p.demand_evidence?.decision_reason) ? ['理由の説明: ' + p.demand_evidence.decision_reason] : []),
      ...unique([...state.issues, ...state.assetIssues]).map(s => '・' + s)
    ];
  }
  function buildReviewCopy(item, adaptive) {
    const p = payload(item), state = inspect(item, adaptive), spine = p.story_spine || {}, logic=p.logic_institution_review||{};
    if (awaitingEditorial(p)) return buildEditorialHandoff(item);
    const logicLines = p.logic_review_contract_version ? [
      '【制度・理屈ダブルチェック】',
      '状態: ' + (text(logic.status)||'未確認'),
      '論理: ' + (text(logic.logic_verdict)||'未確認'),
      '制度: ' + (text(logic.institution_verdict)==='not_applicable'?'対象外':(text(logic.institution_verdict)||'未確認')),
      '一次情報鮮度: ' + (text(logic.checks?.source_freshness)||'未確認'),
      '確認原稿版: ' + (text(logic.checked_revision)||'未保存'),
      '結論: ' + (text(logic.conclusion)||'未保存'),
      ...(list(logic.corrections).length?['修正: '+list(logic.corrections).join('／')]:[]),
      ...(list(logic.unresolved_items).length?['未解決: '+list(logic.unresolved_items).join('／')]:[]),
      ''
    ] : [];
    const lines = [
      '【確認用原稿｜内部資料・画像生成指示ではありません】',
      '公開文の正本は各ページのdisplay_copyです。旧見出し・旧補足文で代用していません。',
      'このコピーにある状態・入口候補・骨格・制作メモは画像へ描画しないでください。', '',
      '【状態】', ...statusLines(p, state), '',
      ...logicLines,
      '【原稿版・LOCK】', 'draft_revision: ' + text(p.draft_revision),
      'locked_at: ' + text(p.content_lock?.locked_at), '',
      '【タイトル】', text(p.post_title || p.draft_title || item.title), '',
      '【入口3案｜比較用・画像には選択した1案だけ】',
      '選択中: ' + (text(p.selected_entrance) || '未選択')
    ];
    for (const option of list(p.entrance_options)) lines.push('',
      text(option.label || option.key) + (option.key === p.selected_entrance ? '（選択中）' : ''),
      '入り方: ' + text(option.approach), text(option.display_copy) || '【表示文未保存】');
    lines.push('', '【投稿の骨格｜内部情報】', '中心疑問: ' + text(spine.central_question),
      '最終回答: ' + text(spine.final_answer), 'ページ数の理由: ' + text(p.page_count_reason));
    for (const beat of list(spine.beats)) lines.push(String(beat.page) + '｜' + text(beat.role) + '｜' + text(beat.phenomenon));
    lines.push('', '【ページ別原稿｜画像に表示する全文】');
    for (const row of state.pages) {
      lines.push('', '【' + row.page + '/' + state.pages.length + '】',
        '【画像に表示する全文】', row.missing ? '【display_copy未保存・旧本文で代用しません】' : row.copy,
        ...(row.attribution ? ['【直接引用の公開用出典】', row.attribution] : []),
        '【制作内部情報｜画像に文字として載せない】',
        '役割: ' + row.role, '現象: ' + row.phenomenon,
        '読者の疑問: ' + row.reader_question, '答え: ' + row.answer,
        '見せる対象: ' + row.visual_subject, '表現: ' + row.visual_type,
        '根拠ID: ' + row.source_refs.join(', '),
        ...(row.calculation ? ['計算: ' + JSON.stringify(row.calculation)] : []),
        ...(row.required_assets.length ? ['必要素材: ' + JSON.stringify(row.required_assets)] : []));
    }
    lines.push('', '【一次情報の対応表｜内部確認用】');
    for (const source of list(p.draft_sources)) lines.push([
      text(source.id),text(source.label),text(source.title),text(source.url),text(source.claim),text(source.checked_at)
    ].filter(Boolean).join('｜'));
    lines.push('', '【制作条件｜内部確認用】', JSON.stringify(p.production_spec || {}, null, 2),
      '', '【キャプション】', text(p.caption ?? p.draft_caption ?? p.post_caption));
    return lines.join('\n');
  }
  function buildEditorialHandoff(item) {
    const p = payload(item), spine = p.story_spine || {};
    if (!awaitingEditorial(p)) throw new Error('高度AIへ渡す骨格段階ではありません。');
    if (!trim(p.selected_entrance) || p.entrance_selection?.source !== 'command_center_user') throw new Error('先にMichael / Marina / Benから入口を1つ選んでください。');
    const options = list(p.entrance_options);
    if (!options.some(x => x.key === p.selected_entrance)) throw new Error('選択した入口が入口3案にありません。');
    if (!trim(spine.central_question) || !trim(spine.final_answer) || !list(spine.beats).length) throw new Error('投稿の背骨が未完成です。');
    const input = {
      project_id:'yibtmqsbyodhsudenktm', signal_id:String(item.id), draft_revision:p.draft_revision,
      title:p.post_title || p.draft_title || item.title,
      selected_entrance:p.selected_entrance, entrance_options:options,
      story_spine:spine, page_count_reason:p.page_count_reason,
      question_lineage:p.question_lineage, premise_checks:p.premise_checks,
      demand_evidence:p.demand_evidence, community_research:p.community_research,
      research_threads:p.research_threads, draft_sources:p.draft_sources,
      draft_slides:p.draft_slides, production_spec:p.production_spec
    };
    return [
      '【司令塔 → 高度AI｜お金投稿の原稿完成依頼】',
      '以下は骨格と根拠です。完成原稿・画像生成指示ではありません。画像はまだ作らないでください。',
      '中心疑問と最終回答、ページごとのphenomenonを維持して、選択済み入口から各ページの公開文を完成させてください。根拠と矛盾すれば修正理由を示し、骨格を再検討してください。',
      '数字・制度・条件・因果関係・出典の鮮度を一次情報で再確認し、論理と制度を別工程でダブルチェックしてください。確認できない主張は保留にしてください。',
      '需要調査の元コメント・番号・反応数・URLは内部資料です。直接引用の根拠を整えた場合を除き、公開文や画像へ入れないでください。',
      'Michael / Marina / Ben は入口の候補です。本文の別案を3本作らず、selected_entranceの1案だけを1ページ目へ採用してください。',
      '各ページのpage_contract.display_copyを画像に載せる全文として完成させ、captionと制作情報を分離してください。1ページ1現象を維持し、ページ数を埋めないでください。',
      '3入口の1ページ目の文面を照合してentrance_options[].display_copyへ保存し、選択中の文面だけをdraft_slides[0].page_contract.display_copyへ反映してください。本文全体の別案は作らないでください。',
      'Supabase接続が利用できる場合は、signal_idとdraft_revisionが現在も一致することを確認してから、同じレコードへ完成原稿を保存してください。別候補の作成や既存Work版の変更はしないでください。',
      '完成時はeditorial_workflow_versionを維持し、editorial_stage="final"、新しいdraft_revision、全ページのpage_contract、caption、draft_sourcesを保存してください。',
      '保存前に司令塔のお金Chat品質ゲートを全件通し、content_lock.snapshotを完成原稿から完全コピーで作成し、final_reviewとlogic_institution_reviewを同じrevision・snapshotで照合してください。3入口も照合対象です。通過した場合にだけdraft_status="ready"、image_ready=trueにしてください。',
      '未解決があればeditorial_stage="selected"、draft_status="awaiting_editorial"、image_ready=falseを維持し、理由を残してください。確認していない制度や出典をpassedと記録しないでください。',
      '接続できない場合は「未保存」と明記し、保存に必要なJSONと未解決事項を返してください。保存・照合の事実を推測で報告しないでください。',
      '', '【入力データ】', JSON.stringify(input,null,2)
    ].join('\n');
  }
  function install(root, options) {
    const doc = root.document;
    if (doc.__moneyFullCopyInstalled) return;
    doc.__moneyFullCopyInstalled = true;
    options = options || {};
    const adaptive = root.CCAdaptiveCarousel, pipe = root.__fpContentPipeline || root.__carouselContentPipeline;
    const cached = new Map(), observers = new Map(), queue = new Set();
    let scheduled = 0;
    const frame = fn => root.requestAnimationFrame ? root.requestAnimationFrame(fn) : root.setTimeout(fn, 0);
    const lookup = id => {
      if (options.lookup) return options.lookup(id);
      let rows = [];
      try { rows = typeof app !== 'undefined' ? list(app.items) : list(root.app?.items); } catch (_) {}
      return rows.find(row => String(row.id) === String(id)) || cached.get(String(id));
    };
    const notify = (message, kind) => {
      if (typeof root.toast === 'function') root.toast(message, kind);
      else if (root.console) root.console[kind === 'bad' ? 'error' : 'info'](message);
    };
    async function copy(value, button) {
      let ok = false;
      try { if (root.navigator?.clipboard?.writeText) { await root.navigator.clipboard.writeText(value); ok = true; } } catch (_) {}
      if (!ok) {
        const area = doc.createElement('textarea'); area.value = value;
        area.style.cssText = 'position:fixed;left:0;top:0;opacity:0'; doc.body.append(area); area.select();
        try { ok = doc.execCommand('copy') === true; } finally { area.remove(); }
      }
      if (!ok) throw new Error('コピーできませんでした。');
      button?.focus?.({preventScroll:true});
    }
    if (pipe) {
      const previous = pipe.buildDraftCopy, quality = pipe.packageQuality;
      pipe.buildDraftCopy = function (item) { return applies(item) ? buildReviewCopy(item, adaptive) : previous.apply(this, arguments); };
      if (typeof quality === 'function') pipe.packageQuality = function (item) {
        if (item?.id && applies(item)) cached.set(String(item.id), item);
        return quality.apply(this, arguments);
      };
    }
    const putText = (node, value) => { if (node && node.textContent !== value) node.textContent = value; };
    const htmlStates = new WeakMap();
    const putHTML = (node, value) => {
      if (!node) return;
      const last = htmlStates.get(node);
      if (last?.requested === value && last.actual === node.innerHTML) return;
      node.innerHTML = value;
      htmlStates.set(node,{requested:value,actual:node.innerHTML});
    };
    const viewStates = new WeakMap();
    function refresh(modal) {
      if (!modal?.isConnected) return;
      const button = modal.querySelector('[data-fp-copy-draft]');
      const id = button?.dataset.fpCopyDraft || modal.querySelector('[data-fp-copy-package]')?.dataset.fpCopyPackage;
      if (!id) return;
      const item = lookup(id);
      if (!applies(item)) return;
      const p = payload(item), key = JSON.stringify(p);
      let memo = viewStates.get(modal);
      if (!memo || memo.key !== key) {
        const state = inspect(item, adaptive);
        const skeleton = awaitingEditorial(p);
        memo = {key, state, html:state.pages.map(row =>
          '<article class="fp-canonical-page"><h4>' + row.page + '/' + state.pages.length + (skeleton ? '｜骨格' : '｜画像に表示する全文') + '</h4>' +
          '<pre class="fp-full-copy"><span aria-hidden="true"></span>' + escape(skeleton ? [row.phenomenon,row.reader_question,row.answer].filter(Boolean).join('\n') : row.missing ? 'display_copy未保存。旧本文で代用しません。' : row.copy) + '</pre>' +
          (row.attribution ? '<p class="fp-canonical-attribution">' + escape(row.attribution) + '</p>' : '') +
          '<details><summary>制作メモ（画像には載せません）</summary><p>役割: ' + escape(row.role) +
          '<br>現象: ' + escape(row.phenomenon) + '<br>表現: ' + escape(row.visual_type) +
          '<br>根拠ID: ' + escape(row.source_refs.join(', ')) + '</p></details></article>'
        ).join('')};
        viewStates.set(modal, memo);
      }
      modal.dataset.moneyFullCopy = VERSION;
      putHTML(modal.querySelector('.fp-draft-slides'), memo.html);
      const skeleton = awaitingEditorial(p);
      const chosen = list(p.entrance_options).find(x => x.key === p.selected_entrance);
      putText(modal.querySelector('.fp-draft-cover b'), text((skeleton && chosen?.hook) || p.draft_cover || p.post_title || p.draft_title || item.title) || '表紙案未保存');
      putText(modal.querySelector('.fp-draft-dialog > header small'), skeleton ? 'お金Chat｜骨格・根拠の確認' : 'お金Chat｜全文・状態の確認');
      putText(button, skeleton ? '骨格を高度AIへコピー' : '確認用に全文コピー');
      if (button) { button.title = skeleton ? '入口を選び、骨格と根拠を高度AIへ渡します。' : '入口3案・投稿の骨格・表示全文・保留理由をコピーします。画像生成指示ではありません。'; button.disabled = skeleton && p.entrance_selection?.source !== 'command_center_user'; }
      const status = modal.querySelector('.fp-package-status');
      if (status) {
        const wanted = 'fp-package-status ' + (memo.state.imageReady ? 'ready' : 'blocked');
        if (status.className !== wanted) status.className = wanted;
        putHTML(status, skeleton ? '<div><b>骨格段階｜入口選択後に高度AIへ</b><p>原稿と画像は未確定です。高度AIで原稿を完成し、照合後に画像化できます。</p></div>' :
          '<div><b>' + (memo.state.imageReady ? '画像化の事前検査を通過' : '確認は可能・画像化は保留中') +
          '</b><pre class="fp-canonical-status">' + escape(statusLines(p,memo.state).join('\n')) + '</pre></div>');
      }
      const imageButton = modal.querySelector('[data-fp-copy-package]');
      if (imageButton) {
        imageButton.disabled = !memo.state.imageReady;
        imageButton.title = memo.state.imageReady ? '選択中の表示全文を画像制作へ渡します。' : unique([...memo.state.issues,...memo.state.assetIssues]).join('／');
      }
      for (const option of list(p.entrance_options)) {
        const candidate = [...modal.querySelectorAll('[data-fp-entrance-choice]')].find(b => b.dataset.fpEntranceChoice === option.key);
        putText(candidate?.querySelector('span'), skeleton ? text(option.hook || option.headline) : text(option.display_copy));
      }
      putText(modal.querySelector('.fp-entrance-picker > p'), skeleton ? '3案から入口を1つ選ぶと、骨格を高度AIへ渡せます。' : p.editorial_workflow_version === EDITORIAL_VERSION ? '高度AIで原稿を確定しました。入口変更には再編集と再照合が必要です。' : '選択した入口の表示全文が1ページ目に反映されます。入口を変えても保留は自動解除されません。');
    }
    function schedule(modal) {
      queue.add(modal);
      if (!scheduled) scheduled = frame(() => {
        scheduled = 0;
        const pending = [...queue]; queue.clear();
        pending.forEach(modal => { try { refresh(modal); } catch (error) { notify(error.message, 'bad'); } });
      });
    }
    function attach(modal) {
      if (observers.has(modal)) return;
      const observer = new root.MutationObserver(() => schedule(modal));
      observer.observe(modal,{childList:true,subtree:true,characterData:true});
      observers.set(modal,observer); schedule(modal);
    }
    const scan = node => {
      if (node.nodeType !== 1) return;
      if (node.matches('[data-fp-modal]')) attach(node);
      else node.querySelectorAll('[data-fp-modal]').forEach(attach);
    };
    // Observe only direct body insertions, not every update throughout the app.
    const bodyObserver = new root.MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(scan));
      observers.forEach((observer,modal) => { if (!modal.isConnected) { observer.disconnect(); observers.delete(modal); queue.delete(modal); } });
    });
    bodyObserver.observe(doc.body,{childList:true});
    doc.querySelectorAll('[data-fp-modal]').forEach(attach);
    // Window capture is before the legacy document handlers (v151/v207/v226).
    root.addEventListener('click', async event => {
      const button = event.target.closest?.('[data-fp-copy-draft], [data-fp-copy-package]');
      if (!button) return;
      const id = button.dataset.fpCopyDraft || button.dataset.fpCopyPackage;
      const item = lookup(id);
      if (!applies(item)) {
        if (!item && String(id).startsWith('task:' + TASK_ID + ':')) {
          event.preventDefault(); event.stopImmediatePropagation(); notify('原稿データを取得できないため、旧本文で代用せず停止しました。','bad');
        }
        return;
      }
      event.preventDefault(); event.stopImmediatePropagation();
      try {
        if (button.hasAttribute('data-fp-copy-draft')) {
          await copy(buildReviewCopy(item,adaptive),button); notify(awaitingEditorial(payload(item)) ? '骨格と根拠を高度AI用にコピーしました。' : '表示全文・入口3案・骨格・状態を確認用にコピーしました。','good');
        } else {
          const state = inspect(item,adaptive);
          if (!state.imageReady) throw new Error('画像化保留: ' + unique([...state.issues,...state.assetIssues]).join('／'));
          await copy(adaptive.buildHandoff(item),button); notify('選択中の表示全文を画像化用にコピーしました。','good');
        }
      } catch (error) { notify(error.message || 'コピーできませんでした。','bad'); }
    },true);
    const style = doc.createElement('style');
    style.textContent = '[data-money-full-copy] .fp-canonical-page{padding:12px;background:#fff;border:1px solid #777;min-width:0}' +
      '[data-money-full-copy] .fp-canonical-page h4{margin:0 0 8px;font-size:13px}' +
      '[data-money-full-copy] .fp-full-copy{margin:0;font:inherit;font-size:16px;line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere}' +
      '[data-money-full-copy] .fp-canonical-status{margin:7px 0 0;font:inherit;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.6}' +
      '[data-money-full-copy] .fp-canonical-page details{margin-top:10px;color:#444;font-size:12px}' +
      '[data-money-full-copy] .fp-entrance-option span{white-space:pre-wrap;overflow-wrap:anywhere}' +
      '[data-money-full-copy] .fp-draft-cover b{white-space:pre-wrap}';
    doc.head.append(style);
    return {refresh,dispose(){bodyObserver.disconnect();observers.forEach(o=>o.disconnect());observers.clear();queue.clear();}};
  }
  return {VERSION,TASK_ID,EDITORIAL_VERSION,applies,canonicalPages,inspect,buildReviewCopy,buildEditorialHandoff,install};
});
