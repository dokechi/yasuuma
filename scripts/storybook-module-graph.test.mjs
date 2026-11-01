import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const origin='https://storybook.invalid/';
const version='20261101.8-storybook';
const canonical=new Set(['app.js','desk.js','accounts.js','desk-model.js','qol.js','hall-tools.js','spatial-desk.js','living-room-model.js']);
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
 for(const url of result.modules.keys()){const parsed=new URL(url);if(canonical.has(path.basename(parsed.pathname)))assert.equal(parsed.search,'?v='+version,'canonical owner/identity dependency '+parsed.pathname);}
 return result;
}
test('default storybook has one canonical application owner and no eager archived castle/court graph',()=>{
 const {html,modules}=checkOwners('command-center-98/lounge/index.html');
 assert.match(html,/storybook-atelier/,'the new experience is the actual default, not an optional toggle');
 const names=[...modules.keys()].map(url=>path.basename(new URL(url).pathname));
 assert.ok(names.some(name=>name.startsWith('storybook')),'default bootstraps its real storybook presentation');
 for(const retired of ['spatial-atelier.js','castle-scene.js','arrival-entry.js','arrival-atelier.js','arrival-renderer.js'])assert.ok(!names.includes(retired),'default must not eagerly import '+retired);
});
test('explicit archive uses the same canonical identity/owner graph, never the stale second app instance',()=>{
 const {html}=checkOwners('command-center-98/lounge/archive.html');
 assert.match(html,/archive|保管|旧|以前/i,'archive is visibly described as retained experience');
});
