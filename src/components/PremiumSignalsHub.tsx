import React, { useState } from 'react';
import {
  Radio,
  Lock,
  Sparkles,
  ShieldAlert,
  Bell,
  CheckCircle2,
  Cpu,
  ArrowUpRight,
  TrendingUp,
  Target,
  Zap,
  Layers,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { SignalItem } from '../types';

interface PremiumSignalsHubProps {
  isAdmin?: boolean;
  onSelectSignalForTrade?: (signal: SignalItem) => void;
}

export const PremiumSignalsHub: React.FC<PremiumSignalsHubProps> = () => {
  const [isReserved, setIsReserved] = useState<boolean>(() => {
    return localStorage.getItem('primepipfx_signals_vip_reserved') === 'true';
  });
  const [showLockedNotice, setShowLockedNotice] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -20;
    setMousePos({ x, y });
  };

  const handleCardMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  const handleReserve = () => {
    setIsReserved(true);
    localStorage.setItem('primepipfx_signals_vip_reserved', 'true');
    setShowLockedNotice(true);
  };

  const handleTriggerComingSoon = () => {
    setShowLockedNotice(true);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-2">
      {/* 3D Animated Hero & Coming Soon Feature Lock Stage */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0D1322] via-[#080C16] to-[#04060A] border border-amber-500/30 p-6 sm:p-12 shadow-2xl shadow-amber-500/10">
        {/* Ambient Glowing Orbs */}
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-sky-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* 3D Visual Centerpiece */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-10 relative z-10">
          <div className="space-y-4 max-w-xl text-center lg:text-left">
            {/* Status Chip */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono-code text-xs font-bold tracking-wider animate-pulse">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>FEATURE CURRENTLY LOCKED • COMING SOON</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-military font-bold tracking-wider text-slate-100 leading-tight">
              INSTITUTIONAL <span className="text-amber-400">VIP SIGNALS</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 font-sans leading-relaxed">
              Our proprietary high-probability execution engine is currently undergoing forward-testing and institutional calibration. Every published setup will feature strict 1:2.5+ Risk-to-Reward parameters, SMC liquidity confluence, and auto-risk allocation.
            </p>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
                <div className="text-[10px] font-mono-code text-slate-400 uppercase">Target R:R</div>
                <div className="text-base font-bold font-mono-code text-amber-400">1:2.5 — 1:5</div>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
                <div className="text-[10px] font-mono-code text-slate-400 uppercase">Engine Status</div>
                <div className="text-base font-bold font-mono-code text-sky-400 flex items-center justify-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                  CALIBRATING
                </div>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
                <div className="text-[10px] font-mono-code text-slate-400 uppercase">Access Type</div>
                <div className="text-base font-bold font-mono-code text-emerald-400">VIP MEMBERS</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-4">
              <button
                type="button"
                onClick={handleReserve}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-military font-bold text-xs tracking-wider shadow-xl shadow-amber-500/25 transition-transform active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                {isReserved ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-slate-950" />
                    <span>PRIORITY RESERVATION CONFIRMED</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4 text-slate-950" />
                    <span>GET NOTIFIED ON LAUNCH</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleTriggerComingSoon}
                className="px-5 py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700 hover:border-amber-500/40 font-mono-code text-xs font-semibold transition cursor-pointer flex items-center gap-2"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>CHECK ACCESS STATUS</span>
              </button>
            </div>
          </div>

          {/* 3D Animated Interactive Gyroscope & Holographic Preview Card */}
          <div
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
            className="w-full sm:w-84 h-96 relative perspective-1000 select-none cursor-pointer group"
            style={{ perspective: '1000px' }}
            onClick={handleTriggerComingSoon}
            title="Click to view Coming Soon status"
          >
            <div
              className="w-full h-full rounded-2xl bg-gradient-to-br from-slate-900/90 via-[#0C1220]/95 to-slate-950/90 border-2 border-amber-500/50 p-6 shadow-2xl transition-transform duration-200 ease-out relative flex flex-col justify-between overflow-hidden"
              style={{
                transform: `rotateY(${mousePos.x}deg) rotateX(${mousePos.y}deg)`,
                transformStyle: 'preserve-3d',
              }}
            >
              {/* 3D Concentric Orbit Rings Animation */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
                <div className="w-64 h-64 border border-amber-500/40 rounded-full animate-[spin_12s_linear_infinite]" />
                <div className="w-48 h-48 border border-dashed border-sky-400/40 rounded-full absolute animate-[spin_8s_linear_infinite_reverse]" />
                <div className="w-32 h-32 border border-amber-400/50 rounded-full absolute animate-ping opacity-20" />
              </div>

              {/* Top of Card */}
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Radio className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono-code text-amber-400 font-bold">ALGO ENGINE</div>
                    <div className="text-xs font-military font-bold text-slate-200">XAU/USD SETUP</div>
                  </div>
                </div>
                <div className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[9px] font-mono-code text-amber-300 font-bold flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  <span>LOCKED</span>
                </div>
              </div>

              {/* Center 3D Holographic Radar Lock */}
              <div className="text-center py-4 relative z-10 space-y-2">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-amber-500/20 to-sky-500/20 border border-amber-400/60 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
                  <Lock className="w-8 h-8 text-amber-400 animate-pulse" />
                </div>
                <div className="font-military font-bold text-slate-100 tracking-wider text-sm">
                  PROPRIETARY VIP FEED
                </div>
                <p className="text-[11px] font-mono-code text-slate-400 px-4">
                  Signals locked pending institutional forward validation
                </p>
              </div>

              {/* Bottom Parameters Preview */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 text-xs font-mono-code space-y-1 relative z-10">
                <div className="flex justify-between text-slate-400 text-[10px]">
                  <span>ESTIMATED ACCURACY</span>
                  <span className="text-emerald-400 font-bold">78.6%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full w-[78%]" />
                </div>
                <div className="flex justify-between text-[9px] text-slate-500 pt-1">
                  <span>DISPATCH: TELEGRAM & APP</span>
                  <span className="text-amber-400 font-bold">VIP ONLY</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Structured Architecture Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Pillar 1 */}
        <div className="bg-slate-900/70 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-6 transition-all space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Target className="w-5 h-5" />
          </div>
          <h3 className="font-military font-bold text-sm tracking-wider text-slate-100">
            1. SMC CONFLUENCE ENGINE
          </h3>
          <p className="text-xs text-slate-400 font-mono-code leading-relaxed">
            Every trade opportunity requires triple-layer confirmation: Asian low/high liquidity sweep, Order Block displacement, and Fair Value Gap retest.
          </p>
          <div className="text-[10px] font-mono-code text-amber-400/90 font-bold pt-2 flex items-center gap-1">
            <span>● 94% CALIBRATION COMPLETE</span>
          </div>
        </div>

        {/* Pillar 2 */}
        <div className="bg-slate-900/70 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-6 transition-all space-y-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="font-military font-bold text-sm tracking-wider text-slate-100">
            2. ULTRA-LOW LATENCY DISPATCH
          </h3>
          <p className="text-xs text-slate-400 font-mono-code leading-relaxed">
            Direct institutional webhooks to ensure notifications hit your device and private channels in under 300ms from setup trigger confirmation.
          </p>
          <div className="text-[10px] font-mono-code text-sky-400/90 font-bold pt-2 flex items-center gap-1">
            <span>● TELEGRAM SYNC IN PROGRESS</span>
          </div>
        </div>

        {/* Pillar 3 */}
        <div className="bg-slate-900/70 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-6 transition-all space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h3 className="font-military font-bold text-sm tracking-wider text-slate-100">
            3. CAPITAL DEFENSE PROTOCOL
          </h3>
          <p className="text-xs text-slate-400 font-mono-code leading-relaxed">
            No signal allows more than 1% recommended capital exposure. Precise stop-loss levels and partial take-profit milestones are mandatory on every alert.
          </p>
          <div className="text-[10px] font-mono-code text-emerald-400/90 font-bold pt-2 flex items-center gap-1">
            <span>● RISK RULES LOCKED & TESTED</span>
          </div>
        </div>
      </div>

      {/* Support & Notification Bar */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-military font-bold text-sm text-slate-100">
              HAVE QUESTIONS ABOUT VIP ACCREDITATION?
            </h4>
            <p className="text-xs font-mono-code text-slate-400">
              Contact our Institutional Desk on WhatsApp for account upgrades and early beta rollout.
            </p>
          </div>
        </div>

        <a
          href="https://wa.me/923406671495"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-mono-code text-xs font-bold rounded-xl flex items-center gap-2 transition cursor-pointer"
        >
          <MessageCircle className="w-4 h-4" />
          <span>CONTACT 03406671495</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Mandatory Regulatory Risk Warning */}
      <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-5 shadow-lg flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        <p className="text-xs text-rose-200/90 font-mono-code leading-relaxed">
          <strong>Mandated Risk Notice:</strong> Forex, CFD, and leveraged market derivatives involve substantial risk of financial loss. Institutional signals published within PrimePipFX are for educational and analytical benchmarking only. Past performance does not guarantee future results.
        </p>
      </div>

      {/* Coming Soon Notice Modal */}
      {showLockedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center animate-in zoom-in-95">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20">
              <Lock className="w-7 h-7 animate-pulse" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono-code uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold">
                PROPRIETARY FEATURE LOCKED
              </span>
              <h3 className="font-military font-bold text-lg text-slate-100 tracking-wider">
                COMING SOON
              </h3>
            </div>

            <p className="text-xs text-slate-300 font-mono-code leading-relaxed">
              The Premium Signal Desk is currently locked while our quantitative team finishes live-market forward testing. You will receive an instant notification as soon as this feature goes live!
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowLockedNotice(false)}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-military font-bold text-xs tracking-wider transition cursor-pointer"
              >
                ACKNOWLEDGED
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
