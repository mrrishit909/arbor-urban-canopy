"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { SURFACE, isPedestrian } from "@arbor/domain";
import { live, set, sim, state, useStore } from "../store";

const FINAL = { wave: 1e4, gray: 0, shimmer: 0, seed: 1.01, rootsT: 1, introYear: 2035, sapling: 1, camT: 4, underground: 0, birds: 0.55, analytics: 1, shake: 0 };
/** The hottest quarter of the district's walkways in the grey 2026 city, and the same cells once the plan has grown: the thermometer's two numbers. */
function thermometer() { const before = sim({ year: 2026, month: 7, hour: 15, plantings: [] }).field.feel, after = sim(state).field.feel, idx: number[] = []; for (let k = 0; k < before.length; k++) if (isPedestrian(SURFACE[k])) idx.push(k); idx.sort((a, b) => before[b] - before[a]); const q = idx.slice(0, Math.floor(idx.length / 4)), mean = (a: ArrayLike<number>) => q.reduce((t, k) => t + a[k], 0) / q.length; return { hot: mean(before), cool: mean(after) }; }
// Steps (blueprint section 3): 0 a grey city under hard sun with a rising temperature, 1 a seed falls into a planting pit, 2 roots spread beneath the pavement, 3 a sapling grows, 4 growth and shade spread across the district and the heat falls, 5 the camera rises to the aerial map, 6 the crowns resolve into the analytics layer and the title appears.
export default function Intro() {
  const s = useStore(), tl = useRef<gsap.core.Timeline | null>(null), [cap, setCap] = useState(""), [line, setLine] = useState(false), [temp, setTemp] = useState(0), [yr, setYr] = useState(0); const root = document.documentElement;
  const temps = useMemo(() => { const t = thermometer(); return { ...t, mid: t.hot - 2.4 }; }, []);
  const finish = () => { tl.current?.kill(); Object.assign(live, FINAL); root.style.setProperty("--ui", "1"); set({ introFx: false, introStep: 99, layer: "species", ...(state.introDone ? {} : { introDone: true }) }); setLine(false); setCap(""); }; // never overwrite what the visitor did while the last fade ran
  useEffect(() => {
    if (state.reduced) return; gsap.ticker.lagSmoothing(0);
    Object.assign(live, { wave: 0, gray: 1, shimmer: 1, seed: 0, rootsT: 0, introYear: 2027, sapling: 0, camT: 0, underground: 0, birds: 0, analytics: 0, shake: 0 }); setTemp(temps.mid); root.style.setProperty("--ui", "0");
    const t = gsap.timeline({ defaults: { ease: "power1.inOut" }, onComplete: finish }); tl.current = t; const step = (n: number, c = "") => () => { set({ introStep: n }); setCap(c); }, th = { v: temps.mid }, yy = { v: 2027 };
    t.call(step(0, "Hard sun on a grey district."), [], 0.4).to(th, { v: temps.hot, duration: 3.4, ease: "none", onUpdate: () => setTemp(th.v) }, 0.2)
      .call(step(1, "A seed falls into a planting pit."), [], 3.6).to(live, { camT: 1, duration: 2.2 }, 3.4).to(live, { seed: 1, duration: 1.2, ease: "power2.in" }, 5.2)
      .call(step(2, "Roots find the soil under the paving."), [], 6.6).to(live, { underground: 1, duration: 0.8 }, 6.4).to(live, { camT: 2, duration: 1.6 }, 6.4).to(live, { rootsT: 1, duration: 3.2, ease: "none" }, 7)
      .call(step(3, "A sapling, the year it is planted."), [], 10).to(live, { underground: 0, duration: 0.8 }, 9.9).to(live, { camT: 3, duration: 1.6 }, 9.8).to(live, { sapling: 1, duration: 0.9 }, 10.6).to(yy, { v: 2035, duration: 2.4, ease: "power1.out", onUpdate: () => { live.introYear = yy.v; setYr(Math.round(yy.v)); } }, 10.8)
      .call(step(4, "Growth spreads across the district. Shade follows; the heat falls."), [], 13.2).to(live, { wave: 360, duration: 6, ease: "power1.in" }, 13.2).to(live, { camT: 4, duration: 4.8, ease: "power2.inOut" }, 13.4).to(live, { shimmer: 0, duration: 2.5 }, 13.2).to(th, { v: temps.cool, duration: 5.4, onUpdate: () => setTemp(th.v) }, 13.4).to(live, { birds: 0.55, duration: 2 }, 16.8)
      .call(step(5, ""), [], 18.4).call(() => { setYr(0); }, [], 18.4)
      .call(() => { set({ introStep: 6, layer: "species" }); setLine(true); }, [], 18.9).to(live, { analytics: 1, duration: 0.1 }, 18.9).call(() => setLine(false), [], 21.9)
      .to({ v: 0 }, { v: 1, duration: 2.4, ease: "power2.inOut", onUpdate() { root.style.setProperty("--ui", String(this.targets()[0].v)); } }, 21.4)
      .call(() => { set({ introDone: true, introFx: true, introStep: 99 }); }, [], 24);
    return () => { if (!state.introDone) t.kill(); }; // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const skip = () => { const tt = tl.current; if (tt && tt.time() < 18.3) tt.seek(18.4); else finish(); };
  if (s.introDone && !s.introFx) return null;
  if (s.reduced) { const fr = [["Hard sun", "A grey low-poly district and a rising temperature."], ["A seed", "It falls into a planting pit and roots spread beneath the paving."], ["A sapling", "It grows quickly."], ["Growth", "Shade spreads across the district and the temperature falls."], ["Grow the city you want to live in", "The crowns become the analytics layer."]];
    return (<div className="intro intro-static" role="dialog" aria-label="Opening story" data-testid="intro"><ol>{fr.map(([a, b], i) => <li key={i}><b>{a}</b> {b}</li>)}</ol><button className="btn primary" onClick={finish} data-testid="skip-intro">Open the canopy map</button></div>); }
  return (<div className={`intro ${s.introDone ? "fx" : ""}`} data-testid="intro" data-step={s.introStep}>
    {s.introStep <= 4 && <div className="thermo" data-testid="thermo" role="status" aria-label="Temperature"><b>{temp ? temp.toFixed(1) : ""}</b><small>°C feels-like, hottest quarter of walkways{yr ? `, ${yr}` : ""}</small></div>}
    {line && <h1 className="statement" data-testid="statement">Grow the city you want to live in.</h1>}<p className="caption" role="status">{cap}</p>{!s.introDone && <div className="intro-btns"><button className="btn skip" onClick={skip} data-testid="skip-intro" autoFocus>Skip intro</button></div>}</div>);
}
