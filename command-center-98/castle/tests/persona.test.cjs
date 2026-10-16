const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=['persona-lines','persona'].map(n=>fs.readFileSync(n+'.js','utf8').replace(/^import .*$/gm,'').replaceAll('export ','')).join('\n');
const api=vm.runInNewContext(source+'\n;({createPersona,PERSONA_QUOTES,PERSONA_LINES,PERSONA_MEMORY_KEY});');
function setup(store=new Map(),random=()=>0){let time=0;return {store,persona:api.createPersona({storage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},random,now:()=>time}),advance:ms=>time+=ms};}
test('four attributed casts replace the old authored dialogue, including Ayase',()=>{
 assert.deepEqual(Object.values(api.PERSONA_QUOTES).map(c=>c.name),['加藤恵','一色いろは','新垣あやせ','アスナ']);
 assert.doesNotMatch(source,/霞ヶ丘|詩羽/);
 for(const cast of Object.values(api.PERSONA_QUOTES))for(const q of cast.quotes){assert.ok(q.text.length>0&&q.text.length<60);assert.match(q.url,/^https:\/\//);assert.ok(q.context&&q.source&&q.kind);}
 assert.equal(Object.values(api.PERSONA_QUOTES).flatMap(c=>c.quotes).length,12);
});
test('each cast cycles without adjacent repeats and never edits source wording',()=>{
 for(const key of Object.keys(api.PERSONA_QUOTES)){
  const {persona}=setup(),seen=[];for(let i=0;i<15;i++){const q=i?persona.event(key,'talk'):persona.enter(key);seen.push(q.id);assert.ok(api.PERSONA_QUOTES[key].quotes.some(original=>original.text===q.text&&original.url===q.url));if(i)assert.notEqual(seen[i],seen[i-1]);if(i>=2)assert.equal(new Set(seen.slice(i-2)).size,3);}
 }
});
test('reload remembers quote order, discards old generated IDs and leaves business storage intact',()=>{
 const store=new Map([['business','unchanged'],[api.PERSONA_MEMORY_KEY,JSON.stringify({choi:{visits:9,recent:['welcome:1','story:2','quote:0','quote:99']}})]]);
 const a=setup(store),first=a.persona.enter('choi');assert.notEqual(first.id,'quote:0');const b=setup(store),next=b.persona.enter('choi');assert.notEqual(first.id,next.id);assert.equal(store.get('business'),'unchanged');
 const saved=JSON.parse(store.get(api.PERSONA_MEMORY_KEY));assert.equal(saved.choi.visits,11);assert.ok(saved.choi.recent.every(s=>/^quote:[012]$/.test(s)));
});
test('corrupt or denied storage, invalid randomness and unknown rooms stay usable',()=>{
 for(const raw of ['broken','null','[]','42']){const {persona}=setup(new Map([[api.PERSONA_MEMORY_KEY,raw]]),()=>NaN);assert.ok(persona.enter('fp').text);assert.equal(persona.enter('missing'),null);assert.equal(persona.event('__proto__','talk'),null);}
 const p=api.createPersona({storage:{getItem(){throw Error('denied')},setItem(){throw Error('full')}}});assert.ok(p.enter('choi').text);
});
test('fast duplicate taps are ignored while later taps continue the quotation cycle',()=>{
 const b=setup();b.persona.enter('kyun');const first=b.persona.touch('kyun');b.advance(319);assert.equal(b.persona.touch('kyun'),null);b.advance(1);assert.notEqual(b.persona.touch('kyun').id,first.id);b.persona.leave('kyun');assert.ok(b.persona.touch('kyun'));
});
test('copy, completion, rest and image changes cannot fabricate character dialogue or consume quotes',()=>{
 const b=setup();b.persona.enter('shiire');const before=b.store.get(api.PERSONA_MEMORY_KEY);for(const event of ['copied','completed','rest','resume','work','special','empty'])assert.equal(b.persona.event('shiire',event),null);assert.equal(b.store.get(api.PERSONA_MEMORY_KEY),before);
});
