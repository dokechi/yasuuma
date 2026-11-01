"""Native Blender material bake: original periodic microrelief -> tangent normal/ORM.
No reference photograph/map is edited or converted into a claimed normal map.
"""
import bpy,math,os
R=os.path.join(os.path.dirname(os.path.abspath(__file__)),'materials');os.makedirs(R,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.mesh.primitive_plane_add(size=1);o=bpy.context.object;o.name='Original periodic stone baking plane'
m=bpy.data.materials.new('Original periodic limestone microrelief');m.use_nodes=True;o.data.materials.append(m);n=m.node_tree.nodes;l=m.node_tree.links
p=n.get('Principled BSDF');out=n.get('Material Output');p.inputs['Base Color'].default_value=(.4,.4,.4,1);p.inputs['Roughness'].default_value=.86
uv=n.new('ShaderNodeTexCoord');sep=n.new('ShaderNodeSeparateXYZ');l.new(uv.outputs['UV'],sep.inputs[0])
def mathnode(op,a,b=None):
 x=n.new('ShaderNodeMath');x.operation=op
 if hasattr(a,'bl_idname'):l.new(a,x.inputs[0])
 else:x.inputs[0].default_value=a
 if b is not None:
  if hasattr(b,'bl_idname'):l.new(b,x.inputs[1])
  else:x.inputs[1].default_value=b
 return x.outputs[0]
u=mathnode('MULTIPLY',sep.outputs['X'],2*math.pi);v=mathnode('MULTIPLY',sep.outputs['Y'],2*math.pi)
co=n.new('ShaderNodeCombineXYZ');l.new(mathnode('COSINE',u),co.inputs['X']);l.new(mathnode('COSINE',v),co.inputs['Y']);l.new(mathnode('ADD',mathnode('SINE',u),mathnode('SINE',v)),co.inputs['Z'])
noise=n.new('ShaderNodeTexNoise');noise.noise_dimensions='3D';noise.inputs['Scale'].default_value=22;noise.inputs['Detail'].default_value=3;noise.inputs['Roughness'].default_value=.65;l.new(co.outputs[0],noise.inputs['Vector'])
bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.38;bump.inputs['Distance'].default_value=.0014;l.new(noise.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs['Normal'],p.inputs['Normal'])
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=8;s.cycles.use_denoising=False;s.render.bake.margin=0;s.render.bake.use_clear=True
image=bpy.data.images.new('stone-normal-v1',width=192,height=192,alpha=False);image.colorspace_settings.name='Non-Color';dest=n.new('ShaderNodeTexImage');dest.image=image;n.active=dest
bpy.ops.object.bake(type='NORMAL',normal_space='TANGENT');image.filepath_raw=os.path.join(R,'stone-normal-v1.png');image.file_format='PNG';image.save()
# Shared packed ORM: AO neutral white, physically rough variation in G, metal0 B.
rough=mathnode('ADD',mathnode('MULTIPLY',noise.outputs['Fac'],.18),.74)
combine=n.new('ShaderNodeCombineColor');combine.mode='RGB';combine.inputs['Red'].default_value=1;combine.inputs['Blue'].default_value=0;l.new(rough,combine.inputs['Green'])
em=n.new('ShaderNodeEmission');l.new(combine.outputs[0],em.inputs['Color']);em.inputs['Strength'].default_value=1;l.new(em.outputs[0],out.inputs['Surface'])
image=bpy.data.images.new('stone-orm-v1',width=128,height=128,alpha=False);image.colorspace_settings.name='Non-Color';dest.image=image;n.active=dest
bpy.ops.object.bake(type='EMIT');image.filepath_raw=os.path.join(R,'stone-orm-v1.png');image.file_format='PNG';image.save()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(R,'stone-material-source.blend'))
print('STONE_PBR_BAKE_COMPLETE',flush=True)
