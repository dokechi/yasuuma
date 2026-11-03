import{surface,at,project}from'./paper-fold.js?v=20261103.2-notebook';
export function createReadingFold({card,leaf,svg,art,visual,window:win,reduced=()=>false}={}){
 const draw=surface(svg);let value=0,frame=0,serial=0,settle=null,target=0;
 const clean=()=>{card.style.height='';leaf.style.transform='';leaf.style.maxHeight='';art.style.transform='';for(const n of art.querySelectorAll('.actor'))n.style.transform='';delete card.dataset.foldMotion;card.dataset.curve='0';};
 const resting=()=>draw(card.clientWidth,card.clientHeight,0);
 function cancel(){serial++;if(frame)win.cancelAnimationFrame(frame);frame=0;settle=null;clean();}
 function finish(){const done=settle;serial++;if(frame)win.cancelAnimationFrame(frame);frame=0;value=target;settle=null;clean();resting();done?.();}
 function to(next,{closedHeight,done=()=>{}}={}){const currentHeight=card.getBoundingClientRect().height;cancel();target=next;settle=done;const from=value,stamp=++serial,start=win.performance.now(),begin=next===1&&from===0?closedHeight:currentHeight,end=next===1?Math.max(card.scrollHeight,card.getBoundingClientRect().height):closedHeight;
  if(reduced()||!win.requestAnimationFrame||!card.clientWidth){finish();return;}
  card.dataset.foldMotion=next===1?'opening':'closing';
  const tick=now=>{if(stamp!==serial)return;if(reduced()){finish();return;}const t=Math.min(1,(now-start)/650),ease=t*t*(3-2*t);value=from+(next-from)*ease;card.style.height=(begin+(end-begin)*ease)+'px';const w=card.clientWidth,h=card.clientHeight,amount=Math.sin(Math.PI*value)*.8,{points}=draw(w,h,amount),anchorX=w*.42,anchorY=20,pose=project(at(points,.42,Math.min(1,anchorY/h)),w,h),dx=pose.x-anchorX,dy=pose.y-anchorY;leaf.style.transform=`translate(${dx}px,${dy}px)`;leaf.style.maxHeight=Math.max(0,h-leaf.offsetTop-10)+'px';
   const size=Math.min(art.offsetWidth,art.offsetHeight),footY=(art.offsetHeight-size)/2+size*184/190,ax=Math.max(0,Math.min(w-1,leaf.offsetLeft+visual.offsetLeft+art.offsetLeft+art.offsetWidth*.5)),ay=Math.max(0,Math.min(h-1,leaf.offsetTop+visual.offsetTop+art.offsetTop+footY)),foot=project(at(points,ax/w,ay/h),w,h);art.style.transformOrigin='50% '+footY+'px';art.style.transform=`translate(${foot.x-ax-dx}px,${foot.y-ay-dy}px) scale(${foot.scale})`;for(const [i,n]of [...art.querySelectorAll('.actor')].entries())n.style.transform=`rotateX(${Math.sin(Math.PI*value)*(i?62:76)}deg)`;card.dataset.curve=String(amount);card.__paperFoldProof={amount,ax,ay,foot};if(t<1)frame=win.requestAnimationFrame(tick);else finish();};frame=win.requestAnimationFrame(tick);
 }
 resting();return{to,finish,cancel,reset(){cancel();value=0;resting();},resting,get value(){return value;}};
}
