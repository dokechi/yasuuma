/* A short-lived visual copy of already rendered paper/companion, never HTML
   serialization or data transport. No handlers, IDs, forms, or executable nodes. */
const properties=('display position box-sizing flex flex-direction flex-wrap flex-grow flex-shrink flex-basis align-items align-self justify-content gap row-gap column-gap grid-template-columns grid-template-rows grid-column grid-row width height min-width min-height max-width max-height margin padding border border-top border-right border-bottom border-left border-radius border-color background background-color color opacity font-family font-size font-weight font-style line-height letter-spacing text-align text-decoration white-space overflow overflow-x overflow-y overflow-wrap word-break box-shadow text-shadow object-fit object-position filter clip-path mask-image transform translate rotate scale transform-origin top right bottom left z-index').split(' ');
export function captureCastleForeground(sourceDocument,{document:target=sourceDocument,offsetX=0,offsetY=0,surfaceTop=0}={}){
 const win=sourceDocument.defaultView,root=target.createElement('div');root.className='castle-journey-foreground';root.setAttribute('aria-hidden','true');root.inert=true;
 let budget=350;
 function copy(node){
  if(node.nodeType===3)return target.createTextNode(node.textContent);
  if(node.nodeType!==1||budget<=0||['SCRIPT','STYLE','IFRAME','AUDIO','VIDEO','INPUT','SELECT','TEXTAREA','OBJECT','EMBED','LINK','META'].includes(node.tagName))return null;
  budget--;const style=win.getComputedStyle(node);if(style.display==='none'||style.visibility==='hidden')return null;
  const clone=target.createElement(node.tagName==='FORM'?'div':node.tagName.toLowerCase());
  for(const property of properties)clone.style.setProperty(property,style.getPropertyValue(property));
  if(node.tagName==='IMG'){clone.src=node.currentSrc||node.src;clone.alt='';clone.draggable=false;}
  if(node.scrollTop)clone.dataset.journeyScrollTop=String(node.scrollTop);
  for(const child of node.childNodes){const next=copy(child);if(next)clone.append(next);}return clone;
 }
 const paperSelector=sourceDocument.querySelector('#room')?.dataset.livingView==='tools'?'.living-workbench':'#desk';
 for(const [selector,part]of [['.spatial-desk-actor','actor'],[paperSelector,'paper']]){
  const source=sourceDocument.querySelector(selector),rect=source?.getBoundingClientRect();if(!source||!rect?.width||!rect.height)continue;
  const clone=copy(source);if(!clone)continue;clone.dataset.journeyPart=part;
  Object.assign(clone.style,{position:'absolute',left:(rect.left+offsetX)+'px',top:(rect.top+offsetY-surfaceTop)+'px',right:'auto',bottom:'auto',width:rect.width+'px',height:rect.height+'px',margin:'0',transform:'none',translate:'none',rotate:'none',scale:'none',pointerEvents:'none'});root.append(clone);
 }
 return root.childElementCount?root:null;
}
