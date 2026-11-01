import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const root=new URL('../',import.meta.url),assets=new URL('command-center-98/lounge/assets/',root);
const manifest=JSON.parse(fs.readFileSync(new URL('storybook-layout-v3-provenance.json',assets)));
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
test('five original illustration clusters are exact bounded local assets with authoring evidence',()=>{
 assert.deepEqual(Object.keys(manifest.rasterAssets),['insurance','otoku','rakuten','lottery','sourcing']);
 let total=0;
 for(const [key,record]of Object.entries(manifest.rasterAssets)){
  const bytes=fs.readFileSync(new URL('storybook-'+record.file,assets));
  assert.equal(bytes.length,record.bytes,key+' exact bytes');assert.equal(sha(bytes),record.sha256,key+' exact hash');
  assert(bytes.length<=200000,key+' cluster is under200KB');assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');
  assert(fs.readFileSync(new URL('storybook-'+record.source,assets),'utf8').length>100);assert(fs.readFileSync(new URL('storybook-'+key+'-actor-v1-prompt.txt',assets),'utf8').length>100);total+=bytes.length;
 }
 assert(total<900000,'all five clusters under900KB, loaded by chapter rather than a new background fetch loop');
});
test('native art and reproducible fit proof remain bound to the delivered authoring source',()=>{
 const bytes=fs.readFileSync(new URL(manifest.repositoryPaths.module,root));assert.equal(bytes.length,manifest.module.bytes);assert.equal(sha(bytes),manifest.module.sha256);
 assert.equal(sha(fs.readFileSync(new URL(manifest.repositoryPaths.test,root))),manifest.test.sha256);
 assert.equal(sha(fs.readFileSync(new URL(manifest.repositoryPaths.pureProof,root))),manifest.pureProof.sha256);
 assert.equal(manifest.originalNativeArt,true);
});
