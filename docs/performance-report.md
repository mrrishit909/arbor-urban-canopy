# Performance report

Measured with `node scripts/measure.mjs` on an Apple M3 Pro with Chrome through SwiftShader (CPU rasteriser) at the 2050 view of the starter plan. These are bounds, **not GPU results**; no physical GPU was available.

| Metric | Value |
|---|---|
| Transfer | 939 KB, 21 requests (the model is 329 KB, 77 KB gzipped) |
| LCP | 5,080 ms (software rendering) |
| CLS | 0 |
| Long tasks | 4,065 ms in total during load |
| Frame time, map view | median 33.4 ms, p95 116.7 ms in software |
| Draw calls / triangles | 15 / 84,426 (236 instanced trees, 29 instanced buildings, one ground plane) |
| Simulation | a full shade and heat evaluation about 2 ms in Node; two growth scrubs plus re-rendering took 22 ms of test time in the browser; the optimiser about 150 ms |

Budgets enforced by the e2e suite: GLB under 500 KB, district JSON under 60 KB, gzipped JS under 750 KB, fewer than 150 draw calls and 120,000 triangles, two growth scrubs in under 4 s.
