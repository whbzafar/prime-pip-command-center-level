import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, RotateCcw, CheckCircle2, Eye, ShieldCheck, Heart } from 'lucide-react';
import { calmAudio } from '../calmAudio';

interface SlowFocusGameProps {
  durationSeconds?: number;
  onComplete?: () => void;
}

export const SlowFocusGame: React.FC<SlowFocusGameProps> = ({
  durationSeconds = 40,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [coherence, setCoherence] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isUserTracking, setIsUserTracking] = useState<boolean>(false);
  const [elapsed, setElapsed] = useState<number>(0);

  // Position state
  const orbPos = useRef<{ x: number; y: number }>({ x: 150, y: 150 });
  const userPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const velocity = useRef<{ dx: number; dy: number }>({ dx: 0.8, dy: 0.6 });
  const trailRef = useRef<{ x: number; y: number; alpha: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let t = 0;

    const width = canvas.width;
    const height = canvas.height;

    orbPos.current = { x: width / 2, y: height / 2 };

    const render = () => {
      t += 0.015;

      // Lissajous calm drift
      const cx = width / 2;
      const cy = height / 2;
      const rx = width * 0.38;
      const ry = height * 0.35;

      orbPos.current.x = cx + rx * Math.sin(t * 0.7) * Math.cos(t * 0.3);
      orbPos.current.y = cy + ry * Math.cos(t * 0.5);

      // Trail
      trailRef.current.push({ x: orbPos.current.x, y: orbPos.current.y, alpha: 0.5 });
      if (trailRef.current.length > 25) {
        trailRef.current.shift();
      }

      // Check distance to user
      const dist = Math.hypot(orbPos.current.x - userPos.current.x, orbPos.current.y - userPos.current.y);
      const isClose = dist < 55;
      setIsUserTracking(isClose);

      if (isClose && !isCompleted) {
        setCoherence((prev) => {
          const nxt = Math.min(100, prev + 0.35);
          if (nxt >= 100) {
            setIsCompleted(true);
            calmAudio.playSingingBowlChime(528);
            if (onComplete) onComplete();
          }
          return nxt;
        });
      }

      // Draw background
      ctx.fillStyle = 'rgba(11, 16, 30, 0.35)';
      ctx.fillRect(0, 0, width, height);

      // Draw trails
      trailRef.current.forEach((pt, i) => {
        const factor = (i + 1) / trailRef.current.length;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 14 * factor, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99, 102, 241, ${0.15 * factor})`;
        ctx.fill();
      });

      // Target Halo Ring
      ctx.beginPath();
      ctx.arc(orbPos.current.x, orbPos.current.y, 42, 0, Math.PI * 2);
      ctx.strokeStyle = isClose ? 'rgba(45, 212, 191, 0.8)' : 'rgba(99, 102, 241, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Central Luminous Orb
      const gradient = ctx.createRadialGradient(
        orbPos.current.x,
        orbPos.current.y,
        0,
        orbPos.current.x,
        orbPos.current.y,
        22
      );
      if (isClose) {
        gradient.addColorStop(0, '#5eead4');
        gradient.addColorStop(0.5, '#0d9488');
        gradient.addColorStop(1, 'rgba(13, 148, 136, 0)');
      } else {
        gradient.addColorStop(0, '#a5b4fc');
        gradient.addColorStop(0.5, '#6366f1');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
      }

      ctx.beginPath();
      ctx.arc(orbPos.current.x, orbPos.current.y, 22, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Small bright core
      ctx.beginPath();
      ctx.arc(orbPos.current.x, orbPos.current.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      animFrame = requestAnimationFrame(render);
    };

    animFrame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [isCompleted, onComplete]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    userPos.current = {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handleReset = () => {
    setCoherence(0);
    setIsCompleted(false);
  };

  return (
    <div className="bg-[#0b101e] border border-indigo-900/40 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
      <div className="flex items-center justify-between border-b border-indigo-900/30 pb-3">
        <div>
          <span className="text-[10px] font-mono-code font-bold uppercase tracking-widest text-teal-400">
            ALPHA-WAVE NEURO-CALMING
          </span>
          <h4 className="text-sm font-military font-bold text-slate-100 tracking-wider uppercase mt-0.5">
            Slow Focus Stabilization
          </h4>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-xs text-slate-400 font-sans">
        Rest your finger or mouse cursor gently inside the moving teal circle. Smooth continuous visual tracking silences frantic internal dialogue and restores calm nervous system coherence.
      </p>

      {/* Canvas Tracking Field */}
      <div className="relative rounded-2xl overflow-hidden border border-indigo-500/30 bg-[#060913] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={600}
          height={320}
          onPointerMove={handlePointerMove}
          className="w-full h-[260px] sm:h-[300px] cursor-crosshair touch-none"
        />

        {/* Live Tracking Indicator Overlay */}
        <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-950/80 border border-indigo-500/30 text-[10px] font-mono-code flex items-center gap-2 pointer-events-none">
          <span
            className={`w-2 h-2 rounded-full ${
              isUserTracking ? 'bg-teal-400 animate-ping' : 'bg-slate-600'
            }`}
          />
          <span className={isUserTracking ? 'text-teal-300 font-bold' : 'text-slate-500'}>
            {isUserTracking ? 'Coherent Focus Active' : 'Hover Cursor Over Target'}
          </span>
        </div>

        {/* Completion Banner */}
        {isCompleted && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h5 className="text-base font-military font-bold text-slate-100 uppercase tracking-wider">
              Nervous System Stabilized
            </h5>
            <p className="text-xs font-mono-code text-slate-300 mt-1 max-w-sm">
              Your alpha-rhythm coherence is balanced. Executive prefrontal focus is restored for objective risk management.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="mt-4 px-4 py-2 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-mono-code font-bold hover:bg-teal-500/30 transition cursor-pointer"
            >
              Practice Again
            </button>
          </div>
        )}
      </div>

      {/* Coherence Progress Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs font-mono-code">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-rose-400" />
            <span>Nervous System Coherence</span>
          </span>
          <span className="text-teal-400 font-bold">{Math.round(coherence)}%</span>
        </div>
        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-indigo-900/30">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-teal-400 to-emerald-400 transition-all duration-150"
            style={{ width: `${coherence}%` }}
          />
        </div>
      </div>
    </div>
  );
};
