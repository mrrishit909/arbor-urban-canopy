# ARBOR: grow the city you want to live in

A grey low-poly district under hard sun, shimmering, and a thermometer climbing. A seed falls into a planting pit. The camera follows it underground as roots spread beneath the pavement, then comes back up to a sapling that grows in two seconds. Growth, shade and colour spread outward across the district while the temperature falls, and the camera rises to an aerial map where the crowns resolve into the analytics layer: **GROW THE CITY YOU WANT TO LIVE IN.**

Then the planner: a canopy map, a growth simulator from 2026 to 2050 (with month and hour, so the leaves, the shade and the sun move together), a heat and shade analysis by block, a planting planner where you drag a species onto a site (a species that cannot fit the site is refused with the reason), a species explorer that zooms from the canopy into a branch and a leaf, and a budget optimiser with a maintenance calendar.

Built from blueprint 10 of the *Advanced Engineering Build Book, Volume VII* as a **vertical slice**. **The district (Linden Quarter), its trees, planting sites, heat and costs are synthetic, and the growth, shade and heat models are simplified. Not for real planning decisions.**

- Live: https://mrrishit909.github.io/projects/arbor-urban-canopy/demo/
- Case study: https://mrrishit909.github.io/projects/arbor-urban-canopy/

## Run it
```bash
npm ci
npm run seed                      # district, sites, inventory, species, the starter plan
npm run model                     # Blender 4.5: build.py then validate.py (the GLB is committed, so optional)
npm test                          # 34 domain + API tests
npm run build && node scripts/serve.ts 8721   # static export at http://127.0.0.1:8721
npm run e2e                       # 25 Playwright tests (needs Google Chrome)
node apps/api/src/server.ts       # /v1 API on :8720, OpenAPI at /openapi.json
```
`?skip=1`, `?view=map|growth|heat|plan|species|budget`, `&year=2026..2050`, `&month=1..12`, `&hour=6..21`, `&plan=none`, `?gfx=off`, `?motion=reduced`.

## The pipeline
`model/parts.json` is the contract for 57 named parts: city modules, and four tree archetypes at three growth stages, normalised so the browser can scale them to any species and age. `build.py` makes them and writes `analysis.json`; `validate.py` re-imports the GLB and fails on a missing part, a crown or trunk outside its normalisation, or crown triangle counts that do not grow across the stages. The shade and heat model, the growth curves, the optimiser and the maintenance calendar are in `packages/domain`, shared by the browser and the API. See [docs/](docs/) and [design/](design/).

## Agent roles
`.claude/agents/` defines the twelve roles from the book, `.claude/skills/` the project skills. **Honest note:** this repository was produced by one Claude Code session playing those roles in sequence on one working tree, not by parallel subagents in separate worktrees. The multi-agent workflow is the development process; the product contains no agents.

## Not built, and why
PostGIS and a Python optimisation library (JSON files and a greedy TypeScript optimiser), MapLibre or deck.gl (an SVG plan, a canvas heat map and the 3D scene), real parcel, canopy or heat data, wind, soil volume and root conflicts, dragging the 3D camera, touch tests beyond the phone layout, and a measurement on a physical GPU. Frame numbers are SwiftShader. The optimiser stops at about $108,000 because that plants every open site.
