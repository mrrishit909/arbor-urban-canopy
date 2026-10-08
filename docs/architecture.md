# Architecture

```
model/parts.json ──> model/build.py ──Blender──> district.glb (57 named parts, 4,576 triangles), analysis.json, poster.png
                 └─> model/validate.py (fresh-scene re-import: names, normalised trees, growing stage triangle counts, module footprints, specimens, budgets)
data/simulators/generate.ts ──> district (12 blocks, 29 buildings, surfaces), sites (265, with priority), trees (88), species (7), starter plan
packages/domain: district, species, sun, heat, scenario, optimize, calendar, tiles
apps/web (Next.js 16 static export): App ─ store (state + a cached simulation) ─ Panels (DOM + SVG plan + canvas heat map, six views) + Scene (R3F ground shader, instanced buildings and trees, roots, birds, specimen) + Intro (GSAP)
apps/api (node:http): the blueprint's section 12 contract
```

**One model, evaluated anywhere.** `evaluate(plantings, year, day, hour)` grows every tree to the year, rasterises each crown's shadow and the buildings' shade onto a 5 m grid for that sun position, turns shade and surface type into surface and feels-like temperatures, and summarises them. It takes about 2 ms, so the browser re-runs it on every slider move, and the API serves the same numbers.

**Growth between authored stages.** A tree's crown radius, height and trunk follow its species' saturating growth curve. The renderer picks one of three authored Blender stage meshes by the ratio of the crown to its mature size and scales it continuously; stage meshes are normalised so the scale is continuous across a stage change. Seasons shrink a bare crown and change its colour; the cherry flowers in April.

**Shade as a map.** There are no shadow maps in the canvas. Shade comes from the domain model onto a texture that the ground shader darkens with, and it expands as the year, the month or the hour changes. The sun light follows the same sun position.

**Optimiser.** Greedy: for every open (site, species) pair, estimate the cooling its crown would give the pedestrian cells it shades (more where it is hottest and in higher-vulnerability blocks), plus stormwater and habitat terms, divide by the planting cost, plant the best, reduce the heat it has relieved, repeat. No species may exceed 30 percent of the planting, species must fit the site and trees stay 5 m apart.

**Intro.** A thermometer shows the hottest quarter of the district's walkways before and after the plan (real model values). The seed, roots (browser-generated tube geometry, drawn progressively under a soil-coloured underside) and the sapling use the real hero site and the starter plan's first tree; the growth wave is a radius that the ground shader and the tree instances both read; the crowns then switch to the species analytics colours.

**Not built.** PostGIS and a Python optimisation library (JSON files and a greedy TypeScript optimiser), MapLibre or deck.gl, real parcel, canopy or heat data, wind, soil volume and root conflicts, street-level shadow casting from trees onto building walls.
