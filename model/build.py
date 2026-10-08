"""ARBOR: an original city-district module set and four tree archetypes at three growth stages, plus a branch and a leaf specimen per archetype. Deterministic. Run: Blender -b -P model/build.py
Blender is Z-up, the GLB is Y-up (glTF z = -Blender y). 1 unit = 1 m. Trees are normalised: trunk y 0..1 (base radius 0.5), crown a unit-radius lumpy form centred on its origin; the browser scales and places them. Writes exports/analysis.json (measured bounds) and a poster."""
import bpy, bmesh, math, os, json, random
from mathutils import Vector, Matrix
HERE = os.path.dirname(os.path.abspath(__file__)); P = json.load(open(os.path.join(HERE, "parts.json")))
os.makedirs(os.path.join(HERE, "exports"), exist_ok=True); os.makedirs(os.path.join(HERE, "renders"), exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True); scene = bpy.context.scene
def mat(name, color, rough=0.7, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*color, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal; return m
M = {"concrete": mat("Concrete", (0.72, 0.71, 0.67)), "asphalt": mat("Asphalt", (0.16, 0.17, 0.17), 0.9), "grass": mat("Lawn", (0.3, 0.5, 0.2)), "bark": mat("Bark", (0.32, 0.22, 0.14), 0.9), "leaf": mat("Leaf", (0.49, 0.7, 0.35), 0.6), "conifer": mat("Conifer", (0.16, 0.36, 0.24), 0.7), "metal": mat("Metal", (0.5, 0.52, 0.5), 0.4, 0.8), "wood": mat("Wood", (0.5, 0.35, 0.2), 0.8), "glass": mat("Glass", (0.68, 0.86, 0.89), 0.1), "soil": mat("Soil", (0.09, 0.1, 0.08), 1.0)}
def obj(name, bm, material, parent=None, loc=(0, 0, 0)):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(material)
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o); o.parent = parent; o.location = loc; return o
def empty(name, loc=(0, 0, 0), parent=None):
    e = bpy.data.objects.new(name, None); scene.collection.objects.link(e); e.parent = parent; e.location = loc; return e
def box_bm(bm, c, s):
    x, y, z = c; sx, sy, sz = (v / 2 for v in s); v = [bm.verts.new((x + a * sx, y + b * sy, z + d * sz)) for a in (-1, 1) for b in (-1, 1) for d in (-1, 1)]
    for f in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)): bm.faces.new([v[i] for i in f])
def cyl_bm(bm, c, r1, r2, depth, seg=8):
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r1, radius2=r2, depth=depth, matrix=Matrix.Translation(c))
root = empty("District"); rnd = random.Random(1010)
# ---- city modules (top surfaces at z = 0, origins at the footprint centre)
def module(name, build, material, loc):
    bm = bmesh.new(); build(bm); return obj(name, bm, material, root, loc)
X = [0.0]
def spot(w): X[0] += w / 2 + 2; x = X[0]; X[0] += w / 2; return (x, -30.0, 0)
mods = P["modules"]
module("Road_Tile", lambda b: (box_bm(b, (0, 0, -0.1), (20, 20, 0.2)), box_bm(b, (0, 0, 0.005), (0.3, 20, 0.01))), M["asphalt"], spot(20))
module("Sidewalk_Tile", lambda b: (box_bm(b, (0, 0, -0.125), (5, 5, 0.25)), box_bm(b, (0, 2.4, 0.04), (5, 0.2, 0.08))), M["concrete"], spot(5))
module("Planting_Cutout", lambda b: (box_bm(b, (0, 0, -0.15), (1.4, 1.4, 0.3)), box_bm(b, (0, 0, 0.01), (1.0, 1.0, 0.02))), M["soil"], spot(1.4))
module("Lawn_Tile", lambda b: box_bm(b, (0, 0, -0.075), (10, 10, 0.15)), M["grass"], spot(10))
for k, name in enumerate(("Building_Block_A", "Building_Block_B", "Building_Block_C")):
    def blk(b, k=k):
        box_bm(b, (0, 0, 0.5), (1, 1, 1)); inset = 0.06 + 0.02 * k; box_bm(b, (0, 0, 1.0 + 0.015), (1 - inset, 1 - inset, 0.03))   # a parapet ring on the roof
        if k == 1: box_bm(b, (0.15, -0.1, 1.04), (0.3, 0.3, 0.08))
        if k == 2: box_bm(b, (-0.2, 0.2, 1.05), (0.25, 0.25, 0.1))
    module(name, blk, M["concrete"], spot(1))
module("Lamp_Post", lambda b: (cyl_bm(b, (0, 0, 3), 0.07, 0.05, 6, 8), box_bm(b, (0.35, 0, 5.9), (0.9, 0.2, 0.12))), M["metal"], spot(1.2))
module("Bench", lambda b: (box_bm(b, (0, 0, 0.45), (1.8, 0.5, 0.08)), box_bm(b, (0, 0.22, 0.75), (1.8, 0.08, 0.5)), box_bm(b, (-0.8, 0, 0.2), (0.1, 0.4, 0.4)), box_bm(b, (0.8, 0, 0.2), (0.1, 0.4, 0.4))), M["wood"], spot(2))
module("Hydrant", lambda b: (cyl_bm(b, (0, 0, 0.35), 0.13, 0.12, 0.7, 8), cyl_bm(b, (0, 0, 0.75), 0.16, 0.1, 0.1, 8)), M["metal"], spot(0.5))
module("Bus_Shelter", lambda b: (box_bm(b, (0, 0, 2.5), (4, 1.4, 0.1)), box_bm(b, (-1.9, 0, 1.25), (0.08, 0.08, 2.5)), box_bm(b, (1.9, 0, 1.25), (0.08, 0.08, 2.5)), box_bm(b, (0, 0.65, 1.3), (3.8, 0.04, 2.2))), M["glass"], spot(4))
# ---- trees: normalised trunk and crown per archetype and stage
def noise(v, k, seed):
    r = random.Random(int(abs(v.x * 91 + v.y * 57 + v.z * 33) * 1000) + seed); return 1 + (r.random() - 0.5) * k
def crown_bm(arch, stage):
    bm = bmesh.new()
    if arch == "Conifer":
        tiers = 2 + stage                                            # more, fuller tiers as it grows
        for t in range(tiers):
            f = t / max(1, tiers - 1); z0 = -1 + 2 * f * (1 - 0.5 / tiers); r = 1.0 - 0.62 * f; h = 2.0 / tiers * 1.35
            bmesh.ops.create_cone(bm, cap_ends=True, segments=10 + 2 * stage, radius1=r, radius2=0.04, depth=h, matrix=Matrix.Translation((0, 0, z0 + h / 2)))
        lo, hi = min(v.co.z for v in bm.verts), max(v.co.z for v in bm.verts)
        for v in bm.verts: v.co.z = -1 + 2 * (v.co.z - lo) / (hi - lo)                  # the tiers fill z = -1 to 1
        return bm
    bmesh.ops.create_icosphere(bm, subdivisions=1 + stage, radius=1.0)
    for v in bm.verts:
        n = noise(v.co, 0.16 + 0.08 * stage, 3 + stage); sx, sy, sz = (1, 1, 1)
        if arch == "Columnar": sx = sy = 1.0; sz = 1.0; t = (v.co.z + 1) / 2; pinch = 0.45 + 0.55 * math.sin(math.pi * min(1, max(0, t))) ** 0.7; v.co.x *= pinch; v.co.y *= pinch   # a spindle
        if arch == "Spreading": v.co.z *= 0.62; v.co.x *= 1.12; v.co.y *= 1.12
        v.co *= n
    rmax = max(math.hypot(v.co.x, v.co.y) for v in bm.verts)
    for v in bm.verts: v.co.x /= rmax; v.co.y /= rmax                                   # the widest point is exactly 1 in x and y
    return bm
def trunk_bm(stage):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.5, radius2=0.28, depth=1.0, matrix=Matrix.Translation((0, 0, 0.5)))
    for k in range(stage * 2):                                       # branch stubs at the top
        a = k * 2.4; bmesh.ops.create_cone(bm, cap_ends=True, segments=5, radius1=0.16, radius2=0.08, depth=0.4, matrix=Matrix.Translation((0.3 * math.cos(a), 0.3 * math.sin(a), 0.74)) @ Matrix.Rotation(0.7, 4, Vector((-math.sin(a), math.cos(a), 0))))
    return bm
STG = {}
tx = 0.0
for arch in P["archetypes"]:
    for s in range(P["stages"]):
        tr = empty(f"Tree_{arch}_S{s}", (tx, 0.0, 0), root); obj(f"Tree_{arch}_S{s}_Trunk", trunk_bm(s), M["bark"], tr); obj(f"Tree_{arch}_S{s}_Crown", crown_bm(arch, s), M["conifer"] if arch == "Conifer" else M["leaf"], tr, (0, 0, 2.4)); tx += 4.0
# ---- specimens: a leaf with veins and a branch with leaves
def outline(arch, n=48):
    pts = []
    for i in range(n):
        t = i / n
        if arch == "Round":      a = 2 * math.pi * t; r = 0.42 * (1 + 0.45 * math.cos(5 * a)); pts.append((r * math.cos(a), 0.45 + r * math.sin(a)))
        elif arch == "Spreading": a = 2 * math.pi * t; r = 0.5 * (1 + 0.38 * math.cos(3 * a)); pts.append((r * math.cos(a), 0.5 + r * math.sin(a)))
        elif arch == "Columnar":  a = 2 * math.pi * t; y = 0.5 - 0.5 * math.cos(a); w = 0.27 * math.sin(math.pi * y ** 0.8) * (1 + 0.1 * math.cos(30 * y)); pts.append((w if a < math.pi else -w, y))
        else:                      a = 2 * math.pi * t; pts.append((0.025 * math.cos(a), 0.5 + 0.5 * math.sin(a / 2) * (1 if t < 0.5 else -1) * 0 + (0.5 * (t * 2) if t < 0.5 else 0.5 * (2 - 2 * t))))
    ys = [p[1] for p in pts]; lo, hi = min(ys), max(ys); k = 1.0 / (hi - lo)
    return [(x * k, (y - lo) * k) for x, y in pts]                    # every leaf is exactly 1 long, base at 0
def leaf_bm(arch, scale=1.0, at=(0, 0, 0), rot=0.0):
    bm = bmesh.new(); pts = outline(arch)
    if arch == "Conifer":
        for k in range(10):                                         # a fascicle of needles
            a = (k - 4.5) * 0.09; v = [bm.verts.new((at[0] + math.sin(a) * 0.0 + (j) * math.sin(a) * scale, at[1] + j * math.cos(a) * scale, at[2] + (0.02 if j else 0))) for j in (0, 0.5, 1.0)]
            w = 0.012 * scale; vl = [bm.verts.new((at[0] + j * math.sin(a) * scale - w, at[1] + j * math.cos(a) * scale, at[2])) for j in (0, 0.5, 1.0)]
            for i in range(2): bm.faces.new((vl[i], v[i], v[i + 1], vl[i + 1]))
        return bm
    c = bm.verts.new((at[0], at[1] + 0.35 * scale, at[2] + 0.02)); ring = []
    ca, sa = math.cos(rot), math.sin(rot)
    for (x, y) in pts:
        x2, y2 = x * scale, y * scale; z = 0.07 * scale * (x * x) - 0.03 * scale * y; ring.append(bm.verts.new((at[0] + x2 * ca - y2 * sa, at[1] + x2 * sa + y2 * ca, at[2] + z)))
    for i in range(len(ring)): bm.faces.new((c, ring[i], ring[(i + 1) % len(ring)]))
    return bm
sx = 0.0
for arch in P["archetypes"]:
    leaf_obj = obj(f"Specimen_Leaf_{arch}", leaf_bm(arch, 1.0), M["conifer"] if arch == "Conifer" else M["leaf"], root, (sx, 30.0, 0))
    bm = bmesh.new(); cyl_bm(bm, (0, 0, 1.0), 0.04, 0.02, 2.0, 6); bm.transform(Matrix.Rotation(math.pi / 2, 4, "X"))   # a stem along +y
    n = 9 if arch != "Conifer" else 6
    for k in range(n):
        y = 0.25 + 0.2 * k; side = 1 if k % 2 == 0 else -1; lb = leaf_bm(arch, 0.5 if arch != "Conifer" else 0.35, (0.0, y, 0.0), side * 1.0 * (1 if arch != "Conifer" else 0.4)); tmp = bpy.data.meshes.new("t"); lb.to_mesh(tmp); lb.free(); bm.from_mesh(tmp); bpy.data.meshes.remove(tmp)
    obj(f"Specimen_Branch_{arch}", bm, M["conifer"] if arch == "Conifer" else M["leaf"], root, (sx, 34.0, 0)); sx += 3.0
pxb = bmesh.new(); box_bm(pxb, (200, 120, 10), (400, 240, 20)); proxy = obj("Proxy_District", pxb, M["concrete"], None)
# ---- measure and write analysis.json in glTF axes
bpy.context.view_layer.update(); ob = bpy.data.objects
def gl(v): return [round(v[0], 3), round(v[2], 3), round(-v[1], 3)]
def wb(o, local=False):
    vs = [(v.co if local else o.matrix_world @ v.co) for v in o.data.vertices]; a = gl([min(w[i] for w in vs) for i in range(3)]); b = gl([max(w[i] for w in vs) for i in range(3)]); return [[min(a[i], b[i]) for i in range(3)], [max(a[i], b[i]) for i in range(3)]]
tris = lambda o: sum(len(p.vertices) - 2 for p in o.data.polygons)
A = {"trees": {}, "modules": {}, "specimens": {}}
for arch in P["archetypes"]:
    A["trees"][arch] = []
    for s in range(P["stages"]):
        c, t = ob[f"Tree_{arch}_S{s}_Crown"], ob[f"Tree_{arch}_S{s}_Trunk"]; cb, tb = wb(c, True), wb(t, True)
        A["trees"][arch].append({"crownBounds": cb, "crownTris": tris(c), "trunkBounds": tb, "trunkTris": tris(t)})
for n in mods: A["modules"][n] = wb(ob[n], True)
for n in P["specimens"]: A["specimens"][n] = {"bounds": wb(ob[n], True), "tris": tris(ob[n])}
json.dump(A, open(os.path.join(HERE, "exports", "analysis.json"), "w"), indent=1)
# ---- poster: the corner of a street with mature trees
proxy.hide_render = True
for o in [o for o in ob if o.name.startswith(("Tree_", "Specimen_", "Road_Tile", "Sidewalk_Tile", "Planting_Cutout", "Lawn_Tile", "Building_Block", "Lamp_Post", "Bench", "Hydrant", "Bus_Shelter")) and o.type != "EMPTY"]: o.hide_render = True
def clone(src, name, loc, scale=(1, 1, 1), parent=None):
    o = bpy.data.objects.new(name, src.data); scene.collection.objects.link(o); o.location = loc; o.scale = scale; o.hide_render = False; return o
for i in range(-2, 3):
    for j in range(-1, 2): clone(ob["Road_Tile"] if (i == 0 or j == 0) else ob["Lawn_Tile"], f"Poster_{i}_{j}", (i * 20, j * 20, 0))
for k, (x, y, w, d, h) in enumerate(((-24, 24, 22, 20, 22), (4, 30, 18, 16, 30), (28, 26, 20, 18, 16), (-30, -26, 20, 16, 14), (26, -28, 22, 16, 24))): clone(ob[f"Building_Block_{'ABC'[k % 3]}"], f"Poster_B{k}", (x, y, 0), (w, d, h))
def tree(arch, s, x, y, h, r, dbh):
    tm = clone(ob[f"Tree_{arch}_S{s}_Trunk"], f"Poster_T{x}{y}", (x, y, 0), (dbh, dbh, h * 0.4)); cm = clone(ob[f"Tree_{arch}_S{s}_Crown"], f"Poster_C{x}{y}", (x, y, h * 0.4 + (h * 0.6) / 2), (r, r, h * 0.6 / 2)); return cm
for (x, y, a, h, r) in ((-12, -4.5, "Round", 14, 6), (-4, 4.5, "Spreading", 18, 8), (6, -4.5, "Round", 12, 5.5), (14, 4.5, "Columnar", 13, 3), (-20, 4.5, "Conifer", 15, 4.5), (22, -4.5, "Spreading", 16, 7.5)): tree(a, 2, x, y, h, r, 0.9)
w = bpy.data.worlds.new("W"); scene.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.68, 0.86, 0.89, 1)
d = bpy.data.lights.new("Sun", "SUN"); d.energy = 4.5; d.color = (1.0, 0.95, 0.85); so = bpy.data.objects.new("Sun", d); scene.collection.objects.link(so); so.rotation_euler = (math.radians(50), 0, math.radians(35))
bpy.ops.object.camera_add(location=(-44, -46, 24)); cam = bpy.context.active_object; scene.camera = cam; cam.data.lens = 32; cam.rotation_euler = (Vector((0, 0, 6)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.render.engine = "BLENDER_EEVEE_NEXT"; scene.render.resolution_x, scene.render.resolution_y = 1280, 720; scene.render.filepath = os.path.join(HERE, "renders", "poster.png")
for o in ob:
    if o.name.startswith("Poster_"): o.select_set(False)
bpy.ops.object.select_all(action="DESELECT")
for o in bpy.data.objects:
    if o.type in ("MESH", "EMPTY") and not o.name.startswith("Poster_"): o.select_set(True)
bpy.context.view_layer.objects.active = root
bpy.ops.export_scene.gltf(filepath=os.path.join(HERE, "exports", "district.glb"), export_format="GLB", use_selection=True, export_apply=True, export_yup=True, export_cameras=False, export_lights=False)
tt = sum(tris(o) for o in bpy.data.objects if o.type == "MESH" and not o.name.startswith("Poster_"))
print("district.glb", os.path.getsize(os.path.join(HERE, "exports", "district.glb")), "bytes", tt, "tris")
try: bpy.ops.render.render(write_still=True)
except Exception as e: print("poster failed", e)
