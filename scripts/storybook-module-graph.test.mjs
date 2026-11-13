import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const origin='https://storybook.invalid/';
const version='20261113.1-owners';
const canonical=new Set(['app.js','desk.js','accounts.js','desk-model.js','qol.js','hall-tools.js','spatial-desk.js','living-room-model.js','arrival-passage.js','court-native-snapshot.js']);
const filename=url=>path.join(root,new URL(url).pathname);
function literals(source){
 const urls=[];
 // All production imports in this static application use literal specifiers.
 for(const match of source.matchAll(/\b(?:import|export)\s+(?:[^'";()]*?\s+from\s*)?['"]([^'"\n]+)['"]/g))urls.push(match[1]);
 for(const match of source.matchAll(/\bimport\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g))urls.push(match[1]);
 return urls;
}
function graph(entry){
 const html=fs.readFileSync(path.join(root,entry),'utf8'),base=new URL(entry,origin),pending=[];
 for(const tag of html.matchAll(/<(?:script|link)\b[^>]*>/g)){
  if(!/\b(?:type=['"]module['"]|rel=['"]modulepreload['"])/.test(tag[0]))continue;
  const src=tag[0].match(/\b(?:src|href)=['"]([^'"]+)['"]/);if(src)pending.push(new URL(src[1],base));
 }
 const modules=new Map();
 while(pending.length){const url=pending.shift();if(modules.has(url.href))continue;assert.equal(url.origin,new URL(origin).origin,'module graph stays same-origin: '+url.href);const source=fs.readFileSync(filename(url),'utf8');modules.set(url.href,source);for(const spec of literals(source)){assert.match(spec,/^(?:\.\.?\/|\/)/,'no undeclared remote/bare runtime import: '+spec);pending.push(new URL(spec,url));}}
 return {html,modules};
}
function checkOwners(entry){
 const result=graph(entry),apps=[...result.modules.keys()].filter(url=>new URL(url).pathname==='/command-center-98/lounge/app.js');
 assert.deepEqual(apps,[new URL('command-center-98/lounge/app.js?v='+version,origin).href],entry+' has one exact app owner URL');
 // Independent pure dependencies keep their own cache revision. What matters
 // is one exact URL per owner/identity module, never two live app instances.
 const byPath=new Map();for(const url of result.modules.keys()){const parsed=new URL(url);if(canonical.has(path.basename(parsed.pathname))){const versions=byPath.get(parsed.pathname)||new Set();versions.add(parsed.search);byPath.set(parsed.pathname,versions);}}
 for(const [pathname,versions]of byPath)assert.equal(versions.size,1,'one canonical owner/identity dependency '+pathname);
 return result;
}
test('default stained gallery has one canonical application owner and no eager archived castle/court graph',()=>{
 const {html,modules}=checkOwners('command-center-98/lounge/index.html');
 assert.match(html,/stained-atelier/,'the new experience is the actual default, not an optional toggle');
 const names=[...modules.keys()].map(url=>path.basename(new URL(url).pathname));
 assert.ok(names.includes('stained-atelier.js'),'default bootstraps its real stained gallery presentation');
 for(const retired of ['spatial-atelier.js','castle-scene.js','arrival-entry.js','arrival-atelier.js','arrival-renderer.js'])assert.ok(!names.includes(retired),'default must not eagerly import '+retired);
});
test('explicit archive uses the same canonical identity/owner graph, never the stale second app instance',()=>{
 const {html}=checkOwners('command-center-98/lounge/archive.html');
 assert.match(html,/archive|保管|旧|以前/i,'archive is visibly described as retained experience');
});

test('changed foreground and its retained archive import graph use the same current cache pin',()=>{for(const file of ['command-center-98/lounge/storybook-passage.js','command-center-98/lounge/arrival-passage.js','command-center-98/lounge/castle-scene.js','command-center-98/castle-journey-host.js']){const source=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');assert.match(source,/castle-foreground\.js\?v=20261101\.9-workbook/);assert.doesNotMatch(source,/castle-foreground\.js\?v=20261101\.1-living/);}});

test('unified notebook presentation invalidates changed code and keeps one canonical owner',()=>{
 const {html,modules}=checkOwners('command-center-98/lounge/book.html');
 assert.match(html,/href="book\.html\?presentation=book"/,'retained reader link stays on its owning entry');
 assert.match(html,/paper-stage\.css\?v=20261103\.3-scroll/);assert.match(html,/paper-atelier\.js\?v=20261113\.1-owners/);
 for(const [file,pin] of Object.entries({'paper-atelier.js':'20261113.1-owners','paper-stage.js':'20261109.6-everyday','paper-fold.js':'20261103.2-notebook','paper-motion.js':'20261103.2-notebook','paper-images.js':'20261103.2-notebook','paper-cutouts.js':'20261103.2-notebook'})){
  assert.ok([...modules.keys()].some(url=>url.endsWith('/'+file+'?v='+pin)),'current notebook dependency '+file);
  for(const old of ['20261102.2-paper','20261102.3-depth','20261102.4-detail','20261103.1-world'])assert.ok(![...modules.keys()].some(url=>url.endsWith('/'+file+'?v='+old)),'never execute stale presentation '+file+' '+old);
 }
 assert.ok([...modules.keys()].some(url=>url.endsWith('/paper-detail-model.js?v=20261102.4-detail')),'unchanged source-formatting model retains exact revision');
});
