const test=require('node:test');
const assert=require('node:assert/strict');
const model=require('./sourcing-display-model.js');
test('projection preserves frozen source records and order, with legacy score/date ordering',()=>{
  const items=Object.freeze([
    Object.freeze({id:'low',score:1,ready:true}),
    Object.freeze({id:'older',score:5,lastSeen:'2026-10-01',ready:true}),
    Object.freeze({id:'newer',score:5,lastSeen:'2026-10-10',ready:true}),
    Object.freeze({id:'hold',sourcingVerdict:'close',verdictNote:'manual note',payload:Object.freeze({url:'https://example.com/evidence',target:100})}),
    Object.freeze({id:'miss',sourcingVerdict:'miss'})
  ]);
  const research=Object.freeze([Object.freeze({id:'research',url:'https://example.com/research'})]);
  const before=JSON.stringify({items,research}),view=model.snapshot(items,x=>x.ready,research);
  assert.deepEqual(view.ready.map(x=>x.id),['newer','older','low']);
  assert.equal(view.closed[0],items[3]);assert.equal(view.closed[0].verdictNote,'manual note');
  assert.equal(view.closed[0].payload.url,'https://example.com/evidence');
  assert.equal(view.research[0],research[0]);assert.equal(view.total,5);
  view.ready.reverse();view.closed.pop();view.research.pop();
  assert.equal(JSON.stringify({items,research}),before);
});
test('each render reads fresh inputs and the current final predicate without persistent caching',()=>{
  const items=[{id:'a',ready:true}];
  assert.equal(model.snapshot(items,x=>x.ready,[]).total,1);
  assert.equal(model.snapshot(items,()=>false,[{id:'r'}]).ready.length,0);
  items.push({id:'b',sourcingVerdict:'close'});
  assert.equal(model.snapshot(items,x=>x.ready,[{id:'r'}]).total,3);
  assert.equal(model.snapshot(undefined,undefined,undefined).total,0);
});
