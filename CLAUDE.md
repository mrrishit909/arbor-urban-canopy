# ARBOR

Urban tree canopy planner demo (blueprint 10, Advanced Engineering Build Book Vol. VII). Static site; the Blender kit is scripted. Linden Quarter, its trees, sites, heat and costs are synthetic and the models are simplified: NOT for real planning decisions.

- Build the asset: `npm run model` (Blender 4.5 at ~/Applications), then `node scripts/copy-assets.ts`. Contract: `model/parts.json` (57 named parts: 11 city modules, four tree archetypes x three growth stages x trunk and crown, four branch and four leaf specimens). Trees are normalised (trunk y 0..1, crown unit radius) so the browser scales them per species and age. `model/exports/analysis.json` is checked by `packages/domain/test`.
- Domain: `packages/domain/src` (district.ts blocks, buildings, sites, inventory; species.ts growth, leaves, shade; sun.ts; heat.ts shade and feels-like on a 5 m grid; scenario.ts metrics and site priority; optimize.ts greedy budget optimiser; calendar.ts; tiles.ts). Data: `npm run seed`. Tests: `npm test`, `npm run e2e` after `npm run build`.
- Space: metres. Domain x is east, y north, origin south-west; the scene is centred on the district with north = -z (`toScene`). Azimuth is clockwise from north. The ground is one shader plane (layout texture plus heat or shade layer plus the intro's grey-to-green reveal).
- R3F note: update `<shaderMaterial>` uniforms through `ref.current.uniforms`, not through the object you passed in `uniforms={...}`.
- `window.__aLive` and `window.__arborStats` are exposed for tests.
- Multi-agent is the development process only (.claude/agents); the product contains no agents.
