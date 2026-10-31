import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeLivingRooms} from '../command-center-98/lounge/living-room-model.js';
import {createNotebook} from '../command-center-98/lounge/notebook.js';
import {seenRevision,revision} from '../command-center-98/lounge/qol-model.js';
import {holdsActiveText} from '../command-center-98/lounge/desk-model.js';

const now = Date.parse('2026-11-01T00:30:00+09:00');
const earlier = Date.parse('2026-10-31T23:59:00+09:00');
const row = (id='insurance-one',overrides={}) => ({id,place:'kyun',title:'保険の保存原稿',
  body:'本文は外部に渡さない秘密の原稿。',kind:'A案',createdAt:1,updatedAt:2,
  source:{account:'insurance',id:'source-one'},...overrides});
const by = (snapshot,key='insurance') => snapshot.rooms.find(room => room.key===key);
function fixture(rows=[],{seen={},pins=[],done=[],prefs={}}={}) {
  const calls=[];
  return {calls,all:()=>rows,completed:place=>done.filter(d=>d.place===place),flag:(type,id)=>type==='pin'&&pins.includes(id),
    pref:(key,fallback)=>key==='seenRevisions'?seen:Object.hasOwn(prefs,key)?prefs[key]:fallback,
    setPref:()=>{calls.push('write');throw Error('unexpected write');},toggle:()=>{calls.push('toggle');throw Error('unexpected toggle');},
    copied:()=>{calls.push('copy');throw Error('unexpected copy');}};
}
const summarize = (notebook,options={}) => summarizeLivingRooms({notebook,now,...options});
const ready = (notebook,options={}) => summarize(notebook,{connected:true,complete:true,...options});

test('unknown, loading and failed reads never invent an empty remote total or a finished state',()=>{
  const notebook=fixture();
  for(const options of [{},{loading:true},{connected:true},{connected:true,message:'読取に失敗しました'}]) {
    const snapshot=summarize(notebook,options), room=by(snapshot);
    assert.equal(snapshot.complete,false);assert.equal(room.totalCount,null);assert.equal(room.loadedCount,0);
    assert.match(room.scopeNote,/全体は未確認/);assert.doesNotMatch(room.labels.notice,/未読・更新なし/);
    assert.equal(room.light,'waiting');
  }
  assert.equal(summarize(notebook,{loading:true}).state,'loading');
  assert.equal(summarize(notebook,{message:'読取に失敗しました'}).state,'attention');
  assert.equal(summarize(notebook,{complete:true}).complete,false,'a disconnected complete flag alone is not a confirmed read');
});

test('a completed empty read can say zero, but only for this read of saved manuscripts',()=>{
  const snapshot=ready(fixture()),room=by(snapshot);
  assert.equal(snapshot.state,'ready');assert.equal(room.loadedCount,0);assert.equal(room.totalCount,0);
  assert.equal(room.light,'quiet');assert.match(room.notice,/今回の読取/);assert.match(room.scopeNote,/今回読み込んだ/);
  assert.doesNotMatch(JSON.stringify(snapshot),/全作業完了|投稿完了|全件投稿済み/);
});

test('partial and refresh-failure snapshots retain available drafts with explicit limited scope',()=>{
  const a=row(),notebook=fixture([a]);
  for(const options of [{loading:true,complete:true},{message:'保存先を読めません。再試行してください'},{connected:true}]){
    const room=by(summarize(notebook,options));
    assert.equal(room.loadedCount,1);assert.equal(room.totalCount,null);assert.equal(room.unreadCount,1);
    assert.match(room.labels.shelf,/利用できる保存原稿 1本/);assert.match(room.labels.notice,/保存分/);
    assert.equal(room.light,'notice','available unseen work may be lit without claiming a complete read');
  }
});

test('variants group by explicit source and account; same titles and cross-account source IDs never merge',()=>{
  const rows=[row('a'),row('b',{kind:'B案'}),row('other',{source:{account:'insurance',id:'source-two'}}),
    row('deal',{place:'otoku',source:{account:'otoku',id:'source-one'}}),
    row('wrong-room',{place:'kyun',source:{account:'otoku',id:'source-one'}}),
    row('old',{place:'choi',source:{account:'choi',id:'source-one'}}),
    row('unknown',{source:{account:'insurance',id:'undefined'}}),row('unbound',{source:null})];
  const snapshot=ready(fixture(rows));
  assert.equal(by(snapshot).loadedCount,2);assert.equal(by(snapshot).unreadCount,2);
  assert.equal(by(snapshot,'otoku').loadedCount,1);assert.equal(by(snapshot,'rakuten').loadedCount,0);
  assert.equal(snapshot.rooms.length,5);assert.deepEqual(by(snapshot).drafts.map(d=>d.source.account),['insurance','insurance']);
});

test('seen revisions distinguish new text, title, links and variant changes without using timestamps',()=>{
  const a=row('a'),b=row('b',{kind:'B案'});
  const seen={a:seenRevision(a),b:seenRevision(b)};
  assert.equal(by(ready(fixture([a,b],{seen}))).unreadCount,0);
  assert.equal(by(ready(fixture([{...a,updatedAt:now+1000},b],{seen}))).unreadCount,0,'fetch timestamps are not arrivals');
  for(const update of [{body:a.body+'更新'},{title:'更新された題名'},{link:'https://example.test/source'},{kind:'修正版'}]){
    const room=by(ready(fixture([{...a,...update},b],{seen})));
    assert.equal(room.unreadCount,1);assert.equal(room.unreadDrafts[0].id,'a');assert.equal(room.light,'notice');
  }
});

test('favorite and unseen lists each select a qualifying exact-source representative and prefer active variant',()=>{
  const a=row('a'),b=row('b',{kind:'B案'}),c=row('c',{source:{account:'insurance',id:'source-two'}});
  const notebook=fixture([a,b,c],{pins:['a','b'],seen:{a:seenRevision(a)}});
  const room=by(ready(notebook,{place:'kyun',active:b}));
  assert.equal(room.favoriteCount,1);assert.equal(room.favoriteDrafts[0].id,'b');
  assert.deepEqual(room.unreadDrafts.map(d=>d.id),['b','c']);
  assert.equal(room.drafts[0].id,'b');assert.equal(room.current.id,'b');assert.equal(room.current.source.id,'source-one');
  assert.equal(room.favoriteDrafts[0].pinned,true);assert.equal(room.unreadDrafts[0].unread,true);
  assert.equal(by(ready(notebook,{place:'otoku',active:b})).current,null,'wrong current room cannot claim the active draft');
  assert.equal(by(ready(notebook,{place:'kyun',active:{...b,source:{account:'insurance',id:'different'}}})).current,null);
});

test('favorite representative never becomes an unpinned active variant',()=>{
  const a=row('a'),b=row('b',{kind:'B案'});
  const room=by(ready(fixture([a,b],{pins:['a']}),{place:'kyun',active:b}));
  assert.equal(room.drafts[0].id,'b');assert.equal(room.favoriteDrafts[0].id,'a');
});

test('held updates are reported only for a real changed current manuscript and never applied',()=>{
  const a=row(),notebook=fixture([a]);
  const changed={...a,body:a.body+'届いた更新'};
  const pending={drafts:[changed],complete:true};
  const before=JSON.stringify({a,pending});
  const snapshot=ready(notebook,{place:'kyun',active:a,pending});
  assert.equal(by(snapshot).pendingUpdate,true);assert.match(by(snapshot).notice,/本文はまだ置き換えていません/);
  assert.equal(snapshot.provisional,true);assert.equal(snapshot.complete,false);
  for(const room of snapshot.rooms)assert.equal(room.totalCount,null,'held payload makes cached aggregates provisional');
  assert.match(by(snapshot).scopeNote,/全体は未確認/);
  for(const key of ['otoku','rakuten','lottery','sourcing'])assert.equal(by(snapshot,key).pendingUpdate,false);
  assert.equal(by(ready(notebook,{place:'kyun',active:a,pending:{drafts:[a],complete:true}})).pendingUpdate,false);
  assert.equal(by(ready(notebook,{place:'kyun',active:a,pending:{drafts:[],complete:false}})).pendingUpdate,false);
  assert.equal(by(ready(notebook,{place:'kyun',active:a,pending:{drafts:[],complete:true}})).pendingUpdate,true,'confirmed removal is a held change');
  assert.equal(by(ready(notebook,{pending})).pendingUpdate,false);
  assert.equal(JSON.stringify({a,pending}),before);assert.deepEqual(notebook.calls,[]);
});

test('local read markers must match the current title and body; variants are not double-counted',()=>{
  const a=row('a'),b=row('b',{kind:'B案'}),c=row('c',{source:{account:'insurance',id:'source-two'}});
  const done=[{...a,time:now},{...b,time:now},{...c,body:'以前の本文',time:now}];
  const room=by(ready(fixture([a,b,c],{done})));
  assert.equal(room.readCount,1);assert.equal(room.todayReadCount,1);assert.match(room.labels.read,/この端末の読了メモ 1本/);
  const changed=by(ready(fixture([{...a,title:'新しい題名'}],{done})));
  assert.equal(changed.readCount,0);
});

test('posting is only an exact current revision local memo; copy events and source status do not make it posted',()=>{
  const a=row('a',{source:{account:'insurance',id:'source-one',status:'投稿済み'}});
  const notebook=fixture([a]);notebook.copies=()=>[{draftId:a.id,kind:'body',text:a.body,time:now}];
  let room=by(ready(notebook));assert.equal(room.postedCount,0);assert.equal(room.todayPostedCount,0);
  room=by(ready(fixture([a],{prefs:{'posted:a':{revision:revision(a),time:now}}})));
  assert.equal(room.postedCount,1);assert.equal(room.todayPostedCount,1);assert.match(room.labels.posted,/この端末の投稿済みメモ/);
  room=by(ready(fixture([{...a,body:'新しい本文'}],{prefs:{'posted:a':{revision:revision(a),time:now}}})));
  assert.equal(room.postedCount,0,'a stale posted revision is not carried onto new text');
});

test('today means Japan local day of actual marks, never a normalized manuscript timestamp',()=>{
  const a=row('a',{createdAt:now,updatedAt:now});
  const notebook=fixture([a],{done:[{...a,time:earlier}],prefs:{'posted:a':{revision:revision(a),time:earlier}}});
  const room=by(ready(notebook));
  assert.equal(room.readCount,1);assert.equal(room.postedCount,1);assert.equal(room.todayReadCount,0);assert.equal(room.todayPostedCount,0);
  assert.doesNotMatch(room.briefing,/今日届|新着/);
  const legacy=by(ready(fixture([a],{done:[{...a,time:null,legacy:true}]})));
  assert.equal(legacy.readCount,1);assert.equal(legacy.todayReadCount,0);
});

test('malformed optional preferences and invalid mark dates do not throw or fabricate positive counts',()=>{
  const a=row('a');
  for(const seen of [null,[],7,'invalid',Object.create({a:seenRevision(a)})]){
    const room=by(ready(fixture([a],{seen,prefs:{'posted:a':{revision:revision(a),time:Number.MAX_VALUE}}})));
    assert.equal(room.unreadCount,1);assert.equal(room.postedCount,0);
  }
  for(const value of [null,[],true,'done'])assert.equal(by(ready(fixture([a],{prefs:{'posted:a':value}}))).postedCount,0);
  assert.equal(by(summarizeLivingRooms()).totalCount,null);
  assert.equal(by(ready(fixture([a]),{now:NaN})).todayReadCount,0);
});

test('external notes disclose their stale local scope without pretending the current cache was synced',()=>{
  const a=row(),notebook=fixture([a],{seen:{[a.id]:seenRevision(a)}});
  const room=by(ready(notebook,{externalNotes:true}));
  assert.match(room.notice,/別の画面/);assert.match(room.notice,/入り直すと反映/);
  assert.equal(room.pendingUpdate,false);assert.deepEqual(notebook.calls,[]);
});

test('native sourcing status stays uncounted even when sourcing records and local marks exist',()=>{
  const sourcing=row('source',{place:'shiire',source:{account:'sourcing',id:'1'}});
  const room=by(ready(fixture([sourcing],{pins:['source'],done:[{...sourcing,time:now}]})),'sourcing');
  for(const key of ['loadedCount','totalCount','unreadCount','favoriteCount','readCount','postedCount','todayReadCount','todayPostedCount'])assert.equal(room[key],null,key);
  assert.equal(room.state,'unknown');assert.match(room.notice,/未集計/);assert.equal(room.light,'quiet');
});

test('snapshots are deeply immutable, contain no manuscript body or source object references, and never write',()=>{
  const a=row(),notebook=fixture([a],{pins:[a.id]});
  const snapshot=ready(notebook,{place:'kyun',active:a});
  assert.ok(Object.isFrozen(snapshot));assert.ok(Object.isFrozen(snapshot.rooms));
  assert.ok(Object.isFrozen(by(snapshot).drafts[0].source));
  assert.throws(()=>{by(snapshot).drafts[0].title='changed';},TypeError);
  assert.doesNotMatch(JSON.stringify(snapshot),/秘密の原稿/);
  assert.notEqual(by(snapshot).current.source,a.source);assert.equal(a.title,'保険の保存原稿');
  assert.deepEqual(notebook.calls,[]);
});

test('real notebook works without localStorage; adapter does not create or mutate any records',()=>{
  const notebook=createNotebook({seeds:{kyun:[],otoku:[],rakuten:[],lottery:[],shiire:[]},now:()=>now});
  notebook.replaceSources([row()]);notebook.toggle('pin','insurance-one');
  const before=notebook.export(),prefs=notebook.pref('seenRevisions',null);
  const room=by(ready(notebook));assert.equal(room.loadedCount,1);assert.equal(room.favoriteCount,1);
  assert.equal(notebook.export(),before);assert.equal(notebook.pref('seenRevisions',null),prefs);
  assert.equal(ready(notebook).persistent,false);assert.match(room.scopeNote,/この画面内だけ/);
});

test('current foreground metadata uses its own text revision, not newer or older cached marks',()=>{
  const a=row('a');
  const notebook=fixture([a],{seen:{a:seenRevision(a)},done:[{...a,time:now}],prefs:{'posted:a':{revision:revision(a),time:now}}});
  const room=by(ready(notebook,{place:'kyun',active:{...a,body:a.body+'手元の編集'}}));
  assert.equal(room.current.id,'a');assert.equal(room.current.read,false);assert.equal(room.current.posted,false);assert.equal(room.current.unread,true);
  assert.equal(room.readCount,1,'aggregate remains explicitly about saved records');
});


test('raw host posting defaults and normalized notebook assets are semantically equal',()=>{
  const incoming=row('active',{posting:{main:'保存本文',reply:''}});
  const notebook=createNotebook({seeds:{kyun:[]},now:()=>now});notebook.replaceSources([incoming]);
  const active=notebook.get(incoming.id),before=JSON.stringify({active,incoming});
  assert.deepEqual(active.posting,{images:[],main:'保存本文',reply:''});
  assert.equal(holdsActiveText(active,[incoming],true),false);
  assert.equal(holdsActiveText({...active,posting:undefined},[{...incoming,posting:{images:[],reply:''}}],true),false);
  assert.equal(holdsActiveText({...active,posting:{images:[]}},[{...incoming,posting:{reply:''}}],true),false);
  assert.equal(JSON.stringify({active,incoming}),before);
});

test('supported product links compare by normalized key and URL, not incoming order or labels',()=>{
  const active=row('active',{productLinks:[{key:'yahoo',url:'https://store.shopping.yahoo.co.jp/shop/item.html',label:'保存ページ'},{key:'official',url:'https://example.test/',label:'公式'},{key:'affiliate',url:''}]});
  const next={...active,productLinks:[{key:'official',url:'https://example.test',label:'別の表示名'},{key:'yahoo',url:'https://store.shopping.yahoo.co.jp/shop/item.html'}]};
  const before=JSON.stringify({active,next});
  assert.equal(holdsActiveText(active,[next],true),false);
  assert.equal(holdsActiveText({...active,productLinks:undefined},[{...active,productLinks:[]}],true),false);
  assert.equal(holdsActiveText(active,[{...next,productLinks:[...next.productLinks,{key:'affiliate',url:'https://example.test/revenue'}]}],true),true);
  assert.equal(JSON.stringify({active,next}),before);
});

test('real posting text, ordered images, asset identity and source status still hold the current paper',()=>{
  const image={url:'https://example.test/image.png',label:'一枚目',assetKey:'threads:12:'+ 'a'.repeat(64)};
  const active=row('active',{link:'https://example.test/reference',posting:{main:'本文',reply:'返信',images:[image,{url:'https://example.test/two.png',label:'二枚目'}]},source:{account:'insurance',id:'source-one',status:'確認用下書き'}});
  const changes=[
    {posting:{...active.posting,main:'新しい本文'}},{posting:{...active.posting,reply:'新しい返信'}},
    {posting:{...active.posting,images:[]}},{posting:{...active.posting,images:[...active.posting.images].reverse()}},
    {posting:{...active.posting,images:[{...image,assetKey:'threads:12:'+'b'.repeat(64)},active.posting.images[1]]}},
    {source:{...active.source,status:'保存済みの別状態'}},{link:'https://example.test/other'},
    {title:'別の見出し'},{body:'別の本文'},{kind:'別の本文種別'},{checkedAt:'別の確認日'}
  ];
  for(const change of changes)assert.equal(holdsActiveText(active,[{...active,...change}],true),true,JSON.stringify(change));
});

test('canonical comparison keeps complete removal protection and does not treat a partial absence as removal',()=>{
  const active=row('active',{posting:{main:'保存本文',reply:''}});
  assert.equal(holdsActiveText(active,[],true),true);
  assert.equal(holdsActiveText(active,[],false),false);
  assert.equal(holdsActiveText({...active,source:null},[],true),false);
  const notebook=createNotebook({seeds:{kyun:[]},now:()=>now});notebook.replaceSources([active]);
  const normalized=notebook.get(active.id);
  const snapshot=ready(notebook,{place:'kyun',active:normalized,pending:{drafts:[active],complete:true}});
  assert.equal(by(snapshot).pendingUpdate,false,'equivalent raw defaults are not a changed manuscript');
});
