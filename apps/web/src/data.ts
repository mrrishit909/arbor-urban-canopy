import type { Block, Building, Planting, Site, Species, Tree } from "@arbor/schemas";
export type Data = { w: number; d: number; blocks: Block[]; buildings: Building[]; surface: Uint8Array; sites: Site[]; trees: Tree[]; species: Species[]; plan: { name: string; horizonYear: number; budgetUsd: number; spentUsd: number; plantings: Planting[] }; model: Record<string, any> };
export const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export async function loadData(): Promise<Data> {
  const g = async <T,>(n: string) => (await fetch(`${base}/data/${n}.json`)).json() as Promise<T>;
  const [d, sites, trees, species, plan, model] = await Promise.all([g<{ w: number; d: number; blocks: Block[]; buildings: Building[]; surface: string }>("district"), g<Site[]>("sites"), g<Tree[]>("trees"), g<Species[]>("species"), g<Data["plan"]>("plan"), g<Data["model"]>("model")]);
  return { w: d.w, d: d.d, blocks: d.blocks, buildings: d.buildings, surface: Uint8Array.from(d.surface, (c) => Number(c)), sites, trees, species, plan, model };
}
export const PALETTE = { soil: "#161B16", canopy: "#285C3D", leaf: "#7EB35A", gold: "#D5B557", sky: "#ADDCE2", concrete: "#B7B5AC", flower: "#E98270" };
/** Analytics colours for the seven species (the palette's seven colours). */
export const SPECIES_COLOR: Record<string, string> = { maple: "#E98270", plane: "#7EB35A", hornbeam: "#ADDCE2", cherry: "#f4a99b", pine: "#285C3D", locust: "#D5B557", oak: "#B7B5AC" };
export const toScene = (x: number, y: number): [number, number] => [x - 200, -(y - 120)];
const hex = (h: string) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16)) as [number, number, number];
const mix = (a: [number, number, number], b: [number, number, number], t: number) => a.map((x, i) => Math.round(x + (b[i] - x) * t)) as [number, number, number];
/** Feels-like colour ramp: Sky (cool) to Pollen Gold to Flower Accent (hot). t 0..1 */
export const heatColor = (t: number) => { const k = Math.max(0, Math.min(1, t)); return k < 0.5 ? mix(hex("#ADDCE2"), hex("#D5B557"), k * 2) : mix(hex("#D5B557"), hex("#E98270"), (k - 0.5) * 2); };
export const HEAT_RANGE: [number, number] = [28, 39];
export const rgb = (c: number[]) => `rgb(${c[0]},${c[1]},${c[2]})`;
