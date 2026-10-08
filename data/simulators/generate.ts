// Deterministic synthetic data: the district, candidate sites with priorities, the tree inventory, species and a starter plan. Run: node data/simulators/generate.ts
import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { BLOCKS, BUILDINGS, D, INVENTORY, SPECIES, SURFACE, W, optimize, SITES } from "../../packages/domain/src/index.ts";
const root = new URL("../../", import.meta.url).pathname, out = root + "data/generated/";
mkdirSync(out, { recursive: true });
writeFileSync(out + "district.json", JSON.stringify({ w: W, d: D, blocks: BLOCKS, buildings: BUILDINGS, surface: Array.from(SURFACE).join("") }));
writeFileSync(out + "sites.json", JSON.stringify(SITES)); writeFileSync(out + "trees.json", JSON.stringify(INVENTORY)); writeFileSync(out + "species.json", JSON.stringify(SPECIES));
const plan = optimize({ budgetUsd: 120000, horizonYear: 2050 }); writeFileSync(out + "plan.json", JSON.stringify({ name: "Starter plan", horizonYear: 2050, budgetUsd: 120000, spentUsd: plan.spentUsd, plantings: plan.plantings }));
cpSync(root + "model/exports/analysis.json", out + "model.json");
console.log("generated", BLOCKS.length, "blocks,", SITES.length, "sites,", INVENTORY.length, "trees,", plan.plantings.length, "starter plantings");
