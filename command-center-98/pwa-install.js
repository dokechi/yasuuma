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
