/**
 * Neon deep-space background (replaced the ocean): drifting magenta/cyan nebula, a milky-way band and
 * three twinkling star layers with parallax — plus planets, rockets and comets drawn by spaceObjects.ts.
 * Formerly: realistic ocean in the background: a WebGL shader with layered rolling swells (Gerstner-style sum of
 * directional waves), fresnel sky reflection, a moonlit specular path, foam on the crests and a horizon
 * fog line. It sits behind the app (aurora theme only), renders at reduced resolution, caps at ~40 fps,
 * pauses in hidden tabs and is skipped when effects are off / reduced-motion is requested.
 */
import { useEffect } from 'react';
import { startSpaceObjects } from './spaceObjects';

const FRAG = `precision mediump float;
uniform vec2 R; uniform float T;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y); }
float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return v; }
float stars(vec2 uv,float s,float t){ vec2 g=floor(uv*s); vec2 f=fract(uv*s)-0.5; float h=hash(g);
  if(h<0.965) return 0.0; vec2 o=vec2(hash(g+3.1),hash(g+7.7))-0.5; float d=length(f-o*0.7);
  float tw=0.6+0.4*sin(t*(1.0+h*3.0)+h*40.0); return smoothstep(0.08,0.0,d)*tw*(h-0.965)*28.0; }
void main(){
  vec2 uv=gl_FragCoord.xy/R; vec2 p=(gl_FragCoord.xy-0.5*R)/R.y; float t=T*0.02;
  // drifting neon nebula: magenta / cyan / violet clouds
  float n1=fbm(p*1.6+vec2(t,t*0.6)); float n2=fbm(p*2.4-vec2(t*0.7,-t)+n1);
  vec3 col=vec3(0.006,0.008,0.03);
  col+=vec3(0.55,0.08,0.60)*pow(smoothstep(0.40,0.90,n2),1.8)*0.95;
  col+=vec3(0.05,0.55,0.75)*pow(smoothstep(0.45,0.95,fbm(p*1.9+vec2(-t,t*0.4)+n2*0.6)),1.8)*0.85;
  col+=vec3(0.25,0.15,0.75)*pow(n1,3.0)*0.35;
  // milky-way band
  float band=exp(-pow((p.y-p.x*0.35+0.05)*3.2,2.0));
  col+=vec3(0.30,0.32,0.55)*band*fbm(p*6.0+t)*0.28;
  // three star layers with slow parallax
  col+=vec3(0.75,0.85,1.0)*stars(uv+vec2(t*0.6,0.0),90.0,T);
  col+=vec3(1.0,0.85,0.95)*stars(uv+vec2(t*1.2,0.0),55.0,T)*0.9;
  col+=vec3(0.7,1.0,1.0)*stars(uv+vec2(t*2.2,0.0),28.0,T)*1.1;
  gl_FragColor=vec4(col,1.0);
}`;

export function OceanWaves() {
  useEffect(() => {
    const html = document.documentElement;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const cv = document.createElement('canvas'); cv.id = 'ppfx-space'; cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv);
    const gl = cv.getContext('webgl', { premultipliedAlpha: true, antialias: false, alpha: true, powerPreference: 'low-power' });
    if (!gl) { cv.remove(); return; }
    const sh = (t: number, src: string) => { const s = gl.createShader(t)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram()!;
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}'));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { cv.remove(); return; }
    gl.useProgram(pr);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(pr, 'R'), uT = gl.getUniformLocation(pr, 'T');
    const size = () => { const s = Math.min(window.devicePixelRatio || 1, 1) * (window.innerWidth < 700 ? 0.35 : 0.45); cv.width = Math.round(window.innerWidth * s); cv.height = Math.round(window.innerHeight * s); gl.viewport(0, 0, cv.width, cv.height); };
    size(); window.addEventListener('resize', size);
    let raf = 0, last = 0; const t0 = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden || now - last < 50 || (window as any).__ppfxScrolling) return;
      const fx = html.dataset.fx; if (fx !== 'full' || html.dataset.theme !== 'aurora' || html.classList.contains('ppfx-clear-video')) { cv.style.display = 'none'; return; }
      cv.style.display = '';
      last = now;
      gl.uniform2f(uR, cv.width, cv.height); gl.uniform1f(uT, (now - t0) / 1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    raf = requestAnimationFrame(frame);
    let st = 0; const onScroll = () => { (window as any).__ppfxScrolling = true; clearTimeout(st); st = window.setTimeout(() => { (window as any).__ppfxScrolling = false; }, 180); };
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    const stopVessels = startSpaceObjects();
    return () => { cancelAnimationFrame(raf); stopVessels(); window.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', size); cv.remove(); };
  }, []);
  return null;
}
