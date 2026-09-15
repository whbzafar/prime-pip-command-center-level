import React, { useEffect, useRef, useState } from 'react';
import { soundEngine } from './audio/soundEngine';
import { Sparkles, Waves, Activity, Radio, Eye } from 'lucide-react';

interface SoundWaveVisualizerProps {
  mode?: 'ALL' | 'WAVEFORM' | 'SPECTRUM' | 'ORB_PULSE' | 'PARTICLES';
  height?: number;
  className?: string;
  showControls?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  alpha: number;
  hue: number;
}

export const SoundWaveVisualizer: React.FC<SoundWaveVisualizerProps> = ({
  mode: initialMode = 'ALL',
  height = 180,
  className = '',
  showControls = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visualMode, setVisualMode] = useState<'ALL' | 'WAVEFORM' | 'SPECTRUM' | 'ORB_PULSE' | 'PARTICLES'>(initialMode);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check reduced motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const isMobile = window.innerWidth < 768;
    const particleCount = prefersReducedMotion ? 0 : isMobile ? 24 : 56;
    const particles: Particle[] = [];

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * (canvas.width || 400),
        y: Math.random() * (canvas.height || height),
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 2 + 1,
        baseRadius: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.2,
        hue: Math.random() > 0.6 ? 175 : 220, // Teal or Indigo
      });
    }

    // Set canvas dimensions
    const resizeCanvas = () => {
      if (!canvas || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    if (containerRef.current) ro.observe(containerRef.current);

    let idlePhase = 0;

    const render = () => {
      animId = requestAnimationFrame(render);
      if (!canvas) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.clearRect(0, 0, width, h);

      // Connect to real Web Audio AnalyserNode
      const analyser = soundEngine.getAnalyser();
      let hasRealAudio = false;
      let energy = 0;
      let bufferLength = 256;
      const timeData = new Uint8Array(bufferLength);
      const freqData = new Uint8Array(bufferLength);

      if (analyser) {
        analyser.getByteTimeDomainData(timeData);
        analyser.getByteFrequencyData(freqData);

        // Check if there is audible signal
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          const val = (timeData[i] - 128) / 128;
          sum += val * val;
        }
        const rms = Math.sqrt(sum / bufferLength);
        energy = rms * 2.5;
        hasRealAudio = rms > 0.015;
      }

      setIsPlayingAudio(hasRealAudio);
      idlePhase += 0.02;

      // Draw subtle ambient glow in center
      const pulseRadius = hasRealAudio ? 40 + energy * 80 : 30 + Math.sin(idlePhase) * 6;
      const glowGrad = ctx.createRadialGradient(
        width / 2,
        h / 2,
        0,
        width / 2,
        h / 2,
        Math.max(50, pulseRadius * 2.5)
      );
      glowGrad.addColorStop(0, hasRealAudio ? 'rgba(45, 212, 191, 0.18)' : 'rgba(99, 102, 241, 0.08)');
      glowGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, h);

      // 1. Flowing Particles
      if (visualMode === 'ALL' || visualMode === 'PARTICLES') {
        particles.forEach((p) => {
          p.x += p.vx * (hasRealAudio ? 1 + energy * 2 : 1);
          p.y += p.vy * (hasRealAudio ? 1 + energy * 2 : 1);

          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = h;
          if (p.y > h) p.y = 0;

          const currentRadius = p.baseRadius * (hasRealAudio ? 1 + energy * 3 : 1);
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${p.alpha * (hasRealAudio ? 1.4 : 0.8)})`;
          ctx.fill();
        });
      }

      // 2. Frequency Spectrum Curves / Bars
      if (visualMode === 'ALL' || visualMode === 'SPECTRUM') {
        const barCount = isMobile ? 32 : 64;
        const barWidth = width / barCount;
        ctx.save();
        for (let i = 0; i < barCount; i++) {
          const freqVal = hasRealAudio ? freqData[i % freqData.length] / 255 : (Math.sin(idlePhase + i * 0.15) + 1) * 0.12;
          const barHeight = Math.max(3, freqVal * (h * 0.7));
          const x = i * barWidth;
          const y = h - barHeight;

          const grad = ctx.createLinearGradient(0, y, 0, h);
          grad.addColorStop(0, 'rgba(45, 212, 191, 0.6)');
          grad.addColorStop(1, 'rgba(99, 102, 241, 0.15)');
          ctx.fillStyle = grad;
          ctx.fillRect(x + 1, y, Math.max(1, barWidth - 2), barHeight);
        }
        ctx.restore();
      }

      // 3. Oscilloscope Waveform
      if (visualMode === 'ALL' || visualMode === 'WAVEFORM') {
        ctx.save();
        ctx.beginPath();
        ctx.lineWidth = hasRealAudio ? 2.5 : 1.5;
        const strokeGrad = ctx.createLinearGradient(0, 0, width, 0);
        strokeGrad.addColorStop(0, 'rgba(45, 212, 191, 0.2)');
        strokeGrad.addColorStop(0.5, hasRealAudio ? '#2dd4bf' : '#818cf8');
        strokeGrad.addColorStop(1, 'rgba(99, 102, 241, 0.2)');
        ctx.strokeStyle = strokeGrad;

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          let v = hasRealAudio
            ? timeData[i] / 128.0
            : 1.0 + Math.sin(idlePhase * 2 + i * 0.06) * 0.08;
          let y = (v * h) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.stroke();
        ctx.restore();
      }

      // 4. Circular Pulse Orb
      if (visualMode === 'ALL' || visualMode === 'ORB_PULSE') {
        ctx.save();
        const centerX = width / 2;
        const centerY = h / 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = hasRealAudio ? 'rgba(45, 212, 191, 0.6)' : 'rgba(129, 140, 248, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner glowing core
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseRadius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = hasRealAudio ? 'rgba(45, 212, 191, 0.2)' : 'rgba(99, 102, 241, 0.12)';
        ctx.fill();
        ctx.restore();
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [visualMode, height, prefersReducedMotion]);

  return (
    <div ref={containerRef} className={`relative rounded-2xl overflow-hidden bg-slate-950/80 border border-indigo-500/20 shadow-inner ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: `${height}px`, display: 'block' }}
      />

      {/* Top Overlay Badge */}
      <div className="absolute top-2.5 left-3 flex items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-800 text-[10px] font-mono-code">
          <span className={`w-1.5 h-1.5 rounded-full ${isPlayingAudio ? 'bg-teal-400 animate-ping' : 'bg-slate-500'}`} />
          <span className={isPlayingAudio ? 'text-teal-300 font-bold' : 'text-slate-400'}>
            {isPlayingAudio ? 'LIVE WEB AUDIO HARMONICS' : 'AMBIENT REST STATE'}
          </span>
        </div>
      </div>

      {/* View Mode Switcher */}
      {showControls && (
        <div className="absolute top-2.5 right-3 flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800 backdrop-blur-sm">
          {[
            { id: 'ALL', label: 'All', icon: Sparkles },
            { id: 'WAVEFORM', label: 'Wave', icon: Waves },
            { id: 'SPECTRUM', label: 'Spectrum', icon: Activity },
            { id: 'ORB_PULSE', label: 'Pulse', icon: Radio },
            { id: 'PARTICLES', label: 'Dust', icon: Eye },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = visualMode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setVisualMode(item.id as any)}
                className={`px-2 py-1 rounded text-[10px] font-military font-bold transition flex items-center gap-1 cursor-pointer ${
                  isActive
                    ? 'bg-teal-500/25 text-teal-300 border border-teal-400/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={`View ${item.label}`}
              >
                <Icon className="w-3 h-3" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
