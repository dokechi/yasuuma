"""Deterministic glTF mesh quantization; native EMPTY pivots remain unscaled. Original material pixels are copied
verbatim into embedded bufferViews. No image editing/decoder/external URLs.
"""
import struct,json,os,hashlib,math
R=os.path.dirname(os.path.abspath(__file__));src=os.path.join(R,'arrival-court-v1-raw.glb');raw=open(src,'rb').read();ln=struct.unpack_from('<I',raw,12)[0];j=json.loads(raw[20:20+ln]);b=20+ln;data=raw[b+8:b+8+struct.unpack_from('<I',raw,b)[0]]
oldacc=j['accessors'];oldviews=j['bufferViews'];blob=bytearray();acc=[];views=[]
def read(a):
 ac=oldacc[a];v=oldviews[ac['bufferView']];k={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[ac['type']];fmt={5126:'f',5123:'H',5125:'I',5122:'h',5120:'b'}[ac['componentType']];sz=struct.calcsize(fmt)*k;off=v.get('byteOffset',0)+ac.get('byteOffset',0);stride=v.get('byteStride',sz)
 return [struct.unpack_from('<'+fmt*k,data,off+i*stride) for i in range(ac['count'])]
def push(b,target=None,stride=None):
 while len(blob)%4:blob.append(0)
 v={'buffer':0,'byteOffset':len(blob),'byteLength':len(b)}
 if target:v['target']=target
 if stride:v['byteStride']=stride
 views.append(v);blob.extend(b);return len(views)-1
before=after=0;maxerr=0;uvverts=0;groups=0
for mesh in j['meshes']:
 for p in mesh['primitives']:
  groups+=1;attrs=p['attributes'];pos=read(attrs['POSITION']);nor=read(attrs['NORMAL']);ix=[x[0] for x in read(p['indices'])]
  material=j['materials'][p['material']];pbr=material.get('pbrMetallicRoughness',{});textured=any(k in pbr for k in ['baseColorTexture','metallicRoughnessTexture']) or 'normalTexture'in material
  uv=read(attrs['TEXCOORD_0']) if textured else None;uvverts+=len(pos) if uv else 0
  before+=len(pos);mapping={};remap=[];packed=[]
  for i,(v,n)in enumerate(zip(pos,nor)):
   q=tuple(round(c*1000) for c in v);assert all(-32767<=c<=32767 for c in q)
   qn=tuple(max(-127,min(127,round(c*127))) for c in n);qu=tuple(round(c*256) for c in uv[i]) if uv else ();assert all(-32767<=c<=32767 for c in qu)
   key=q+qn+qu;maxerr=max(maxerr,max(abs(a/1000-b) for a,b in zip(q,v)))
   if key not in mapping:mapping[key]=len(packed);packed.append(key)
   remap.append(mapping[key])
  after+=len(packed);vb=bytearray();stride=16 if uv else 12
  for q in packed:
   vb.extend(struct.pack('<hhhxxbbbx',*q[:6]))
   if uv:vb.extend(struct.pack('<hh',*q[6:]))
  view=push(vb,34962,stride);pa=len(acc);acc.append({'bufferView':view,'componentType':5122,'count':len(packed),'type':'VEC3','min':[min(q[k]for q in packed)for k in range(3)],'max':[max(q[k]for q in packed)for k in range(3)]})
  na=len(acc);acc.append({'bufferView':view,'byteOffset':8,'componentType':5120,'normalized':True,'count':len(packed),'type':'VEC3'});p['attributes']={'POSITION':pa,'NORMAL':na}
  if uv:
   ua=len(acc);acc.append({'bufferView':view,'byteOffset':12,'componentType':5122,'count':len(packed),'type':'VEC2'});p['attributes']['TEXCOORD_0']=ua
  indx=[remap[n] for n in ix];fmt='H' if max(indx)<65536 else'I';iv=push(struct.pack('<'+fmt*len(indx),*indx),34963);ia=len(acc);acc.append({'bufferView':iv,'componentType':5123 if fmt=='H' else 5125,'count':len(indx),'type':'SCALAR'});p['indices']=ia
node_by_name={node.get('name'):node for node in j['nodes']}
for node in j['nodes']:
 portal=node.get('extras',{}).get('courtPortal')
 if portal:
  assert not node.get('matrix') and not node.get('translation') and not node.get('rotation')
  for hinge in portal['hinges']:
   authored=[round(value,3)for value in hinge['pivot']];native=node_by_name[hinge['node']]
   assert not native.get('matrix') and max(abs(a-b)for a,b in zip(native['translation'],authored))<.001
   # Exact authored millimetres avoid float32 pivot + quantized-local seam gaps.
   native['translation']=authored;hinge['pivot']=authored
   leaf=node_by_name[hinge['leaf']];offset=round(portal['aperture']['center'][0]-authored[0],3)
   expected=[offset,0,0];actual=leaf.get('translation',[0,0,0])
   assert max(abs(a-b)for a,b in zip(actual,expected))<.001
   leaf['translation']=expected
   if 'handle' not in hinge:
    assert portal['room'] in ('otoku','lottery');hinge['handle']=None
 if'mesh'in node:
  assert'matrix'not in node and not node.get('children');node['scale']=[a*.001 for a in node.get('scale',[1,1,1])]
for cam in j.get('cameras',[]):cam['perspective'].pop('aspectRatio',None)
tints={'stone_dusk':[.45,.50,.56,1],'stone_worn':[.49,.53,.58,1],'stone_shadow':[.38,.43,.48,1]}
oak_factor_path=os.path.join(R,'materials','oak-basecolor-v1.json')
if os.path.exists(oak_factor_path):tints['oak_smoked']=json.load(open(oak_factor_path))['factorToPreserveOriginalOakMean']
for m in j.get('materials',[]):
 if m.get('name') in tints:m.setdefault('pbrMetallicRoughness',{})['baseColorFactor']=tints[m['name']]
 for info in [m.get('normalTexture'),m.get('occlusionTexture'),m.get('emissiveTexture'),m.get('pbrMetallicRoughness',{}).get('baseColorTexture'),m.get('pbrMetallicRoughness',{}).get('metallicRoughnessTexture')]:
  if info:
   ext=info.setdefault('extensions',{}).setdefault('KHR_texture_transform',{})
   # Preserve Blender's legitimate V-flip offset for the coarser basecolor map.
   # Only vertex-UV units change; transform translation remains in texture units.
   assert abs(ext.get('rotation',0))<1e-8
   assert len(ext.get('offset',[0,0]))==2 and all(math.isfinite(a)for a in ext.get('offset',[0,0]))
   ext['scale']=[a/256 for a in ext.get('scale',[1,1])]
# Blender may duplicate identical sampler/source records per material.
# Deduplicate records, not images, and remap standard material textureInfo refs.
unique=[];texture_remap={};seen_textures={}
for i,t in enumerate(j.get('textures',[])):
 key=json.dumps(t,sort_keys=True,separators=(',',':'))
 if key not in seen_textures:seen_textures[key]=len(unique);unique.append(t)
 texture_remap[i]=seen_textures[key]
def remap_textures(value):
 if isinstance(value,dict):
  for key,item in value.items():
   if isinstance(item,dict) and key.endswith('Texture') and 'index' in item:item['index']=texture_remap[item['index']]
   remap_textures(item)
 elif isinstance(value,list):
  for item in value:remap_textures(item)
for material in j.get('materials',[]):remap_textures(material)
j['textures']=unique
imageBytes=0
for im in j.get('images',[]):
 assert'uri'not in im
 old=oldviews[im['bufferView']];by=data[old.get('byteOffset',0):old.get('byteOffset',0)+old['byteLength']];imageBytes+=len(by);im['bufferView']=push(by)
j['accessors']=acc;j['bufferViews']=views;j['buffers']=[{'byteLength':len(blob)}]
for k in ['extensionsUsed','extensionsRequired']:j[k]=list(dict.fromkeys(j.get(k,[])+['KHR_mesh_quantization','KHR_texture_transform']))
j['asset']['generator']='Blender4.3.2 + original KHR static mesh/UV quantization; original embedded PBR maps'
js=json.dumps(j,separators=(',',':'),ensure_ascii=False).encode();js+=b' '*((-len(js))%4);blob+=b'\0'*((-len(blob))%4)
out=struct.pack('<III',0x46546c67,2,12+8+len(js)+8+len(blob))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(blob),0x004e4942)+blob
path=os.path.join(R,'arrival-court-v1.glb');open(path,'wb').write(out)
stats={'rawBytes':len(raw),'quantizedBytes':len(out),'verticesBefore':before,'verticesAfter':after,'texturedVertices':uvverts,'drawGroups':groups,'embeddedImages':len(j.get('images',[])),'embeddedImageBytes':imageBytes,'maxPositionErrorMeters':maxerr,'positionPrecisionMeters':.001,'uvPrecisionTiles':1/256,'sha256':hashlib.sha256(out).hexdigest(),'triangleTopologyUnchanged':True}
json.dump(stats,open(os.path.join(R,'arrival-court-v1-quantization.json'),'w'),indent=2);print(stats)
# Keep the reproducible build's manifests bound to the exact optimized artifact.
for filename in ['arrival-court-v1-layout.json','arrival-court-v1-provenance.json']:
 manifest_path=os.path.join(R,filename)
 if os.path.exists(manifest_path):
  manifest=json.load(open(manifest_path));manifest['runtimeSha256']=stats['sha256'];manifest['runtimeBytes']=stats['quantizedBytes'];manifest['quantization']=stats
  if filename.endswith('-layout.json'):manifest['glbBytes']=stats['quantizedBytes'];manifest['drawGroups']=stats['drawGroups']
  json.dump(manifest,open(manifest_path,'w'),ensure_ascii=False,indent=2)
