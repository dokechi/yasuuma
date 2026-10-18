// Cache only this app's static shell and fetched art. Drafts remain in localStorage.
const CACHE='castle-production-shell-v37',PREFIX='castle-production-shell-';
const MUSIC_CACHE='castle-music-harvest-v1';
const SHELL=['./home-cleanup.css?v=36','./interaction.js?v=34','./polish.css?v=33','./assets/kyun-study-v1-display.webp','./assets/kyun-writer-v1-display.webp','./assets/choi-display.webp','./assets/fp-display.webp','./assets/shiire-display.webp','./music.js?v=34','./audio-ui.css?v=34','./reading-ux.css?v=30','./map-entrances.css?v=30','./','./index.html','./entry-v37.html','./app.css?v=33','./workbench.css?v=29','./app.js?v=36','./notebook.js?v=31','./workbench.js?v=36','./world.js?v=33','./feedback.js?v=35','./production.js?v=36','./character-rig.js?v=24','./skirt-action.js?v=24','./scene-manifest.js?v=33','./scene-motion.js?v=33','./character-scenes.js?v=35','./character-scenes.css?v=37','./persona.js?v=28','./persona-lines.js?v=28',...['19016','19017','19018','19020','19079','19080'].map(id=>`./assets/user-${id}-display.webp`),...['kyun','choi','fp'].flatMap(key=>['welcome','work','rest','tea','special'].map(id=>`./assets/scene-${key}-${id}-v1.jpg`))];
SHELL.push('./assets/town-display.webp','./assets/town-map-v1-display.webp');
const base=new URL('./',self.location.href);
// Audio is fetched only after an explicit play gesture. Store the complete file
// so subsequent native media Range requests also work without a connection.
async function musicResponse(request){
 const cache=await caches.open(MUSIC_CACHE),key=new URL(request.url).href;
 let response=await cache.match(key);
 if(!response)for(const name of await caches.keys()){if(!name.startsWith(PREFIX)||name===CACHE)continue;response=await(await caches.open(name)).match(key);if(response)break;}
 if(!response){response=await fetch(key);if(!await valid(response)||response.status!==200)return response;try{await cache.put(key,response.clone());}catch{}}
 const range=request.headers.get('range');if(!range)return response;
 const bytes=await response.arrayBuffer(),size=bytes.byteLength,match=/^bytes=(\d*)-(\d*)$/.exec(range);
 let start=0,end=size-1;
 if(match){if(match[1]){start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}else if(match[2])start=Math.max(0,size-Number(match[2]));else start=size;}
 if(!match||start>=size||end<start)return new Response(null,{status:416,headers:{'content-range':`bytes */${size}`}});
 return new Response(bytes.slice(start,end+1),{status:206,headers:{'content-type':response.headers.get('content-type')||'application/octet-stream','content-length':String(end-start+1),'content-range':`bytes ${start}-${end}/${size}`,'accept-ranges':'bytes'}});
}
async function valid(response,html=false){if(!response||!response.ok||response.type==='opaque'||response.redirected)return false;if(html)return response.headers.get('content-type')?.includes('text/html')&&(await response.clone().text()).includes('id="app"');return !response.headers.get('content-type')?.includes('text/html');}
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await Promise.all(SHELL.map(async path=>{const url=new URL(path,base).href;const response=await fetch(url,{cache:'reload'});if(!await valid(response,path==='./'||path==='./index.html'||path==='./entry-v37.html'))throw Error('Incomplete app shell');await cache.put(url,response);}));})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const music=await caches.open(MUSIC_CACHE);for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE){const previous=await caches.open(name);let retain=false;for(const extension of ['m4a','ogg']){const url=new URL(`audio/Harvest_Festival_loop.${extension}`,base).href;if(await music.match(url))continue;const audio=await previous.match(url);if(audio&&await valid(audio)){try{await music.put(url,audio);}catch{retain=true;}}}if(!retain)await caches.delete(name);}await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==base.origin||!url.pathname.startsWith(base.pathname))return;
 if(/^audio\/(?:Harvest_Festival_loop\.(?:m4a|ogg)|Lively_Tavern\.mp3|Enchanted_Festival\.mp3|Woodland_Fantasy\.mp3)$/.test(url.pathname.slice(base.pathname.length))){event.respondWith(musicResponse(request).catch(()=>new Response('音源はオンラインで一度再生してください。',{status:503})));return;}
 const navigation=request.mode==='navigate'&&(url.pathname===base.pathname||url.pathname===base.pathname+'index.html'||url.pathname===base.pathname+'entry-v37.html');
 const asset=/\.(?:js|css|png|webp|jpg|svg|woff2)$/.test(url.pathname)&&!url.pathname.endsWith('/sw.js');
 if(!navigation&&!asset)return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);
  if(navigation){const entry=url.pathname.endsWith('/entry-v37.html')?'./entry-v37.html':'./index.html';const shell=await cache.match(new URL(entry,base).href);if(shell)return shell;
   try{const response=await fetch(request);if(await valid(response,true))await cache.put(new URL(entry,base).href,response.clone());return response;}
   catch{return new Response('保存済みの司令塔がありません。オンラインで一度開いてください。',{status:503,headers:{'content-type':'text/plain;charset=utf-8'}});}}
  const cached=await cache.match(request);if(cached)return cached;const response=await fetch(request);if(await valid(response)){try{await cache.put(request,response.clone());}catch{}}return response;
 })());
});
