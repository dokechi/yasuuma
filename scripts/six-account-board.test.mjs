import test from 'node:test';
import assert from 'node:assert/strict';
import {publishingAccounts,draftsForAccount} from '../command-center-98/lounge/accounts.js';
const rows=['insurance','otoku','rakuten','kyun','unknown'].map((account,i)=>({id:'r'+i,place:account==='insurance'||account==='unknown'?'kyun':account,source:{id:'same-id',account},title:'同じタイトル',body:account,updatedAt:i+1}));
test('ten publishing boxes including the separate Sくん and ガルちゃん accounts',()=>{
 assert.equal(publishingAccounts.length,10);
 assert.equal(publishingAccounts.filter(a=>a.pending).length,0);
 assert.deepEqual(publishingAccounts.slice(0,3).map(a=>a.handle),['@sucker0508','@thats_a_steal0601','@bonya0914']);
 const skun=publishingAccounts.find(a=>a.key==='skun');
 assert.deepEqual([skun.place,skun.name,skun.handle,skun.taskId],['skun','Sくん','@skun.koi','skun-threads-v1']);
 const girlsChannel=publishingAccounts.find(a=>a.key==='girls-channel');
 assert.deepEqual([girlsChannel.place,girlsChannel.name,girlsChannel.handle,girlsChannel.taskId],['girls-channel','ガルちゃん','','girls-channel-threads-v1']);
 const draft={...rows[0],place:'girls-channel',source:{account:'girls-channel'}};
 assert.deepEqual(draftsForAccount([draft],girlsChannel),[draft]);
 assert.deepEqual(draftsForAccount([draft],skun),[]);
});
test('account identity and place must both match; titles and legacy rooms never assign accounts',()=>{for(const a of publishingAccounts.slice(0,3))assert.deepEqual(draftsForAccount(rows,a).map(d=>d.body),[a.key]);for(const a of publishingAccounts.slice(3))assert.deepEqual(draftsForAccount(rows,a),[]);assert.deepEqual(draftsForAccount([{...rows[0],place:'rakuten'}],publishingAccounts[0]),[]);assert.equal(rows.length,5);});
import {timeOfDay} from '../command-center-98/lounge/accounts.js';
test('JST day dusk night boundaries independent of machine timezone',()=>{for(const [iso,expected] of [['2026-10-30T20:59:00Z','night'],['2026-10-30T21:00:00Z','day'],['2026-10-30T06:59:00Z','day'],['2026-10-30T07:00:00Z','dusk'],['2026-10-30T09:59:00Z','dusk'],['2026-10-30T10:00:00Z','night']])assert.equal(timeOfDay(new Date(iso)),expected);});

import {readFileSync} from 'node:fs';
test('account list layout grows horizontally instead of wrapping new identities into a second row',()=>{
 const css=readFileSync(new URL('../command-center-98/lounge/accounts.css',import.meta.url),'utf8');
 assert.match(css,/grid-auto-flow:column/);
 assert.match(css,/grid-auto-columns:minmax\(250px,1fr\)/);
 assert.match(css,/grid-auto-columns:minmax\(270px,1fr\)/);
 assert.doesNotMatch(css,/grid-template-columns:repeat\(6/);
});
