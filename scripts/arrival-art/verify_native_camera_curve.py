"""Conservative geometry check of the EXACT runtime opening/crossing curve.

First run verify_native_runtime.mjs to sample the repository's actual function.
The camera holds while the leaves start opening, then crosses while they finish.
Each 0.002-u interval checks the swept near-plane box against static triangles
and conservatively bounded moving-triangle hulls. The .15mm SAT expansion is
larger than each interval's measured arc/chord error. This is not a GPU proof.
"""
import os,json,runpy,math,itertools,time
import numpy as np
R=os.path.dirname(os.path.abspath(__file__))
core=runpy.run_path(os.path.join(R,'verify_native_sweeps.py'))
objects=core['objects'];rotate=core['rotate'];hull_axes=core['hull_axes'];unit=core['unit'];EPS=core['EPS']
source=json.load(open(os.path.join(R,'native-camera-curves.json')))
assert source['assetSha256']==core['report']['assetSha256']
axes_box=np.eye(3)
def hull_box(points,lo,hi):
 axes,edges=hull_axes(points)
 axes=unit(np.vstack([axes,axes_box,np.cross(edges[:,None,:],axes_box[None,:,:]).reshape(-1,3)]))
 projections=points@axes.T;centre=(lo+hi)/2;radius=(hi-lo)/2
 mid=centre@axes.T;spread=radius@np.abs(axes).T
 return not np.any((projections.max(0)<mid-spread-EPS)|(projections.min(0)>mid+spread+EPS))

report={'assetSha256':source['assetSha256'],'runtimeCameraSha256':source['runtimeCameraSha256'],'method':'Exact runtime courtPassageSample poses; each .002-u interval uses swept near-plane camera box and conservative swept triangle hulls; includes retained full world, fixed fanlights, all moving leaves and handles. No world hiding in the proof.','nearMeters':.1,'maxProgressStep':.002,'expansionMeters':EPS,'views':[]}
start=time.time()
for curve in source['curves']:
 key=curve['room'];hinges=curve['hinges'];names=[h['node']for h in hinges]
 static=np.concatenate([o['triangles']for o in objects if not any(h in o['parents']for h in names)])
 slo=static.min(1);shi=static.max(1);moving=[]
 for h in hinges:
  tris=np.concatenate([o['triangles']for o in objects if h['node']in o['parents']])
  pivot=np.array([h['pivot'][0],-h['pivot'][2],h['pivot'][1]])
  moving.append((h,tris,pivot,np.linalg.norm((tris-pivot)[...,:2],axis=-1).max()))
 tan=math.tan(math.radians(curve['fov']/2));hy=curve['near']*tan;hx=hy*curve['width']/curve['height']
 result={'room':key,'width':curve['width'],'height':curve['height'],'intervals':0,'triangleTests':0,'maxArcChordErrorMeters':0,'collisions':[]}
 for a,b in zip(curve['samples'],curve['samples'][1:]):
  assert abs(a[2]-b[2])<1e-10 and abs(a[3]-b[3])<1e-10,'Crossing curve must remain aligned with the physical aperture'
  lo=np.array([a[2]-hx,min(-a[4],-b[4]),a[3]-hy]);hi=np.array([a[2]+hx,max(-a[4],-b[4])+curve['near'],a[3]+hy])
  for j in np.where(np.all((shi>=lo-EPS)&(slo<=hi+EPS),axis=1))[0]:
   result['triangleTests']+=1
   if hull_box(np.concatenate([static[j],static[j]]),lo,hi):result['collisions'].append({'u':[a[0],b[0]],'kind':'static world','triangle':static[j].tolist()})
  for h,tris,pivot,radius in moving:
   aa=h['openRadians']*a[1];bb=h['openRadians']*b[1];error=radius*(1-math.cos(abs(bb-aa)/2));assert error<EPS
   result['maxArcChordErrorMeters']=max(result['maxArcChordErrorMeters'],float(error))
   p=rotate(tris,pivot,aa);q=rotate(tris,pivot,bb);lower=np.minimum(p.min(1),q.min(1));upper=np.maximum(p.max(1),q.max(1))
   for j in np.where(np.all((upper>=lo-EPS)&(lower<=hi+EPS),axis=1))[0]:
    result['triangleTests']+=1
    if hull_box(np.concatenate([p[j],q[j]]),lo,hi):result['collisions'].append({'u':[a[0],b[0]],'kind':h['node'],'triangle':j})
  result['intervals']+=1
 result['pass']=not result['collisions'];report['views'].append(result)
 print('CAMERA_CURVE',key,curve['width'],result['pass'],result['triangleTests'],flush=True)
report['pass']=all(v['pass']for v in report['views']);report['seconds']=time.time()-start
json.dump(report,open(os.path.join(R,'native-camera-curve-proof.json'),'w'),indent=2)
if not report['pass']:raise RuntimeError('Exact native camera near-volume intersects physical geometry')
