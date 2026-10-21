import {sampleEntry} from './entry-motion.js';
// The painting and door faces use the same coordinates; no WebGL is required.
const W=1536,H=1024,PLATE='assets/manor-lounge-v1.webp';
const FOLD_PLATE='assets/manor-lounge-fold-v1.webp';
const DOORS=[
 {id:'red',left:282,right:390,top:100,bottom:403,rightHinge:true,label:[349,167],points:[[0,0],[108,32],[108,303],[0,299]]},
 {id:'purple',left:645,right:727,top:57,bottom:331,label:[686,283],points:[[0,274],[82,274],[82,62],[75,37],[59,14],[40,0],[21,14],[6,37],[0,62]]},
 {id:'silver',left:867,right:1047,top:153,bottom:410,double:true,label:[957,350],points:[[0,6],[180,0],[180,257],[0,255]]},
 {id:'orange',left:1127,right:1245,top:133,bottom:428,label:[1186,282],points:[[0,295],[118,295],[118,63],[110,35],[92,13],[71,2],[55,0],[32,7],[13,24],[3,45],[0,68]]}
];
const clamp=t=>Math.max(0,Math.min(1,t)),smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
const polygon=(pts,w,h)=>`polygon(${pts.map(([x,y])=>`${x/w*100}% ${y/h*100}%`).join(',')})`;
function halfPolygon(points,bound,left){
 const out=[];
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length],ai=left?a[0]<=bound:a[0]>=bound,bi=left?b[0]<=bound:b[0]>=bound;
  if(ai)out.push(a);
  if(ai!==bi){const t=(bound-a[0])/(b[0]-a[0]);out.push([bound,a[1]+(b[1]-a[1])*t]);}
 }
 return out;
}
export async function createHybridWorld({app,host,rooms,labels,getSettings,getPhase}){
 const plate=new Image();plate.src=PLATE;await plate.decode();
 const stage=document.createElement('div');stage.className='painting-world';stage.setAttribute('aria-hidden','true');
 plate.className='painting-plate';plate.alt='';stage.append(plate);host.append(stage);
 const entries=new Map();
 let base=1,s=1,cx=W/2,cy=H/2,motion=null,raf=0,paused=false,last=0,focused=null,hovered=null,mouse={x:0,y:0},square=null,sceneH=H,offsetY=0,panX=0,drag=null;
 for(const d of DOORS){
  const r=rooms.find(r=>r.id===d.id),w=d.right-d.left,h=d.bottom-d.top;
  const entrance=document.createElement('div');entrance.className='physical-entrance';entrance.dataset.room=d.id;
  entrance.style.cssText=`left:${d.left}px;top:${d.top}px;width:${w}px;height:${h}px;--door-clip:${polygon(d.points,w,h)}`;
  const aperture=document.createElement('div');aperture.className='physical-aperture';
  const inner=new Image();inner.src=`assets/${d.id}.webp`;inner.alt='';inner.style.objectPosition=r.focus;aperture.append(inner);entrance.append(aperture);
  const leaves=[];
  for(let part=0;part<(d.double?2:1);part++){
   const left=d.double?part*w/2:0,lw=d.double?w/2:w,right=d.double?part===1:d.rightHinge;
   const pts=d.double?halfPolygon(d.points,w/2,part===0).map(([x,y])=>[x-left,y]):d.points;
   const leaf=document.createElement('div');leaf.className='physical-leaf';
   leaf.style.cssText=`left:${left}px;right:auto;width:${lw}px;background-image:url('${PLATE}');background-position:-${d.left+left}px -${d.top}px;clip-path:${polygon(pts,lw,h)};transform-origin:${right?'100%':'0'} 50%`;
   const back=document.createElement('div');back.className='physical-back';back.style.cssText=`left:${left}px;right:auto;width:${lw}px;clip-path:${polygon(pts,lw,h)};transform-origin:${right?'100%':'0'} 50%`;
   entrance.append(back,leaf);leaves.push({leaf,back,left,direction:right?1:-1});
  }
  stage.append(entrance);
  const glow=document.createElement('div');glow.className='threshold-glow';glow.style.cssText=`left:${d.left-20}px;top:${d.bottom-10}px;width:${w+40}px`;stage.append(glow);
  const target=document.createElement('button');target.type='button';target.tabIndex=-1;target.className='door-touch-target';target.dataset.room=d.id;target.setAttribute('aria-label',r.name+'の扉');host.append(target);
  target.addEventListener('click',()=>labels.get(d.id).click());target.addEventListener('pointerenter',()=>hovered=d.id);target.addEventListener('pointerleave',()=>hovered=null);
  labels.get(d.id).innerHTML=`<span class="door-name">${r.name}</span><span class="door-label-arrow" aria-hidden="true">›</span>`;
  entries.set(d.id,{d,r,entrance,leaves,aperture,glow,target,highlight:0,cx:(d.left+d.right)/2,cy:(d.top+d.bottom)/2});
 }
 // Keep the original silhouettes in front of door leaves, including the close chair.
 const foreground=new Image();foreground.src=PLATE;foreground.alt='';foreground.className='painting-foreground';
 const foregroundEdge=[[0,29],[2,22],[5,17],[11,15],[17,18],[20,24],[21,37],[25,34],[28,29],[34,28],[38,33],[41,43],[46,45],[51,48],[57,55],[62,43],[66,35],[69,32],[73,31],[76,35],[80,47],[81,32],[82,23],[85,14],[89,10],[94,10],[98,14],[100,19]];stage.append(foreground);
 function variant(useSquare){
  square=useSquare;sceneH=square?1536:H;offsetY=square?244:0;const src=square?FOLD_PLATE:PLATE;
  plate.src=src;foreground.src=src;stage.style.height=sceneH+'px';plate.style.height=foreground.style.height=sceneH+'px';
  foreground.style.clipPath='polygon('+foregroundEdge.map(([x,y])=>`${x}% ${(y*H/100+offsetY)/sceneH*100}%`).concat(['100% 100%','0% 100%']).join(',')+')';
  app.classList.toggle('square-lounge',square);
  for(const e of entries.values()){
   e.entrance.style.top=(e.d.top+offsetY)+'px';e.glow.style.top=(e.d.bottom+offsetY-10)+'px';
   for(const l of e.leaves){l.leaf.style.backgroundImage=`url('${src}')`;l.leaf.style.backgroundSize=`${W}px ${sceneH}px`;l.leaf.style.backgroundPosition=`-${e.d.left+l.left}px -${e.d.top+offsetY}px`;}
  }
 }
 function render(){
  const tx=app.clientWidth/2-cx*s,ty=app.clientHeight/2-cy*s;stage.style.transform=`translate3d(${tx}px,${ty}px,0) scale(${s})`;
  for(const[id,e]of entries){
   const bw=Math.max(82,Math.min(126,(e.d.right-e.d.left)*s*1.25));
   labels.get(id).style.cssText=`left:${e.d.label[0]*s+tx}px;top:${(e.d.label[1]+offsetY)*s+ty}px;width:${bw}px;height:32px`;
   e.target.style.cssText=`left:${e.d.left*s+tx}px;top:${(e.d.top+offsetY)*s+ty}px;width:${(e.d.right-e.d.left)*s}px;height:${(e.d.bottom-e.d.top)*s}px;clip-path:${polygon(e.d.points,e.d.right-e.d.left,e.d.bottom-e.d.top)}`;
  }
 }
 function resize(){const w=app.clientWidth,h=app.clientHeight;if(w<=0||h<=0)return;if(square!==(w/h<1.25))variant(w/h<1.25);base=square&&w/h>=.7?Math.min(w/W,h/sceneH):Math.max(w/W,h/sceneH);const limit=Math.max(0,(W-w/base)/2);panX=Math.max(-limit,Math.min(limit,panX));app.classList.toggle('compact-hall',w/h<1.05);app.classList.toggle('pannable-lounge',w/h<.7);document.getElementById('town-hint').textContent=w/h<.7?'◇ 左右に動かして、扉を選ぶ':'◇ 絵の中の扉を押して、部屋へ';if(!motion){s=base;cx=W/2+panX;cy=sceneH/2;}render();}
 host.addEventListener('pointerdown',ev=>{if(ev.pointerType==='touch'&&app.clientWidth/app.clientHeight<.7&&getPhase()==='town')drag={x:ev.clientX,pan:panX,id:ev.pointerId};});
 host.addEventListener('pointermove',ev=>{if(!drag||ev.pointerId!==drag.id)return;const dx=ev.clientX-drag.x;if(Math.abs(dx)<8)return;host.setPointerCapture(ev.pointerId);const limit=Math.max(0,(W-app.clientWidth/base)/2);panX=Math.max(-limit,Math.min(limit,drag.pan-dx/base));});
 host.addEventListener('pointerup',()=>drag=null);host.addEventListener('pointercancel',()=>drag=null);
 host.addEventListener('pointermove',ev=>{mouse.x=(ev.clientX/app.clientWidth-.5)*2;mouse.y=(ev.clientY/app.clientHeight-.5)*2;});host.addEventListener('pointerleave',()=>{mouse.x=mouse.y=0;});
 function frame(now){
  raf=0;if(paused)return;const dt=Math.min((now-last)/1000,.05);last=now;const settings=getSettings();
  if(motion){
   const p=clamp((now-motion.start)/motion.duration),e=entries.get(motion.id),cue=sampleEntry(motion.id,p);
   const final=Math.max(app.clientWidth/(e.d.right-e.d.left),app.clientHeight/(e.d.bottom-e.d.top))*1.1;
   s=base/(1-cue.travel*(1-base/final));cx=W/2+panX+(e.cx-W/2-panX)*cue.aim+cue.x;cy=sceneH/2+(e.cy+offsetY-sceneH/2)*cue.aim+cue.y;
   for(const l of e.leaves){l.leaf.style.transform=`rotateY(${l.direction*cue.open*cue.angle}deg) translateZ(1px)`;l.back.style.transform=`rotateY(${l.direction*cue.open*cue.angle}deg) translateZ(-2px)`;}
   e.aperture.style.filter=`brightness(${cue.brightness})`;e.glow.style.opacity=String(.12+cue.open*.7);app.style.setProperty('--entry-light',String(cue.light));
  }else{
   cx=W/2+panX+(settings.ambient&&!settings.reduce?mouse.x*1.3:0);cy=sceneH/2+(settings.ambient&&!settings.reduce?mouse.y*.7:0);s=base;
   for(const[id,e]of entries){const wanted=(focused||hovered)===id?1:0;e.highlight+=(wanted-e.highlight)*Math.min(1,dt*14);e.glow.style.opacity=String(.06+e.highlight*.7);for(const l of e.leaves){l.leaf.style.transform='translateZ(1px)';l.back.style.transform='translateZ(-2px)';}}
  }
  render();if(!document.hidden)raf=requestAnimationFrame(frame);
 }
 function resume(){if(!paused&&raf)return;paused=false;last=performance.now();raf=requestAnimationFrame(frame);}
 function pause(){paused=true;cancelAnimationFrame(raf);raf=0;}
 new ResizeObserver(resize).observe(app);resize();resume();
 return {enter(id,duration){motion={id,start:performance.now(),duration};app.dataset.entering=id;resume();},reset(){motion=null;focused=hovered=null;mouse.x=mouse.y=0;app.dataset.entering='';app.style.removeProperty('--entry-light');for(const e of entries.values()){for(const l of e.leaves){l.leaf.style.transform='translateZ(1px)';l.back.style.transform='translateZ(-2px)';}e.aperture.style.filter='';e.glow.style.opacity='.06';}resize();resume();},highlight(id){focused=id;app.dataset.hover=id||'';},pause,resume};
}
