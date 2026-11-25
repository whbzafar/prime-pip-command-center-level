/**
 * Ocean under a neon deep-space sky: drifting magenta/cyan nebula, a milky-way band and
 * three twinkling star layers with parallax — plus planets, rockets and comets drawn by spaceObjects.ts.
 * Formerly: realistic ocean in the background: a WebGL shader with layered rolling swells (Gerstner-style sum of
 * directional waves), fresnel sky reflection, a moonlit specular path, foam on the crests and a horizon
 * fog line. It sits behind the app (aurora theme only), renders at reduced resolution, caps at ~40 fps,
 * pauses in hidden tabs and is skipped when effects are off / reduced-motion is requested.
 */
import { useEffect } from 'react';
import { startSpaceObjects } from './spaceObjects';

const FRAG = `precision highp float;
uniform vec2 R; uniform float T;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return -1.0+2.0*mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y); }
float oct(vec2 uv,float ch){ uv+=noise(uv); vec2 wv=1.0-abs(sin(uv)); vec2 sw=abs(cos(uv)); wv=mix(wv,sw,wv); return pow(1.0-pow(wv.x*wv.y,0.65),ch); }
// sea height: long swells + choppy wind waves (more octaves = finer detail, used for the normals)
float seaH(vec2 p,int N){
  float f=0.16, a=0.6, ch=4.0, d, hgt=0.0; float t=T*0.8; mat2 m=mat2(1.6,1.2,-1.2,1.6);
  for(int i=0;i<6;i++){ if(i>=N) break; d=oct((p+t)*f,ch); d+=oct((p-t)*f,ch); hgt+=d*a; p*=m; f*=1.9; a*=0.22; ch=mix(ch,1.0,0.2); }
  return hgt;
}
float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*(noise(p)*0.5+0.5); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return v; }
float fbm3(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<3;i++){ v+=a*(noise(p)*0.5+0.5); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return v; }
float stars(vec2 uv,float s,float t){ vec2 g=floor(uv*s); vec2 f=fract(uv*s)-0.5; float h=hash(g);
  if(h<0.965) return 0.0; vec2 o=vec2(hash(g+3.1),hash(g+7.7))-0.5; float d=length(f-o*0.7);
  float tw=0.6+0.4*sin(t*(1.0+h*3.0)+h*40.0); return smoothstep(0.08,0.0,d)*tw*(h-0.965)*28.0; }
// rare bright stars with a soft halo and diffraction spikes, tinted blue-white to gold
vec3 beacons(vec2 uv,float t){ vec2 sc=vec2(11.0,7.0); vec2 g=floor(uv*sc); vec2 f=fract(uv*sc)-0.5; float h=hash(g+11.3);
  if(h<0.86) return vec3(0.0); vec2 o=(vec2(hash(g+1.7),hash(g+5.3))-0.5)*0.6; vec2 d=f-o; float r=length(d);
  float tw=0.75+0.25*sin(t*(0.8+h*2.0)+h*50.0);
  float core=exp(-r*46.0)*1.4; float halo=exp(-r*11.0)*0.22;
  float spike=(exp(-abs(d.x)*70.0)*exp(-abs(d.y)*5.5)+exp(-abs(d.y)*70.0)*exp(-abs(d.x)*5.5))*0.55;
  vec3 tint=mix(vec3(0.7,0.85,1.0),vec3(1.0,0.86,0.6),hash(g+9.1));
  return tint*(core+halo+spike)*tw*(h-0.86)*6.5; }
// spiral galaxy: tilted disc, two dust-laned log-spiral arms, pink star-forming knots, warm core and a faint halo
vec3 galaxy(vec2 p, vec2 c, float sz, float rot, float tilt, float detail){
  vec2 q=(p-c)/sz; float ct=cos(tilt), st=sin(tilt); q=vec2(ct*q.x+st*q.y, -st*q.x+ct*q.y); q=vec2(q.x, q.y*2.4);
  float r=length(q); if(r>1.6) return vec3(0.0);
  float a=atan(q.y,q.x)+rot; float sp=2.0*a-5.2*log(r+0.03);
  float arm=pow(0.5+0.5*cos(sp),2.2);
  float dens=detail>0.5 ? fbm3(q*7.0+rot) : 0.6;
  float lane=pow(0.5+0.5*cos(sp+1.25),3.0)*smoothstep(0.1,0.5,r)*(0.4+0.6*dens);
  float disc=exp(-r*2.3);
  vec3 col=mix(vec3(0.95,0.78,0.55),vec3(0.46,0.58,1.0),smoothstep(0.05,0.55,r))*arm*disc*(0.55+0.9*dens);
  float knots=detail>0.5 ? pow(fbm3(q*17.0-rot),4.5) : 0.0;
  col+=vec3(1.0,0.35,0.72)*knots*arm*exp(-r*1.9)*3.2;
  col*=1.0-0.62*lane;
  col+=vec3(1.0,0.88,0.7)*exp(-r*16.0)*1.5 + vec3(0.55,0.5,1.0)*exp(-r*4.0)*0.10;
  return col*smoothstep(1.6,1.0,r); }
vec3 spaceSky(vec2 uv, float detail){
  vec2 p=(uv-0.5)*vec2(R.x/R.y,1.0); float t=T*0.02;
  float n1=detail>0.5 ? fbm(p*1.6+vec2(t,t*0.6)) : fbm3(p*1.6+vec2(t,t*0.6));
  float n2=detail>0.5 ? fbm(p*2.4-vec2(t*0.7,-t)+n1) : fbm3(p*2.4-vec2(t*0.7,-t)+n1);
  vec3 col=vec3(0.003,0.005,0.020);
  // depth gradient: deep indigo overhead warming to violet near the horizon
  col+=mix(vec3(0.0,0.004,0.03),vec3(0.05,0.02,0.10),smoothstep(0.9,0.4,uv.y))*1.2;
  col+=vec3(0.58,0.07,0.62)*pow(smoothstep(0.42,0.86,n2),1.8)*0.8;
  col+=vec3(0.04,0.52,0.80)*pow(smoothstep(0.48,0.90,fbm3(p*1.9+vec2(-t,t*0.4)+n2*0.6)),1.8)*0.72;
  col+=vec3(0.95,0.55,0.18)*pow(smoothstep(0.58,0.95,fbm3(p*1.3+vec2(t*0.5,-t*0.3)+n1*0.8+5.0)),2.2)*0.30;
  float band=exp(-pow((p.y-p.x*0.35-0.05)*3.2,2.0));
  col+=vec3(0.32,0.34,0.58)*band*pow(detail>0.5 ? fbm(p*7.0+t) : fbm3(p*7.0+t),2.0)*0.55;
  col+=galaxy(p, vec2(-0.34,0.30), 0.30, T*0.012, 0.55, detail);
  col+=galaxy(p, vec2(0.52,0.44), 0.085, -T*0.018, -0.35, detail)*0.8;
  col+=vec3(0.75,0.85,1.0)*stars(uv+vec2(t*0.6,0.0),90.0,T);
  col+=vec3(1.0,0.85,0.95)*stars(uv+vec2(t*1.2,0.0),55.0,T)*0.9;
  col+=vec3(0.7,1.0,1.0)*stars(uv+vec2(t*2.2,0.0),28.0,T)*1.1;
  col+=beacons(uv+vec2(t*0.8,0.0),T);
  return col;
}
void main(){
  vec2 uv=gl_FragCoord.xy/R; float horizon=0.40;
  if(uv.y>horizon){ vec3 sk=spaceSky(uv,1.0); float hz=exp(-(uv.y-horizon)*24.0); sk+=vec3(0.16,0.20,0.48)*hz*0.45; gl_FragColor=vec4(sk,1.0); return; }
  float y=max(horizon-uv.y,0.0012);
  float z=0.35/y; vec2 p=vec2((uv.x-0.5)*z*(R.x/R.y)*1.4, z*2.2+T*1.4);
  // farther water needs fewer octaves (saves GPU and avoids shimmering)
  int N=y<0.04?3:(y<0.12?4:6);
  float e=0.12; float c=seaH(p,N);
  vec3 n=normalize(vec3(c-seaH(p+vec2(e,0.0),N), e*1.6, c-seaH(p+vec2(0.0,e),N)));
  vec3 v=normalize(vec3(0.0,0.24,1.0));
  float fres=clamp(0.02+0.98*pow(1.0-max(dot(n,v),0.0),5.0),0.0,1.0);
  // reflection of the actual sky (galaxy, nebula, stars), distorted by the wave normals
  vec2 ruv=vec2(uv.x+n.x*0.06, horizon+(horizon-uv.y)*0.9+n.z*0.05);
  vec3 refl=spaceSky(clamp(ruv,0.0,1.0),0.0);
  // body colour + subsurface scattering on the lit side of crests
  vec3 deep=vec3(0.01,0.05,0.11), water=vec3(0.04,0.17,0.27), sss=vec3(0.0,0.28,0.30);
  float dif=max(dot(n,normalize(vec3(0.2,1.0,0.6))),0.0);
  vec3 col=mix(deep,water,clamp(c*0.5,0.0,1.0)*0.7)*(0.45+0.75*dif);
  col+=sss*pow(max(c-0.6,0.0),2.0)*0.8*(0.6+0.4*n.x);
  col=mix(col, refl*0.9+vec3(0.14,0.18,0.42)*0.45, clamp(fres*1.1,0.0,0.6));
  // glitter paths from the pink giant (right) and the cyan planet (left)
  vec3 L1=normalize(vec3(0.45,0.40,-1.0)), L2=normalize(vec3(-0.50,0.45,-1.0));
  float s1=pow(max(dot(reflect(-L1,n),v),0.0),70.0), s2=pow(max(dot(reflect(-L2,n),v),0.0),90.0);
  float p1=exp(-pow((uv.x-0.80)*3.2,2.0)), p2=exp(-pow((uv.x-0.14)*4.5,2.0));
  col+=vec3(1.0,0.60,0.95)*s1*(0.4+2.6*p1);
  col+=vec3(0.60,0.95,1.0)*s2*(0.35+2.2*p2);
  // white foam on breaking crests
  float foam=smoothstep(1.15,1.45,c)*(0.5+0.5*noise(p*3.0+T));
  col=mix(col, vec3(0.85,0.92,1.0), foam*0.22*smoothstep(0.02,0.15,y));
  // distance haze toward the horizon (picks up the horizon glow)
  float fog=smoothstep(0.0,0.20,y);
  col=mix(vec3(0.07,0.09,0.24)+refl*0.25, col, fog);
  col=pow(col, vec3(0.92));
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
    const size = () => { const s = Math.min(window.devicePixelRatio || 1, 1) * (window.innerWidth < 700 ? 0.4 : 0.5); cv.width = Math.round(window.innerWidth * s); cv.height = Math.round(window.innerHeight * s); gl.viewport(0, 0, cv.width, cv.height); };
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
