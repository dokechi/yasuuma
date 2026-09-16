/* Chat execution provenance only. Does not start/stop tasks or change quality gates. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (!root || !root.document || root.CCChatExecution) return;
  root.CCChatExecution = api;
  const document = root.document;

  const style = document.createElement('style');
  style.id = 'cc-chat-execution-style';
  style.textContent = [
    '.cc-chat-head-badge{display:inline-flex;align-items:center;gap:5px;flex:0 0 auto;margin:0 2px 0 0;padding:2px 7px;border:2px solid;border-color:#fff #000 #000 #fff;background:#000080;color:#fff;font-family:Tahoma,"MS UI Gothic",sans-serif;font-size:12px;line-height:16px;font-weight:900;letter-spacing:.04em;box-shadow:1px 1px #808080;white-space:nowrap}',
    '.cc-chat-head-badge b{display:inline-block;padding:0 3px;background:#fff200;color:#000080;font-size:11px;line-height:14px}',
    '.cc-chat-head-badge span{font-size:11px;letter-spacing:0}',
    '.cc-chat-execution{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 12px;padding:9px 11px;border:2px solid #000080;background:#fff4ba;color:#00005d;box-sizing:border-box;overflow-wrap:anywhere}',
    '.cc-chat-execution strong{font-size:16px;line-height:1.4;font-weight:900;letter-spacing:.02em}',
    '.cc-chat-execution small{font-size:11px;line-height:1.5}',
    '.reddit-card>.cc-chat-execution{margin:10px}',
    '.cc-chat-execution+.task-origin{margin-bottom:10px}',
    '@media(max-width:480px){.cc-chat-head-badge{padding:2px 5px}.cc-chat-head-badge span{display:none}.cc-chat-execution{gap:4px;padding:8px 9px}.cc-chat-execution strong{font-size:15px}.cc-chat-execution small{flex-basis:100%}}'
  ].join('');
  document.head.appendChild(style);

  if (typeof taskOriginHtml === 'function') {
    const original = taskOriginHtml;
    taskOriginHtml = function (item) {
      const html = original.apply(this, arguments);
      if (!api.isChat(item)) return html;
      return api.usesSharedRuleId(item)
        ? String(html).replace('生成元タスク：', '参照ルール：')
        : html;
    };
  }

  // Main cards are rendered from cardHtml. Inject the badge into the title row so
  // the execution source is visible before opening details.
  if (typeof cardHtml === 'function') {
    const originalCardHtml = cardHtml;
    cardHtml = function (item) {
      return api.injectThreadHeadBadge(originalCardHtml.apply(this, arguments), item);
    };
  }

  const reddit = root.CCReddit;
  if (reddit && typeof reddit.card === 'function') {
    const original = reddit.card;
    reddit.card = function (item) {
      return api.injectArticleBadge(original.apply(this, arguments), item);
    };
  }

  api.refresh = function () {
    let items = [];
    try { if (typeof app !== 'undefined') items = app.items || []; } catch (_) {}
    items.forEach(function (item) {
      if (!api.isChat(item) || typeof cssSafe !== 'function') return;
      const card = document.getElementById('card-' + cssSafe(item.id));
      if (!card) return;
      api.ensureThreadHeadBadge(card, item);
      const origin = card.querySelector('.task-origin');
      if (api.usesSharedRuleId(item) && origin && origin.firstChild && origin.firstChild.nodeType === 3) {
        origin.firstChild.nodeValue = origin.firstChild.nodeValue.replace('生成元タスク：', '参照ルール：');
      }
    });

    const records = new Map((reddit?.state?.items || []).map(item => [String(item.id), item]));
    document.querySelectorAll('#redditBody .reddit-card').forEach(function (card) {
      const control = card.querySelector('[data-r-edit]');
      const item = control ? records.get(control.getAttribute('data-r-edit')) : null;
      if (api.isChat(item) && !card.querySelector('[data-cc-chat-execution]')) {
        card.insertAdjacentHTML('afterbegin', api.badgeHtml(item));
      }
    });
  };

  let refreshQueued = false;
  const queueRefresh = function () {
    if (refreshQueued) return;
    refreshQueued = true;
    const run = function () {
      refreshQueued = false;
      api.refresh();
    };
    if (typeof root.requestAnimationFrame === 'function') root.requestAnimationFrame(run);
    else root.setTimeout(run, 0);
  };

  // Some specialized tabs rebuild #list after this script has loaded. Observe those
  // renders as a fallback so the badge cannot disappear on tab switch/refresh.
  const observer = new MutationObserver(function (mutations) {
    if (mutations.some(m => m.addedNodes && m.addedNodes.length)) queueRefresh();
  });
  const listHost = document.getElementById('list');
  const redditHost = document.getElementById('redditBody');
  if (listHost) observer.observe(listHost, { childList: true, subtree: true });
  if (redditHost) observer.observe(redditHost, { childList: true, subtree: true });

  queueRefresh();
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const WRAPPERS = ['payload', 'sourcePayload', 'source_payload', 'event', 'signal', 'package', 'house_package', 'fp_package'];
  const TASK_IDS = Object.freeze({
    house: '6aa77eb5ce7881919d8dc62554833b60',
    money: '6a9e5826d4888191a4d82a643e6d5adf',
    overseas: '6a8d6888e41881919edb9fb44422a622'
  });

  function provenance(item) {
    const queue = [{ value: item, depth: 0 }], seen = new Set();
    while (queue.length && seen.size < 64) {
      const entry = queue.shift(), value = entry.value;
      if (!value || typeof value !== 'object' || seen.has(value)) continue;
      seen.add(value);
      const source = value.execution_source ?? value.executionSource ?? value.execution_channel ?? value.executionChannel;
      if (typeof source === 'string' && source.trim()) {
        return {
          source: source.trim().toLowerCase(),
          executionTaskId: typeof value.execution_task_id === 'string' ? value.execution_task_id : null,
          runnerKey: typeof value.runner_key === 'string' ? value.runner_key : null
        };
      }
      if (entry.depth < 6) WRAPPERS.forEach(key => {
        if (value[key] && typeof value[key] === 'object') queue.push({ value: value[key], depth: entry.depth + 1 });
      });
    }
    return { source: null, executionTaskId: null, runnerKey: null };
  }

  function isChat(item) { return provenance(item).source === 'chat'; }

  function usesSharedRuleId(item) {
    if (!isChat(item)) return false;
    const p = item?.payload || {};
    const explicit = [item?.taskId, item?.task_id, item?.sourceTaskId, item?.source_task_id, p.task_id, p.taskId, p.source_task_id];
    const id = explicit.find(v => typeof v === 'string' && /^[a-zA-Z0-9-]+$/.test(v));
    const match = String(item?.id || '').match(/^(?:sns:)*task:([a-zA-Z0-9-]+):/);
    return Object.values(TASK_IDS).includes(id || (match ? match[1] : ''));
  }

  function headBadgeHtml(item) {
    if (!isChat(item)) return '';
    return '<span class="cc-chat-head-badge" data-cc-chat-head="chat" title="Chat登録タスクから生成"><b>CHAT</b><span>チャット実行</span></span>';
  }

  function badgeHtml(item) {
    if (!isChat(item)) return '';
    return '<div class="cc-chat-execution" data-cc-chat-execution="chat"><strong>チャットから実行</strong><small>Chat登録タスクの候補</small></div>';
  }

  function injectThreadHeadBadge(html, item) {
    if (typeof html !== 'string' || !isChat(item) || html.includes('data-cc-chat-head=')) return html;
    const badge = headBadgeHtml(item);
    if (!badge) return html;
    if (/<span class="thread-title">/i.test(html)) {
      return html.replace(/(<span class="thread-title">)/i, badge + '$1');
    }
    if (/<div class="thread-head">/i.test(html)) {
      return html.replace(/(<div class="thread-head">)/i, '$1' + badge);
    }
    return html;
  }

  function ensureThreadHeadBadge(card, item) {
    if (!card || !isChat(item) || card.querySelector('[data-cc-chat-head]')) return;
    const title = card.querySelector('.thread-title');
    const head = card.querySelector('.thread-head');
    if (title) title.insertAdjacentHTML('beforebegin', headBadgeHtml(item));
    else if (head) head.insertAdjacentHTML('afterbegin', headBadgeHtml(item));
  }

  function injectArticleBadge(html, item) {
    if (typeof html !== 'string' || !isChat(item) || html.includes('data-cc-chat-execution=')) return html;
    return html.replace(/(<article\b[^>]*>)/i, '$1' + badgeHtml(item));
  }

  // Creation only; never use this helper to replace an existing candidate payload.
  function stampNewCandidate(topic, stableKey, payload, run) {
    if (!Object.prototype.hasOwnProperty.call(TASK_IDS, topic)) throw new Error('Unknown topic');
    if (typeof stableKey !== 'string' || !stableKey.trim() || stableKey.length > 500) throw new Error('Stable content key required');
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Object payload required');
    if (!run || typeof run.runId !== 'string' || !run.runId.trim()) throw new Error('Run ID required');
    if (payload.result_kind === 'run_summary') throw new Error('Run summaries must not enter candidate lists');
    const eventKey = 'chat:' + stableKey.replace(/^(?:chat:)+/, '');
    if (eventKey === 'chat:') throw new Error('Stable content key required');
    const id = TASK_IDS[topic];
    const existingSource = provenance(payload).source;
    if (existingSource && existingSource !== 'chat') throw new Error('Cannot relabel a Work candidate');
    return {
      task_id: id,
      event_key: eventKey,
      signal_id: 'task:' + id + ':' + eventKey,
      payload: Object.assign({}, payload, {
        execution_source: 'chat', execution_label: 'チャットから実行',
        runner_key: 'chat-' + topic + '-v1', logical_task_id: id, source_task_id: id,
        execution_task_id: typeof run.executionTaskId === 'string' ? run.executionTaskId : null,
        run_id: run.runId
      })
    };
  }

  return {
    version: '204.3', provenance, isChat, usesSharedRuleId,
    headBadgeHtml, badgeHtml, injectThreadHeadBadge, ensureThreadHeadBadge,
    injectArticleBadge, stampNewCandidate, taskIds: TASK_IDS
  };
});
