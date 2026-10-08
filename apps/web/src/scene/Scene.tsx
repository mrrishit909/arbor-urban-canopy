"use client";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { INVENTORY, MONTH_DAY, SITES, crownRadius, dbhCm, heightOf, leafFactor, mulberry32, radiusOf, species as speciesOf, sunAt, treeHeight, flowerFactor, type Placed } from "@arbor/domain";
import type { Archetype } from "@arbor/schemas";
import { base, heatColor, HEAT_RANGE, PALETTE, SPECIES_COLOR, toScene, type Data } from "../data";
import { dayOf, live, set, sim, state, useStore } from "../store";

const ARCH: Archetype[] = ["Round", "Columnar", "Spreading", "Conifer"], W = 400, D = 240, MAXN = 420, c = (h: string) => new THREE.Color(h);
const ss = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hashOf = (s: string) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0) / 4294967295; };
/** The hero site of the intro: the highest-priority open sidewalk pit the starter plan plants. */
export function heroSite(data: Data) { const ids = new Set(data.plan.plantings.map((p) => p.siteId)), s = [...SITES].filter((x) => ids.has(x.id) && x.type === "sidewalk pit").sort((a, b) => b.priority - a.priority)[0] ?? SITES[0]; return s; }
const GLSL = `float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }`;
// ---- the ground: roads, pavement and lawn from the layout, with the heat or shade layer and the intro's grey-to-green reveal
function layoutTexture(data: Data) {
  const k = 5, cv = document.createElement("canvas"); cv.width = W * k; cv.height = D * k; const g = cv.getContext("2d")!, Y = (y: number) => (D - y) * k;
  g.fillStyle = "#3d413c"; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = PALETTE.concrete; g.fillRect(0, 0, cv.width, 10 * k); g.fillRect(0, Y(10), cv.width, 10 * k); g.fillRect(0, 0, 10 * k, cv.height); g.fillRect((W - 10) * k, 0, 10 * k, cv.height);
  for (const b of data.blocks) { g.fillStyle = PALETTE.concrete; g.fillRect(b.x0 * k, Y(b.y1), (b.x1 - b.x0) * k, (b.y1 - b.y0) * k); if (b.kind === "park") { g.fillStyle = PALETTE.leaf; g.fillRect((b.x0 + 2) * k, Y(b.y1 - 2), (b.x1 - b.x0 - 4) * k, (b.y1 - b.y0 - 4) * k); g.fillStyle = "#a9c78a"; g.fillRect((b.x0 + 38) * k, Y(b.y1 - 2), 4 * k, (b.y1 - b.y0 - 4) * k); } else { g.fillStyle = "#cdcbc2"; g.fillRect((b.x0 + 4) * k, Y(b.y1 - 4), (b.x1 - b.x0 - 8) * k, (b.y1 - b.y0 - 8) * k); } }
  g.fillStyle = "#8f8e87"; for (const b of data.buildings) g.fillRect(b.x0 * k, Y(b.y1), (b.x1 - b.x0) * k, (b.y1 - b.y0) * k);
  g.strokeStyle = "#d9d6c8"; g.setLineDash([14, 14]); g.lineWidth = 2; for (const x of [100, 200, 300]) { g.beginPath(); g.moveTo(x * k, 0); g.lineTo(x * k, cv.height); g.stroke(); } for (const y of [80, 160]) { g.beginPath(); g.moveTo(0, Y(y)); g.lineTo(cv.width, Y(y)); g.stroke(); }
  g.fillStyle = PALETTE.soil; for (const s of data.sites) g.fillRect((s.x - 0.7) * k, Y(s.y + 0.7), 1.4 * k, 1.4 * k);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function Ground({ data }: { data: Data }) {
  const s = useStore(), mat = useRef<THREE.ShaderMaterial>(null), base_ = useMemo(() => layoutTexture(data), [data]), layer = useMemo(() => { const t = new THREE.DataTexture(new Uint8Array(80 * 48 * 4), 80, 48, THREE.RGBAFormat); t.magFilter = t.minFilter = THREE.LinearFilter; t.colorSpace = THREE.SRGBColorSpace; return t; }, []), shade = useMemo(() => { const t = new THREE.DataTexture(new Uint8Array(80 * 48 * 4), 80, 48, THREE.RGBAFormat); t.magFilter = t.minFilter = THREE.LinearFilter; return t; }, []);
  const u = useMemo(() => ({ uBase: { value: base_ }, uLayer: { value: layer }, uShade: { value: shade }, uMode: { value: 0 }, uReveal: { value: 1e4 }, uGray: { value: 0 }, uShimmer: { value: 0 }, uTime: { value: 0 }, uCenter: { value: new THREE.Vector2() } }), [base_, layer, shade]);
  useEffect(() => { const e = sim(); const L = layer.image.data as Uint8Array, H = shade.image.data as Uint8Array; for (let k = 0; k < 3840; k++) { let col: number[]; if (s.heatLayer === "shade") { const v = Math.round(255 * (1 - e.field.shade[k])); col = [v, v, Math.round(v * 0.9)]; } else if (s.heatLayer === "canopy") { const v = e.field.cover[k] > 0 ? 1 : 0; col = v ? [40, 92, 61] : [183, 181, 172]; } else { const val = s.heatLayer === "surface" ? e.field.surface[k] : e.field.feel[k], tt = (val - HEAT_RANGE[0]) / (HEAT_RANGE[1] - HEAT_RANGE[0]); col = heatColor(tt); } L[k * 4] = col[0]; L[k * 4 + 1] = col[1]; L[k * 4 + 2] = col[2]; L[k * 4 + 3] = 255; const sh = Math.round(255 * e.field.shade[k]); H[k * 4] = sh; H[k * 4 + 1] = sh; H[k * 4 + 2] = sh; H[k * 4 + 3] = 255; } layer.needsUpdate = true; shade.needsUpdate = true; }, [s.year, s.month, s.hour, s.plantings, s.heatLayer, layer, shade]);
  const hero = useMemo(() => heroSite(data), [data]);
  useFrame(({ clock }) => { const U = mat.current?.uniforms; if (!U) return; U.uTime.value = clock.elapsedTime; U.uMode.value = state.view === "heat" && state.introDone ? 1 : 0; U.uReveal.value = state.introDone ? 1e4 : live.wave; U.uGray.value = state.introDone ? 0 : live.gray; U.uShimmer.value = state.introDone ? 0 : live.shimmer; const [hx, hz] = toScene(hero.x, hero.y); U.uCenter.value.set(hx, hz); });
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}><planeGeometry args={[W, D]} /><shaderMaterial ref={mat} uniforms={u} vertexShader={`varying vec2 vUv; varying vec3 vWp; void main(){ vUv = uv; vWp = (modelMatrix*vec4(position,1.0)).xyz; gl_Position = projectionMatrix*viewMatrix*vec4(vWp,1.0); }`}
    fragmentShader={`uniform sampler2D uBase, uLayer, uShade; uniform float uMode, uReveal, uGray, uShimmer, uTime; uniform vec2 uCenter; varying vec2 vUv; varying vec3 vWp;
      void main(){ vec2 uv = vUv + uShimmer*vec2(sin(vUv.y*420.0 + uTime*5.0), cos(vUv.x*260.0 + uTime*4.0))*0.0011; vec3 b = texture2D(uBase, uv).rgb; float d = distance(vWp.xz, uCenter); float rv = 1.0 - smoothstep(uReveal - 45.0, uReveal, d);
        float g = dot(b, vec3(0.299, 0.587, 0.114)); vec3 gray = vec3(g*0.92 + 0.03); vec3 col = mix(b, gray, uGray*(1.0 - rv)); float sh = texture2D(uShade, uv).r; col *= 1.0 - 0.34*sh*(uGray > 0.5 ? rv : 1.0);
        if (uMode > 0.5) col = mix(col, texture2D(uLayer, uv).rgb*(1.0 - 0.2*sh), 0.82); gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`} /></mesh>;
}
// ---- buildings
function Buildings({ data }: { data: Data }) {
  const gltf = useLoader(GLTFLoader, `${base}/models/district.glb`), geo = useMemo(() => (gltf.scene.getObjectByName("Building_Block_A") as THREE.Mesh).geometry, [gltf]), ref = useRef<THREE.InstancedMesh>(null);
  const mat = useMemo(() => { const m = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.85 }); m.onBeforeCompile = (sh) => { sh.vertexShader = "varying vec3 vWp;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvWp = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;"); sh.fragmentShader = `varying vec3 vWp;\n${GLSL}\n` + sh.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
      float band = step(0.55, fract(vWp.y/3.3)); float mull = step(0.18, fract((vWp.x + vWp.z)/2.6)); diffuseColor.rgb *= 1.0 - 0.28*band*mull;`); }; m.customProgramCacheKey = () => "arbor-bld"; return m; }, []);
  useEffect(() => { const im = ref.current; if (!im) return; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(); data.buildings.forEach((b, i) => { const [x, z] = toScene((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2); m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(b.x1 - b.x0, b.h, b.y1 - b.y0)); im.setMatrixAt(i, m4); const t = 0.78 + 0.18 * hashOf(b.id); im.setColorAt(i, new THREE.Color(t, t * 0.99, t * 0.95)); }); im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }, [data]);
  return <instancedMesh ref={ref} args={[geo, mat, data.buildings.length]} frustumCulled={false} />;
}
// ---- trees: four archetypes x three authored stages, instanced; growth, season and the intro's wave all drive the matrices
type TreeState = { r: number; h: number; dbh: number; vis: number };
function Trees({ data }: { data: Data }) {
  const gltf = useLoader(GLTFLoader, `${base}/models/district.glb`), refs = useRef<(THREE.InstancedMesh | null)[]>([]), cur = useRef(new Map<string, TreeState>()), hero = useMemo(() => heroSite(data), [data]);
  const geos = useMemo(() => ARCH.flatMap((a) => [0, 1, 2].flatMap((s) => ["Trunk", "Crown"].map((p) => (gltf.scene.getObjectByName(`Tree_${a}_S${s}_${p}`) as THREE.Mesh).geometry))), [gltf]);
  const barkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#6b4f35", roughness: 0.9 }), []), leafMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.7, flatShading: true }), []);
  const m4 = useMemo(() => new THREE.Matrix4(), []), q = useMemo(() => new THREE.Quaternion(), []), e = useMemo(() => new THREE.Euler(), []), col = useMemo(() => new THREE.Color(), []), bare = useMemo(() => c("#6e5c47"), []);
  useFrame((_, dt) => {
    const sm = sim(), day = dayOf(state.month), k = state.reduced ? 1 : 1 - Math.exp(-dt * 3.2), counts = new Map<number, number>(), [hx, hz] = toScene(hero.x, hero.y), heroPlanted = data.plan.plantings[0];
    sm.placed.forEach((t: Placed) => {
      let r = radiusOf(t), h = heightOf(t), dbh = dbhCm(t.sp, t.age), vis = 1; const [x, z] = toScene(t.x, t.y), isHero = t.id === "P001" || (t.x === hero.x && t.y === hero.y);
      if (!state.introDone) { const dist = Math.hypot(x - hx, z - hz); vis = isHero ? live.sapling : ss(0, 1, (live.wave - dist) / 30); if (isHero) { const age = Math.max(0, live.introYear - (heroPlanted?.plantYear ?? 2027)); r = Math.min(crownRadius(t.sp, age), t.cap * 1.25); h = treeHeight(t.sp, age); dbh = dbhCm(t.sp, age); } }
      let s = cur.current.get(t.id); if (!s) { s = { r: 0.2, h: 0.5, dbh: 3, vis: 0 }; cur.current.set(t.id, s); } const kk = state.introDone ? k : 1; s.r += (r - s.r) * kk; s.h += (h - s.h) * kk; s.dbh += (dbh - s.dbh) * kk; s.vis += (vis - s.vis) * (state.introDone ? k : 1);
      if (s.vis < 0.01) return; const f = s.r / t.sp.rMaxM, stage = f < 0.3 ? 0 : f < 0.65 ? 1 : 2, a = ARCH.indexOf(t.sp.archetype), idxT = (a * 3 + stage) * 2, idxC = idxT + 1, leaf = leafFactor(t.sp, day), tr = Math.max(0.2, s.h * 0.38), halfH = Math.max(0.2, (s.h - tr) / 2) * (t.sp.evergreen ? 1 : 0.55 + 0.45 * leaf), cr = s.r * (t.sp.evergreen ? 1 : 0.8 + 0.2 * leaf), v = s.vis, yaw = hashOf(t.id) * 6.28;
      e.set(0, yaw, 0); q.setFromEuler(e); const nT = counts.get(idxT) ?? 0, nC = counts.get(idxC) ?? 0;
      m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3((s.dbh / 100) * v, tr * v, (s.dbh / 100) * v)); refs.current[idxT]!.setMatrixAt(nT, m4);
      m4.compose(new THREE.Vector3(x, tr * v + halfH * v, z), q, new THREE.Vector3(cr * v, halfH * v, cr * v)); refs.current[idxC]!.setMatrixAt(nC, m4);
      if (state.layer === "species" && (state.introDone || live.analytics > 0.5)) col.set(SPECIES_COLOR[t.sp.id]).multiplyScalar(0.75 + 0.25 * t.health); else { const green = t.sp.evergreen ? c(PALETTE.canopy) : c(t.sp.id === "locust" ? "#8cbd5c" : t.sp.id === "cherry" ? "#78ad58" : PALETTE.leaf).lerp(c(PALETTE.canopy), 0.35 + 0.25 * hashOf(t.id)); const autumn = !t.sp.evergreen && day > 255 && day < 330 ? ss(255, 300, day) : 0, fl = flowerFactor(t.sp, day); col.copy(green); if (!t.sp.evergreen) { col.lerp(c(PALETTE.gold), autumn); col.lerp(bare, 1 - leaf); } if (fl > 0) col.lerp(c(PALETTE.flower), fl * 0.8); col.multiplyScalar(0.8 + 0.4 * t.health); }
      refs.current[idxC]!.setColorAt(nC, col); counts.set(idxT, nT + 1); counts.set(idxC, nC + 1);
    });
    refs.current.forEach((im, i) => { if (!im) return; im.count = counts.get(i) ?? 0; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; });
  });
  return <>{geos.map((g, i) => <instancedMesh key={i} ref={(r) => { refs.current[i] = r; }} args={[g, i % 2 === 0 ? barkMat : leafMat, MAXN]} frustumCulled={false} />)}</>;
}
// ---- the intro: a seed, then roots spreading beneath the paving
function Roots({ data }: { data: Data }) {
  const hero = useMemo(() => heroSite(data), [data]), grp = useRef<THREE.Group>(null), seed = useRef<THREE.Mesh>(null);
  const roots = useMemo(() => { const r = mulberry32(9), out: THREE.TubeGeometry[] = []; for (let k = 0; k < 11; k++) { const pts: THREE.Vector3[] = [new THREE.Vector3(0, -0.2, 0)], a = (k / 11) * Math.PI * 2 + r() * 0.5; let x = 0, y = -0.2, z = 0, ang = a; for (let i = 0; i < 34; i++) { ang += (r() - 0.5) * 0.45; const sp = 0.45 + 0.55 * (1 - i / 40); x += Math.cos(ang) * sp * 0.9; z += Math.sin(ang) * sp * 0.9; y -= (i < 6 ? 0.22 : 0.035) * (0.6 + r() * 0.8); pts.push(new THREE.Vector3(x, y, z)); } out.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 70, 0.07 * (1 - (k % 3) * 0.2), 5, false)); } return out; }, []);
  const [hx, hz] = toScene(hero.x, hero.y), mat = useMemo(() => new THREE.MeshBasicMaterial({ color: PALETTE.gold, toneMapped: false }), []);
  useFrame(() => { const show = !state.introDone && live.rootsT > 0; if (grp.current) { grp.current.visible = show; roots.forEach((g, i) => { const idx = g.index!.count; (grp.current!.children[i] as THREE.Mesh).geometry.setDrawRange(0, Math.floor(Math.min(1, Math.max(0, live.rootsT * 1.2 - (i % 4) * 0.08)) * idx / 3) * 3); }); } if (seed.current) { seed.current.visible = !state.introDone && live.seed < 1.0001 && live.seed > 0; seed.current.position.y = 16 * (1 - Math.min(1, live.seed)) + 0.2; seed.current.rotation.y = live.seed * 18; } });
  return <group position={[hx, 0, hz]}><group ref={grp} visible={false}>{roots.map((g, i) => <mesh key={i} geometry={g} material={mat} />)}</group><mesh ref={seed} visible={false}><sphereGeometry args={[0.22, 10, 8]} /><meshBasicMaterial color={PALETTE.gold} toneMapped={false} /></mesh></group>;
}
function Soil({ data }: { data: Data }) { const hero = useMemo(() => heroSite(data), [data]), [hx, hz] = toScene(hero.x, hero.y), ref = useRef<THREE.Mesh>(null); useFrame(() => { if (ref.current) ref.current.visible = !state.introDone && live.underground > 0.02; }); return <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]} position={[hx, -0.05, hz]} visible={false}><planeGeometry args={[400, 400]} /><meshBasicMaterial color="#2a2118" side={THREE.FrontSide} /></mesh>; }
// ---- life above the canopy
function Birds() { const pts = useRef<THREE.Points>(null), { camera } = useThree(), N = 60, g = useMemo(() => { const gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3)); return gg; }, []), seeds = useMemo(() => Array.from({ length: N }, (_, i) => { const t = INVENTORY[Math.floor(hashOf("b" + i) * INVENTORY.length)]; return { x: toScene(t.x, t.y)[0], z: toScene(t.x, t.y)[1], ph: hashOf("p" + i) * 6.28, sp: 0.4 + hashOf("s" + i) }; }), []);
  useFrame(({ clock }) => { const pos = g.attributes.position as THREE.BufferAttribute, t = clock.elapsedTime * (state.pauseMotion ? 0 : 1); seeds.forEach((s, i) => pos.setXYZ(i, s.x + Math.cos(t * s.sp + s.ph) * 7, 9 + Math.sin(t * s.sp * 1.7 + s.ph) * 2.5, s.z + Math.sin(t * s.sp + s.ph) * 7)); pos.needsUpdate = true; const m = pts.current!.material as THREE.PointsMaterial, canopy = sim().metrics.canopyPct; m.opacity = (state.introDone ? 0.55 : live.birds) * Math.min(1, canopy / 12) * (state.view === "species" ? 0 : 1); m.size = Math.max(1.4, camera.position.y / 60); });
  return <points ref={pts} geometry={g} frustumCulled={false}><pointsMaterial color="#26302a" size={2} transparent opacity={0.5} sizeAttenuation depthWrite={false} /></points>;
}
function Pulses() { const grp = useRef<THREE.Group>(null); useFrame(() => { const now = performance.now(), g = grp.current; if (!g) return; g.children.forEach((ch, i) => { const p = state.pulses[i]; ch.visible = !!p && now - p.at < 1600; if (p && ch.visible) { const t = (now - p.at) / 1600, [x, z] = toScene(p.x, p.y); ch.position.set(x, 0.3, z); ch.scale.setScalar(1 + t * 9); (((ch as THREE.Mesh).material) as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - t); } }); }); return <group ref={grp}>{Array.from({ length: 6 }, (_, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} visible={false}><ringGeometry args={[0.9, 1.1, 40]} /><meshBasicMaterial color={PALETTE.gold} transparent depthWrite={false} toneMapped={false} /></mesh>)}</group>; }
function Selection({ data }: { data: Data }) { const s = useStore(), ref = useRef<THREE.Mesh>(null); const site = data.sites.find((x) => x.id === s.selSite); useFrame(({ clock }) => { if (ref.current) { ref.current.visible = !!site && state.introDone && state.view === "plan"; if (site) { const [x, z] = toScene(site.x, site.y); ref.current.position.set(x, 0.5, z); ref.current.scale.setScalar(1 + 0.15 * Math.sin(clock.elapsedTime * 4)); } } }); return <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} visible={false}><ringGeometry args={[1.6, 2.0, 32]} /><meshBasicMaterial color={PALETTE.gold} toneMapped={false} /></mesh>; }
// ---- the species specimen: a branch and a leaf, far from the city
const SPEC = new THREE.Vector3(0, 40, 900);
function Specimen() {
  const s = useStore(), gltf = useLoader(GLTFLoader, `${base}/models/district.glb`), grp = useRef<THREE.Group>(null), sp = speciesOf(s.speciesFocus), A = sp.archetype;
  const mats = useMemo(() => ({ branch: new THREE.MeshStandardMaterial({ color: "#7EB35A", roughness: 0.6, side: THREE.DoubleSide }), leaf: new THREE.MeshStandardMaterial({ color: "#7EB35A", roughness: 0.55, side: THREE.DoubleSide }) }), []);
  const nodes = useMemo(() => ({ branch: (gltf.scene.getObjectByName(`Specimen_Branch_${A}`) as THREE.Mesh).geometry, leaf: (gltf.scene.getObjectByName(`Specimen_Leaf_${A}`) as THREE.Mesh).geometry }), [gltf, A]);
  useFrame(({ clock }) => { const day = dayOf(state.month), leaf = leafFactor(sp, day), fl = flowerFactor(sp, day), g = c(sp.evergreen ? PALETTE.canopy : PALETTE.leaf); const autumn = !sp.evergreen && day > 255 ? ss(255, 300, day) : 0; g.lerp(c(PALETTE.gold), autumn); if (fl > 0) g.lerp(c(PALETTE.flower), fl * 0.7); mats.leaf.color.copy(g); mats.branch.color.copy(g).multiplyScalar(0.85); if (grp.current) { grp.current.visible = state.view === "species"; grp.current.rotation.y = state.pauseMotion ? grp.current.rotation.y : clock.elapsedTime * 0.25; } });
  return <group ref={grp} position={SPEC.toArray()} visible={false}><mesh geometry={nodes.branch} material={mats.branch} position={[-1.5, -2.2, 0]} rotation={[0, 0, 0.2]} scale={2.8} /><mesh geometry={nodes.leaf} material={mats.leaf} position={[2.4, -1.4, 0.5]} rotation={[0.1, -0.5, 0.15]} scale={4.2} /></group>;
}
// ---- light, sky and camera
function Sun() {
  const dir = useRef<THREE.DirectionalLight>(null), amb = useRef<THREE.AmbientLight>(null), { scene } = useThree();
  useFrame(() => { const day = dayOf(state.month), sun = sunAt(day, state.hour), el = (Math.max(sun.elevationDeg, 2) * Math.PI) / 180, az = (sun.azimuthDeg * Math.PI) / 180; if (dir.current) { dir.current.position.set(Math.sin(az) * Math.cos(el) * 300, Math.sin(el) * 300, -Math.cos(az) * Math.cos(el) * 300); dir.current.intensity = (state.introDone ? 2.6 : 3.4) * Math.max(0.12, Math.sin(el)); dir.current.color.set(el > 0.5 ? "#fff4dc" : "#ffcf9a"); } if (amb.current) amb.current.intensity = state.view === "species" ? 1.1 : 0.85; const night = sun.elevationDeg < 2 ? 1 : 0, bg = c(PALETTE.sky).lerp(c(PALETTE.soil), night ? 0.85 : state.view === "species" ? 0.35 : 0); if (state.introDone === false && live.underground > 0) bg.lerp(c("#1c140e"), live.underground); scene.background = bg; (scene.fog as THREE.FogExp2).color.copy(bg); (scene.fog as THREE.FogExp2).density = state.view === "species" ? 0.0045 : 0.0009 + (1 - 1) * 0; });
  return <><ambientLight ref={amb} intensity={0.85} color="#e8f0ee" /><directionalLight ref={dir} position={[100, 200, 100]} intensity={2.6} /></>;
}
const POSE = { map: { p: [0, 380, 268], l: [0, 0, -4], f: 44 }, top: { p: [0, 330, 1], l: [0, 0, 0], f: 42 }, species: { p: [SPEC.x, SPEC.y + 3, SPEC.z + 13], l: [SPEC.x, SPEC.y - 0.5, SPEC.z], f: 40 } } as const;
function Rig({ data }: { data: Data }) {
  const { camera, size } = useThree(), cam = camera as THREE.PerspectiveCamera, cur = useRef({ p: new THREE.Vector3(...POSE.map.p), l: new THREE.Vector3(...POSE.map.l), f: 44, up: new THREE.Vector3(0, 1, 0) }), hero = useMemo(() => heroSite(data), [data]);
  useFrame((_, dt) => {
    const s = state, c0 = cur.current; let gp: THREE.Vector3, gl: THREE.Vector3, gf: number, gu = new THREE.Vector3(0, 1, 0), k = s.introDone ? (s.reduced ? 1 : 1 - Math.exp(-dt * 2.4)) : 1;
    const [hx, hz] = toScene(hero.x, hero.y), H = new THREE.Vector3(hx, 0, hz);
    if (!s.introDone) { const t = live.camT, A = new THREE.Vector3(...POSE.map.p), AL = new THREE.Vector3(...POSE.map.l), G = H.clone().add(new THREE.Vector3(7, 3.2, 11)), GL = H.clone().add(new THREE.Vector3(0, 1.4, 0)), U = H.clone().add(new THREE.Vector3(6, -1.7, 9)), UL = H.clone().add(new THREE.Vector3(0, -1.6, 0)), G2 = H.clone().add(new THREE.Vector3(9, 4.5, 14)), G2L = H.clone().add(new THREE.Vector3(0, 3.2, 0));
      const lerp3 = (a: THREE.Vector3, b: THREE.Vector3, x: number) => a.clone().lerp(b, ss(0, 1, x)); const stages: [THREE.Vector3, THREE.Vector3][] = [[A, AL], [G, GL], [U, UL], [G2, G2L], [A, AL]], i = Math.min(3, Math.floor(t)), x = t - i; gp = lerp3(stages[i][0], stages[i + 1][0], x); gl = lerp3(stages[i][1], stages[i + 1][1], x); gf = 44; k = 1;
      if (live.shake > 0 && !s.reduced) gp = gp.clone().add(new THREE.Vector3((Math.random() - 0.5) * live.shake, (Math.random() - 0.5) * live.shake, 0)); c0.p.copy(gp); c0.l.copy(gl); c0.f = gf; c0.up.copy(gu);
    } else {
      let P: { p: readonly number[]; l: readonly number[]; f: number };
      if (s.view === "species") P = POSE.species; else if (s.view === "heat") P = POSE.top; else if (s.view === "plan") { const b = data.blocks.find((x) => x.id === s.selBlock)!, [bx, bz] = toScene((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2); P = { p: [bx, 105, bz + 62], l: [bx, 0, bz], f: 44 }; } else P = POSE.map;
      gp = new THREE.Vector3(...P.p); gl = new THREE.Vector3(...P.l); gf = P.f; if (s.view === "heat") gu = new THREE.Vector3(0, 0, -1); if (s.view === "species") k = 1 - Math.exp(-dt * 6);
      c0.p.lerp(gp, k); c0.l.lerp(gl, k); c0.f += (gf - c0.f) * k; c0.up.lerp(gu, k).normalize();
    }
    cam.position.copy(c0.p); cam.up.copy(c0.up); cam.lookAt(c0.l); cam.fov = c0.f; cam.near = 0.1; cam.far = 2500;
    if (size.width > 900 && s.introDone) cam.setViewOffset(size.width, size.height, size.width * 0.14, 0, size.width, size.height); else cam.clearViewOffset(); cam.updateProjectionMatrix();
  });
  return null;
}
function Lifecycle() {
  const { setFrameloop, gl } = useThree();
  useEffect(() => { const vis = () => setFrameloop(document.hidden ? "never" : "always"), lost = (e: Event) => { e.preventDefault(); set({ gfx: "poster" }); };
    document.addEventListener("visibilitychange", vis); gl.domElement.addEventListener("webglcontextlost", lost); (window as unknown as { __arborStats: () => unknown }).__arborStats = () => ({ calls: gl.info.render.calls, triangles: gl.info.render.triangles, geometries: gl.info.memory.geometries, textures: gl.info.memory.textures });
    return () => { document.removeEventListener("visibilitychange", vis); gl.domElement.removeEventListener("webglcontextlost", lost); }; }, [setFrameloop, gl]);
  return null;
}
export default function Scene({ data }: { data: Data }) {
  useStore(); useEffect(() => { (window as unknown as { __aLive: typeof live }).__aLive = live; }, []);
  return (
    <Canvas className="stage" data-testid="stage" dpr={[1, 1.5]} camera={{ fov: 44, position: POSE.map.p as unknown as [number, number, number] }} gl={{ antialias: true, powerPreference: "high-performance" }} onCreated={({ gl, scene }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; scene.fog = new THREE.FogExp2(PALETTE.sky, 0.0009); }}>
      <Sun /><Rig data={data} /><Ground data={data} /><Buildings data={data} /><Trees data={data} /><Roots data={data} /><Soil data={data} /><Birds /><Pulses /><Selection data={data} /><Specimen /><Lifecycle />
    </Canvas>
  );
}
void MONTH_DAY;
