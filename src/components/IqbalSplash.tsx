import { useEffect, useRef } from "react";

/**
 * Opening screen: Allama Iqbal's "Sitaron se aage jahan aur bhi hain" over a living galaxy.
 * Pure canvas + CSS, no assets, so it paints instantly and never blocks loading.
 */
const WORDS = ["ستاروں", "سے", "آگے", "جہاں", "اور", "بھی", "ہیں"]; // read right to left

type Star = { x: number; y: number; z: number; r: number; tw: number; hue: number };
type Dot = { a: number; d: number; arm: number; s: number; hue: number; l: number; o: number };

export default function IqbalSplash({ onSkip, ready }: { onSkip?: () => void; ready?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current; if (!cv) return; const ctx = cv.getContext("2d"); if (!ctx) return;
    const still = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, dpr = 1, raf = 0, t0 = performance.now();
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const stars: Star[] = []; const dots: Dot[] = []; const shooters: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
    let nextShot = 1800;

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      stars.length = 0; dots.length = 0;
      const n = Math.round(Math.min(900, (W * H) / 1800));
      for (let i = 0; i < n; i++) stars.push({ x: rnd(-1, 1), y: rnd(-1, 1), z: rnd(0.15, 1), r: rnd(0.4, 1.5), tw: rnd(0, 6.28), hue: Math.random() < 0.18 ? rnd(190, 215) : Math.random() < 0.14 ? rnd(25, 45) : 220 });
      const arms = 3, count = W < 640 ? 2600 : 4200;
      for (let i = 0; i < count; i++) {
        const arm = i % arms; const d = Math.pow(Math.random(), 0.62); const spread = rnd(-1, 1) * (0.34 - d * 0.2);
        dots.push({ arm, d, a: arm * (6.283 / arms) + d * 7.2 + spread, s: rnd(0.5, 1.7), hue: 205 + d * 120 + rnd(-14, 14), l: 62 + (1 - d) * 24, o: rnd(0.35, 0.95) * (1 - d * 0.5) });
      }
    };

    const nebula = (x: number, y: number, r: number, h: number, a: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `hsla(${h},80%,55%,${a})`); g.addColorStop(0.5, `hsla(${h + 20},70%,35%,${a * 0.4})`); g.addColorStop(1, "hsla(230,60%,10%,0)"); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };

    const planet = (x: number, y: number, r: number, base: number, ring: boolean, t: number) => {
      ctx.save(); ctx.translate(x, y);
      const halo = ctx.createRadialGradient(0, 0, r * 0.9, 0, 0, r * 2.4); halo.addColorStop(0, `hsla(${base},90%,65%,0.35)`); halo.addColorStop(1, `hsla(${base},90%,50%,0)`); ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, r * 2.4, 0, 6.283); ctx.fill();
      if (ring) { ctx.save(); ctx.rotate(-0.38); ctx.scale(1, 0.26); ctx.strokeStyle = `hsla(${base + 20},60%,78%,0.55)`; ctx.lineWidth = r * 0.16; ctx.beginPath(); ctx.arc(0, 0, r * 1.7, Math.PI, 6.283); ctx.stroke(); ctx.restore(); }
      const body = ctx.createRadialGradient(-r * 0.45, -r * 0.45, r * 0.1, 0, 0, r); body.addColorStop(0, `hsl(${base},85%,78%)`); body.addColorStop(0.55, `hsl(${base + 10},70%,42%)`); body.addColorStop(1, `hsl(${base + 25},60%,10%)`);
      ctx.fillStyle = body; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill();
      ctx.globalCompositeOperation = "source-atop"; ctx.globalAlpha = 0.16; for (let i = -2; i <= 2; i++) { ctx.fillStyle = i % 2 ? "#fff" : "#000"; ctx.fillRect(-r, i * r * 0.28 + Math.sin(t * 0.0003 + i) * 2, r * 2, r * 0.12); } ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      if (ring) { ctx.save(); ctx.rotate(-0.38); ctx.scale(1, 0.26); ctx.strokeStyle = `hsla(${base + 20},60%,82%,0.7)`; ctx.lineWidth = r * 0.16; ctx.beginPath(); ctx.arc(0, 0, r * 1.7, 0, Math.PI); ctx.stroke(); ctx.restore(); }
      ctx.restore();
    };

    const frame = (now: number) => {
      const t = now - t0; const k = still ? 6000 : t; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#02030a"); bg.addColorStop(0.55, "#070a1c"); bg.addColorStop(1, "#0b0620"); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      const drift = Math.sin(k * 0.00012) * 14;
      ctx.globalCompositeOperation = "lighter";
      nebula(W * 0.2 + drift, H * 0.28, Math.max(W, H) * 0.5, 262, 0.2); nebula(W * 0.85 - drift, H * 0.7, Math.max(W, H) * 0.55, 322, 0.14); nebula(W * 0.55, H * 0.12, Math.max(W, H) * 0.4, 196, 0.12);

      // far stars drift outward slowly: the feeling of travelling beyond
      const cx = W / 2, cy = H * 0.5, zoom = 1 + (k % 60000) * 0.000004;
      for (const s of stars) {
        const px = cx + s.x * W * 0.62 * s.z * zoom + Math.sin(k * 0.00007 + s.tw) * 3 * s.z, py = cy + s.y * H * 0.62 * s.z * zoom; if (px < -4 || px > W + 4 || py < -4 || py > H + 4) continue;
        const a = (0.35 + 0.65 * Math.abs(Math.sin(k * 0.0011 * s.z + s.tw))) * s.z; ctx.fillStyle = `hsla(${s.hue},${s.hue === 220 ? 20 : 80}%,${s.hue === 220 ? 88 : 75}%,${a})`; ctx.beginPath(); ctx.arc(px, py, s.r * s.z * 1.2, 0, 6.283); ctx.fill();
      }

      // the galaxy
      const gx = W * (W < 700 ? 0.5 : 0.5), gy = H * (W < 700 ? 0.2 : 0.46), R = Math.min(W, H) * (W < 700 ? 0.78 : 0.62), rot = k * 0.00005, tilt = 0.42;
      const core = ctx.createRadialGradient(gx, gy, 0, gx, gy, R * 0.42); core.addColorStop(0, "rgba(255,244,214,0.95)"); core.addColorStop(0.12, "rgba(255,206,130,0.55)"); core.addColorStop(0.4, "rgba(150,120,255,0.18)"); core.addColorStop(1, "rgba(60,40,160,0)");
      ctx.save(); ctx.translate(gx, gy); ctx.rotate(-0.5); ctx.scale(1, tilt + 0.25); ctx.translate(-gx, -gy); ctx.fillStyle = core; ctx.fillRect(gx - R, gy - R, R * 2, R * 2); ctx.restore();
      for (const d of dots) {
        const a = d.a + rot * (1.4 - d.d); const rr = d.d * R; const x0 = Math.cos(a) * rr, y0 = Math.sin(a) * rr * tilt;
        const x = gx + x0 * Math.cos(-0.5) - y0 * Math.sin(-0.5), y = gy + x0 * Math.sin(-0.5) + y0 * Math.cos(-0.5);
        ctx.fillStyle = `hsla(${d.hue},85%,${d.l}%,${d.o})`; ctx.fillRect(x, y, d.s, d.s);
      }
      ctx.globalCompositeOperation = "source-over";

      // worlds beyond the stars
      const fade = Math.min(1, Math.max(0, (t - 1400) / 1800));
      ctx.globalAlpha = still ? 1 : fade;
      const pb = W < 700 ? 0.55 : 1;
      planet(W * 0.84 + drift * 0.6, H * (W < 700 ? 0.82 : 0.8) - Math.sin(k * 0.0003) * 6, 46 * pb, 18, true, k);
      planet(W * 0.13 - drift * 0.4, H * (W < 700 ? 0.8 : 0.7) + Math.cos(k * 0.00025) * 5, 26 * pb, 205, false, k);
      planet(W * 0.55 - drift, H * 0.92, 12 * pb, 330, false, k);
      ctx.globalAlpha = 1;

      if (!still) {
        if (t > nextShot) { nextShot = t + rnd(2200, 4200); shooters.push({ x: rnd(W * 0.1, W * 0.9), y: rnd(0, H * 0.35), vx: rnd(5, 8), vy: rnd(2, 3.5), life: 1 }); }
        ctx.globalCompositeOperation = "lighter";
        for (let i = shooters.length - 1; i >= 0; i--) { const s = shooters[i]; s.x += s.vx; s.y += s.vy; s.life -= 0.018; if (s.life <= 0) { shooters.splice(i, 1); continue; } const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 14, s.y - s.vy * 14); g.addColorStop(0, `rgba(255,240,210,${s.life})`); g.addColorStop(1, "rgba(255,240,210,0)"); ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 14, s.y - s.vy * 14); ctx.stroke(); }
        ctx.globalCompositeOperation = "source-over";
      }
      // vignette keeps the eye on the verse
      const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75); v.addColorStop(0, "rgba(2,3,10,0)"); v.addColorStop(1, "rgba(2,3,10,0.72)"); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
      if (!still) raf = requestAnimationFrame(frame);
    };

    build(); raf = requestAnimationFrame(frame);
    const on = () => { build(); if (still) frame(performance.now()); };
    window.addEventListener("resize", on);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", on); };
  }, []);

  return (
    <div role="status" aria-label="Beyond the stars there are still other worlds, Allama Iqbal" onClick={onSkip} className="iq-wrap">
      <style>{CSS}</style>
      <canvas ref={ref} className="iq-canvas" aria-hidden="true" />
      <div className="iq-content">
        <p className="iq-kicker">PRIMEPIPFX</p>
        <h1 dir="rtl" lang="ur" className="iq-urdu">
          {[WORDS.slice(0, 3), WORDS.slice(3)].map((line, li) => (
            <span key={li} className="iq-line">
              {line.map((w, j) => { const i = li * 3 + j; return <span key={i} className="iq-word" style={{ animationDelay: `${0.7 + i * 0.42}s` }}>{w}</span>; })}
            </span>
          ))}
        </h1>
        <div className="iq-rule" aria-hidden="true"><i /></div>
        <p className="iq-roman">Sitaron se aage jahan aur bhi hain</p>
        <p className="iq-en">Beyond the stars, there are still other worlds.</p>
        <p className="iq-by">— Allama Muhammad Iqbal</p>
      </div>
      <div className="iq-foot" aria-hidden="true"><span className={ready ? "iq-dot on" : "iq-dot"} />{ready ? "Tap to enter" : "Preparing your journey"}</div>
    </div>
  );
}

const CSS = `
.iq-wrap{position:fixed;inset:0;z-index:9999;background:#02030a;overflow:hidden;cursor:pointer;color:#f3ead2;-webkit-tap-highlight-color:transparent}
.iq-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;animation:iqIn 1.6s ease-out both}
.iq-content{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;pointer-events:none}
.iq-kicker{font:600 11px/1 'Chakra Petch',system-ui,sans-serif;letter-spacing:.55em;color:rgba(245,217,138,.7);margin:0 0 clamp(18px,4vh,40px);padding-left:.55em;opacity:0;animation:iqUp 1.2s .2s ease-out forwards}
.iq-urdu{margin:0;display:flex;flex-wrap:wrap;justify-content:center;gap:0 .32em;max-width:min(94vw,1000px);font-family:'Noto Nastaliq Urdu','Jameel Noori Nastaleeq','Noto Naskh Arabic',serif;font-weight:700;font-size:clamp(34px,5.1vw,78px);line-height:2.05;
 background:linear-gradient(180deg,#fff8e1 0%,#f7d98b 42%,#d89a3c 100%);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;filter:drop-shadow(0 0 22px rgba(255,196,96,.38)) drop-shadow(0 3px 14px rgba(0,0,0,.65))}
.iq-line{display:contents}
.iq-word{display:inline-block;opacity:0;transform:translateY(18px) scale(.96);filter:blur(10px);animation:iqWord 1.1s cubic-bezier(.2,.8,.2,1) forwards}
.iq-rule{width:min(240px,50vw);height:1px;margin:clamp(8px,2vh,22px) 0 clamp(14px,3vh,26px);background:linear-gradient(90deg,transparent,rgba(245,217,138,.8),transparent);position:relative;opacity:0;animation:iqUp 1s 4.0s ease-out forwards}
.iq-rule i{position:absolute;left:50%;top:-3px;width:7px;height:7px;margin-left:-3.5px;transform:rotate(45deg);background:#f5d98a;box-shadow:0 0 14px #f5d98a}
.iq-roman{margin:0;font:500 clamp(15px,2.2vw,22px)/1.4 'Plus Jakarta Sans',system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,244,214,.92);opacity:0;animation:iqUp 1.1s 4.1s ease-out forwards}
.iq-en{margin:10px 0 0;font:italic 400 clamp(14px,1.9vw,19px)/1.5 'Plus Jakarta Sans',system-ui,sans-serif;color:rgba(200,214,255,.8);opacity:0;animation:iqUp 1.1s 4.4s ease-out forwards}
.iq-by{margin:clamp(14px,3vh,26px) 0 0;font:600 12px/1 'Chakra Petch',system-ui,sans-serif;letter-spacing:.3em;text-transform:uppercase;color:rgba(245,217,138,.75);opacity:0;animation:iqUp 1.1s 4.8s ease-out forwards}
.iq-foot{position:absolute;left:0;right:0;bottom:max(22px,env(safe-area-inset-bottom));display:flex;align-items:center;justify-content:center;gap:10px;font:500 11px/1 'Chakra Petch',system-ui,sans-serif;letter-spacing:.32em;text-transform:uppercase;color:rgba(200,214,255,.6)}
.iq-dot{width:6px;height:6px;border-radius:50%;background:#7aa2ff;box-shadow:0 0 10px #7aa2ff;animation:iqPulse 1.2s ease-in-out infinite}.iq-dot.on{background:#f5d98a;box-shadow:0 0 12px #f5d98a}
@keyframes iqIn{from{opacity:0;transform:scale(1.06)}to{opacity:1;transform:scale(1)}}
@keyframes iqUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes iqWord{0%{opacity:0;transform:translateY(18px) scale(.96);filter:blur(10px)}100%{opacity:1;transform:none;filter:blur(0)}}
@keyframes iqPulse{0%,100%{opacity:.35;transform:scale(.8)}50%{opacity:1;transform:scale(1.15)}}
@media (max-width:700px){.iq-roman{font-size:13px;letter-spacing:.08em}.iq-urdu{font-size:clamp(34px,10.5vw,52px);line-height:2.1}.iq-line{display:flex;justify-content:center;gap:0 .3em;width:100%}}
@media (prefers-reduced-motion:reduce){.iq-canvas,.iq-kicker,.iq-word,.iq-rule,.iq-roman,.iq-en,.iq-by{animation-duration:.01s!important;animation-delay:0s!important}}
`;
