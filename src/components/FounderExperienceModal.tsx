import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  Shield,
  Award,
  TrendingUp,
  Compass,
  ArrowRight,
  ExternalLink,
  Flame,
  Target,
  Zap,
  Cpu,
  Users,
  CheckCircle2,
  Milestone,
  Layers,
  ZoomIn,
  Bot,
  Activity,
  BarChart3,
} from 'lucide-react';

interface FounderExperienceModalProps {
  isOpen: boolean;
  isMinimized: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onReopen: () => void;
  savedVideoTime?: number;
  onUpdateVideoTime?: (time: number) => void;
}

export const FounderExperienceModal: React.FC<FounderExperienceModalProps> = ({
  isOpen,
  isMinimized,
  onClose,
  onMinimize,
  onReopen,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // YouTube Video Player State
  // The user requested: opens and starts playing immediately with sound on, with option to mute later.
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [activeChapter, setActiveChapter] = useState<number>(0);

  // SBT Indicator Image Switcher & Lightbox State
  const [activeTimeframe, setActiveTimeframe] = useState<'1W' | '1D'>('1W');
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [lightboxImage, setLightboxImage] = useState<string>(
    '/assets/aistudio/chrome_1c7qkzLTze_0894f84c.png'
  );

  const sbtImages = {
    '1W': {
      src: '/assets/aistudio/chrome_1c7qkzLTze_0894f84c.png',
      label: 'Gold Spot / U.S. Dollar · 1W (Weekly Macro Analysis)',
      caption: 'Prime Pip SBT Strategy on TradingView — Full Institutional Matrix (Models SBT 1 to SBT 10B, Bull/Bear Order Flow & MSS Structure)',
      stats: {
        modelsScanned: '10 Models (SBT 1–10B)',
        bullishSignals: '93 Setups',
        bearishSignals: '55 Setups',
        totalDocumented: '148 Macro Setups',
      },
    },
    '1D': {
      src: '/assets/aistudio/chrome_oqZGyoE1Iy_89528c23.png',
      label: 'Gold Spot / U.S. Dollar · 1D (Daily Execution Analysis)',
      caption: 'Prime Pip SBT Strategy on TradingView — Structural Retracement, Market Structure Shifts (MSS), Double Top & Liquidity Boundaries',
      stats: {
        modelsScanned: '10 Models (SBT 1–10B)',
        bullishSignals: '172 Setups',
        bearishSignals: '103 Setups',
        totalDocumented: '275 Daily Setups',
      },
    },
  };

  // Lock body scroll when full-screen experience is open
  useEffect(() => {
    if (isOpen && !isMinimized) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, isMinimized]);

  // YouTube Iframe Command Helper
  const sendYouTubeCommand = useCallback((func: string, args: string = '') => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: func,
          args: args,
        }),
        '*'
      );
    }
  }, []);

  // Handle Mute / Unmute
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sendYouTubeCommand(nextMuted ? 'mute' : 'unMute');
  };

  // Handle Play / Pause
  const togglePlay = () => {
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    sendYouTubeCommand(nextPlaying ? 'playVideo' : 'pauseVideo');
  };

  // When minimizing, pause audio/video so it doesn't disturb login
  useEffect(() => {
    if (isMinimized) {
      sendYouTubeCommand('pauseVideo');
      setIsPlaying(false);
    } else if (isOpen && !isMinimized) {
      sendYouTubeCommand('playVideo');
      setIsPlaying(true);
      if (!isMuted) {
        sendYouTubeCommand('unMute');
      }
    }
  }, [isMinimized, isOpen, isMuted, sendYouTubeCommand]);

  // Life Story Chapters
  const chapters = [
    {
      num: '01',
      title: 'THE BEGINNING',
      subtitle: 'A boy from rural Jhang with enormous dreams.',
      period: 'Early Years — Jhang, Pakistan',
      icon: Compass,
      accent: 'from-cyan-400 to-blue-500',
      badgeColor: 'border-cyan-500/30 text-cyan-300 bg-cyan-500/10',
      content:
        'I was born in a small, remote rural area of Jhang, Pakistan. In a place where resources were scarce and paths to global finance were virtually nonexistent, I carried an unshakeable inner conviction: I was not born into an extraordinary life, so I resolved to build one. From early childhood, I believed that geography does not determine destiny.',
      milestones: [
        'Humble origins in a rural town with minimal technology access',
        'Unyielding curiosity for engineering, mechanics, and global systems',
        'Early determination to break boundaries and build financial independence',
      ],
    },
    {
      num: '02',
      title: 'THE BATTLES',
      subtitle: 'Injuries that ended athletic dreams, academic struggles, and failed business ventures.',
      period: 'Adversity & Relocation to Sargodha',
      icon: Flame,
      accent: 'from-rose-400 to-amber-500',
      badgeColor: 'border-rose-500/30 text-rose-300 bg-rose-500/10',
      content:
        'My first great passion was athletics—I poured my heart into training to become the fastest sprinter. But severe physical injuries shattered that dream: a fractured leg, serious knee trauma, and persistent lower-back damage forced me off the track forever. Relocating to Sargodha for education, I encountered academic hurdles and financial strain. I tried freelancing, coding, and launched a jewelry enterprise that collapsed. Every failure was painful, but each taught me relentless resilience.',
      milestones: [
        'Severe orthopedic injuries abruptly ended sprinting aspirations',
        'Relocated to Sargodha: navigating financial pressure and academic tests',
        'Explored coding and built a jewelry business that ultimately folded',
      ],
    },
    {
      num: '03',
      title: 'THE TURNING POINT',
      subtitle: 'Discovering Forex, 18 difficult months, and life-changing mentorship with Sir Hamza.',
      period: 'The Crucible — Faisalabad Mentorship with Sir Hamza',
      icon: Target,
      accent: 'from-violet-400 to-purple-500',
      badgeColor: 'border-violet-500/30 text-violet-300 bg-violet-500/10',
      content:
        'When I encountered the Forex markets, I knew I had found my life calling. Yet the first 18 months were an intense trial of fire—blown accounts, psychological strain, and overwhelming noise. The breakthrough arrived when I sought out Sir Hamza of Faisalabad. He stripped away the retail illusions, teaching me institutional risk management, psychological composure, and statistical discipline.',
      milestones: [
        '18 months of solitary market grind, painful losses, and deep study',
        'Mentorship under Sir Hamza of Faisalabad transformed everything',
        'Shifted from emotional speculation to institutional mathematical edge',
      ],
    },
    {
      num: '04',
      title: 'THE BREAKTHROUGH',
      subtitle: 'Mastering discipline, passing prop firm evaluations, and achieving funded trader status.',
      period: 'Consistency & Verification',
      icon: Award,
      accent: 'from-emerald-400 to-teal-500',
      badgeColor: 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10',
      content:
        'Armed with unwavering risk management and refined institutional models, the results transformed. I passed rigorous institutional account evaluations, earned funded status, and began consistently extracting edge from the markets. More than financial reward, this breakthrough proved that grit, ethical mentorship, and strict discipline could dismantle any obstacle.',
      milestones: [
        'Passed competitive prop firm evaluation benchmarks with precision',
        'Built consistent profitability through strict R:R and asymmetric positioning',
        'Achieved personal independence and laid the foundation to give back to the community',
      ],
    },
    {
      num: '05',
      title: 'THE CREATION',
      subtitle: 'Founder of the Prime Pip SBT Indicator — The 1st iteration of the SBT Bot.',
      period: 'Engineering the Ecosystem',
      icon: Cpu,
      accent: 'from-cyan-400 to-indigo-500',
      badgeColor: 'border-cyan-500/30 text-cyan-300 bg-cyan-500/10',
      content:
        'Personal trading success was only step one. I pioneered the proprietary Prime Pip SBT Indicator—the foundational first iteration that scans 10 institutional models (SBT 1 through SBT 10B), market structure shifts (MSS), and liquidity boundaries. The upcoming autonomous SBT Bot builds directly upon this proven algorithmic framework, unified inside the PRIME PIP FX COMMAND CENTER.',
      milestones: [
        'Developed and released the proprietary Prime Pip SBT Indicator',
        'Engineered the comprehensive 10-model institutional matrix (SBT 1–10B)',
        'Built the unified Prime Pip FX Command Center as the ecosystem hub',
      ],
    },
    {
      num: '06',
      title: 'THE VISION',
      subtitle: 'Building technology, creating opportunities, developing a trusted trading community, and pursuing freedom.',
      period: 'The Future & Legacy',
      icon: Users,
      accent: 'from-amber-400 to-cyan-400',
      badgeColor: 'border-amber-500/30 text-amber-300 bg-amber-500/10',
      content:
        'Today, Prime Pip FX is growing into a global movement. Through our YouTube channel, verified community, and continuous technological innovation, we are democratizing institutional-grade tools and honest education. My life is dedicated to ensuring that anyone—no matter how humble their beginnings—has access to the technology, discipline, and opportunity required to achieve true freedom.',
      milestones: [
        'Empowering hundreds of verified students with honest, rigorous mentorship',
        'Expanding Prime Pip FX into a globally recognized trading technology powerhouse',
        'Pursuing sovereign freedom and creating generational opportunities for others',
      ],
    },
  ];

  return (
    <>
      {/* ============================================================== */}
      {/* 1. FLOATING MINIMIZED PILL (ACCESSIBLE WHILE ON LOGIN SCREEN) */}
      {/* ============================================================== */}
      {isMinimized && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/95 border border-cyan-500/40 shadow-2xl shadow-cyan-500/25 backdrop-blur-xl group hover:border-cyan-400 transition"
        >
          {/* Reopen Button */}
          <button
            type="button"
            onClick={onReopen}
            className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-800/80 transition cursor-pointer text-left"
            title="Click to reopen Wahab Zafar's Founder Story"
          >
            <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-600 to-violet-600 p-[1.5px] shrink-0 shadow-md shadow-cyan-500/30">
              <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-cyan-300 animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950 animate-ping" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono-code font-bold uppercase tracking-wider text-cyan-400">
                  FOUNDER STORY
                </span>
                <span className="text-[10px] text-slate-500">·</span>
                <span className="text-[10px] text-slate-400 font-mono-code">
                  Founder of the SBT Indicator
                </span>
              </div>
              <span className="text-xs font-military font-bold text-slate-100 group-hover:text-cyan-300 transition flex items-center gap-1">
                Wahab Zafar — The Man Behind Prime Pip FX
                <ArrowRight className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-0.5 transition" />
              </span>
            </div>
          </button>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition cursor-pointer"
            title="Close Founder Experience"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}

      {/* ============================================================== */}
      {/* 2. FULLSCREEN CINEMATIC OVERLAY                                 */}
      {/* ============================================================== */}
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[100] flex flex-col bg-[#040814]/98 backdrop-blur-2xl text-slate-100 overflow-y-auto selection:bg-cyan-500/30 selection:text-cyan-200"
            ref={containerRef}
          >
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-[-10%] left-[-10%] w-[550px] h-[550px] rounded-full bg-cyan-500/10 blur-[140px]" />
              <div className="absolute top-[30%] right-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[160px]" />
              <div className="absolute bottom-[-10%] left-[20%] w-[650px] h-[650px] rounded-full bg-blue-600/10 blur-[150px]" />
              {/* Subtle tech grid mesh */}
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
                  backgroundSize: '48px 48px',
                }}
              />
            </div>

            {/* Sticky Header Nav with Minimize & Close */}
            <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 py-3.5 bg-slate-950/85 border-b border-slate-800/80 backdrop-blur-xl shrink-0">
              {/* Brand Insignia */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-600/20 border border-cyan-500/40 text-cyan-300 shadow-md shadow-cyan-500/10">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-military font-bold tracking-wider text-slate-100 uppercase">
                      PRIME PIP FX
                    </span>
                    <span className="text-slate-600">/</span>
                    <span className="text-[10px] font-mono-code font-bold uppercase tracking-widest text-cyan-400">
                      FOUNDER EXPERIENCE
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono-code hidden sm:block">
                    The Man Behind The Vision — Wahab Zafar · Founder of the SBT Indicator
                  </p>
                </div>
              </div>

              {/* Action Controls: Minimize & Close */}
              <div className="flex items-center gap-2">
                {/* Minimize Button */}
                <button
                  type="button"
                  onClick={onMinimize}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 transition text-xs font-mono-code cursor-pointer"
                  title="Minimize to floating pill and return to login"
                >
                  <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">Minimize</span>
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-rose-500/20 hover:border-rose-500/50 text-slate-300 hover:text-rose-300 transition text-xs font-mono-code cursor-pointer flex items-center gap-1.5"
                  title="Close and return to login"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Close</span>
                </button>
              </div>
            </header>

            {/* Main Content Area */}
            <div className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-4 sm:px-8 py-8 sm:py-12 space-y-16">
              {/* ======================================================== */}
              {/* SECTION A: FOUNDER INTRODUCTION (TOP)                    */}
              {/* ======================================================== */}
              <section className="text-center space-y-6 pt-4">
                {/* Overline Badge */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/10 via-violet-500/10 to-blue-500/10 border border-cyan-400/30 text-cyan-300 shadow-lg shadow-cyan-500/10"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  <span className="text-[11px] font-mono-code font-bold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-200 to-violet-300">
                    THE MAN BEHIND PRIME PIP FX
                  </span>
                </motion.div>

                {/* Founder Hero Name */}
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="space-y-2"
                >
                  <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-extrabold tracking-tight text-white uppercase">
                    WAHAB ZAFAR
                  </h1>
                  <p className="text-xs sm:text-sm font-mono-code font-semibold tracking-wider text-cyan-400 uppercase">
                    25 YEARS OLD <span className="text-slate-600">|</span> FOUNDER OF THE SBT INDICATOR <span className="text-slate-600">|</span> PROFESSIONAL FOREX TRADER <span className="text-slate-600">|</span> STRATEGY DEVELOPER
                  </p>
                </motion.div>

                {/* Main Headline */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.2 }}
                  className="max-w-3xl mx-auto"
                >
                  <h2 className="text-xl sm:text-3xl lg:text-4xl font-military font-bold text-slate-100 leading-snug tracking-wide uppercase">
                    "I WASN'T BORN INTO AN EXTRAORDINARY LIFE.{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-violet-400">
                      I DECIDED TO BUILD ONE.
                    </span>"
                  </h2>
                </motion.div>

                {/* Supporting Text */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="max-w-2xl mx-auto"
                >
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-sans font-normal">
                    "Every extraordinary journey begins somewhere. Mine began in a small rural area of Jhang, Pakistan, with limited opportunities but unlimited dreams."
                  </p>
                </motion.div>
              </section>

              {/* ======================================================== */}
              {/* SECTION B: CINEMATIC YOUTUBE VIDEO (DIRECT LINK EMBED)   */}
              {/* Starts immediately with sound on, with mute control      */}
              {/* ======================================================== */}
              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-code text-slate-400 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-slate-200 font-bold uppercase tracking-wider">
                      CINEMATIC BROADCAST
                    </span>
                    <span className="text-slate-600 hidden sm:inline">·</span>
                    <span className="text-cyan-400 hidden sm:inline">https://youtu.be/8NzDHasKkG8</span>
                  </div>

                  {/* Sound & External Controls Bar */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleMute}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition text-xs font-mono-code font-bold cursor-pointer shadow-md ${
                        !isMuted
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 hover:bg-cyan-500/30'
                          : 'bg-rose-500/20 border-rose-400 text-rose-300 hover:bg-rose-500/30'
                      }`}
                      title={!isMuted ? 'Sound is currently ON — Click to Mute' : 'Muted — Click to Unmute'}
                    >
                      {!isMuted ? (
                        <>
                          <Volume2 className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
                          <span>SOUND ON (Click to Mute)</span>
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                          <span>MUTED (Click to Unmute)</span>
                        </>
                      )}
                    </button>

                    <a
                      href="https://youtu.be/8NzDHasKkG8"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1 rounded-full bg-slate-900 border border-slate-700/80 hover:border-slate-600 text-slate-300 hover:text-white transition text-xs font-mono-code cursor-pointer"
                      title="Open video on YouTube"
                    >
                      <span>YouTube</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Cinematic YouTube Video Container with Glowing Dual Border */}
                <div className="relative group p-[2px] rounded-3xl bg-gradient-to-r from-cyan-400 via-violet-500 to-blue-500 shadow-2xl shadow-cyan-500/20 overflow-hidden">
                  <div className="relative rounded-[22px] overflow-hidden bg-slate-950 aspect-video flex items-center justify-center">
                    <iframe
                      ref={iframeRef}
                      src={`https://www.youtube-nocookie.com/embed/8NzDHasKkG8?autoplay=1&mute=${isMuted ? 1 : 0}&enablejsapi=1&rel=0&modestbranding=1&playsinline=1`}
                      title="Wahab Zafar — The Man Behind Prime Pip FX"
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 font-mono-code px-1">
                  <span>Direct broadcast: Starts immediately with full audio enabled.</span>
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="hover:text-cyan-400 transition cursor-pointer underline flex items-center gap-1"
                  >
                    {isPlaying ? 'Pause broadcast' : 'Resume broadcast'}
                  </button>
                </div>
              </section>

              {/* ======================================================== */}
              {/* INNOVATION SPOTLIGHT: FOUNDER OF THE SBT INDICATOR       */}
              {/* Displaying user's actual TradingView analysis images     */}
              {/* ======================================================== */}
              <section className="space-y-6 pt-4">
                <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-slate-950/90 via-slate-900/60 to-slate-950/90 border border-cyan-500/40 shadow-2xl relative overflow-hidden backdrop-blur-xl">
                  {/* Radiant corner glow */}
                  <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />

                  {/* Section Title & Subtitle */}
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500/15 to-violet-500/15 border border-cyan-400/40 text-cyan-300 text-xs font-mono-code font-bold">
                        <Layers className="w-3.5 h-3.5 text-cyan-400" />
                        <span>FIRST ITERATION OF THE BOT · FOUNDATIONAL ENGINE</span>
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-military font-bold text-white uppercase tracking-wider">
                        FOUNDER OF THE SBT INDICATOR
                      </h3>
                      <p className="text-xs sm:text-sm font-mono-code text-cyan-400 font-semibold">
                        Prime Pip SBT Indicator — Comprehensive Multi-Model Institutional Analysis
                      </p>
                    </div>

                    {/* Timeframe Switcher Tabs */}
                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 self-start md:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTimeframe('1W');
                          setLightboxImage(sbtImages['1W'].src);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono-code font-bold transition cursor-pointer flex items-center gap-1.5 ${
                          activeTimeframe === '1W'
                            ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>1W Weekly Macro</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTimeframe('1D');
                          setLightboxImage(sbtImages['1D'].src);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono-code font-bold transition cursor-pointer flex items-center gap-1.5 ${
                          activeTimeframe === '1D'
                            ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>1D Daily Execution</span>
                      </button>
                    </div>
                  </div>

                  {/* Context Narrative */}
                  <div className="relative z-10 py-5 space-y-4">
                    <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-sans">
                      Before engineering the fully autonomous <strong>SBT Bot</strong>, Wahab Zafar developed and perfected the <strong>Prime Pip SBT Indicator</strong> on TradingView. It provides complete, mathematically verified institutional analysis—tracking 10 proprietary models (SBT 1 to SBT 10B), Market Structure Shift (MSS) trigger lines, liquidity pools, and order flow metrics.
                    </p>

                    {/* Quick Metric Pills */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col">
                        <span className="text-[10px] font-mono-code text-slate-400 uppercase">Models Integrated</span>
                        <span className="text-base font-military font-bold text-white mt-0.5">
                          {sbtImages[activeTimeframe].stats.modelsScanned}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col">
                        <span className="text-[10px] font-mono-code text-emerald-400 uppercase">Bullish Setups Scanned</span>
                        <span className="text-base font-military font-bold text-emerald-300 mt-0.5">
                          {sbtImages[activeTimeframe].stats.bullishSignals}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col">
                        <span className="text-[10px] font-mono-code text-rose-400 uppercase">Bearish Setups Scanned</span>
                        <span className="text-base font-military font-bold text-rose-300 mt-0.5">
                          {sbtImages[activeTimeframe].stats.bearishSignals}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col">
                        <span className="text-[10px] font-mono-code text-cyan-400 uppercase">Total Edge Verified</span>
                        <span className="text-base font-military font-bold text-cyan-300 mt-0.5">
                          {sbtImages[activeTimeframe].stats.totalDocumented}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* High-Resolution SBT Indicator Image Container */}
                  <div className="relative z-10 pt-2 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono-code text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-200 font-bold">{sbtImages[activeTimeframe].label}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setLightboxImage(sbtImages[activeTimeframe].src);
                          setIsLightboxOpen(true);
                        }}
                        className="text-cyan-400 hover:text-cyan-300 transition cursor-pointer flex items-center gap-1 font-semibold"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>Click to Enlarge / Full View</span>
                      </button>
                    </div>

                    <div
                      onClick={() => {
                        setLightboxImage(sbtImages[activeTimeframe].src);
                        setIsLightboxOpen(true);
                      }}
                      className="group/img relative rounded-2xl overflow-hidden border border-cyan-500/30 bg-slate-950 shadow-2xl cursor-zoom-in hover:border-cyan-400/80 transition-all duration-300"
                    >
                      <img
                        src={sbtImages[activeTimeframe].src}
                        alt="Prime Pip SBT Indicator Comprehensive Analysis by Founder Wahab Zafar"
                        className="w-full h-auto object-contain max-h-[520px] mx-auto group-hover/img:scale-[1.01] transition-transform duration-300"
                      />

                      {/* Hover Overlay Hint */}
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <div className="px-4 py-2 rounded-xl bg-slate-900/95 border border-cyan-400 text-cyan-300 font-mono-code text-xs font-bold shadow-2xl flex items-center gap-2">
                          <ZoomIn className="w-4 h-4" />
                          <span>Click to Inspect High-Resolution Chart & Matrix</span>
                        </div>
                      </div>

                      {/* Institutional Matrix Badge on Chart */}
                      <div className="absolute bottom-3 left-3 bg-slate-950/90 border border-slate-800 px-3 py-1.5 rounded-lg text-[11px] font-mono-code text-slate-300 backdrop-blur-md">
                        <span className="text-cyan-400 font-bold">Prime Pip SBT Indicator</span> · Matrix Analysis Active
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 font-mono-code text-center pt-1 italic">
                      "{sbtImages[activeTimeframe].caption}"
                    </p>
                  </div>
                </div>
              </section>

              {/* ======================================================== */}
              {/* SECTION C: THE STORY TIMELINE (SIX CHAPTERS)             */}
              {/* ======================================================== */}
              <section className="space-y-8 pt-4 scroll-mt-24" id="story-timeline">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-cyan-500/30 text-xs font-mono-code text-cyan-400 shadow-sm">
                    <Milestone className="w-3.5 h-3.5 text-cyan-400" />
                    <span>CHRONICLES OF PERSEVERANCE</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-military font-bold text-white tracking-wide uppercase">
                    THE STORY TIMELINE
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
                    From childhood hurdles in rural Jhang to developing the Prime Pip SBT Indicator and algorithmic bots—explore the pivotal chapters of Wahab Zafar's journey.
                  </p>
                </div>

                {/* Chapter Quick Nav Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2">
                  {chapters.map((ch, idx) => {
                    const Icon = ch.icon;
                    const isSelected = activeChapter === idx;
                    return (
                      <button
                        key={ch.num}
                        type="button"
                        onClick={() => setActiveChapter(idx)}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                          isSelected
                            ? 'bg-slate-900 border-cyan-400 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/40'
                            : 'bg-slate-950/90 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-mono-code font-bold ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`}>
                            CHAPTER {ch.num}
                          </span>
                          <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-300' : 'text-slate-600'}`} />
                        </div>
                        <span className={`text-xs font-military font-bold line-clamp-1 ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                          {ch.title}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Active Chapter Spotlight Card */}
                {(() => {
                  const ch = chapters[activeChapter];
                  const Icon = ch.icon;
                  return (
                    <motion.div
                      key={ch.num}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className="p-6 sm:p-8 rounded-3xl bg-slate-950/95 border border-cyan-500/30 shadow-2xl relative overflow-hidden ring-1 ring-white/5"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
                        <div className="flex items-center gap-3.5">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${ch.badgeColor} shrink-0 shadow-md`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono-code font-bold text-cyan-400">
                                CHAPTER {ch.num}
                              </span>
                              <span className="text-slate-600">·</span>
                              <span className="text-xs font-mono-code text-slate-400 font-semibold">{ch.period}</span>
                            </div>
                            <h4 className="text-xl sm:text-2xl font-military font-bold text-white tracking-wide uppercase mt-0.5">
                              {ch.title}
                            </h4>
                          </div>
                        </div>

                        <div className="px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono-code text-slate-300 md:max-w-md self-start md:self-auto">
                          "{ch.subtitle}"
                        </div>
                      </div>

                      <div className="py-6 space-y-6">
                        <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-sans">
                          {ch.content}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                          {ch.milestones.map((m, mIdx) => (
                            <div
                              key={mIdx}
                              className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/60 flex items-start gap-2.5 text-xs text-slate-300"
                            >
                              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                              <span>{m}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Next Chapter Navigator */}
                      <div className="pt-4 flex items-center justify-between border-t border-slate-800/80 text-xs">
                        <button
                          type="button"
                          disabled={activeChapter === 0}
                          onClick={() => setActiveChapter((prev) => Math.max(0, prev - 1))}
                          className="px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                        >
                          ← Previous Chapter
                        </button>
                        <span className="font-mono-code text-slate-500">
                          {activeChapter + 1} of {chapters.length}
                        </span>
                        <button
                          type="button"
                          disabled={activeChapter === chapters.length - 1}
                          onClick={() => setActiveChapter((prev) => Math.min(chapters.length - 1, prev + 1))}
                          className="px-3 py-1.5 rounded-lg border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer flex items-center gap-1 font-semibold"
                        >
                          <span>Next Chapter</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })()}

                {/* Complete Timeline Cards (Expandable overview of all 6) */}
                <div className="space-y-4 pt-4">
                  <h4 className="text-sm font-mono-code font-bold uppercase tracking-wider text-slate-400">
                    Full Chronological View
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {chapters.map((ch, idx) => {
                      return (
                        <div
                          key={ch.num}
                          onClick={() => setActiveChapter(idx)}
                          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                            activeChapter === idx
                              ? 'bg-slate-900/90 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                              : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-mono-code font-bold text-cyan-400">
                              0{idx + 1} — {ch.title}
                            </span>
                            <span className="text-[10px] font-mono-code text-slate-500">{ch.period}</span>
                          </div>
                          <p className="text-xs text-slate-300 font-semibold mb-2">
                            "{ch.subtitle}"
                          </p>
                          <p className="text-xs text-slate-400 line-clamp-2">
                            {ch.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* ======================================================== */}
              {/* SECTION D: THE FINAL MESSAGE & SIGNATURE                 */}
              {/* ======================================================== */}
              <section className="relative p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-slate-950 to-[#070d1e] border border-cyan-500/30 shadow-2xl overflow-hidden text-center space-y-8">
                {/* Background decorative radiant ring */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[500px] h-[500px] rounded-full bg-cyan-500/5 blur-[120px]" />
                </div>

                <div className="relative z-10 space-y-4 max-w-2xl mx-auto">
                  <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-military font-bold text-white uppercase tracking-wider">
                    "I HAVE NEVER STOPPED BELIEVING IN MY VISION."
                  </h3>

                  <blockquote className="text-base sm:text-lg text-slate-200 leading-relaxed font-sans italic">
                    "I don't want to spend my entire life chasing money. I want to build something that gives people more opportunities, more freedom, and a better future."
                  </blockquote>

                  <p className="text-sm font-mono-code font-bold tracking-widest text-cyan-400 uppercase pt-2">
                    "MY JOURNEY IS STILL CONTINUING."
                  </p>
                </div>

                {/* Signature Lockup with 'Founder of the SBT Indicator' */}
                <div className="relative z-10 pt-6 border-t border-slate-800/80 max-w-md mx-auto space-y-1">
                  <div className="text-2xl sm:text-3xl font-display font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-violet-300 uppercase">
                    WAHAB ZAFAR
                  </div>
                  <div className="text-xs font-mono-code font-bold tracking-widest text-cyan-300 uppercase">
                    FOUNDER OF THE SBT INDICATOR & PRIME PIP FX
                  </div>
                  <div className="text-[11px] font-mono-code text-slate-400 tracking-wider pt-1">
                    THE JOURNEY CONTINUES.
                  </div>
                </div>

                {/* Interactive CTAs */}
                <div className="relative z-10 pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-military font-bold text-xs tracking-wider uppercase transition shadow-lg shadow-cyan-500/25 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Enter Command Center Login</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-slate-600 text-slate-300 hover:text-white font-mono-code text-xs transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Replay Story from Beginning</span>
                  </button>
                </div>
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* 3. FULL-RESOLUTION SBT INDICATOR LIGHTBOX MODAL                 */}
      {/* ============================================================== */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col bg-slate-950/95 backdrop-blur-2xl p-4 sm:p-8"
            onClick={() => setIsLightboxOpen(false)}
          >
            {/* Lightbox Header Bar */}
            <div
              className="flex items-center justify-between pb-4 border-b border-slate-800 text-white shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-military font-bold uppercase tracking-wider text-white">
                    Prime Pip SBT Indicator — TradingView High-Resolution Analysis
                  </h4>
                  <p className="text-xs font-mono-code text-cyan-400">
                    Founder: Wahab Zafar · 10 Institutional Models (SBT 1–10B) & Market Structure Shift (MSS)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Timeframe switch inside lightbox */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTimeframe('1W');
                    setLightboxImage(sbtImages['1W'].src);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono-code font-bold transition cursor-pointer ${
                    activeTimeframe === '1W'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-900 border border-slate-700 text-slate-300'
                  }`}
                >
                  1W Macro
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTimeframe('1D');
                    setLightboxImage(sbtImages['1D'].src);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono-code font-bold transition cursor-pointer ${
                    activeTimeframe === '1D'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-900 border border-slate-700 text-slate-300'
                  }`}
                >
                  1D Daily
                </button>

                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(false)}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer border border-slate-700 ml-2"
                  title="Close Full Image View"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Lightbox Image Preview */}
            <div
              className="flex-1 flex items-center justify-center p-2 sm:p-4 overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightboxImage}
                alt="Prime Pip SBT Indicator Full Analysis"
                className="max-w-full max-h-[85vh] object-contain rounded-xl border border-cyan-500/30 shadow-2xl"
              />
            </div>

            {/* Lightbox Footer */}
            <div
              className="text-center text-xs font-mono-code text-slate-400 pt-2 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {sbtImages[activeTimeframe].caption}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
