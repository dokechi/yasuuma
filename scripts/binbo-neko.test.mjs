import {test} from 'node:test';import assert from 'node:assert/strict';
import {fixture,review} from './binbo-neko-fixture.mjs';
import {sourceIssues,contentIssues,revisionOf,contentRevisionOf,stateOf,productionPacket} from '../supabase/functions/shared/binbo-neko.mjs';
test('Only declined candidates qualify; holds, purchased goods and REEF are excluded',()=>{
 const j=fixture(),r=review();assert.deepEqual(sourceIssues(j,[r],[]),[]);
 for(const verdict of ['close','new',''])assert.ok(sourceIssues(j,[{...r,verdict}],[]).length);
 assert.ok(sourceIssues(j,[r],[{sku:'ABC123',status:'purchased'}]).length);
 assert.ok(sourceIssues({...j,product:{...j.product,brand:'REEF'}},[r],[]).length);
 assert.deepEqual(r,review());
});
test('Fresh confirmed variant and full payable price are required; unknowns fail closed',()=>{
 const j=fixture();assert.deepEqual(contentIssues(j),[]);
 for(const change of [{checked_at:'2026-01-01T00:00:00Z'},{payable_yen:1980},{stock:{status:'available',variant_confirmed:false}},{stock:{status:'sold_out',variant_confirmed:true,evidence:'sold out'}}])assert.ok(contentIssues({...j,offer:{...j.offer,...change}}).length);
 assert.ok(contentIssues({...j,affiliate:null}).length);
 j.copy.pages[0].body='送料込み1,980円';assert.ok(contentIssues(j).some(x=>x.includes('送料込み')));
 j.copy.pages[0].body='送料込み1,650円';assert.ok(contentIssues(j).some(x=>x.includes('金額')));
});
test('Unverified discounts, false experience and unsupported scarcity are blocked',()=>{
 const j=fixture();j.copy.title='70%OFF';assert.ok(contentIssues(j).some(x=>x.includes('比較')));
 j.copy.title='買ってよかった';assert.ok(contentIssues(j).some(x=>x.includes('体験')));
 j.copy.title='最安・今だけ';j.evidence.push({claim:'最安',url:'https://example.com/compare',checked_at:new Date().toISOString(),strong_claim_verified:true});assert.ok(contentIssues(j).some(x=>x.includes('今だけ')));
});
test('Date-only revalidation preserves copied state; changed conditions require new copy',async()=>{
 const j=fixture();j.revision=await revisionOf(j);j.content_revision=await contentRevisionOf(j);const r={copied_revision:j.revision,copied_content_revision:j.content_revision};
 const next={...j,offer:{...j.offer,checked_at:new Date(Date.now()+1000).toISOString()}};delete next.revision;delete next.content_revision;next.revision=await revisionOf(next);next.content_revision=await contentRevisionOf(next);
 assert.equal(stateOf(next,r,[]).key,'copied');next.offer.price_yen=2000;next.offer.payable_yen=2770;next.content_revision=await contentRevisionOf(next);assert.equal(stateOf(next,r,[]).key,'ready');
 assert.equal(stateOf(next,r,['stale']).key,'waiting');assert.equal(stateOf(next,{state:'skipped'},[]).key,'skipped');assert.equal(stateOf(next,{recheck_requested_at:new Date(Date.now()+5000).toISOString()},[]).key,'waiting');
});
test('One packet contains all factual copy and finishing/QA instructions, with manual publishing',()=>{
 const j=fixture(),p=productionPacket(j);for(const text of [j.id,j.source_id,j.offer.url,'Threads','TikTok','清書','検品','1枚ずつ','商品写真','投稿前','利用者が手動'])assert.ok(p.includes(text),text);
 assert.ok(p.includes('"reason": null'));assert.ok(!p.includes('https://affiliate.example/'));
});
