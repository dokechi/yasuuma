import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {castleSignals} from '../supabase/functions/command-center-retro-api/castle-signals.mjs';
function fixture(rows, override={}) {
 const calls=[];
 const query={not(){return this},select(...args){calls.push(['select',...args]);return this},order(...args){calls.push(['order',...args]);return this},async range(a,b){calls.push(['range',a,b]);return {data:rows.slice(a,b+1),count:rows.length,error:null,...override}}};
 return {admin:{from(name){calls.push(['from',name]);return query}},calls};
}
test('read all 201 records without the old 100-record cap',async()=>{
 const f=fixture(Array.from({length:201},(_,id)=>({id}))),rows=[];let offset=0;
 do{const page=await castleSignals(f.admin,new URLSearchParams({offset:String(offset)}));rows.push(...page.rows);offset=page.nextOffset;}while(offset!==null);
 assert.equal(rows.length,201);assert.equal(new Set(rows.map(x=>x.id)).size,201);
 assert.deepEqual(f.calls.filter(x=>x[0]==='range'),[['range',0,99],['range',100,199],['range',200,299]]);
 assert.ok(f.calls.filter(x=>x[0]==='order').every(x=>x[1]==='id'));
});
test('bad paging inputs are bounded and errors cannot claim a complete read',async()=>{
 const f=fixture([]);assert.equal((await castleSignals(f.admin,new URLSearchParams('offset=-1&limit=1000'))).nextOffset,null);assert.deepEqual(f.calls.at(-1),['range',0,99]);
 for(const override of [{error:Error('offline')},{count:null},{data:[],count:2}])await assert.rejects(castleSignals(fixture([],override).admin,new URLSearchParams()));
});
test('castle signal route stays behind existing authentication and GET-only dispatch',()=>{
 const code=fs.readFileSync(new URL('../supabase/functions/command-center-retro-api/index.ts',import.meta.url),'utf8');
 const route=code.indexOf('if(resource==="castle-signals")');
 assert.ok(route>code.indexOf('if(req.method!=="GET")'));assert.ok(route>code.indexOf('await auth(req)'));
 assert.match(code.slice(route,route+330),/castleSignals\(admin,u.searchParams\)/);
});
