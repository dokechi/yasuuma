"""Original architectural arrival court; geometry/PBR only, no external artwork.
Run with Blender 4.3: blender -b -t 8 -P build_arrival_court.py
"""
import bpy, math, random, json, os, collections, sys, hashlib
from mathutils import Vector
from math import sin, cos, pi
ROOT=os.path.dirname(os.path.abspath(__file__)); random.seed(27)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for m in list(bpy.data.materials): bpy.data.materials.remove(m)
M={}
def mat(name,color,rough=.7,metal=0,emission=0):
 m=bpy.data.materials.new(name); m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Roughness'].default_value=rough; p.inputs['Metallic'].default_value=metal
 if emission: p.inputs['Emission Color'].default_value=(*color,1); p.inputs['Emission Strength'].default_value=emission
 M[name]=m; return m
mat('stone_dusk',(.24,.27,.29),.86);mat('stone_worn',(.34,.34,.31),.83);mat('stone_shadow',(.13,.16,.18),.93)
mat('oak_smoked',(.13,.075,.041),.76);mat('brass_aged',(.43,.28,.105),.39,.83);mat('iron_forged',(.065,.078,.078),.6,.72)
mat('window_amber',(.64,.31,.07),.36,.05,.55)
mat('cloth_burgundy',(.25,.043,.075),.93);mat('cloth_violet',(.16,.095,.25),.94);mat('cloth_amber',(.48,.24,.07),.88)
mat('copper_patina',(.075,.19,.17),.64,.58);mat('cloth_teal',(.055,.19,.19),.9)
static=[]; apertures=[]; anchors={}; active_portal=None
def finish(o,name,material,keep=False):
 o.name=name; o.data.materials.append(M[material]); (apertures if keep else static).append(o)
 if active_portal:o['portalOwner']=active_portal
 return o
def bevel(o,width=.025,segments=1):
 if width:
  mod=o.modifiers.new('Hand softened edges','BEVEL');mod.width=width;mod.segments=segments
  bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
  mod=o.modifiers.new('Architectural normals','WEIGHTED_NORMAL');mod.keep_sharp=True
  bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
def box(name,loc,size,material='stone_dusk',edge=.025,rotation=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.dimensions=size
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);bevel(o,edge);o.rotation_euler.z=rotation
 return finish(o,name,material)
def cyl(name,loc,r,depth,material='stone_dusk',vertices=24,edge=.02):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=loc);o=bpy.context.object;bevel(o,edge)
 return finish(o,name,material)
def orb(name,loc,r,material='brass_aged',segments=24,rings=12):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,radius=r,location=loc);o=bpy.context.object
 for p in o.data.polygons:p.use_smooth=True
 return finish(o,name,material)
def rod(name,a,b,r,material='iron_forged',vertices=8):
 d=Vector(b)-Vector(a);o=cyl(name,(Vector(a)+Vector(b))/2,r,d.length,material,vertices,0);o.rotation_euler=d.to_track_quat('Z','Y').to_euler();return o
def mesh(name,verts,faces,material,keep=False,edge=0):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o)
 if edge:bevel(o,edge)
 return finish(o,name,material,keep)
def extrude_shape(name,points,y,depth,material,keep=False,edge=0):
 n=len(points);verts=[(x,y-depth/2,z) for x,z in points]+[(x,y+depth/2,z) for x,z in points]
 faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 return mesh(name,verts,[tuple(reversed(f)) for f in faces],material,keep,edge)
def arch_shape(x,z,r,spring,steps=16):
 return [(x-r,z),(x+r,z),(x+r,z+spring)]+[(x+r*cos(i*pi/steps),z+spring+r*sin(i*pi/steps)) for i in range(1,steps+1)]
def arch_ring(name,x,y,z,r,spring,thick=.28,depth=.4,material='stone_worn',segments=13):
 # Individually bevelled voussoirs and grounded pier courses.
 for i in range(segments):
  a=i*pi/segments+.009;b=(i+1)*pi/segments-.009
  pts=[(x+(r+thick)*cos(a),z+spring+(r+thick)*sin(a)),(x+(r+thick)*cos(b),z+spring+(r+thick)*sin(b)),(x+r*cos(b),z+spring+r*sin(b)),(x+r*cos(a),z+spring+r*sin(a))]
  extrude_shape(name+' arch stone',pts,y,depth,material,edge=.012)
 courses=max(3,round(spring/.42));h=spring/courses
 for side in [-1,1]:
  for j in range(courses):box(name+' pier',(x+side*(r+thick/2),y,z+h*(j+.5)),(thick,depth,h-.018),material,.018)
  box(name+' capital',(x+side*(r+thick/2),y,z+spring),(thick+.11,depth+.10,.13),material,.015)
  box(name+' foot',(x+side*(r+thick/2),y,z+.08),(thick+.13,depth+.16,.16),material,.014)
def anchor(name,point,meta=None):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=point;o.empty_display_size=.2
 if meta:
  for k,v in meta.items():o[k]=v
 anchors[name]=point;return o
def door(key,x,y,z,r=1.1,spring=2.05,accent='cloth_burgundy',closed=False):
 global active_portal
 prefix=('closed-' if closed else 'room-')+key;active_portal=prefix
 arch_ring(prefix,x,y,z,r,spring)
 lower=key in ('insurance','rakuten','sourcing')
 back=y+(.12 if closed else .64)
 o=extrude_shape(prefix,arch_shape(x,z+.035,r-.08,spring-.035),back,.10,'oak_smoked' if closed or lower else 'window_amber',True)
 if lower:
  pts=[(x-r*.72,z+spring-.12),(x+r*.72,z+spring-.12)]+[(x+r*.72*cos(i*pi/14),z+spring-.12+r*.72*sin(i*pi/14)) for i in range(15)]
  extrude_shape(prefix+' warm transom',pts,back-.061,.025,'window_amber')
  for dx in [-.42,.42]:orb(prefix+' brass latch',(x+dx,back-.12,z+1.12),.055,'brass_aged',10,5)
 o['destination']=key;o['sealed']=closed;o['semantic']='sealed wing' if closed else 'existing authenticated destination'
 # Visible depth of reveal; no invisible floating hotspot geometry.
 arch_ring(prefix+' inner reveal',x,y+.07,z,r-.09,spring,.065,.11,'iron_forged',11)
 for dx in [-.65,-.32,0,.32,.65]:
  if abs(dx)>=r-.09:continue
  top=z+spring+math.sqrt(max(0,(r-.10)**2-dx**2));rod(prefix+' mullion',(x+dx,back-.08,z+.08),(x+dx,back-.08,top-.04),.022,'oak_smoked' if lower else 'iron_forged',6)
 for zz in [z+.85,z+spring]:box(prefix+' transom',(x,back-.09,zz),(2*r-.20,.065,.055),'oak_smoked' if lower else 'iron_forged',.005)
 if closed:
  for zz in [z+.65,z+1.25]:box(prefix+' sealed brace',(x,y-.10,zz),(2*r-.12,.10,.14),'iron_forged',.012)
  orb(prefix+' lock',(x,y-.19,z+.98),.07,'brass_aged',12,6)
 else:
  # Restrained textile / seal identity, not five differently coloured floodlights.
  bx=x-r-.46
  box(prefix+' identity textile',(bx,y-.48,z+spring-.18),(.23,.055,1.26),accent,.008)
  rod(prefix+' brass hanging rail',(bx-.20,y-.52,z+spring+.48),(bx+.20,y-.52,z+spring+.48),.025,'brass_aged')
  # Upper focus targets sit on visible room-owned fanlights, not the lower roof.
  focus_lift={'otoku':1.50,'lottery':1.00}.get(key,0)
  anchor('focus-'+key,(x+.14,back-.10,z+spring*.72+focus_lift),{'destination':key})
 anchor(prefix+'-threshold',(x,y-.38,z+.06),{'destination':key,'sealed':closed})
 active_portal=None
 return o

def wall(name,x,y,z,w,h,depth=.65):
 # Courses remain true relief, not a tiled image.
 rows=round(h/.52);cols=max(2,round(w/.94));dy=h/rows
 for row in range(rows):
  for col in range(cols):
   xx=x-w/2+(col+.5)*w/cols
   material=random.choices(['stone_dusk','stone_worn','stone_shadow'],[.75,.19,.06])[0]
   box(name,(xx,y,z+(row+.5)*dy),(w/cols-.024,depth+random.uniform(-.025,.025),dy-.020),material,.02)

def gable(name,x,y,z,width,depth,rise,material='oak_smoked'):
 pts=[(x-width/2,z),(x+width/2,z),(x,z+rise)]
 extrude_shape(name,pts,y,depth,material)
 # Three-dimensional eaves and restrained exposed timber.
 for side in [-1,1]:rod(name+' ridge edge',(x,y-depth/2-.05,z+rise),(x+side*width/2,y-depth/2-.05,z),.095,'oak_smoked')
 rod(name+' ridge',(x,y-depth/2-.05,z+rise),(x,y+depth/2+.05,z+rise),.07,'brass_aged')
def lantern(x,y,z):
 cyl('Lantern lower rim',(x,y,z-.15),.13,.07,'brass_aged',12)
 cyl('Lantern amber core',(x,y,z),.095,.27,'window_amber',12,0)
 cyl('Lantern top',(x,y,z+.17),.14,.07,'brass_aged',12)
 for dx,dy in [(-.10,0),(.10,0),(0,-.1),(0,.1)]:rod('Lantern cage',(x+dx,y+dy,z-.15),(x+dx,y+dy,z+.16),.014,'iron_forged',6)

# One inhabited stone court, deliberately spacious in the foreground.
box('Courtyard foundation',(0,0,-.43),(23,24,.72),'stone_shadow',.13)
for row in range(11):
 for col in range(11):
  x=-10.5+(col+.5)*1.92+(.40 if row%2 else 0);y=-10.5+(row+.5)*1.72
  if abs(x)>11:continue
  box('Worn terrace slab',(x,y,random.uniform(-.016,.016)),(1.88,1.68,.14),random.choices(['stone_dusk','stone_worn','stone_shadow'],[.69,.25,.06])[0],.035)
# Thick edge of the elevated court reads as material rather than a floating plate.
for x in range(-11,12,2):box('Terrace nosing',(x,-10.75,-.10),(1.97,.35,.35),'stone_worn',.045)

# Lower study and dining wings. Portals sit inside heavy, dimensional buildings.
for key,x,y,r,accent in [('insurance',-5.6,2.2,1.18,'cloth_burgundy'),('rakuten',5.25,2.7,1.30,'cloth_amber')]:
 z=.35;w=4.05;top=4.75
 box(key+' raised foundation',(x,y+1.15,.10),(w+.5,3.6,.36),'stone_shadow',.06)
 for j in range(3):box(key+' entrance step',(x,y-.85+j*.25,.05+j*.10),(2*r+.85,.42,.18),'stone_worn',.035)
 wall(key+' left mass',x-w/2+.37,y+.65,z,.72,top-z,1.9)
 wall(key+' right mass',x+w/2-.37,y+.65,z,.72,top-z,1.9)
 box(key+' roof beam',(x,y+.7,4.5),(w+.18,2.55,.28),'oak_smoked',.045)
 door(key,x,y-.02,z,r,2.05,accent)
 gable(key+' low roof',x,y+.9,4.65,w+.55,3.0,.85)
 lantern(x-r-.56,y-.26,2.3)

# Left archive: narrow vertical Gothic proportions and a raised balcony.
wall('Archive back',-5.5,6.0,.2,5.4,6.8,1.0)
box('Archive balcony',(-5.5,4.65,3.30),(5.3,2.4,.32),'stone_worn',.055)
door('otoku',-5.3,4.25,3.48,1.12,2.1,'cloth_violet')
gable('Archive roof',-5.45,5.3,7.02,5.65,3.3,1.05)
for x in [-7.7,-3.3]:box('Archive buttress',(x,4.9,3.7),(.48,1.3,7.0),'stone_dusk',.04)

# A central stair spine is inherited from the original cutaway silhouette.
wall('Central tower back',0,7.35,.1,4.1,9.2,1.0)
for x in [-1.75,1.75]:wall('Central flanking pier',x,6.2,.2,.58,8.1,1.7)
door('sourcing',0,5.65,.20,1.32,2.25,'cloth_teal')
box('Central lower cornice',(0,6.6,4.42),(4.5,2.75,.28),'stone_worn',.04)
box('Central upper cornice',(0,6.9,8.22),(4.6,2.7,.30),'stone_worn',.04)
door('reserve',0,6.15,6.05,.63,1.18,closed=True)
gable('Central tower roof',0,7.0,9.3,5.0,3.5,1.28,'copper_patina')
for i in range(16):
 yy=1.90+i*.27; zz=.18+i*.205
 box('Stair to upper galleries',(-2.35,yy,zz),(1.42,.31,.27),'stone_worn',.02)
for i in range(8):
 yy=2.05+i*.54;zz=.95+i*.41
 rod('Stair rail baluster',(-3.06,yy,zz-.7),(-3.06,yy,zz+.12),.027)
rod('Stair continuous brass handrail',(-3.06,1.90,1.03),(-3.06,6.10,4.22),.042,'brass_aged')

# Right observatory: actual round tower/dome, not a flat image of one.
tower=cyl('Observatory round tower',(5.05,6.4,4.10),2.55,7.7,'stone_dusk',32,.035)
 # True deep aperture cut: the recessed glass is not painted over a solid cylinder.
cutter=extrude_shape('temporary observatory opening',arch_shape(5.10,3.54,1.25,2.13),4.15,2.1,'stone_shadow')
mod=tower.modifiers.new('Deep window embrasure','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter
bpy.context.view_layer.objects.active=tower;bpy.ops.object.modifier_apply(modifier=mod.name)
static.remove(cutter);bpy.data.objects.remove(cutter,do_unlink=True)
# The warm aperture is proud of the opaque tower, with a deep architectural reveal.
door('lottery',5.10,3.78,3.55,1.32,2.12,'cloth_teal')
box('Observatory balcony',(5.05,4.05,3.35),(5.5,2.1,.28),'stone_worn',.05)
# Low-poly smooth dome with ribs; patina is kept calm against warm window light.
verts=[];faces=[];rings=9;sectors=40
for j in range(rings+1):
 a=(j/rings)*(pi/2);rr=2.79*cos(a);zz=7.98+2.22*sin(a)
 for i in range(sectors):verts.append((5.05+rr*cos(2*pi*i/sectors),6.4+rr*sin(2*pi*i/sectors),zz))
for j in range(rings):
 for i in range(sectors):faces.append((j*sectors+i,j*sectors+(i+1)%sectors,(j+1)*sectors+(i+1)%sectors,(j+1)*sectors+i))
dome=mesh('Patinated observatory dome',verts,faces,'copper_patina')
for p in dome.data.polygons:p.use_smooth=True
for i in range(10):
 a=2*pi*i/10
 for j in range(6):
  aa=(j/6)*(pi/2);bb=((j+1)/6)*(pi/2)
  rod('Dome brass rib',(5.05+2.80*cos(aa)*cos(a),6.4+2.80*cos(aa)*sin(a),7.98+2.23*sin(aa)),(5.05+2.80*cos(bb)*cos(a),6.4+2.80*cos(bb)*sin(a),7.98+2.23*sin(bb)),.025,'brass_aged',6)
cyl('Observatory dome collar',(5.05,6.4,7.94),2.83,.18,'brass_aged',40,.025)
cyl('Dome lantern crown',(5.05,6.4,10.25),.27,.42,'brass_aged',16,.02)

# Three sealed wings are visibly solid and structurally secondary.
for key,x,y in [('planned-5',-9.6,5.5),('planned-6',9.6,6.1)]:
 wall(key+' annex',x,y+.7,.15,2.5,3.8,1.8)
 door(key,x,y-.3,.14,.68,1.55,closed=True)
 gable(key+' annex roof',x,y+.6,3.98,2.9,2.8,.72)

# Simple parapets connect the architecture instead of separate boxed destinations.
for xa,xb,y,z in [(-7.9,-3.0,3.45,3.52),(2.7,7.65,3.3,3.55),(-8.0,-7.65,1.0,.25),(7.65,9.0,1.65,.25)]:
 for k in range(max(2,round((xb-xa)/.45))+1):
  x=xa+(xb-xa)*k/max(2,round((xb-xa)/.45));rod('Forged balcony baluster',(x,y,z),(x,y,z+.75),.022)
 rod('Brass balcony handrail',(xa,y,z+.78),(xb,y,z+.78),.035,'brass_aged')

# The court's functional navigational landmark has real scale and floor contact.
center=(0,-1.8,2.85)
cyl('Armillary broad stone footing',(0,-1.8,.20),1.48,.34,'stone_shadow',32,.06)
cyl('Armillary worn plinth',(0,-1.8,.49),1.20,.30,'stone_worn',32,.04)
cyl('Armillary brass rim',(0,-1.8,.68),1.15,.12,'brass_aged',40,.02)
cyl('Armillary stone pedestal',(0,-1.8,1.02),.65,.64,'stone_dusk',12,.035)
cyl('Armillary cap',(0,-1.8,1.40),.81,.16,'brass_aged',32,.025)
for side in [-1,1]:rod('Armillary yoke',(side*.72,-1.8,1.43),(side*1.18,-1.8,2.87),.075,'brass_aged',10)
for j,(r,rx,ry,rz) in enumerate([(1.36,pi/2,0,.25),(1.26,pi/2,.65,0),(1.16,1.05,.35,1.0),(1.03,0,.35,0)]):
 bpy.ops.mesh.primitive_torus_add(major_segments=64,minor_segments=6,location=center,major_radius=r,minor_radius=.035 if j else .065)
 o=bpy.context.object;o.rotation_euler=(rx,ry,rz);finish(o,'Armillary calibrated ring '+str(j),'brass_aged')
 for p in o.data.polygons:p.use_smooth=True
orb('Armillary center globe',center,.31,'brass_aged',28,14)
rod('Armillary spindle',(0,-1.8,1.41),(0,-1.8,4.37),.032,'brass_aged',10)
orb('Armillary finial',(0,-1.8,4.40),.09,'brass_aged',12,6)
for i in range(24):
 a=2*pi*i/24;rod('Readable physical calibration',(1.36*cos(a),-1.8,2.85+1.36*sin(a)),(1.44*cos(a),-1.8,2.85+1.44*sin(a)),.012,'brass_aged',5)
anchor('arrival-orrery',(0,-1.8,2.85),{'purpose':'quiet selection landmark, no fabricated status'})

# Very few human-scale details; keep the court calm, not a prop catalogue.
for x,y in [(-7.9,.4),(7.9,1.1)]:
 cyl('Low lantern pedestal',(x,y,.42),.24,.74,'stone_dusk',12,.03);lantern(x,y,1.00)
for x,y in [(-8.5,2.3),(7.6,4.0)]:
 box('Closed oak service chest',(x,y,.48),(.8,.64,.83),'oak_smoked',.035)
 for zz in [.2,.65]:box('Chest forged strap',(x,y-.33,zz),(.86,.045,.07),'iron_forged',.008)

# Portal ownership is geometric: frame/mullions/latches select the same room.
print('ARRIVAL_AUTHORING_DONE',len(static),flush=True)
portal_groups={}
for o in static+apertures:
 if o.get('portalOwner'):portal_groups.setdefault(o['portalOwner'],[]).append(o)
background=[o for o in static if not o.get('portalOwner')]
groups={material:[o for o in background if o.data.materials[0].name==material] for material in M}
for material,obs in groups.items():
 if not obs:continue
 bpy.ops.object.select_all(action='DESELECT')
 for o in obs:o.select_set(True)
 bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();obs[0].name='architecture-'+material
for name,obs in portal_groups.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in obs:o.select_set(True)
 primary=next((o for o in obs if o.name==name),obs[0]);bpy.context.view_layer.objects.active=primary;bpy.ops.object.join();primary.name=name
 primary['destination']=name.removeprefix('room-').removeprefix('closed-');primary['sealed']=name.startswith('closed-');primary['roomKey']=primary['destination']

# Native insurance-only continuity slice. All other room geometry stays static.
sys.path.insert(0,ROOT)
from split_insurance_portal import split_insurance_portal
insurance_portal = split_insurance_portal()

# Identical actual embedded image maps in Blender proof and standard glTF PBR.
base=bpy.data.images.load(os.path.join(ROOT,'materials','stone-basecolor-v1.jpg'));base.colorspace_settings.name='sRGB'
normal=bpy.data.images.load(os.path.join(ROOT,'materials','stone-normal-v1.png'));normal.colorspace_settings.name='Non-Color'
orm=bpy.data.images.load(os.path.join(ROOT,'materials','stone-orm-v1.png'));orm.colorspace_settings.name='Non-Color'
for key,tint in [('stone_dusk',(.45,.50,.56,1)),('stone_worn',(.49,.53,.58,1)),('stone_shadow',(.38,.43,.48,1))]:
 m=M[key];n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF')
 color=n.new('ShaderNodeTexImage');color.image=base;color.extension='REPEAT'
 mul=n.new('ShaderNodeMixRGB');mul.blend_type='MULTIPLY';mul.inputs[0].default_value=1;mul.inputs[2].default_value=tint;l.new(color.outputs['Color'],mul.inputs[1]);l.new(mul.outputs[0],p.inputs['Base Color'])
 tex=n.new('ShaderNodeTexImage');tex.image=normal;tex.extension='REPEAT'
 nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.35;l.new(tex.outputs['Color'],nm.inputs['Color']);l.new(nm.outputs['Normal'],p.inputs['Normal'])
 tex=n.new('ShaderNodeTexImage');tex.image=orm;tex.extension='REPEAT';sep=n.new('ShaderNodeSeparateColor');sep.mode='RGB';l.new(tex.outputs['Color'],sep.inputs['Color']);l.new(sep.outputs['Green'],p.inputs['Roughness']);l.new(sep.outputs['Blue'],p.inputs['Metallic'])
 # Source material factors survive standard glTF export; shared maps keep cost bounded.
 m['materialIntent']='original limestone image + native baked periodic microrelief; shared PBR'
for o in list(bpy.context.scene.objects):
 if o.type!='MESH' or not any(m.name.startswith('stone_') for m in o.data.materials):continue
 uv=o.data.uv_layers.active or o.data.uv_layers.new(name='UVMap')
 for poly in o.data.polygons:
  axis=max(range(3),key=lambda i:abs(poly.normal[i]));coords=[]
  for li in poly.loop_indices:
   p=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co
   coords.append((p.y*4,p.z*4) if axis==0 else (p.x*4,p.z*4) if axis==1 else (p.x*4,p.y*4))
  ox=math.floor(min(v[0] for v in coords));oy=math.floor(min(v[1] for v in coords))
  for li,(u,v) in zip(poly.loop_indices,coords):uv.data[li].uv=(u-ox,v-oy)
# Deep, restrained glass; lower actual doors are dark oak with a small warm fanlight.
M['window_amber'].node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.16,.073,.022,1)
M['window_amber'].node_tree.nodes.get('Principled BSDF').inputs['Emission Color'].default_value=(.40,.19,.04,1)
M['window_amber'].node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value=.19
M['brass_aged'].node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.46

# Cameras: export uses Blender Z-up -> glTF Y-up conversion automatically.
def camera(name,loc,target,lens):
 bpy.ops.object.camera_add(location=loc);o=bpy.context.object;o.name=name;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();o.data.lens=lens;o.data.sensor_fit='VERTICAL';o.data.sensor_height=24;o.data.clip_start=.1;o.data.clip_end=180;return o
cam=camera('arrival-camera',(7.5,-12,2.65),(-.2,2.2,3.30),33)
phone=camera('phone-camera',(.5,-16,2.6),(-3.85,1.5,3.5),24/(2*math.tan(math.radians(22))))
# A selected doorway gets human-height focus instead of fitting every gate on a phone.
approach_positions={'insurance':(-4.2,-5,2.2),'rakuten':(6,-4,2.2),'sourcing':(2.2,-3.5,2.3),'otoku':(-8.5,-.1,5.8),'lottery':(8,-.5,6.1)}
for key,pos in approach_positions.items():
 anchor('approach-'+key,pos,{'target':'focus-'+key})

# Preview lighting. Renderer should reproduce this soft-key/contact-light intent.
world=bpy.data.worlds.new('Cool quiet dusk');bpy.context.scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.25,.31,.39,1);world.node_tree.nodes['Background'].inputs[1].default_value=.28
light_specs=[]
def area(name,loc,target,energy,size,color):
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=energy;o.data.shape='DISK';o.data.size=size;o.data.color=color;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();light_specs.append({'name':name,'blenderPosition':loc,'target':target,'power':energy,'size':size,'color':color});return o
area('Large upper-left moon-soft key',(-9,-9,15),(0,1,2),1800,8,(.75,.84,1.0))
area('Warm threshold reflection',(5,-2,9),(0,1,1),260,5,(1,.72,.42))
area('Cool architectural rim',(4,12,14),(0,3,4),1400,9,(.60,.73,1))
scene=bpy.context.scene;scene.camera=cam;scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=False;scene.cycles.max_bounces=6
scene.render.resolution_x=1200;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.render.film_transparent=False
# The inspection ground extends beyond the authored terrace, but is not exported.
proof_ground=box('PROOF_ONLY distant ground',(0,0,-.87),(240,240,.08),'stone_shadow',0)
proof_ground.hide_render=False

# Export only authored court meshes, named anchors/cameras; no proof lights/ground.
bpy.ops.object.select_all(action='DESELECT')
exported=[]
for o in scene.objects:
 if o.type in ('MESH','EMPTY','CAMERA') and not o.name.startswith('PROOF_ONLY'):
  o.select_set(True);exported.append(o)
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'arrival-court-v1-raw.glb'),export_format='GLB',use_selection=True,export_cameras=True,export_extras=True,export_yup=True,export_apply=True,export_texcoords=True,export_normals=True,export_materials='EXPORT',export_animations=False)
triangles=0
for o in exported:
 if o.type=='MESH':o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles)
def yup(p):return [round(p[0],5),round(p[2],5),round(-p[1],5)]
meta={'version':1,'units':'meters','up':'Y','origin':'courtyard floor below central stair spine','triangleCount':triangles,'materialCount':len(M),'meshCount':sum(o.type=='MESH' for o in exported),'glbBytes':os.path.getsize(os.path.join(ROOT,'arrival-court-v1-raw.glb')),'cameras':{'arrival-camera':{'position':yup(cam.location),'target':yup((-.2,2.2,3.3)),'fovVerticalDegrees':round(math.degrees(cam.data.angle_y),3)},'phone-camera':{'position':yup(phone.location),'target':yup((-3.85,1.5,3.5)),'fovVerticalDegrees':round(math.degrees(phone.data.angle_y),3)}},'anchors':{k:yup(v) for k,v in anchors.items()},'materials':list(M),'lightingIntent':'broad cool upper-left key; restrained warm window reflections; contact shadows essential; no bloom blanket','budget':{'trianglesTarget':60000,'trianglesMaximum':80000,'glbMaximumBytes':2000000,'materialsMaximum':12,'drawCallsMaximum':50},'notes':['Static original architectural prototype; not a claim of Igloo-equivalent render quality.','Original embedded PBR stone maps only; no copied models/art, external URI, user data or character replacements.','Existing reader, authentication, immediate routes and painted castle remain implementation-owned fallback.','Phone should select/focus a room, never shrink all gates to unreadable miniatures.']}
meta['portals']={'insurance':insurance_portal}
meta['budget'].update(trianglesMaximum=60000,primitiveGroupsTarget=52,primitiveGroupsMaximum=64,drawCallsMaximum=128)
meta['authoredRevision']='v4-insurance-native'
meta['notes'][0]='Original architectural prototype with native insurance portal; actual WebGL continuity QA required.'
json.dump(meta,open(os.path.join(ROOT,'arrival-court-v1-layout.json'),'w'),ensure_ascii=False,indent=2)
json.dump({'asset':'arrival-court-v1.glb','authoredRevision':'v4-insurance-native','authoring':'Original procedural mesh/material authoring using Blender 4.3.2 Python API','source':'build_arrival_court.py','sourceRecipe':['build_arrival_court.py','split_insurance_portal.py','quantize_arrival_court.py','bake_stone_material.py'],'sourceFiles':{name:{'bytes':os.path.getsize(os.path.join(ROOT,name)),'sha256':hashlib.sha256(open(os.path.join(ROOT,name),'rb').read()).hexdigest()} for name in ['build_arrival_court.py','split_insurance_portal.py','quantize_arrival_court.py','bake_stone_material.py'] if os.path.exists(os.path.join(ROOT,name))},'sourceArtworkUsed':'Original imagegen basecolor and original native-baked material maps; no external raster/model inputs. Architectural continuity informed by existing original castle cutaway and room identities.','references':'User-provided Igloo screenshots used only for atmosphere, light/space quality analysis, not copied or embedded.','generatedRasterAssets':'Original built-in imagegen stone basecolor plus native Blender-baked technical normal/ORM maps','proofRenders':'Blender inspection renders, not shipped image replacements','licenses':'Original geometry and material definitions; no third-party assets','geometry':meta},open(os.path.join(ROOT,'arrival-court-v1-provenance.json'),'w'),ensure_ascii=False,indent=2)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'arrival-court-v1.blend'))
print('ARRIVAL_ASSET_STATS',json.dumps({k:meta[k] for k in ['triangleCount','materialCount','meshCount','glbBytes']}),flush=True)
if '--render' in sys.argv:
 scene.render.filepath=os.path.join(ROOT,'arrival-court-v1-proof-wide.png');bpy.ops.render.render(write_still=True)
 scene.camera=phone;scene.render.resolution_x=720;scene.render.resolution_y=1080;scene.render.filepath=os.path.join(ROOT,'arrival-court-v1-proof-phone.png');bpy.ops.render.render(write_still=True)
 print('ARRIVAL_RENDER_COMPLETE',flush=True)
