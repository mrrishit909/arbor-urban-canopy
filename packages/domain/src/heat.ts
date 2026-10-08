// Shade and heat on a 5 m grid for a day, an hour and a set of trees. Surface and air temperatures are a simplified synthetic model, not a measurement.
import type { Tree, Planting, Species } from "@arbor/schemas";
import { BUILDINGS, CELL, INVENTORY, NXC, NYC, S, SURFACE, SITES_RAW, W, D, cellCenter, isPedestrian } from "./district.ts";
import { crownRadius, shadeOpacity, species, treeHeight } from "./species.ts";
import { airTemp, sunAt } from "./sun.ts";
export type When = { day: number; hour: number };
export type Placed = { id: string; x: number; y: number; sp: Species; age: number; health: number; cap: number };
export const HOT_C = 36, SUN_SURFACE = [52, 46, 48, 56, 36] as const;   // road, sidewalk, plaza, roof, lawn at full summer sun, C
const siteCap = new Map(SITES_RAW.map((s) => [s.id, s.maxCrownM]));
/** Existing trees plus plantings, grown to a year (a tree not yet planted is left out). A site's maximum crown caps the radius. */
export function placedTrees(year: number, plantings: Planting[] = [], inventory: Tree[] = INVENTORY, sites: Map<string, { x: number; y: number }> = new Map(SITES_RAW.map((s) => [s.id, s]))): Placed[] {
  const out: Placed[] = [];
  for (const t of inventory) { if (t.maintenance === "remove" && year > 2027) continue; const age = year - t.plantedYear; if (age >= 0) out.push({ id: t.id, x: t.x, y: t.y, sp: species(t.species), age, health: t.healthScore, cap: siteCap.get(t.siteId) ?? 12 }); }
  plantings.forEach((p, i) => { const s = sites.get(p.siteId); if (!s) return; const age = year - p.plantYear; if (age >= 0) out.push({ id: `P${String(i + 1).padStart(3, "0")}`, x: s.x, y: s.y, sp: species(p.species), age, health: 1, cap: siteCap.get(p.siteId) ?? 12 }); });
  return out;
}
export const radiusOf = (t: Placed) => Math.min(crownRadius(t.sp, t.age, t.health), t.cap * 1.25);
export const heightOf = (t: Placed) => treeHeight(t.sp, t.age);
const bshade = new Map<string, Float32Array>();
/** Shade from buildings: 1 where the ray from the ground toward the sun passes through a building. Cached per sun position. */
function buildingShade(day: number, hour: number): Float32Array {
  const key = `${day}:${hour}`, hit = bshade.get(key); if (hit) return hit; const sun = sunAt(day, hour), out = new Float32Array(NXC * NYC);
  if (sun.elevationDeg > 1) { const el = (sun.elevationDeg * Math.PI) / 180, dx = Math.sin((sun.azimuthDeg * Math.PI) / 180), dy = Math.cos((sun.azimuthDeg * Math.PI) / 180), tanEl = Math.tan(el);
    for (let k = 0; k < out.length; k++) { const [cx, cy] = cellCenter(k); if (SURFACE[k] === S.roof) continue; for (const b of BUILDINGS) { const far = b.h / tanEl; if (Math.abs(((b.x0 + b.x1) / 2) - cx) > far + 60 || Math.abs(((b.y0 + b.y1) / 2) - cy) > far + 60) continue; let shaded = false; for (let t = 2; t <= Math.min(far, 120) && !shaded; t += 2) { const x = cx + dx * t, y = cy + dy * t; if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1 && t * tanEl <= b.h) shaded = true; } if (shaded) { out[k] = 0.92; break; } } } }
  bshade.set(key, out); return out;
}
export type HeatField = { shade: Float32Array; canopy: Float32Array; cover: Float32Array; surface: Float32Array; feel: Float32Array; sunElevation: number };
const sm = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function heatField(placed: Placed[], when: When): HeatField {
  const N = NXC * NYC, sun = sunAt(when.day, when.hour), day = sun.elevationDeg > 1, Tair = airTemp(when.day, when.hour), el = (Math.max(sun.elevationDeg, 1) * Math.PI) / 180, R = day ? Math.pow(Math.sin(el), 0.8) : 0;
  const dx = Math.sin((sun.azimuthDeg * Math.PI) / 180), dy = Math.cos((sun.azimuthDeg * Math.PI) / 180), px = -dy, py = dx, bs = buildingShade(when.day, when.hour), trans = new Float32Array(N).fill(1), cover = new Float32Array(N);
  for (const t of placed) { const r = radiusOf(t), h = heightOf(t), op = shadeOpacity(t.sp, when.day), zc = 0.68 * h, off = day ? zc / Math.tan(el) : 0, sx = t.x - dx * Math.min(off, 40), sy = t.y - dy * Math.min(off, 40), a = Math.min(4 * r, r / Math.sin(el)), b = r, reach = Math.max(a, b) * 1.15;
    for (let cy = Math.max(0, Math.floor((sy - reach) / CELL)); cy <= Math.min(NYC - 1, Math.floor((sy + reach) / CELL)); cy++) for (let cx = Math.max(0, Math.floor((sx - reach) / CELL)); cx <= Math.min(NXC - 1, Math.floor((sx + reach) / CELL)); cx++) { const X = (cx + 0.5) * CELL - sx, Y = (cy + 0.5) * CELL - sy, u = X * dx + Y * dy, v = X * px + Y * py, q = (u / a) ** 2 + (v / b) ** 2; if (q < 1.3) trans[cx + cy * NXC] *= 1 - op * sm(1.3, 0.8, q); }
    for (let cy = Math.max(0, Math.floor((t.y - r) / CELL)); cy <= Math.min(NYC - 1, Math.floor((t.y + r) / CELL)); cy++) for (let cx = Math.max(0, Math.floor((t.x - r) / CELL)); cx <= Math.min(NXC - 1, Math.floor((t.x + r) / CELL)); cx++) { const X = (cx + 0.5) * CELL - t.x, Y = (cy + 0.5) * CELL - t.y; if (X * X + Y * Y <= r * r) cover[cx + cy * NXC] += 1; } }
  const shade = new Float32Array(N); for (let k = 0; k < N; k++) shade[k] = day ? 1 - (1 - bs[k]) * trans[k] : 1;
  const canopy = new Float32Array(N); for (let cy = 0; cy < NYC; cy++) for (let cx = 0; cx < NXC; cx++) { let s = 0, n = 0; for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const x = cx + i, y = cy + j; if (x >= 0 && y >= 0 && x < NXC && y < NYC) { s += Math.min(1, cover[x + y * NXC]); n++; } } canopy[cx + cy * NXC] = s / n; }
  const surface = new Float32Array(N), feel = new Float32Array(N);
  for (let k = 0; k < N; k++) { const dT = (SUN_SURFACE[SURFACE[k]] - 33) * R, ts = Tair + dT * (1 - shade[k]) + dT * 0.2 * shade[k]; surface[k] = ts; feel[k] = Tair + 0.18 * (ts - Tair) + 3.5 * R * (1 - shade[k]) - 1.0 * canopy[k] - (SURFACE[k] === S.lawn ? 0.8 : 0); }
  return { shade, canopy, cover, surface, feel, sunElevation: sun.elevationDeg };
}
export const AREA_M2 = W * D;
void isPedestrian;
