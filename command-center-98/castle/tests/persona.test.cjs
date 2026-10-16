const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=['persona-lines','persona'].map(n=>fs.readFileSync(n+'.js','utf8').replace(/^import .*$/gm,'').replaceAll('export ','')).join('\n');
const api=vm.runInNewContext(source+'\n;({createPersona,PERSONA_DIALOGUE,PERSONA_MEMORY_KEY});');
function setup(store=new Map()){let time=0;return {store,persona:api.createPersona({storage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},now:()=>time}),advance:ms=>time+=ms};}
test('the four references have exactly the eight approved authored lines, without imported relationships',()=>{
 assert.deepEqual(Object.values(api.PERSONA_DIALOGUE).map(c=>c.name),['加藤恵','一色いろは','新垣あやせ','アスナ']);
 const lines=Object.values(api.PERSONA_DIALOGUE).flatMap(c=>[c.welcome,c.repeatTouch]);assert.equal(lines.length,8);assert.equal(new Set(lines).size,8);
 for(const line of lines){assert.ok(line.length>10&&line.length<90);assert.doesNotMatch(line,/桐乃|京介|キリト|倫也|あやせif|出典|通報|https:/);}
});
test('entering any room always greets; only repeated touch produces its second line',()=>{
 for(const [key,cast] of Object.entries(api.PERSONA_DIALOGUE)){
  const b=setup();assert.equal(b.persona.enter(key).text,cast.welcome);
  assert.equal(b.persona.touch(key).text,undefined);b.advance(600);
  assert.equal(b.persona.touch(key).text,cast.repeatTouch);b.advance(600);
  assert.equal(b.persona.touch(key).text,undefined);assert.equal(b.persona.enter(key).text,cast.welcome);
 }
});
test('accidental duplicate clicks are ignored and do not count as repeated touch',()=>{
 const b=setup();b.persona.enter('choi');b.persona.touch('choi');b.advance(319);assert.equal(b.persona.touch('choi'),null);b.advance(1);assert.equal(b.persona.touch('choi').event,'repeatTouch');
});
test('isolated touches, leaving and other characters never inherit a repeated-touch reaction',()=>{
 const b=setup();b.persona.enter('fp');b.persona.touch('fp');b.advance(8001);assert.equal(b.persona.touch('fp').text,undefined);b.advance(400);assert.equal(b.persona.touch('fp').event,'repeatTouch');
 b.persona.leave('fp');assert.equal(b.persona.touch('fp').text,undefined);assert.equal(b.persona.touch('kyun').text,undefined);
 b.advance(8001);assert.equal(b.persona.touch('fp').text,undefined);b.advance(400);assert.equal(b.persona.touch('fp').event,'repeatTouch');
});
test('reload keeps visit counts, removes quotation history and leaves business storage intact',()=>{
 const store=new Map([['business','unchanged'],[api.PERSONA_MEMORY_KEY,JSON.stringify({choi:{visits:9,recent:['quote:1','welcome:1']}})]]);
 const a=setup(store);a.persona.enter('choi');a.persona.touch('choi');a.advance(400);a.persona.touch('choi');
 const b=setup(store);assert.equal(b.persona.enter('choi').event,'welcome');assert.equal(b.persona.touch('choi').text,undefined);assert.equal(store.get('business'),'unchanged');
 const saved=JSON.parse(store.get(api.PERSONA_MEMORY_KEY));assert.equal(saved.choi.visits,11);assert.deepEqual(Object.keys(saved.choi),['visits']);
});
test('corrupt or denied storage and unknown rooms remain safe',()=>{
 for(const raw of ['broken','null','[]','42']){const {persona}=setup(new Map([[api.PERSONA_MEMORY_KEY,raw]]));assert.ok(persona.enter('fp').text);assert.equal(persona.enter('missing'),null);assert.equal(persona.touch('__proto__'),null);}
 const p=api.createPersona({storage:{getItem(){throw Error('denied')},setItem(){throw Error('full')}}});assert.ok(p.enter('choi').text);
});
test('copy, completion, rest and image changes never generate dialogue or count as touches',()=>{
 const b=setup();b.persona.enter('shiire');const before=b.store.get(api.PERSONA_MEMORY_KEY);for(const event of ['copied','completed','rest','resume','work','special','empty','talk'])assert.equal(b.persona.event('shiire',event),null);assert.equal(b.store.get(api.PERSONA_MEMORY_KEY),before);assert.equal(b.persona.touch('shiire').text,undefined);
});
