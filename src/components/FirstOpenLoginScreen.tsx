import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Lock,
  User,
  KeyRound,
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  MessageCircle,
  TrendingUp,
  Activity,
  Award,
  Users,
  ArrowRight,
  Terminal,
  Zap,
  Cloud,
  Database,
  ExternalLink,
  Sparkles,
  Star,
} from 'lucide-react';
import {
  apiLogin,
  apiChangePassword,
  setStoredUser,
  checkAndHandleActivationLink,
  getStoredToken,
} from '../utils/authClient';
import { syncStudentsFromCloud } from '../utils/localAuthStore';
import { UserAccount } from '../types';
import { googleDriveService } from '../services/googleDriveService';

interface FirstOpenLoginScreenProps {
  onLoginSuccess: (user: UserAccount, token?: string) => void;
  onExploreDemo: () => void;
  onOpenSubscription?: () => void;
}

export const FirstOpenLoginScreen: React.FC<FirstOpenLoginScreenProps> = ({
  onLoginSuccess,
  onExploreDemo,
  onOpenSubscription,
}) => {
  const [step, setStep] = useState<'LOGIN' | 'CHANGE_PASSWORD' | 'LINK_STORAGE'>('LOGIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [linkingDrive, setLinkingDrive] = useState(false);
  const [driveLinkSuccess, setDriveLinkSuccess] = useState(false);
  const [isSuccessBurst, setIsSuccessBurst] = useState(false);
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [congratsUser, setCongratsUser] = useState<UserAccount | null>(null);

  // First-time developer/customer password change state
  const [pendingUser, setPendingUser] = useState<UserAccount | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeSuccess, setChangeSuccess] = useState(false);

  // 3D Tilt State for Desktop Perspective
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Animated Typing Prompt for Hero Capsule
  const [promptIndex, setPromptIndex] = useState(0);
  const heroPrompts = [
    'Execute Institutional Precision.',
    'Risk Management & Real-Time Analytics.',
    '24 Verified Traders Synchronized.',
    'Gold & Forex High-Probability Frameworks.',
  ];

  // Verified 5-Star Reviews Highlighting Everything Under One Roof
  const [reviewIndex, setReviewIndex] = useState(0);
  const topReviews = [
    {
      author: 'Alexander M. (Zurich)',
      quote: 'World\'s #1 platform—everything under one roof! Fundamental, COT & risk engine are 100% accurate.',
    },
    {
      author: 'Sarah J. (London)',
      quote: 'Replaced 4 different subscriptions. Spot-on bullish/bearish meters for Gold, US Oil & FX pairs.',
    },
    {
      author: 'Tariq A. (Prop Trader)',
      quote: 'The Liquid Glass UI is ultra-responsive, beautiful, and flawless. The absolute highest tier.',
    },
  ];
  const [isTypingActive, setIsTypingActive] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPromptIndex((prev) => (prev + 1) % heroPrompts.length);
    }, 3800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const revInterval = setInterval(() => {
      setReviewIndex((prev) => (prev + 1) % topReviews.length);
    }, 4500);
    return () => clearInterval(revInterval);
  }, [topReviews.length]);

  useEffect(() => {
    // Check for 1-click activation link in URL (?activate=username&key=password)
    checkAndHandleActivationLink().then((activatedUser) => {
      if (activatedUser) {
        triggerBurst();
        onLoginSuccess(activatedUser, getStoredToken() || 'token');
      }
    });
    // Pre-sync latest registered student credentials from Cloud KV
    syncStudentsFromCloud().catch(() => {});
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || window.innerWidth < 1024) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePos({ x: 0, y: 0 });
  };

  const triggerBurst = () => {
    setIsSuccessBurst(true);
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00f0ff', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
      });
    } catch {}
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await apiLogin(username.trim(), password.trim(), rememberMe);
      setLoading(false);

      if (result.ok && result.user) {
        triggerBurst();
        setCongratsUser(result.user);
        setShowCongratulations(true);

        if (result.user.mustChangePassword) {
          setTimeout(() => {
            setShowCongratulations(false);
            setPendingUser(result.user!);
            setPendingToken(result.token || null);
            setStep('CHANGE_PASSWORD');
          }, 1800);
          return;
        }

        setTimeout(() => {
          setShowCongratulations(false);
          proceedAfterAuth(result.user!, result.token);
        }, 2200);
      } else {
        setError(result.error || 'Invalid credentials. Please verify your username and password.');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Authentication error. Please check your connection.');
    }
  };

  const proceedAfterAuth = (user: UserAccount, token?: string) => {
    googleDriveService.setCurrentUserId(user.id);
    const alreadyPrompted = googleDriveService.hasPromptedInitialLink(user.id);
    const alreadyConnected = googleDriveService.isConnected();

    // Option to link account appears ONLY during initial login without prompting repeatedly afterward
    if (!alreadyPrompted && !alreadyConnected) {
      setPendingUser(user);
      setPendingToken(token || null);
      setStep('LINK_STORAGE');
      return;
    }

    onLoginSuccess(user, token);
  };

  const handleLinkDrive = async () => {
    if (!pendingUser) return;
    setLinkingDrive(true);
    setError(null);
    try {
      googleDriveService.setCurrentUserId(pendingUser.id);
      const connected = await googleDriveService.connectGoogleDrive();
      if (connected) {
        googleDriveService.setPromptedInitialLink(pendingUser.id, true);
        setDriveLinkSuccess(true);
        triggerBurst();
        setTimeout(() => {
          onLoginSuccess(pendingUser, pendingToken || undefined);
        }, 800);
      } else {
        setLinkingDrive(false);
        setError('Google Drive connection was not completed. You can retry or skip.');
      }
    } catch (err: any) {
      setLinkingDrive(false);
      setError(err?.message || 'Failed to connect Google Drive.');
    }
  };

  const handleSkipDriveLink = () => {
    if (pendingUser) {
      // Mark as prompted so user is never prompted repeatedly on subsequent logins
      googleDriveService.setPromptedInitialLink(pendingUser.id, true);
      onLoginSuccess(pendingUser, pendingToken || undefined);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiChangePassword(newPassword);
      setLoading(false);

      if (res.ok && pendingUser) {
        triggerBurst();
        setChangeSuccess(true);
        const tokenToUse = res.token || pendingToken || '';
        const updatedUser: UserAccount = res.user || {
          ...pendingUser,
          mustChangePassword: false,
        };
        setStoredUser(updatedUser);

        setTimeout(() => {
          proceedAfterAuth(updatedUser, tokenToUse);
        }, 900);
      } else {
        setError(res.error || 'Failed to update password. Please try again.');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Failed to update password.');
    }
  };

  const handleDemoClick = () => {
    triggerBurst();
    setTimeout(() => {
      onExploreDemo();
    }, 300);
  };

  const whatsappLink = `https://wa.me/923406671495?text=${encodeURIComponent(
    'Hello PrimePipFX Developer / Owner, I want authorized access to the PRIMEPIPFX Trading Command Center.'
  )}`;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="min-h-screen min-h-[100dvh] w-full bg-[#030712] text-slate-100 flex items-center justify-center p-3 sm:p-6 lg:p-8 relative overflow-x-hidden overflow-y-auto selection:bg-cyan-500/30 selection:text-cyan-200"
      style={{ perspective: '1200px' }}
    >
      {/* Dynamic Ambient Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-cyan-500/10 via-blue-600/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute top-10 right-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        {/* Futuristic fine grid */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255, 255, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.2) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Top Mobile Status Ticker (Visible on mobile/tablet screens < lg) */}
      <div className="absolute top-[calc(env(safe-area-inset-top)+4.5rem)] left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-md lg:hidden z-20">
        <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-full bg-slate-900/80 border border-slate-800/80 backdrop-blur-md shadow-lg text-[11px] font-mono-code text-slate-300">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>XAUUSD 2,634.80</span>
          </div>
          <div className="text-slate-500">|</div>
          <div className="flex items-center gap-1.5 text-cyan-400">
            <Award className="w-3.5 h-3.5" />
            <span>84.6% WIN RATE</span>
          </div>
          <div className="text-slate-500">|</div>
          <div className="flex items-center gap-1.5 text-amber-400">
            <Users className="w-3.5 h-3.5" />
            <span>24 TRADERS</span>
          </div>
        </div>
      </div>

      {/* Hero Capsule Prompt (Inspired by the Video Entry Sequence) */}
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="absolute top-[max(0.75rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-md z-20"
      >
        <div className="relative group p-[1px] rounded-full bg-gradient-to-r from-cyan-500/40 via-blue-500/20 to-amber-500/40 shadow-xl shadow-cyan-950/40 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-2.5 rounded-full bg-slate-950/80 border border-white/5">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 text-cyan-400">
                <Terminal className="w-3.5 h-3.5" />
              </div>
              <AnimatePresence mode="wait">
                <motion.span
                  key={promptIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="text-xs sm:text-sm font-military tracking-wide text-slate-200 truncate font-semibold"
                >
                  {heroPrompts[promptIndex]}
                </motion.span>
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="hidden sm:inline-block text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                v2.6 LIVE
              </span>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main 3D Container Holding Central Card & Desktop Floating HUD Elements */}
      <div className="relative w-full max-w-6xl min-h-[100dvh] mx-auto flex items-center justify-center z-10 py-16 sm:py-12">
        {/* Floating HUD Card 1: Top-Left (Desktop Only) */}
        <motion.div
          animate={{
            x: isHovered ? mousePos.x * -28 : 0,
            y: isHovered ? mousePos.y * -28 : 0,
            rotateZ: isHovered ? mousePos.x * -4 : 0,
          }}
          transition={{ type: 'spring', damping: 25, stiffness: 120 }}
          className="hidden 2xl:flex flex-col gap-1.5 absolute -left-12 top-10 w-60 p-4 rounded-2xl bg-slate-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-2xl shadow-cyan-950/30 pointer-events-none z-0"
        >
          <div className="flex items-center justify-between text-xs font-mono-code">
            <span className="text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Institutional Edge
            </span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              OPTIMIZED
            </span>
          </div>
          <div className="text-xl font-military font-bold text-white tracking-wider">
            84.6% <span className="text-xs font-mono-code text-emerald-400 font-normal">WIN RATE</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
            <div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 w-[85%] rounded-full" />
          </div>
          <div className="flex justify-between text-[10px] font-mono-code text-slate-400 mt-0.5">
            <span>Risk/Reward: 1:3.4</span>
            <span className="text-cyan-300">Target Hit: 92%</span>
          </div>
        </motion.div>

        {/* Floating HUD Card 2: Top-Right (Desktop Only) */}
        <motion.div
          animate={{
            x: isHovered ? mousePos.x * 32 : 0,
            y: isHovered ? mousePos.y * -25 : 0,
            rotateZ: isHovered ? mousePos.x * 5 : 0,
          }}
          transition={{ type: 'spring', damping: 25, stiffness: 120 }}
          className="hidden 2xl:flex flex-col gap-1.5 absolute -right-12 top-8 w-60 p-4 rounded-2xl bg-slate-900/60 border border-amber-500/20 backdrop-blur-xl shadow-2xl shadow-amber-950/30 pointer-events-none z-0"
        >
          <div className="flex items-center justify-between text-xs font-mono-code">
            <span className="text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              Market Radar
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          </div>
          <div className="text-xl font-military font-bold text-white tracking-wider">
            XAUUSD <span className="text-xs font-mono-code text-amber-300 font-normal">2,634.80</span>
          </div>
          <div className="text-[11px] font-mono-code text-emerald-400 flex items-center gap-1">
            <span>+1.42% Bullish Momentum</span>
          </div>
          <div className="text-[10px] font-mono-code text-slate-500 border-t border-slate-800 pt-1 mt-0.5">
            Institutional Liquidity Sweep Verified
          </div>
        </motion.div>

        {/* Floating HUD Card 3: Bottom-Left (Desktop Only) */}
        <motion.div
          animate={{
            x: isHovered ? mousePos.x * -24 : 0,
            y: isHovered ? mousePos.y * 30 : 0,
            rotateZ: isHovered ? mousePos.x * -3 : 0,
          }}
          transition={{ type: 'spring', damping: 25, stiffness: 120 }}
          className="hidden 2xl:flex flex-col gap-1.5 absolute -left-12 bottom-12 w-60 p-4 rounded-2xl bg-slate-900/60 border border-blue-500/20 backdrop-blur-xl shadow-2xl shadow-blue-950/30 pointer-events-none z-0"
        >
          <div className="flex items-center justify-between text-xs font-mono-code">
            <span className="text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              Risk Armor
            </span>
            <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
              ARMED
            </span>
          </div>
          <div className="text-sm font-military font-bold text-slate-200">
            100% Rule Compliance
          </div>
          <p className="text-[10px] font-mono-code text-slate-400">
            Max Drawdown Guard active with auto-freeze discipline shields.
          </p>
        </motion.div>

        {/* Floating HUD Card 4: Bottom-Right (Desktop Only) */}
        <motion.div
          animate={{
            x: isHovered ? mousePos.x * 26 : 0,
            y: isHovered ? mousePos.y * 28 : 0,
            rotateZ: isHovered ? mousePos.x * 4 : 0,
          }}
          transition={{ type: 'spring', damping: 25, stiffness: 120 }}
          className="hidden 2xl:flex flex-col gap-1.5 absolute -right-12 bottom-10 w-60 p-4 rounded-2xl bg-slate-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-2xl shadow-emerald-950/30 pointer-events-none z-0"
        >
          <div className="flex items-center justify-between text-xs font-mono-code">
            <span className="text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              Trader Network
            </span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              LIVE
            </span>
          </div>
          <div className="text-sm font-military font-bold text-slate-200">
            24 Synchronized Members
          </div>
          <p className="text-[10px] font-mono-code text-slate-400">
            Cloud database & KV encrypted bridge streaming live alerts.
          </p>
        </motion.div>

        {/* Main Central Terminal Box with Dynamic 3D Tilt */}
        <motion.div
          animate={{
            rotateX: isHovered ? mousePos.y * -14 : 0,
            rotateY: isHovered ? mousePos.x * 14 : 0,
            translateZ: isHovered ? 20 : 0,
          }}
          transition={{ type: 'spring', damping: 20, stiffness: 140 }}
          className="w-full max-w-md mx-auto relative z-10"
        >
          {/* Iridescent Cyber Rim Glow */}
          <div className="absolute -inset-[1.5px] rounded-3xl bg-gradient-to-r from-cyan-400 via-blue-600 to-violet-500 opacity-85 blur-[2px] transition duration-500" />

          {/* Core Frosted Glass Card Body */}
          <div className="relative rounded-3xl bg-slate-950/90 border border-white/10 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl shadow-cyan-950/50 overflow-hidden ring-1 ring-cyan-400/10">
            {/* Top Glossy Reflection Sheen */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

            {/* 5-STAR RATING & REVIEWS SHOWCASE AT TOP */}
            <div className="mb-5 p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900/90 to-cyan-500/15 border border-amber-500/30 shadow-lg shadow-amber-500/5 text-center relative z-10">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="flex text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-xs font-military font-bold text-amber-300 tracking-wider">5.0 / 5.0 OUTSTANDING</span>
                <span className="text-[10px] font-mono-code text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold">
                  VERIFIED
                </span>
              </div>
              <p className="text-[11px] font-mono-code text-cyan-300 font-semibold truncate">
                "World's #1 Institutional Trading Suite — Everything Under One Roof"
              </p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={reviewIndex}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.3 }}
                  className="text-[10px] font-sans text-slate-300 italic mt-1 leading-snug"
                >
                  "{topReviews[reviewIndex].quote}" —{' '}
                  <span className="text-amber-300 font-mono-code font-bold not-italic">
                    {topReviews[reviewIndex].author}
                  </span>
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Brand Header */}
            <div className="text-center mb-6 relative z-10">
              <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-transparent border border-cyan-500/40 text-cyan-300 mb-3 shadow-lg shadow-cyan-500/20">
                <Shield className="w-8 h-8" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-military font-black tracking-wider text-white uppercase flex items-center justify-center gap-2">
                <span>PRIMEPIPFX</span>
              </h1>
              <h2 className="text-xs sm:text-sm font-military font-bold tracking-widest text-cyan-400 uppercase mt-0.5">
                TRADING COMMAND CENTER
              </h2>
              <p className="text-xs text-slate-400 font-mono-code mt-1.5">
                {step === 'CHANGE_PASSWORD'
                  ? 'First login detected. Set your personal permanent password.'
                  : step === 'LINK_STORAGE'
                  ? 'Initial Setup: Link free cloud storage for automatic backup.'
                  : 'Institutional Risk, Discipline & Execution Terminal'}
              </p>
            </div>

            {/* Error Alert Banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono-code flex flex-col gap-2"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{error}</span>
                </div>
                <div className="text-[11px] text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/60 leading-relaxed">
                  <span className="text-amber-400 font-bold block mb-1">🔑 Login Credentials:</span>
                  <div>Enter your authorized username and password manually to initialize the terminal.</div>
                </div>
              </motion.div>
            )}

            {/* Success Alert Banner */}
            {changeSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono-code flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Password updated securely. Entering Command Center...</span>
              </motion.div>
            )}

            {/* Step 1: Login Form */}
            {step === 'LOGIN' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4 relative z-10">
                <div>
                  <label className="block text-xs font-mono-code text-slate-300 uppercase mb-1.5 font-bold">
                    Username or Email
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      autoFocus
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. primepipfx-admin or your username"
                      className="w-full pl-10 pr-4 py-3 bg-slate-900/80 border border-slate-700/80 rounded-xl font-mono-code text-base sm:text-sm text-slate-100 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25 transition-all placeholder:text-slate-600"
                    />
                    <User className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono-code text-slate-300 uppercase mb-1.5 font-bold">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-11 py-3 bg-slate-900/80 border border-slate-700/80 rounded-xl font-mono-code text-base sm:text-sm text-slate-100 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25 transition-all placeholder:text-slate-600"
                    />
                    <KeyRound className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3.5" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200 transition-colors p-0.5"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me Option */}
                <div className="flex items-center justify-between py-1 px-1">
                  <label className="flex items-center gap-2 text-xs font-mono-code text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 accent-cyan-500 cursor-pointer"
                    />
                    <span>Remember on this device</span>
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono-code font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    PERSISTENT
                  </span>
                </div>

                {/* Primary Login Button with Liquid Morph Glow */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-military font-bold text-sm tracking-wider uppercase rounded-xl transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>{loading ? 'AUTHENTICATING...' : 'INITIALIZE TERMINAL'}</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </motion.button>

                {/* Explore Demo Mode Button */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleDemoClick}
                  className="w-full py-3 px-4 bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-mono-code text-xs font-bold rounded-xl border border-slate-700/80 hover:border-cyan-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>EXPLORE LIVE DEMO TERMINAL</span>
                </motion.button>
              </form>
            ) : step === 'LINK_STORAGE' ? (
              /* Step: Initial Login Google Drive Cloud Linking */
              <div className="space-y-4 relative z-10">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-teal-500/5 to-cyan-500/10 border border-emerald-500/30 text-center">
                  <div className="w-12 h-12 mx-auto mb-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
                    <Cloud className="w-6 h-6 animate-pulse" />
                  </div>
                  <h3 className="text-base font-military font-bold text-white uppercase tracking-wider">
                    Free Automatic Cloud Storage
                  </h3>
                  <p className="text-xs text-slate-300 font-sans mt-1 leading-relaxed">
                    Link your Google account to automatically store all trade journals, performance statistics, and account settings directly in your personal Google Drive for free—no server hosting required.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs font-mono-code text-slate-300">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Auto-Save:</strong> All trades and journals save automatically in the background.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>100% Private:</strong> Saved inside <code className="text-emerald-300">PFX Command Center</code> in your Drive.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Full Access:</strong> Download and restore your stored records anytime.</span>
                  </div>
                </div>

                {driveLinkSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono-code flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>Google Drive linked successfully! Entering Command Center...</span>
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    disabled={linkingDrive || driveLinkSuccess}
                    onClick={handleLinkDrive}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-military font-bold text-xs tracking-wider uppercase rounded-xl transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Cloud className="w-4 h-4" />
                    <span>{linkingDrive ? 'CONNECTING GOOGLE DRIVE...' : 'LINK GOOGLE ACCOUNT & FINISH LOGIN'}</span>
                  </motion.button>

                  <button
                    type="button"
                    disabled={linkingDrive || driveLinkSuccess}
                    onClick={handleSkipDriveLink}
                    className="w-full py-2.5 px-4 bg-transparent hover:bg-slate-900 text-slate-400 hover:text-slate-200 font-mono-code text-xs rounded-xl border border-transparent hover:border-slate-800 transition cursor-pointer text-center"
                  >
                    Skip for Now (Continue to Command Center)
                  </button>
                </div>
              </div>
            ) : (
              /* Step 3: First-Login Password Change Form */
              <form onSubmit={handlePasswordChange} className="space-y-4 relative z-10">
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono-code leading-relaxed">
                  Welcome <strong>{pendingUser?.username}</strong>! For system security, please configure your personal permanent password.
                </div>

                <div>
                  <label className="block text-xs font-mono-code text-slate-300 uppercase mb-1 font-bold">
                    New Permanent Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full pl-10 pr-11 py-3 bg-slate-900 border border-slate-700 rounded-xl font-mono-code text-base sm:text-sm text-slate-100 focus:outline-none focus:border-cyan-400 transition-all"
                    />
                    <KeyRound className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3.5" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono-code text-slate-300 uppercase mb-1 font-bold">
                    Confirm Permanent Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl font-mono-code text-base sm:text-sm text-slate-100 focus:outline-none focus:border-cyan-400 transition-all"
                    />
                    <KeyRound className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading || changeSuccess}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-military font-bold text-xs tracking-wider uppercase rounded-xl transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{loading ? 'SECURING ACCOUNT...' : 'SET PASSWORD & ENTER COMMAND CENTER'}</span>
                </motion.button>
              </form>
            )}

            {/* Footer Support & WhatsApp */}
            <div className="mt-6 pt-5 border-t border-slate-800 text-center relative z-10">
              <p className="text-[11px] font-mono-code text-slate-400 mb-2">
                Need authorized account credentials or enrollment?
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {onOpenSubscription && (
                  <>
                    <button
                      type="button"
                      onClick={onOpenSubscription}
                      className="text-xs font-mono-code text-cyan-400 hover:text-cyan-300 font-bold underline decoration-cyan-500/40 cursor-pointer"
                    >
                      SUBSCRIBE / GET ACCESS
                    </button>
                    <span className="text-slate-600">•</span>
                  </>
                )}
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-mono-code text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp: 03406671495</span>
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
