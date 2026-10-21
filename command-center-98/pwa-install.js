/* The top-level authenticated app owns installation, never the lounge iframe. */
(function(w){
 'use strict';if(w.parent!==w)return;
 const previous=w.CCInstall,retained=previous?.pending?.();previous?.dispose?.();
 let pending=retained||null,installed=false,busy=false;
 const standalone=()=>w.matchMedia?.('(display-mode: standalone)').matches||w.navigator.standalone===true;
 const state=()=>standalone()?'standalone':installed?'installed':pending?'available':'instructions';
 function send(value=state()){const frame=w.document.getElementById('ccCastleFrame');frame?.contentWindow.postMessage({channel:'cc-castle-v1',type:'install-state',state:value},w.location.origin);}
 async function request(){if(!pending||busy){send();return;}busy=true;const prompt=pending;pending=null;try{await prompt.prompt();const choice=await prompt.userChoice;send(choice?.outcome==='accepted'?'installed':'dismissed');}catch{send('dismissed');}finally{busy=false;}}
 const before=event=>{event.preventDefault();pending=event;send();};w.addEventListener('beforeinstallprompt',before);
 const after=()=>{installed=true;pending=null;send();};w.addEventListener('appinstalled',after);
 const receive=event=>{const frame=w.document.getElementById('ccCastleFrame');if(!frame||event.source!==frame.contentWindow||event.origin!==w.location.origin||event.data?.channel!=='cc-castle-v1')return;if(event.data.type==='ready')send();if(event.data.type==='install-request')request();};w.addEventListener('message',receive);
 w.CCInstall={state,request,pending:()=>pending,dispose(){for(const [type,fn]of [['beforeinstallprompt',before],['appinstalled',after],['message',receive]])w.removeEventListener?.(type,fn);}};
})(window);

/* A resumed tab keeps its old JavaScript. Offer a fresh launch without
   interrupting edits or clearing the user's login and device notes. */
(function(w){
 'use strict';if(w.parent!==w)return;
 w.CCRelease?.dispose?.();
 const baseline=w.CCLoadedManifest,d=w.document;
 if(!baseline||typeof w.fetch!=='function')return;
 let disposed=false,pending=false,lastCheck=0,notice=null;
 async function check(){
  if(disposed||pending||d.hidden||Date.now()-lastCheck<30000)return;
  pending=true;lastCheck=Date.now();
  try{
   const response=await w.fetch('./app-assets.json?v=20261021.9-refresh',{cache:'no-store',credentials:'omit'});
   if(!response.ok)return;
   const manifest=await response.json();
   if(disposed||!manifest||typeof manifest.shell!=='string'||!Array.isArray(manifest.styles)||!Array.isArray(manifest.scripts)||JSON.stringify(manifest)===baseline||notice)return;
   notice=d.createElement('aside');notice.id='ccReleaseNotice';notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
   notice.style.cssText='position:fixed;inset:auto 12px max(12px,env(safe-area-inset-bottom));z-index:2147483647;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:12px;padding:14px;background:#202633;color:#f4e5c5;border:1px solid #c2a164;border-radius:8px;font:15px/1.5 system-ui,sans-serif;box-shadow:0 4px 24px #0008';
   const label=d.createElement('span');label.textContent='新しい司令塔を使えます。';
   const button=d.createElement('button');button.type='button';button.textContent='最新版を開く';button.style.cssText='min-height:44px;padding:10px 18px;background:#f4e5c5;color:#202633;border:1px solid #c2a164;border-radius:5px;font:inherit;cursor:pointer';
   button.addEventListener('click',()=>{const url=new URL('app-v130.html',w.location.href);url.searchParams.set('v',String(Date.now()));url.hash=w.location.hash;w.location.replace(url.href);});
   notice.append(label,button);d.body.append(notice);
  }catch{}finally{pending=false;}
 }
 const visible=()=>{if(!d.hidden)check();};
 w.addEventListener('focus',check);w.addEventListener('pageshow',check);d.addEventListener('visibilitychange',visible);
 w.CCRelease={check,dispose(){disposed=true;notice?.remove();w.removeEventListener('focus',check);w.removeEventListener('pageshow',check);d.removeEventListener('visibilitychange',visible);}};
 check();
})(window);
