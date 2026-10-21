const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
test('installed launch stays in the canonical authenticated app with valid icons and both entry documents',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'shireito.webmanifest')));
 assert.equal(manifest.start_url,'./app-v130.html?from=home');assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'./');
 for(const size of [192,512]){const b=fs.readFileSync(path.join(root,'shireito-icon-'+size+'.png'));assert.equal(b.readUInt32BE(16),size);assert.equal(b.readUInt32BE(20),size);}
 for(const file of ['app-v130.html','app.html','index.html']){const html=fs.readFileSync(path.join(root,file),'utf8');assert.match(html,/rel="manifest" href="\.\/shireito.webmanifest"/);assert.match(html,/pwa-install\.js\?v=/);}
});
test('install bridge accepts only the current same-origin lounge and keeps the prompt until requested',async()=>{
 const listeners={},sent=[];let prompts=0,prevented=0;const child={postMessage:m=>sent.push(m)},window={document:{getElementById:()=>({contentWindow:child})},location:{origin:'https://example.com'},navigator:{},matchMedia:()=>({matches:false}),addEventListener:(k,fn)=>listeners[k]=fn};window.parent=window;
 vm.runInNewContext(fs.readFileSync(path.join(root,'pwa-install.js'),'utf8'),{window});
 const prompt={preventDefault(){prevented++;},async prompt(){prompts++;},userChoice:Promise.resolve({outcome:'accepted'})};listeners.beforeinstallprompt(prompt);assert.equal(prevented,1);assert.equal(prompts,0);assert.equal(window.CCInstall.state(),'available');
 // app-loader rewrites the document: reattach listeners without losing the prompt.
 vm.runInNewContext(fs.readFileSync(path.join(root,'pwa-install.js'),'utf8'),{window});assert.equal(window.CCInstall.state(),'available');
 const data={channel:'cc-castle-v1',type:'install-request'};listeners.message({source:{},origin:window.location.origin,data});listeners.message({source:child,origin:'https://other.example',data});assert.equal(prompts,0);
 listeners.message({source:child,origin:window.location.origin,data});await new Promise(resolve=>setImmediate(resolve));assert.equal(prompts,1);assert.equal(sent.at(-1).state,'installed');
});
