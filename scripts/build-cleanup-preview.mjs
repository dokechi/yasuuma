// Generates a script-free, offline layout review. All displayed records are synthetic.
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
const dependencyRoot=process.env.COMMAND_CENTER_UI_MODULES;
if(!dependencyRoot)throw Error('Set COMMAND_CENTER_UI_MODULES to the scratch jsdom install');
const {JSDOM,VirtualConsole}=createRequire(dependencyRoot+'/package.json')('jsdom');
const dir=new URL('../command-center-98/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('app-assets.json',dir),'utf8'));
let html=await fs.readFile(new URL('app.html',dir),'utf8');
for(const url of manifest.styles)html=html.replace('</head>','<style>'+await fs.readFile(new URL(url.split('?')[0],dir),'utf8')+'</style></head>');
html=html.replace(/<script src="\.\/v148-daily-report-link\.js[^\"]*"><\/script>/,'<script>'+await fs.readFile(new URL('v148-daily-report-link.js',dir),'utf8')+'</script>');
for(const url of manifest.scripts){let code=await fs.readFile(new URL(url.split('?')[0],dir),'utf8');if(url.startsWith('./affiliate-production.js'))code=code.replace(/import\('[^']+'\)/,'Promise.resolve({})');const end=html.lastIndexOf('</body>');html=html.slice(0,end)+'<script>'+code.replaceAll('</script','<\\/script')+'</script>'+html.slice(end);}
const errors=[],v=new VirtualConsole();v.on('jsdomError',e=>errors.push(e.message));
const mock={ok:true,items:[],tasks:[],events:[],purchases:[],suppliers:[],programs:[],accounts:[],jobs:[],campaigns:[],counts:{},readyCount:0,total:0,nextOffset:null};
const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://synthetic-preview.invalid/',pretendToBeVisual:true,virtualConsole:v,beforeParse(w){Object.assign(w,{AbortSignal,structuredClone,TextEncoder,TextDecoder,scrollTo:()=>{}});w.HTMLElement.prototype.scrollIntoView=()=>{};w.fetch=async()=>new Response(JSON.stringify(mock));}});
try{
 const w=dom.window,d=w.document,start=Date.now();while(!w.CCHome?.loaded.active||w.CCHome.loading){if(Date.now()-start>5000)throw Error('Preview did not settle');await new Promise(r=>setTimeout(r,10))}
 const H=w.CCHome;H.cardItems=[{id:'demo-card',productName:'【見本】長い商品名や販売条件も、途中で切らずに確認できます',status:'inbox',updatedAt:'2026-10-03T01:00:00+09:00'}];
 H.galItems=[{id:'demo-money',title:'【見本】お金の原稿をここに表示',payload:{post_title:'【見本】お金の原稿をここに表示'},updatedAt:'2026-10-02T20:00:00+09:00'}];
 H.houseItems=[{id:'demo-house',title:'【見本】家の原稿をここに表示',payload:{post_title:'【見本】家の原稿をここに表示'},updatedAt:'2026-10-02T18:00:00+09:00'}];
 H.activeItems=[{id:'demo-ai',title:'【見本】情報の見出しと要点をひと目で確認',summary:'新着の情報は分野別の原稿と分けて表示します。実際のデータは変更していません。',domain:'ai',updatedAt:'2026-10-03T01:00:00+09:00'}];H.render();
 const banner=d.createElement('p');banner.textContent='配置確認用の見本（架空データ）｜このファイルは読取専用です。ボタン操作や保存はできません。';banner.setAttribute('style','padding:12px;margin:0 0 12px;background:#fff4cf;color:#604500;border:1px solid #987b28;font:14px sans-serif;line-height:1.5');d.body.prepend(banner);
 // Remove all execution and outbound network dependencies from the deliverable.
 d.querySelectorAll('script,link,iframe,.modal-backdrop,.toast-wrap').forEach(node=>node.remove());
 d.querySelectorAll('*').forEach(node=>{for(const a of [...node.attributes])if(/^on/i.test(a.name))node.removeAttribute(a.name);if(node.tagName==='A')node.removeAttribute('href')});
 d.title='司令塔 整理版・配置確認用';d.getElementById('clock').textContent='配置確認用';d.getElementById('statusText').textContent='架空データ・読取専用';d.getElementById('homeUpdated').textContent='実データの件数ではありません';
 if(errors.length)throw Error(errors.join('\n'));
 const output=path.resolve(process.argv[2]||'command-center-cleanup-preview.html');await fs.writeFile(output,dom.serialize());console.log(output);
}finally{await new Promise(r=>setTimeout(r,30));dom.window.close()}
