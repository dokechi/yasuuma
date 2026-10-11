import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {createHmac, webcrypto} from 'node:crypto';
import {saveGuardedPayload, validateSourcingVerdict, mutationFailure, MutationError} from '../supabase/functions/command-center-retro-api/guarded-payload.mjs';
import {sourcingSuppliers} from '../supabase/functions/command-center-retro-api/sourcing-read-model.mjs';

// Isolated PostgREST contract simulator. Filters are evaluated at commit time,
// JSONB comparisons ignore key order, and injected failures commit nothing.
function store(tables, {failWrite = false, failReadTable = null, readOnly = false, signalReadBarrier = 0} = {}) {
  const writes = [];
  let snapshotReads = 0, releaseSnapshots;
  const snapshotsReady = new Promise(resolve => { releaseSnapshots = resolve; });
  class Query {
    constructor(table) { this.table = table; this.filters = []; this.op = 'select'; }
    select() { return this; }
    eq(key, value) { this.filters.push(row => key === 'payload' ? isDeepStrictEqual(row[key], JSON.parse(value)) : row[key] === value); return this; }
    order() { return this; }
    range(start, end) { this.bounds = [start, end]; return this; }
    update(value) { if (readOnly) throw new Error('GET attempted a write'); this.op = 'update'; this.value = value; return this; }
    upsert(value, {onConflict} = {}) { if (readOnly) throw new Error('GET attempted a write'); this.op = 'upsert'; this.value = value; this.conflict = onConflict; return this; }
    delete() { if (readOnly) throw new Error('GET attempted a write'); this.op = 'delete'; return this; }
    maybeSingle() { this.one = true; return this; }
    then(resolve, reject) {
      return Promise.resolve().then(async () => {
        if (this.op === 'select' && this.table === failReadTable) return {data: null, error: {message: 'private SQL details'}};
        if (this.op !== 'select' && failWrite) return {data: null, error: {message: 'private SQL details'}};
        let matched = (tables[this.table] || []).filter(row => this.filters.every(filter => filter(row)));
        if (this.op === 'update') {
          for (const row of matched) { Object.assign(row, structuredClone(this.value)); writes.push(structuredClone(row)); }
        }
        if (this.op === 'delete') {
          for (const row of matched) { tables[this.table].splice(tables[this.table].indexOf(row), 1); writes.push({deleted: true, table: this.table}); }
        }
        if (this.op === 'upsert') {
          matched = [];
          for (const value of Array.isArray(this.value) ? this.value : [this.value]) {
            const row = (tables[this.table] ||= []).find(row => row[this.conflict] === value[this.conflict]);
            const saved = row || {};
            Object.assign(saved, structuredClone(value)); if (!row) tables[this.table].push(saved);
            matched.push(saved); writes.push(structuredClone(saved));
          }
        }
        if (this.bounds) matched = matched.slice(this.bounds[0], this.bounds[1] + 1);
        const result = {data: structuredClone(this.one ? matched[0] || null : matched), error: null};
        // Capture both snapshots before either writer can commit. Promise.all
        // alone does not guarantee overlapping reads after asynchronous auth.
        if (this.op === 'select' && this.table === 'command_center_signals' && this.one && snapshotReads < signalReadBarrier) {
          snapshotReads++;
          if (snapshotReads === signalReadBarrier) releaseSnapshots();
          await snapshotsReady;
        }
        return result;
      }).then(resolve, reject);
    }
  }
  return {admin: {from: table => new Query(table)}, tables, writes};
}
const signal = () => ({id: 'signal-1', domain: 'sourcing', payload: {content_type: 'fp_post_candidate', nested: {value: 1}}, updated_at: 'old'});
const noWrite = s => assert.equal(s.writes.length, 0);

test('conditional payload save preserves unrelated row fields', async () => {
  const row = signal(), s = store({command_center_signals: [structuredClone(row)]});
  const result = await saveGuardedPayload(s.admin, row, {...row.payload, selected: 'a'}, '*', () => 'new');
  assert.equal(result.updated_at, 'new'); assert.equal(result.domain, row.domain);
  assert.equal(s.writes.length, 1); assert.deepEqual(row, signal());
});
test('two simultaneous saves from one snapshot cannot overwrite each other', async () => {
  const row = signal(), s = store({command_center_signals: [structuredClone(row)]});
  const results = await Promise.allSettled(['a', 'b'].map(selected => saveGuardedPayload(s.admin, row, {...row.payload, selected}, '*')));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const rejected = results.find(result => result.status === 'rejected');
  assert.equal(rejected.reason.status, 409); assert.equal(rejected.reason.message, 'content_changed_reload');
  assert.equal(s.writes.length, 1);
});
test('exact replay after a lost response returns committed row without a second write', async () => {
  const row = signal(), payload = {...row.payload, selected: 'a'}, s = store({command_center_signals: [structuredClone(row)]});
  await saveGuardedPayload(s.admin, row, payload, '*', () => 'first');
  const replay = await saveGuardedPayload(s.admin, row, {selected: 'a', nested: {value: 1}, content_type: 'fp_post_candidate'}, '*', () => 'second');
  assert.equal(replay.updated_at, 'first'); assert.equal(s.writes.length, 1);
});
test('failed write leaves previous data intact and returns a sanitized failure', async () => {
  const row = signal(), s = store({command_center_signals: [structuredClone(row)]}, {failWrite: true});
  await assert.rejects(saveGuardedPayload(s.admin, row, {...row.payload, selected: 'a'}, '*'), error => {
    assert.deepEqual(mutationFailure(error), {status: 500, code: 'mutation_failed'}); return true;
  });
  assert.deepEqual(s.tables.command_center_signals[0], row); noWrite(s);
});
test('deleted candidate is reported without recreating it', async () => {
  const s = store({command_center_signals: []});
  await assert.rejects(saveGuardedPayload(s.admin, signal(), {selected: 'a'}, '*'), {status: 404}); noWrite(s);
});
test('malformed payload cannot reach a write', async () => {
  const s = store({command_center_signals: [signal()]});
  for (const payload of [null, [], 'value']) await assert.rejects(saveGuardedPayload(s.admin, signal(), payload, '*'), {status: 400});
  noWrite(s);
});
test('sourcing validation preserves valid notes and rejects coerced/oversized input', () => {
  assert.deepEqual(validateSourcingVerdict({id: 's-1', verdict: 'close', note: ' reason '}), {id: 's-1', verdict: 'close', note: 'reason'});
  for (const body of [null, [], {id: 1, verdict: 'close'}, {id: ' ', verdict: 'close'}, {id: 's', verdict: 'buy'}, {id: 's', verdict: 'close', note: {}}, {id: 's', verdict: 'close', note: 'a'.repeat(5001)}]) {
    assert.throws(() => validateSourcingVerdict(body), {status: 400});
  }
  assert.deepEqual(mutationFailure(new MutationError('conflict', 409)), {status: 409, code: 'conflict'});
});

const supplierInfo = () => ({key: 'shop', name: 'shop', host: 'shop.example', homepage: 'https://shop.example/'});
test('supplier projection retains notes/history, deduplicates candidates and does not refresh observations', () => {
  const signals = [{id: 's1', last_seen_at: '2026-10-01T00:00:00Z'}, {id: 's1', last_seen_at: '2026-10-01T00:00:00Z'}];
  const reviews = [{supplier_key: 'shop', verdict: 'success', judged_at: '2026-09-30T00:00:00Z'}, {supplier_key: 'shop', verdict: 'close'}];
  const stored = [{supplier_key: 'shop', first_seen_at: '2026-08-01', notes: {keep: 'yes'}}];
  const candidates = [{signal_id: 's1', supplier_key: 'shop', last_seen_at: '2026-09-01'}, {signal_id: 'old', supplier_key: 'shop', last_seen_at: '2026-09-02'}];
  const before = structuredClone([signals, reviews, stored, candidates]);
  const [row] = sourcingSuppliers(signals, reviews, stored, candidates, supplierInfo);
  assert.equal(row.candidate_count, 2); assert.equal(row.priority_boost, 6); assert.equal(row.trust_score, 68);
  assert.equal(row.last_seen_at, '2026-10-01T00:00:00Z'); assert.equal(row.first_seen_at, '2026-08-01');
  assert.deepEqual(row.notes, {keep: 'yes'}); assert.deepEqual([signals, reviews, stored, candidates], before);
});
test('new supplier is visible with observed time even before ledger persistence', () => {
  const [row] = sourcingSuppliers([{id: 'new', last_seen_at: '2026-10-01'}], [], [], [], supplierInfo);
  assert.equal(row.candidate_count, 1); assert.equal(row.first_seen_at, '2026-10-01'); assert.equal(row.trust_score, 50);
});
test('supplier scoring caps and timestamp offsets match existing ledger calculations', () => {
  const reviews = [...Array.from({length: 10}, () => ({supplier_key: 'shop', verdict: 'success', judged_at: '2026-10-01T09:00:00+09:00'})),
    {supplier_key: 'shop', verdict: 'success', judged_at: '2026-10-01T01:00:00Z'},
    ...Array.from({length: 10}, () => ({supplier_key: 'shop', verdict: 'close'}))];
  const [row] = sourcingSuppliers([{id: 's', last_seen_at: '2026-10-01T09:00:00+09:00'}], reviews, [],
    [{signal_id: 'older', supplier_key: 'shop', last_seen_at: '2026-10-01T01:00:00Z'}], supplierInfo);
  assert.equal(row.trust_score, 100); assert.equal(row.priority_boost, 10);
  assert.equal(row.last_success_at, '2026-10-01T01:00:00Z'); assert.equal(row.last_seen_at, '2026-10-01T01:00:00Z');
  const [held] = sourcingSuppliers([{id: 's'}], reviews.filter(r => r.verdict === 'close'), [], [], supplierInfo);
  assert.equal(held.priority_boost, 5); assert.equal(held.trust_score, 80); assert.equal(held.last_seen_at, null);
});

const source = await readFile(new URL('../supabase/functions/command-center-retro-api/index.ts', import.meta.url), 'utf8');
const shellSource = await readFile(new URL('../command-center-98/app.html', import.meta.url), 'utf8');
const purchaseMergeSource = shellSource.slice(shellSource.indexOf('function mergePurchaseSupplierMetrics'), shellSource.indexOf('function purchaseLedgerHtml'));
function resetTables(purchaseOrders = 2) {
  return {
    command_center_signals: [{id: 'reset-1', domain: 'sourcing', title: 'item', score: 80,
      review_state: 'accepted', review_note: 'sourcing:success', source_url: 'https://shop.example/item', payload: {}, last_seen_at: '2026-10-01T00:00:00Z'}],
    command_center_sourcing_reviews: [{signal_id: 'reset-1', supplier_key: 'shop.example', verdict: 'success', judged_at: '2026-10-02T00:00:00Z'}],
    command_center_suppliers: [{supplier_key: 'shop.example', supplier_name: 'shop', success_count: 1, close_count: 0, miss_count: 0,
      priority_boost: 5, trust_score: 65, purchase_order_count: purchaseOrders, purchase_unit_count: 5, purchase_spend_yen: 1000,
      last_purchase_at: '2026-09-01T00:00:00Z', last_seen_at: '2026-10-01T00:00:00Z', notes: {memo: 'keep'}}],
    command_center_supplier_candidates: [{signal_id: 'reset-1', supplier_key: 'shop.example', last_seen_at: '2026-10-01T00:00:00Z'}]
  };
}
async function api(s) {
  let handler;
  const noRoute = async () => null;
  runInNewContext(stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm, ''), {mode: 'strip'}), {
    Deno: {env: {get: name => name === 'SUPABASE_SERVICE_ROLE_KEY' ? 'isolated-test-key' : 'https://example.invalid'}, serve: callback => {handler = callback;}},
    createClient: () => s.admin, crypto: webcrypto, TextEncoder, Headers, Response, URL, structuredClone,
    affiliatePublicAsset: noRoute, affiliatePatch: noRoute, affiliateGet: noRoute, nekoPatch: noRoute, nekoGet: noRoute,
    fpImagesPatch: noRoute, fpImagesGet: noRoute, saveGuardedPayload, validateSourcingVerdict, mutationFailure, sourcingSuppliers
  });
  const exp = String(Date.now() + 60000), token = exp + '.' + createHmac('sha256', 'isolated-test-key').update('retro|' + exp).digest('hex');
  return (method, body, resource = '') => handler(new Request('https://example.invalid/?resource=' + resource, {
    method, headers: {authorization: 'Bearer ' + token, 'content-type': 'application/json'}, ...(body === undefined ? {} : {body: JSON.stringify(body)})
  }));
}
test('real sourcing GET handler succeeds while every database mutation is forbidden', async () => {
  const s = store({command_center_signals: [{id: 's1', domain: 'sourcing', title: 'item', score: 80, payload: {}, source_url: 'https://shop.example/item', last_seen_at: '2026-10-01'}], command_center_sourcing_reviews: [], command_center_suppliers: [], command_center_supplier_candidates: []}, {readOnly: true});
  const call = await api(s), response = await call('GET', undefined, 'sourcing'), body = await response.json();
  assert.equal(response.status, 200); assert.equal(body.ok, true); assert.equal(body.items.length, 1);
  assert.equal(body.suppliers[0].candidateCount, 1); assert.equal(body.items[0].supplierBoost, 0); noWrite(s);
});
test('real PATCH validates sourcing input before any DB operation', async () => {
  const s = store({}, {readOnly: true}), call = await api(s);
  const response = await call('PATCH', {action: 'sourcing_verdict', id: {bad: true}, verdict: 'close'});
  assert.equal(response.status, 400); assert.deepEqual(await response.json(), {ok: false, error: 'invalid_sourcing_verdict'}); noWrite(s);
});
test('sourcing read failure does not partially persist a ledger', async () => {
  const s = store({command_center_signals: [], command_center_sourcing_reviews: []}, {readOnly: true, failReadTable: 'command_center_supplier_candidates'}), call = await api(s);
  const response = await call('GET', undefined, 'sourcing');
  assert.equal(response.status, 500); assert.equal((await response.json()).ok, false); noWrite(s);
});
test('reset refreshes persisted scores before success and actual UI merge cannot restore the old score', async () => {
  const s = store(resetTables()), call = await api(s);
  const response = await call('PATCH', {action: 'sourcing_reset', id: 'reset-1'});
  assert.equal(response.status, 200); assert.equal((await response.json()).ok, true);
  assert.equal(s.tables.command_center_sourcing_reviews.length, 0);
  assert.equal(s.tables.command_center_signals[0].review_state, 'new');
  const persisted = s.tables.command_center_suppliers[0];
  assert.equal(persisted.success_count, 0); assert.equal(persisted.priority_boost, 0); assert.equal(persisted.trust_score, 50);
  assert.equal(persisted.purchase_order_count, 2); assert.equal(persisted.purchase_unit_count, 5); assert.equal(persisted.purchase_spend_yen, 1000);
  assert.deepEqual(persisted.notes, {memo: 'keep'}); assert.equal(persisted.last_seen_at, '2026-10-01T00:00:00Z');
  const writesBeforeRead = s.writes.length;
  const sourcing = await (await call('GET', undefined, 'sourcing')).json();
  const state = {suppliers: sourcing.suppliers, purchaseSuppliers: s.tables.command_center_suppliers.filter(row => row.purchase_order_count > 0)};
  assert.match(purchaseMergeSource, /Math\.max/);
  runInNewContext(purchaseMergeSource + '\nmergePurchaseSupplierMetrics();', {sourcingApp: state});
  assert.equal(state.suppliers[0].trustScore, 50); assert.equal(state.suppliers[0].priorityBoost, 0);
  assert.equal(state.suppliers[0].purchaseOrderCount, 2); assert.equal(state.suppliers[0].successCount, 2, 'real purchases remain counted after judgment reset');
  assert.equal(s.writes.length, writesBeforeRead, 'read and UI merge do not persist');
  const repeat = await call('PATCH', {action: 'sourcing_reset', id: 'reset-1'});
  assert.equal(repeat.status, 200); assert.equal(s.tables.command_center_suppliers.length, 1); assert.equal(s.tables.command_center_supplier_candidates.length, 1);
  assert.equal(s.tables.command_center_suppliers[0].trust_score, 50);
});
test('reset refreshes a supplier without purchases while keeping ledger purchase eligibility unchanged', async () => {
  const s = store(resetTables(0)), call = await api(s);
  assert.equal((await call('PATCH', {action: 'sourcing_reset', id: 'reset-1'})).status, 200);
  assert.equal(s.tables.command_center_suppliers[0].trust_score, 50);
  assert.equal(s.tables.command_center_suppliers.filter(row => row.purchase_order_count > 0).length, 0);
});
test('reset retains other reviews and recalculates their contribution rather than zeroing a whole supplier', async () => {
  const tables = resetTables();
  tables.command_center_sourcing_reviews.push({signal_id: 'other', supplier_key: 'shop.example', verdict: 'close', judged_at: '2026-10-03'});
  const s = store(tables), call = await api(s);
  assert.equal((await call('PATCH', {action: 'sourcing_reset', id: 'reset-1'})).status, 200);
  assert.equal(tables.command_center_sourcing_reviews.length, 1); assert.equal(tables.command_center_sourcing_reviews[0].signal_id, 'other');
  assert.equal(tables.command_center_suppliers[0].priority_boost, 1); assert.equal(tables.command_center_suppliers[0].trust_score, 53);
});
test('reset refuses invalid, missing and non-sourcing records without writes', async () => {
  const tables = resetTables(); tables.command_center_signals.push({...signal(), domain: 'sns'});
  const s = store(tables), call = await api(s);
  for (const [id, status] of [[{}, 400], ['missing', 404], ['signal-1', 400]]) {
    assert.equal((await call('PATCH', {action: 'sourcing_reset', id})).status, status);
  }
  noWrite(s); assert.equal(tables.command_center_sourcing_reviews.length, 1);
});
test('reset reports supplier-refresh failure and a retry repairs the persisted scores', async () => {
  const tables = resetTables(), failed = store(tables, {failReadTable: 'command_center_suppliers'}), first = await api(failed);
  const response = await first('PATCH', {action: 'sourcing_reset', id: 'reset-1'});
  assert.equal(response.status, 500); assert.deepEqual(await response.json(), {ok: false, error: 'mutation_failed'});
  // This legacy multi-table flow is not transactional. Never claim rollback:
  // the judgment was removed but stale persisted scores must be repaired.
  assert.equal(tables.command_center_sourcing_reviews.length, 0); assert.equal(tables.command_center_suppliers[0].trust_score, 65);
  const repaired = store(tables), retry = await api(repaired);
  assert.equal((await retry('PATCH', {action: 'sourcing_reset', id: 'reset-1'})).status, 200);
  assert.equal(tables.command_center_suppliers[0].trust_score, 50); assert.equal(tables.command_center_suppliers[0].priority_boost, 0);
  assert.equal(tables.command_center_suppliers[0].purchase_spend_yen, 1000);
});
test('real posting performance route remains usable and reports concurrent save as HTTP 409', async () => {
  const row = signal(), s = store({command_center_signals: [structuredClone(row)]}, {signalReadBarrier: 2}), call = await api(s);
  const responses = await Promise.all([10, 20].map(reach => call('PATCH', {action: 'fp_performance', id: row.id, performance: {platform: 'instagram', posted_at: '2026-10-01T00:00:00Z', reach}})));
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]); assert.equal(s.writes.length, 1);
  const conflict = await responses.find(r => r.status === 409).json(); assert.equal(conflict.error, 'content_changed_reload');
});
test('sequential posting saves read the latest payload and both succeed', async () => {
  const row = signal(), s = store({command_center_signals: [structuredClone(row)]}), call = await api(s);
  for (const reach of [10, 20]) {
    const response = await call('PATCH', {action: 'fp_performance', id: row.id, performance: {platform: 'instagram', posted_at: '2026-10-01', reach}});
    assert.equal(response.status, 200);
  }
  assert.equal(s.writes.length, 2); assert.equal(s.tables.command_center_signals[0].payload.performance.reach, 20);
});
test('real posting route does not leak database errors or claim save succeeded on failure', async () => {
  const row = signal(), s = store({command_center_signals: [structuredClone(row)]}, {failWrite: true}), call = await api(s);
  const response = await call('PATCH', {action: 'fp_performance', id: row.id, performance: {platform: 'instagram', posted_at: '2026-10-01', reach: 10}});
  assert.equal(response.status, 500); assert.deepEqual(await response.json(), {ok: false, error: 'mutation_failed'});
  assert.deepEqual(s.tables.command_center_signals[0], row); noWrite(s);
});
