import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
// Execute the exact owner function, including its closed-over read state.
const source=readFileSync(new URL('../command-center-98/lounge/desk.js',import.meta.url),'utf8');
const body=source.slice(source.indexOf(' function emptyText(){'),source.indexOf(' function renderReader'));
const text=state=>runInNewContext(body+';emptyText()', {embedded:true,connected:true,query:'',filter:'all',loading:false,complete:true,recordsAccepted:true,sourceIssue:'',place:'kyun',...state});
test('filtered loading and incomplete reads never claim a complete empty collection',()=>{
 for(const state of [{query:'保険'},{filter:'pin'},{filter:'done'},{}]){
  assert.match(text({...state,loading:true}),/読み込んでいます/);
  for(const incomplete of [{complete:false},{recordsAccepted:false},{sourceIssue:'形式不正'}]){
   const message=text({...state,...incomplete});assert.match(message,/取得済みの範囲/);assert.match(message,/原稿なしとは確定できません/);assert.match(message,/更新/);
  }
 }
});
test('successful complete empty reads distinguish active filters from whole-account emptiness',()=>{
 assert.match(text({}),/読取が完了しました/);
 assert.match(text({query:'保険'}),/この条件に合うものはありません/);
 assert.match(text({filter:'pin'}),/この条件に合うものはありません/);
 assert.match(text({place:'shiire'}),/購入・在庫・売却/);
 assert.match(text({embedded:false,connected:false}),/本体から開くと/);
});
