import React, { useState, useEffect } from 'react';
import { Sparkles, Sun, Moon, Compass, Heart, Wind, Volume2, ArrowRight } from 'lucide-react';
import { soundEngine } from './audio/soundEngine';

const REFLECTIVE_PROMPTS = [
  'What deserves your focused attention right now?',
  'What can wait until tomorrow without any consequence?',
  'Notice the air in your room. Feel the steady support beneath your feet.',
  'Release the need to catch every single move in the market.',
  'Your peace of mind is your highest compounding asset.',
];

export const SoulRefreshExperience: React.FC = () => {
  const [promptIdx, setPromptIdx] = useState(0);
  const [isPlayingSound, setIsPlayingSound] = useState(false);

  useEffect(() => {
    soundEngine.startLayer('OCEAN');
    soundEngine.startLayer('LOW_TONE');
    setIsPlayingSound(true);

    const interval = setInterval(() => {
      setPromptIdx((prev) => (prev + 1) % REFLECTIVE_PROMPTS.length);
    }, 9000);

    return () => {
      clearInterval(interval);
      soundEngine.stopLayer('OCEAN');
      soundEngine.stopLayer('LOW_TONE');
    };
  }, []);

  return (
    <div className="prime-glass-card rounded-3xl p-8 sm:p-14 border border-teal-500/20 text-center space-y-8 relative overflow-hidden animate-in fade-in">
      <div className="space-y-2">
        <span className="text-xs font-mono-code px-3 py-1 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 uppercase tracking-wider font-bold">
          SOUL REFRESH MODE
        </span>
        <h2 className="text-2xl sm:text-3xl font-military font-bold text-slate-100">
          Reflective Stillness & Clarity
        </h2>
      </div>

      {/* Floating Atmosphere Orb */}
      <div className="py-8 flex items-center justify-center relative">
        <div className="w-56 h-56 rounded-full bg-gradient-to-tr from-teal-500/30 via-indigo-500/20 to-blue-500/20 border border-teal-400/30 blur-sm animate-pulse" />
        <div className="absolute w-40 h-40 rounded-full bg-slate-950/90 border border-slate-800 flex items-center justify-center p-4">
          <Sparkles className="w-10 h-10 text-teal-300 animate-spin" style={{ animationDuration: '24s' }} />
        </div>
      </div>

      {/* Poetic Reflective Prompt */}
      <div className="max-w-md mx-auto min-h-[70px] flex items-center justify-center">
        <p className="text-base sm:text-lg font-mono-code text-teal-200 italic transition-all duration-700">
          "{REFLECTIVE_PROMPTS[promptIdx]}"
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => setPromptIdx((prev) => (prev + 1) % REFLECTIVE_PROMPTS.length)}
          className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-military font-bold text-slate-300 hover:text-teal-300 flex items-center gap-2"
        >
          <span>NEXT REFLECTION</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
