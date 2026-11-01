"""Original insurance portal partition; no new material or decorative geometry.

Splits only the existing door/pane/wood bars at their centre and caps the cuts.
Static arch, iron reveal and identity banner remain unchanged. Custom corner
normals and UVs are retained on extracted geometry; new cut faces are flat.
"""
import bpy
import bmesh
import math
from collections import Counter
from mathutils import Matrix, Vector

CENTER_X = -5.6
PIVOTS = {'left': Vector((-6.70, 2.82, .35)),
          'right': Vector((-4.50, 2.82, .35))}  # Blender Z-up


def _subset(source, polygons, name):
    mesh = source.data
    old_ids = sorted({v for p in polygons for v in p.vertices})
    remap = {v: i for i, v in enumerate(old_ids)}
    out = bpy.data.meshes.new(name)
    out.from_pydata([mesh.vertices[v].co[:] for v in old_ids], [],
                    [tuple(remap[v] for v in p.vertices) for p in polygons])
    for material in mesh.materials:
        out.materials.append(material)
    out.update()
    for a, b in zip(polygons, out.polygons):
        b.material_index = a.material_index
        b.use_smooth = a.use_smooth
    for layer in mesh.uv_layers:
        copied = out.uv_layers.new(name=layer.name)
        for a, b in zip(polygons, out.polygons):
            for ai, bi in zip(a.loop_indices, b.loop_indices):
                copied.data[bi].uv = layer.data[ai].uv
    normals = [mesh.corner_normals[i].vector[:] for p in polygons
               for i in p.loop_indices]
    if normals:
        out.normals_split_custom_set(normals)
    obj = bpy.data.objects.new(name, out)
    bpy.context.collection.objects.link(obj)
    return obj


def _normal_key(point, material, normal):
    return (tuple(round(x, 6) for x in point), material,
            tuple(round(x, 4) for x in normal))


def _half(source, side):
    mesh = source.data
    original_normals = {}
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            point = mesh.vertices[mesh.loops[li].vertex_index].co
            original_normals[_normal_key(point, poly.material_index, poly.normal)] = \
                mesh.corner_normals[li].vector[:]
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.bisect_plane(
        bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces), dist=1e-7,
        plane_co=Vector((CENTER_X, 0, 0)), plane_no=Vector((1, 0, 0)),
        use_snap_center=True, clear_outer=side == 'left',
        clear_inner=side == 'right')
    edges = [e for e in bm.edges if e.is_boundary and
             all(abs(v.co.x - CENTER_X) < 1e-5 for v in e.verts)]
    caps = set(bmesh.ops.holes_fill(bm, edges=edges, sides=0)['faces'])
    for face in caps:
        nearby = Counter(f.material_index for e in face.edges for f in e.link_faces
                         if f not in caps)
        assert nearby, 'Cut cap must inherit an existing surface material'
        face.material_index = nearby.most_common(1)[0][0]
        face.smooth = False
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    assert not any(e.is_boundary for e in bm.edges), 'Leaf cut left an open edge'
    assert all(v.co.x <= CENTER_X + 1e-6 for v in bm.verts) if side == 'left' \
        else all(v.co.x >= CENTER_X - 1e-6 for v in bm.verts)
    out = bpy.data.meshes.new('leaf-insurance-' + side)
    for material in mesh.materials:
        out.materials.append(material)
    bm.to_mesh(out)
    bm.free()
    out.update()
    normals = []
    for poly in out.polygons:
        for li in poly.loop_indices:
            point = out.vertices[out.loops[li].vertex_index].co
            normals.append(original_normals.get(
                _normal_key(point, poly.material_index, poly.normal),
                poly.normal[:]))
    out.normals_split_custom_set(normals)
    obj = bpy.data.objects.new(out.name, out)
    bpy.context.collection.objects.link(obj)
    return obj


def split_insurance_portal():
    source = bpy.data.objects['room-insurance']
    assert source.type == 'MESH'
    assert all(abs(source.matrix_world[i][j] - Matrix.Identity(4)[i][j]) < 1e-6
               for i in range(4) for j in range(4)), 'Expected authored world-space portal'
    materials = source.data.materials
    parts = {'frame': [], 'moving': [], 'left-handle': [], 'right-handle': []}
    for poly in source.data.polygons:
        material = materials[poly.material_index].name
        points = [source.data.vertices[v].co for v in poly.vertices]
        if material in ('oak_smoked', 'window_amber'):
            parts['moving'].append(poly)
        elif material == 'brass_aged' and all(
                -6.12 < p.x < -5.08 and 2.50 < p.y < 2.90 and 1.30 < p.z < 1.65
                for p in points):
            parts['left-handle' if sum(p.x for p in points) / len(points) < CENTER_X
                  else 'right-handle'].append(poly)
        else:
            parts['frame'].append(poly)
    assert all(parts.values()), 'Expected frame, paired handles and movable surfaces'
    frame = _subset(source, parts['frame'], 'portal-frame-insurance')
    moving = _subset(source, parts['moving'], '_insurance-moving-source')
    handles = {side: _subset(source, parts[side + '-handle'], 'handle-insurance-' + side)
               for side in ('left', 'right')}
    leaves = {side: _half(moving, side) for side in ('left', 'right')}
    bpy.data.objects.remove(moving, do_unlink=True)
    bpy.data.objects.remove(source, do_unlink=True)
    root = bpy.data.objects.new('room-insurance', None)
    bpy.context.collection.objects.link(root)
    root['destination'] = 'insurance'
    root['roomKey'] = 'insurance'
    root['sealed'] = False
    frame.parent = root
    for side, pivot in PIVOTS.items():
        hinge = bpy.data.objects.new('hinge-insurance-' + side, None)
        bpy.context.collection.objects.link(hinge)
        hinge.parent = root
        hinge.location = pivot
        for obj in (leaves[side], handles[side]):
            for vertex in obj.data.vertices:
                vertex.co -= pivot
            obj.data.update()
            obj.parent = hinge
            obj.matrix_parent_inverse = Matrix.Identity(4)
            obj.matrix_basis = Matrix.Identity(4)
            obj['destination'] = 'insurance'
            obj['portalPart'] = 'handle' if obj == handles[side] else 'leaf'
        hinge['portalPart'] = 'hinge'
    metadata = {
        'version': 1, 'room': 'insurance', 'units': 'meters', 'up': 'Y',
        'axisSpace': 'world', 'eye': [-5.6, 1.94, -2.82],
        'frame': 'portal-frame-insurance',
        'hinges': [
            {'node': 'hinge-insurance-left', 'leaf': 'leaf-insurance-left',
             'handle': 'handle-insurance-left', 'axis': [0, 1, 0],
             'pivot': [-6.70, .35, -2.82], 'openRadians': math.radians(85)},
            {'node': 'hinge-insurance-right', 'leaf': 'leaf-insurance-right',
             'handle': 'handle-insurance-right', 'axis': [0, 1, 0],
             'pivot': [-4.50, .35, -2.82], 'openRadians': -math.radians(85)}],
        'aperture': {'shape': 'arched', 'center': [-5.6, 1.94, -2.82],
                     'right': [1, 0, 0], 'up': [0, 1, 0], 'normal': [0, 0, 1],
                     'width': 2.2, 'height': 3.115, 'springY': 2.4},
        'opaqueRect': {'min': [-6.66, .45, -2.77], 'max': [-4.54, 2.39, -2.77]},
        'approach': 'approach-insurance',
        'seal': {'preferredDistance': 1.10, 'coverageMargin': .10, 'fovDegrees': 40,
                 'eyeHeight': 1.94},
        'crossing': {'position': [-5.6, 1.94, -4.10], 'target': [-5.6, 1.94, -5.6],
                     'fovDegrees': 40}}
    root['courtPortal'] = metadata
    bpy.context.view_layer.update()
    print('INSURANCE_NATIVE_PORTAL_SPLIT', {k: len(v) for k, v in parts.items()}, flush=True)
    return metadata
