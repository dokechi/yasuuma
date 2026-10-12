'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const file=path.join(__dirname,'../command-center-98/manual-operation-hub.js');
const api=require(file);
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.attributes={};this.textContent='';}
 append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}}
 prepend(...nodes){for(const n of nodes)n.parent=this;this.children.unshift(...nodes);}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 setAttribute(k,v){this.attributes[k]=v;}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}
 showModal(){this.open=true;}
 close(){this.open=false;this.onclose?.();}
}
const text=n=>n.textContent+' '+n.children.map(text).join(' ');
const all=(n,tag)=>[...(n.tagName===tag?[n]:[]),...n.children.flatMap(x=>all(x,tag))];
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
const stamp='2026-10-01T00:00:00Z';
function item(eventKey,extra={}){return {id:'task:media:'+eventKey,taskId:'media',eventKey,occurredAt:stamp,payload:{account_name:'キュン拾い',main_post:eventKey},...extra};}
function setup(local,responses){
 const home=new Element('home'),doc={body:new Element('body'),head:new Element('head'),getElementById:id=>id==='commandHome'?home:null,createElement:tag=>new Element(tag)};
 const calls=[],copied=[],root={document:doc,navigator:{clipboard:{writeText:async s=>copied.push(s)}},fetch:async(u,o)=>{calls.push({u:String(u),o});const response=responses.shift();if(response instanceof Error)throw response;return {ok:true,json:async()=>response};}};
 new Function('window','app','API','authHeaders','URL',fs.readFileSync(file,'utf8'))(root,{items:local},'https://example.com/api',()=>({}),URL);
 return {root,doc,calls,copied,open:async()=>{root.CCManualOperationHub.openAccount('kyun');await flush();return doc.body.children.find(n=>n.tagName==='dialog');}};
}
function mercariParsingTests(){
 const url=id=>'https://jp.mercari.com/item/'+id,checked='2026-10-02T09:00:00+09:00';
 const parse=p=>api.savedMercariComparisons({payload:p});
 const base={checked_at_mercari:checked};
 const sources=[url('m10000000001'),{url:url('m10000000002')},{url:url('m10000000001')}];
 const evidence=[
  '- '+url('m10000000001')+' 8,200円販売中、新品未使用。黒M、店は紺L。色違い・1サイズ差。別途6,500円の中古例もあり、最安ではない。',
  '- '+url('m10000000002')+' 7,400円SOLD、室内試着。紺L、同色同サイズ。掲載100日前／更新2日前。成約日は不明。',
  '- 補足 '+url('m10000000003')+' 6,100円SOLD、同型中古・色違い。2026-10-02T09:03:00+09:00追加確認。下振れ例。',
  '- 本人の購入履歴：比較表示に含めない合成の私的記録。'
 ].join('\n');
 const input={...base,sources,comparison_and_private_evidence:evidence},before=JSON.stringify(input),result=parse(input);
 assert.equal(result.length,3);assert.equal(JSON.stringify(input),before,'read-only parser must preserve saved records');
 assert.deepEqual(result.map(x=>[x.url,x.label]),[[url('m10000000001'),'出品中 8,200円'],[url('m10000000002'),'成約 7,400円'],[url('m10000000003'),'成約 6,100円']]);
 assert.equal(result[0].checkedAt,checked);assert.equal(result[2].checkedAt,'2026-10-02T09:03:00+09:00');
 assert.ok(result[0].note.includes('色違い・1サイズ差'));assert.ok(result[1].note.includes('更新2日前'));assert.ok(result[2].note.includes('下振れ例'));assert.ok(!result.some(x=>x.note.includes('本人の購入履歴')));
 const compact='個人現行新品・型番EXAMPLE明記8,300円 m10000000004。個人成約新品タグ付き・同品番7,600円 m10000000005。店より301円安い。一方m10000000006は本文「タグなし未使用品」、成約6,300円（型番なし・同モデルとみられる）で店より1,000円安い下振れ。全成約日不明。';
 const legacy=parse({...base,comparison_and_private_evidence:compact});
 assert.deepEqual(legacy.map(x=>[x.url,x.label]),[[url('m10000000004'),'出品中 8,300円'],[url('m10000000005'),'成約 7,600円'],[url('m10000000006'),'成約 6,300円']]);
 assert.ok(legacy[2].note.includes('型番なし'));assert.ok(legacy[2].note.includes('下振れ'));
 assert.equal(parse({comparison_and_private_evidence:compact}).length,0,'bare IDs require saved Mercari context');
 assert.equal(parse({...base,comparison_and_private_evidence:'m10000000004/m10000000005 成約2,000円。'}).length,0,'multiple bare IDs are ambiguous');
 assert.equal(parse({...base,comparison_and_private_evidence:'比較除外：m10000000004 成約2,000円。'}).length,0);
 assert.equal(parse({...base,sources:[url('m10000000004')],comparison_and_private_evidence:url('m10000000004')+' 2,000円SOLD、主比較から除外。'}).length,0,'excluded source links are not comparisons');
 for(const bad of ['http://jp.mercari.com/item/m10000000001','https://jp.mercari.com.evil.test/item/m10000000001','https://evil.test/?next='+url('m10000000001'),'https://user:pass@jp.mercari.com/item/m10000000001',url('m10000000001')+'?redirect=other',url('m10000000001')+'/extra','javascript:alert(1)','https://jp.mercari.com/search?keyword=test','https://jp.mercari.com/shops/product/example']){
  assert.equal(parse({...base,sources:[bad],comparison_and_private_evidence:bad+' 8,200円販売中'}).length,0,bad);
 }
 const unknown=parse({sources:[url('m10000000007')]})[0];assert.equal(unknown.label,'販売状況未確認 価格未確認');assert.equal(unknown.checkedAt,null);assert.equal(unknown.note,'');
 for(const suffix of ['店より1,000円安い','8,200円SOLDではない','8,200円販売中か未確認','成約日不明、8,200円','8,2,00円販売中','8,200円販売中、7,600円SOLD']){
  const row=parse({...base,sources:[url('m10000000007')],comparison_and_private_evidence:url('m10000000007')+' '+suffix})[0];assert.equal(row.price,null,suffix);
 }
 const missingPrice=parse({...base,sources:[url('m10000000007')],comparison_and_private_evidence:url('m10000000007')+' 販売中、価格は未確認'})[0];assert.equal(missingPrice.label,'出品中 価格未確認');
 const unrelatedDate=parse({...base,comparison_and_private_evidence:url('m10000000008')+' 8,000円SOLD。2025-01-01T00:00:00Z購入。'})[0];assert.equal(unrelatedDate.checkedAt,checked,'purchase time must not become check time');
 const contradiction=parse({...base,comparison_and_private_evidence:url('m10000000008')+' 8,000円販売中\n'+url('m10000000008')+' 7,000円SOLD'})[0];assert.equal(contradiction.price,null);assert.equal(contradiction.state,'unknown');
 const structured=parse({...base,mercari_comparisons:[{url:url('m10000000009'),price_jpy:9100,status:'sold',checked_at:'2026-10-03T10:00:00Z',condition:'室内試着',color:'紺',size:'M',differences:'同色、サイズ違い',caveat:'店より安い例'}],comparison_and_private_evidence:url('m10000000009')+' 10,000円販売中'})[0];
 assert.equal(structured.label,'成約 9,100円');assert.equal(structured.checkedAt,'2026-10-03T10:00:00Z');assert.ok(structured.note.includes('同色、サイズ違い'));assert.ok(structured.note.includes('店より安い例'));
}
async function mercariUiTests(){
 const url='https://jp.mercari.com/item/m10000000011',main='原文\n本文は変更しない',reply='原文の自己返信';
 const fixture=setup([],[{ok:true,events:[item('comparison',{payload:{account_name:'キュン拾い',main_post:main,self_reply:reply,purchase_url:'https://example.com/product',checked_at_mercari:'2026-10-02T09:00:00+09:00',comparison_and_private_evidence:url+' 5,200円SOLD、同色・サイズ違い。傷あり、店より安い下振れ。'}})],total:1,nextOffset:null}]);
 const dialog=await fixture.open(),link=all(dialog,'a').find(n=>n.className?.includes('rpg-mercari-open'));
 assert.equal(link.href,url);assert.equal(link.textContent,'成約 5,200円');assert.equal(link.target,'_blank');assert.equal(link.rel,'noopener noreferrer');assert.ok(link.attributes['aria-label'].includes('保存時点'));
 for(const phrase of ['メルカリ相場（保存時点）','現在とは異なる場合','成約日は未確認','掲載日・更新日は成約日ではありません','市場全体の最安値を示すものではありません','同色・サイズ違い','傷あり','下振れ','2026-10-02T09:00:00+09:00'])assert.ok(text(dialog).includes(phrase),phrase);
 await all(dialog,'button').find(b=>b.textContent==='保存主投稿をコピー').onclick();await all(dialog,'button').find(b=>b.textContent==='保存自己返信をコピー').onclick();assert.deepEqual(fixture.copied,[main,reply]);
 assert.equal(all(dialog,'a').find(n=>n.className?.includes('rpg-product-open')).href,'https://example.com/product');
 assert.ok(fixture.calls.every(c=>c.o.method===undefined&&c.o.body===undefined),'comparison display must not write or fetch live market data');
 const missing=setup([],[{ok:true,events:[item('missing')],total:1,nextOffset:null}]);assert.ok(text(await missing.open()).includes('個別商品のメルカリ比較リンクは保存されていません'));
 const tiktok=setup([],[{ok:true,events:[item('fp',{payload:{account_name:'@sucker0508',main_post:'FP原文',sources:[url]}})],total:1,nextOffset:null}]);tiktok.root.CCManualOperationHub.openAccount('tiktok');await flush();assert.ok(!text(tiktok.doc.body).includes('メルカリ相場（保存時点）'));
}

async function run(){
 mercariParsingTests();await mercariUiTests();
 const event=item('original',{title:'保存済みの商品',payload:{account_name:'キュン拾い',main_post:'本文\nそのまま',purchase_url:'https://example.com/buy?q=1',affiliate_url:null,source_url:'https://example.com/source',sources:[{url:'https://example.com/comparison',title:'価格の比較記録'},{url:'javascript:alert(1)',title:'危険なURL'}]}});
 const fixture=setup([],[{ok:true,events:[event,item('past',{status:'posted'})],total:2,nextOffset:null}]);
 const d=await fixture.open();assert.ok(d.className.includes('rpg-account-page'));assert.equal(d.dataset.account,'kyun');
 assert.equal(all(d,'h2')[0].textContent,'キュン拾い');
 let current=all(d,'div').find(n=>n.className==='rpg-account-current'),history=all(d,'details').find(n=>n.className==='rpg-account-history');
 assert.equal(current.hidden,false);assert.equal(history.hidden,true);assert.ok(text(current).includes('投稿状態未確認'));assert.ok(!text(current).includes('past'));
 const tab=key=>all(d,'button').find(n=>n.dataset.accountTab===key);
 assert.equal(tab('current').textContent,'今回（1）');assert.equal(tab('history').textContent,'履歴（1）');
 tab('history').onclick();history=all(d,'details').find(n=>n.className==='rpg-account-history');current=all(d,'div').find(n=>n.className==='rpg-account-current');
 assert.equal(history.hidden,false);assert.equal(history.open,true);assert.equal(current.hidden,true);assert.ok(text(history).includes('past'));assert.equal(tab('history').attributes['aria-pressed'],'true');
 tab('current').onclick();
 const links=all(d,'a').filter(a=>!a.className?.includes('rpg-product-open'));assert.deepEqual(links.map(a=>a.href),['https://example.com/source','https://example.com/comparison']);assert.ok(links.every(a=>a.rel==='noopener noreferrer'&&a.target==='_blank'));
 await all(d,'button').find(b=>b.textContent==='保存主投稿をコピー').onclick();assert.deepEqual(fixture.copied,['本文\nそのまま']);assert.ok(!all(d,'button').some(b=>b.textContent==='保存購入リンクをコピー'));
 const product=all(d,'a').find(a=>a.className.includes('rpg-product-open'));assert.equal(product.href,'https://example.com/buy?q=1');assert.equal(product.target,'_blank');assert.equal(product.rel,'noopener noreferrer');assert.ok(text(d).includes('アフィリエイトリンクは未発行'));
 assert.ok(!all(d,'button').some(b=>/投稿済みに|投稿する/.test(b.textContent)));
 assert.deepEqual(api.savedSources({url:'javascript:alert(1)',payload:{source_url:'https://u:p@example.com/private',sources:[null,{url:'data:text/html,no'},'https://example.com/public','https://example.com/public']}}),[{url:'https://example.com/public',label:'保存された出典'}]);
 all(d,'button').find(b=>b.textContent==='← 司令塔').onclick();assert.equal(d.open,false);
 const choi=setup([],[{ok:true,events:[],total:0,nextOffset:null}]);choi.root.CCManualOperationHub.openAccount('choi');await flush();const c=choi.doc.body.children.find(n=>n.tagName==='dialog');assert.equal(c.dataset.account,'choi');assert.equal(all(c,'h2')[0].textContent,'ちょい上等');assert.ok(text(c).includes('別保存先の原稿はまだ連携されていません。'));assert.equal(all(c,'a').length,0);
 for(const url of ['', 'javascript:alert(1)','data:text/html,hi','http://example.com','https://user:pass@example.com/product','/relative','file:///tmp/x'])assert.equal(api.savedProductLink({purchase_url:url}).url,null,url);
 assert.equal(api.savedProductLink({ordinary_url:'https://example.com/right?a=1&b=2',purchase_url:'https://example.com/other',affiliate_url:null}).url,'https://example.com/right?a=1&b=2');
 assert.ok(api.savedProductLink({purchase_url:'https://example.com/right'}).note.includes('発行状況は未確認'));
 const noUrl=setup([],[{ok:true,events:[item('no-url')],total:1,nextOffset:null}]);const nd=await noUrl.open();assert.equal(all(nd,'button').find(b=>b.textContent==='商品ページを開く').disabled,true);assert.ok(text(nd).includes('商品URLが未確認'));
 const choiLink=setup([],[{ok:true,events:[item('choi-link',{payload:{account_name:'ちょい上等',main_post:'メンズ原文',purchase_url:'https://example.com/mens',affiliate_url:null}})],total:1,nextOffset:null}]);choiLink.root.CCManualOperationHub.openAccount('choi');await flush();const cl=choiLink.doc.body.children.find(n=>n.tagName==='dialog');assert.equal(all(cl,'a').find(a=>a.className.includes('rpg-product-open')).href,'https://example.com/mens');
 const css=fs.readFileSync(path.join(__dirname,'../command-center-98/rpg-account-pages.css'),'utf8');assert.ok(css.includes('[data-account="choi"]'));assert.ok(css.includes('[hidden]{display:none!important}'));assert.ok(css.includes('100dvh'));assert.ok(css.includes('detail-swimwear.png'));assert.ok(!css.includes('position:fixed'));
 for(const {o} of fixture.calls){assert.equal(o.method,undefined);assert.equal(o.body,undefined);}
 console.log('PASS: account page titles, real tabs/counts/history, original body/link copy, saved safe source links, safe historical Mercari links and evidence, no publication control, close and responsive art hooks');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
