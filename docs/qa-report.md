# QA report

Apple M3 Pro, Chrome stable, Playwright 1.63, WebGL through SwiftShader. Last full runs: 25 e2e passed three times in a row after the final fix; 34 unit and API tests passed.

| Matrix row (blueprint 18) | Covered by | Result |
|---|---|---|
| Intro first load, skip, refresh mid-sequence | demo walk (asserts HUD opacity 1, camera at the aerial pose, the grey reveal gone), refresh test, choices during the last fade kept, a mid-intro check of roots, sapling and wave | pass |
| Input: click, keyboard, drag | demo walk (a species chip dragged onto a site), site buttons and the year slider by keyboard | pass |
| Input: touch | phone layout only | not tested |
| Responsive | phone 390 px: rail becomes a strip, panel below, no sideways overflow | pass at one phone size |
| Motion: reduced | static story, same planner | pass |
| Graphics: success, failure, context loss | `?gfx=off` journey through planning, optimising, heat and species; lost-context event | pass |
| Domain | normalised growth, seasons, sun position and azimuth, shade cast by trees and buildings, more trees never raise any cell's temperature, optimiser budget, spacing, site limits, the 30 percent rule and equity weight, calendar rules, tile bounds | pass (34 tests) |
| API | paging, filters, idempotent scenarios and optimisation, validation, heat tiles, OpenAPI 3.1 | pass |
| Visual regression | six views against the poster fallback | pass |
| Performance | budgets in tests/e2e/performance.spec.ts | pass |

**Not validated against the real world.** The growth, shade and heat models are simplified and the district is invented; they are checked against the physics they implement.

Defects found during the build: the unit tests caught a sign error in the sun's azimuth (mornings were in the west, so shadows fell the wrong way before and after noon); an own-cell shade test was wrong for a low winter sun (the shadow lands 29 m away) and was rewritten as total shade; the validator caught five asset contract violations on its first run; the ground shader's colours were dark until it included the renderer's tone mapping and colour-space chunks (and a directive placed after code on the same line was silently invalid); the planner's site list offered sites where the chosen species could not be planted, so it now lists only sites it fits; the budget slider went to $300,000 though about $108,000 plants every open site.
