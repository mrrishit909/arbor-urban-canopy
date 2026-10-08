// Scenarios: a set of plantings evaluated at a year, a day and an hour. Metrics are synthetic model outputs.
import type { Metrics, Planting, Scenario, Site, Species } from "@arbor/schemas";
import { BLOCKS, CELL, INVENTORY, NXC, NYC, S, SITES_RAW, SURFACE, W, D, cellOfXY, isPedestrian } from "./district.ts";
import { HOT_C, heatField, placedTrees, radiusOf, type HeatField, type Placed, type When } from "./heat.ts";
import { carbonKg, dbhCm, species } from "./species.ts";
import { DAY } from "./sun.ts";
export const NOW_YEAR = 2026, SUMMER: When = { day: DAY.jul, hour: 15 }, PLANT_YEAR = 2027;
export const SITE_COST_FACTOR = { "sidewalk pit": 1.6, plaza: 1.2, courtyard: 1.0, park: 0.8 } as const;
export const plantCost = (sp: Species, type: Site["type"]) => Math.round(sp.plantCostUsd * SITE_COST_FACTOR[type]);
const PEDESTRIAN = Array.from({ length: NXC * NYC }, (_, k) => isPedestrian(SURFACE[k]));
const PED_N = PEDESTRIAN.filter(Boolean).length, SIDEWALK_N = Array.from(SURFACE).filter((s) => s === S.sidewalk).length;
const base = heatField(placedTrees(NOW_YEAR), SUMMER), PEDVOL = { residential: 0.4, commercial: 1, civic: 0.7, school: 0.6, park: 0.5 } as const;
const norm = (a: number[]) => { const lo = Math.min(...a), hi = Math.max(...a); return a.map((v) => (v - lo) / (hi - lo || 1)); };
/** Candidate sites with a priority score: how hot it is now, the block's equity index and how many people walk there. */
export const SITES: Site[] = (() => { const heat = norm(SITES_RAW.map((s) => base.feel[cellOfXY(s.x, s.y)])); return SITES_RAW.map((s, i) => { const b = BLOCKS.find((x) => x.id === s.block)!; return { ...s, priority: Math.round((0.5 * heat[i] + 0.3 * s.equity + 0.2 * PEDVOL[b.kind]) * 100) / 100 }; }); })();
export const siteById = (id: string) => SITES.find((s) => s.id === id);
const occupied = new Set(INVENTORY.map((t) => t.siteId));
export const openSites = (plantings: Planting[] = []) => SITES.filter((s) => !occupied.has(s.id) && !plantings.some((p) => p.siteId === s.id));
export const BASELINE_FIELD: HeatField = base;
export function metricsOf(placed: Placed[], field: HeatField, year: number, plantings: Planting[]): Metrics {
  let ped = 0, feel = 0, hot = 0, sw = 0, cov = 0, shade = 0; for (let k = 0; k < field.feel.length; k++) { if (PEDESTRIAN[k]) { ped++; feel += field.feel[k]; if (field.feel[k] >= HOT_C) hot++; } if (SURFACE[k] === S.sidewalk) shade += field.shade[k]; if (field.cover[k] > 0) cov++; }
  let stormwater = 0, carbon = 0; const areaBySp = new Map<string, number>(); for (const t of placed) { const r = radiusOf(t), area = Math.PI * r * r; stormwater += area * 0.18 * t.sp.stormwater * (t.sp.evergreen ? 1 : 0.8); carbon += carbonKg(dbhCm(t.sp, t.age)); areaBySp.set(t.sp.id, (areaBySp.get(t.sp.id) ?? 0) + area); }
  const tot = [...areaBySp.values()].reduce((a, b) => a + b, 0), simpson = tot ? 1 - [...areaBySp.values()].reduce((a, v) => a + (v / tot) ** 2, 0) : 0, bio = tot ? [...areaBySp.entries()].reduce((a, [id, v]) => a + species(id).biodiversity * (v / tot), 0) : 0;
  void year; return { canopyPct: round1((cov / field.feel.length) * 100), sidewalkShadePct: round1((shade / SIDEWALK_N) * 100), meanFeelC: round2(feel / PED_N), hotSharePct: round1((hot / PED_N) * 100), stormwaterM3: Math.round(stormwater), carbonKg: Math.round(carbon), biodiversity: round1(100 * simpson * bio * 1.6), trees: placed.length, maintenanceUsdYr: 0, plantingUsd: plantings.reduce((a, p) => a + plantCost(species(p.species), siteById(p.siteId)?.type ?? "sidewalk pit"), 0) };
}
const round1 = (x: number) => Math.round(x * 10) / 10, round2 = (x: number) => Math.round(x * 100) / 100;
export function evaluate(s: Pick<Scenario, "plantings">, year: number, when: When = SUMMER): { metrics: Metrics; field: HeatField; placed: Placed[] } {
  const placed = placedTrees(year, s.plantings), field = heatField(placed, when); return { metrics: metricsOf(placed, field, year, s.plantings), field, placed };
}
/** The growth timeline: the metrics for each year in a list. */
export const series = (s: Pick<Scenario, "plantings">, years: number[], when: When = SUMMER) => years.map((y) => ({ year: y, ...evaluate(s, y, when).metrics }));
/** Blocks ranked by how hot their pedestrian surfaces feel. */
export function blockStats(field: HeatField) { return BLOCKS.map((b) => { let n = 0, f = 0, hot = 0; for (let k = 0; k < field.feel.length; k++) { if (!PEDESTRIAN[k]) continue; const x = ((k % NXC) + 0.5) * CELL, y = (Math.floor(k / NXC) + 0.5) * CELL; if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) { n++; f += field.feel[k]; if (field.feel[k] >= HOT_C) hot++; } } return { id: b.id, kind: b.kind, equity: b.equity, meanFeelC: round2(n ? f / n : 0), hotSharePct: round1(n ? (hot / n) * 100 : 0), cells: n }; }).sort((a, b) => b.meanFeelC - a.meanFeelC); }
export const DISTRICT_AREA = W * D;
