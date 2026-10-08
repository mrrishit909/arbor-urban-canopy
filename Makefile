# ARBOR: ports web 8721, API 8720, Postgres 55630 (reserved for the PostGIS build, not used by the demo).
.PHONY: dev model seed test e2e build serve perf
model:  ; npm run model
seed:   ; node data/simulators/generate.ts
test:   ; npx vitest run
build:  ; node scripts/copy-assets.ts && NEXT_PUBLIC_BASE_PATH= npm run build -w @arbor/web
serve:  ; node scripts/serve.ts 8721
e2e: build ; npx playwright test
perf:   ; node scripts/measure.mjs
dev:    ; node scripts/copy-assets.ts && npm run dev -w @arbor/web & node apps/api/src/server.ts
