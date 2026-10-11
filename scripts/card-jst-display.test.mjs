import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('command-center-98/v142-x-desk.js');
const formatter=source.slice(source.indexOf(' X.deadlineDate='),source.indexOf(' X.recount='));
for(const timezone of ['UTC','Asia/Tokyo','America/Los_Angeles','America/New_York']){
 test('card deadline stays JST when device timezone is '+timezone,()=>{
  const script='const X={};'+formatter+';console.log(JSON.stringify([X.deadlineDate("2026-10-18T14:58:00Z"),X.deadlineDate("2026-10-17T15:00:00Z"),X.deadlineDate(null),X.deadlineDate("invalid")]));';
  const run=spawnSync(process.execPath,['-e',script],{env:{...process.env,TZ:timezone},encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  assert.deepEqual(JSON.parse(run.stdout),['2026/10/18 23:58','2026/10/18 00:00','未確認','未確認']);
 });
}
test('base and overriding card renderer both use shared JST formatter',()=>{
 for(const [file,variable] of [['v142-x-desk.js','x'],['v160-card-publishing.js','item']]){
  const code=read('command-center-98/'+file);
  assert.ok(code.includes('X.deadlineDate('+variable+'.applicationDeadline)'));
  assert.ok(!code.includes('fmtDate('+variable+'.applicationDeadline)'));
 }
});
