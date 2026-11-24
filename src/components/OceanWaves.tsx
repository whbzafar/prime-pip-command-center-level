/**
 * Realistic ocean in the background: a WebGL shader with layered rolling swells (Gerstner-style sum of
 * directional waves), fresnel sky reflection, a moonlit specular path, foam on the crests and a horizon
 * fog line. It sits behind the app (aurora theme only), renders at reduced resolution, caps at ~40 fps,
 * pauses in hidden tabs and is skipped when effects are off / reduced-motion is requested.
 */
import { useEffect } from 'react';

const FRAG = `precision mediump float;
uniform vec2 R; uniform float T;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return -1.0+2.0*mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y); }
float oct(vec2 uv,float ch){ uv+=noise(uv); vec2 wv=1.0-abs(sin(uv)); vec2 sw=abs(cos(uv)); wv=mix(wv,sw,wv); return pow(1.0-pow(wv.x*wv.y,0.65),ch); }
float sea(vec2 p){
  float f=0.16, a=0.6, ch=4.0, d, hgt=0.0; float t=T*0.8; mat2 m=mat2(1.6,1.2,-1.2,1.6);
  for(int i=0;i<4;i++){ d=oct((p+t)*f,ch); d+=oct((p-t)*f,ch); hgt+=d*a; p*=m; f*=1.9; a*=0.22; ch=mix(ch,1.0,0.2); }
  return hgt;
}
void main(){
  vec2 uv=gl_FragCoord.xy/R; float horizon=0.40;
  if(uv.y>horizon+0.015){ gl_FragColor=vec4(0.0); return; }
  float y=max(horizon-uv.y,0.0012);
  float z=0.35/y; vec2 p=vec2((uv.x-0.5)*z*(R.x/R.y)*1.4, z*2.2+T*1.4);
  float e=0.12; float c=sea(p);
  vec3 n=normalize(vec3(c-sea(p+vec2(e,0.0)), e*1.6, c-sea(p+vec2(0.0,e))));
  vec3 v=normalize(vec3(0.0,0.28,1.0));
  float fres=clamp(pow(1.0-max(dot(n,v),0.0),3.0)*0.7,0.0,1.0);
  vec3 deep=vec3(0.0,0.035,0.085), water=vec3(0.03,0.16,0.24), sky=vec3(0.20,0.27,0.58);
  vec3 col=mix(deep,water,clamp(c*0.55,0.0,1.0)*0.6);
  col=mix(col,sky,fres);
  vec3 L=normalize(vec3(0.25,0.45,-1.0));
  float spec=pow(max(dot(reflect(-L,n),v),0.0),80.0);
  float path=exp(-pow((uv.x-0.64)*4.0,2.0));
  col+=vec3(0.80,0.90,1.0)*spec*(0.35+1.4*path);
  col+=vec3(0.65,0.85,0.95)*smoothstep(1.05,1.35,c)*0.18;
  float fog=smoothstep(0.0,0.22,y);
  col=mix(vec3(0.10,0.13,0.30),col,fog);
  float alpha=(0.35+0.55*fog)*smoothstep(horizon+0.015,horizon-0.02,uv.y);
  gl_FragColor=vec4(col*alpha,alpha);
}`;

export function OceanWaves() {
  useEffect(() => {
    const html = document.documentElement;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const cv = document.createElement('canvas'); cv.id = 'ppfx-ocean'; cv.setAttribute('aria-hidden', 'true');
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
    const size = () => { const s = Math.min(window.devicePixelRatio || 1, 1) * (window.innerWidth < 700 ? 0.5 : 0.6); cv.width = Math.round(window.innerWidth * s); cv.height = Math.round(window.innerHeight * s); gl.viewport(0, 0, cv.width, cv.height); };
    size(); window.addEventListener('resize', size);
    let raf = 0, last = 0; const t0 = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden || now - last < 25) return;
      const fx = html.dataset.fx; if (fx === 'off' || html.dataset.theme !== 'aurora' || html.classList.contains('ppfx-clear-video')) { cv.style.display = 'none'; return; }
      cv.style.display = '';
      last = now;
      gl.uniform2f(uR, cv.width, cv.height); gl.uniform1f(uT, (now - t0) / 1000);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size); cv.remove(); };
  }, []);
  return null;
}
