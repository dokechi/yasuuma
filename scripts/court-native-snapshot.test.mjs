import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {captureNativeWorkspace} from '../command-center-98/lounge/court-native-snapshot.js';
const {JSDOM}=createRequire(import.meta.url)('jsdom');
const surface={left:0,top:52,width:800,height:596};
function setup(t){
 const dom=new JSDOM('<!doctype html><body class="lounge-workspace"><main id="mainWindow" data-cc-view="sourcing"><header id="loungeWorkspaceHeader"><nav><button id="back" onclick="window.unwanted=true">司令塔へ</button></nav><h1>仕入れ帳</h1></header><section class="window-body"><p>実仕入れ 12,340円</p><div class="ledger-month-tabs"><button id="month" data-ledger-month="2026-11">11月</button></div><div id="ccFilters"><label>分野<select id="ccDomainFilter"><option>すべての情報</option><option selected>お得</option></select></label></div><div class="scroll"><table><tbody><tr><th>商品</th><td>実際の商品 A</td><td>¥4,200</td></tr></tbody></table></div><button name="save" form="real-form">更新</button><a href="https://example.invalid" target="_blank">出典</a></section></main></body>',{url:'https://castle.invalid/command-center-98/app-v130.html',pretendToBeVisual:true});
 const win=dom.window,doc=win.document,rects=new WeakMap(),pseudo=doc.createElement('span').style,none=doc.createElement('span').style;none.content='none';none.display='none';
 pseudo.content='""';pseudo.display='block';pseudo.position='absolute';pseudo.right='0px';pseudo.bottom='0px';pseudo.width='180px';pseudo.height='145px';pseudo.backgroundImage='url("https://castle.invalid/command-center-98/lounge/assets/sourcing-desk-actor.webp")';
 doc.body.style.backgroundImage='url("https://castle.invalid/command-center-98/lounge/assets/castle-interior-sourcing-v1.webp")';doc.body.style.backgroundColor='rgb(24,46,48)';doc.body.style.backgroundSize='cover';
 const originalStyle=win.getComputedStyle.bind(win);win.getComputedStyle=(node,part)=>part?(node.id==='loungeWorkspaceHeader'&&part==='::before'?pseudo:none):originalStyle(node);
 Object.defineProperties(win,{innerWidth:{value:800,configurable:true},innerHeight:{value:648,configurable:true}});let now=0;win.performance.now=()=>now;win.performance.getEntriesByName=url=>url.includes('/lounge/assets/')?[{responseEnd:1}]:[];
 function place(node,rect={left:36,top:280,width:500,height:30}){rects.set(node,rect);node.getBoundingClientRect=()=>({...rect,right:rect.left+rect.width,bottom:rect.top+rect.height});if(node.style){node.style.width=rect.width+'px';node.style.height=rect.height+'px';}return node;}
 for(const node of doc.querySelectorAll('*'))place(node);
 place(doc.getElementById('mainWindow'),{left:24,top:20,width:752,height:1200});place(doc.getElementById('loungeWorkspaceHeader'),{left:24,top:20,width:752,height:220});place(doc.querySelector('.window-body'),{left:24,top:240,width:752,height:980});
 const scroll=doc.querySelector('.scroll');scroll.scrollTop=76;scroll.scrollLeft=42;
 let requests=0,writes=0,clicks=0;win.fetch=()=>{requests++;throw Error('Snapshot must not request data');};win.Storage.prototype.setItem=()=>{writes++;};doc.getElementById('back').addEventListener('click',()=>clicks++);
 const before=doc.body.outerHTML,sourceMonth=doc.getElementById('month').textContent;
 t.after(()=>dom.window.close());
 return {win,doc,place,pseudo,scroll,get requests(){return requests;},get writes(){return writes;},get clicks(){return clicks;},advanceTime(n){now=n;},unchanged(){return doc.body.outerHTML===before&&doc.getElementById('month').textContent===sourceMonth&&scroll.scrollTop===76&&scroll.scrollLeft===42;},capture(extra={}){return captureNativeWorkspace(doc,{surface,...extra});}};
}
test('native capture reflects actual header, ledger values, unfocused filters and scroll without mutating source',t=>{
 const h=setup(t),result=h.capture();assert.ok(result);assert.equal(result.foreground.isConnected,false);assert.equal(result.foreground.inert,true);assert.equal(result.roomBackdrop.getAttribute('aria-hidden'),'true');assert.match(result.foreground.textContent,/実仕入れ 12,340円/);assert.match(result.foreground.textContent,/実際の商品 A/);assert.equal(result.foreground.querySelector('input'),null);assert.match(result.foreground.textContent,/11月/);assert.equal(result.foreground.querySelector('select').selectedOptions[0].textContent,'お得');assert.equal(result.foreground.querySelector('[data-journey-scroll-top]').dataset.journeyScrollTop,'76');assert.equal(result.foreground.querySelector('[data-court-scroll-left]').dataset.courtScrollLeft,'42');
 assert.equal(result.foreground.firstElementChild.style.left,'24px');assert.equal(result.foreground.firstElementChild.style.top,'-32px');assert.equal(result.roomBackdrop.firstElementChild.style.top,'-52px');assert.equal(result.roomBackdrop.firstElementChild.style.height,'648px');assert.equal(result.foreground.querySelectorAll('[id],[name],[onclick],[href],[target],[form],[action]').length,0);assert.equal(h.unchanged(),true);assert.equal(h.requests,0);assert.equal(h.writes,0);h.doc.getElementById('back').click();assert.equal(h.clicks,1);
});
test('capture before canonical scroll reset preserves current viewport geometry and keeps source offsets unchanged',t=>{
 const h=setup(t);h.place(h.doc.getElementById('mainWindow'),{left:24,top:-640,width:752,height:1800});h.place(h.doc.getElementById('loungeWorkspaceHeader'),{left:24,top:-640,width:752,height:220});Object.defineProperty(h.win,'scrollY',{value:660});const result=h.capture();assert.ok(result);assert.equal(result.foreground.firstElementChild.style.top,'-692px');assert.equal(h.win.scrollY,660);assert.equal(h.scroll.scrollTop,76);assert.equal(h.scroll.scrollLeft,42);
});
for(const selector of ['input','select'])test('active '+selector+' editing always chooses instant fallback',t=>{const h=setup(t);if(selector==='input')h.doc.querySelector('.window-body').append(h.place(h.doc.createElement('input')));h.doc.querySelector(selector).focus();assert.equal(h.capture(),null);assert.equal(h.doc.activeElement,h.doc.querySelector(selector));assert.equal(h.requests,0);});
for(const kind of ['password','file','credential','textarea','contenteditable','canvas','video','iframe','external-image','sticky','shadow'])test('visible '+kind+' returns null rather than a partial invented workspace',t=>{
 const h=setup(t);let node;if(['password','file','credential'].includes(kind)){node=h.doc.createElement('input');node.type=kind==='credential'?'text':kind;if(kind==='credential')node.name='apiSecret';}else if(kind==='contenteditable'){node=h.doc.createElement('div');node.contentEditable='true';node.setAttribute('contenteditable','true');}else if(kind==='external-image'){node=h.doc.createElement('img');node.src='https://example.invalid/product.jpg';}else if(kind==='sticky'||kind==='shadow'){node=h.doc.createElement('div');if(kind==='sticky')node.style.position='sticky';else node.attachShadow({mode:'open'});}else node=h.doc.createElement(kind);h.place(node);h.doc.querySelector('.window-body').append(node);assert.equal(h.capture(),null);assert.equal(node.parentNode,h.doc.querySelector('.window-body'));
});
test('open modal prevents capture even when ledger remains visible below it',t=>{const h=setup(t),dialog=h.place(h.doc.createElement('dialog'));dialog.open=true;dialog.style.display='block';h.doc.body.append(dialog);assert.equal(h.capture(),null);});
for(const reason of ['elements','text','time','missing-workspace','wrong-view','hidden-document','unloaded-background','foreign-target','invalid-surface'])test(reason+' chooses null with no source or network changes',t=>{
 const h=setup(t);let options={};if(reason==='elements')options.maxElements=3;if(reason==='text')options.maxText=4;if(reason==='time'){let step=0;h.win.performance.now=()=>step++*10;options.maxMilliseconds=1;}if(reason==='missing-workspace')h.doc.getElementById('loungeWorkspaceHeader').remove();if(reason==='wrong-view')h.doc.getElementById('mainWindow').dataset.ccView='reddit';if(reason==='hidden-document')Object.defineProperty(h.doc,'hidden',{value:true});if(reason==='unloaded-background')h.win.performance.getEntriesByName=()=>[];if(reason==='foreign-target')options.document={};if(reason==='invalid-surface')options.surface={...surface,width:0};assert.equal(h.capture(options),null);assert.equal(h.requests,0);assert.equal(h.writes,0);
});
test('offscreen unsupported media retains only an invisible layout box, never creates its resource again',t=>{const h=setup(t),image=h.place(h.doc.createElement('img'),{left:24,top:2000,width:300,height:200});image.src='https://example.invalid/unseen.jpg';h.doc.querySelector('.window-body').append(image);const result=h.capture();assert.ok(result);assert.equal(result.foreground.querySelector('img'),null);assert.equal(h.requests,0);});
test('loaded decorative header art remains a noninteractive geometry-only pseudo-element',t=>{const h=setup(t),result=h.capture();assert.ok(result);const art=[...result.foreground.querySelectorAll('span')].find(n=>n.style.backgroundImage.includes('sourcing-desk-actor'));assert.ok(art);assert.equal(art.style.width,'180px');assert.equal(art.style.pointerEvents,'none');assert.equal(art.hasAttribute('id'),false);});
test('simple inline SVG geometry is preserved without classes, handlers or resource references',t=>{const h=setup(t),svg=h.doc.createElementNS('http://www.w3.org/2000/svg','svg'),path=h.doc.createElementNS(svg.namespaceURI,'path');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('id','icon');path.setAttribute('d','M1 1L20 20');path.setAttribute('stroke','currentColor');svg.append(path);h.place(svg);h.place(path);h.doc.querySelector('.window-body').append(svg);const result=h.capture();assert.ok(result);assert.equal(result.foreground.querySelector('svg').getAttribute('viewBox'),'0 0 24 24');assert.equal(result.foreground.querySelector('path').getAttribute('d'),'M1 1L20 20');assert.equal(result.foreground.querySelector('svg').hasAttribute('id'),false);});
for(const kind of ['use','foreignObject','animate','script','filter','href','url'])test('SVG '+kind+' cannot enter inert native snapshot',t=>{const h=setup(t),svg=h.doc.createElementNS('http://www.w3.org/2000/svg','svg'),node=h.doc.createElementNS(svg.namespaceURI,['href','url'].includes(kind)?'path':kind);if(kind==='href')node.setAttribute('href','https://example.invalid/a');if(kind==='url')node.setAttribute('fill','url(#paint)');svg.append(node);h.place(svg);h.place(node);h.doc.querySelector('.window-body').append(svg);assert.equal(h.capture(),null);});
test('generated unsupported content declines capture instead of substituting guessed text',t=>{const h=setup(t);h.pseudo.content='attr(data-secret)';assert.equal(h.capture(),null);});
test('capture implementation has no HTML serialization, data transport, route or persistence ownership',()=>{const source=fs.readFileSync(new URL('../command-center-98/lounge/court-native-snapshot.js',import.meta.url),'utf8');assert.doesNotMatch(source,/innerHTML|outerHTML|cloneNode|\bfetch\s*\(|localStorage|sessionStorage|postMessage|appendChild\(source|\.focus\s*\(/);});
for(const type of ['text','number','month'])test('blurred unknown '+type+' editor is not mistaken for a static filter',t=>{const h=setup(t),input=h.place(h.doc.createElement('input'));input.type=type;input.value=type==='month'?'2026-11':'1234';h.doc.querySelector('.window-body').append(input);input.focus();h.doc.getElementById('back').focus();assert.equal(h.capture(),null);assert.equal(input.value,type==='month'?'2026-11':'1234');});
for(const marker of ['data-dirty','data-editor','data-price-wait-id'])test('unfocused '+marker+' editing container chooses instant fallback',t=>{const h=setup(t),editor=h.place(h.doc.createElement('section'));editor.setAttribute(marker,'true');editor.textContent='Existing unsaved work';h.doc.querySelector('.window-body').append(editor);h.doc.getElementById('back').focus();assert.equal(h.capture(),null);assert.equal(editor.textContent,'Existing unsaved work');});
test('unrecognized select is not admitted merely because it looks like a filter',t=>{const h=setup(t),select=h.place(h.doc.createElement('select'));select.name='filter';select.append(h.doc.createElement('option'));h.doc.querySelector('.window-body').append(select);assert.equal(h.capture(),null);});
test('closed details do not clone hidden records or hidden editable controls',t=>{const h=setup(t),details=h.place(h.doc.createElement('details')),summary=h.place(h.doc.createElement('summary')),hidden=h.place(h.doc.createElement('input'),{left:0,top:0,width:0,height:0});summary.textContent='保存された内訳';hidden.value='Unshown work';details.append(summary,hidden);h.doc.querySelector('.window-body').append(details);const result=h.capture();assert.ok(result);assert.equal(result.foreground.querySelector('details').open,false);assert.equal(result.foreground.querySelector('details input'),null);assert.match(result.foreground.textContent,/保存された内訳/);assert.doesNotMatch(result.foreground.textContent,/Unshown work/);});
test('the actual purchase-ledger HTML builder fits the default bounded static capture with a normal saved row',t=>{
 const h=setup(t),require=createRequire(import.meta.url),trade=require('../command-center-98/v231-trade-details.js'),body=h.doc.querySelector('.window-body');
 body.innerHTML=trade.html({purchaseMonth:'2026-11',purchaseProfit:[],purchases:[{id:1,status:'purchased',supplier_name:'実際の仕入先',supplier_key:'fixture',order_id:'saved-order',ordered_at:'2026-11-01T00:00:00Z',product_name:'保存済みの商品',sku:'ABC',variant:'青',quantity:1,order_total_yen:1234,unit_price_yen:1234,allocated_net_unit_yen:1234}]});
 for(const node of body.querySelectorAll('*'))h.place(node);const before=body.innerHTML,result=h.capture();assert.ok(result);assert.match(result.foreground.textContent,/保存済みの商品/);assert.match(result.foreground.textContent,/実際の仕入先/);assert.equal(body.innerHTML,before);assert.equal(h.requests,0);
});

function fractionalRow(h,{width=276.28125,height=55}={}){
 const group=h.place(h.doc.createElement('section'),{left:33,top:400,width,height});
 Object.assign(group.style,{display:'flex',boxSizing:'border-box',flex:'0 1 auto',flexWrap:'wrap',gap:'4px',padding:'5px 6px 4px',border:'1px solid',width:width===276.28125?'276.281px':width+'px'});
 for(const [index,label]of ['仕入れ先候補','仕入れ先台帳'].entries()){
  const node=h.place(h.doc.createElement('button'),{left:40+index*133.140625,top:406,width:129.140625,height:44});node.textContent=label;
  Object.assign(node.style,{display:'block',boxSizing:'border-box',flex:'1 1 auto',width:'129.141px',height:'44px',padding:'6px 11px',border:'1px solid'});group.append(node);
 }
 h.doc.querySelector('.window-body').append(group);return group;
}
test('fractional used boxes preserve the exact two-button flex fit instead of reparsing rounded computed dimensions',t=>{
 const h=setup(t),source=fractionalRow(h),before=source.outerHTML,result=h.capture();assert.ok(result);
 const buttons=[...result.foreground.querySelectorAll('button')].filter(n=>n.textContent.startsWith('仕入れ先')),group=buttons[0].parentElement;
 assert.equal(group.style.width,'276.28125px');assert.equal(group.style.height,'55px');assert.equal(group.style.flexWrap,'wrap');assert.equal(group.style.boxSizing,'border-box');
 assert.deepEqual(buttons.map(n=>n.style.width),['129.140625px','129.140625px']);
 // JSDOM has no layout: this proves the exact fit's numeric inputs. Actual
 // unchanged rows/rects remain a strict same-event real-browser acceptance gate.
 const contentWidth=parseFloat(group.style.width)-12-2,used=buttons.reduce((sum,n)=>sum+parseFloat(n.style.width),0)+4;
 assert.equal(contentWidth,used);assert.equal(source.outerHTML,before);assert.equal(h.requests,0);assert.equal(h.writes,0);
});
test('content-box dimensions subtract precise padding and borders without changing box-sizing or margins',t=>{
 const h=setup(t),node=h.place(h.doc.createElement('section'),{left:33,top:400,width:276.28125,height:70.5});node.textContent='正確な内容領域';
 Object.assign(node.style,{display:'block',boxSizing:'content-box',width:'261.531px',height:'52px',padding:'3.25px 6.125px 4.75px 5.875px',borderStyle:'solid',borderWidth:'1.25px 1.5px 2.25px 1.25px',margin:'7px'});h.doc.querySelector('.window-body').append(node);
 const result=h.capture();assert.ok(result);const clone=[...result.foreground.querySelectorAll('section')].find(n=>n.textContent==='正確な内容領域');
 assert.equal(clone.style.boxSizing,'content-box');assert.equal(clone.style.width,'261.53125px');assert.equal(clone.style.height,'59px');assert.equal(clone.style.margin,'7px');assert.equal(node.style.width,'261.531px');
});
test('the viewport-positioned root preserves its content box instead of treating the border rect as CSS width',t=>{
 const h=setup(t),main=h.doc.getElementById('mainWindow');Object.assign(main.style,{boxSizing:'content-box',padding:'7px 11px',border:'2px solid'});
 const result=h.capture();assert.ok(result);const clone=result.foreground.firstElementChild;
 assert.equal(clone.style.width,'726px');assert.equal(clone.style.height,'1182px');assert.equal(clone.style.boxSizing,'content-box');assert.equal(clone.style.left,'24px');assert.equal(main.style.width,'752px');
});
test('a legitimately compact multirow flex group retains wrapping and its original two-row height',t=>{
 const h=setup(t),source=fractionalRow(h,{width:220,height:103});const second=source.children[1];h.place(second,{left:40,top:454,width:129.140625,height:44});second.style.width='129.141px';
 const result=h.capture();assert.ok(result);const buttons=[...result.foreground.querySelectorAll('button')].filter(n=>n.textContent.startsWith('仕入れ先')),group=buttons[0].parentElement;
 assert.equal(group.style.width,'220px');assert.equal(group.style.height,'103px');assert.equal(group.style.flexWrap,'wrap');assert.equal(group.style.flexDirection,'');assert.ok(buttons.reduce((sum,n)=>sum+parseFloat(n.style.width),0)+4>220-14);assert.equal(source.style.flexWrap,'wrap');
});
for(const [property,value]of [['transform','scale(2)'],['scale','2'],['translate','0px 1.5px'],['rotate','5deg']])test('a descendant '+property+' retains computed layout size and transform, never its transformed bounding size',t=>{
 const h=setup(t),node=h.place(h.doc.createElement('button'),{left:40,top:400,width:200,height:88});node.textContent='押下中';Object.assign(node.style,{display:'block',boxSizing:'border-box',width:'100px',height:'44px'});node.style.setProperty(property,value);h.doc.querySelector('.window-body').append(node);
 const result=h.capture();assert.ok(result);const clone=[...result.foreground.querySelectorAll('button')].find(n=>n.textContent==='押下中');
 assert.equal(clone.style.width,'100px');assert.equal(clone.style.height,'44px');assert.equal(clone.style.getPropertyValue(property),value);assert.equal(node.style.width,'100px');
});
test('descendants of a transformed group keep local layout sizes instead of the ancestor-scaled rect',t=>{
 const h=setup(t),group=fractionalRow(h);group.style.transform='scale(2)';h.place(group,{left:33,top:400,width:552.5625,height:110});group.style.width='276.281px';
 for(const node of group.children){h.place(node,{left:40,top:406,width:258.28125,height:88});node.style.width='129.141px';node.style.height='44px';}
 const result=h.capture();assert.ok(result);const buttons=[...result.foreground.querySelectorAll('button')].filter(n=>n.textContent.startsWith('仕入れ先'));
 assert.equal(buttons[0].parentElement.style.width,'276.281px');assert.deepEqual(buttons.map(n=>n.style.width),['129.141px','129.141px']);assert.equal(buttons[0].parentElement.style.transform,'scale(2)');
});
for(const selector of ['#mainWindow','body','html'])test('transformed '+selector+' cannot be normalized into a viewport snapshot and falls back instantly',t=>{
 const h=setup(t),node=h.doc.querySelector(selector);node.style.transform='scale(1.1)';const before=h.doc.body.outerHTML;assert.equal(h.capture(),null);assert.equal(h.doc.body.outerHTML,before);assert.equal(h.requests,0);
});

test('CSS zoom with a non-unit layout scale chooses an instant fallback, not scaled dimensions',t=>{
 const h=setup(t),node=h.doc.getElementById('month'),original=h.win.getComputedStyle;
 h.win.getComputedStyle=(element,part)=>{const style=original(element,part);if(element!==node||part)return style;return new Proxy(style,{get(target,key){if(key==='getPropertyValue')return property=>property==='zoom'?'2':target.getPropertyValue(property);const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});};
 assert.equal(h.capture(),null);assert.equal(h.requests,0);assert.equal(h.unchanged(),true);
});
