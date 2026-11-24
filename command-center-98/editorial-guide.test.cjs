const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const src=fs.readFileSync(__dirname+'/manual-operation-hub.js','utf8');
function node(tag){return {tag,children:[],dataset:{},append(...x){this.children.push(...x)},prepend(...x){this.children.unshift(...x)},setAttribute(){},showModal(){this.open=true}};}
test('account doors show their own policy before draft loading, retain routes, and never publish',()=>{
 const body=node('body'),document={createElement:node,body,head:node('head'),getElementById(){return node('home')}};
 const requests=[],window={document},context={window,URL,localStorage:{getItem(){return ''}},fetch(url,opt){requests.push([url.searchParams.get('taskId'),opt.method]);return new Promise(()=>{});}};
 vm.runInNewContext(src,context);
 const hub=window.CCManualOperationHub;
 for(const [entry,path,guide] of [['kyun','insurance','書類のどこを見るか'],['tanaka','tanaka','家族とお金'],['otoku','otoku','支払額を比較'],['rakuten','rakuten','かごの判断'],['lottery','lottery','条件を確認'],['kensho','kensho','事実でつなぐ'],['manga','manga','一場面を読み返す'],['girls-channel','girls-channel','家事の一手'],['everyday','everyday-words','共通素材'],['skun','skun',null]]){
  assert.equal(hub.openAccount(entry),true);
  const dialog=body.children.at(-1),heading=dialog.children[0].textContent;
  const note=dialog.children.find(n=>n.tag==='details');
  if(guide)assert.ok(note.children[0].textContent.includes(guide));else assert.equal(note,undefined);
  if(['tanaka','manga','girls-channel','everyday'].includes(entry)) assert.equal(dialog.children.filter(n=>n.tag==='a').length,0);
  if(entry==='tanaka')assert.match(heading,/投稿先未登録/);
  assert.equal(requests.at(-1)[0],path+(entry==='everyday'?'-v1':'-threads-v1'));
  assert.equal(requests.at(-1)[1],undefined);
 }
 assert.equal(hub.openAccount('__proto__'),false);
 assert.equal(hub.renderEditorialGuide(document,body,'__proto__'),false);
 assert.doesNotMatch(src.slice(src.indexOf('const editorialGuides'),src.indexOf('const metricLabels')),/https?:|売上額|万円/);
});
