import test from 'node:test';
import assert from 'node:assert/strict';
import {publishingAccounts,draftsForAccount} from '../command-center-98/lounge/accounts.js';
const rows=['insurance','otoku','rakuten','kyun','unknown'].map((account,i)=>({id:'r'+i,place:account==='insurance'||account==='unknown'?'kyun':account,source:{id:'same-id',account},title:'同じタイトル',body:account,updatedAt:i+1}));
test('six fixed columns with three explicitly unset slots',()=>{assert.equal(publishingAccounts.length,6);assert.equal(publishingAccounts.filter(a=>a.pending).length,3);assert.deepEqual(publishingAccounts.slice(0,3).map(a=>a.handle),['@sucker0508','@thats_a_steal0601','@bonya0914']);});
test('account identity and place must both match; titles and legacy rooms never assign accounts',()=>{for(const a of publishingAccounts.slice(0,3))assert.deepEqual(draftsForAccount(rows,a).map(d=>d.body),[a.key]);for(const a of publishingAccounts.slice(3))assert.deepEqual(draftsForAccount(rows,a),[]);assert.deepEqual(draftsForAccount([{...rows[0],place:'rakuten'}],publishingAccounts[0]),[]);assert.equal(rows.length,5);});
import {timeOfDay} from '../command-center-98/lounge/accounts.js';
test('JST day dusk night boundaries independent of machine timezone',()=>{for(const [iso,expected] of [['2026-10-30T20:59:00Z','night'],['2026-10-30T21:00:00Z','day'],['2026-10-30T06:59:00Z','day'],['2026-10-30T07:00:00Z','dusk'],['2026-10-30T09:59:00Z','dusk'],['2026-10-30T10:00:00Z','night']])assert.equal(timeOfDay(new Date(iso)),expected);});
