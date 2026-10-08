import { useSyncExternalStore } from "react";
import type { Planting, Weights } from "@arbor/schemas";
import { DEFAULT_WEIGHTS, MONTH_DAY, evaluate, type HeatField, type Placed } from "@arbor/domain";
export type View = "map" | "growth" | "heat" | "plan" | "species" | "budget";
export const VIEWS: { id: View; label: string; blurb: string }[] = [
  { id: "map", label: "Canopy map", blurb: "Trees, sites, blocks" }, { id: "growth", label: "Growth", blurb: "2026 to 2050" }, { id: "heat", label: "Heat and shade", blurb: "Feels-like, by block" },
  { id: "plan", label: "Planting planner", blurb: "Drag trees to sites" }, { id: "species", label: "Species", blurb: "From canopy to leaf" }, { id: "budget", label: "Budget", blurb: "Optimise and maintain" },
];
export type Pulse = { x: number; y: number; at: number };
export type SavedScenario = { id: string; name: string; at: string; year: number; plantings: Planting[]; weights: Weights; budgetUsd: number };
export type State = {
  view: View; year: number; month: number; hour: number; playing: boolean; plantings: Planting[]; layer: "natural" | "species"; heatLayer: "feel" | "shade" | "surface" | "canopy"; selBlock: string; selSite: string | null; plantSpecies: string; speciesFocus: string; budgetUsd: number; horizonYear: number; weights: Weights;
  pulses: Pulse[]; saved: SavedScenario[]; flash: string; iris: number; introDone: boolean; introFx: boolean; introStep: number; reduced: boolean; pauseMotion: boolean; gfx: "webgl" | "poster";
};
export const state: State = { view: "map", year: 2035, month: 7, hour: 15, playing: false, plantings: [], layer: "natural", heatLayer: "feel", selBlock: "B01", selSite: null, plantSpecies: "maple", speciesFocus: "oak", budgetUsd: 120000, horizonYear: 2050, weights: { ...DEFAULT_WEIGHTS }, pulses: [], saved: [], flash: "", iris: 0, introDone: false, introFx: false, introStep: 0, reduced: false, pauseMotion: false, gfx: "webgl" };
/** Per-frame values the intro and the canvas read; not reactive. */
export const live = { wave: 1e4, gray: 0, shimmer: 0, seed: 0, rootsT: 1, introYear: 0, sapling: 1, camT: 3, underground: 0, birds: 0.6, analytics: 1, thermo: 0, shake: 0, specimen: 0 };
let snap = { ...state }; const subs = new Set<() => void>();
export function set(p: Partial<State>) { Object.assign(state, p); snap = { ...state }; subs.forEach((f) => f()); }
export const useStore = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => snap, () => snap);
export const STORE_KEY = "arbor:v1";
export const persist = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify({ saved: state.saved, plantings: state.plantings, year: state.year })); } catch { /* storage may be blocked */ } };
export const dayOf = (month: number) => MONTH_DAY(month);
let cache: { key: string; v: { metrics: ReturnType<typeof evaluate>["metrics"]; field: HeatField; placed: Placed[] } } | null = null;
/** The simulation for the current state, cached: both the panels and the canvas read it. */
export function sim(s: Pick<State, "year" | "month" | "hour" | "plantings"> = state) {
  const key = `${s.year}:${s.month}:${s.hour}:${s.plantings.map((p) => `${p.siteId}${p.species}${p.plantYear}`).join(",")}`; if (cache?.key === key) return cache.v;
  const e = evaluate({ plantings: s.plantings }, s.year, { day: dayOf(s.month), hour: s.hour }); cache = { key, v: { metrics: e.metrics, field: e.field, placed: e.placed } }; return cache.v;
}
