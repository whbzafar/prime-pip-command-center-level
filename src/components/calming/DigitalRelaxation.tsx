import React, { useState, useEffect } from 'react';
import { Eye, Smartphone, Zap, Waves, Volume2, Sparkles } from 'lucide-react';
import { soundEngine } from './audio/soundEngine';

export const DigitalRelaxation: React.FC = () => {
  const [hapticsSupported, setHapticsSupported] = useState(false);
  const [pulseActive, setPulseActive] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      setHapticsSupported(true);
    }
  }, []);

  const triggerHapticPulse = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([80, 100, 80]);
      } catch {}
    }
    soundEngine.playSingingBowlChime(432);
    setPulseActive(true);
    setTimeout(() => setPulseActive(false), 500);
  };

  return (
    <div className="prime-glass-card rounded-3xl p-8 sm:p-12 border border-indigo-500/20 text-center space-y-6 animate-in fade-in">
      <div className="space-y-1">
        <span className="text-xs font-mono-code px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider font-bold">
          DIGITAL SCREEN RELAXATION
        </span>
        <h3 className="text-2xl font-military font-bold text-slate-100">
          Visual & Rhythmic Ocular Decompression
        </h3>
        <p className="text-xs font-mono-code text-slate-400 max-w-md mx-auto">
          Calm rhythmic pulses designed to offset rapid candlestick visual strain
        </p>
      </div>

      <div className="py-8 flex items-center justify-center">
        <div
          onClick={triggerHapticPulse}
          className={`w-48 h-48 rounded-full border-2 flex flex-col items-center justify-center transition-all duration-300 cursor-pointer ${
            pulseActive
              ? 'scale-110 bg-indigo-500/30 border-indigo-400 shadow-2xl shadow-indigo-500/40'
              : 'scale-100 bg-slate-900/80 border-slate-800 hover:border-indigo-400/60'
          }`}
        >
          <Waves className="w-10 h-10 text-indigo-400 mb-2 animate-pulse" />
          <span className="text-xs font-military font-bold text-slate-200">
            TAP FOR RHYTHMIC PULSE
          </span>
          <span className="text-[10px] font-mono-code text-slate-500 mt-0.5">
            {hapticsSupported ? 'Haptic Vibrate + Audio' : 'Audio Resonance'}
          </span>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono-code text-slate-400 max-w-md mx-auto">
        Rule 20-20-20: Every 20 minutes spent looking at trading screens, look at an object 20 feet away for 20 seconds.
      </div>
    </div>
  );
};
