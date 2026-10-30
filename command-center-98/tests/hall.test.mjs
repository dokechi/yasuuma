import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalURL,productMatch,priceChange,normalizePurchases,normalizeResearch,rememberResearch,mergeIndex,searchRows,relatedRecords} from '../lounge/hall-model.js';
import {workMarks} from '../lounge/work-memory.js';
import {createNotebook} from '../lounge/notebook.js';
import {revision} from '../lounge/qol-model.js';
test('product matching removes trackers while retaining variant queries and never merges by title',()=>{
 const a={title:'同じ商品',url:'https://shop.example/p?size=L&utm_source=test',product:{variant:'L'}};
 assert.equal(canonicalURL(a.url),'https://shop.example/p?size=L');assert.notEqual(canonicalURL('https://example.com/p?variant=red/'),canonicalURL('https://example.com/p?variant=red'));
 assert.equal(productMatch(a,{...a,url:'https://shop.example/p?size=M',product:{variant:'M'}}),null);
 assert.equal(productMatch(a,{title:a.title,url:'https://other.example/p'}),null);
 assert.equal(productMatch(a,{...a,url:'https://shop.example/p?utm_medium=social&size=L'}).exact,true);
 assert.equal(productMatch(a,{url:a.url}).exact,false);
 assert.equal(productMatch({product:{sku:'ABC',variant:'L'}},{product:{sku:'ABC',variant:'L'}}),null);
});
test('price changes require matching variants and the same price basis; unknown prices are never zero',()=>{
 const a={url:'https://example.com/p',product:{variant:'L'},price:2000,priceBasis:'saved-buy'};
 assert.equal(priceChange(a,{...a,price:3000}),-1000);
 assert.equal(priceChange(a,{...a,price:3000,priceBasis:'ledger-net-unit'}),null);
 assert.equal(priceChange(a,{...a,price:null}),null);
 assert.equal(priceChange(a,{...a,product:{}}),null);
});
test('remote normalization preserves useful search fields and excludes credentials, emails and source messages',()=>{
 const purchase=normalizePurchases([{id:'p1',product_name:'確認用の服',supplier_name:'確認用の店',sku:'MODEL-QA-01',variant:'L',quantity:2,unit_price_yen:0,ordered_at:'2026-10-21T01:00:00Z',email:'private@example.com',source_message_id:'mail-private',token:'secret'}])[0];
 assert.equal(purchase.price,0);assert.equal(purchase.native,'sourcing');assert.equal(purchase.section,'purchases');assert.match(purchase.body,/MODEL-QA-01/);assert.doesNotMatch(JSON.stringify(purchase),/secret|private@example|mail-private/);
 const research=normalizeResearch([{id:'r',title:'調査',url:'javascript:bad',reason:'在庫を確認',payload:{buy:null,sku:'ABC',variant:'M',token:'secret'}}])[0];
 assert.equal(research.url,'');assert.equal(research.price,null);assert.doesNotMatch(JSON.stringify(research),/secret/);
});
test('partial reads preserve existing results; failed reads cannot silently erase the index',()=>{
 const old={id:'purchase:p',type:'purchase',place:'shiire',title:'服',body:'保存元帳'},added={id:'research:r',type:'research',place:'shiire',title:'候補',body:'確認'};
 assert.equal(mergeIndex([old],[added]).length,2);assert.deepEqual(mergeIndex([old],[],{complete:false}),[old]);assert.deepEqual(mergeIndex([old],[],{complete:true}),[]);
});
test('search covers copied literal text, SKU and memo; research snapshots keep revisions with dates',()=>{
 const old=normalizeResearch([{id:'a',title:'服',url:'https://example.com/p',occurredAt:'2026-10-20T01:00:00Z',payload:{buy:3000,variant:'L'}}])[0],next={...old,time:old.time+1000,price:2000};
 const stored=rememberResearch(rememberResearch([],[old]),[next,next]);assert.equal(stored.length,2);
 assert.equal(relatedRecords(next,stored).length,1);
 assert.equal(searchRows([{...next,body:'夜に確認する',product:{sku:'MODEL-QA-01'}}],'MODEL-QA-01 夜').length,1);
 assert.equal(searchRows([{...next,type:'copy',body:'改行\n「そのまま」'}],'そのまま',{filter:'copy'}).length,1);
});
test('table keepsakes count explicit completion in Japan and invalidate old posted snapshots',()=>{
 const now=Date.parse('2026-10-21T15:30:00Z'),n=createNotebook({seeds:{kyun:[],choi:[],fp:[],shiire:[]},now:()=>now}),d={id:'a',place:'kyun',source:{id:'a',account:'insurance'},title:'原稿',body:'そのまま',kind:'本文',createdAt:now,updatedAt:now};n.replaceSources([d]);n.copied(d,'body',d.body);assert.equal(workMarks(n,now).length,0);
 n.finish(d);n.setPref('posted:a',{time:now,revision:revision(d)});assert.equal(workMarks(n,now).length,2);assert.equal(workMarks(n,now-86400000).length,0);
 n.replaceSources([{...d,body:'更新'}]);assert.equal(workMarks(n,now).length,1);
});
