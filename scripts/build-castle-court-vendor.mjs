/* Reproducible, local-only runtime bundle. Build dependencies are not shipped.
   npm install --prefix /tmp/court-vendor --ignore-scripts --no-audit --no-fund three@0.187.0 esbuild@0.25.12
   COURT_VENDOR_DEPS=/tmp/court-vendor node scripts/build-castle-court-vendor.mjs */
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const deps=process.env.COURT_VENDOR_DEPS;
if(!deps)throw Error('COURT_VENDOR_DEPS must identify an isolated exact-version build install');
const require=createRequire(path.join(path.resolve(deps),'package.json'));
const esbuild=require('esbuild');
// Package exports deliberately hide package.json in some Three releases.
const packageRoot=path.resolve(path.dirname(require.resolve('three')),'..');
const threePackage=JSON.parse(await readFile(path.join(packageRoot,'package.json'),'utf8'));
if(threePackage.version!=='0.187.0'||esbuild.version!=='0.25.12')throw Error('Unexpected vendor build version');
const packages=[{name:'three',version:'0.187.0',url:'https://registry.npmjs.org/three/-/three-0.187.0.tgz',integrity:'sha512-Qiu7R+Cmh8CstZsY1uJOSWnVlfo7ZtNLV7mF8Jltk3LB3AtDu9cRZlcnRKkAk8Y4z6KKw35z7Y7Urd7jWY8etA=='},{name:'esbuild',version:'0.25.12',url:'https://registry.npmjs.org/esbuild/-/esbuild-0.25.12.tgz',integrity:'sha512-bbPBYYrtZbkt6Os6FiTLCTFxvq4tt3JKall1vRwshA3fdVztsLAatFaZobhkBC8/BrPetoa0oksYoKXoG4ryJg=='}];
const lock=JSON.parse(await readFile(path.join(path.resolve(deps),'package-lock.json'),'utf8'));for(const item of packages)if(lock.packages?.['node_modules/'+item.name]?.integrity!==item.integrity)throw Error('Unexpected vendor package integrity');
const destination=path.join(root,'command-center-98/lounge/vendor/three-r187');await mkdir(destination,{recursive:true});
const exports=['WebGLRenderer','Scene','PerspectiveCamera','Vector2','Vector3','Raycaster','Box3','Color','FogExp2','HemisphereLight','DirectionalLight','PointLight','PMREMGenerator','ACESFilmicToneMapping','SRGBColorSpace','PCFSoftShadowMap','LoadingManager','DataTexture','RGBAFormat','UnsignedByteType','EquirectangularReflectionMapping','LinearFilter'];
const contents=`export {${exports.join(',')}} from 'three';\nexport {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';\nexport {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';\n`;
const result=await esbuild.build({stdin:{contents,resolveDir:path.resolve(deps),sourcefile:'court-vendor-entry.js'},outfile:path.join(destination,'court-three.js'),bundle:true,minify:true,format:'esm',target:'es2022',platform:'browser',metafile:true,legalComments:'linked',banner:{js:'/*! Three.js r187 — MIT; see LICENSE and provenance.json. Original upstream library, not site assets. */'}});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const inputs=[];for(const name of Object.keys(result.metafile.inputs)){if(name==='<stdin>'||name.endsWith('court-vendor-entry.js'))continue;const absolute=path.resolve(name);const bytes=await readFile(absolute);inputs.push({path:path.relative(path.join(path.resolve(deps),'node_modules'),absolute),sha256:hash(bytes)});}
const bytes=await readFile(path.join(destination,'court-three.js'));
await writeFile(path.join(destination,'LICENSE'),await readFile(path.join(packageRoot,'LICENSE')));
await writeFile(path.join(destination,'provenance.json'),JSON.stringify({three:'0.187.0',esbuild:'0.25.12',source:'https://github.com/mrdoob/three.js/tree/r187',license:'MIT',packages,entry:contents,bundle:{file:'court-three.js',bytes:bytes.length,sha256:hash(bytes)},inputs:inputs.sort((a,b)=>a.path.localeCompare(b.path)),build:'COURT_VENDOR_DEPS=<exact-version install> node scripts/build-castle-court-vendor.mjs'},null,2)+'\n');
console.log(`Vendored Three r187: ${bytes.length} bytes; SHA256 ${hash(bytes)}`);
