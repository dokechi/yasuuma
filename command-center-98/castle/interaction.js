// One confirmed activation path for pointer, touch and keyboard; never vibrate on scroll.
export function createButtonFeedback({doc=document,nav=navigator,reduced,enabled,now=()=>Date.now(),timer=setTimeout}={}){
 if(doc.__castleButtonFeedback)return doc.__castleButtonFeedback;
 let last=-Infinity;const seen=new WeakSet();
 function activate(event){
  if(!event.isTrusted||seen.has(event)||doc.hidden)return;seen.add(event);
  const button=event.target?.closest?.('button,summary');
  if(!button||button.disabled||button.getAttribute('aria-disabled')==='true')return;
  button.classList.add('button-confirmed');timer(()=>button.classList.remove('button-confirmed'),110);
  const time=now();if(time-last<120||!enabled()||reduced.matches)return;
  last=time;if(typeof nav.vibrate==='function'){try{nav.vibrate(8);}catch{}}
 }
 doc.addEventListener('click',activate,true);
 return doc.__castleButtonFeedback={activate};
}
