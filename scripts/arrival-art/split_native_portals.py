"""Original native portal mechanisms: fixed fanlights and real capped leaves.

Authoring-only Blender module. Face semantics are attached before static joining;
no material-name heuristics or renderer-hidden parts establish motion ownership.
"""
import bpy,bmesh,math
from collections import Counter
from mathutils import Matrix,Vector

PORTALS={
 'insurance':dict(x=-5.6,back=2.82,bottom=.35,r=1.18,spring=2.05,eye=1.85,fixedHead=2.25,angle=85,cross=-4.10),
 'rakuten':dict(x=5.25,back=3.32,bottom=.35,r=1.30,spring=2.05,eye=1.85,fixedHead=2.25,angle=85,cross=-4.72),
 'sourcing':dict(x=0,back=6.29,bottom=.20,r=1.32,spring=2.25,eye=1.94,fixedHead=2.30,angle=85,cross=-7.55),
 'otoku':dict(x=-5.3,back=4.89,bottom=3.48,r=1.12,spring=2.10,eye=6.05,angle=85,cross=-6.10),
 'lottery':dict(x=5.10,back=4.42,bottom=3.55,r=1.32,spring=2.12,eye=6.15,angle=85,cross=-7.10,single=True,fixedSill=5.60,hingeBottom=5.60),
}

def _subset(source,polygons,name):
 mesh=source.data;ids=sorted({v for p in polygons for v in p.vertices});remap={v:i for i,v in enumerate(ids)}
 out=bpy.data.meshes.new(name);out.from_pydata([mesh.vertices[v].co[:]for v in ids],[],[tuple(remap[v]for v in p.vertices)for p in polygons])
 for m in mesh.materials:out.materials.append(m)
 out.update()
 for a,b in zip(polygons,out.polygons):b.material_index=a.material_index;b.use_smooth=a.use_smooth
 for layer in mesh.uv_layers:
  copied=out.uv_layers.new(name=layer.name)
  for a,b in zip(polygons,out.polygons):
   for ai,bi in zip(a.loop_indices,b.loop_indices):copied.data[bi].uv=layer.data[ai].uv
 out.normals_split_custom_set([mesh.corner_normals[i].vector[:]for p in polygons for i in p.loop_indices])
 obj=bpy.data.objects.new(name,out);bpy.context.collection.objects.link(obj);return obj

def _key(p,m,n):return(tuple(round(x,6)for x in p),m,tuple(round(x,4)for x in n))

def _cut(source,axis,value,negative,name):
 mesh=source.data;original={}
 for p in mesh.polygons:
  for li in p.loop_indices:original[_key(mesh.vertices[mesh.loops[li].vertex_index].co,p.material_index,p.normal)]=mesh.corner_normals[li].vector[:]
 bm=bmesh.new();bm.from_mesh(mesh);co=Vector((0,0,0));co[axis]=value;normal=Vector((0,0,0));normal[axis]=1
 bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=1e-7,plane_co=co,plane_no=normal,use_snap_center=True,clear_outer=negative,clear_inner=not negative)
 edges=[e for e in bm.edges if e.is_boundary and all(abs(v.co[axis]-value)<1e-5 for v in e.verts)]
 caps=set(bmesh.ops.holes_fill(bm,edges=edges,sides=0)['faces'])
 for face in caps:
  nearby=Counter(f.material_index for e in face.edges for f in e.link_faces if f not in caps);assert nearby
  face.material_index=nearby.most_common(1)[0][0];face.smooth=False
 bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));assert not any(e.is_boundary for e in bm.edges),(name,'open edge')
 assert all(v.co[axis]<=value+1e-6 for v in bm.verts) if negative else all(v.co[axis]>=value-1e-6 for v in bm.verts)
 out=bpy.data.meshes.new(name)
 for m in mesh.materials:out.materials.append(m)
 bm.to_mesh(out);bm.free();out.update();normals=[]
 for p in out.polygons:
  for li in p.loop_indices:normals.append(original.get(_key(out.vertices[out.loops[li].vertex_index].co,p.material_index,p.normal),p.normal[:]))
 out.normals_split_custom_set(normals);obj=bpy.data.objects.new(name,out);bpy.context.collection.objects.link(obj);return obj

def _join(objects,name):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name=name;return objects[0]

def _bounds(obj):
 points=[obj.matrix_world@v.co for v in obj.data.vertices]
 return {'min':[min(p.x for p in points),min(p.z for p in points),-max(p.y for p in points)],'max':[max(p.x for p in points),max(p.z for p in points),-min(p.y for p in points)]}

def split_native_portals():
 result={}
 for key,cfg in PORTALS.items():
  source=bpy.data.objects['room-'+key];assert source.type=='MESH'
  assert all(abs(source.matrix_world[i][j]-Matrix.Identity(4)[i][j])<1e-6 for i in range(4)for j in range(4))
  attr=source.data.attributes['court_motion'];parts={i:[]for i in range(5)}
  for p in source.data.polygons:parts[attr.data[p.index].value].append(p)
  fixed_head=cfg.get('fixedHead');static=parts[0]+(parts[4] if fixed_head else []);moving=parts[1]+([] if fixed_head else parts[4])
  frame=_subset(source,static,'portal-frame-'+key);move=_subset(source,moving,'_moving-'+key)
  if fixed_head:
   lower=_cut(move,2,fixed_head-.003,True,'_lower-'+key);upper=_cut(move,2,fixed_head,False,'_fixed-upper-'+key)
   bpy.data.objects.remove(move,do_unlink=True);move=lower;frame=_join([frame,upper],'portal-frame-'+key)
  if cfg.get('fixedSill'):
   level=cfg['fixedSill'];upper=_cut(move,2,level+.003,False,'_clerestory-'+key);lower=_cut(move,2,level,True,'_fixed-lower-'+key)
   bpy.data.objects.remove(move,do_unlink=True);move=upper;frame=_join([frame,lower],'portal-frame-'+key)
  handles={}
  for side,index in [('left',2),('right',3)]:
   if parts[index]:handles[side]=_subset(source,parts[index],'handle-'+key+'-'+side)
  sides=['left']if cfg.get('single')else['left','right'];leaves={}
  for side in sides:
   if cfg.get('single'):move.name='leaf-'+key+'-'+side;leaves[side]=move
   else:leaves[side]=_cut(move,0,cfg['x'],side=='left','leaf-'+key+'-'+side)
  if not cfg.get('single'):bpy.data.objects.remove(move,do_unlink=True)
  bpy.data.objects.remove(source,do_unlink=True)
  root=bpy.data.objects.new('room-'+key,None);bpy.context.collection.objects.link(root)
  root['destination']=key;root['roomKey']=key;root['sealed']=False;frame.parent=root;hinges=[]
  radius=cfg['r']-.08
  for side in sides:
   # Front-mounted axis keeps paired thick mouldings from interpenetrating at
   # the centre joint during the first degrees of a real inward swing.
   pivot=Vector((cfg['x']+(-radius if side=='left'else radius),cfg['back']-.14,cfg.get('hingeBottom',cfg['bottom'])))
   hinge=bpy.data.objects.new('hinge-'+key+'-'+side,None);bpy.context.collection.objects.link(hinge);hinge.parent=root;hinge.location=pivot
   for obj in [leaves[side]]+([handles[side]]if side in handles else[]):
    for v in obj.data.vertices:v.co-=pivot
    obj.data.update();obj.parent=hinge;obj.matrix_parent_inverse=Matrix.Identity(4);obj.matrix_basis=Matrix.Identity(4);obj['destination']=key
    if obj==leaves[side]:
     # Author the shared joint at mesh-local X=0. This prevents inverse-ray
     # cancellation at a large integer boundary without adding any overlap.
     centre_offset=cfg['x']-pivot.x
     for v in obj.data.vertices:v.co.x-=centre_offset
     obj.data.update();obj.location.x=centre_offset
   hinges.append({'node':hinge.name,'leaf':leaves[side].name,'handle':handles[side].name if side in handles else None,'axis':[0,1,0],'pivot':[round(pivot.x,5),round(pivot.z,5),round(-pivot.y,5)],'openRadians':math.radians(cfg['angle'])*(1 if side=='left'else-1)})
  if key=='otoku':rect_min=[cfg['x']-.60,5.60,-cfg['back']+.05];rect_max=[cfg['x']+.60,6.40,-cfg['back']+.05]
  elif key=='lottery':rect_min=[cfg['x']-.60,5.72,-cfg['back']+.05];rect_max=[cfg['x']+.60,6.58,-cfg['back']+.05]
  else:rect_min=[cfg['x']-radius+.04,cfg['bottom']+.10,-cfg['back']+.05];rect_max=[cfg['x']+radius-.04,fixed_head-.04,-cfg['back']+.05]
  spec={'version':1,'room':key,'units':'meters','up':'Y','axisSpace':'world','leafMode':'single'if cfg.get('single')else'paired','eye':[cfg['x'],cfg['eye'],-cfg['back']],'frame':frame.name,'hinges':hinges,
   'aperture':{'shape':'arched','center':[cfg['x'],cfg['eye'],-cfg['back']],'right':[1,0,0],'up':[0,1,0],'normal':[0,0,1],'width':radius*2,'height':cfg['spring']+radius-.035,'springY':cfg['bottom']+cfg['spring']},
   'opaqueRect':{'min':rect_min,'max':rect_max},'approach':'approach-'+key,'seal':{'preferredDistance':1.10,'coverageMargin':.10,'fovDegrees':40,'eyeHeight':cfg['eye']},
   'crossing':{'position':[cfg['x'],cfg['eye'],cfg['cross']],'target':[cfg['x'],cfg['eye'],cfg['cross']-1.5],'fovDegrees':40}}
  if fixed_head:spec['fixedFanlight']={'node':frame.name,'movingWoodTopY':fixed_head-.003,'headClearanceMeters':.003}
  if cfg.get('fixedSill'):spec['fixedLowerPane']={'node':frame.name,'stationaryBelowY':cfg['fixedSill'],'movingPaneBottomY':cfg['fixedSill']+.003,'sillClearanceMeters':.003}
  bpy.context.view_layer.update();spec['closedLeafBounds']={side:_bounds(leaves[side])for side in sides}
  # Blender IDProperties cannot represent null. The deterministic GLB postpass
  # restores explicit handle:null for the two authored handle-free upper rooms.
  root['courtPortal']={**spec,'hinges':[{k:v for k,v in h.items()if v is not None}for h in hinges]};result[key]=spec
  print('NATIVE_PORTAL',key,'mode',spec['leafMode'],'fixedFanlight',fixed_head,flush=True)
 return result
