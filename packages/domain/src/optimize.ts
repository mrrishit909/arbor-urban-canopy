// A greedy budget optimiser: repeatedly plant the (site, species) pair with the best weighted benefit per dollar, updating the heat it has already relieved.
import type { Planting, Weights } from "@arbor/schemas";
import { BLOCKS, CELL, NXC, NYC, SURFACE, cellCenter, isPedestrian } from "./district.ts";
import { BASELINE_FIELD, PLANT_YEAR, SITES, SUMMER, evaluate, openSites, plantCost } from "./scenario.ts";
import { crownRadius, shadeOpacity, SPECIES } from "./species.ts";
import { HOT_C, heatField, placedTrees, radiusOf } from "./heat.ts";
export const DEFAULT_WEIGHTS: Weights = { heat: 1, stormwater: 0.5, biodiversity: 0.5, equity: 0.5 };
export const MIN_SPACING_M = 5, MAX_SPECIES_SHARE = 0.3;   // the 30 percent rule: no species supplies more than 30 percent of the planting
/** Species that can live at a site: its mature crown may exceed the site's cap by at most 60 percent, and overhead lines allow only trees under 13 m. */
export const fits = (spId: string, siteId: string): boolean => { const sp = SPECIES.find((s) => s.id === spId)!, site = SITES.find((s) => s.id === siteId)!; return sp.rMaxM <= site.maxCrownM * 1.6 && !(site.constraints.includes("overhead lines") && sp.hMaxM > 13); };
export type Pick = Planting & { cost: number; benefit: number; ratio: number; block: string };
export function optimize(opts: { budgetUsd: number; horizonYear: number; weights?: Weights; existing?: Planting[]; speciesIds?: string[]; plantYear?: number }) {
  const w = opts.weights ?? DEFAULT_WEIGHTS, plantYear = opts.plantYear ?? PLANT_YEAR, ids = opts.speciesIds?.length ? opts.speciesIds : SPECIES.map((s) => s.id), taken: { x: number; y: number }[] = placedTrees(opts.horizonYear, opts.existing ?? []).map((t) => ({ x: t.x, y: t.y }));
  const field = heatField(placedTrees(opts.horizonYear, opts.existing ?? []), SUMMER), cur = Float32Array.from(field.feel), picks: Pick[] = []; let spent = 0;
  const candidates = openSites(opts.existing ?? []).flatMap((s) => ids.filter((id) => fits(id, s.id)).map((id) => ({ s, sp: SPECIES.find((x) => x.id === id)! })));
  const gainOf = (s: (typeof candidates)[number]) => {
    const age = opts.horizonYear - plantYear; if (age < 1) return { heat: 0, storm: 0, bio: 0, cells: [] as [number, number][] }; const r = Math.min(crownRadius(s.sp, age), s.s.maxCrownM * 1.25), op = shadeOpacity(s.sp, SUMMER.day), cells: [number, number][] = []; let heat = 0;
    for (let cy = Math.max(0, Math.floor((s.s.y - r - CELL) / CELL)); cy <= Math.min(NYC - 1, Math.floor((s.s.y + r + CELL) / CELL)); cy++) for (let cx = Math.max(0, Math.floor((s.s.x - r - CELL) / CELL)); cx <= Math.min(NXC - 1, Math.floor((s.s.x + r + CELL) / CELL)); cx++) { const k = cx + cy * NXC; if (!isPedestrian(SURFACE[k])) continue; const [px, py] = cellCenter(k), d = Math.hypot(px - s.s.x, py - s.s.y); if (d > r * 1.1) continue; const dT = Math.min(op * 4.2, Math.max(0, cur[k] - 31)), eq = 1 + w.equity * (BLOCKS.find((b) => b.id === s.s.block)?.equity ?? 0.5); heat += dT * eq * (cur[k] >= HOT_C ? 1.5 : 1); cells.push([k, dT]); }
    return { heat: heat / 4, storm: (Math.PI * r * r * 0.18 * s.sp.stormwater) / 6, bio: s.sp.biodiversity * Math.sqrt(r) * 1.4, cells };
  };
  for (;;) {
    let best: { c: (typeof candidates)[number]; ratio: number; benefit: number; cost: number; cells: [number, number][] } | null = null;
    for (const c of candidates) { if (picks.some((p) => p.siteId === c.s.id)) continue; if (picks.filter((p) => p.species === c.sp.id).length + 1 > Math.max(3, Math.ceil(MAX_SPECIES_SHARE * (picks.length + 1)))) continue; const cost = plantCost(c.sp, c.s.type); if (spent + cost > opts.budgetUsd) continue; if (taken.some((t) => Math.hypot(t.x - c.s.x, t.y - c.s.y) < MIN_SPACING_M)) continue; const g = gainOf(c), benefit = w.heat * g.heat + w.stormwater * g.storm + w.biodiversity * g.bio; if (benefit <= 0) continue; const ratio = benefit / cost; if (!best || ratio > best.ratio) best = { c, ratio, benefit, cost, cells: g.cells }; }
    if (!best) break; picks.push({ siteId: best.c.s.id, species: best.c.sp.id, plantYear, cost: best.cost, benefit: Math.round(best.benefit * 100) / 100, ratio: best.ratio, block: best.c.s.block }); spent += best.cost; taken.push({ x: best.c.s.x, y: best.c.s.y }); for (const [k, dT] of best.cells) cur[k] -= dT * 0.9;
  }
  const plantings: Planting[] = [...(opts.existing ?? []), ...picks.map(({ siteId, species, plantYear: y }) => ({ siteId, species, plantYear: y }))];
  return { picks, spentUsd: spent, plantings, before: evaluate({ plantings: opts.existing ?? [] }, opts.horizonYear).metrics, after: evaluate({ plantings }, opts.horizonYear).metrics };
}
void BASELINE_FIELD; void radiusOf;
