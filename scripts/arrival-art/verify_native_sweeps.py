"""Offline swept-leaf verification against the exact exported GLB.

Run: blender --factory-startup -b -t 4 -P verify_native_sweeps.py
Imports the runtime asset. Each <=1 degree interval is conservatively bounded by
convex hulls of triangle endpoints, expanded by .15 mm (greater than max arc/chord
deviation here). SAT tests every overlapping static-triangle AABB, including
contained triangles. Designed closed centre-joint contact is checked separately.
This does not replace actual GPU pixels, renderer rays or UI/camera-curve tests.
"""
import bpy,json,struct,hashlib,math,itertools,os,time
import numpy as np
from mathutils import Vector
R=os.path.dirname(os.path.abspath(__file__));path=os.path.join(R,'arrival-court-v1.glb')
raw=open(path,'rb').read();size=struct.unpack_from('<I',raw,12)[0];gltf=json.loads(raw[20:20+size]);specs={n['extras']['courtPortal']['room']:n['extras']['courtPortal']for n in gltf['nodes']if n.get('extras',{}).get('courtPortal')}
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);bpy.ops.import_scene.gltf(filepath=path);bpy.context.view_layer.update()
EPS=.00015;NUMERIC=1e-6;START=time.time()
objects=[]
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 o.data.calc_loop_triangles();v=np.array([(o.matrix_world@p.co)[:]for p in o.data.vertices],dtype=np.float64);faces=np.array([p.vertices[:]for p in o.data.loop_triangles],dtype=np.int32)
 parents=[];p=o
 while p:parents.append(p.name);p=p.parent
 objects.append({'name':o.name,'parents':parents,'triangles':v[faces]})
C3=np.array(list(itertools.combinations(range(6),3)));C2=np.array(list(itertools.combinations(range(6),2)))
def unit(axes):
 lengths=np.linalg.norm(axes,axis=1);axes=axes[lengths>1e-10]/lengths[lengths>1e-10,None]
 return np.unique(np.round(axes,9),axis=0)
def hull_axes(points):
 norms=np.cross(points[C3[:,1]]-points[C3[:,0]],points[C3[:,2]]-points[C3[:,0]])
 d=np.einsum('kij,kj->ki',points[None,:,:]-points[C3[:,0],None,:],norms)
 norms=norms[np.logical_or((d>=-1e-10).all(1),(d<=1e-10).all(1))];norms=unit(norms)
 edges=points[C2[:,1]]-points[C2[:,0]]
 # In-plane axes also cover zero-volume cap-face sweeps.
 extra=np.cross(norms[:,None,:],edges[None,:,:]).reshape(-1,3)
 return unit(np.vstack([norms,extra])),edges

def intersects(points,tri,axes,edges):
 te=np.roll(tri,-1,axis=0)-tri;normal=np.cross(te[0],te[1]);cross=np.cross(edges[:,None,:],te[None,:,:]).reshape(-1,3)
 allaxes=unit(np.vstack([axes,normal[None,:],cross]));a=points@allaxes.T;b=tri@allaxes.T
 return not np.any((a.max(0)<b.min(0)-EPS)|(b.max(0)<a.min(0)-EPS))
def rotate(tris,pivot,angle):
 v=tris-pivot;c=math.cos(angle);s=math.sin(angle);out=v.copy();out[...,0]=v[...,0]*c-v[...,1]*s;out[...,1]=v[...,0]*s+v[...,1]*c;return out+pivot
report={'assetSha256':hashlib.sha256(raw).hexdigest(),'method':'<=1 degree swept convex triangle hulls + conservative .15mm SAT expansion against all overlapping static triangle AABBs','maxStepDegrees':1,'expansionMeters':EPS,'blenderImportNumericToleranceMeters':NUMERIC,'rooms':{}}
for key,spec in specs.items():
 hnames=[h['node']for h in spec['hinges']];static=[o for o in objects if not any(h in o['parents']for h in hnames)];st=np.concatenate([o['triangles']for o in static]);names=np.concatenate([np.repeat(o['name'],len(o['triangles']))for o in static]);slo=st.min(1);shi=st.max(1)
 entry={'hinges':[],'collisions':[],'collisionCount':0,'contactEnvelope':{},'maxArcChordErrorMeters':0,'candidatePairs':0};report['rooms'][key]=entry
 for h in spec['hinges']:
  moving=[o for o in objects if h['node']in o['parents']];tri=np.concatenate([o['triangles']for o in moving]);pivot=np.array([h['pivot'][0],-h['pivot'][2],h['pivot'][1]]);angle=h['openRadians'];steps=math.ceil(abs(math.degrees(angle)));poses=[rotate(tri,pivot,angle*i/steps)for i in range(steps+1)]
  radius=np.linalg.norm((tri-pivot)[...,:2],axis=-1).max();error=radius*(1-math.cos(abs(angle)/steps/2));assert error<EPS
  entry['maxArcChordErrorMeters']=max(entry['maxArcChordErrorMeters'],float(error));lo=np.minimum.reduce([p.min((0,1))for p in poses])-EPS;hi=np.maximum.reduce([p.max((0,1))for p in poses])+EPS;mask=np.all((shi>=lo)&(slo<=hi),axis=1);local=st[mask];lnames=names[mask];ll=local.min(1);lh=local.max(1)
  side='left'if h['node'].endswith('left')else'right';center=spec['aperture']['center'][0];joint_margin=math.inf
  if spec['leafMode']=='paired':
   # Analytic extrema of each vertex's circular X trajectory over the full swing.
   pts=tri.reshape(-1,3)-pivot;critical=np.arctan2(-pts[:,1],pts[:,0]);angles=[np.zeros(len(pts)),np.full(len(pts),angle)]
   for base in [critical,critical+math.pi,critical-math.pi]:angles.append(np.clip(base,min(0,angle),max(0,angle)))
   xs=np.concatenate([pivot[0]+pts[:,0]*np.cos(a)-pts[:,1]*np.sin(a)for a in angles]);joint_margin=float(center-xs.max()if side=='left'else xs.min()-center)
   if joint_margin<-NUMERIC:
    entry['collisionCount']+=1;entry['collisions'].append({'hinge':h['node'],'type':'paired centre interpenetration','margin':joint_margin})
  tested=0
  for i in range(steps):
   pairs=np.concatenate([poses[i],poses[i+1]],axis=1)
   for prism in pairs:
    pl=prism.min(0)-EPS;ph=prism.max(0)+EPS;idx=np.where(np.all((lh>=pl)&(ll<=ph),axis=1))[0]
    if not len(idx):continue
    axes,edges=hull_axes(prism)
    for j in idx:
     tested+=1
     if intersects(prism,local[j],axes,edges):
      entry['collisionCount']+=1
      if len(entry['collisions'])<12:entry['collisions'].append({'hinge':h['node'],'angleIntervalDegrees':[math.degrees(angle)*i/steps,math.degrees(angle)*(i+1)/steps],'staticObject':str(lnames[j]),'sweptBounds':[pl.tolist(),ph.tolist()],'staticTriangle':local[j].tolist()})
      # Collect the COMPLETE angular/contact union, not only the first failure.
      ident=h['node']+' / '+str(lnames[j]);a=math.degrees(angle)*i/steps;b=math.degrees(angle)*(i+1)/steps
      clipped_lo=np.maximum(pl,ll[j]);clipped_hi=np.minimum(ph,lh[j])
      if ident not in entry['contactEnvelope']:entry['contactEnvelope'][ident]={'angleDegrees':[min(a,b),max(a,b)],'min':clipped_lo.tolist(),'max':clipped_hi.tolist()}
      else:
       e=entry['contactEnvelope'][ident];e['angleDegrees']=[min(e['angleDegrees'][0],a,b),max(e['angleDegrees'][1],a,b)];e['min']=np.minimum(e['min'],clipped_lo).tolist();e['max']=np.maximum(e['max'],clipped_hi).tolist()
  entry['candidatePairs']+=tested;entry['hinges'].append({'node':h['node'],'intervals':steps,'movingTriangles':len(tri),'nearbyStaticTriangles':len(local),'analyticCentreMarginMeters':None if spec['leafMode']=='single'else joint_margin})
  print('SWEEP',key,h['node'],'pairs',tested,'collisions',len(entry['collisions']),flush=True)
 entry['pass']=entry['collisionCount']==0
report['seconds']=time.time()-START;report['pass']=all(r['pass']for r in report['rooms'].values());json.dump(report,open(os.path.join(R,'native-swept-volume-proof.json'),'w'),indent=2);print('NATIVE_SWEEP_RESULT',report['pass'],'seconds',report['seconds'],flush=True)
if not report['pass']:raise RuntimeError('Native swept volume intersects retained architecture; inspect report')
