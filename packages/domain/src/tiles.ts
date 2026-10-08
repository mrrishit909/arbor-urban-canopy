// Heat tiles: every tile is 20 x 12 cells so a response is bounded. z0 is one tile (4x4 aggregation, 20 m cells), z1 is 2x2 tiles (10 m), z2 is 4x4 tiles of raw 5 m cells.
import { NXC, NYC } from "./district.ts";
import type { HeatField } from "./heat.ts";
export const TILE_COLS = 20, TILE_ROWS = 12, MAX_Z = 2;
export function tile(f: HeatField, z: number, tx: number, ty: number) {
  if (!Number.isInteger(z) || z < 0 || z > MAX_Z) throw new RangeError(`z must be 0 to ${MAX_Z}`); const n = 2 ** z; if (!Number.isInteger(tx) || !Number.isInteger(ty) || tx < 0 || ty < 0 || tx >= n || ty >= n) throw new RangeError(`x and y must be 0 to ${n - 1} at z${z}`);
  const k = 2 ** (MAX_Z - z), feel: number[] = [], shade: number[] = [], spanX = TILE_COLS * k, spanY = TILE_ROWS * k;
  for (let j = 0; j < TILE_ROWS; j++) for (let i = 0; i < TILE_COLS; i++) { let a = 0, s = 0, m = 0; for (let b = 0; b < k; b++) for (let c = 0; c < k; c++) { const x = tx * spanX + i * k + c, y = ty * spanY + j * k + b; if (x < NXC && y < NYC) { a += f.feel[x + y * NXC]; s += f.shade[x + y * NXC]; m++; } } feel.push(Math.round((a / m) * 100) / 100); shade.push(Math.round((s / m) * 100) / 100); }
  return { z, x: tx, y: ty, cols: TILE_COLS, rows: TILE_ROWS, cellM: 5 * k, originM: [tx * spanX * 5, ty * spanY * 5] as [number, number], feelC: feel, shade };
}
