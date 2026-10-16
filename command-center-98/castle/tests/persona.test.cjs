const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=['persona-lines','persona'].map(n=>fs.readFileSync(n+'.js','utf8').replace(/^import .*$/gm,'').replaceAll('export ','')).join('\n');
const api=vm.runInNewContext(source+'\n;({createPersona,PERSONA_LINES,PERSONA_MEMORY_KEY});');
const roles=Object.keys(api.PERSONA_LINES);
function setup({store=new Map(),raw,denied=false,time=Date.parse('2026-10-16T04:00:00Z')}={}){
 if(raw!==undefined)store.set(api.PERSONA_MEMORY_KEY,raw);
 const storage={getItem:k=>{if(denied)throw Error('denied');return store.get(k)},setItem:(k,v)=>{if(denied)throw Error('denied');store.set(k,v)}};
 return {p:api.createPersona({storage,random:()=>0,now:()=>time}),store,advance:ms=>time+=ms};
}
test('four distinct voices have complete event pools and no shared stock reply',()=>{
 const all=new Set();for(const role of roles){const bank=api.PERSONA_LINES[role];for(const [event,lines]of Object.entries(bank)){assert.ok(lines.length>=2,role+event);for(const text of lines.flat()){assert.equal(typeof text,'string');assert.ok(text.length>5);assert.ok(!all.has(text),'duplicate '+text);all.add(text);}}}
 assert.equal(roles.length,4);assert.ok(all.size>=250);
});
test('each voice varies within a context, including across reloads, without editing existing data',()=>{
 for(const role of roles){const store=new Map([['castle-production.v1.draft:123','original manuscript'],['session','original session']]);let {p}=setup({store});const seen=new Set();for(let i=0;i<api.PERSONA_LINES[role].touch.length;i++){const reply=p.event(role,'touch');assert.ok(!seen.has(reply.text));seen.add(reply.text);p=setup({store}).p;}assert.equal(store.get('castle-production.v1.draft:123'),'original manuscript');assert.equal(store.get('session'),'original session');assert.equal(store.size,3);}
});
test('arrival uses Japan time once and remembers returns independently for each room',()=>{
 for(const [time,event]of [['2026-10-15T21:00:00Z','morning'],['2026-10-16T04:00:00Z','welcome'],['2026-10-16T14:00:00Z','night']]){const b=setup({time:Date.parse(time)});assert.equal(b.p.enter('kyun').event,event);assert.equal(b.p.enter('choi').event,event);assert.equal(setup({store:b.store}).p.enter('kyun').event,'returning');}
});
test('rapid duplicate activation is ignored; a deliberate burst gets a gentle response',()=>{
 for(const role of roles){const b=setup();assert.ok(b.p.touch(role));b.advance(100);assert.equal(b.p.touch(role),null);b.advance(400);assert.ok(b.p.touch(role));b.advance(500);assert.equal(b.p.touch(role).event,'repeat');b.advance(3000);assert.notEqual(b.p.touch(role).event,'repeat');}
});
test('a two-part thought follows the next touch; another scene or event cancels its continuation',()=>{
 for(const role of roles){const b=setup();for(let i=0;i<3;i++){b.p.touch(role);b.advance(2000);}const first=b.p.touch(role);assert.equal(first.event,'story');b.advance(2000);const next=b.p.touch(role);assert.equal(next.event,'followup');assert.equal(next.text,api.PERSONA_LINES[role].stories[Number(first.id.split(':')[1])][1]);
 for(let i=0;i<3;i++){b.advance(2000);b.p.touch(role);}b.p.event(role,'tea');b.advance(2000);assert.notEqual(b.p.touch(role,{scene:'tea'}).event,'followup');}
});
test('empty work, rest and touched regions use appropriate pools without invented manuscript state',()=>{
 for(const role of roles){const b=setup();assert.equal(b.p.event(role,'resume',{hasDraft:false}).event,'empty');b.p.touch(role);b.advance(2000);assert.equal(b.p.touch(role,{hasDraft:false}).event,'empty');for(const region of ['hair','hand','cloth']){b.advance(2000);assert.equal(b.p.touch(role,{region}).event,region);}assert.equal(b.p.event(role,'rest').event,'rest');}
});
test('bad or unavailable storage still permits conversation and recent history stays bounded',()=>{
 for(const config of [{raw:'{'},{raw:'null'},{raw:'42'},{raw:JSON.stringify({kyun:{visits:'invalid',recent:[null,8,{}]}})},{denied:true}]){const b=setup(config);assert.ok(b.p.enter('kyun').text);assert.ok(b.p.touch('kyun').text);}
 const b=setup();for(let i=0;i<200;i++)b.p.event('kyun','talk');assert.ok(JSON.parse(b.store.get(api.PERSONA_MEMORY_KEY)).kyun.recent.length<=36);assert.equal(b.p.enter('unknown'),null);
});
test('asking to hear more continues the unfinished thought once; expiry, leaving and scene changes cancel it',()=>{
 for(const role of roles){
  const start=()=>{const b=setup();for(let i=0;i<3;i++){b.p.touch(role,{scene:'tea'});b.advance(2000);}const first=b.p.touch(role,{scene:'tea'});assert.equal(first.event,'story');return {b,index:Number(first.id.split(':')[1])};};
  let {b,index}=start();assert.equal(b.p.event(role,'talk',{scene:'tea'}).text,api.PERSONA_LINES[role].stories[index][1]);assert.equal(b.p.event(role,'talk',{scene:'tea'}).event,'talk');
  ({b}=start());b.advance(90001);assert.equal(b.p.event(role,'talk',{scene:'tea'}).event,'talk');
  ({b}=start());assert.equal(b.p.event(role,'talk',{scene:'work'}).event,'talk');
  ({b}=start());b.p.leave(role);assert.equal(b.p.event(role,'talk',{scene:'tea'}).event,'talk');
  ({b}=start());b.p.event(role,'resume');assert.equal(b.p.event(role,'talk',{scene:'tea'}).event,'talk');
 }
});
