/* Reorders existing controls only; account keys and manuscript data never change. */
export const orderStorageKey='cc-stained-order-v1';
export function normalizeOrder(saved,keys){
  return [...new Set([...(Array.isArray(saved)?saved:[]).filter(k=>keys.includes(k)),...keys])];
}
export function installGalleryOrder({rail,done,hint,trigger,onChange=()=>{},holdMs=500}){
  const win=rail.ownerDocument.defaultView,doc=rail.ownerDocument;
  const cards=new Map([...rail.children].map(c=>[c.dataset.key,c])),keys=[...cards.keys()];
  let editing=false,gesture=null,timer=0,raf=0,suppressUntil=0;
  const order=()=>[...rail.children].map(c=>c.dataset.key);
  const apply=values=>normalizeOrder(values,keys).forEach(k=>rail.append(cards.get(k)));
  try{apply(JSON.parse(win.localStorage.getItem(orderStorageKey)));}catch{}
  const announce=text=>{hint.textContent=text;};
  const save=()=>{try{win.localStorage.setItem(orderStorageKey,JSON.stringify(order()));announce('順番を保存しました');}catch{announce('この画面では並べ替え済みです。端末への保存ができませんでした');}onChange(order());};
  const mode=value=>{editing=value;rail.classList.toggle('sg-ordering',value);done.hidden=!value;hint.hidden=!value;if(trigger)trigger.hidden=value;for(const c of cards.values())c.setAttribute('aria-description',value?'左右にドラッグ、または左右キーで並べ替え。完了で終了':'長押しで並べ替え。Alt と左右キーでも移動できます');if(value)announce('左右に動かして並べ替え。終わったら「完了」');};
  function restoreStyle(){if(gesture){gesture.card.style.transform='';gesture.card.classList.remove('sg-dragging');}win.cancelAnimationFrame(raf);raf=0;rail.style.scrollSnapType='';}
  function end(cancel=false){win.clearTimeout(timer);if(!gesture)return;const g=gesture;
    restoreStyle();if(g.drag){if(cancel)apply(g.before);else save();}if(g.drag||g.swipe)suppressUntil=Date.now()+450;
    gesture=null;try{rail.releasePointerCapture(g.id);}catch{}
  }
  function place(){const g=gesture;if(!g?.drag)return;
    g.card.style.transform='';
    const others=[...rail.children].filter(c=>c!==g.card);
    const target=others.find(c=>{const r=c.getBoundingClientRect();return g.x<r.left+r.width/2;});
    if(target){if(g.card.nextElementSibling!==target)rail.insertBefore(g.card,target);}else if(rail.lastElementChild!==g.card)rail.append(g.card);
    const r=g.card.getBoundingClientRect();g.card.style.transform=`translateX(${g.x-g.grab-r.left}px) scale(1.025)`;
  }
  function edge(){if(!gesture?.drag)return;const r=rail.getBoundingClientRect(),x=gesture.x;
    const speed=x<r.left+48?-Math.min(15,(r.left+48-x)/4):x>r.right-48?Math.min(15,(x-r.right+48)/4):0;
    if(speed){rail.scrollLeft=Math.max(0,Math.min(rail.scrollWidth-rail.clientWidth,rail.scrollLeft+speed));place();}
    raf=win.requestAnimationFrame(edge);
  }
  function startDrag(){if(!gesture)return;mode(true);gesture.drag=true;gesture.before=order();gesture.card.classList.add('sg-dragging');rail.style.scrollSnapType='none';try{rail.setPointerCapture(gesture.id);}catch{}place();edge();}
  const down=e=>{if(e.isPrimary===false||e.button>0)return;const card=e.target.closest('.sg-card');if(!card||card.parentNode!==rail)return;
    end(true);gesture={card,id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,scroll:rail.scrollLeft,grab:e.clientX-card.getBoundingClientRect().left,drag:false,swipe:false};
    suppressUntil=0;
    if(editing)startDrag();else timer=win.setTimeout(startDrag,holdMs);
  };
  const move=e=>{const g=gesture;if(!g||e.pointerId!==g.id)return;g.x=e.clientX;g.y=e.clientY;
    if(g.drag){e.preventDefault();place();return;}
    const dx=g.x-g.startX,dy=g.y-g.startY;
    if(Math.hypot(dx,dy)>16){win.clearTimeout(timer);g.swipe=true;}
    if(g.swipe&&Math.abs(dx)>Math.abs(dy)){e.preventDefault();rail.style.scrollSnapType='none';rail.scrollLeft=g.scroll-dx;}
  };
  const up=e=>{if(gesture?.id===e.pointerId)end();};
  const cancel=e=>{if(gesture?.id===e.pointerId)end(true);};
  // Touch implicitly captures the pressed card. Its loss during transfer to the
  // rail bubbles here, but is not cancellation of the rail's active drag.
  const lost=e=>{if(e.target===rail&&gesture?.id===e.pointerId)end(true);};
  const begin=()=>mode(true);
  const click=e=>{if(editing||Date.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}};
  const key=e=>{const card=e.target.closest('.sg-card');if(!card)return;
    if(editing&&['Escape','Enter',' '].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();end(e.key==='Escape');mode(false);return;}
    if((editing||e.altKey)&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){
      e.preventDefault();e.stopImmediatePropagation();const list=[...rail.children],i=list.indexOf(card),j=e.key==='Home'?0:e.key==='End'?list.length-1:Math.max(0,Math.min(list.length-1,i+(e.key==='ArrowRight'?1:-1)));
      if(i!==j){list.splice(i,1);list.splice(j,0,card);apply(list.map(c=>c.dataset.key));card.focus({preventScroll:true});card.scrollIntoView({block:'nearest',inline:'nearest'});save();announce(`${card.querySelector('.sg-label').textContent}を${j+1}番目に移動`);}
    }
  };
  const finish=()=>{end();mode(false);};
  const context=e=>{if(e.target.closest('.sg-card'))e.preventDefault();};
  const storage=e=>{if(e.key===orderStorageKey&&!editing&&!gesture){try{apply(JSON.parse(e.newValue));onChange(order());}catch{}}};
  rail.addEventListener('pointerdown',down);rail.addEventListener('pointermove',move,{passive:false});rail.addEventListener('pointerup',up);rail.addEventListener('pointercancel',cancel);rail.addEventListener('lostpointercapture',lost);
  rail.addEventListener('click',click,true);rail.addEventListener('keydown',key,true);rail.addEventListener('contextmenu',context);done.addEventListener('click',finish);trigger?.addEventListener('click',begin);win.addEventListener('storage',storage);mode(false);
  return {order,begin,finish,destroy(){end(true);for(const [type,fn,capture]of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancel],['lostpointercapture',lost],['click',click,true],['keydown',key,true],['contextmenu',context]])rail.removeEventListener(type,fn,capture);done.removeEventListener('click',finish);trigger?.removeEventListener('click',begin);win.removeEventListener('storage',storage);}};
}
