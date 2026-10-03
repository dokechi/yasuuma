'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const api = require('./v204-chat-execution-source.js');
let checks = 0;
function test(name, fn) { fn(); checks++; console.log('PASS', name); }
const chat = { payload: { execution_source: 'chat', runner_key: 'chat-money-v1' } };
test('only explicit Chat provenance is marked', () => {
  assert.equal(api.isChat(chat), true);
  for (const item of [null, {}, { title:'CHAT実行' }, {source:'chat'}, {payload:{execution_source:'work'}}]) assert.equal(api.isChat(item), false);
});
test('overseas API event and signal wrappers retain provenance', () => {
  assert.equal(api.isChat({sourcePayload:{event:chat}}), true);
  assert.equal(api.isChat({sourcePayload:{signal:chat}}), true);
  assert.equal(api.isChat({source_payload:{event:chat}}), true);
});
test('an explicit parent source wins over embedded provenance', () => {
  assert.equal(api.isChat({execution_source:'work',payload:chat}), false);
});
test('cycle-safe, bounded traversal', () => {
  const cyc = {}; cyc.payload = cyc;
  assert.equal(api.isChat(cyc), false);
});
test('badge is conspicuous and never interpolates untrusted HTML', () => {
  const html = api.badgeHtml({payload:{execution_source:'chat', execution_label:'<script>alert(1)</script>'}});
  assert.match(html, /class="cc-chat-head-badge"/);
  assert.match(html, /data-cc-chat-head="chat"/);
  assert.match(html, /aria-label="チャットから実行"/);
  assert.match(html, />CHAT<\/span>/);
  assert.ok(!html.includes('<script>'));
  assert.equal(api.badgeHtml({}), '');
});
test('article insertion is idempotent and leaves Work byte-identical', () => {
  const html = '<article class="reddit-card"><b class="reddit-card-title">投稿</b><button data-r-edit="abc">詳細</button></article>';
  assert.equal(api.injectArticleBadge(html, {}), html);
  const inserted = api.injectArticleBadge(html,chat);
  assert.notEqual(inserted, html);
  assert.match(inserted, /reddit-card-title cc-chat-title/);
  assert.equal((inserted.match(/data-cc-chat-head=/g)||[]).length,1);
  assert.equal(api.injectArticleBadge(inserted,chat), inserted);
  assert.ok(inserted.includes('data-r-edit="abc"'));
});
test('all three topics retain existing logical routing and distinct Chat keys', () => {
  for (const topic of ['house','money','overseas']) {
    const result = api.stampNewCandidate(topic, 'topic:stable-content-key', {draft_status:'ready'}, {runId:'test-run'});
    assert.equal(result.task_id, api.taskIds[topic]);
    assert.equal(result.event_key, 'chat:topic:stable-content-key');
    assert.equal(result.signal_id, 'task:'+api.taskIds[topic]+':chat:topic:stable-content-key');
    assert.equal(result.payload.source_task_id,api.taskIds[topic]);
    assert.equal(result.payload.execution_source,'chat');
    assert.equal(result.payload.execution_task_id,null);
  }
});
test('stamping does not mutate source data or create date-based duplicate keys', () => {
  const payload={draft_slides:[{body:'原稿'}]};
  const a=api.stampNewCandidate('money','chat:chat:fp:key',payload,{runId:'one'});
  const b=api.stampNewCandidate('money','chat:fp:key',payload,{runId:'two'});
  assert.equal(a.event_key,'chat:fp:key');
  assert.equal(a.signal_id,b.signal_id);
  assert.equal(payload.execution_source,undefined);
});
test('run summaries and Work relabeling are rejected', () => {
  assert.throws(()=>api.stampNewCandidate('money','key',{result_kind:'run_summary'},{runId:'x'}));
  assert.throws(()=>api.stampNewCandidate('house','key',{execution_source:'work'},{runId:'x'}));
  assert.throws(()=>api.stampNewCandidate('unknown','key',{}, {runId:'x'}));
  assert.throws(()=>api.stampNewCandidate('house','chat:',{}, {runId:'x'}));
});
test('browser hooks preserve original handlers and do not duplicate on reload', () => {
  const styles=[],observed=[],listHost={},redditHost={};
  const document={createElement:()=>({}),head:{appendChild:x=>styles.push(x)},querySelectorAll:()=>[],getElementById:id=>id==='list'?listHost:id==='redditBody'?redditHost:null};
  const original='<div class="task-origin"><button data-source-task="logical">生成元タスク：House</button></div>';
  const win={document, app:{items:[]}, taskOriginHtml:()=>original,
    CCReddit:{state:{items:[]}, card:()=>'<article class="reddit-card"><b class="reddit-card-title">Body</b></article>'},
    MutationObserver:class{observe(host){observed.push(host);}},requestAnimationFrame:fn=>fn()};
  // Browser globals and window are the same object; a separate window stub skips
  // the production module's global function wrappers altogether.
  win.window=win;
  const context=vm.createContext(win);
  const code=fs.readFileSync(require.resolve('./v204-chat-execution-source.js'),'utf8');
  vm.runInContext(code,context);
  const work=win.taskOriginHtml({});
  assert.equal(work,original);
  const sharedChat={payload:{...chat.payload,source_task_id:api.taskIds.money}};
  assert.ok(win.taskOriginHtml(sharedChat).includes('参照ルール：'));
  assert.equal(win.taskOriginHtml(chat),original,'A Chat runner without a shared task ID keeps its task label');
  assert.ok(win.taskOriginHtml(chat).includes('data-source-task="logical"'));
  assert.ok(win.CCReddit.card({sourcePayload:{event:chat}}).includes('data-cc-chat-head'));
  assert.deepEqual(observed,[listHost,redditHost]);
  const once=win.taskOriginHtml(sharedChat);
  vm.runInContext(code,context);
  assert.equal(win.taskOriginHtml(sharedChat),once);
  assert.equal(styles.length,1);
  assert.equal(observed.length,2);
});
console.log(checks+' test groups passed.');
