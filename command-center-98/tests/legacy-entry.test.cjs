const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8'),loader=require('../app-loader.js');
test('a retained pre-manifest HOME migrates before mounting the retired screen',()=>{
 const calls=[],window={location:{href:'https://example.com/command-center-98/app-v130.html?v=229.7',replace:url=>calls.push(url)}};
 vm.runInNewContext(read('rpg-home.js'),{window,URL});
 assert.deepEqual(calls,['https://example.com/command-center-98/app-v130.html?v=20261022.10-entry']);
 assert.equal(window.CCRpgHome,undefined);
});
test('the canonical manifest startup does not redirect the mounted HOME again',()=>{
 const calls=[],window={CCLoadedManifest:'{}',location:{replace:url=>calls.push(url)}};
 vm.runInNewContext(read('rpg-home.js'),{window,URL});assert.deepEqual(calls,[]);
});
test('old bookmarked query values normalize once while retaining destination and install parameters',()=>{
 const script=read('app-v130.html').match(/<script>\s*([\s\S]*?)<\/script>/)[1];
 for(const query of ['?v=229.7&from=home#requests','?from=home#request-test']){
  const calls=[],window={},location={href:'https://example.com/command-center-98/app-v130.html'+query,replace:url=>calls.push(url)};
  vm.runInNewContext(script,{window,location,URL});assert.equal(window.CCEntryRedirecting,true);
  const target=new URL(calls[0]);assert.equal(target.searchParams.get('v'),'20261022.10-entry');assert.equal(target.searchParams.get('from'),'home');assert.equal(target.hash,new URL(location.href).hash);
  location.href=calls[0];window.CCEntryRedirecting=false;calls.length=0;
  vm.runInNewContext(script,{window,location,URL});assert.deepEqual(calls,[]);assert.equal(window.CCEntryRedirecting,false);
 }
});
test('a redirecting old entry cannot race the navigation by rewriting the document',()=>{
 let fetches=0;const window={CCEntryRedirecting:true,fetch:()=>fetches++};
 vm.runInNewContext(read('app-loader.js'),{window});assert.equal(fetches,0);
});
test('a failed castle host cannot silently release the retired HOME as a successful startup',()=>{
 const calls=[],document={defaultView:{CCRpgHome:{},CCRpgWorkspaces:{},CCHome:{active:true}}};
 loader.completeStartup(document,(_doc,ready)=>calls.push(ready));assert.deepEqual(calls,[false]);
});
