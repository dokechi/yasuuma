import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {createHash, createHmac, webcrypto} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {saveThreadsPayload, THREADS_PAYLOAD_UPDATE_SQL} from '../supabase/functions/command-center-retro-api/threads-payload-store.mjs';
import {threadsUrl, threadsAccount, threadsManualGet, threadsManualPatch, THREADS_TASK, PROFILE_CONTRACT, RESULT_CONTRACT} from '../supabase/functions/command-center-retro-api/threads-manual-api.mjs';

if (process.env.REQUIRE_THREADS_SQL === '1') assert.ok(process.env.PGLITE_MODULE, 'PGLITE_MODULE must be configured for required Threads SQL coverage');

// Synthetic evidence only. This test never contacts a database or social network.
const now = '2026-10-13T00:00:00.000Z';
const accountNames = {kyun: 'キュン拾い', choi: 'ちょい上等'};
const event = (id = 1, key = 'kyun') => ({id, task_id: THREADS_TASK, event_key: key + ':synthetic:' + id,
  domain: 'sns', title: 'Synthetic saved garment', occurred_at: '2026-10-01T00:00:00Z',
  payload: {platform: 'threads', account: accountNames[key], account_name: accountNames[key],
    posted: false, status: 'verified_draft_unpublished', draft: 'Original synthetic draft', main_post: 'Original synthetic draft',
    self_reply: 'Original reply', price: 1234, qty: 3, opaque: {keep: true}}});
const configured = (id = 1, key = 'kyun') => {
  const row = event(id, key);
  row.payload.threads_account_profiles = Object.fromEntries(['kyun', 'choi'].map(account => [account, {contract: PROFILE_CONTRACT, account_key: account, revision: 1,
    profile_url: 'https://www.threads.com/@' + account + '_example', handle: account + '_example', source: 'manual'}]));
  return row;
};
function fixture(rows = [configured(), configured(2, 'choi')], options = {}) {
  const saved = structuredClone(rows), writes = [];
  let blocked = 0, release;
  const barrier = new Promise(resolve => {release = resolve;});
  class Query {
    constructor() { this.filters = []; this.write = null; }
    select() { return this; }
    eq(key, value) { this.filters.push(row => key === 'payload' ? isDeepStrictEqual(row.payload, JSON.parse(value)) : row[key] === value); return this; }
    like(key, value) { this.filters.push(row => row[key].startsWith(value.slice(0, -1))); return this; }
    order(key, options) { this.sort = {key, asc: options.ascending}; return this; }
    range(start, end) { this.rangeValue = [start, end]; return this; }
    maybeSingle() { this.single = true; return this; }
    update(value) { if (options.readOnly) throw new Error('GET attempted update'); this.write = value; return this; }
    then(resolve, reject) {
      return Promise.resolve().then(async () => {
        if (options.failRead && !this.write) return {data: null, error: {message: 'private SQL detail'}};
        if (options.failWrite && this.write) return {data: null, error: {message: 'private SQL detail'}};
        if (this.write && options.beforeWrite) { options.beforeWrite(saved); delete options.beforeWrite; }
        let found = saved.filter(row => this.filters.every(filter => filter(row)));
        if (this.sort) found.sort((a, b) => (a[this.sort.key] - b[this.sort.key]) * (this.sort.asc ? 1 : -1));
        if (this.rangeValue) found = found.slice(this.rangeValue[0], this.rangeValue[1] + 1);
        if (this.write) for (const row of found) { Object.assign(row, structuredClone(this.write)); writes.push(structuredClone(row)); }
        const result = {data: structuredClone(this.single ? found[0] ?? null : found), error: null};
        if (!this.write && this.single && blocked < (options.readBarrier ?? 0)) { if (++blocked === options.readBarrier) release(); await barrier; }
        return result;
      }).then(resolve, reject);
    }
  }
  const deps = {admin: {from: table => {assert.equal(table, 'command_center_task_events'); return new Query();}},
    json: (_req, body, status = 200) => ({status, body}), sha256: async value => createHash('sha256').update(value).digest('hex'),
    mapEvent: row => ({id: row.id, taskId: row.task_id, eventKey: row.event_key, payload: row.payload}), now: () => now,
    saveThreadsPayload: async (row, payload) => {
      const result = await new Query().update({payload}).eq('id', row.id).eq('task_id', row.task_id).eq('event_key', row.event_key).eq('payload', JSON.stringify(row.payload)).maybeSingle();
      if (result.error) throw result.error; return result.data;
    }};
  return {rows: saved, writes, deps};
}
const resultBody = (extra = {}) => ({action: 'threads_manual_result', id: 1, accountKey: 'kyun', expectedRevision: 0,
  mutationId: 'synthetic-request-0001', postUrl: 'https://www.threads.com/@kyun_example/post/abc123', confirmPosted: true, ...extra});
const profileBody = (extra = {}) => ({action: 'threads_account_profile', id: 1, accountKey: 'kyun', expectedRevision: 0,
  mutationId: 'synthetic-profile-0001', profileUrl: 'https://www.threads.com/@kyun_example', confirmAccount: true, ...extra});
const patch = (s, body) => threadsManualPatch({}, body, s.deps);
const read = s => threadsManualGet(new Request('https://example.invalid/?resource=threads-manual-accounts'), s.deps);
const good = reply => {assert.equal(reply.status, 200, JSON.stringify(reply)); return reply.body;};

test('strict profile/post parser accepts canonical Threads hosts and rejects unsafe or ambiguous URLs', () => {
  for (const host of ['threads.com', 'www.threads.com', 'threads.net', 'www.threads.net']) {
    assert.deepEqual(threadsUrl('https://' + host + '/@Example.User/', 'profile'), {url: 'https://www.threads.com/@example.user', handle: 'example.user'});
    assert.equal(threadsUrl('https://' + host + '/@Example.User/post/a_B-9/', 'post').url, 'https://www.threads.com/@example.user/post/a_B-9');
  }
  for (const url of ['http://threads.com/@user/post/a', 'https://threads.com.evil.test/@user/post/a', 'https://evil.test/@threads.com/post/a',
    'https://user:secret@threads.com/@user/post/a', 'https://threads.com:443/@user/post/a', 'https://threads.com/@user',
    'https://threads.com/@user/post/a?redirect=https://evil.test', 'https://threads.com/@user/post/a#fragment',
    'https://threads.com/@user/post/%61', 'https://threads.com/@user/post/../b', 'https://threads.com\\@evil.test/@user/post/a',
    'https://threads.com/@user/post/a\n/post/b', 'https://threads.com/@../post/a', 'javascript:alert(1)', 'https://threads.com/t/a']) {
    assert.throws(() => threadsUrl(url, 'post'), {message: 'threads_invalid_post_url'}, url);
  }
  assert.throws(() => threadsUrl('https://threads.com/@user/post/a', 'profile'));
});

test('GET is read-only, finds deterministic account anchors and gives null for unknown profiles', async () => {
  const s = fixture([event(3), event(2, 'choi'), event(1)], {readOnly: true});
  const data = good(await read(s));
  assert.deepEqual(data.accounts, [{accountKey: 'kyun', id: 1, revision: 0, profile_url: null, handle: null}, {accountKey: 'choi', id: 1, revision: 0, profile_url: null, handle: null}]);
  assert.equal(s.writes.length, 0);
  assert.equal(good(await read(fixture([], {readOnly: true}))).accounts[0].id, null);
});

test('profile setup is explicit, bounded to the anchor and does not mark anything posted', async () => {
  const s = fixture([event(1), event(3), event(2, 'choi')]), before = structuredClone(s.rows[0]);
  assert.equal((await patch(s, profileBody({confirmAccount: false}))).status, 400);
  assert.equal((await patch(s, profileBody({id: 3}))).status, 409);
  const data = good(await patch(s, profileBody()));
  assert.equal(data.account.revision, 1);
  const {threads_account_profiles, ...original} = s.rows[0].payload;
  assert.deepEqual(original, before.payload); assert.equal(s.rows[0].occurred_at, before.occurred_at);
  assert.equal(s.rows[0].payload.posted, false); assert.equal(s.writes.length, 1);
  good(await patch(s, profileBody())); assert.equal(s.writes.length, 1);
});

test('URL-only result requires confirmation and configured matching account; unknown values remain null', async () => {
  for (const [rows, body, code] of [
    [[event()], resultBody(), 'threads_profile_required'],
    [[configured()], resultBody({confirmPosted: false}), 'threads_user_confirmation_required'],
    [[configured()], resultBody({postUrl: 'https://threads.com/@wrong/post/a'}), 'threads_post_account_mismatch'],
    [[configured()], resultBody({accountKey: 'choi'}), 'threads_account_mismatch']
  ]) { const s = fixture(rows); assert.equal((await patch(s, body)).body.error, code); assert.equal(s.writes.length, 0); }
  const s = fixture(), before = structuredClone(s.rows[0]);
  const {result} = good(await patch(s, resultBody()));
  assert.equal(result.contract, RESULT_CONTRACT); assert.equal(result.status, 'posted_manual'); assert.equal(result.source, 'manual');
  assert.equal(result.posted_at, null); assert.equal(result.actual_text, null); assert.equal(result.metrics, null);
  assert.equal(result.confirmed_at, now); assert.equal(result.account_profile_revision, 1);
  assert.deepEqual(result.original_copies, {draft: before.payload.draft, main_post: before.payload.main_post, self_reply: before.payload.self_reply});
  const {threads_manual_result, ...original} = s.rows[0].payload;
  assert.deepEqual(original, before.payload); assert.equal(s.rows[0].occurred_at, before.occurred_at);
});

test('result allows canonical task identities but rejects unrelated/import-mismatched events and arbitrary fields', async () => {
  const s = fixture();
  good(await patch(s, resultBody({id: 'sns:task:' + THREADS_TASK + ':kyun:synthetic:1'})));
  for (const extra of [{id: 'task:other:kyun:synthetic:1'}, {draft: 'overwrite'}, {payload: {}}, {status: 'posted'}, {expectedRevision: undefined}, {id: true}, {mutationId: 'tiny'}]) {
    assert.ok((await patch(fixture(), resultBody(extra))).status >= 400);
  }
  const wrong = configured(); wrong.payload.account_name = 'ちょい上等';
  assert.equal((await patch(fixture([wrong]), resultBody())).body.error, 'threads_account_mismatch');
  const other = configured(); other.task_id = 'unrelated';
  assert.equal((await patch(fixture([other]), resultBody())).status, 404);
  assert.throws(() => threadsAccount({...event(), payload: {...event().payload, platform: 'instagram'}}));
});

test('manual observations distinguish unset from zero and retain the entered posting time/text exactly', async () => {
  const s = fixture(), body = resultBody({actualText: 'Actual changed text\nwith line two', postedAt: '2026-10-12T09:00:00+09:00', metrics: {views: 0, likes: 2}, observedAt: '2026-10-12T23:00:00Z'});
  const first = good(await patch(s, body)).result;
  assert.equal(first.posted_at, '2026-10-12T00:00:00.000Z'); assert.equal(first.actual_text, body.actualText);
  assert.deepEqual(first.metrics, {views: 0, likes: 2, replies: null, reposts: null, quotes: null, clicks: null, observed_at: '2026-10-12T23:00:00.000Z', source: 'manual'});
  const second = good(await patch(s, resultBody({expectedRevision: 1, mutationId: 'synthetic-request-0002'}))).result;
  assert.deepEqual(second.metrics, first.metrics); assert.equal(second.actual_text, first.actual_text); assert.equal(second.posted_at, first.posted_at);
  assert.deepEqual(second.original_copies, first.original_copies); assert.equal(second.history[0].revision, 1);
  assert.equal(second.confirmed_at, first.confirmed_at);
});

test('optional blanks never erase known text, timestamps, or metrics; original copies stay immutable', async () => {
  const s = fixture();
  const before = good(await patch(s, resultBody({actualText: 'Known actual text', postedAt: '2026-10-12T00:00:00Z', metrics: {likes: 4}}))).result;
  s.rows[0].payload.draft = 'Later imported draft amendment';
  for (const [i, optional] of [{actualText: null, postedAt: null, metrics: null}, {actualText: '', postedAt: '', metrics: {}}, {actualText: '  ', metrics: {likes: null}}].entries()) {
    const result = good(await patch(s, resultBody({expectedRevision: i + 1, mutationId: 'synthetic-blank-' + i, ...optional}))).result;
    assert.equal(result.actual_text, before.actual_text); assert.equal(result.posted_at, before.posted_at);
    assert.deepEqual(result.metrics, before.metrics); assert.deepEqual(result.original_copies, before.original_copies);
  }
});

test('a retry after a newer successful save returns latest state without rolling it back', async () => {
  const s = fixture(), first = resultBody({metrics: {views: 5}});
  good(await patch(s, first));
  const newest = good(await patch(s, resultBody({expectedRevision: 1, mutationId: 'synthetic-request-0002', metrics: {views: 10}})));
  assert.deepEqual(good(await patch(s, first)), newest); assert.equal(s.writes.length, 2);
});

test('invalid numbers, timestamps, oversized inputs and inferred data cannot reach writes', async () => {
  for (const extra of [{metrics: {views: '0'}}, {metrics: {likes: -1}}, {metrics: {likes: 1.5}}, {metrics: {likes: 1000000001}},
    {metrics: {unknown: 2}}, {actualText: 'x'.repeat(5001)}, {actualText: {}}, {postedAt: '2026-10-12'},
    {postedAt: '2026-02-30T00:00:00Z'}, {postedAt: '2099-01-01T00:00:00Z'}, {observedAt: now},
    {metrics: {}, observedAt: ''}, {postedAt: '2026-10-12T20:00:00Z', metrics: {views: 1}, observedAt: '2026-10-12T19:00:00Z'}]) {
    const s = fixture(); assert.equal((await patch(s, resultBody(extra))).status, 400, JSON.stringify(extra)); assert.equal(s.writes.length, 0);
  }
});

test('same-request retry is idempotent; changed intent and stale revisions never overwrite saved results', async () => {
  const s = fixture(), body = resultBody({metrics: {likes: 0}});
  const first = good(await patch(s, body)); const replay = good(await patch(s, body));
  assert.deepEqual(replay, first); assert.equal(s.writes.length, 1);
  assert.equal((await patch(s, {...body, actualText: 'different'})).body.error, 'threads_mutation_id_conflict');
  assert.equal((await patch(s, resultBody({mutationId: 'synthetic-request-0002'}))).status, 409); assert.equal(s.writes.length, 1);
});

test('two concurrent edits from the same version commit exactly once', async () => {
  const s = fixture(undefined, {readBarrier: 2});
  const replies = await Promise.all([patch(s, resultBody()), patch(s, resultBody({mutationId: 'synthetic-request-0002', actualText: 'other'}))]);
  assert.deepEqual(replies.map(r => r.status).sort(), [200, 409]); assert.equal(s.writes.length, 1);
});

test('concurrent unrelated payload changes cause CAS conflict and are preserved', async () => {
  const s = fixture(undefined, {beforeWrite: rows => {rows[0].payload.qty = 7;}});
  assert.equal((await patch(s, resultBody())).status, 409);
  assert.equal(s.rows[0].payload.qty, 7); assert.equal(s.rows[0].payload.threads_manual_result, undefined); assert.equal(s.writes.length, 0);
});

test('failed read/write returns sanitized errors and leaves source evidence intact', async () => {
  for (const options of [{failRead: true}, {failWrite: true}]) {
    const s = fixture(undefined, options), before = structuredClone(s.rows);
    assert.deepEqual(await patch(s, resultBody()), {status: 500, body: {ok: false, error: 'threads_save_failed'}});
    assert.deepEqual(s.rows, before); assert.equal(s.writes.length, 0);
  }
});

test('changing linked URL requires explicit reset and does not attach old metrics/text to a different post', async () => {
  const s = fixture(); good(await patch(s, resultBody({actualText: 'old post', metrics: {likes: 5}})));
  const changed = resultBody({expectedRevision: 1, mutationId: 'synthetic-request-0002', postUrl: 'https://threads.com/@kyun_example/post/new123'});
  assert.equal((await patch(s, changed)).body.error, 'threads_post_url_changed_requires_reset');
  const result = good(await patch(s, {...changed, resetForNewPost: true})).result;
  assert.equal(result.metrics, null); assert.equal(result.actual_text, null); assert.equal(result.history[0].metrics.likes, 5);
});

test('history and receipts are bounded, do not nest, and old expired retries cannot overwrite newer state', async () => {
  const s = fixture();
  for (let i = 0; i < 25; i++) good(await patch(s, resultBody({expectedRevision: i, mutationId: 'synthetic-request-' + String(i).padStart(4, '0'), metrics: {views: i}})));
  const result = s.rows[0].payload.threads_manual_result;
  assert.equal(result.revision, 25); assert.equal(result.history.length, 20); assert.equal(result.receipts.length, 20);
  assert.ok(result.history.every(item => !own(item, 'history') && !own(item, 'receipts')));
  assert.equal((await patch(s, resultBody({mutationId: 'synthetic-request-0000', metrics: {views: 0}}))).status, 409);
});
const own = (v, k) => Object.prototype.hasOwnProperty.call(v, k);

test('profile URL cannot be configured as the other known account', async () => {
  const row = configured(); delete row.payload.threads_account_profiles.kyun;
  const s = fixture([row]);
  assert.equal((await patch(s, profileBody({profileUrl: 'https://threads.com/@choi_example'}))).body.error, 'threads_profile_used_by_other_account');
  assert.equal(s.writes.length, 0);
});

test('simultaneous two-account first setup cannot bind the same handle to both accounts', async () => {
  const s = fixture([event(), event(2, 'choi')], {readBarrier: 2});
  const first = profileBody({profileUrl: 'https://threads.com/@shared_example'});
  const second = profileBody({accountKey: 'choi', mutationId: 'synthetic-profile-0002', profileUrl: 'https://threads.com/@shared_example'});
  const replies = await Promise.all([patch(s, first), patch(s, second)]);
  assert.deepEqual(replies.map(r => r.status).sort(), [200, 409]); assert.equal(s.writes.length, 1);
  const accounts = good(await read(s)).accounts;
  assert.equal(accounts.filter(a => a.handle === 'shared_example').length, 1); assert.equal(accounts[0].id, accounts[1].id);
  const failed = replies[0].status === 409 ? first : second;
  assert.equal((await patch(s, failed)).body.error, 'threads_profile_used_by_other_account');
});

test('actual API dispatcher requires existing auth for both Threads routes; no login/auth changes', async () => {
  const source = await readFile(new URL('../supabase/functions/command-center-retro-api/index.ts', import.meta.url), 'utf8');
  const s = fixture(); let handler; const noRoute = async () => null;
  let dbConfigured = true, dbEnvReads = 0, dbClients = 0, driverFailure = false;
  runInNewContext(stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm, ''), {mode: 'strip'}), {
    Deno: {env: {get: name => {
      if (name === 'SUPABASE_DB_URL') {dbEnvReads++; return dbConfigured ? 'synthetic-existing-internal-db' : undefined;}
      return name === 'SUPABASE_SERVICE_ROLE_KEY' ? 'synthetic-test-key' : 'https://example.invalid';
    }}, serve: cb => {handler = cb;}},
    createClient: () => s.deps.admin, crypto: webcrypto, TextEncoder, Headers, Response, URL, structuredClone,
    affiliatePublicAsset: noRoute, affiliatePatch: noRoute, affiliateGet: noRoute, nekoPatch: noRoute, nekoGet: noRoute,
    fpImagesPatch: noRoute, fpImagesGet: noRoute, threadsManualGet, threadsManualPatch, saveThreadsPayload,
    postgres: () => { dbClients++; return {unsafe: async (statement, params) => {
      if (driverFailure) throw Error("synthetic-private-password-must-not-leak");
      assert.equal(statement, THREADS_PAYLOAD_UPDATE_SQL);
      const row = s.rows.find(r => r.id === params[1]);
      if (!row || !isDeepStrictEqual(row.payload, JSON.parse(params[4]))) return [];
      row.payload = JSON.parse(params[0]); s.writes.push(structuredClone(row)); return [{row: structuredClone(row)}];
    }}; }
  });
  for (const method of ['GET', 'PATCH']) {
    const response = await handler(new Request('https://example.invalid/?resource=threads-manual-accounts', {method,
      ...(method === 'PATCH' ? {body: JSON.stringify(resultBody())} : {})}));
    assert.equal(response.status, 401); assert.deepEqual(await response.json(), {ok: false, error: 'unauthorized'});
  }
  assert.equal(s.writes.length, 0);
  const exp = String(Date.now() + 60000), token = exp + '.' + createHmac('sha256', 'synthetic-test-key').update('retro|' + exp).digest('hex');
  const headers = {authorization: 'Bearer ' + token, 'content-type': 'application/json'};
  const read = await handler(new Request('https://example.invalid/?resource=threads-manual-accounts', {headers}));
  assert.equal(read.status, 200); assert.equal((await read.json()).accounts.length, 2);
  assert.equal(dbEnvReads, 0); assert.equal(dbClients, 0);
  const invalid = await handler(new Request('https://example.invalid/', {method: 'PATCH', headers, body: JSON.stringify(resultBody({postUrl: 'https://evil.test/post'}))}));
  assert.equal(invalid.status, 400); assert.equal(dbEnvReads, 0);
  dbConfigured = false;
  const absent = await handler(new Request('https://example.invalid/', {method: 'PATCH', headers, body: JSON.stringify(resultBody())}));
  assert.equal(absent.status, 500); assert.deepEqual(await absent.json(), {ok: false, error: 'threads_save_failed'});
  assert.equal(dbClients, 0); assert.equal(s.writes.length, 0);
  dbConfigured = true; driverFailure = true;
  const failed = await handler(new Request('https://example.invalid/', {method: 'PATCH', headers, body: JSON.stringify(resultBody())}));
  assert.equal(failed.status, 500); assert.deepEqual(await failed.json(), {ok: false, error: 'threads_save_failed'}); assert.equal(s.writes.length, 0);
  driverFailure = false;
  const save = await handler(new Request('https://example.invalid/', {method: 'PATCH', headers, body: JSON.stringify(resultBody())}));
  assert.equal(save.status, 200); assert.equal((await save.json()).result.status, 'posted_manual'); assert.equal(s.writes.length, 1);
});

test('isolated PostgreSQL validates real JSONB CAS, row preservation and idempotent receipts', {skip: !process.env.PGLITE_MODULE && 'PGLITE_MODULE required for isolated PostgreSQL'}, async () => {
  const {pathToFileURL} = await import('node:url');
  const {PGlite} = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
  const pg = new PGlite();
  await pg.exec('CREATE TABLE command_center_task_events(id integer PRIMARY KEY, task_id text NOT NULL, event_key text NOT NULL, domain text NOT NULL, title text, occurred_at text, payload jsonb NOT NULL)');
  for (const row of [configured(), configured(2, 'choi')]) await pg.query('INSERT INTO command_center_task_events VALUES($1,$2,$3,$4,$5,$6,$7)', [row.id, row.task_id, row.event_key, row.domain, row.title, row.occurred_at, JSON.stringify(row.payload)]);
  let injectConflict = false, injectReclassification = false;
  class Query {
    constructor() { this.filters = []; }
    select() { return this; }
    eq(k, v) { this.filters.push([k, '=', v]); return this; }
    like(k, v) { this.filters.push([k, 'LIKE', v]); return this; }
    order(k, options) { this.sort = [k, options.ascending]; return this; }
    range(a, b) { this.bounds = [a, b]; return this; }
    update(value) { this.value = value; return this; }
    maybeSingle() { this.one = true; return this; }
    then(resolve, reject) { return (async () => {
      const args = [], bind = v => {args.push(v); return '$' + args.length;};
      const safe = k => {if (!/^[a-z_]+$/.test(k)) throw Error('invalid fixture identifier'); return '"' + k + '"';};
      const where = this.filters.map(([k, op, v]) => safe(k) + ' ' + op + ' ' + bind(v)).join(' AND ');
      if (this.value && injectConflict) { injectConflict = false; await pg.exec("UPDATE command_center_task_events SET payload=jsonb_set(payload,'{qty}','7') WHERE id=1"); }
      let sql;
      if (this.value) sql = 'UPDATE command_center_task_events SET ' + Object.entries(this.value).map(([k, v]) => safe(k) + '=' + bind(JSON.stringify(v))).join(',') + ' WHERE ' + where + ' RETURNING *';
      else {
        sql = 'SELECT * FROM command_center_task_events WHERE ' + where;
        if (this.sort) sql += ' ORDER BY ' + safe(this.sort[0]) + (this.sort[1] ? ' ASC' : ' DESC');
        if (this.bounds) sql += ' LIMIT ' + (this.bounds[1] - this.bounds[0] + 1) + ' OFFSET ' + this.bounds[0];
      }
      try {const rows = (await pg.query(sql, args)).rows; return {data: this.one ? rows[0] ?? null : rows, error: null};}
      catch (error) {return {data: null, error};}
    })().then(resolve, reject); }
  }
  const s = fixture(); s.deps.admin = {from: table => {assert.equal(table, 'command_center_task_events'); return new Query();}};
  s.deps.saveThreadsPayload = (row, payload) => saveThreadsPayload(async (sql, parameters) => {
    if (injectReclassification) { injectReclassification = false; await pg.exec("UPDATE command_center_task_events SET domain='other' WHERE id=1"); }
    if (injectConflict) { injectConflict = false; await pg.exec("UPDATE command_center_task_events SET payload=jsonb_set(payload,'{qty}','7') WHERE id=1"); }
    return (await pg.query(sql, parameters)).rows;
  }, row, payload);
  try {
    good(await read(s));
    const original = (await pg.query('SELECT * FROM command_center_task_events WHERE id=1')).rows[0];
    const body = resultBody({metrics: {views: 0}});
    const first = good(await patch(s, body));
    assert.deepEqual(good(await patch(s, body)), first);
    const after = (await pg.query('SELECT * FROM command_center_task_events WHERE id=1')).rows[0];
    const {threads_manual_result, ...evidence} = after.payload;
    assert.deepEqual(evidence, original.payload); assert.equal(after.occurred_at, original.occurred_at);
    assert.equal((await patch(s, resultBody({mutationId: 'stale-request-0002'}))).status, 409);
    injectConflict = true;
    assert.equal((await patch(s, resultBody({expectedRevision: 1, mutationId: 'concurrent-request-0003', metrics: {likes: 1}}))).status, 409);
    const preserved = (await pg.query('SELECT payload FROM command_center_task_events WHERE id=1')).rows[0].payload;
    assert.equal(preserved.qty, 7); assert.equal(preserved.threads_manual_result.revision, 1);
    injectReclassification = true;
    assert.equal((await patch(s, resultBody({expectedRevision: 1, mutationId: 'reclassified-request-0004'}))).status, 404);
    assert.equal((await pg.query('SELECT payload FROM command_center_task_events WHERE id=1')).rows[0].payload.threads_manual_result.revision, 1);
  } finally { await pg.close(); }
});

test('SQL transport remains constant for long Japanese evidence; all content is bound and scoped', async () => {
  const row = configured(); row.payload.draft = '長い日本語の原稿。'.repeat(10000);
  const payload = {...row.payload, threads_manual_result: {actual_text: '実際の本文'.repeat(1000)}};
  let calls = 0;
  const saved = await saveThreadsPayload(async (statement, parameters) => {
    calls++; assert.equal(statement, THREADS_PAYLOAD_UPDATE_SQL); assert.ok(statement.length < 500);
    assert.equal(statement.includes('長い日本語'), false); assert.equal(statement.includes('実際の本文'), false);
    assert.deepEqual(parameters.slice(1, 4), [row.id, THREADS_TASK, row.event_key]);
    assert.deepEqual(JSON.parse(parameters[0]), payload); assert.deepEqual(JSON.parse(parameters[4]), row.payload);
    return [{row: {...row, payload}}];
  }, row, payload);
  assert.equal(calls, 1); assert.deepEqual(saved.payload, payload);
  await assert.rejects(saveThreadsPayload(() => {throw Error('should not run');}, {...row, task_id: 'other'}, payload), {message: 'threads_invalid_storage_scope'});
  assert.equal(await saveThreadsPayload(async () => [], row, payload), null);
});
