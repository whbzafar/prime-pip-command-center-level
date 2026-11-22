import React, { useEffect, useRef } from 'react';
import { fetchJsonSafe } from './fundamentalAnalysis/ui';

/**
 * MarketAura — a GPU (WebGL) domain-warped aurora that sits over the whole terminal as a soft blend layer.
 * Its colour is driven by the live macro mood (average short-term fundamental score of every scored pair):
 * bullish tape drifts teal/emerald, bearish tape drifts magenta/crimson, balanced stays indigo.
 * The pointer carries a soft light and leaves a ripple. Cheap by design: quarter-res canvas, 30 fps cap,
 * paused when the tab is hidden, disabled for reduced-motion and silently skipped without WebGL.
 */
const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const FRAG = `precision mediump float;
uniform vec2 r;uniform float t;uniform vec2 m;uniform float mood;uniform float pulse;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p=p*2.02+vec2(1.7,9.2);a*=.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/r;vec2 q=(gl_FragCoord.xy-.5*r)/r.y;
  float tt=t*.045;
  vec2 w=vec2(fbm(q*1.6+tt),fbm(q*1.6-tt+4.));
  float f=fbm(q*1.4+2.2*w+vec2(0.,tt*1.3));
  vec3 bull=vec3(.05,.85,.62),bear=vec3(.95,.18,.52),calm=vec3(.28,.34,.95),cy=vec3(.1,.8,1.);
  vec3 a=mix(calm,mood>0.?bull:bear,abs(mood));
  vec3 col=mix(a,cy,smoothstep(.35,.85,f))*smoothstep(.25,.9,f);
  float d=distance(uv*vec2(r.x/r.y,1.),m*vec2(r.x/r.y,1.));
  col+=a*.55*exp(-d*5.5)+cy*.25*pulse*exp(-pow(abs(d-fract(t*.35)*.8),2.)*180.)*step(.001,pulse);
  float vig=smoothstep(1.15,.2,length(uv-.5));
  gl_FragColor=vec4(col*vig,1.);
}`;

export const MarketAura: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const gl = (cv.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' }) as WebGLRenderingContext | null);
    if (!gl) return;
    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const pr = gl.createProgram()!; gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n: string) => gl.getUniformLocation(pr, n);
    const uR = U('r'), uT = U('t'), uM = U('m'), uMood = U('mood'), uPulse = U('pulse');
    const size = () => { const k = 0.3; cv.width = Math.max(64, Math.round(window.innerWidth * k)); cv.height = Math.max(64, Math.round(window.innerHeight * k)); gl.viewport(0, 0, cv.width, cv.height); };
    size(); window.addEventListener('resize', size);
    const mouse = { x: 0.5, y: 0.5 }; let target = { x: 0.5, y: 0.5 }; let pulse = 0;
    const onMove = (e: PointerEvent) => { target = { x: e.clientX / window.innerWidth, y: 1 - e.clientY / window.innerHeight }; };
    const onDown = () => { pulse = 1; window.setTimeout(() => { pulse = 0; }, 1400); };
    window.addEventListener('pointermove', onMove, { passive: true }); window.addEventListener('pointerdown', onDown, { passive: true });
    let mood = 0, moodT = 0;
    const pull = () => fetchJsonSafe<any>('/api/macro/rankings').then((j) => {
      const all: Array<{ shortTerm: number | null }> = j?.data?.all || [];
      const v = all.map((x) => x.shortTerm).filter((x): x is number => typeof x === 'number');
      if (v.length >= 5) moodT = Math.max(-1, Math.min(1, v.reduce((a, b) => a + b, 0) / v.length / 25));
    }).catch(() => undefined);
    void pull(); const poll = window.setInterval(pull, 120_000);
    let raf = 0, last = 0, alive = true; const t0 = performance.now();
    const frame = (now: number) => {
      if (!alive) return; raf = requestAnimationFrame(frame);
      if (document.hidden || now - last < 33) return; last = now;
      mouse.x += (target.x - mouse.x) * 0.08; mouse.y += (target.y - mouse.y) * 0.08; mood += (moodT - mood) * 0.02;
      gl.uniform2f(uR, cv.width, cv.height); gl.uniform1f(uT, (now - t0) / 1000); gl.uniform2f(uM, mouse.x, mouse.y); gl.uniform1f(uMood, mood); gl.uniform1f(uPulse, pulse);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    raf = requestAnimationFrame(frame);
    return () => { alive = false; cancelAnimationFrame(raf); window.clearInterval(poll); window.removeEventListener('resize', size); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerdown', onDown); gl.getExtension('WEBGL_lose_context')?.loseContext(); };
  }, []);
  return <canvas ref={ref} aria-hidden="true" data-testid="market-aura" className="fixed inset-0 h-full w-full pointer-events-none select-none" style={{ zIndex: 2, mixBlendMode: 'screen', opacity: 0.2 }} />;
};
export default MarketAura;
