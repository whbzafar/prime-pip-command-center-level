import{r as H}from"./index-CSQCiIUk.js";const d=i=>{const c=Math.sin(i*9301+49297)*233280;return c-Math.floor(c)};function L(i,c,e,h,n,t=0){const v=n?i*1.4:i*.6,p=Math.ceil((i+v)*2),g=document.createElement("canvas");g.width=g.height=p;const o=g.getContext("2d"),l=p/2,m=o.createRadialGradient(l,l,i*.9,l,l,i+v*.9);m.addColorStop(0,h),m.addColorStop(1,"rgba(0,0,0,0)"),o.fillStyle=m,o.fillRect(0,0,p,p);const y=f=>{n&&(o.save(),o.translate(l,l),o.rotate(-.38),o.scale(1,.28),o.beginPath(),o.arc(0,0,i*1.95,f?0:Math.PI,f?Math.PI:Math.PI*2),o.lineWidth=i*.32,o.strokeStyle=n,o.globalAlpha=.75,o.stroke(),o.beginPath(),o.arc(0,0,i*1.55,f?0:Math.PI,f?Math.PI:Math.PI*2),o.lineWidth=i*.08,o.globalAlpha=.5,o.stroke(),o.restore())};y(!1);const w=o.createRadialGradient(l-i*.4,l-i*.4,i*.1,l,l,i);w.addColorStop(0,c),w.addColorStop(1,e),o.save(),o.beginPath(),o.arc(l,l,i,0,Math.PI*2),o.clip(),o.fillStyle=w,o.fillRect(l-i,l-i,i*2,i*2);for(let f=0;f<t;f++)o.globalAlpha=.12+d(f)*.12,o.fillStyle=f%2?"#ffffff":"#000000",o.fillRect(l-i,l-i+(f+d(f*3))*(2*i/t),i*2,i*(.05+d(f*5)*.12));o.globalAlpha=1;const S=o.createLinearGradient(l-i,l-i,l+i,l+i);return S.addColorStop(.45,"rgba(0,0,0,0)"),S.addColorStop(1,"rgba(0,0,10,.82)"),o.fillStyle=S,o.fillRect(l-i,l-i,i*2,i*2),o.restore(),o.beginPath(),o.arc(l,l,i,0,Math.PI*2),o.lineWidth=Math.max(1,i*.03),o.strokeStyle=h.replace(/[\d.]+\)$/,"0.9)"),o.stroke(),y(!0),g}function N(){const i=document.documentElement,c=document.createElement("canvas");c.id="ppfx-space-objects",c.setAttribute("aria-hidden","true"),document.body.appendChild(c);const e=c.getContext("2d");if(!e)return c.remove(),()=>{};let h=0,n=0,t=1,v,p,g,o;const l=()=>{h=c.width=window.innerWidth,n=c.height=window.innerHeight,t=Math.min(1.3,Math.max(.55,Math.min(h,n*1.6)/1300)),v=L(110*t,"#ff9be8","#4b1269","rgba(255,60,200,.35)","rgba(120,230,255,.85)",9),p=L(46*t,"#9ff8ff","#06406b","rgba(0,220,255,.40)",void 0,4),g=L(22*t,"#c9a6ff","#2a1160","rgba(150,90,255,.40)"),o=L(11*t,"#e8ecff","#3c4366","rgba(200,210,255,.25)")};l(),window.addEventListener("resize",l);const m=[],y=[];let w=performance.now()+2500,S=performance.now()+1500,f=0,R=0;const k=r=>{if(f=requestAnimationFrame(k),document.hidden||r-R<50||window.__ppfxScrolling)return;const A=i.dataset.fx!=="full"||i.dataset.theme!=="aurora"||i.classList.contains("ppfx-clear-video");if(c.style.display=A?"none":"",A)return;const x=R?Math.min(.2,(r-R)/1e3):0;R=r;const u=r/1e3;e.clearRect(0,0,h,n);const z=h*.8+Math.sin(u*.03)*14*t,C=n*.3+Math.cos(u*.025)*10*t,_=.5+.5*Math.sin(u*.35),P=v.width*(.62+.04*_),E=e.createRadialGradient(z,C,P*.25,z,C,P);E.addColorStop(0,`rgba(255,70,200,${.1+.05*_})`),E.addColorStop(1,"rgba(255,70,200,0)"),e.fillStyle=E,e.fillRect(z-P,C-P,P*2,P*2),e.drawImage(v,z-v.width/2,C-v.height/2);const I=h*.14+Math.sin(u*.04+1)*10*t,q=n*.2+Math.cos(u*.035)*8*t;e.drawImage(p,I-p.width/2,q-p.height/2);const F=u*.18,G=I+Math.cos(F)*82*t,W=q+Math.sin(F)*26*t;e.drawImage(o,G-o.width/2,W-o.height/2);const $=n*.6;for(const[s,a,b]of[[v,z,C],[p,I,q]])e.save(),e.globalAlpha=.09,e.translate(a+Math.sin(u*1.7)*2,2*$-b+Math.sin(u*1.2)*3),e.scale(1.03,-.62),e.drawImage(s,-s.width/2,-s.height/2),e.restore();e.drawImage(g,h*.55-g.width/2,n*.09-g.height/2),e.save(),e.translate(h*.4,n*.44),e.rotate(u*.15),e.strokeStyle="rgba(120,255,240,.55)",e.lineWidth=2*t,e.beginPath(),e.ellipse(0,0,26*t,26*t,0,0,Math.PI*2),e.stroke();for(let s=0;s<4;s++)e.rotate(Math.PI/2),e.beginPath(),e.moveTo(5*t,0),e.lineTo(26*t,0),e.stroke();e.fillStyle="rgba(255,90,210,.9)",e.fillRect(-4*t,-4*t,8*t,8*t),e.restore();{const s=u*.012%1,a=h*(1.1-s*1.2),b=n*(.06+.2*Math.sin(s*Math.PI)),T=Math.sin(u*3)>.6?1:.35;e.fillStyle=`rgba(255,255,255,${.75*T})`,e.fillRect(a,b,1.8*t,1.8*t),e.fillStyle=`rgba(120,255,240,${.25*T})`,e.fillRect(a-1.5*t,b-1.5*t,4.8*t,4.8*t)}if(r>w&&m.length<2){const s=d(r)>.5,a=n*(.1+d(r*1.7)*.38);m.push({x:s?-40:h+40,y:a,vx:(s?1:-1)*(90+d(r*3)*80)*t,vy:-(10+d(r*5)*30)*t,life:0,hue:d(r*7)>.5?"0,240,255":"255,80,210"}),w=r+9e3+d(r*11)*12e3}for(let s=m.length-1;s>=0;s--){const a=m[s];if(a.x+=a.vx*x,a.y+=a.vy*x,a.life+=x,a.x<-80||a.x>h+80){m.splice(s,1);continue}const b=Math.atan2(a.vy,a.vx);e.save(),e.translate(a.x,a.y),e.rotate(b);const T=.75+.25*Math.sin(u*40+s),M=e.createLinearGradient(-90*t,0,0,0);M.addColorStop(0,`rgba(${a.hue},0)`),M.addColorStop(1,`rgba(${a.hue},.75)`),e.fillStyle=M,e.beginPath(),e.moveTo(-90*t*T,0),e.lineTo(-10*t,-3*t),e.lineTo(-10*t,3*t),e.closePath(),e.fill(),e.fillStyle="rgba(255,240,200,.95)",e.beginPath(),e.moveTo(-10*t,-2.2*t),e.lineTo(-17*t*T,0),e.lineTo(-10*t,2.2*t),e.fill(),e.fillStyle="#dfe7ff",e.beginPath(),e.moveTo(14*t,0),e.quadraticCurveTo(6*t,-4.5*t,-10*t,-3.5*t),e.lineTo(-10*t,3.5*t),e.quadraticCurveTo(6*t,4.5*t,14*t,0),e.fill(),e.fillStyle=`rgba(${a.hue},1)`,e.beginPath(),e.moveTo(-6*t,-3.5*t),e.lineTo(-12*t,-8*t),e.lineTo(-10*t,-3.5*t),e.fill(),e.beginPath(),e.moveTo(-6*t,3.5*t),e.lineTo(-12*t,8*t),e.lineTo(-10*t,3.5*t),e.fill(),e.fillStyle=`rgba(${a.hue},1)`,e.beginPath(),e.arc(4*t,0,1.6*t,0,6.3),e.fill(),e.restore()}r>S&&(y.push({x:h*d(r),y:n*d(r*2)*.35,vx:(300+d(r*3)*300)*t,vy:(120+d(r*4)*120)*t,life:0}),S=r+3e3+d(r*9)*6e3);for(let s=y.length-1;s>=0;s--){const a=y[s];if(a.x+=a.vx*x,a.y+=a.vy*x,a.life+=x,a.life>1.4){y.splice(s,1);continue}const b=Math.sin(a.life/1.4*Math.PI),T=e.createLinearGradient(a.x-a.vx*.18,a.y-a.vy*.18,a.x,a.y);T.addColorStop(0,"rgba(180,240,255,0)"),T.addColorStop(1,`rgba(220,250,255,${.9*b})`),e.strokeStyle=T,e.lineWidth=1.8*t,e.lineCap="round",e.beginPath(),e.moveTo(a.x-a.vx*.22,a.y-a.vy*.22),e.lineTo(a.x,a.y),e.stroke();const M=e.createRadialGradient(a.x,a.y,0,a.x,a.y,9*t);M.addColorStop(0,`rgba(255,255,255,${.95*b})`),M.addColorStop(.35,`rgba(150,230,255,${.4*b})`),M.addColorStop(1,"rgba(150,230,255,0)"),e.fillStyle=M,e.fillRect(a.x-9*t,a.y-9*t,18*t,18*t)}};return f=requestAnimationFrame(k),()=>{cancelAnimationFrame(f),window.removeEventListener("resize",l),c.remove()}}const U=`precision highp float;
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
}`;function D(){return H.useEffect(()=>{var k;const i=document.documentElement;if((k=window.matchMedia)!=null&&k.call(window,"(prefers-reduced-motion: reduce)").matches)return;const c=document.createElement("canvas");c.id="ppfx-space",c.setAttribute("aria-hidden","true"),document.body.appendChild(c);const e=c.getContext("webgl",{premultipliedAlpha:!0,antialias:!1,alpha:!0,powerPreference:"low-power"});if(!e){c.remove();return}const h=(r,A)=>{const x=e.createShader(r);return e.shaderSource(x,A),e.compileShader(x),x},n=e.createProgram();if(e.attachShader(n,h(e.VERTEX_SHADER,"attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}")),e.attachShader(n,h(e.FRAGMENT_SHADER,U)),e.linkProgram(n),!e.getProgramParameter(n,e.LINK_STATUS)){c.remove();return}e.useProgram(n);const t=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,t),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),e.STATIC_DRAW);const v=e.getAttribLocation(n,"a");e.enableVertexAttribArray(v),e.vertexAttribPointer(v,2,e.FLOAT,!1,0,0);const p=e.getUniformLocation(n,"R"),g=e.getUniformLocation(n,"T"),o=()=>{const r=Math.min(window.devicePixelRatio||1,1)*(window.innerWidth<700?.4:.5);c.width=Math.round(window.innerWidth*r),c.height=Math.round(window.innerHeight*r),e.viewport(0,0,c.width,c.height)};o(),window.addEventListener("resize",o);let l=0,m=0;const y=performance.now(),w=r=>{if(l=requestAnimationFrame(w),document.hidden||r-m<50||window.__ppfxScrolling)return;if(i.dataset.fx!=="full"||i.dataset.theme!=="aurora"||i.classList.contains("ppfx-clear-video")){c.style.display="none";return}c.style.display="",m=r,e.uniform2f(p,c.width,c.height),e.uniform1f(g,(r-y)/1e3),e.drawArrays(e.TRIANGLE_STRIP,0,4)};l=requestAnimationFrame(w);let S=0;const f=()=>{window.__ppfxScrolling=!0,clearTimeout(S),S=window.setTimeout(()=>{window.__ppfxScrolling=!1},180)};window.addEventListener("scroll",f,{passive:!0,capture:!0});const R=N();return()=>{cancelAnimationFrame(l),R(),window.removeEventListener("scroll",f,!0),window.removeEventListener("resize",o),c.remove()}},[]),null}export{D as OceanWaves};
