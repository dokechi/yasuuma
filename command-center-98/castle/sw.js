// Cache only this app's static shell and fetched art. Drafts remain in localStorage.
const CACHE='castle-production-shell-v27',PREFIX='castle-production-shell-';
const SHELL=['./','./index.html','./entry-v27.html','./app.css?v=24','./workbench.css?v=24','./app.js?v=27','./notebook.js?v=24','./workbench.js?v=24','./world.js?v=24','./feedback.js?v=27','./production.js?v=24','./character-rig.js?v=24','./skirt-action.js?v=24','./scene-manifest.js?v=24','./scene-motion.js?v=24','./character-scenes.js?v=27','./character-scenes.css?v=26','./persona.js?v=26','./persona-lines.js?v=26',...['19016','19017','19018','19020','19079','19080'].map(id=>`./assets/user-${id}.png`),...['kyun','choi','fp'].flatMap(key=>['welcome','work','rest','tea','special'].map(id=>`./assets/scene-${key}-${id}-v1.jpg`))];
const base=new URL('./',self.location.href);
async function valid(response,html=false){if(!response||!response.ok||response.type==='opaque'||response.redirected)return false;if(html)return response.headers.get('content-type')?.includes('text/html')&&(await response.clone().text()).includes('id="app"');return !response.headers.get('content-type')?.includes('text/html');}
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await Promise.all(SHELL.map(async path=>{const url=new URL(path,base).href;const response=await fetch(url,{cache:'reload'});if(!await valid(response,path==='./'||path==='./index.html'||path==='./entry-v27.html'))throw Error('Incomplete app shell');await cache.put(url,response);}));})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE)await caches.delete(name);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==base.origin||!url.pathname.startsWith(base.pathname))return;
 const navigation=request.mode==='navigate'&&(url.pathname===base.pathname||url.pathname===base.pathname+'index.html'||url.pathname===base.pathname+'entry-v27.html');
 const asset=/\.(?:js|css|png|webp|jpg|svg|woff2)$/.test(url.pathname)&&!url.pathname.endsWith('/sw.js');
 if(!navigation&&!asset)return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);
  if(navigation){const entry=url.pathname.endsWith('/entry-v27.html')?'./entry-v27.html':'./index.html';const shell=await cache.match(new URL(entry,base).href);if(shell)return shell;
   try{const response=await fetch(request);if(await valid(response,true))await cache.put(new URL(entry,base).href,response.clone());return response;}
   catch{return new Response('保存済みの司令塔がありません。オンラインで一度開いてください。',{status:503,headers:{'content-type':'text/plain;charset=utf-8'}});}}
  const cached=await cache.match(request);if(cached)return cached;const response=await fetch(request);if(await valid(response)){try{await cache.put(request,response.clone());}catch{}}return response;
 })());
});
