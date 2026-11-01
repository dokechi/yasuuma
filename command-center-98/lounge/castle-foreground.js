/* A short-lived visual copy of already rendered paper/companion, never HTML
   serialization or data transport. No handlers, IDs, forms, or executable nodes. */
const properties=('display position box-sizing order flex flex-direction flex-wrap flex-grow flex-shrink flex-basis align-items align-self justify-content gap row-gap column-gap grid-template-columns grid-template-rows grid-column grid-row width height min-width min-height max-width max-height margin padding border border-top border-right border-bottom border-left border-radius border-color background background-color color opacity font-family font-size font-weight font-style line-height letter-spacing text-align text-indent text-decoration text-overflow -webkit-line-clamp -webkit-box-orient white-space overflow overflow-x overflow-y overflow-wrap word-break box-shadow text-shadow object-fit object-position filter clip-path mask-image transform translate rotate scale transform-origin top right bottom left z-index').split(' ');
export function captureCastleForeground(sourceDocument,{document:target=sourceDocument,offsetX=0,offsetY=0,surfaceTop=0,extraRoots=[],strict=false}={}){
 const win=sourceDocument.defaultView,root=target.createElement('div');root.className='castle-journey-foreground';root.setAttribute('aria-hidden','true');root.inert=true;
 let budget=350,visited=0,text=0;const start=win.performance.now(),extras=[];
 // Work-first pages may show the original shelf alongside the paper. Only its
 // exact mounted dock is accepted; arbitrary source roots are not a capture API.
 if(!Array.isArray(extraRoots)||extraRoots.length>1)return null;
 for(const item of extraRoots){const node=item?.element;if(!strict||item.part!=='list'||node?.ownerDocument!==sourceDocument||!node.isConnected||!node.matches('.manuscript-shelf')||!node.parentElement?.classList.contains('workbook-list')||sourceDocument.querySelector('.workbook-list > .manuscript-shelf')!==node)return null;extras.push([node,'list']);const title=node.parentElement.querySelector(':scope > h2.workbook-list-title');if(title){if(title.hasAttribute('contenteditable')||title.querySelector('button,a,input,select,textarea,[tabindex],[contenteditable]'))return null;extras.push([title,'list-title']);}}
 const set=(node,key,value)=>node.style.setProperty(key,String(value),strict?'important':'');
 const styleCopy=(node,style)=>{for(const property of properties){const value=style.getPropertyValue(property);if(strict&&/url\(/i.test(value))for(const match of value.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)){const url=new URL(match[2],sourceDocument.baseURI);if(url.origin!==win.location.origin||!['https:','http:'].includes(url.protocol))throw Error('snapshot-resource');}set(node,property,value);}};
 const hidden=node=>{const style=win.getComputedStyle(node);return node.hidden||style.display==='none'||style.visibility==='hidden';};
 const query=node=>node===sourceDocument.getElementById('desk-query')&&node.tagName==='INPUT'&&node.type==='search'&&extras.some(([shelf])=>shelf.contains(node))&&sourceDocument.activeElement!==node;
 function check(){if(strict&&(++visited>1400||win.performance.now()-start>40))throw Error('snapshot-budget');}
 function visibleList(node,clone,style,transformed){
  if(!strict||node!==sourceDocument.getElementById('desk-list')||!extras.some(([shelf])=>shelf.contains(node))||!node.clientWidth||!node.clientHeight)return false;
  if(transformed||!['block','flow-root'].includes(style.display)||!['auto','scroll','hidden','clip'].includes(style.overflowY))throw Error('snapshot-list-layout');
  const rect=node.getBoundingClientRect(),padding=side=>Number.parseFloat(style.getPropertyValue('padding-'+side))||0;
  let left=Math.max(0,rect.left+node.clientLeft),top=Math.max(0,rect.top+node.clientTop),right=Math.min(win.innerWidth,rect.left+node.clientLeft+node.clientWidth),bottom=Math.min(win.innerHeight,rect.top+node.clientTop+node.clientHeight);
  for(let parent=node.parentElement;parent&&parent!==sourceDocument.body;parent=parent.parentElement){const s=win.getComputedStyle(parent),r=parent.getBoundingClientRect();if(['hidden','clip','auto','scroll'].includes(s.overflowX)){left=Math.max(left,r.left+parent.clientLeft);right=Math.min(right,r.left+parent.clientLeft+parent.clientWidth);}if(['hidden','clip','auto','scroll'].includes(s.overflowY)){top=Math.max(top,r.top+parent.clientTop);bottom=Math.min(bottom,r.top+parent.clientTop+parent.clientHeight);}}
  const width=node.scrollWidth-padding('left')-padding('right'),height=node.scrollHeight-padding('top')-padding('bottom');if(!Number.isFinite(width)||!Number.isFinite(height)||width<0||height<0||--budget<0)throw Error('snapshot-list-extent');
  const extent=target.createElement('div');extent.dataset.journeyListExtent='';for(const [key,value]of Object.entries({position:'relative',width:width+'px',height:height+'px','min-width':width+'px','min-height':height+'px',margin:'0',padding:'0',border:'0','box-sizing':'border-box','pointer-events':'none'}))set(extent,key,value);clone.append(extent);
  for(const row of node.childNodes){check();if(row.nodeType===3&&!row.textContent.trim())continue;if(row.nodeType!==1||row.tagName!=='BUTTON'||!row.classList.contains('manuscript-card'))throw Error('snapshot-list-row');const r=row.getBoundingClientRect();if(!r.width||!r.height||r.left+r.width<=left||r.left>=right||r.top+r.height<=top||r.top>=bottom)continue;const rs=win.getComputedStyle(row);if(['transform','translate','rotate','scale'].some(key=>{const value=rs.getPropertyValue(key);return value&&value!=='none';}))throw Error('snapshot-list-transform');const copied=copy(row,transformed);if(!copied)throw Error('snapshot-list-visible-row');for(const [key,value]of Object.entries({position:'absolute',left:(r.left-rect.left-node.clientLeft+node.scrollLeft-padding('left'))+'px',top:(r.top-rect.top-node.clientTop+node.scrollTop-padding('top'))+'px',right:'auto',bottom:'auto',width:r.width+'px',height:r.height+'px',margin:'0','box-sizing':'border-box'}))set(copied,key,value);extent.append(copied);}
  return true;
 }
 function copy(node,transformedAncestor=false){
  check();if(node.nodeType===3){if(strict&&(text+=node.textContent.length)>24000)throw Error('snapshot-text');return target.createTextNode(node.textContent);}
  if(node.nodeType!==1||['SCRIPT','STYLE','LINK','META'].includes(node.tagName))return null;
  const style=win.getComputedStyle(node);if(node.hidden||style.display==='none'||style.visibility==='hidden')return null;
  const staticQuery=strict&&query(node);
  if(strict&&(node.shadowRoot||node.hasAttribute('contenteditable')||node.namespaceURI!=='http://www.w3.org/1999/xhtml'||['IFRAME','AUDIO','VIDEO','CANVAS','OBJECT','EMBED','SELECT','TEXTAREA'].includes(node.tagName)||node.tagName==='INPUT'&&!staticQuery))throw Error('snapshot-unsupported');
  if(budget<=0){if(strict)throw Error('snapshot-budget');return null;}
  if(!strict&&['IFRAME','AUDIO','VIDEO','INPUT','SELECT','TEXTAREA','OBJECT','EMBED'].includes(node.tagName))return null;
  budget--;const clone=target.createElement(node.tagName==='FORM'||staticQuery?'div':node.tagName.toLowerCase());styleCopy(clone,style);
  const transformed=transformedAncestor||['transform','translate','rotate','scale'].some(key=>{const value=style.getPropertyValue(key);return value&&value!=='none';});
  if(strict&&!transformed&&['block','flex','grid','inline-block','inline-flex','inline-grid','flow-root'].includes(style.display)){const rect=node.getBoundingClientRect();if(rect.width>0&&rect.height>0)for(const [axis,sides]of [['width',['left','right']],['height',['top','bottom']]]){let inset=0;if(style.boxSizing!=='border-box')for(const side of sides)for(const key of ['padding-'+side,'border-'+side+'-width']){const raw=style.getPropertyValue(key);if(raw&&!/^-?(?:\d+\.?\d*|\.\d+)px$/.test(raw))throw Error('snapshot-box');inset+=Number.parseFloat(raw)||0;}const size=rect[axis]-inset;if(!Number.isFinite(size)||size<0)throw Error('snapshot-box');set(clone,axis,size+'px');}}
  if(staticQuery){const value=node.value||node.placeholder||'';if((text+=value.length)>24000)throw Error('snapshot-text');clone.textContent=value;clone.dataset.journeyFilter='search';set(clone,'white-space','pre');set(clone,'overflow','hidden');if(!node.value){const placeholder=win.getComputedStyle(node,'::placeholder');for(const property of ['color','opacity'])if(placeholder.getPropertyValue(property))set(clone,property,placeholder.getPropertyValue(property));}return clone;}
  if(node.tagName==='IMG'){const src=node.currentSrc||node.src;if(strict){const url=new URL(src,sourceDocument.baseURI);if(!node.complete||!node.naturalWidth||url.origin!==win.location.origin||!['https:','http:'].includes(url.protocol))throw Error('snapshot-image');clone.decoding='sync';}clone.src=src;clone.alt='';clone.draggable=false;}
  if(node.scrollTop)clone.dataset.journeyScrollTop=String(node.scrollTop);
  if(node.scrollLeft)clone.dataset.courtScrollLeft=String(node.scrollLeft);
  if(strict){set(clone,'pointer-events','none');set(clone,'animation','none');set(clone,'transition','none');}
  if(visibleList(node,clone,style,transformed))return clone;
  for(const child of node.childNodes){const next=copy(child,transformed);if(next)clone.append(next);}return clone;
 }
 const paperSelector=sourceDocument.querySelector('#room')?.dataset.livingView==='tools'?'.living-workbench':'#desk';
 const sources=[['.spatial-desk-actor','actor'],[paperSelector,'paper']].map(([selector,part])=>[sourceDocument.querySelector(selector),part]).concat(extras);
 if(strict&&sources.some(([node],index)=>node&&sources.some(([other],otherIndex)=>other&&index!==otherIndex&&(other===node||other.contains(node)))))return null;
 try{for(const [source,part]of sources){
  const rect=source?.getBoundingClientRect();if(!source||!rect?.width||!rect.height||hidden(source))continue;
  const clone=copy(source);if(!clone)continue;clone.dataset.journeyPart=part;
  if(strict)set(clone,'box-sizing','border-box');
  for(const [property,value]of Object.entries({position:'absolute',left:(rect.left+offsetX)+'px',top:(rect.top+offsetY-surfaceTop)+'px',right:'auto',bottom:'auto',width:rect.width+'px',height:rect.height+'px',margin:'0',transform:'none',translate:'none',rotate:'none',scale:'none','pointer-events':'none'}))set(clone,property,value);root.append(clone);
 }}catch{return null;}
 return root.childElementCount?root:null;
}
