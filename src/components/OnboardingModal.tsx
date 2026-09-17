import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  X,
  ArrowRight,
  Shield,
  Layers,
  Maximize2,
  Cloud,
  Wifi,
  BarChart3,
  BookOpen,
  Calculator,
  ShieldAlert,
  Calendar,
  Zap,
  TrendingUp,
  Activity,
  Award,
  HeartPulse,
  Wrench,
  GraduationCap,
  Palette,
  Users,
  CalendarCheck,
  HardDrive,
  Cpu,
} from 'lucide-react';
import { apiCompleteOnboarding } from '../utils/authClient';
import { UserAccount } from '../types';

interface OnboardingModalProps {
  isOpen: boolean;
  user: UserAccount;
  onClose: () => void;
  onComplete: (updatedUser: UserAccount) => void;
}

interface CategoryGuide {
  num: string;
  name: string;
  icon: React.ElementType;
  desc: string;
  color: string;
}

const CATEGORIES_GUIDE: CategoryGuide[] = [
  { num: '01', name: 'Dashboard', icon: BarChart3, desc: 'Real-time performance metrics, account health, equity curve, quick HUD.', color: 'text-cyan-400' },
  { num: '02', name: 'Trade Journal', icon: BookOpen, desc: 'Institutional trade logging, PnL tracking, screenshot analysis, trade tags.', color: 'text-emerald-400' },
  { num: '03', name: 'SBT Models', icon: Layers, desc: 'Deterministic 3D vector models, source verified formations (Models 1–10).', color: 'text-teal-400' },
  { num: '04', name: 'Lot Size Calculator', icon: Calculator, desc: 'Precision risk-based position sizing, multi-currency pip value engine.', color: 'text-cyan-400' },
  { num: '05', name: 'Risk Management', icon: ShieldAlert, desc: 'Daily loss gates, max drawdown protection, discipline enforcement.', color: 'text-rose-400' },
  { num: '06', name: 'Pre-Trade Plan', icon: CheckCircle2, desc: 'Mandatory 3-phase execution protocol, session alignment, checklist gate.', color: 'text-indigo-400' },
  { num: '07', name: 'Fundamental Calendar', icon: Calendar, desc: 'High-impact macroeconomic releases, central bank events, filterable feed.', color: 'text-sky-400' },
  { num: '08', name: 'Premium Signals', icon: Zap, desc: 'Institutional trade setups, technical bias, invalidation levels, targets.', color: 'text-cyan-400' },
  { num: '09', name: 'Compounding Tools', icon: TrendingUp, desc: 'Growth trajectory simulator, milestone projection, equity targets.', color: 'text-emerald-400' },
  { num: '10', name: 'Performance Report', icon: Activity, desc: 'Win rate, profit factor, risk-reward distribution, session analytics.', color: 'text-violet-400' },
  { num: '11', name: 'Daily Development', icon: Award, desc: 'End-of-day review, mistake catalog, continuous improvement notes.', color: 'text-teal-400' },
  { num: '12', name: 'Psychological Center', icon: HeartPulse, desc: 'Emotional state audit, tilt prevention, breathing audio & calming suite.', color: 'text-pink-400' },
  { num: '13', name: 'Trading Tool Suite', icon: Wrench, desc: 'Correlation matrix, pip converters, spread tracker, institutional utilities.', color: 'text-blue-400' },
  { num: '14', name: 'Academic Research', icon: GraduationCap, desc: 'OpenAlex peer-reviewed quantitative finance and market microstructure search.', color: 'text-purple-400' },
  { num: '15', name: 'Freehand Canvas', icon: Palette, desc: 'Fullscreen multi-tool chart sketching, markup, annotations, and export.', color: 'text-cyan-400' },
  { num: '16', name: 'Trader Community Feed', icon: Users, desc: 'Institutional chatter, audio voice dispatches, encrypted messaging.', color: 'text-emerald-400' },
  { num: '17', name: 'Book a Session', icon: CalendarCheck, desc: '1-on-1 mentorship scheduling, calendar sync, strategy audit calls.', color: 'text-cyan-400' },
  { num: '18', name: 'Data Export & Backup', icon: HardDrive, desc: 'Excel, PDF, CSV, ZIP, sound configuration, and Google Drive cloud sync.', color: 'text-rose-400' },
  { num: '19', name: 'Evaluation Engine', icon: Cpu, desc: 'Autonomous multi-agent evolutionary code auditor and system optimization.', color: 'text-fuchsia-400' },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  user,
  onClose,
  onComplete,
}) => {
  if (!isOpen) return null;

  const handleFinish = async () => {
    try {
      const res = await apiCompleteOnboarding();
      if (res.ok && res.user) {
        onComplete(res.user);
      }
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
    }
    onClose();
  };

  return (
    <div
      id="onboarding-welcome-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-[#0B0F19] border border-blue-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Animated Top Accent Shimmer */}
        <div className="h-1 bg-gradient-to-r from-blue-500 via-teal-400 to-indigo-500 animate-pulse" />

        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800/80 bg-slate-950/60 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <h2 className="text-xl sm:text-2xl font-military font-bold text-slate-100 tracking-wider">
                WELCOME TO PFX COMMAND CENTER
              </h2>
            </div>
            <p className="text-xs font-mono-code text-cyan-400/90 font-semibold">
              Assalam o Alaikum, {user.name || user.username}! Your Institutional Trading Ecosystem is Ready.
            </p>
          </div>

          <button
            id="onboarding-close-btn"
            type="button"
            onClick={handleFinish}
            className="p-2 rounded-lg bg-slate-950 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer border border-slate-800"
            title="Close Welcome Overview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-300 text-xs sm:text-sm">
          {/* Mission & Purpose */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-2">
            <div className="flex items-center gap-2 text-teal-400 font-military font-bold text-sm tracking-wide">
              <Shield className="w-4 h-4" />
              <span>THE INSTITUTIONAL TRADING HEADQUARTERS</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-mono-code">
              PFX Command Center is not just a dashboard. It is a complete professional trading operating system engineered to bridge the gap between strategy theory and disciplined market execution. Every tool, model, and calculator is bound by strict institutional risk rules.
            </p>
          </div>

          {/* Core Operating Principles & Key Capabilities */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-[#070B14] border border-slate-800/80 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-cyan-400 font-military text-xs font-bold">
                <Maximize2 className="w-4 h-4" />
                <span>FULLSCREEN ANYWHERE</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal font-mono-code">
                Click the maximize icon on any card, chart, or analysis to expand it into an immersive full-screen view. Minimize at any time.
              </p>
            </div>

            <div className="bg-[#070B14] border border-slate-800/80 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-teal-400 font-military text-xs font-bold">
                <Cloud className="w-4 h-4" />
                <span>GOOGLE DRIVE SYNC</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal font-mono-code">
                In Category 18, connect your Google Drive to automatically backup journals, canvas markups, and psychology logs to your personal Drive.
              </p>
            </div>

            <div className="bg-[#070B14] border border-slate-800/80 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-cyan-400 font-military text-xs font-bold">
                <Wifi className="w-4 h-4" />
                <span>OFFLINE-SAFE RESILIENCE</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal font-mono-code">
                The platform monitors your internet connection in real-time. If your network drops, local cache protects all entries without interruption.
              </p>
            </div>
          </div>

          {/* Category Roadmap: All 20 Categories Fixed Order */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-military font-bold text-slate-200 tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>COMPLETE 20-CATEGORY TRADING SUITE</span>
              </h3>
              <span className="text-[10px] font-mono-code text-slate-500">
                Fixed Institutional Order
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CATEGORIES_GUIDE.map((cat) => {
                const IconComponent = cat.icon;
                return (
                  <div
                    key={cat.num}
                    className="bg-[#080C16] border border-slate-800/70 hover:border-slate-700 rounded-xl p-3 flex items-start gap-3 transition"
                  >
                    <div className={`p-2 rounded-lg bg-slate-950 border border-slate-800 ${cat.color} shrink-0 mt-0.5`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono-code text-slate-500 font-bold">
                          {cat.num}.
                        </span>
                        <span className="text-xs font-military font-bold text-slate-200 truncate">
                          {cat.name}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono-code text-slate-400 leading-snug">
                        {cat.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] font-mono-code text-slate-500">
            Account: <strong className="text-slate-300">{user.username}</strong> • Status: <span className="text-emerald-400 font-bold">{user.subscriptionStatus}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="onboarding-close-secondary-btn"
              type="button"
              onClick={handleFinish}
              className="px-4 py-2 rounded-xl text-xs font-mono-code text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800 transition cursor-pointer"
            >
              Close
            </button>
            <button
              id="onboarding-get-started-btn"
              type="button"
              onClick={handleFinish}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-military font-bold bg-blue-500 hover:bg-cyan-400 text-slate-950 transition cursor-pointer shadow-lg shadow-blue-500/20"
            >
              <span>ENTER COMMAND CENTER</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
