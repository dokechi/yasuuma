import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {HOUSE_CAMPAIGN, copyIssues, contentIssues, deliveryIssues, revisionOf, jobState, renderAll, createBufferPost, httpsUrl} from '../supabase/functions/shared/affiliate-production.mjs';
const fixture=JSON.parse(await readFile(new URL('./affiliate-production-pilot.json',import.meta.url),'utf8'));
const stamp=Date.parse('2026-10-01T12:00:00Z');
const fresh=()=>structuredClone(fixture), camp=()=>structuredClone(HOUSE_CAMPAIGN);
test('Real source-backed draft renders nine ordered pages without placeholders',()=>{
 const j=fresh(),c=camp();assert.deepEqual(copyIssues(j),[]);assert.deepEqual(contentIssues(j,c,stamp),[]);
 const svgs=renderAll(j,c);assert.equal(svgs.length,9);for(let i=0;i<9;i++){assert.match(svgs[i],/width="1080" height="1350"/);assert.ok(svgs[i].includes(`${i+1} / 9`));assert.ok(!svgs[i].includes('girlschannel'))}
});
test('Unknown connections are distinct from incomplete content',async()=>{
 const j=fresh(),c=camp(),first=await jobState(j,c,false,stamp);assert.equal(first.state,'review');assert.equal(first.content_issues.length,0);assert.ok(first.delivery_issues.length>=4);
 j.approval={status:'approved',revision:first.revision};assert.equal((await jobState(j,c,false,stamp)).state,'connection_wait');
});
test('Editing public copy, sources or affiliate link invalidates approval',async()=>{
 const j=fresh(),c=camp(),rev=await revisionOf(j,c);j.approval={status:'approved',revision:rev};j.slides[0].headline+='？';assert.equal((await jobState(j,c,true,stamp)).approved,false);
 const k=fresh();k.approval={status:'approved',revision:await revisionOf(k,c)};c.affiliate_url='https://example.com/approved';assert.equal((await jobState(k,c,true,stamp)).approved,false);
 const m=fresh(),mc=camp();m.approval={status:'approved',revision:await revisionOf(m,mc)};m.sources[0].supports='変更';assert.equal((await jobState(m,mc,true,stamp)).approved,false);
});
test('Stale or nonexistent evidence never becomes ready',()=>{
 const j=fresh(),c=camp();j.sources[0].checked_at='2025-01-01';assert.ok(contentIssues(j,c,stamp).length);j.sources=[];assert.ok(contentIssues(j,c,stamp).some(x=>x.includes('一次情報')));
 const k=fresh();k.demand[1].comment_numbers=[];assert.ok(contentIssues(k,c,stamp).some(x=>x.includes('需要')));
});
test('Production notes, made-up experiences and text overflow stop rendering',()=>{
 const j=fresh();j.caption+=' ガルちゃん';assert.ok(copyIssues(j).length);assert.throws(()=>renderAll(j,camp()));
 const k=fresh();k.slides[0].body='私が建てた家で試した。';assert.ok(copyIssues(k).length);
 const m=fresh();m.slides[0].headline='家'.repeat(100);assert.throws(()=>renderAll(m,camp()));
 const x=fresh();x.slides[1].items[0]='<script>alert(1)</script>';assert.match(renderAll(x,camp())[1],/&lt;script&gt;/);
});
test('Per-post advertiser approval must match the current revision',async()=>{
 const j=fresh(),c={...camp(),media_approval:'approved',media_approval_scope:'per_post',media_approval_note:'approved by advertiser',affiliate_url:'https://example.com/approved',bio_link_confirmed:true,publisher_channel:'channel'};
 assert.ok(deliveryIssues(j,c,true,stamp).some(x=>x.includes('この投稿')));j.advertiser_review={status:'approved',revision:'old',evidence:'actual response'};assert.ok((await jobState(j,c,true,stamp)).delivery_issues.some(x=>x.includes('この投稿')));
 j.advertiser_review.revision=await revisionOf(j,c);assert.equal((await jobState(j,c,true,stamp)).delivery_issues.length,0);
});
test('A scheduled or ambiguous dispatch never reappears as available for approval',async()=>{
 const j=fresh();j.dispatch={status:'scheduled',provider_id:'actual-provider-id'};assert.equal((await jobState(j,camp(),true,stamp)).state,'scheduled');j.dispatch.status='unknown';assert.equal((await jobState(j,camp(),true,stamp)).state,'delivery_check');
});
test('Buffer receives ordered assets and accepts success only with a provider ID',async()=>{
 let count=0,body;const args={token:'test-token',channelId:'test-channel',caption:'PR test',assetUrls:Array.from({length:5},(_,i)=>`https://example.com/${i+1}.png`),dueAt:new Date(Date.now()+600000).toISOString()};
 const post=await createBufferPost({...args,fetcher:async(url,options)=>{count++;assert.equal(url,'https://api.buffer.com');body=JSON.parse(options.body);return new Response(JSON.stringify({data:{createPost:{post:{id:'confirmed',dueAt:args.dueAt}}}}),{status:200})}});assert.equal(post.id,'confirmed');assert.equal(count,1);assert.ok(body.query.indexOf('/1.png')<body.query.indexOf('/5.png'));
 await assert.rejects(createBufferPost({...args,fetcher:async()=>{count++;throw new Error('timeout')}}));assert.equal(count,2);
 await assert.rejects(createBufferPost({...args,fetcher:async()=>new Response(JSON.stringify({data:{createPost:{message:'denied'}}}),{status:200})}));
 assert.equal(httpsUrl('javascript:alert(1)'),false);assert.equal(httpsUrl('https://user:secret@example.com'),false);
});
