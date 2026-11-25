import bpy
import math
import os
import sys

# Parse output paths from args after '--'
argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
render_png = argv[0] if len(argv) > 0 else "C:\\Windows\\Temp\\meridian_monolith.png"
export_glb = argv[1] if len(argv) > 1 else "C:\\Windows\\Temp\\meridian_monolith.glb"

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# Render settings - EEVEE Next for rapid crisp architectural studio render on Windows headless
engine_names = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engine_names else "CYCLES"
if scene.render.engine == "CYCLES":
    scene.cycles.samples = 48
    scene.cycles.use_denoising = True
scene.render.resolution_x = 1200
scene.render.resolution_y = 1200
scene.render.resolution_percentage = 100
scene.render.film_transparent = False
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"

# Color management
scene.view_settings.view_transform = "AgX" if "AgX" in [i.identifier for i in scene.view_settings.bl_rna.properties["view_transform"].enum_items] else "Filmic"
scene.view_settings.look = "None"

# World background = linear approximation of Midnight Navy #020B29
world = bpy.data.worlds.new("MeridianWorld")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
if bg:
    bg.inputs[0].default_value = (0.0022, 0.0060, 0.0245, 1.0)
    bg.inputs[1].default_value = 1.0

# Materials
def make_pbr(name, color, metallic=0.85, roughness=0.28, emission=None, emission_strength=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = 0.25
        bsdf.inputs["Coat Roughness"].default_value = 0.12
    if emission is not None and emission_strength > 0:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat

mat_navy_core = make_pbr("AnodizedNavyCore", (0.012, 0.025, 0.085), metallic=0.88, roughness=0.24)
mat_copper_bevel = make_pbr("BrushedCopper", (0.81, 0.30, 0.11), metallic=0.96, roughness=0.22)
mat_copper_bright = make_pbr("LuminousCopper", (0.98, 0.62, 0.34), metallic=0.92, roughness=0.14, emission=(0.90, 0.42, 0.18), emission_strength=0.45)

# Collection
col = bpy.data.collections.new("MeridianPolyhedron")
scene.collection.children.link(col)

# 1. Inner chamfered hexagonal prism monolith (aligned to dm-mark geometry)
bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=1.05, depth=1.55, location=(0, 0, 0))
core = bpy.context.active_object
core.name = "MeridianCore"
core.data.materials.append(mat_navy_core)
bpy.ops.object.modifier_add(type="BEVEL")
core.modifiers["Bevel"].width = 0.085
core.modifiers["Bevel"].segments = 4
core.rotation_euler = (math.radians(18), math.radians(-14), math.radians(24))

# 2. Inner precision copper wireframe prism cage
bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=1.22, depth=1.68, location=(0, 0, 0))
cage = bpy.context.active_object
cage.name = "CopperCage"
cage.data.materials.append(mat_copper_bevel)
bpy.ops.object.modifier_add(type="WIREFRAME")
cage.modifiers["Wireframe"].thickness = 0.028
cage.modifiers["Wireframe"].use_even_offset = True
cage.rotation_euler = core.rotation_euler

# 3. Equatorial + Inclined Precision Meridian Rings (2 calibrated gimbals)
for idx, (rad, tilt_x, tilt_y, rot_z) in enumerate([
    (1.72, 68, 12, 15),
    (1.52, -52, 28, -22),
]):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=rad,
        minor_radius=0.018,
        major_segments=72,
        minor_segments=12,
        location=(0, 0, 0),
    )
    ring = bpy.context.active_object
    ring.name = f"MeridianRing_{idx}"
    ring.data.materials.append(mat_copper_bevel)
    ring.rotation_euler = (math.radians(tilt_x), math.radians(tilt_y), math.radians(rot_z))

# 4. 6 Coordinate Hexagonal Governance Nodes (referencing dm-mark 6-vertex perimeter)
ring_radius = 1.72
for i in range(6):
    theta = math.radians(i * 60 + 30)
    x = ring_radius * math.cos(theta)
    y = ring_radius * math.sin(theta)
    # Transform by ring 0 rotation manually or parent via empty
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.055, location=(x * 0.92, y * 0.92, (1 if i % 2 == 0 else -1) * 0.34))
    node = bpy.context.active_object
    node.name = f"HexNode_{i}"
    node.data.materials.append(mat_copper_bright)

# Studio lighting setup: Key (warm copper rim), Cool edge (steel blue), Subtle fill
def add_light(name, ltype, loc, rot_deg, energy, color, size=2.0):
    bpy.ops.object.light_add(type=ltype, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.data.energy = energy
    obj.data.color = color
    if ltype == "AREA":
        obj.data.size = size
    obj.rotation_euler = tuple(math.radians(a) for a in rot_deg)
    return obj

add_light("WarmKeyLight", "AREA", (3.8, -3.2, 2.8), (58, 0, 48), 520.0, (1.0, 0.72, 0.50), size=3.2)
add_light("CoolRimLight", "AREA", (-4.2, 2.6, 2.2), (66, 0, -125), 340.0, (0.45, 0.65, 1.0), size=3.5)
add_light("UnderFill", "AREA", (0.2, -2.5, -3.4), (132, 0, 10), 140.0, (0.90, 0.52, 0.30), size=4.0)

# Camera framing with generous museum breathing room around outer meridian gimbal
bpy.ops.object.camera_add(location=(0.0, -6.85, 0.52))
cam = bpy.context.active_object
cam.rotation_euler = (math.radians(85.5), 0, 0)
cam.data.lens = 54
scene.camera = cam

# Apply modifiers on meshes cleanly before GLB export
bpy.ops.object.select_all(action="DESELECT")
for obj in list(bpy.data.objects):
    if obj.type == "MESH":
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        for mod in list(obj.modifiers):
            try:
                bpy.ops.object.modifier_apply(modifier=mod.name)
            except Exception:
                pass
        bpy.ops.object.shade_smooth()
        obj.select_set(False)

# Save transparent-friendly PNG plate on #020B29 ground
scene.render.filepath = render_png
bpy.ops.render.render(write_still=True)

# Save editable .blend source file alongside PNG/GLB
blend_path = os.path.splitext(export_glb)[0] + ".blend"
bpy.ops.wm.save_as_mainfile(filepath=blend_path)

# Export lightweight binary glTF (.glb) for progressive WebGL viewer
bpy.ops.export_scene.gltf(
    filepath=export_glb,
    export_format="GLB",
    export_draco_mesh_compression_enable=False,
    export_apply=True,
)
print("Rendered PNG:", render_png)
print("Exported GLB:", export_glb)
