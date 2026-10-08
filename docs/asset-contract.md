# Asset contract

`model/parts.json` is read by `build.py`, `validate.py` and the web app. Blender is Z-up, the GLB is Y-up (glTF z = minus Blender y). 1 unit is 1 metre.

| Group | Names | Contract |
|---|---|---|
| Ground and street | Road_Tile 20 x 20, Sidewalk_Tile 5 x 5, Planting_Cutout 1.4, Lawn_Tile 10 | origin at the footprint centre, top at y = 0 |
| Buildings | Building_Block_A, B, C | unit 1 x 1 x 1 blocks with a parapet; the browser instances them scaled to each building |
| Furniture | Lamp_Post 6 m, Bench 1.8 m, Hydrant 0.8 m, Bus_Shelter 4 m | stand on y = 0 |
| Trees | Tree_{Round, Columnar, Spreading, Conifer}_S0..S2 with `_Trunk` and `_Crown` | trunk y 0 to 1, base radius 0.5; crown a lumpy form centred on its origin, widest x and z exactly 1, half height 0.55 to 1.2; crown triangles rise with the stage |
| Specimens | Specimen_Branch_<archetype>, Specimen_Leaf_<archetype> | a branch at least 1.5 long; a leaf 1 long with its base at 0 (needles for the conifer) |
| Analysis | Proxy_District | never drawn |

Outputs: `district.glb` (329 KB, 77 KB gzipped, 4,576 triangles), `analysis.json` (measured tree and module bounds), `poster.png`.

`validate.py` re-imports the GLB in a fresh scene and fails on: a missing part, an unparented node, an unapplied scale, a crown whose widest radius is not about 1 or whose half height is outside 0.55 to 1.2, a trunk that is not unit height on y = 0 or is wider than 0.62, crown triangle counts that do not grow across the three stages, a module footprint that differs from the contract, a lamp, bench or shelter of the wrong size, a specimen of the wrong length, or the triangle or byte budget being exceeded. On its first run it caught trunk stubs that stuck out above the trunk, a conifer taller than its contract, a columnar crown narrower than 1, and two leaves 1.16 and 1.25 long.
