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
    '.cc-chat-title{color:#a40000!important}',
    '.cc-chat-title>a{color:inherit!important}',
    '.cc-chat-head-badge{display:inline-block;vertical-align:1px;margin:0 8px 0 0;padding:1px 6px;border:1px solid #810000;background:#a40000;color:#fff;font-family:Tahoma,"MS UI Gothic",sans-serif;font-size:11px;line-height:1.4;font-weight:700;letter-spacing:.03em;white-space:nowrap}',
    '.cc-item-summary>.cc-chat-title{overflow-wrap:anywhere}',
    '@media(max-width:480px){.cc-chat-head-badge{margin-right:6px;padding:1px 5px}}'
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

  // Cover the original card render. Navigation later creates a new, always-visible
  // summary heading; refresh() decorates that heading instead of the hidden header.
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
      const id = card.dataset.ccItemId || control?.getAttribute('data-r-edit');
      const item = records.get(String(id));
      api.ensureThreadHeadBadge(card, item);
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
    return '<span class="cc-chat-head-badge" data-cc-chat-head="chat" title="チャットから実行" aria-label="チャットから実行">CHAT</span>';
  }

  function badgeHtml(item) { return headBadgeHtml(item); }

  function injectThreadHeadBadge(html, item) {
    if (typeof html !== 'string' || !isChat(item) || html.includes('data-cc-chat-head=')) return html;
    return html.replace(/(<(?:span|b)\b[^>]*class="[^"]*\b(?:thread-title|reddit-card-title)\b[^"]*"[^>]*>)/i, function (tag) {
      return tag.replace(/class="([^"]*)"/, 'class="$1 cc-chat-title"') + headBadgeHtml(item);
    });
  }

  function decorateTitle(title, item) {
    if (!title || !isChat(item)) return;
    title.classList.add('cc-chat-title');
    if (!title.querySelector('[data-cc-chat-head]')) {
      title.insertAdjacentHTML('afterbegin', headBadgeHtml(item));
    }
  }

  function ensureThreadHeadBadge(card, item) {
    if (!card || !isChat(item)) return;
    // v167 moves the old header inside closed <details> and creates this summary.
    // A badge anywhere in the card does NOT mean its visible title is decorated.
    const title = card.querySelector(':scope > .cc-item > .cc-item-summary > strong')
      || card.querySelector('.thread-title, .reddit-card-title');
    if (!title) return;
    decorateTitle(title, item);
    // Keep a single label at the visible title, not a second one in hidden details.
    card.querySelectorAll('[data-cc-chat-head], [data-cc-chat-execution]').forEach(function (badge) {
      if (!title.contains(badge)) badge.remove();
    });
  }

  function injectArticleBadge(html, item) {
    return injectThreadHeadBadge(html, item);
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
    version: '204.4', provenance, isChat, usesSharedRuleId,
    headBadgeHtml, badgeHtml, injectThreadHeadBadge, decorateTitle, ensureThreadHeadBadge,
    injectArticleBadge, stampNewCandidate, taskIds: TASK_IDS
  };
});
