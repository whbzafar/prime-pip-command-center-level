import React from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  Globe2,
  Calendar,
  Brain,
  Layers,
  BookOpen,
  Activity,
  Calculator,
  ShieldAlert,
  Radio,
  Award,
  Wind,
  Compass,
  PenTool,
  Users,
  MessageSquare,
  Settings2,
  ShieldCheck,
  Cpu,
  Coins,
  DollarSign,
  Flame,
} from 'lucide-react';

export type CategoryLogoType =
  | 'FUNDAMENTAL_CALENDAR'
  | 'PSYCHOLOGY'
  | 'DASHBOARD'
  | 'JOURNAL'
  | 'SBT_MODELS'
  | 'LOT_SIZE'
  | 'RISK'
  | 'PRE_TRADE_PLAN'
  | 'SIGNALS'
  | 'COMPOUNDING'
  | 'PERFORMANCE'
  | 'DAILY_DEV'
  | 'CALMING_TOOLS'
  | 'RESEARCH'
  | 'FREEHAND_WORKSPACE'
  | 'COMMUNITY'
  | 'BOOK_SESSION'
  | 'SETTINGS'
  | 'ADMIN'
  | 'EVOLUTION'
  | 'GOLD_COMMODITY'
  | 'SILVER_COMMODITY';

interface CategoryAnimatedLogoProps {
  type: CategoryLogoType;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  className?: string;
  animate?: boolean;
}

const LOGO_CONFIGS: Record<
  CategoryLogoType,
  {
    icon: React.ElementType;
    gradient: string;
    borderGlow: string;
    accentColor: string;
    ringColor: string;
    name: string;
    sub: string;
  }
> = {
  FUNDAMENTAL_CALENDAR: {
    icon: Calendar,
    gradient: 'from-sky-500 via-blue-400 to-indigo-500',
    borderGlow: 'shadow-sky-500/30',
    accentColor: 'text-sky-400',
    ringColor: 'border-sky-400/40',
    name: 'LIVE NEWS WIRE',
    sub: 'INSTITUTIONAL RELEASES',
  },
  PSYCHOLOGY: {
    icon: Brain,
    gradient: 'from-rose-500 via-pink-400 to-violet-500',
    borderGlow: 'shadow-rose-500/30',
    accentColor: 'text-rose-400',
    ringColor: 'border-rose-400/40',
    name: 'PSYCHOLOGICAL CENTER',
    sub: '17 EMOTIONAL VECTORS',
  },
  DASHBOARD: {
    icon: Activity,
    gradient: 'from-emerald-500 via-teal-400 to-cyan-400',
    borderGlow: 'shadow-emerald-500/30',
    accentColor: 'text-emerald-400',
    ringColor: 'border-emerald-400/40',
    name: 'COMMAND HUD',
    sub: 'PERFORMANCE CORE',
  },
  JOURNAL: {
    icon: BookOpen,
    gradient: 'from-teal-500 via-emerald-400 to-lime-400',
    borderGlow: 'shadow-teal-500/30',
    accentColor: 'text-teal-400',
    ringColor: 'border-teal-400/40',
    name: 'TRADE LEDGER',
    sub: 'AUDIT & FORENSICS',
  },
  SBT_MODELS: {
    icon: Layers,
    gradient: 'from-cyan-400 via-orange-500 to-red-500',
    borderGlow: 'shadow-orange-500/30',
    accentColor: 'text-cyan-400',
    ringColor: 'border-orange-400/40',
    name: 'SBT VECTOR ENGINE',
    sub: 'MODELS 1–10 VERIFIED',
  },
  LOT_SIZE: {
    icon: Calculator,
    gradient: 'from-cyan-500 via-sky-400 to-blue-500',
    borderGlow: 'shadow-cyan-500/30',
    accentColor: 'text-cyan-400',
    ringColor: 'border-cyan-400/40',
    name: 'POSITION MATRIX',
    sub: 'PRECISION RISK SIZING',
  },
  RISK: {
    icon: ShieldAlert,
    gradient: 'from-red-500 via-rose-500 to-blue-500',
    borderGlow: 'shadow-red-500/30',
    accentColor: 'text-red-400',
    ringColor: 'border-red-400/40',
    name: 'CAPITAL DEFENSE',
    sub: 'HARD LOSS GATES',
  },
  PRE_TRADE_PLAN: {
    icon: Flame,
    gradient: 'from-indigo-500 via-purple-400 to-pink-500',
    borderGlow: 'shadow-indigo-500/30',
    accentColor: 'text-indigo-400',
    ringColor: 'border-indigo-400/40',
    name: 'EXECUTION GATEWAY',
    sub: '3-PHASE AUDIT',
  },
  SIGNALS: {
    icon: Radio,
    gradient: 'from-blue-500 via-yellow-400 to-rose-400',
    borderGlow: 'shadow-blue-500/30',
    accentColor: 'text-cyan-400',
    ringColor: 'border-cyan-400/40',
    name: 'RADAR DISPATCH',
    sub: 'HIGH PROBABILITY BIAS',
  },
  COMPOUNDING: {
    icon: TrendingUp,
    gradient: 'from-emerald-400 via-teal-400 to-cyan-500',
    borderGlow: 'shadow-emerald-500/30',
    accentColor: 'text-emerald-400',
    ringColor: 'border-emerald-400/40',
    name: 'EQUITY MULTIPLIER',
    sub: 'EXPONENTIAL GROWTH',
  },
  PERFORMANCE: {
    icon: Activity,
    gradient: 'from-violet-500 via-indigo-400 to-blue-500',
    borderGlow: 'shadow-violet-500/30',
    accentColor: 'text-violet-400',
    ringColor: 'border-violet-400/40',
    name: 'ANALYTICAL VAULT',
    sub: 'STATISTICAL METRICS',
  },
  DAILY_DEV: {
    icon: Award,
    gradient: 'from-teal-400 via-cyan-400 to-sky-500',
    borderGlow: 'shadow-teal-500/30',
    accentColor: 'text-teal-400',
    ringColor: 'border-teal-400/40',
    name: 'MASTERY JOURNAL',
    sub: 'DAILY REFINEMENT',
  },
  CALMING_TOOLS: {
    icon: Wind,
    gradient: 'from-teal-400 via-emerald-400 to-sky-400',
    borderGlow: 'shadow-teal-400/30',
    accentColor: 'text-teal-300',
    ringColor: 'border-teal-400/40',
    name: 'CALMING SUITE',
    sub: 'RESET & REGULATION',
  },
  RESEARCH: {
    icon: Compass,
    gradient: 'from-sky-400 via-indigo-400 to-purple-500',
    borderGlow: 'shadow-sky-400/30',
    accentColor: 'text-sky-300',
    ringColor: 'border-sky-400/40',
    name: 'SCHOLARLY CODEX',
    sub: 'EMPIRICAL RESEARCH',
  },
  FREEHAND_WORKSPACE: {
    icon: PenTool,
    gradient: 'from-fuchsia-500 via-pink-400 to-rose-400',
    borderGlow: 'shadow-fuchsia-500/30',
    accentColor: 'text-fuchsia-400',
    ringColor: 'border-fuchsia-400/40',
    name: 'VECTOR CANVAS',
    sub: 'FREEHAND MAPPING',
  },
  COMMUNITY: {
    icon: Users,
    gradient: 'from-blue-500 via-indigo-400 to-violet-500',
    borderGlow: 'shadow-blue-500/30',
    accentColor: 'text-blue-400',
    ringColor: 'border-blue-400/40',
    name: 'TRADER NETWORK',
    sub: 'SYNCED INTEL FEED',
  },
  BOOK_SESSION: {
    icon: MessageSquare,
    gradient: 'from-cyan-400 via-orange-400 to-yellow-500',
    borderGlow: 'shadow-blue-500/30',
    accentColor: 'text-cyan-400',
    ringColor: 'border-cyan-400/40',
    name: 'MENTOR AUDIT',
    sub: '1-ON-1 CLINICAL REVIEW',
  },
  SETTINGS: {
    icon: Settings2,
    gradient: 'from-slate-400 via-zinc-400 to-slate-500',
    borderGlow: 'shadow-slate-500/30',
    accentColor: 'text-slate-300',
    ringColor: 'border-slate-500/40',
    name: 'SYSTEM VAULT',
    sub: 'DRIVE & EXPORTS',
  },
  ADMIN: {
    icon: ShieldCheck,
    gradient: 'from-blue-500 via-rose-500 to-purple-600',
    borderGlow: 'shadow-blue-500/40',
    accentColor: 'text-amber-300',
    ringColor: 'border-blue-500/40',
    name: 'HEADQUARTERS',
    sub: 'OWNER GOVERNANCE',
  },
  EVOLUTION: {
    icon: Cpu,
    gradient: 'from-cyan-400 via-teal-300 to-emerald-400',
    borderGlow: 'shadow-cyan-400/30',
    accentColor: 'text-cyan-300',
    ringColor: 'border-cyan-400/40',
    name: 'COGNITIVE ENGINE',
    sub: 'HEURISTIC FEEDBACK',
  },
  GOLD_COMMODITY: {
    icon: Coins,
    gradient: 'from-amber-300 via-yellow-500 to-amber-600',
    borderGlow: 'shadow-cyan-400/40',
    accentColor: 'text-yellow-300',
    ringColor: 'border-cyan-400/50',
    name: 'GOLD (XAU/USD)',
    sub: 'SOVEREIGN BULLION',
  },
  SILVER_COMMODITY: {
    icon: DollarSign,
    gradient: 'from-slate-200 via-zinc-400 to-slate-300',
    borderGlow: 'shadow-slate-300/40',
    accentColor: 'text-slate-200',
    ringColor: 'border-slate-300/50',
    name: 'SILVER (XAG/USD)',
    sub: 'ELECTRIFICATION METAL',
  },
};

export const CategoryAnimatedLogo: React.FC<CategoryAnimatedLogoProps> = ({
  type,
  size = 'md',
  showBadge = true,
  className = '',
  animate = true,
}) => {
  const config = LOGO_CONFIGS[type] || LOGO_CONFIGS.FUNDAMENTAL_CALENDAR;
  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
    xl: 'w-10 h-10',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center shrink-0">
        {/* Outer Rotating Particle Ring */}
        {animate && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
            className={`absolute -inset-1.5 rounded-2xl border border-dashed ${config.ringColor} opacity-70 pointer-events-none`}
          />
        )}

        {/* Pulsing Ambient Glow */}
        {animate && (
          <motion.div
            animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0.65, 0.35] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            className={`absolute inset-0 rounded-xl bg-gradient-to-tr ${config.gradient} blur-md opacity-40`}
          />
        )}

        {/* Core Container */}
        <div
          className={`relative ${sizeClasses[size]} rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shadow-lg ${config.borderGlow} overflow-hidden group`}
        >
          {/* Subtle Dynamic Scanline */}
          {animate && (
            <motion.div
              animate={{ y: ['-100%', '200%'] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-x-0 h-1/2 bg-gradient-to-b from-transparent via-white/10 to-transparent pointer-events-none"
            />
          )}

          {/* Center Graphic */}
          <div className={`relative z-10 ${config.accentColor}`}>
            <IconComponent className={iconSizes[size]} />
          </div>
        </div>
      </div>

      {showBadge && (
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-military font-bold text-slate-100 tracking-wider truncate">
            {config.name}
          </span>
          <span className="text-[10px] font-mono-code text-slate-400 tracking-tight truncate">
            {config.sub}
          </span>
        </div>
      )}
    </div>
  );
};
