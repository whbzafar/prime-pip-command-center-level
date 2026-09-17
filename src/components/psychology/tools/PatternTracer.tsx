import React, { useState, useRef, useEffect } from 'react';
import { Compass, RotateCcw, CheckCircle2, Sparkles } from 'lucide-react';
import { calmAudio } from '../calmAudio';

interface PatternTracerProps {
  patternType?: 'INFINITY' | 'WAVE' | 'SPIRAL';
  onComplete?: () => void;
}

export const PatternTracer: React.FC<PatternTracerProps> = ({
  patternType = 'INFINITY',
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tracedProgress, setTracedProgress] = useState<number>(0);
  const [isDone, setIsDone] = useState<boolean>(false);
  const isTracing = useRef<boolean>(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    drawBackgroundPattern();
  }, [patternType]);

  const drawBackgroundPattern = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Deep calm background
    ctx.fillStyle = '#080d1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (patternType === 'INFINITY') {
      const a = 180;
      for (let t = 0; t <= Math.PI * 2; t += 0.02) {
        const scale = 2 / (3 - Math.cos(2 * t));
        const x = cx + scale * a * Math.cos(t);
        const y = cy + (scale * a * Math.sin(2 * t)) / 2;
        if (t === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    } else if (patternType === 'WAVE') {
      for (let x = 40; x <= canvas.width - 40; x += 5) {
        const y = cy + Math.sin((x - 40) * 0.02) * 60;
        if (x === 40) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    } else {
      // Spiral
      for (let t = 0; t < Math.PI * 6; t += 0.05) {
        const r = 10 + t * 9;
        const x = cx + r * Math.cos(t);
        const y = cy + r * Math.sin(t);
        if (t === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Center guide bead
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#14b8a6';
    ctx.fill();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isTracing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    lastPoint.current = {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isTracing.current || !lastPoint.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const currentY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // Draw glowing trace segment
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(currentX, currentY);
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();

    lastPoint.current = { x: currentX, y: currentY };

    if (!isDone) {
      setTracedProgress((prev) => {
        const nxt = Math.min(100, prev + 0.6);
        if (nxt >= 100) {
          setIsDone(true);
          calmAudio.playSingingBowlChime(528);
          if (onComplete) onComplete();
        }
        return nxt;
      });
    }
  };

  const handlePointerUp = () => {
    isTracing.current = false;
    lastPoint.current = null;
  };

  const handleReset = () => {
    setTracedProgress(0);
    setIsDone(false);
    drawBackgroundPattern();
  };

  return (
    <div className="bg-[#0b101e] border border-indigo-900/40 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
      <div className="flex items-center justify-between border-b border-indigo-900/30 pb-3">
        <div>
          <span className="text-[10px] font-mono-code font-bold uppercase tracking-widest text-teal-400">
            MOTOR CORTEX DOWN-REGULATION
          </span>
          <h4 className="text-sm font-military font-bold text-slate-100 tracking-wider uppercase mt-0.5">
            Tactile Pattern Tracing
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
        Trace the continuous geometric path using your finger or mouse cursor. Continuous non-linear motion releases sympathetic tension and inhibits reckless clicking impulses.
      </p>

      {/* Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-indigo-500/30 bg-[#080d1a]">
        <canvas
          ref={canvasRef}
          width={600}
          height={280}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="w-full h-[240px] sm:h-[260px] cursor-crosshair touch-none select-none"
        />

        {isDone && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h5 className="text-base font-military font-bold text-slate-100 uppercase tracking-wider">
              Pattern Rhythm Complete
            </h5>
            <p className="text-xs font-mono-code text-slate-300 mt-1 max-w-sm">
              Motor restlessness has been discharged. Your mind is calm, centered, and patient.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="mt-4 px-4 py-2 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-mono-code font-bold hover:bg-teal-500/30 transition cursor-pointer"
            >
              Trace Again
            </button>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs font-mono-code">
          <span className="text-slate-400">Tracing Continuity:</span>
          <span className="text-teal-400 font-bold">{Math.round(tracedProgress)}%</span>
        </div>
        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-indigo-900/30">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-teal-400 transition-all duration-150"
            style={{ width: `${tracedProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
