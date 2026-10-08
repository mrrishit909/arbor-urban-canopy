"""Fresh-scene re-import of exports/district.glb checked against parts.json and analysis.json. Exit 1 on failure."""
import bpy, os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__)); P = json.load(open(os.path.join(HERE, "parts.json"))); A = json.load(open(os.path.join(HERE, "exports", "analysis.json")))
bpy.ops.wm.read_factory_settings(use_empty=True); path = os.path.join(HERE, "exports", "district.glb"); bpy.ops.import_scene.gltf(filepath=path)
objs = {o.name.split(".")[0]: o for o in bpy.data.objects}; tris = lambda o: sum(len(p.vertices) - 2 for p in o.data.polygons)
need = list(P["modules"]) + list(P["specimens"]) + list(P["proxy"]) + ["District"]
for a in P["archetypes"]:
    for s in range(P["stages"]): need += [f"Tree_{a}_S{s}", f"Tree_{a}_S{s}_Trunk", f"Tree_{a}_S{s}_Crown"]
missing = [n for n in need if n not in objs]; bad = []
for n in need:
    o = objs.get(n)
    if o is not None and o.type == "MESH" and tuple(round(v, 4) for v in o.scale) != (1.0, 1.0, 1.0): bad.append(f"{n}: unapplied scale")
# trees are normalised so the browser can scale them to any species and age
for a, stages in A["trees"].items():
    for s, t in enumerate(stages):
        (clo, chi), (tlo, thi) = t["crownBounds"], t["trunkBounds"]; rx = max(abs(clo[0]), abs(chi[0]), abs(clo[2]), abs(chi[2]))
        if not 0.8 <= rx <= 1.25: bad.append(f"Tree_{a}_S{s}_Crown radius {rx:.2f} is not about 1")
        if not (0.55 <= (chi[1] - clo[1]) / 2 <= 1.2): bad.append(f"Tree_{a}_S{s}_Crown half height {(chi[1] - clo[1]) / 2:.2f} is outside 0.55 to 1.2")
        if abs(tlo[1]) > 0.02 or abs(thi[1] - 1.0) > 0.05: bad.append(f"Tree_{a}_S{s}_Trunk is not a unit-height trunk standing on y = 0 ({tlo[1]:.2f} to {thi[1]:.2f})")
        if max(abs(tlo[0]), abs(thi[0])) > 0.62: bad.append(f"Tree_{a}_S{s}_Trunk is wider than 0.62")
    ct = [t["crownTris"] for t in stages]
    if not (ct[0] < ct[1] < ct[2]): bad.append(f"{a}: crown triangle counts {ct} do not grow with the stage")
# modules match their contract footprint and sit with their top near y = 0
for n, m in P["modules"].items():
    lo, hi = A["modules"][n]; size = [hi[i] - lo[i] for i in range(3)]
    if "size" in m:
        if abs(size[0] - m["size"][0]) > 0.02 * max(1, m["size"][0]) or abs(size[2] - m["size"][2]) > 0.02 * max(1, m["size"][2]): bad.append(f"{n}: footprint {size[0]:.2f} x {size[2]:.2f}, contract {m['size'][0]} x {m['size'][2]}")
        if hi[1] > 1.2 + (m["size"][1] if m["size"][1] > 1 else 0.12) or lo[1] > 0.01: bad.append(f"{n}: does not stand on y = 0")
    if "height" in m and abs(size[1] - m["height"]) > 0.15: bad.append(f"{n}: height {size[1]:.2f}, contract {m['height']}")
    if "length" in m and abs(max(size[0], size[2]) - m["length"]) > 0.15: bad.append(f"{n}: length {max(size[0], size[2]):.2f}, contract {m['length']}")
for n, s in A["specimens"].items():
    lo, hi = s["bounds"]
    if "Branch" in n and max(hi[i] - lo[i] for i in range(3)) < 1.5: bad.append(f"{n} is shorter than 1.5")
    if "Leaf" in n and "Conifer" not in n and not 0.8 <= hi[2] - lo[2] <= 1.1: bad.append(f"{n} is {hi[2] - lo[2]:.2f} long, expected about 1")
orphans = [o.name for o in bpy.data.objects if o.parent is None and o.name.split(".")[0] not in ("District", "Proxy_District")]
total_tris = sum(tris(o) for o in bpy.data.objects if o.type == "MESH"); size_b = os.path.getsize(path); fail = list(bad)
if missing: fail.append(f"missing {missing}")
if orphans: fail.append(f"unparented {orphans}")
if total_tris > P["budget"]["tris"]: fail.append(f"{total_tris} tris over budget")
if size_b > P["budget"]["bytes"]: fail.append(f"{size_b} bytes over budget")
rep = {"tris": total_tris, "bytes": size_b, "parts": len(need), "missing": missing, "orphans": orphans, "problems": bad}
json.dump(rep, open(os.path.join(HERE, "exports", "validation.json"), "w"), indent=1); print(json.dumps(rep, indent=1))
if fail: print("VALIDATION FAILED:", fail); sys.exit(1)
print("VALIDATION OK")
