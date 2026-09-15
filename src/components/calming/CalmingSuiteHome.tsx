import React from 'react';
import {
  Volume2,
  Sliders,
  Music,
  Activity,
  Sparkles,
  Wind,
  Clock,
  Compass,
  ShieldAlert,
  CheckCircle2,
  Coffee,
  Gamepad2,
  Calendar,
  Sun,
  Eye,
  ArrowRight,
} from 'lucide-react';
import { CalmingSuiteTab } from './types';
import { SmartCalmRecommendations } from './SmartCalmRecommendations';
import { Trade } from '../../types';

interface CalmingSuiteHomeProps {
  onSelectTab: (tab: CalmingSuiteTab) => void;
  trades?: Trade[];
}

interface SuiteCardItem {
  id: CalmingSuiteTab;
  title: string;
  subtitle: string;
  tag: string;
  icon: any;
  colorTheme: string;
  badge?: string;
}

const SUITE_CARDS: SuiteCardItem[] = [
  {
    id: 'PURE_SYNTHESIS',
    title: 'Pure Synthesis Generator',
    subtitle: 'The original procedural sound generator with 432Hz, brown noise, solfeggio & presets',
    tag: 'AUDIO SYNTHESIS',
    icon: Volume2,
    colorTheme: 'teal',
    badge: 'CORE SYSTEM',
  },
  {
    id: 'AMBIENT_MIXER',
    title: 'Multi-Layer Ambient Mixer',
    subtitle: 'Craft personalized calming soundscapes with Rain, Ocean, Wind, River, Cafe & Fire',
    tag: 'MULTI-TRACK MIXER',
    icon: Sliders,
    colorTheme: 'indigo',
    badge: 'PRESETS',
  },
  {
    id: 'RELAXATION_MUSIC',
    title: 'Procedural Relaxation Music',
    subtitle: '10 non-copyrighted generative music modes: Gentle Chimes, Floating Atmosphere, Slow Pads',
    tag: 'GENERATIVE HARMONY',
    icon: Music,
    colorTheme: 'teal',
  },
  {
    id: 'BREATHING',
    title: 'Breathing & Grounding Center',
    subtitle: 'Paced visual orb with Box 4-4-4-4, Relax 4-6, Balanced 4-4, and Custom cadences',
    tag: 'PACED RESPIRATION',
    icon: Wind,
    colorTheme: 'teal',
  },
  {
    id: 'MIND_RESET',
    title: '"Mind Reset" Guided Session',
    subtitle: 'Structured 6-step interactive reset: Pause, Breathe, Listen, Relax, Reflect, Return',
    tag: 'GUIDED PROGRESSION',
    icon: Sparkles,
    colorTheme: 'amber',
  },
  {
    id: 'FOCUS_MODE',
    title: 'Minimalist Focus Sanctuary',
    subtitle: 'Distraction-free environment with 432Hz drone, timer, and chart readiness prompts',
    tag: 'ATTENTION ANCHOR',
    icon: Clock,
    colorTheme: 'teal',
  },
  {
    id: 'PRE_TRADE_RESET',
    title: 'Pre-Trade Mental Calibration',
    subtitle: '1-5 min checklist: check emotional state, dissolve urgency, enforce risk limits',
    tag: 'EXECUTION DISCIPLINE',
    icon: Compass,
    colorTheme: 'amber',
    badge: 'NON-SIGNAL',
  },
  {
    id: 'POST_LOSS_RESET',
    title: 'Post-Loss Decompression',
    subtitle: 'Neutral cooldown, guided breathing, objective reflection & revenge trade protection',
    tag: 'PROTECTION',
    icon: ShieldAlert,
    colorTheme: 'rose',
  },
  {
    id: 'POST_WIN_RESET',
    title: 'Post-Win Discipline Reset',
    subtitle: 'Neutralize euphoria, protect capital, and prevent overconfidence lot-size creep',
    tag: 'RISK CONTROL',
    icon: CheckCircle2,
    colorTheme: 'teal',
  },
  {
    id: 'FATIGUE_RESET',
    title: 'Trading Screen Fatigue Reset',
    subtitle: '5, 10, or 15 minute rest intervals with ambient audio for eye & mental rest',
    tag: 'REST INTERMISSION',
    icon: Coffee,
    colorTheme: 'indigo',
  },
  {
    id: 'CALM_GAMES',
    title: '10 Calm Mini-Games',
    subtitle: 'Low-pressure, non-gambling interactive games: Flow Path, Zen Cairn, Sound Chimes',
    tag: 'ZERO PRESSURE',
    icon: Gamepad2,
    colorTheme: 'teal',
    badge: '10 GAMES',
  },
  {
    id: 'DAILY_CHALLENGE',
    title: '7-Day Daily Calm Journey',
    subtitle: 'Gentle progressive calm intervals without streak pressure or punitive mechanics',
    tag: 'GENTLE HABIT',
    icon: Calendar,
    colorTheme: 'indigo',
  },
  {
    id: 'SOUL_REFRESH',
    title: 'Soul Refresh Mode',
    subtitle: 'Poetic atmospheric experience with slow visual gradients and deep reflective prompts',
    tag: 'ATMOSPHERE',
    icon: Sun,
    colorTheme: 'amber',
  },
  {
    id: 'DIGITAL_RELAXATION',
    title: 'Digital Screen Relaxation',
    subtitle: 'Ocular strain relief with 20-20-20 rule and rhythmic visual relaxation pulses',
    tag: 'EYE RECOVERY',
    icon: Eye,
    colorTheme: 'teal',
  },
  {
    id: 'VISUALIZER',
    title: 'Full Sound Wave Visualizer',
    subtitle: 'Real-time Web Audio API frequency analysis with multi-color oscilloscope rendering',
    tag: 'SPECTRUM SCOPE',
    icon: Activity,
    colorTheme: 'teal',
  },
];

export const CalmingSuiteHome: React.FC<CalmingSuiteHomeProps> = ({ onSelectTab, trades }) => {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Hero Banner */}
      <div className="prime-glass-card rounded-3xl p-6 sm:p-10 border border-teal-500/20 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-mono-code">
            <Sparkles className="w-3.5 h-3.5" />
            <span>PRIMEPIPFX EXECUTIVE RELAXATION & FOCUS SUITE</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-military font-bold tracking-wider text-slate-100 uppercase">
            CALMING TOOLS
          </h1>

          <p className="text-sm sm:text-base font-mono-code text-teal-300/90 font-medium">
            Reset • Relax • Refresh • Refocus
          </p>

          <p className="text-xs sm:text-sm font-mono-code text-slate-400 leading-relaxed max-w-2xl">
            A sanctuary designed for traders to temporarily step away from high-volatility charts,
            dissolve mental fatigue, center emotional discipline, and return to market analysis with composed clarity.
          </p>

          {/* Quick Launcher Action Pills */}
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            <button
              type="button"
              onClick={() => onSelectTab('PURE_SYNTHESIS')}
              className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 text-xs font-military font-bold tracking-wider uppercase hover:bg-teal-400 transition shadow-lg shadow-teal-500/20 flex items-center gap-2 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>LAUNCH PURE SYNTHESIS</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('BREATHING')}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-teal-300 text-xs font-military font-bold tracking-wider uppercase transition flex items-center gap-2 cursor-pointer"
            >
              <Wind className="w-3.5 h-3.5 text-teal-400" />
              <span>BREATHING CENTER</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('MIND_RESET')}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-300 text-xs font-military font-bold tracking-wider uppercase transition flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>6-STEP MIND RESET</span>
            </button>
          </div>
        </div>
      </div>

      {/* Smart Contextual Recommendation */}
      <SmartCalmRecommendations trades={trades} onSelectTab={onSelectTab} />

      {/* Grid of 15 Tools */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-military font-bold text-slate-300 uppercase tracking-wider">
            ALL CALMING SUITES ({SUITE_CARDS.length})
          </h2>
          <span className="text-[11px] font-mono-code text-slate-500">
            Web Audio Procedural Synthesis • Non-Medical
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {SUITE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                onClick={() => onSelectTab(card.id)}
                className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/90 hover:border-teal-500/50 hover:bg-slate-900 transition-all duration-200 cursor-pointer flex flex-col justify-between group shadow-sm hover:shadow-lg hover:shadow-teal-500/5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-teal-400 group-hover:scale-105 group-hover:text-teal-300 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    {card.badge && (
                      <span className="text-[9px] font-mono-code px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 font-bold">
                        {card.badge}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-mono-code text-slate-500 uppercase tracking-wider block">
                      {card.tag}
                    </span>
                    <h3 className="text-sm font-military font-bold text-slate-100 group-hover:text-teal-200 transition-colors mt-0.5">
                      {card.title}
                    </h3>
                    <p className="text-xs font-mono-code text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {card.subtitle}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-military font-bold text-teal-400 group-hover:text-teal-300">
                  <span>ENTER TOOL</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
