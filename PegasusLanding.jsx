"use client";
// Pegasus scroll-driven landing page. Requires: npm i three
// Next.js: place in components/pegasus/ and render <PegasusLanding /> from app/page.jsx
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import "./pegasus.css";

const N = 140; // fibers
const SEG = 72; // segments per fiber
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (t) => t * t * (3 - 2 * t);
const beam = (slope) => (a, s, t) => [
  lerp(-9, 9, s),
  lerp(-3.5, 3.5, s) * slope + a * (0.05 + 0.7 * s * s) + Math.sin(s * 8 + t) * 0.03,
  a * s,
];

// Fiber layouts, one per scroll state. (a: fiber offset -1..1, s: along fiber 0..1)
const SHAPES = [
  (a, s, t) => [lerp(-9, 5, s), a * 3.4 * Math.pow(s, 1.5) + Math.sin(s * 6 + a * 4 + t) * 0.12 * s, a * s], // fan
  (a, s, t) => [lerp(-9, 6, s), a * 4 * Math.abs(s - 0.4) * (1.2 - s) + Math.sin(s * 5 + a * 6 + t) * 0.15, a * 2 * (1 - s)], // wide fan
  beam(0.35), // gentle beam
  beam(1), // steep diagonal beam
  (a, s, t) => [lerp(-9, 9, s), a * 3.2 * (1 - 2 * s) + Math.sin(s * 9 + t) * 0.05, a * 0.5], // X
  (a, s, t) => [lerp(-9, 9, s) + 2.6 * Math.sin(s * 9), 2.4 * Math.cos(s * 6.5 + 0.4) + a * 0.12, a * 0.3 + Math.sin(s * 12 + t) * 0.05], // ribbon
  (a, s, t) => {
    const th = Math.PI * (a * 0.5 + 0.5), r = s * 5.2 + Math.sin(a * 20 + t) * 0.05;
    return [Math.cos(th) * r, Math.sin(th) * r - 3.4, Math.sin(a * 9) * 0.6 * s];
  }, // dome
];

const SECTIONS = [
  { tag: "Data Intelligence", title: ["Next-Generation", "Data Infrastructure"], body: "A scalable infrastructure for analytics, security, and data management in Web3. Build, analyze, and scale blockchain products without limits.", cta: true, pos: { left: "46%", top: "30%" } },
  { tag: "About the platform", title: ["One Platform.", "Endless Data Possibilities."], body: "We unify blockchain data, analytics, and security into a single solution, so you can focus on building, not maintaining infrastructure.", pos: { left: "36%", top: "42%" } },
  { tag: "The problem", title: ["Blockchain Data Is Complex.", "We Make It Simple."], body: "Fragmented sources, slow processing, and difficult integrations are holding Web3 back.", pos: { left: "14%", bottom: "16%" } },
  { tag: "The solution", title: ["Our platform delivers a next-", "generation data infrastructure"], body: "By providing instant access, seamless multi-chain integration, and built-in transparency, we eliminate the complexity of fragmented systems.", pos: { left: "12%", top: "22%" } },
  { tag: "The solution", title: ["The Future of On-Chain Data", "Starts Here"], pos: { left: "50%", bottom: "12%", transform: "translateX(-50%)", textAlign: "center" } },
];

function Scramble({ text }) {
  const [out, setOut] = useState(text);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return setOut(text);
    const chars = "abcdefghijklmnopqrstuvwxyz";
    let f = 0, id;
    const run = () => {
      const done = Math.floor(++f / 2);
      setOut(text.split("").map((c, i) => (c === " " || i < done ? c : chars[(Math.random() * 26) | 0])).join(""));
      if (done < text.length) id = requestAnimationFrame(run);
    };
    id = requestAnimationFrame(run);
    return () => cancelAnimationFrame(id);
  }, [text]);
  return <>{out}</>;
}

const STATS = [["Total Balance", "$19,270.56"], ["Staking Power", "$284.51"], ["Borrowed", "$1,140.28"], ["Reward Points", "12.45K"]];

function Dashboard() {
  return (
    <div className="pg-dash">
      <aside>{["Dashboard", "Staking", "Trade", "Bonus", "Earn"].map((n, i) => <span key={n} className={i ? "" : "on"}>{n}</span>)}</aside>
      <div className="pg-dmain">
        <div className="pg-stats">{STATS.map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}</div>
        <div className="pg-payout"><span>You are eligible for a payout</span><b>$5,343.00</b><button type="button">Request payment</button></div>
        <div className="pg-dgrid">
          <div className="pg-chart"><h4>Portfolio Chart</h4><div className="bars">{[100, 62, 38, 20, 8].map((h, i) => <i key={i} style={{ height: h + "%" }} />)}</div></div>
          <div className="pg-news"><h4>Latest News</h4><p>Point multiplier now live on Aster</p><p>Morpho markets now live</p></div>
        </div>
        <h4>Earning Opportunities</h4>
        <div className="pg-earn">{[0, 1, 2].map((i) => <div key={i}><b>Lido stETH</b><small>Stake and earn</small></div>)}</div>
      </div>
    </div>
  );
}

export default function PegasusLanding() {
  const wrapRef = useRef(null), frameRef = useRef(null), cvRef = useRef(null), glowRef = useRef(null), dashRef = useRef(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const wrap = wrapRef.current, frame = frameRef.current, glow = glowRef.current, gctx = glow.getContext("2d");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const renderer = new THREE.WebGLRenderer({ canvas: cvRef.current, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    const pos = new Float32Array(N * SEG * 6), col = new Float32Array(N * SEG * 6), c = new THREE.Color();
    for (let j = 0; j < N; j++) {
      const a = (j / (N - 1)) * 2 - 1;
      for (let k = 0; k < SEG; k++) {
        const v = 0.2 + 0.8 * Math.pow(Math.sin((Math.PI * (k + 0.5)) / SEG), 0.6) * (1 - 0.5 * Math.abs(a));
        c.setHSL(0.64 + (0.14 * (a + 1)) / 2, 0.85, 0.12 + 0.28 * v);
        const o = (j * SEG + k) * 6;
        col.set([c.r, c.g, c.b, c.r, c.g, c.b], o);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    scene.add(new THREE.LineSegments(geo, mat));

    const resize = () => {
      const w = frame.clientWidth, h = frame.clientHeight;
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      cam.position.z = w / h < 1 ? 12 / (w / h) : 14;
      cam.updateProjectionMatrix();
      glow.width = w / 3;
      glow.height = h / 3;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(frame);
    resize();

    let mx = 0, cur = 0, last = -1, raf;
    const onMove = (e) => (mx = (e.clientX / innerWidth - 0.5) * 2);
    addEventListener("pointermove", onMove);

    const tick = (ms) => {
      const r = wrap.getBoundingClientRect();
      const target = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
      cur = reduce ? target : cur + (target - cur) * 0.08;
      const k = Math.min(5, Math.floor(target * 6));
      if (k !== last) { last = k; setIdx(k); }

      const st = cur * 6, i = Math.min(5, Math.floor(st)), f = ss(Math.min(1, st - i)), t = reduce ? 0 : ms * 0.0006;
      for (let j = 0; j < N; j++) {
        const a = (j / (N - 1)) * 2 - 1;
        let px = 0, py = 0, pz = 0;
        for (let q = 0; q <= SEG; q++) {
          const s = q / SEG, u = SHAPES[i](a, s, t), w = SHAPES[i + 1](a, s, t);
          const x = lerp(u[0], w[0], f), y = lerp(u[1], w[1], f), z = lerp(u[2], w[2], f);
          if (q) pos.set([px, py, pz, x, y, z], (j * SEG + q - 1) * 6);
          px = x; py = y; pz = z;
        }
      }
      geo.attributes.position.needsUpdate = true;
      cam.position.x += (mx * 0.6 - cam.position.x) * 0.05;
      cam.lookAt(0, 0, 0);
      renderer.render(scene, cam);
      gctx.clearRect(0, 0, glow.width, glow.height);
      gctx.drawImage(renderer.domElement, 0, 0, glow.width, glow.height);

      const rise = Math.min(1, Math.max(0, (target - 0.9) / 0.1));
      if (dashRef.current) dashRef.current.style.transform = `translateY(${lerp(105, 8, ss(rise))}%)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", onMove);
      ro.disconnect();
      geo.dispose(); mat.dispose(); renderer.dispose();
    };
  }, []);

  const sec = SECTIONS[idx];
  return (
    <main ref={wrapRef} className="pg-wrap">
      <div className="pg-stage">
        <div ref={frameRef} className="pg-frame">
          <canvas ref={glowRef} className="pg-glow" aria-hidden="true" />
          <canvas ref={cvRef} className="pg-canvas" aria-hidden="true" />
          <header className="pg-nav">
            <a className="pg-logo" href="#">Pegasus</a>
            <nav aria-label="Primary"><a href="#">Product</a><a href="#">Features &#9662;</a><a href="#">Solutions</a><a href="#">Pricing</a></nav>
            <a className="pg-pill" href="#">Get started</a>
          </header>
          {sec && (
            <section key={idx} className="pg-copy" style={sec.pos} aria-live="polite">
              <p className="pg-tag">{sec.tag}</p>
              <h1 aria-label={sec.title.join(" ")}>{sec.title.map((l) => <span key={l} aria-hidden="true"><Scramble text={l} /></span>)}</h1>
              {sec.body && <p className="pg-body">{sec.body}</p>}
              {sec.cta && <div className="pg-cta"><a className="pg-btn on" href="#">Get started</a><a className="pg-btn" href="#">Request demo</a></div>}
            </section>
          )}
          <div ref={dashRef} className="pg-dashwrap"><Dashboard /></div>
        </div>
      </div>
    </main>
  );
}
