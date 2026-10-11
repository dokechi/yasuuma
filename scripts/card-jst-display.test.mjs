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
 test('JST editor roundtrip and changed input are stable in '+timezone,()=>{
  const script='const X={};'+formatter+';const original="2026-10-18T14:58:12.123Z";const midnight="2026-10-17T15:00:00Z";console.log(JSON.stringify([X.jstInput(original),X.jstIso(X.jstInput(original),original),X.jstIso("2026-10-19T00:00",original),X.jstInput(midnight),X.jstIso("",original)]));';
  const run=spawnSync(process.execPath,['-e',script],{env:{...process.env,TZ:timezone},encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  assert.deepEqual(JSON.parse(run.stdout),['2026-10-18T23:58','2026-10-18T14:58:12.123Z','2026-10-18T15:00:00.000Z','2026-10-18T00:00',null]);
 });
}
test('base and overriding card renderer both use shared JST formatter',()=>{
 for(const [file,variable] of [['v142-x-desk.js','x'],['v160-card-publishing.js','item']]){
  const code=read('command-center-98/'+file);
  assert.ok(code.includes('X.deadlineDate('+variable+'.applicationDeadline)'));
  assert.ok(!code.includes('fmtDate('+variable+'.applicationDeadline)'));
 }
});
test('JST input refuses invalid calendar dates instead of rolling into another day',()=>{
 const script='const X={};'+formatter+';let rejected=0;for(const value of ["2026-02-30T12:00","2026-10-18T24:00","invalid"]){try{X.jstIso(value,null)}catch{rejected++}}console.log(rejected)';
 const run=spawnSync(process.execPath,['-e',script],{encoding:'utf8'});assert.equal(run.status,0);assert.equal(run.stdout.trim(),'3');
});
