const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../pwa-install.js'),'utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function setup(){
 const listeners={},docListeners={},children=[],requests=[],navigations=[];
 const manifest={shell:'./app.html?v=old',styles:[],scripts:[]};let next=manifest;
 const node=()=>({style:{},children:[],setAttribute(){},append(...n){this.children.push(...n);},addEventListener(k,fn){this[k]=fn;},remove(){this.removed=true;}});
 const document={hidden:false,body:{append:n=>children.push(n)},getElementById:()=>null,createElement:node,addEventListener:(k,fn)=>docListeners[k]=fn,removeEventListener:k=>delete docListeners[k]};
 const window={document,CCLoadedManifest:JSON.stringify(manifest),location:{origin:'https://example.com',href:'https://example.com/command-center-98/app-v130.html?from=home',hash:'#requests',replace:url=>navigations.push(url)},navigator:{},matchMedia:()=>({matches:false}),addEventListener:(k,fn)=>listeners[k]=fn,removeEventListener:k=>delete listeners[k],fetch:async(url,options)=>{requests.push({url,options});if(next instanceof Error)throw next;return {ok:true,json:async()=>next};}};window.parent=window;
 const clock={now:()=>1700000000000};
 vm.runInNewContext(source,{window,URL,Date:clock});
 return {window,document,listeners,docListeners,children,requests,navigations,clock,setNext(value){next=value;},manifest};
}
test('resuming an old tab offers an explicit fresh launch and never reloads during editing',async()=>{
 const t=setup();await flush();assert.equal(t.children.length,0);
 t.setNext({...t.manifest,shell:'./app.html?v=new'});t.clock.now=()=>1700000031000;
 t.listeners.focus();await flush();assert.equal(t.children.length,1);assert.equal(t.navigations.length,0);
 const notice=t.children[0];assert.equal(notice.children[1].textContent,'最新版を開く');
 assert.deepEqual({...t.requests[1].options},{cache:'no-store',credentials:'omit'});
 notice.children[1].click();assert.equal(t.navigations[0],'https://example.com/command-center-98/app-v130.html?v=1700000031000#requests');
 assert.equal(t.window.CCLoadedManifest,JSON.stringify(t.manifest));
});
test('offline or malformed replies do not claim an update or disrupt the current screen',async()=>{
 const t=setup();await flush();t.setNext(Error('offline'));t.clock.now=()=>1700000031000;
 t.listeners.pageshow();await flush();assert.equal(t.children.length,0);assert.equal(t.navigations.length,0);
 t.setNext({error:'unavailable'});t.clock.now=()=>1700000062000;t.docListeners.visibilitychange();await flush();assert.equal(t.children.length,0);
 t.document.hidden=true;t.clock.now=()=>1700000093000;t.listeners.focus();await flush();assert.equal(t.requests.length,3);
});
test('replacing the document disposes old observers and leaves a single update notice',async()=>{
 const t=setup();await flush();t.setNext({...t.manifest,shell:'./app.html?v=new'});t.clock.now=()=>1700000031000;
 t.listeners.focus();await flush();assert.equal(t.children.length,1);
 vm.runInNewContext(source,{window:t.window,URL,Date:t.clock});await flush();
 assert.equal(t.children[0].removed,true);assert.equal(t.children.length,2);
 t.clock.now=()=>1700000062000;t.listeners.focus();await flush();assert.equal(t.children.length,2);
});
