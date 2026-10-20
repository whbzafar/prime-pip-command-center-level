import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Bot,
  Sparkles,
  Zap,
  Shield,
  Clock,
  CheckCircle2,
  TrendingUp,
  Cpu,
  Layers,
  Award,
  ChevronRight,
  Flame,
  ArrowRight,
  Activity,
  Terminal,
  X,
  Share2,
  Calendar,
  Lock,
  Globe,
  Radio,
  Sliders,
  DollarSign,
  Check,
  Download,
  MessageCircle,
} from 'lucide-react';

interface SbtBotShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExploreModels?: () => void;
}

export const SbtBotShowcaseModal: React.FC<SbtBotShowcaseModalProps> = ({
  isOpen,
  onClose,
  onExploreModels,
}) => {
  // Target: New Year 2027 (Jan 1, 2027 00:00:00 UTC)
  const targetDate = new Date('2027-01-01T00:00:00Z').getTime();

  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'MODELS' | 'SPECS' | 'SIMULATOR'>('OVERVIEW');
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistName, setWaitlistName] = useState('');
  const [selectedBroker, setSelectedBroker] = useState('MetaTrader 5 (MT5)');
  const [isReserved, setIsReserved] = useState(false);
  const [vipNumber, setVipNumber] = useState<number | null>(null);

  // Live simulation state
  const [simStep, setSimStep] = useState<number>(0);
  const [isSimRunning, setIsSimRunning] = useState<boolean>(false);

  useEffect(() => {
    // Check if user already reserved
    try {
      const saved = localStorage.getItem('primepipfx_sbt_bot_vip_reservation');
      if (saved) {
        const parsed = JSON.parse(saved);
        setIsReserved(true);
        setVipNumber(parsed.vipNumber || 47);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const diff = Math.max(0, targetDate - now);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#f59e0b', '#00f0ff', '#10b981', '#fbbf24', '#38bdf8', '#a855f7'],
      });
    } catch {}
  };

  const handleJoinWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail.trim()) return;

    const assignedNumber = Math.floor(Math.random() * 20) + 38; // e.g. VIP #47
    setVipNumber(assignedNumber);
    setIsReserved(true);
    triggerCelebration();

    try {
      localStorage.setItem(
        'primepipfx_sbt_bot_vip_reservation',
        JSON.stringify({
          email: waitlistEmail.trim(),
          name: waitlistName.trim() || 'Institutional Trader',
          broker: selectedBroker,
          vipNumber: assignedNumber,
          reservedAt: new Date().toISOString(),
        })
      );
    } catch {}
  };

  const runSimulation = () => {
    if (isSimRunning) return;
    setIsSimRunning(true);
    setSimStep(1);

    setTimeout(() => setSimStep(2), 1200);
    setTimeout(() => setSimStep(3), 2600);
    setTimeout(() => setSimStep(4), 4000);
    setTimeout(() => {
      setSimStep(5);
      setIsSimRunning(false);
      triggerCelebration();
    }, 5500);
  };

  const SBT_10_MODELS = [
    { num: 1, name: 'Area 2 Structure', concept: 'Market structure break + high timeframe confluence', edge: 'High win rate on London open' },
    { num: 2, name: 'Mitigation Block', concept: 'Unmitigated institutional block mitigation', edge: 'Ultra-tight stop losses (1:4+ RR)' },
    { num: 3, name: 'Fair Value Gap (FVG)', concept: 'Algorithmic imbalance rebalancing', edge: 'Dynamic re-entry on liquidity pullbacks' },
    { num: 4, name: 'Order Block Sweep', concept: 'Institutional volume cluster sweeps', edge: 'High momentum continuation' },
    { num: 5, name: 'MCOB Level 1', concept: 'Multi-candle order block consolidation break', edge: 'Explosive trend expansions' },
    { num: 6, name: 'HTF Reversal Model', concept: 'Daily/Weekly HTF context with H1 execution', edge: 'Major macro reversal capture' },
    { num: 7, name: 'Liquidity Engineering', concept: 'Engineering retail trendline liquidity sweeps', edge: 'High-conviction trap entries' },
    { num: 8, name: 'BOS Inducement', concept: 'Break of structure fakeout mitigation', edge: 'Filters 90% of retail false breakouts' },
    { num: 9, name: 'Turtle Soup Sweep', concept: '20-day high/low false breakout sweep', edge: 'Precision reversal scalps on Gold & FX' },
    { num: 10, name: 'Close Back Confirmation', concept: 'Candle close inside key structural range', edge: 'Guaranteed closing momentum confirmation' },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-3 sm:p-5 overflow-y-auto selection:bg-amber-500/30 selection:text-amber-200">
      {/* Background ambient light effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-gradient-to-b from-amber-500/15 via-cyan-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-950/95 border border-amber-500/40 shadow-2xl shadow-amber-950/40 backdrop-blur-2xl overflow-hidden font-mono-code"
      >
        {/* Iridescent Top Glow Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-amber-400 to-yellow-300" />

        {/* Minimize & Close Buttons */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-30">
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1.5 text-slate-300 hover:text-white rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 cursor-pointer transition flex items-center gap-1 text-[11px] font-bold shadow-sm"
            title="Minimize window to proceed with creating your account or logging in"
          >
            <span>🗕 Minimize</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Header Hero Section */}
        <div className="relative px-6 pt-7 pb-5 border-b border-slate-800/80 bg-gradient-to-b from-slate-900/60 via-slate-950 to-slate-950">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pr-28">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider shadow-sm shadow-amber-500/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>SBT BOT COMING SOON – LAUNCHING AROUND THE HAPPY NEW YEAR</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30 font-bold uppercase">
                85% ACCURACY
              </span>
              <span className="text-[10px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 font-bold uppercase">
                WORLD'S #1 RANKED
              </span>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-cyan-500/20 border-2 border-amber-400/50 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
              <Bot className="w-8 h-8 sm:w-9 sm:h-9 text-amber-300" />
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-military font-bold tracking-wider text-white uppercase flex items-center gap-2 flex-wrap">
                <span>PRIMEPIPFX SBT BOT</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-200">
                  COMING SOON
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                Automated trading with an <strong>85% accuracy rate</strong>. Handles full market structure analysis, identifies trends, determines the appropriate SBT model and timeframes, and collects all market data for you. <em>God willing (Inshallah), it will be an excellent tool for every trader!</em> Launching around the HAPPY New Year.
              </p>
            </div>
          </div>

          {/* New Year 2027 Live Countdown Timer */}
          <div className="mt-5 p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-amber-500/30 flex flex-wrap items-center justify-between gap-4 shadow-inner">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-bold">
                  LAUNCH COUNTDOWN TO NEW YEAR 2027
                </span>
                <span className="text-[10px] text-amber-400 font-semibold">
                  January 1, 2027 • 00:00:00 UTC
                </span>
              </div>
            </div>

            {/* Countdown Blocks */}
            <div className="flex items-center gap-2 sm:gap-3 text-center">
              <div className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-amber-500/40 min-w-[54px] shadow-sm">
                <span className="text-lg sm:text-xl font-bold font-military text-amber-300 block leading-tight">
                  {timeLeft.days}
                </span>
                <span className="text-[9px] text-slate-400 uppercase tracking-widest">DAYS</span>
              </div>
              <span className="text-amber-400 font-bold">:</span>
              <div className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-amber-500/40 min-w-[54px] shadow-sm">
                <span className="text-lg sm:text-xl font-bold font-military text-amber-300 block leading-tight">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span className="text-[9px] text-slate-400 uppercase tracking-widest">HOURS</span>
              </div>
              <span className="text-amber-400 font-bold">:</span>
              <div className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-amber-500/40 min-w-[54px] shadow-sm">
                <span className="text-lg sm:text-xl font-bold font-military text-amber-300 block leading-tight">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span className="text-[9px] text-slate-400 uppercase tracking-widest">MINS</span>
              </div>
              <span className="text-amber-400 font-bold">:</span>
              <div className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-amber-500/40 min-w-[54px] shadow-sm">
                <span className="text-lg sm:text-xl font-bold font-military text-cyan-300 block leading-tight">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
                <span className="text-[9px] text-slate-400 uppercase tracking-widest">SECS</span>
              </div>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('OVERVIEW')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'OVERVIEW'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>OVERVIEW & KEY PILLARS</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('MODELS')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'MODELS'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>ALL 10 SBT MODELS</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SPECS')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'SPECS'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>TECHNICAL SPECIFICATIONS</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SIMULATOR')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'SIMULATOR'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>LIVE TELEMETRY SIMULATOR</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs text-slate-300">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              {/* Top Highlights Grid: 5 Core Bot Capabilities */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-slate-900/70 border border-amber-500/40 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block mb-1">
                      AUTOMATED ACCURACY
                    </span>
                    <span className="text-2xl font-military font-bold text-white">85.0%</span>
                  </div>
                  <p className="text-[10px] text-slate-300 mt-2 font-sans leading-relaxed">
                    Performs fully automated trading execution with an audited 85% accuracy rate based on deterministic institutional rules.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/70 border border-cyan-500/40 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block mb-1">
                      MARKET STRUCTURE
                    </span>
                    <span className="text-2xl font-military font-bold text-white">FULL MSS/BOS</span>
                  </div>
                  <p className="text-[10px] text-slate-300 mt-2 font-sans leading-relaxed">
                    Handles comprehensive market structure analysis, Break of Structure (BOS), Change of Character (CHoCH), and liquidity sweep pools.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/70 border border-emerald-500/40 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mb-1">
                      TREND &amp; TIMEFRAMES
                    </span>
                    <span className="text-2xl font-military font-bold text-white">AUTO ADAPT</span>
                  </div>
                  <p className="text-[10px] text-slate-300 mt-2 font-sans leading-relaxed">
                    Identifies prevailing trends and determines the appropriate SBT model and matching execution timeframes automatically.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/70 border border-purple-500/40 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block mb-1">
                      DATA COLLECTION
                    </span>
                    <span className="text-2xl font-military font-bold text-white">LIVE QUANT</span>
                  </div>
                  <p className="text-[10px] text-slate-300 mt-2 font-sans leading-relaxed">
                    Collects all market and order flow data for you, tracking strike rates, drawdown shields, and historical edge statistics.
                  </p>
                </div>
              </div>

              {/* God Willing Blessing Banner */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-cyan-500/15 border border-amber-400/40 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-bold text-amber-200 block text-xs">
                      God Willing (Inshallah) — An Exceptional, Game-Changing Tool
                    </span>
                    <span className="text-[11px] text-slate-300">
                      Engineered to provide institutional automated edge, trend clarity, and disciplined risk execution. Launching around the HAPPY New Year!
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 font-military font-bold text-[10px] uppercase shrink-0 shadow-sm">
                  HAPPY NEW YEAR
                </span>
              </div>

              {/* What Makes SBT Bot the Best in the World */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-950 to-slate-900/90 border border-white/10 space-y-4">
                <h3 className="text-sm font-military font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>WHY THE SBT BOT IS THE WORLD'S #1 TRADING AUTOMATION</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-300 font-bold">
                      1
                    </div>
                    <div>
                      <h4 className="font-bold text-white">Pure Rule-Based Institutional Logic</h4>
                      <p className="text-slate-400 mt-0.5">
                        Unlike black-box neural nets or lagging indicator indicators, the SBT Bot executes only when 100% of the deterministic SBT rules are validated on chart.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center shrink-0 text-cyan-300 font-bold">
                      2
                    </div>
                    <div>
                      <h4 className="font-bold text-white">Tick-Level Liquidity Sweep Detection</h4>
                      <p className="text-slate-400 mt-0.5">
                        Watches institutional liquidity pools, buy-side / sell-side liquidity sweeps, and detects retail trap inducement before entering.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-300 font-bold">
                      3
                    </div>
                    <div>
                      <h4 className="font-bold text-white">Zero Emotional Fatigue</h4>
                      <p className="text-slate-400 mt-0.5">
                        Eliminates hesitation, greed, revenge trading, and fear. Follows systematic compounding rules and enforces hard daily loss limits automatically.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/40 flex items-center justify-center shrink-0 text-purple-300 font-bold">
                      4
                    </div>
                    <div>
                      <h4 className="font-bold text-white">Autonomous Evolution Engine Sync</h4>
                      <p className="text-slate-400 mt-0.5">
                        Continuously refines spread tolerances, volatility filters, and high-impact economic news embargoes via PrimePipFX’s autonomous learning engine.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* VIP Waitlist Registration Form */}
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-cyan-500/10 border-2 border-amber-400/40 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 max-w-xl">
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider mb-1">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>NEW YEAR 2027 PRIORITY VIP RESERVATION</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-military font-bold text-white uppercase tracking-wide">
                    SECURE YOUR EARLY-BIRD BOT ACCESS
                  </h3>
                  <p className="text-slate-300 text-xs mt-1">
                    Early access is strictly limited to 100 traders for the New Year 2027 cohort to preserve liquidity execution and server throughput.
                  </p>

                  {isReserved ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200"
                    >
                      <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>RESERVATION CONFIRMED • VIP TICKET #{vipNumber}</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        You are officially registered for the New Year 2027 SBT Bot Launch! Your private installation package and MT5 credentials will be sent to your email on launch eve.
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <a
                          href={`https://wa.me/923406671495?text=${encodeURIComponent(
                            `Hi PrimePipFX, I have reserved SBT Bot VIP Ticket #${vipNumber} for the New Year 2027 launch! Please confirm my priority allocation.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer hover:bg-emerald-400 transition"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Confirm on WhatsApp</span>
                        </a>
                      </div>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleJoinWaitlist} className="mt-4 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                            Your Name / Handle
                          </label>
                          <input
                            type="text"
                            value={waitlistName}
                            onChange={(e) => setWaitlistName(e.target.value)}
                            placeholder="e.g. Alex / GoldTrader"
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-hidden focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                            Trader Email *
                          </label>
                          <input
                            type="email"
                            required
                            value={waitlistEmail}
                            onChange={(e) => setWaitlistEmail(e.target.value)}
                            placeholder="trader@primepipfx.com"
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-hidden focus:border-amber-400"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex-1 min-w-[200px]">
                          <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                            Preferred Execution Platform
                          </label>
                          <select
                            value={selectedBroker}
                            onChange={(e) => setSelectedBroker(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-amber-400"
                          >
                            <option>MetaTrader 5 (MT5)</option>
                            <option>MetaTrader 4 (MT4)</option>
                            <option>cTrader Platform</option>
                            <option>Direct Institutional FIX API</option>
                          </select>
                        </div>

                        <div className="pt-4 w-full sm:w-auto">
                          <button
                            type="submit"
                            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-military font-bold text-xs uppercase cursor-pointer shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition"
                          >
                            <Sparkles className="w-4 h-4" />
                            <span>Reserve Priority VIP Access</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ALL 10 SBT MODELS */}
          {activeTab === 'MODELS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-military font-bold text-white uppercase tracking-wider">
                    THE 10 AUTONOMOUS INSTITUTIONAL SBT MODELS
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Every trade taken by the bot strictly adheres to one of these 10 authoritative model rules.
                  </p>
                </div>
                {onExploreModels && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onExploreModels();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold uppercase flex items-center gap-1 cursor-pointer transition"
                  >
                    <span>View Models Hub</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SBT_10_MODELS.map((m) => (
                  <div
                    key={m.num}
                    className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold shrink-0">
                      {String(m.num).padStart(2, '0')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-white text-xs tracking-wide">
                          Model {m.num}: {m.name}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                          ACTIVE
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5">{m.concept}</p>
                      <div className="mt-1.5 text-[10px] text-amber-300 flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        <span>Edge: {m.edge}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: TECHNICAL SPECIFICATIONS */}
          {activeTab === 'SPECS' && (
            <div className="space-y-4">
              <h3 className="text-sm font-military font-bold text-white uppercase tracking-wider">
                QUANTITATIVE SPECIFICATIONS & ENGINE ARCHITECTURE
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <h4 className="font-bold text-cyan-400 text-xs uppercase flex items-center gap-1.5">
                    <Cpu className="w-4 h-4" />
                    <span>Algorithmic Execution Layer</span>
                  </h4>
                  <ul className="space-y-1.5 text-[11px] text-slate-300">
                    <li className="flex items-center justify-between border-b border-slate-800/80 pb-1">
                      <span className="text-slate-400">Execution Frequency:</span>
                      <span className="font-bold text-white">Tick-by-tick real-time polling</span>
                    </li>
                    <li className="flex items-center justify-between border-b border-slate-800/80 pb-1">
                      <span className="text-slate-400">Supported Assets:</span>
                      <span className="font-bold text-white">XAUUSD, USOIL, FX (28 Pairs), NAS100</span>
                    </li>
                    <li className="flex items-center justify-between border-b border-slate-800/80 pb-1">
                      <span className="text-slate-400">Average Daily Trades:</span>
                      <span className="font-bold text-white">2 - 5 high-conviction setups</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-slate-400">Timeframe Analysis:</span>
                      <span className="font-bold text-white">Daily / H4 / H1 → M15 / M5 execution</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <h4 className="font-bold text-emerald-400 text-xs uppercase flex items-center gap-1.5">
                    <Shield className="w-4 h-4" />
                    <span>Prop Firm Risk Armor Protocols</span>
                  </h4>
                  <ul className="space-y-1.5 text-[11px] text-slate-300">
                    <li className="flex items-center justify-between border-b border-slate-800/80 pb-1">
                      <span className="text-slate-400">Daily Loss Cap:</span>
                      <span className="font-bold text-white">Auto-hard freeze at 1.5%</span>
                    </li>
                    <li className="flex items-center justify-between border-b border-slate-800/80 pb-1">
                      <span className="text-slate-400">Max Overall DD:</span>
                      <span className="font-bold text-white">Hard-locked below 4.0%</span>
                    </li>
                    <li className="flex items-center justify-between border-b border-slate-800/80 pb-1">
                      <span className="text-slate-400">High-Impact News:</span>
                      <span className="font-bold text-white">Auto-freeze ±15 mins (CPI/NFP/FOMC)</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-slate-400">Weekend Exposure:</span>
                      <span className="font-bold text-white">100% Flat by Friday 21:00 UTC</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-amber-500/20 text-[11px] text-slate-300 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Comprehensive Institutional SBT Bot Whitepaper (PDF) is available for VIP waitlist members.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('OVERVIEW')}
                  className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-bold uppercase cursor-pointer"
                >
                  Join Waitlist
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: LIVE SIMULATOR */}
          {activeTab === 'SIMULATOR' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-military font-bold text-white uppercase tracking-wider">
                    INTERACTIVE BOT TELEMETRY SIMULATOR
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Experience how the SBT Bot evaluates, sweeps, executes, and scales out of institutional setups.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={runSimulation}
                  disabled={isSimRunning}
                  className={`px-4 py-2 rounded-xl font-bold uppercase text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition ${
                    isSimRunning
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/25'
                  }`}
                >
                  <Terminal className="w-4 h-4" />
                  <span>{isSimRunning ? 'Simulating...' : 'Run Bot Simulation'}</span>
                </button>
              </div>

              {/* Simulation Terminal Box */}
              <div className="rounded-2xl bg-black border border-slate-800 p-4 font-mono-code text-[11px] space-y-2 min-h-[220px]">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-500 text-[10px]">
                  <span>[PRIMEPIPFX QUANT TERMINAL v2027.1]</span>
                  <span>PAIR: XAU/USD (SPOT GOLD) • STATUS: {isSimRunning ? 'EXECUTING' : simStep > 0 ? 'COMPLETED' : 'STANDBY'}</span>
                </div>

                {simStep === 0 && (
                  <div className="text-slate-500 py-8 text-center">
                    Click "Run Bot Simulation" above to watch the SBT Bot execute an institutional liquidity sweep on XAU/USD.
                  </div>
                )}

                {simStep >= 1 && (
                  <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className="text-cyan-400">
                    &gt; [09:14:02.104] Scanning liquidity pool at Asia session high $4,148.50...
                  </motion.div>
                )}

                {simStep >= 2 && (
                  <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className="text-amber-400">
                    &gt; [09:14:03.220] LIQUIDITY SWEEP DETECTED: +4.2 pips wick above previous high. SBT Model 09 (Turtle Soup) activated!
                  </motion.div>
                )}

                {simStep >= 3 && (
                  <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className="text-yellow-300">
                    &gt; [09:14:03.235] ORDER DISPATCHED: SELL 2.0 Lots @ $4,148.20 | SL: $4,151.00 (Risk: 0.50% / $500) | TP1: $4,139.80 | TP2: $4,132.00
                  </motion.div>
                )}

                {simStep >= 4 && (
                  <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className="text-emerald-400">
                    &gt; [09:14:48.810] TP1 HIT: +84.0 pips captured! 50% position closed (+$840). Stop loss shifted to Break Even +1 pip automatically.
                  </motion.div>
                )}

                {simStep >= 5 && (
                  <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className="text-emerald-300 font-bold bg-emerald-950/40 p-2 rounded-lg border border-emerald-500/30 mt-2">
                    ✓ [09:15:32.410] TRADE COMPLETED: Full target achieved (+$1,480 profit). Total Trade Duration: 1m 30s. Drawdown during trade: 0.08%.
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-950 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Launch Date: January 1, 2027 • PrimePipFX Official</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-bold uppercase cursor-pointer transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('OVERVIEW')}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-military font-bold uppercase cursor-pointer shadow-md shadow-amber-500/20 transition"
            >
              Reserve VIP Slot
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
