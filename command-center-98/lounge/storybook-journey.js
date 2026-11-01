/* Presentation only: fresh decorative paper/figure snapshots move, the real
   route and manuscript never do. The owner commits work without awaiting us. */
const owners = new WeakMap();
const rooms = new Set(['insurance','otoku','rakuten','lottery','sourcing']);
const forbidden = new Set(['SCRIPT','STYLE','LINK','META','BASE','IFRAME','OBJECT','EMBED','CANVAS','VIDEO','AUDIO','INPUT','TEXTAREA','SELECT','FORM']);
const svgTags = new Set(['svg','g','path','rect','circle','ellipse','line','polyline','polygon','title','desc']);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const clamp = (value,min,max) => Math.min(max,Math.max(min,value));
const phaseAt = progress => progress < .13 ? 'press' : progress < .4 ? 'fold' : progress < .56 ? 'covered' : progress < .9 ? 'unfold' : 'settle';

export function createStorybookJourney({document:doc=globalThis.document,reducedMotion=()=>false}={}) {
 const win=doc?.defaultView;
 if(!win||!doc.body)throw Error('A storybook journey needs a mounted document.');
 const quiet=win.matchMedia?.('(prefers-reduced-motion: reduce)');
 let current=null,disposed=false,serial=0;
 const canMove=()=>{try{return !disposed&&!doc.hidden&&!quiet?.matches&&!reducedMotion()&&typeof win.Element?.prototype.animate==='function'&&win.getComputedStyle(doc.documentElement).getPropertyValue('--storybook-journey-ready').trim()==='1';}catch{return false;}};
 const make=name=>{const node=doc.createElement('div');node.className='storybook-journey-'+name;return node;};
 function safeResource(value){try{const url=new URL(value,doc.baseURI);return url.origin===win.location.origin&&['https:','http:'].includes(url.protocol);}catch{return false;}}
 function safeSnapshot(root,decorative){
  if(root?.nodeType!==1||root.ownerDocument!==doc||root.isConnected||root.parentNode)return false;
  let elements=0,text=0,visited=0,props=0;
  const visit=node=>{
   if(++visited>1400)return false;
   if(node.nodeType===3)return (text+=node.textContent.length)<=24000;
   if(node.nodeType!==1)return node.nodeType===8&&(text+=node.textContent.length)<=24000;
   if(decorative&&node.classList.contains('story-prop')&&++props>24)return false;
   if(++elements>350||forbidden.has(node.tagName)||node.shadowRoot||node.hasAttribute('contenteditable')||decorative&&['BUTTON','A','SUMMARY','DETAILS'].includes(node.tagName))return false;
   if(node.namespaceURI==='http://www.w3.org/2000/svg'&&!svgTags.has(node.localName))return false;
   for(const attr of node.attributes){
    if(/^(id|name|form|action|formaction|srcdoc|srcset|href|xlink:href)$/i.test(attr.name)||/^on/i.test(attr.name))return false;
    if(attr.name==='src'&&(node.tagName!=='IMG'||!safeResource(attr.value)))return false;
    if(node.namespaceURI==='http://www.w3.org/2000/svg'&&/url\(|javascript:|data:/i.test(attr.value))return false;
   }
   for(const match of node.style.cssText.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi))if(!safeResource(match[2]))return false;
   if(/@import|expression\s*\(|javascript:/i.test(node.style.cssText))return false;
   for(const child of node.childNodes)if(!visit(child))return false;
   return true;
  };
  try{return visit(root);}catch{return false;}
 }
 function notify(type,record,cancelled){doc.dispatchEvent(new win.CustomEvent(type,{detail:{room:record.room,direction:record.direction,duration:record.duration,...(cancelled===undefined?{}:{cancelled})}}));}
 function release(record,cancelled=true){
  if(!record||record.released)return;
  record.released=true;if(current===record)current=null;
  if(owners.get(doc)===record)owners.delete(doc);
  win.cancelAnimationFrame(record.raf);win.clearTimeout(record.watchdog);
  for(const off of record.listeners)off();
  for(const animation of record.animations){try{animation.cancel();}catch{}}
  record.layer.remove();
  if(record.started)notify('storybook:journey-end',record,cancelled);
 }
 function cancel(){serial++;release(current);}
 function progress(record){return clamp((Number(record.clock?.currentTime)||0)/record.duration,0,1);}
 function state(){return current?{active:true,room:current.room,direction:current.direction,phase:phaseAt(progress(current)),progress:progress(current),duration:current.duration}:{active:false,room:null,direction:null,phase:'idle',progress:0,duration:0};}
 function attach(slot,node){
  slot.replaceChildren();if(!node)return;
  node.inert=true;node.setAttribute('aria-hidden','true');node.style.pointerEvents='none';slot.append(node);
  for(const scroller of [node,...node.querySelectorAll('[data-journey-scroll-top],[data-court-scroll-left]')]){
   for(const [attribute,property]of [['data-journey-scroll-top','scrollTop'],['data-court-scroll-left','scrollLeft']]){
    const value=Number(scroller.getAttribute(attribute));if(scroller.hasAttribute(attribute)&&finite(value)&&value>=0)scroller[property]=Math.min(value,1e8);
   }
  }
 }
 function hingeProps(record,slot,incoming){
  for(const animation of record.hinges.get(slot)||[]){try{animation.cancel();}catch{}const at=record.animations.indexOf(animation);if(at>=0)record.animations.splice(at,1);}
  const animations=[];record.hinges.set(slot,animations);
  for(const [index,prop]of [...slot.querySelectorAll('.story-prop')].entries()){
   if(!prop.parentElement?.classList.contains('story-paper-art'))continue;
   const style=win.getComputedStyle(prop),values=['--x','--y','--w','--h'].map(key=>{const value=style.getPropertyValue(key).trim();return /^-?(?:\d+(?:\.\d*)?|\.\d+)%$/.test(value)?Number.parseFloat(value):NaN;});
   if(!values.every(value=>finite(value)&&Math.abs(value)<=500))continue;
   const [x,y,w,h]=values,hinge=make('prop-hinge');hinge.dataset.prop=prop.dataset.prop||String(index);
   Object.assign(hinge.style,{position:'absolute',inset:'0',width:'100%',height:'100%',transformOrigin:(x+w/2)+'% '+(y+h)+'%',transformStyle:'preserve-3d',zIndex:style.zIndex||'auto',pointerEvents:'none'});
   // Only fresh decoration is reparented into an equal-size coordinate system.
   // The prop keeps every original percentage and independent transform intact.
   prop.before(hinge);hinge.append(prop);
   const stagger=Math.min(index,7)*.012;
   const frames=incoming?[
    {offset:0,transform:'rotateX(72deg)'},{offset:.52,transform:'rotateX(72deg)'},
    {offset:.57+stagger,transform:'rotateX(58deg)'},{offset:.89+stagger/2,transform:'rotateX(0deg)'},{offset:1,transform:'rotateX(0deg)'}
   ]:[
    {offset:0,transform:'rotateX(0deg)'},{offset:.11+stagger,transform:'rotateX(0deg)'},
    {offset:.34+stagger/2,transform:'rotateX(52deg)'},{offset:.45,transform:'rotateX(72deg)'},{offset:1,transform:'rotateX(72deg)'}
   ];
   animations.push(record.animate(hinge,frames,'storybook-prop-'+(incoming?'destination':'source')+'-'+index));
  }
 }
 function destination(record,values={}){
  if(current!==record||record.released)return false;
  const entries=[['scene',record.destination,true],['foreground',record.flatDestination,false]].filter(([key])=>Object.hasOwn(values,key));
  if(!entries.length)return false;
  const nodes=entries.map(([key])=>values[key]);
  if(nodes.filter(Boolean).length!==new Set(nodes.filter(Boolean)).size||entries.some(([key,,decorative])=>values[key]!==null&&!safeSnapshot(values[key],decorative)))return false;
  try{for(const [key,slot]of entries){attach(slot,values[key]);if(key==='scene')hingeProps(record,slot,true);}return true;}catch{release(record);return false;}
 }
 function travel(spec={}){
  const intent=++serial;release(current);
  if(intent!==serial||!canMove()||spec.quick||!rooms.has(spec.room)||!['in','out','switch'].includes(spec.direction)||owners.has(doc))return null;
  const surface=spec.surface,sourceDoc=spec.sourceDocument||doc;
  if(!surface||!['left','top','width','height'].every(key=>finite(surface[key]))||surface.width<=0||surface.height<=0||surface.width>20000||surface.height>20000||Math.abs(surface.left)>20000||Math.abs(surface.top)>20000)return null;
  try{if(sourceDoc.hidden||sourceDoc.defaultView.location.origin!==win.location.origin)return null;}catch{return null;}
  const inputs=[['sourceScene',true],['destinationScene',true],['sourceForeground',false],['foreground',false]],nodes=inputs.map(([key])=>spec[key]).filter(Boolean);
  if(!spec.sourceScene||nodes.length!==new Set(nodes).size||inputs.some(([key,decorative])=>spec[key]!=null&&!safeSnapshot(spec[key],decorative)))return null;
  const allowed=canMove();if(intent!==serial||!allowed||owners.has(doc))return null;
  const duration=finite(spec.duration)?clamp(spec.duration,260,1100):620,sign=spec.direction==='out'?-1:1;
  const layer=make('stage');layer.classList.add('storybook-journey');layer.dataset.room=spec.room;layer.dataset.direction=spec.direction;layer.dataset.phase='press';layer.inert=true;layer.setAttribute('aria-hidden','true');
  Object.assign(layer.style,{left:surface.left+'px',top:surface.top+'px',width:surface.width+'px',height:surface.height+'px',pointerEvents:'none'});
  const source=make('source'),incoming=make('destination'),flatSource=make('flat-source'),flatDestination=make('flat-destination'),cover=make('cover'),edge=make('edge');
  source.style.transformOrigin=(sign===1?'0%':'100%')+' 50%';incoming.style.transformOrigin=(sign===1?'100%':'0%')+' 50%';
  layer.append(incoming,source,flatSource,flatDestination,cover,edge);
  const folds=[];for(let index=0;index<3;index++){const fold=make('fold');fold.dataset.segment=String(index);fold.style.left=(index*100/3)+'%';fold.style.transformOrigin=(sign===1?'100%':'0%')+' 50%';cover.append(fold);folds.push(fold);}
  const record={layer,source,destination:incoming,flatSource,flatDestination,cover,room:spec.room,direction:spec.direction,duration,sourceDoc,hostWidth:win.innerWidth,hostHeight:win.innerHeight,animations:[],hinges:new Map(),animate:null,listeners:[],clock:null,raf:0,watchdog:0,started:false,released:false};
  current=record;owners.set(doc,record);
  const listen=(target,type,fn,options)=>{target.addEventListener(type,fn,options);record.listeners.push(()=>target.removeEventListener(type,fn,options));};
  const animate=(node,frames,id)=>{
   const animation=node.animate(frames,{duration,easing:'linear',fill:'both'});animation.id=id;
   record.animations.push(animation);Promise.resolve(animation.finished).catch(()=>{});
   const start=record.clock?.startTime??doc.timeline?.currentTime;if(finite(start))animation.startTime=start;
   if(record.clock?.playState==='paused'){animation.pause();animation.currentTime=record.clock.currentTime;}
   return animation;
  };record.animate=animate;
  try{
   doc.body.append(layer);attach(source,spec.sourceScene);if(spec.destinationScene)attach(incoming,spec.destinationScene);if(spec.sourceForeground)attach(flatSource,spec.sourceForeground);if(spec.foreground)attach(flatDestination,spec.foreground);
   // The original illustration and all its independent object transforms ride
   // ONE outer paper carrier. We never rotate or rebuild manuscript text.
   animate(source,[{offset:0,transform:'translateX(0%) rotateY(0deg)',visibility:'visible'},{offset:.13,transform:`translateX(${-sign*1}%) rotateY(${-sign*3}deg)`},{offset:.4,transform:`translateX(${-sign*13}%) rotateY(${-sign*28}deg)`},{offset:.5,transform:`translateX(${-sign*22}%) rotateY(${-sign*48}deg)`,visibility:'visible'},{offset:.501,visibility:'hidden'},{offset:1,transform:`translateX(${-sign*40}%) rotateY(${-sign*75}deg)`,visibility:'hidden'}],'storybook-source');
   animate(incoming,[{offset:0,transform:`translateX(${sign*9}%) rotateY(${sign*18}deg)`,visibility:'hidden'},{offset:.499,visibility:'hidden'},{offset:.5,transform:`translateX(${sign*9}%) rotateY(${sign*18}deg)`,visibility:'visible'},{offset:.9,transform:'translateX(0%) rotateY(0deg)'},{offset:1,transform:'translateX(0%) rotateY(0deg)',visibility:'visible'}],'storybook-destination');
   // A fully opaque three-segment paper underside covers the exact handoff.
   // The small segment offsets make the edge curl rather than crossfade.
   folds.forEach((fold,index)=>{
    const order=sign===1?2-index:index,lift=.08+order*.035,close=.32+order*.035,open=.58+order*.025;
    animate(fold,[{offset:0,transform:`translateX(${sign*330}%) rotateY(${sign*104}deg)`},{offset:lift,transform:`translateX(${sign*330}%) rotateY(${sign*104}deg)`},{offset:close,transform:'translateX(0%) rotateY(0deg)'},{offset:.56,transform:'translateX(0%) rotateY(0deg)'},{offset:open,transform:`translateX(${-sign*12}%) rotateY(${-sign*12}deg)`},{offset:.9,transform:`translateX(${-sign*430}%) rotateY(${-sign*105}deg)`},{offset:1,transform:`translateX(${-sign*430}%) rotateY(${-sign*105}deg)`}],'storybook-fold-'+index);
   });
   animate(flatSource,[{offset:0,visibility:'visible'},{offset:.499,visibility:'visible'},{offset:.5,visibility:'hidden'},{offset:1,visibility:'hidden'}],'storybook-flat-source');
   animate(flatDestination,[{offset:0,visibility:'hidden'},{offset:.499,visibility:'hidden'},{offset:.5,visibility:'visible'},{offset:1,visibility:'visible'}],'storybook-flat-destination');
   animate(edge,[{offset:0,opacity:0},{offset:.13,opacity:.55},{offset:.4,opacity:0},{offset:.56,opacity:0},{offset:.83,opacity:.35},{offset:1,opacity:0}],'storybook-edge');
   record.clock=animate(layer,[{offset:0,opacity:1},{offset:.93,opacity:1},{offset:1,opacity:0}],'storybook-journey-clock');
   hingeProps(record,source,false);hingeProps(record,incoming,true);
   Promise.resolve(record.clock.finished).then(()=>{if(current===record)release(record,false);}).catch(()=>{if(current===record)release(record);});
   const interrupt=event=>{if(event.type==='keydown'&&['Shift','Control','Alt','Meta'].includes(event.key))return;if(current===record)cancel();};
   for(const observed of new Set([doc,sourceDoc])){
    for(const type of ['pointerdown','keydown','input','copy','cut','paste'])listen(observed,type,interrupt,true);
    listen(observed,'visibilitychange',()=>{if(observed.hidden&&current===record)cancel();});
    for(const type of ['resize','orientationchange','pagehide','popstate'])listen(observed.defaultView,type,interrupt);
   }
   const tick=()=>{if(current!==record)return;if(!canMove()||sourceDoc.hidden||!layer.isConnected||win.innerWidth!==record.hostWidth||win.innerHeight!==record.hostHeight){release(record);return;}layer.dataset.phase=phaseAt(progress(record));record.raf=win.requestAnimationFrame(tick);};
   record.raf=win.requestAnimationFrame(tick);record.watchdog=win.setTimeout(()=>{if(current===record)cancel();},duration+4000);
   record.started=true;notify('storybook:journey-start',record);
   if(current!==record||record.released)return null;
   return Object.freeze({cancel(){if(current===record)cancel();},setDestination:values=>destination(record,values)});
  }catch{release(record);return null;}
 }
 const motion=()=>{if(quiet?.matches)cancel();};quiet?.addEventListener?.('change',motion);
 return {travel,cancel,state,destroy(){if(disposed)return;disposed=true;cancel();quiet?.removeEventListener?.('change',motion);}};
}
