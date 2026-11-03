/* Detail regressions use synthetic text and an isolated DOM only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readingSegments,paperReadStatus} from '../command-center-98/lounge/paper-detail-model.js';
import {mountPaperStage} from '../command-center-98/lounge/paper-stage.js';
const {JSDOM}=createRequire(import.meta.url)('jsdom');
const availableLoading='取得済み原稿を表示中 · 最新の原稿・履歴・仕入れを読み込み中…';
const emptyLoading='保存原稿を読み込み中…';
const tick=()=>new Promise(resolve=>setImmediate(resolve));

for(const text of [
 '', '左右の目でも手術給付は1回の例', '年払いの残りは契約日で返金が違う',
 '80歳と90歳で払込総額が逆転', '月1680円と3329円。年5220円差',
 '  本文の空白\n\nを保つ\t\r\n末尾  ', '<img src=x onerror=alert(1)> & 「安全な本文」',
 '🧑‍💻と𠮷野家、ＡＢＣ。1回、２回、0.5回、1,680円',
 '長'.repeat(200), '12345678901234567890円',
])test('reading segments preserve exact original text: '+JSON.stringify(text.slice(0,40)),()=>{
 const segments=readingSegments(text);
 assert.ok(Array.isArray(segments));
 assert.equal(segments.map(segment=>segment.text).join(''),text);
 for(const segment of segments){assert.equal(typeof segment.text,'string');assert.equal(typeof segment.keepTogether,'boolean');}
});

for(const token of ['1回','契約日','払込総額','80歳','90歳'])test(token+' is one unbroken presentation token without changing source characters',()=>{
 const segments=readingSegments('確認：'+token+'を読む。');
 assert.ok(segments.some(segment=>segment.keepTogether&&segment.text===token),JSON.stringify(segments));
});

test('long tokens remain breakable instead of forcing narrow paper overflow',()=>{
 for(const text of ['長'.repeat(200),'12345678901234567890円']){
  const kept=readingSegments(text).filter(segment=>segment.keepTogether);
  assert.ok(kept.every(segment=>segment.text.length<=10),JSON.stringify(kept));
 }
});

test('loading describes available cached/partial papers without claiming a completed total',()=>{
 for(const complete of [false,true,undefined]){
  assert.equal(paperReadStatus({loading:true,complete},{availableCount:27,visibleCount:20,futureOnly:false}),availableLoading);
  assert.equal(paperReadStatus({loading:true,complete},{availableCount:27,visibleCount:0,futureOnly:true}),availableLoading);
 }
 assert.doesNotMatch(availableLoading,/\d+件|完了|ありません/);
});

test('empty loading remains distinct from available content and never fabricates zero results',()=>{
 assert.equal(paperReadStatus({loading:true,complete:false},{availableCount:0,visibleCount:0,futureOnly:false}),emptyLoading);
 assert.notEqual(emptyLoading,availableLoading);
 assert.doesNotMatch(emptyLoading,/0件|ありません|完了/);
});

test('incomplete failed reads preserve their existing uncertainty contract',()=>{
 assert.equal(paperReadStatus({loading:false,complete:false},{availableCount:27,visibleCount:20,futureOnly:false}),'読取未確認 · 保存分を表示。道具から更新できます。');
});

test('only completed reads show the actual filtered count or a genuine empty state',()=>{
 assert.equal(paperReadStatus({loading:false,complete:true},{availableCount:27,visibleCount:27,futureOnly:false}),'27件の保存原稿');
 assert.equal(paperReadStatus({loading:false,complete:true},{availableCount:27,visibleCount:2,futureOnly:true}),'2件の保存原稿 · 今後使う（この端末・現在のログイン）');
 assert.equal(paperReadStatus({loading:false,complete:true},{availableCount:0,visibleCount:0,futureOnly:false}),'このカテゴリに保存原稿はありません。');
 assert.equal(paperReadStatus({loading:false,complete:true},{availableCount:27,visibleCount:0,futureOnly:true}),'このカテゴリに今後使う原稿はありません。');
});

function setup(t,{count=27,loading=false,complete=true,canPin=()=>true}={}){
 const dom=new JSDOM('<body><main><section id="room" data-account="insurance"><article id="desk"><div id="desk-scroll" tabindex="0"><p id="draft-body">唯一のリーダー</p></div></article></section></main></body>',{url:'https://test.invalid',pretendToBeVisual:true});
 const document=dom.window.document;
 const titles=['左右の目でも手術給付は1回の例','年払いの残りは契約日で返金が違う','80歳と90歳で払込総額が逆転'];
 const rows=Array.from({length:count},(_,index)=>({id:'detail-'+index,title:titles[index%titles.length],body:'契約日と払込総額を確かめ、1回ごとの記録を読む。\n\n  空白も変えない本文  '+index,source:{id:'source-'+index,account:'insurance'},place:'kyun'}));
 const source=JSON.stringify(rows),opened=[],pins=new Set(),board={state:{loading,complete},subscribe(fn){fn();return()=>{};}};
 const owner={rows:()=>rows,open:id=>{opened.push(id);return true;},isFuture:id=>pins.has(id),toggleFuture:id=>{pins.has(id)?pins.delete(id):pins.add(id);},persistent:()=>true,canPin};
 const application={getPaperDesk:()=>owner,getAccountBoard:()=>board,openWorkingChapter:key=>{document.getElementById('room').dataset.account=key;return true;}};
 const stage=mountPaperStage({document,application,accounts:[{key:'insurance',name:'保険'}]});
 t.after(()=>{stage.destroy();dom.window.close();});
 return {document,rows,source,opened,board,stage,$:selector=>document.querySelector(selector)};
}

test('the mounted stage presents source-identical live titles and excerpts and separate pin controls',async t=>{
 const s=setup(t);await tick();
 for(const [index,card] of [...s.document.querySelectorAll('.paper-card')].entries()){
  assert.equal(card.querySelector('.paper-title').textContent,s.rows[index].title);
  assert.equal(card.querySelector('.paper-excerpt').textContent,s.rows[index].body.slice(0,index===0?240:105));
  assert.equal(card.querySelector('.paper-open').getAttribute('aria-label'),s.rows[index].title+'をここで開く');
  assert.equal(card.querySelector('.paper-pin').getAttribute('aria-label'),s.rows[index].title+'を今後使う');
 }
 assert.ok(s.$('.paper-word'),'safe line-break formatting must use live spans');
 assert.equal(JSON.stringify(s.rows),s.source);
 s.$('.paper-pin').click();await tick();assert.deepEqual(s.opened,[]);
});

test('mounted available papers stay readable during updates and future filtering does not invent emptiness',async t=>{
 const s=setup(t,{loading:true,complete:false});await tick();
 assert.equal(s.$('.paper-state').textContent,availableLoading);
 assert.equal(s.document.querySelectorAll('.paper-card').length,20);
 s.$('.paper-future').click();
 assert.equal(s.document.querySelectorAll('.paper-card').length,0);
 assert.equal(s.$('.paper-state').textContent,availableLoading);
 assert.equal(JSON.stringify(s.rows),s.source);
 s.board.state={loading:false,complete:true};s.stage.paint();
 assert.equal(s.$('.paper-state').textContent,'このカテゴリに今後使う原稿はありません。');
});

test('mounted empty initial loading has no fake papers or completed zero total',async t=>{
 const s=setup(t,{count:0,loading:true,complete:false});await tick();
 assert.equal(s.document.querySelectorAll('.paper-card').length,0);
 assert.equal(s.$('.paper-state').textContent,emptyLoading);
 s.board.state={loading:false,complete:true};s.stage.paint();
 assert.equal(s.$('.paper-state').textContent,'このカテゴリに保存原稿はありません。');
});

test('formatted titles remain text, never HTML from manuscript content',async t=>{
 const s=setup(t,{count:1});await tick();
 s.rows[0].title='<img src=x onerror=alert(1)> & 契約日';
 s.rows[0].body='<script>throw Error("not markup")</script> 1回';s.stage.paint();
 assert.equal(s.$('.paper-title').textContent,s.rows[0].title);
 assert.equal(s.$('.paper-excerpt').textContent,s.rows[0].body);
 assert.equal(s.$('.paper-title img'),null);assert.equal(s.$('.paper-excerpt script'),null);
});


test('cached identical rows update disabled pins when the trusted owner becomes ready',async t=>{
 let ready=false;const s=setup(t,{count:3,loading:true,complete:false,canPin:()=>ready});await tick();
 assert.ok([...s.document.querySelectorAll('.paper-pin')].every(pin=>pin.disabled));
 ready=true;s.board.state={loading:false,complete:true};s.stage.paint();
 assert.ok([...s.document.querySelectorAll('.paper-pin')].every(pin=>!pin.disabled),'same rows and false future marks must not cache a disabled control');
 assert.ok([...s.document.querySelectorAll('.paper-pin')].every(pin=>pin.title==='今後使う（この端末・現在のログイン）'));
 assert.equal(JSON.stringify(s.rows),s.source);
});

test('an open live reader preserves DOM and focus while pin capability updates in both directions',async t=>{
 let ready=false;const s=setup(t,{count:3,canPin:()=>ready});await tick();s.$('.paper-open').click();
 const host=s.$('.paper-reader'),reader=s.$('#desk'),pin=s.$('.paper-card[data-paper-open=true] .paper-pin'),scroller=s.$('#desk-scroll');
 scroller.focus();const readerText=reader.textContent,style=host.getAttribute('style');
 assert.equal(pin.disabled,true);
 for(const allowed of [true,false]){
  ready=allowed;s.stage.paint();
  assert.equal(s.$('.paper-reader'),host);assert.equal(s.$('#desk'),reader);assert.equal(s.$('.paper-card[data-paper-open=true] .paper-pin'),pin);
  assert.equal(reader.textContent,readerText);assert.equal(host.getAttribute('style'),style);assert.equal(s.document.activeElement,scroller);
  assert.equal(pin.disabled,!allowed,'open pin capability follows its existing owner without replacing the reader');
  assert.equal(pin.title,allowed?'今後使う（この端末・現在のログイン）':'ログイン中の本体から利用できます');
 }
 assert.equal(JSON.stringify(s.rows),s.source);
});

test('revoking pin capability updates identical closed source papers immediately',async t=>{
 let ready=true;const s=setup(t,{count:3,canPin:()=>ready});await tick();
 assert.ok([...s.document.querySelectorAll('.paper-pin')].every(pin=>!pin.disabled));
 ready=false;s.stage.paint();
 assert.ok([...s.document.querySelectorAll('.paper-pin')].every(pin=>pin.disabled),'same-signature rendering must also disable controls when the owner does');
 assert.ok([...s.document.querySelectorAll('.paper-pin')].every(pin=>pin.title==='ログイン中の本体から利用できます'));
 assert.equal(JSON.stringify(s.rows),s.source);
});
