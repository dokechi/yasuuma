/* Same-origin presentation bridge. No credentials, records or route ownership. */
(function(w){
 'use strict';const d=w.document,frame=d.getElementById('ccCastleFrame');if(!frame)return;
 const origin=w.location.origin,rooms=new Set(['insurance','otoku','rakuten','lottery','sourcing']);
 const reduced=w.matchMedia('(prefers-reduced-motion: reduce)');let preference=false,engine=null,lastSpec=null,nativeSpec=null,serial=0,capture=null,departure=null;
 const send=(type,data={})=>frame.contentWindow?.postMessage({channel:'cc-castle-v1',type,...data},origin);
 const cancel=()=>{engine?.cancel();send('journey-state',{active:false});};
 const root=new URL('./lounge/assets/',w.location.href).href;
 Promise.all([import('./lounge/castle-journey.js?v=20261101.1-living'),import('./lounge/castle-foreground.js?v=20261101.9-workbook')]).then(([{createCastleJourney},{captureCastleForeground}])=>{
  capture=()=>{try{const rect=frame.getBoundingClientRect();return captureCastleForeground(frame.contentDocument,{document:d,offsetX:rect.left,offsetY:rect.top,surfaceTop:rect.top});}catch{return null;}};
  w.CCCastleJourneyCapture=()=>{departure=capture();};
  if(w.getComputedStyle(d.documentElement).getPropertyValue('--castle-journey-ready').trim()!=='1')return;
  engine=createCastleJourney({document:d,assetRoot:root,reducedMotion:()=>reduced.matches||preference});d.body.dataset.castleJourneyHost='ready';send('journey-capability',{ready:true});
 }).catch(()=>send('journey-capability',{ready:false}));
 function normalize(value){
  if(!value||!rooms.has(value.room)||!['in','out','switch'].includes(value.direction))return null;
  const o=value.origin,rect=frame.getBoundingClientRect();if(!o||!rect.width||!rect.height)return null;
  for(const key of ['left','top','width','height','stageLeft','stageTop','scale'])if(!Number.isFinite(o[key]))return null;
  if(o.width<=0||o.height<=0||o.scale<=0||o.scale>20||Math.abs(o.stageLeft)>20000||Math.abs(o.stageTop)>20000)return null;
  const child={...o,left:Math.max(-10000,Math.min(10000,o.left))+rect.left,top:Math.max(-10000,Math.min(10000,o.top))+rect.top,width:Math.min(o.width,rect.width),height:Math.min(o.height,rect.height)};
  return {room:value.room,direction:value.direction,origin:child,surfaceTop:rect.top,quick:value.quick===true||!engine,duration:Math.max(400,Math.min(1200,Number(value.duration)||780)),...(rooms.has(value.sourceRoom)?{sourceRoom:value.sourceRoom}:{})};
 }
 w.addEventListener('message',event=>{
  const m=event.data;if(event.origin!==origin||event.source!==frame.contentWindow||m?.channel!=='cc-castle-v1')return;
  if(m.type==='ready'||m.type==='journey-capability')send('journey-capability',{ready:!!engine});
  if(m.type==='journey-preferences'&&typeof m.reduced==='boolean'){preference=m.reduced;if(preference)cancel();}
  if(m.type==='journey-cancel')cancel();
  if(m.type==='journey'){const spec=normalize(m.spec);if(!spec)return;serial++;lastSpec=spec;spec.foreground=spec.direction==='out'?departure:capture?.();departure=null;engine?.travel(spec);send('journey-state',{active:!!engine?.state().active,duration:spec.duration});}
 });
 d.addEventListener('cc:castle-native',event=>{serial++;nativeSpec=event.detail?.action==='sourcing'&&lastSpec?.room==='sourcing'?lastSpec:null;if(!nativeSpec)cancel();});
 d.addEventListener('cc:castle-home',()=>{
  const saved=nativeSpec;nativeSpec=null;cancel();const version=++serial;if(!saved)return;
  // Let the existing host reveal the iframe first. The child computes fresh
  // geometry, including a Fold resize, rather than replaying stale coordinates.
  w.requestAnimationFrame(()=>{if(version===serial&&!frame.hidden)send('journey-return',{room:saved.room,instant:saved.quick});});
 });
 d.addEventListener('castle:journey-end',()=>send('journey-state',{active:false}));
 d.addEventListener('keydown',event=>{if(event.key==='Escape'&&engine?.state().active){event.preventDefault();event.stopImmediatePropagation();cancel();}},true);
 d.addEventListener('pointerdown',()=>{if(engine?.state().active)cancel();},true);
 reduced.addEventListener('change',()=>{if(reduced.matches)cancel();});
 d.addEventListener('visibilitychange',()=>{if(d.hidden)cancel();});w.addEventListener('pagehide',()=>{serial++;cancel();});
})(window);
