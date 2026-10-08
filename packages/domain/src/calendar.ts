// A maintenance calendar: watering of young trees, winter pruning, annual inspection, spring mulch and removal of dying trees, with costs.
import type { Planting, Tree } from "@arbor/schemas";
import { INVENTORY } from "./district.ts";
import { crownRadius, species } from "./species.ts";
import { SITES } from "./scenario.ts";
export const TASK_COST = { water: 12, prune: 60, inspect: 18, mulch: 15, remove: 300 } as const;
export type TaskKind = keyof typeof TASK_COST;
export type Task = { treeId: string; kind: TaskKind; month: number; costUsd: number };
const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
export type Item = { id: string; species: string; plantedYear: number; maintenance?: Tree["maintenance"] };
export const itemsOf = (year: number, plantings: Planting[] = [], inventory: Tree[] = INVENTORY): Item[] => [...inventory.filter((t) => t.plantedYear <= year).map((t) => ({ id: t.id, species: t.species, plantedYear: t.plantedYear, maintenance: t.maintenance })), ...plantings.filter((p) => p.plantYear <= year && SITES.some((s) => s.id === p.siteId)).map((p, i) => ({ id: `P${String(i + 1).padStart(3, "0")}`, species: p.species, plantedYear: p.plantYear }))];
/** Tasks for one calendar year. Pruning is every 4 years in a winter month fixed by the tree's id; its price grows with the crown. */
export function tasksFor(items: Item[], year: number): Task[] {
  const out: Task[] = [];
  for (const t of items) { const age = year - t.plantedYear, sp = species(t.species), h = hash(t.id), r = crownRadius(sp, age), push = (kind: TaskKind, month: number, n = 1, cost: number = TASK_COST[kind]) => { for (let k = 0; k < n; k++) out.push({ treeId: t.id, kind, month, costUsd: Math.round(cost) }); };
    push("inspect", 3); if (age <= 3) for (const m of [6, 7, 8, 9]) push("water", m, 4); if (age <= 5) push("mulch", 4);
    if (age >= 4 && (year + h) % 4 === 0) push("prune", [11, 12, 1, 2][h % 4], 1, TASK_COST.prune + 8 * r); if (t.maintenance === "remove" && year === 2027) push("remove", 1);
  }
  return out;
}
export function calendar(items: Item[], year: number) {
  const tasks = tasksFor(items, year), months = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, count: 0, costUsd: 0, byKind: {} as Partial<Record<TaskKind, number>> }));
  for (const t of tasks) { const m = months[t.month - 1]; m.count++; m.costUsd += t.costUsd; m.byKind[t.kind] = (m.byKind[t.kind] ?? 0) + 1; }
  return { year, months, totalUsd: months.reduce((a, m) => a + m.costUsd, 0), tasks: tasks.length };
}
import type { Metrics } from "@arbor/schemas";
import { SUMMER, evaluate } from "./scenario.ts";
import type { When } from "./heat.ts";
/** Scenario metrics including the year's maintenance cost from the calendar. */
export function fullMetrics(s: { plantings: Planting[] }, year: number, when: When = SUMMER): Metrics { const m = evaluate(s, year, when).metrics; return { ...m, maintenanceUsdYr: calendar(itemsOf(year, s.plantings), year).totalUsd }; }
