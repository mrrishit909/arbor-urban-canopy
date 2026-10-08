"use client";
import { useEffect, useState } from "react";
import { loadData, base, type Data } from "./data";
import { live, persist, set, state, STORE_KEY, useStore, VIEWS } from "./store";
import Intro from "./ui/Intro";
import Panels from "./ui/Panels";
import Scene from "./scene/Scene";
const webglOk = () => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } };
export default function App() {
  const s = useStore(); const [data, setData] = useState<Data | null>(null); const [err, setErr] = useState("");
  useEffect(() => {
    const q = new URLSearchParams(location.search), rm = matchMedia("(prefers-reduced-motion: reduce)").matches || q.get("motion") === "reduced", view = VIEWS.find((v) => v.id === (q.get("view") ?? location.hash.slice(1)))?.id, skip = q.get("skip") === "1" || !!view, year = Number(q.get("year")), month = Number(q.get("month")), hour = Number(q.get("hour"));
    loadData().then((d) => {
      let saved: never[] = []; try { const st = JSON.parse(localStorage.getItem(STORE_KEY) ?? "null"); saved = Array.isArray(st?.saved) ? st.saved : []; } catch { /* a corrupted store is ignored */ }
      const num = (v: number, lo: number, hi: number, k: string) => (q.get(k) !== null && Number.isFinite(v) ? { [k]: Math.max(lo, Math.min(hi, v)) } : {});
      set({ reduced: rm, pauseMotion: rm, gfx: q.get("gfx") === "off" || !webglOk() ? "poster" : "webgl", saved, plantings: q.get("plan") === "none" ? [] : d.plan.plantings, ...num(year, 2026, 2050, "year"), ...num(month, 1, 12, "month"), ...num(hour, 6, 21, "hour"), ...(view ? { view } : {}), ...(skip ? { introDone: true, introStep: 99, layer: "species" as const } : {}) });
      if (skip) { document.documentElement.style.setProperty("--ui", "1"); Object.assign(live, { wave: 1e4, gray: 0, shimmer: 0, seed: 1.01, rootsT: 1, introYear: 2035, sapling: 1, camT: 4, underground: 0, birds: 0.55, analytics: 1 }); }
      setData(d); }).catch((e) => setErr(String(e)));
  }, []);
  useEffect(() => { if (!s.playing) return; const id = setInterval(() => { const y = state.year + 1; set(y > 2050 ? { year: 2050, playing: false } : { year: y }); }, 450); return () => clearInterval(id); }, [s.playing]);
  useEffect(() => { const f = () => { const v = VIEWS.find((x) => x.id === location.hash.slice(1)); if (v && v.id !== state.view && state.introDone) set({ view: v.id }); }; addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, []);
  if (err) return <div className="boot" role="alert">Could not load data: {err}</div>;
  if (!data) return <div className="boot" role="status">Waiting for the sun…</div>;
  return (
    <div className="app" data-view={s.view} data-intro={s.introDone ? "done" : "running"} data-gfx={s.gfx}>
      {s.gfx === "webgl" ? <Scene data={data} /> : <div className="poster" style={{ backgroundImage: `url(${base}/posters/district.png)` }} role="img" aria-label="Still of low-poly street trees along a city street under a bright sky" data-testid="poster" />}
      <div className="vignette" aria-hidden /><div className="iris" style={{ clipPath: `circle(${s.iris * 75}% at 50% 50%)` }} aria-hidden data-testid="iris" /><Panels data={data} />{(!s.introDone || s.introFx) && <Intro />}
    </div>
  );
}
void persist;
