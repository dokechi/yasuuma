const controls='button,a[href],summary,input[type=checkbox],input[type=radio],select';
export function interactionKind(el){
 if(el.matches('.place-label,.door-touch-target,.quick,[data-feedback="door"]'))return 'door';
 if(el.matches('#back,#settings-close,[data-lounge-home],#desk-history-close,#desk-copy-close'))return 'back';
 if(el.matches('.manuscript-card,[data-desk-filter],.desk-variants button,[data-sourcing-sub],#desk-history,[data-feedback="paper"]'))return 'paper';
 if(el.matches('summary,input,select,#settings-open,#sound,#desk-pin,#desk-focus,[data-feedback="latch"]'))return 'latch';
 return 'tap';
}
export function createInteractionFeedback({doc=document,win=window,play=()=>{},active=()=>true,reduced=()=>false,room=()=> 'red',effectsHost=doc.getElementById('touch-effects')}={}){
 const held=new Map(),keys=new Set(),recent=new WeakMap(),timers=new Map();
 const valid=el=>el&&!el.disabled&&el.getAttribute('aria-disabled')!=='true'&&active();
 const control=event=>{const el=event.target?.closest?.(controls);return valid(el)?el:null;};
 const muteControl=el=>el.matches('#sound,#sound-setting,#effectsEnabled,.castle-sound-toggle');
 const down=el=>el.classList.add(reduced()?'feedback-still':'feedback-down');
 function sound(el){if(!muteControl(el)&&!el.matches('[data-feedback-preview],input,select'))play(interactionKind(el),el.dataset.room||room());}
 function release(el,animate=true){
  el.classList.remove('feedback-down');el.classList.remove('feedback-still');clearTimeout(timers.get(el));
  if(animate&&!reduced()&&!el.matches('.door-touch-target')){el.classList.remove('feedback-release');void el.offsetWidth;el.classList.add('feedback-release');timers.set(el,setTimeout(()=>{el.classList.remove('feedback-release');timers.delete(el);},210));}
 }
 function contact(el,x,y){
  if(!effectsHost||reduced()||el.matches('.door-touch-target'))return;
  const mark=doc.createElement('i');mark.className='contact-halo';mark.style.left=x+'px';mark.style.top=y+'px';effectsHost.append(mark);mark.addEventListener('animationend',()=>mark.remove(),{once:true});setTimeout(()=>mark.remove(),340);
 }
 doc.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;const el=control(event);if(!el)return;
  down(el);held.set(event.pointerId,{el,x:event.clientX,y:event.clientY,touch:event.pointerType==='touch',cancelled:false});
  if(event.pointerType!=='touch')sound(el);
 },true);
 doc.addEventListener('pointermove',event=>{const h=held.get(event.pointerId);if(h&&!h.cancelled&&Math.hypot(event.clientX-h.x,event.clientY-h.y)>10){h.cancelled=true;release(h.el,false);}},true);
 doc.addEventListener('pointerup',event=>{
  const h=held.get(event.pointerId);if(!h)return;held.delete(event.pointerId);
  const commit=!h.cancelled&&h.el.contains(event.target)&&valid(h.el);
  release(h.el,commit);if(commit){recent.set(h.el,Date.now());if(h.touch)sound(h.el);contact(h.el,event.clientX,event.clientY);}
 },true);
 doc.addEventListener('pointercancel',event=>{const h=held.get(event.pointerId);if(h){release(h.el,false);held.delete(event.pointerId);}},true);
 doc.addEventListener('keydown',event=>{if(event.repeat||event.isComposing||!['Enter',' '].includes(event.key))return;const el=control(event);if(!el||el.matches('select,input'))return;keys.add(el);recent.set(el,Date.now());down(el);sound(el);},true);
 doc.addEventListener('keyup',()=>{for(const el of keys)release(el);keys.clear();},true);
 // Native screen-reader clicks may arrive without a preceding key/pointer event.
 doc.addEventListener('click',event=>{if(!event.isTrusted||event.detail!==0)return;const el=control(event);if(el&&Date.now()-(recent.get(el)||0)>500){recent.set(el,Date.now());sound(el);release(el);}},true);
 doc.addEventListener('change',event=>{const el=control(event);if(el&&!muteControl(el)&&el.matches('input,select'))play('latch',room());},true);
 function clear(){for(const h of held.values())release(h.el,false);held.clear();for(const el of keys)release(el,false);keys.clear();for(const[el,t]of timers){clearTimeout(t);el.classList.remove('feedback-release');}timers.clear();effectsHost?.replaceChildren();}
 win.addEventListener('blur',clear);doc.addEventListener('visibilitychange',()=>{if(doc.hidden)clear();});
 return {clear};
}
