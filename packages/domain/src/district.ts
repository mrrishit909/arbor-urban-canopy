// A synthetic 400 x 240 m district: 12 blocks, streets, buildings, candidate planting sites and an existing tree inventory. Everything is generated deterministically; none of it is a real place.
import type { Block, BlockKind, Building, Site, SiteType, Tree } from "@arbor/schemas";
import { mulberry32 } from "./rng.ts";
export const W = 400, D = 240, CELL = 5, NXC = W / CELL, NYC = D / CELL, BLOCK_W = 80, BLOCK_D = 60, STREET = 20, MARGIN = 10, SIDEWALK = 4;
export const S = { road: 0, sidewalk: 1, plaza: 2, roof: 3, lawn: 4 } as const;
const KINDS: BlockKind[][] = [["residential", "commercial", "residential", "civic"], ["residential", "park", "commercial", "residential"], ["commercial", "residential", "school", "residential"]];
const EQUITY = [[0.8, 0.5, 0.7, 0.3], [0.9, 0.2, 0.6, 0.7], [0.75, 0.4, 0.3, 0.85]];
export const BLOCKS: Block[] = KINDS.flatMap((row, j) => row.map((kind, i) => ({ id: `B${i}${j}`, i, j, x0: MARGIN + i * (BLOCK_W + STREET), y0: MARGIN + j * (BLOCK_D + STREET), x1: MARGIN + i * (BLOCK_W + STREET) + BLOCK_W, y1: MARGIN + j * (BLOCK_D + STREET) + BLOCK_D, kind, equity: EQUITY[j][i] })));
const HEIGHT: Record<BlockKind, [number, number]> = { residential: [9, 16], commercial: [18, 38], civic: [14, 18], school: [9, 11], park: [0, 0] };
function buildBuildings(): Building[] {
  const r = mulberry32(77), out: Building[] = []; let n = 0; const add = (b: Block, x0: number, y0: number, x1: number, y1: number) => { const [lo, hi] = HEIGHT[b.kind]; out.push({ id: `H${String(++n).padStart(2, "0")}`, block: b.id, x0, y0, x1, y1, h: Math.round(lo + r() * (hi - lo)) }); };
  for (const b of BLOCKS) {
    if (b.kind === "park") continue; const ix0 = b.x0 + SIDEWALK, iy0 = b.y0 + SIDEWALK, ix1 = b.x1 - SIDEWALK, iy1 = b.y1 - SIDEWALK;
    if (b.kind === "school") { add(b, ix0, iy0, ix1, iy0 + 14); add(b, ix0, iy1 - 14, ix1, iy1); add(b, ix0, iy0 + 14, ix0 + 12, iy1 - 14); add(b, ix1 - 12, iy0 + 14, ix1, iy1 - 14); continue; }
    if (b.kind === "civic") { add(b, ix0 + 6, iy0 + 22, ix1 - 6, iy1); continue; }   // the front half stays a paved plaza
    const cols = b.kind === "commercial" ? 2 : 3, gap = 4, w = (ix1 - ix0 - gap * (cols - 1)) / cols;
    for (let c = 0; c < cols; c++) { const x0 = ix0 + c * (w + gap), depth = b.kind === "commercial" ? 44 + Math.round(r() * 4) : 30 + Math.round(r() * 12); add(b, x0, iy1 - depth, x0 + w, iy1); }
  }
  return out;
}
export const BUILDINGS: Building[] = buildBuildings();
export const blockAt = (x: number, y: number) => BLOCKS.find((b) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) ?? null;
export const inBuilding = (x: number, y: number) => BUILDINGS.find((b) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) ?? null;
/** Surface of the ground at a point: road, sidewalk, plaza or courtyard (paved open space), roof, or lawn. */
export function surfaceAt(x: number, y: number): number {
  if (inBuilding(x, y)) return S.roof; const b = blockAt(x, y); if (!b) return x < MARGIN || y < MARGIN || x > W - MARGIN || y > D - MARGIN ? S.sidewalk : S.road;
  if (b.kind === "park") return x < b.x0 + 2 || x > b.x1 - 2 || y < b.y0 + 2 || y > b.y1 - 2 ? S.sidewalk : S.lawn; return x < b.x0 + SIDEWALK || x > b.x1 - SIDEWALK || y < b.y0 + SIDEWALK || y > b.y1 - SIDEWALK ? S.sidewalk : S.plaza;
}
export const SURFACE = Uint8Array.from({ length: NXC * NYC }, (_, k) => surfaceAt(((k % NXC) + 0.5) * CELL, (Math.floor(k / NXC) + 0.5) * CELL));
export const isPedestrian = (s: number) => s === S.sidewalk || s === S.plaza || s === S.lawn;
export const cellOfXY = (x: number, y: number) => Math.max(0, Math.min(NXC - 1, Math.floor(x / CELL))) + Math.max(0, Math.min(NYC - 1, Math.floor(y / CELL))) * NXC;
export const cellCenter = (k: number): [number, number] => [((k % NXC) + 0.5) * CELL, (Math.floor(k / NXC) + 0.5) * CELL];
// ---- candidate planting sites
function buildSites(): Omit<Site, "priority">[] {
  const r = mulberry32(31), out: Omit<Site, "priority">[] = []; let n = 0; const CAPS = [3, 3.5, 4, 4.5, 5];
  const add = (b: Block, x: number, y: number, type: SiteType, cap: number, constraints: string[] = []) => out.push({ id: `S${String(++n).padStart(3, "0")}`, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, type, maxCrownM: cap, block: b.id, constraints, equity: b.equity });
  for (const b of BLOCKS) {
    const edge = (x0: number, y0: number, x1: number, y1: number) => { const len = Math.hypot(x1 - x0, y1 - y0), steps = Math.floor((len - 10) / 14); for (let s = 0; s <= steps; s++) { const t = (5 + s * 14) / len, cap = CAPS[Math.floor(r() * CAPS.length)]; add(b, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, "sidewalk pit", cap, cap <= 3 ? ["overhead lines"] : cap <= 3.5 ? ["narrow sidewalk"] : []); } };
    edge(b.x0, b.y0 + 2.2, b.x1, b.y0 + 2.2); edge(b.x0, b.y1 - 2.2, b.x1, b.y1 - 2.2); edge(b.x0 + 2.2, b.y0, b.x0 + 2.2, b.y1); edge(b.x1 - 2.2, b.y0, b.x1 - 2.2, b.y1);
    if (b.kind === "park") for (let x = b.x0 + 14; x < b.x1 - 8; x += 18) for (let y = b.y0 + 14; y < b.y1 - 8; y += 16) add(b, x + (r() - 0.5) * 4, y + (r() - 0.5) * 4, "park", 9);
    if (b.kind === "civic") for (let k = 0; k < 4; k++) add(b, b.x0 + 14 + k * 17, b.y0 + 12, "plaza", 6);
    if (b.kind === "school") for (let k = 0; k < 4; k++) add(b, b.x0 + 26 + (k % 2) * 28, b.y0 + 24 + Math.floor(k / 2) * 12, "courtyard", 7);
    if (b.kind === "commercial") for (let k = 0; k < 2; k++) add(b, b.x0 + 24 + k * 32, b.y0 + 9, "plaza", 5.5);
  }
  return out.filter((s) => surfaceAt(s.x, s.y) !== S.roof);
}
export const SITES_RAW = buildSites();
// ---- existing trees
const MIX: Record<BlockKind, [string, number][]> = { residential: [["maple", 4], ["locust", 3], ["hornbeam", 2], ["cherry", 2]], commercial: [["plane", 4], ["locust", 3]], civic: [["oak", 3], ["plane", 3], ["maple", 2]], school: [["maple", 3], ["oak", 3]], park: [["oak", 3], ["maple", 3], ["pine", 3], ["cherry", 1]] };
const DENSITY: Record<BlockKind, number> = { residential: 0.55, commercial: 0.2, civic: 0.4, school: 0.45, park: 0.85 };
export function buildInventory(): Tree[] {
  const r = mulberry32(555), out: Tree[] = []; let n = 0;
  for (const s of SITES_RAW) { const b = BLOCKS.find((x) => x.id === s.block)!; if (r() > DENSITY[b.kind] * (1.15 - 0.8 * b.equity)) continue;   // neighbourhoods with a higher vulnerability index start with fewer trees
    const mix = MIX[b.kind], tot = mix.reduce((a, [, w]) => a + w, 0); let t = r() * tot, sp = mix[0][0]; for (const [id, w] of mix) { if ((t -= w) <= 0) { sp = id; break; } }
    const health = Math.round((0.55 + r() * 0.45) * 100) / 100, q = r(), maintenance = health < 0.6 ? "remove" : q < 0.7 ? "ok" : q < 0.88 ? "prune due" : "water";
    out.push({ id: `T${String(++n).padStart(3, "0")}`, species: sp, plantedYear: 1995 + Math.floor(r() * 28), x: s.x, y: s.y, siteId: s.id, healthScore: health, maintenance }); }
  return out;
}
export const INVENTORY = buildInventory();
