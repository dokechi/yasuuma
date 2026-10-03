const {test}=require('node:test');
const assert=require('node:assert/strict');
const D=require('./command-center-data.js');

test('deduplication uses a stable record ID, keeps the latest version, and does not mutate input',()=>{
  const a=Object.freeze({id:'one',title:'同じ題名',updatedAt:'2026-10-01T00:00:00Z',payload:{source:'old'}});
  const b=Object.freeze({id:'one',title:'改訂版',updatedAt:'2026-10-02T00:00:00Z',payload:{source:'new'}});
  const other=Object.freeze({id:'two',title:'同じ題名'});
  const input=Object.freeze([a,other,b]);
  assert.deepEqual(D.rows(input),[b,other]);
  assert.deepEqual(input,[a,other,b]);
});
test('missing IDs stay separate and same-title records are never merged',()=>{
  const input=[{title:'same'},{title:'same',id:''},{id:1,title:'same'},{id:2,title:'same'}];
  assert.deepEqual(D.rows(input),input);
});
test('unknown dates stay unknown; invalid dates never replace a dated revision',()=>{
  const before={id:'a',updatedAt:'2026-10-01T00:00:00Z'},bad={id:'a',updatedAt:'invalid'};
  assert.deepEqual(D.rows([before,bad]),[before]);
  assert.equal(D.itemTime({updatedAt:'bad',lastSeen:'2026-10-03'}),'2026-10-03');
  for(const value of [null,undefined,'',false,'not a date'])assert.equal(D.timestamp(value),null);
  assert.equal(D.itemTime({updatedAt:'bad'}),null);
});
test('empty, invalid and successful-empty inputs are distinguished',()=>{
  assert.deepEqual(D.rows([]),[]);
  for(const value of [undefined,null,{},''])assert.throws(()=>D.rows(value),/形式/);
  const raw=[null,5,{id:'valid'}];assert.deepEqual(D.rows(raw),[{id:'valid'}]);assert.equal(raw.length,3);
});
test('zero is a valid count, missing and invalid values are never fabricated as zero',()=>{
  assert.equal(D.count(0),'0件');assert.equal(D.count('3'),'3件');
  for(const value of [null,undefined,'',' ',false])assert.equal(D.count(value),'未取得');
  for(const value of [-1,NaN,Infinity,'not a number'])assert.equal(D.count(value),'不明');
});
test('failure and stale data remain distinct from loading and empty success',()=>{
  assert.equal(D.sourceState(false,true,false),'error');
  assert.equal(D.sourceState(true,true,false),'stale');
  assert.equal(D.sourceState(false,false,true),'loading');
  assert.equal(D.sourceState(false,false,false),'pending');
  assert.equal(D.sourceState(true,false,false),'ready');
});
test('summary categories recognize current content types without relying only on old task IDs',()=>{
  assert.equal(D.isPostFlow({id:'new-task',payload:{content_type:'house_post_candidate'}}),true);
  assert.equal(D.isPostFlow({payload:{content_type:'fp_post_candidate'}}),true);
  assert.equal(D.isSalesSync({payload:{result_kind:'sales_sync'}}),true);
  assert.equal(D.isSalesSync({id:'gmail-sales:1'}),true);
  assert.equal(D.isPostFlow({id:'ordinary',title:'お金のニュース'}),false);
  assert.equal(D.isPostFlow({id:'sns:task:6aa77eb5ce7881919d8dc62554833b60:one'}),true);
  assert.equal(D.isPostFlow({payload:{source_task_id:'6a9e5826d4888191a4d82a643e6d5adf'}}),true);
  assert.equal(D.isPostFlow({sourceTaskId:'6aa77eb5ce7881919d8dc62554833b60'}),true);
});
test('newest-first ordering preserves records and puts unknown dates last',()=>{
  const input=[{id:'unknown'},{id:'old',lastSeen:'2026-10-01'},{id:'new',lastSeen:'2026-10-03'}];
  assert.deepEqual(D.newest(input).map(x=>x.id),['new','old','unknown']);
  assert.equal(input[0].id,'unknown');
});
