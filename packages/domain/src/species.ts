// Seven street-tree species and a simple growth model. Numbers are invented, handbook-order values for a demo; not horticultural guidance.
import type { Species } from "@arbor/schemas";
export const SPECIES: Species[] = [
  { id: "maple", name: "Red maple", latin: "Acer rubrum", archetype: "Round", rMaxM: 6.5, hMaxM: 17, growth: 0.06, dbhMaxCm: 70, evergreen: false, summerTransmit: 0.15, plantCostUsd: 520, stormwater: 1.0, biodiversity: 0.6, lifespanYears: 90, note: "Dense round crown, good autumn colour." },
  { id: "plane", name: "London plane", latin: "Platanus x acerifolia", archetype: "Spreading", rMaxM: 9, hMaxM: 24, growth: 0.075, dbhMaxCm: 110, evergreen: false, summerTransmit: 0.1, plantCostUsd: 560, stormwater: 1.2, biodiversity: 0.35, lifespanYears: 150, note: "Wide shade, shrugs off pavement and pollution." },
  { id: "hornbeam", name: "Columnar hornbeam", latin: "Carpinus betulus 'Fastigiata'", archetype: "Columnar", rMaxM: 2.8, hMaxM: 12, growth: 0.045, dbhMaxCm: 40, evergreen: false, summerTransmit: 0.2, plantCostUsd: 480, stormwater: 0.6, biodiversity: 0.5, lifespanYears: 100, note: "Narrow, for tight sites and under wires." },
  { id: "cherry", name: "Flowering cherry", latin: "Prunus serrulata", archetype: "Round", rMaxM: 4, hMaxM: 8, growth: 0.08, dbhMaxCm: 35, evergreen: false, summerTransmit: 0.3, plantCostUsd: 420, stormwater: 0.7, biodiversity: 0.55, lifespanYears: 35, flowerMonth: 4, note: "Spring blossom, short lived." },
  { id: "pine", name: "Eastern white pine", latin: "Pinus strobus", archetype: "Conifer", rMaxM: 4.5, hMaxM: 20, growth: 0.06, dbhMaxCm: 60, evergreen: true, summerTransmit: 0.3, plantCostUsd: 390, stormwater: 0.9, biodiversity: 0.55, lifespanYears: 120, note: "Shade and wind screen all year." },
  { id: "locust", name: "Honey locust", latin: "Gleditsia triacanthos", archetype: "Spreading", rMaxM: 7, hMaxM: 16, growth: 0.08, dbhMaxCm: 70, evergreen: false, summerTransmit: 0.4, plantCostUsd: 470, stormwater: 0.8, biodiversity: 0.4, lifespanYears: 80, note: "Fast, dappled shade." },
  { id: "oak", name: "Native oak", latin: "Quercus alba", archetype: "Spreading", rMaxM: 10, hMaxM: 22, growth: 0.035, dbhMaxCm: 120, evergreen: false, summerTransmit: 0.12, plantCostUsd: 620, stormwater: 1.3, biodiversity: 0.95, lifespanYears: 300, note: "Slow, long lived, the richest habitat." },
];
export const species = (id: string): Species => { const s = SPECIES.find((x) => x.id === id); if (!s) throw new RangeError(`unknown species "${id}"`); return s; };
const grow = (age: number, g: number) => 1 - Math.exp(-g * Math.max(0, age));
/** Crown radius (m) at an age in years since planting. Nursery stock starts at 0.5 m. A tree's health scales it between 70 and 100 percent. */
export const crownRadius = (s: Species, age: number, health = 1) => (0.5 + (s.rMaxM - 0.5) * grow(age, s.growth)) * (0.7 + 0.3 * Math.max(0, Math.min(1, health)));
export const treeHeight = (s: Species, age: number) => 2.5 + (s.hMaxM - 2.5) * grow(age, s.growth * 1.1);
export const dbhCm = (s: Species, age: number) => 3 + (s.dbhMaxCm - 3) * grow(age, s.growth * 0.9);
/** Stored carbon (kg) from a simple dbh allometry: biomass = 0.12 dbh^2.4, half of it carbon. */
export const carbonKg = (dbh: number) => 0.5 * 0.12 * dbh ** 2.4;
/** Fraction of the summer leaf area present on a day of the year (0 to 1). Evergreens stay at 1. */
export function leafFactor(s: Species, dayOfYear: number): number { if (s.evergreen) return 1; const up = Math.max(0, Math.min(1, (dayOfYear - 105) / 45)), down = Math.max(0, Math.min(1, (310 - dayOfYear) / 40)); return Math.min(up, down) * 0.97 + 0.03; }
/** How strongly a crown blocks sun on a day: a bare deciduous crown still stops 12 percent, a full summer crown 1 minus its transmittance. */
export const shadeOpacity = (s: Species, dayOfYear: number) => 0.12 + (1 - s.summerTransmit - 0.12) * leafFactor(s, dayOfYear);
export const flowerFactor = (s: Species, dayOfYear: number) => (s.flowerMonth ? Math.max(0, 1 - Math.abs(dayOfYear - (s.flowerMonth * 30.4 - 10)) / 12) : 0);
