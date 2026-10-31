/* Tactile, optional world details. Never routes, edits records, or owns audio. */
export function mountCastlePresence({world, viewport, stage, controls, rooms, reduced}) {
 const doc=world.ownerDocument, win=doc.defaultView, listeners=[], timers=new Set();
 const on=(target,type,handler,options)=>{target?.addEventListener(type,handler,options);listeners.push(()=>target?.removeEventListener(type,handler,options));};
 const later=(fn,ms)=>{const id=win.setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);return id;};
 const make=(tag,cls)=>{const n=doc.createElement(tag);n.className=cls;return n;};
 const edge=make('div','castle-depth-edge');edge.setAttribute('aria-hidden','true');viewport.append(edge);
 const lights=make('div','castle-room-lights');lights.setAttribute('aria-hidden','true');
 for(const room of rooms.filter(r=>!r.sealed)){const light=make('i','castle-room-light');light.dataset.room=room.key;light.style.cssText=`left:${room.x*100}%;top:${room.y*100}%;width:${room.w*100}%;height:${room.h*100}%`;lights.append(light);}stage.append(lights);
 const toolbar=make('div','castle-experience-controls');
 const sound=make('button','castle-sound-toggle');sound.type='button';sound.dataset.feedback='latch';
 const settings=make('button','castle-experience-settings');settings.type='button';settings.textContent='演出';settings.setAttribute('aria-label','移動・光・音の設定');settings.setAttribute('aria-haspopup','dialog');
 toolbar.append(sound,settings);viewport.append(toolbar);
 const orrery=make('button','castle-orrery');orrery.type='button';orrery.dataset.energy='rest';orrery.dataset.feedback='latch';orrery.setAttribute('aria-label','天球儀を回して城の灯りを見る');orrery.title='押す・長押し・横に動かすと、城の灯りが応えます';orrery.innerHTML='<span class="castle-orrery-orbit" aria-hidden="true"></span><span class="castle-orrery-core" aria-hidden="true"></span>';
 viewport.append(orrery);
 const note=make('span','sr-only');note.setAttribute('aria-live','polite');toolbar.append(note);
 const originalSound=doc.getElementById('sound'),ambient=doc.getElementById('ambient-setting');
 function sync(){const enabled=originalSound?.getAttribute('aria-pressed')==='true';sound.textContent=enabled?'音 ON':'音 OFF';sound.setAttribute('aria-pressed',String(enabled));sound.setAttribute('aria-label',enabled?'効果音をオフにする':'効果音をオンにする');world.dataset.ambient=ambient?.checked&&!reduced()?'on':'off';if(world.dataset.ambient==='off'){world.style.setProperty('--look-x','0px');world.style.setProperty('--look-y','0px');}if(reduced())reset();}
 on(sound,'click',()=>{originalSound?.click();sync();});on(settings,'click',()=>doc.getElementById('settings-open')?.click());on(ambient,'change',sync);on(doc.getElementById('reduce-setting'),'change',sync);
 const soundObserver=new win.MutationObserver(sync);if(originalSound)soundObserver.observe(originalSound,{attributes:true,attributeFilter:['aria-pressed']});
 let raf=0,hold=null,angle=0,turn=0,ignoreClick=false,geometry=null;
 function reset(){if(raf)win.cancelAnimationFrame(raf);raf=0;hold=null;orrery.dataset.energy='rest';world.dataset.orrery='rest';world.style.setProperty('--orrery-turn','0deg');world.style.setProperty('--look-x','0px');world.style.setProperty('--look-y','0px');delete world.dataset.reacting;}
 function glow(){const id=++turn;orrery.dataset.energy='lit';world.dataset.orrery='lit';world.style.setProperty('--orrery-turn',reduced()?'0deg':angle+'deg');note.textContent='天球儀に応えて、城の窓に明かりが灯りました。';later(()=>{if(id===turn){orrery.dataset.energy='rest';world.dataset.orrery='rest';world.style.setProperty('--orrery-turn','0deg');}},1100);}
 function activate(){angle=angle>=0?-12:12;glow();}
 on(orrery,'click',()=>{if(ignoreClick){ignoreClick=false;return;}activate();});
 on(orrery,'keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();e.stopPropagation();angle=e.key==='ArrowLeft'?-12:12;glow();}});
 on(orrery,'pointerdown',e=>{if(e.button!==0)return;ignoreClick=false;turn++;hold={x:e.clientX,y:e.clientY,start:win.performance.now(),moved:false};orrery.dataset.energy='turning';world.dataset.orrery='turning';if(reduced())return;const tick=()=>{if(!hold)return;angle=Math.min(12,(win.performance.now()-hold.start)/70);world.style.setProperty('--orrery-turn',angle+'deg');if(win.performance.now()-hold.start<850)raf=win.requestAnimationFrame(tick);};raf=win.requestAnimationFrame(tick);});
 on(orrery,'pointermove',e=>{if(!hold)return;const dx=e.clientX-hold.x,dy=e.clientY-hold.y;if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){reset();return;}if(Math.abs(dx)>8){hold.moved=true;if(raf)win.cancelAnimationFrame(raf);raf=0;angle=Math.max(-18,Math.min(18,dx/4));if(!reduced())world.style.setProperty('--orrery-turn',angle+'deg');}});
 on(win,'pointerup',()=>{if(!hold)return;ignoreClick=hold.moved||win.performance.now()-hold.start>300;if(raf)win.cancelAnimationFrame(raf);raf=0;hold=null;glow();later(()=>{ignoreClick=false;},0);});on(orrery,'pointercancel',reset);on(win,'blur',reset);
 for(const [key,{button}] of controls){if(button.disabled)continue;button.dataset.feedback='door';const handle=make('span','castle-door-handle');handle.setAttribute('aria-hidden','true');button.append(handle);const react=()=>{world.dataset.reacting=key;button.dataset.contact='pressed';later(()=>{delete button.dataset.contact;if(world.dataset.reacting===key)delete world.dataset.reacting;},450);};on(button,'pointerdown',react);on(button,'keydown',e=>{if(!e.repeat&&['Enter',' '].includes(e.key))react();});on(button,'pointercancel',()=>{delete button.dataset.contact;delete world.dataset.reacting;});}
 const fine=win.matchMedia('(hover:hover) and (pointer:fine)');
 on(viewport,'pointermove',e=>{if(hold||reduced()||world.dataset.ambient!=='on'||!fine.matches||world.hidden)return;const r=viewport.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;world.style.setProperty('--look-x',(x*8).toFixed(2)+'px');world.style.setProperty('--look-y',(y*5).toFixed(2)+'px');});on(viewport,'pointerleave',()=>{world.style.setProperty('--look-x','0px');world.style.setProperty('--look-y','0px');});
 on(doc,'visibilitychange',()=>{if(doc.hidden)reset();});
 function layout(value){geometry=value;if(!value)return;const x=value.left+1536*.52*value.scale,y=value.top+1024*.435*value.scale;orrery.hidden=x<24||y<24||x>value.width-24||y>value.height-24;orrery.style.left=(x-24)+'px';orrery.style.top=(y-24)+'px';}
 sync();return {layout,sync,reset,destroy(){reset();for(const off of listeners)off();for(const id of timers)win.clearTimeout(id);soundObserver.disconnect();for(const n of [toolbar,orrery,edge,lights])n.remove();for(const {button}of controls.values())button.querySelector('.castle-door-handle')?.remove();}};
}
