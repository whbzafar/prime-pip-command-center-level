import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  MessageCircle,
  Tag,
  ArrowRight,
  Sparkles,
  Zap,
  Gift,
  Lock,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  X,
  Copy,
  Check,
  Share2,
  Users,
  GraduationCap,
  Terminal,
  Plus,
  Trash2,
  Award,
  Phone,
} from 'lucide-react';
import { apiCheckReferral, getStoredReferral, setStoredReferral } from '../utils/authClient';
import { UserAccount } from '../types';

interface SubscriptionPageProps {
  onOpenLogin?: () => void;
  onContinueDemo?: () => void;
  appliedReferralCode?: string;
  currentUser?: UserAccount | null;
  onClose?: () => void;
  onContactDeveloper?: () => void;
}

interface TrackedReferralEntry {
  id: string;
  studentName: string;
  type: 'COURSE' | 'TERMINAL';
  dateAdded: string;
  status: 'PENDING_VERIFICATION' | 'VERIFIED';
}

const LOCAL_REFERRAL_TRACKER_KEY = 'primepipfx_lifetime_reward_referrals_v1';
const LOCAL_GUEST_REF_CODE_KEY = 'primepipfx_guest_ref_code_v1';

export const SubscriptionPage: React.FC<SubscriptionPageProps> = ({
  onOpenLogin,
  onContinueDemo,
  appliedReferralCode,
  currentUser,
  onClose,
}) => {
  const [referralInput, setReferralInput] = useState<string>(
    appliedReferralCode || getStoredReferral() || 'PRIMEPIP'
  );
  const [discountApplied, setDiscountApplied] = useState<boolean>(true);
  const [referrerName, setReferrerName] = useState<string>('Primepip Official Discount Code');
  const [verifying, setVerifying] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(
    "Promo code 'PRIMEPIP' applied! Your lifetime subscription fee is $55 (45% discount off $100)."
  );
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Interactive Lifetime Reward Referral System State (5 Course Students OR 2 Terminal Buyers)
  const [guestRefCode, setGuestRefCode] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_GUEST_REF_CODE_KEY);
      if (saved) return saved;
      const generated = `PPFX-${Math.floor(1000 + Math.random() * 9000)}`;
      localStorage.setItem(LOCAL_GUEST_REF_CODE_KEY, generated);
      return generated;
    } catch {
      return 'PPFX-REWARD';
    }
  });

  const [trackedReferrals, setTrackedReferrals] = useState<TrackedReferralEntry[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_REFERRAL_TRACKER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [newRefStudentName, setNewRefStudentName] = useState<string>('');
  const [newRefType, setNewRefType] = useState<'COURSE' | 'TERMINAL'>('COURSE');
  const [selectedRewardOption, setSelectedRewardOption] = useState<'COURSE_5' | 'TERMINAL_2'>('COURSE_5');

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_REFERRAL_TRACKER_KEY, JSON.stringify(trackedReferrals));
    } catch {}
  }, [trackedReferrals]);

  // Check initial referral
  useEffect(() => {
    if (referralInput) {
      verifyReferral(referralInput);
    }
  }, []);

  const verifyReferral = async (codeToTest: string) => {
    if (!codeToTest.trim()) {
      setDiscountApplied(false);
      setStatusMessage(null);
      return;
    }
    setVerifying(true);
    const res = await apiCheckReferral(codeToTest.trim());
    setVerifying(false);

    if (res.valid) {
      setDiscountApplied(true);
      setReferrerName(res.referrerName || codeToTest);
      setStoredReferral(codeToTest.trim());
      setStatusMessage(
        `Code verified! You received a 45% discount ($45 off). The lifetime subscription fee drops from $100 to only $55! (${res.referrerName || codeToTest})`
      );
    } else {
      setDiscountApplied(false);
      setStatusMessage(
        "Invalid code. The standard lifetime fee is $100. Enter 'Primepip' code to get 45% discount ($55 access)."
      );
    }
  };

  const activeReferralCode = currentUser?.referralCode || currentUser?.username || guestRefCode;

  const courseReferrals = trackedReferrals.filter((r) => r.type === 'COURSE');
  const terminalReferrals = trackedReferrals.filter((r) => r.type === 'TERMINAL');
  const courseProgressCount = courseReferrals.length;
  const terminalProgressCount = terminalReferrals.length;
  const isCourseRewardUnlocked = courseProgressCount >= 5;
  const isTerminalRewardUnlocked = terminalProgressCount >= 2;
  const isLifetimeRewardEligible = isCourseRewardUnlocked || isTerminalRewardUnlocked;

  const handleAddReferredStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRefStudentName.trim()) return;
    const entry: TrackedReferralEntry = {
      id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      studentName: newRefStudentName.trim(),
      type: newRefType,
      dateAdded: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'PENDING_VERIFICATION',
    };
    setTrackedReferrals((prev) => [entry, ...prev]);
    setNewRefStudentName('');
  };

  const handleRemoveReferredStudent = (id: string) => {
    setTrackedReferrals((prev) => prev.filter((r) => r.id !== id));
  };

  const whatsappMessage = discountApplied
    ? `Hello PrimePipFX, I want lifetime access to the PRIMEPIPFX Trading Command Center for $55 (with promo code '${referralInput.trim() || 'Primepip'}').`
    : `Hello PrimePipFX, I want lifetime access to the PRIMEPIPFX Trading Command Center ($55 Offer / $100 Standard).`;

  const whatsappUrl = `https://wa.me/923406671495?text=${encodeURIComponent(whatsappMessage)}`;

  const rewardClaimWhatsappMessage = (() => {
    const courseNames = courseReferrals.map((r) => r.studentName).join(', ');
    const terminalNames = terminalReferrals.map((r) => r.studentName).join(', ');
    if (isCourseRewardUnlocked) {
      return `Hello PrimePipFX Owner (03406671495), I have referred ${courseProgressCount}/5 students to the PrimePipFX Course (${courseNames}) under Referral Code ${activeReferralCode}. Please verify and activate my FREE Lifetime Terminal Access!`;
    }
    if (isTerminalRewardUnlocked) {
      return `Hello PrimePipFX Owner (03406671495), I have referred ${terminalProgressCount}/2 students who purchased the PrimePipFX Terminal (${terminalNames}) under Referral Code ${activeReferralCode}. Please verify and activate my FREE Lifetime Terminal Access!`;
    }
    return `Hello PrimePipFX Owner (03406671495), I am participating in the Lifetime Reward Referral Program (Referral Code: ${activeReferralCode}). Current referrals — Course Students (${courseProgressCount}/5)${courseNames ? `: ${courseNames}` : ''} | Terminal Purchases (${terminalProgressCount}/2)${terminalNames ? `: ${terminalNames}` : ''}. I would like to verify my referrals for Free Lifetime Terminal Access.`;
  })();

  const rewardClaimWhatsappUrl = `https://wa.me/923406671495?text=${encodeURIComponent(rewardClaimWhatsappMessage)}`;

  const handleCopyUserReferral = () => {
    const link = `${window.location.origin}/?ref=${encodeURIComponent(activeReferralCode)}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyReferralCode = () => {
    navigator.clipboard.writeText(activeReferralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="relative max-w-5xl mx-auto space-y-8 py-4 px-2 sm:px-4">
      {/* Optional Top Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded-xl transition cursor-pointer z-10"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Top Hero */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-cyan-400 text-xs font-mono-code font-bold">
          <Zap className="w-3.5 h-3.5" />
          PRIMEPIPFX TRADING COMMAND CENTER • $55 LIFETIME ACCESS
        </div>
        <h1 className="text-2xl sm:text-3xl font-military font-bold tracking-wider text-slate-100 uppercase">
          PROFESSIONAL TRADING MANAGEMENT SYSTEM
        </h1>
        <p className="text-sm text-slate-400 font-mono-code max-w-2xl mx-auto">
          TRADE. RECORD. ANALYZE. IMPROVE. <br />
          Institutional Risk Engine • High-Probability Execution System • Automated Journaling
        </p>
      </div>

      {/* Referral Banner / Input */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl text-cyan-400 border border-blue-500/20">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-military font-bold tracking-wider text-slate-200 uppercase">
                PROMO OR REFERRAL CODE ($55 LIFETIME ACCESS)
              </div>
              <p className="text-[11px] font-mono-code text-slate-400">
                Use promo code <strong className="text-cyan-300 font-bold">'Primepip'</strong> for a{' '}
                <strong className="text-emerald-400 font-bold">45% discount ($45 off)</strong> — lifetime subscription is only{' '}
                <strong className="text-amber-300 font-bold">$55</strong>!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={referralInput}
              onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
              placeholder="ENTER 'PRIMEPIP' CODE"
              className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl font-mono-code text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 uppercase tracking-wider w-full sm:w-56 font-bold"
            />
            <button
              onClick={() => verifyReferral(referralInput)}
              disabled={verifying}
              className="px-4 py-2 bg-blue-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-xs rounded-xl transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
            >
              {verifying ? 'CHECKING...' : 'APPLY'}
            </button>
          </div>
        </div>

        {statusMessage && (
          <div
            className={`mt-3 p-2.5 rounded-xl text-xs font-mono-code flex items-center gap-2 ${
              discountApplied
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            {discountApplied ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : null}
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Pricing Tiers Grid: Free Tier, Standard, Recommended ($55), and Lifetime Reward */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Tier 0: Free Tier / Community Access */}
        <div className="bg-slate-950/80 border border-emerald-500/40 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-military font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                FREE TIER
              </span>
              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                100% FREE
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 mb-4">
              <span className="text-4xl font-mono-code font-black text-emerald-400">$0</span>
              <span className="text-xs font-mono-code text-slate-400">USD</span>
              <span className="text-xs font-mono-code text-emerald-400 font-bold">FREE FOREVER</span>
            </div>

            <p className="text-xs font-mono-code text-slate-300 mb-6">
              Full access to essential institutional tools, journal, playbook models, pre-trade planner, and TradingView workspace.
            </p>

            <ul className="space-y-2.5 text-xs font-mono-code text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Full Isolated Trading Journal & Analytics</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>All 10 SBT Institutional Playbook Models</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Pre-Trade Plan & 1% Lot Size Calculator</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>TradingView Chart & Economic Calendar</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Explore Long-Term Bullish Setups & COT</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                if (onContinueDemo) onContinueDemo();
                if (onClose) onClose();
              }}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-military font-bold text-xs tracking-wider uppercase rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-950" />
              <span>ACTIVATE FREE TIER</span>
            </button>
          </div>
        </div>

        {/* Tier 1: Standard Access */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-military font-bold text-slate-400 uppercase tracking-wider">
                STANDARD ACCESS
              </span>
              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                LIFETIME LICENSE
              </span>
            </div>

            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-4xl font-mono-code font-black text-slate-100">$100</span>
              <span className="text-xs font-mono-code text-slate-400">USD ($55 WITH CODE)</span>
            </div>

            <p className="text-xs font-mono-code text-slate-400 mb-6">
              Full lifetime access to all 22 institutional trading categories. Drops to <strong className="text-amber-300">$55</strong> with promo code.
            </p>

            <ul className="space-y-2.5 text-xs font-mono-code text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Isolated Cloud & Offline Trading Journal</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>All 10 SBT Institutional Playbook Models</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Master 1% Risk Engine & Pre-Trade Plan</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Live TradingView × Forex Factory Calendar</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Fundamental Indicators & VIP Signals</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 font-military font-bold text-xs tracking-wider uppercase rounded-xl transition-colors flex items-center justify-center gap-2 border border-slate-700 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              SUBSCRIBE ($55 WITH CODE / $100 STD)
            </a>
          </div>
        </div>

        {/* Tier 2: Recommended $55 Access */}
        <div className="prime-gradient-box p-6 flex flex-col justify-between relative shadow-2xl">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-military font-bold text-[10px] uppercase tracking-wider shadow-md whitespace-nowrap">
            RECOMMENDED • $55 LIFETIME
          </div>

          <div>
            <div className="flex items-center justify-between mb-4 mt-1">
              <span className="text-xs font-military font-bold text-cyan-400 uppercase tracking-wider">
                RECOMMENDED ACCESS
              </span>
              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-lg bg-blue-500/20 text-amber-300 font-bold border border-blue-500/30">
                SAVE $45 (45% OFF)
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-mono-code font-black text-amber-300">$55</span>
              <span className="text-xs font-mono-code text-slate-400 line-through">$100</span>
              <span className="text-xs font-mono-code text-emerald-400 font-bold">LIFETIME</span>
            </div>

            <p className="text-xs font-mono-code text-slate-300 mb-6">
              Official subscription fee is <strong className="text-amber-300">$55 for lifetime access</strong> with promo code{' '}
              <strong className="text-cyan-300">'Primepip'</strong>.
            </p>

            <ul className="space-y-2.5 text-xs font-mono-code text-slate-200">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Full Lifetime Terminal Access for $55</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>All 22 Categories, Psych Center & Calming Suite</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Everything in Standard Access + Future Models</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Personal Referral Code for Free Lifetime Rewards</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800/80">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-military font-bold text-xs tracking-wider uppercase rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-slate-950" />
              <span>SUBSCRIBE NOW — $55 LIFETIME ACCESS</span>
            </a>
          </div>
        </div>

        {/* Tier 3: Lifetime Reward (5 Course Referrals OR 2 Terminal Referrals) */}
        <div className="bg-slate-950/90 border-2 border-purple-500/40 rounded-2xl p-6 flex flex-col justify-between relative shadow-xl shadow-purple-950/20">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-military font-bold text-[10px] uppercase tracking-wider shadow-md whitespace-nowrap">
            LIFETIME REWARD SYSTEM
          </div>

          <div>
            <div className="flex items-center justify-between mb-3 mt-1">
              <span className="text-xs font-military font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-purple-400" />
                LIFETIME REWARD
              </span>
              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 font-bold border border-purple-500/40">
                100% FREE ACCESS
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 mb-3">
              <span className="text-3xl font-mono-code font-black text-purple-300">FREE</span>
              <span className="text-xs font-mono-code text-emerald-400 font-bold">LIFETIME TERMINAL</span>
            </div>

            <p className="text-xs font-mono-code text-slate-300 mb-3 leading-relaxed">
              Unlock <strong className="text-purple-300">100% Free Lifetime Access</strong> to the entire terminal by completing <strong className="text-white">either</strong> of these two referral milestones:
            </p>

            {/* Two Official Reward Rules */}
            <div className="space-y-2.5 mb-4">
              {/* Option 1: 5 Course Students */}
              <div
                onClick={() => setSelectedRewardOption('COURSE_5')}
                className={`p-3 rounded-xl border transition cursor-pointer ${
                  selectedRewardOption === 'COURSE_5'
                    ? 'bg-purple-500/15 border-purple-400/60 text-purple-100'
                    : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-purple-500/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] font-military font-bold uppercase text-purple-300 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    OPTION 1: COURSE REFERRAL
                  </span>
                  <span className="text-[10px] font-mono-code font-bold px-1.5 py-0.5 rounded bg-purple-500/25 text-purple-200">
                    {courseProgressCount}/5 STUDENTS
                  </span>
                </div>
                <p className="text-[11px] font-mono-code text-slate-200 leading-snug">
                  Refer <strong className="text-amber-300">5 students to the course</strong> to receive{' '}
                  <strong className="text-emerald-400">FREE Lifetime Access</strong> to the terminal.
                </p>
              </div>

              {/* Option 2: 2 Terminal Buyers */}
              <div
                onClick={() => setSelectedRewardOption('TERMINAL_2')}
                className={`p-3 rounded-xl border transition cursor-pointer ${
                  selectedRewardOption === 'TERMINAL_2'
                    ? 'bg-cyan-500/15 border-cyan-400/60 text-cyan-100'
                    : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-cyan-500/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] font-military font-bold uppercase text-cyan-300 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    OPTION 2: TERMINAL REFERRAL
                  </span>
                  <span className="text-[10px] font-mono-code font-bold px-1.5 py-0.5 rounded bg-cyan-500/25 text-cyan-200">
                    {terminalProgressCount}/2 BUYERS
                  </span>
                </div>
                <p className="text-[11px] font-mono-code text-slate-200 leading-snug">
                  When <strong className="text-amber-300">2 referred students purchase the terminal ($55)</strong>, you get{' '}
                  <strong className="text-emerald-400">Lifetime Access for FREE</strong>.
                </p>
              </div>
            </div>

            {/* Active Referral Code Box */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-purple-500/30 font-mono-code text-xs flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Your Referral Code</span>
                <span className="font-bold text-cyan-300 uppercase">{activeReferralCode}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyReferralCode}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode ? 'COPIED' : 'CODE'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyUserReferral}
                  className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
                  <span>{copiedLink ? 'LINK COPIED' : 'SHARE LINK'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 space-y-2">
            <a
              href={rewardClaimWhatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-military font-bold text-xs tracking-wider uppercase rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>
                {isLifetimeRewardEligible
                  ? 'CLAIM FREE LIFETIME ACCESS NOW'
                  : 'VERIFY REFERRALS ON WHATSAPP'}
              </span>
            </a>
            <div className="text-center text-[11px] font-mono-code text-slate-400">
              WhatsApp Verification:{' '}
              <a
                href={rewardClaimWhatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 font-bold hover:underline"
              >
                03406671495
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* INTERACTIVE LIFETIME REWARD REFERRAL TRACKER & SUBMISSION SYSTEM */}
      <div className="bg-slate-950/90 border border-purple-500/35 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-military font-bold text-purple-300 uppercase tracking-wider">
              <Award className="w-4 h-4 text-purple-400" />
              <span>LIFETIME REWARD REFERRAL TRACKER SYSTEM</span>
            </div>
            <p className="text-xs font-mono-code text-slate-400 mt-1">
              Track your referred students below. Reach <strong className="text-purple-300">5 Course Referrals</strong> OR{' '}
              <strong className="text-cyan-300">2 Terminal Purchases ($55)</strong> to unlock{' '}
              <strong className="text-emerald-400">100% Free Lifetime Terminal Access</strong>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-mono-code font-bold border ${
                isLifetimeRewardEligible
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-purple-500/15 border-purple-500/30 text-purple-300'
              }`}
            >
              {isLifetimeRewardEligible
                ? '★ REWARD UNLOCKED — READY TO CLAIM'
                : 'TRACKING ACTIVE'}
            </span>
          </div>
        </div>

        {/* Dual Progress Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Progress Bar 1: 5 Course Students */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-purple-500/30 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono-code">
              <span className="font-bold text-purple-300 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-purple-400" />
                Pathway A: Refer 5 Students to Course
              </span>
              <span className="font-black text-white">
                {Math.min(courseProgressCount, 5)} / 5 Students
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-400 transition-all duration-300"
                style={{ width: `${Math.min(100, (courseProgressCount / 5) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] font-mono-code text-slate-400">
              {isCourseRewardUnlocked
                ? '✓ Milestone reached! You qualify for Free Terminal Access!'
                : `Refer ${Math.max(0, 5 - courseProgressCount)} more student(s) to the course for Free Terminal Access.`}
            </p>
          </div>

          {/* Progress Bar 2: 2 Terminal Purchases */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-500/30 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono-code">
              <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-cyan-400" />
                Pathway B: 2 Students Purchase Terminal ($55)
              </span>
              <span className="font-black text-white">
                {Math.min(terminalProgressCount, 2)} / 2 Buyers
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${Math.min(100, (terminalProgressCount / 2) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] font-mono-code text-slate-400">
              {isTerminalRewardUnlocked
                ? '✓ Milestone reached! You qualify for Free Lifetime Terminal Access!'
                : `Refer ${Math.max(0, 2 - terminalProgressCount)} more student(s) who purchase the terminal for Free Lifetime Access.`}
            </p>
          </div>
        </div>

        {/* Log a Referred Student Form */}
        <form
          onSubmit={handleAddReferredStudent}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1"
        >
          <input
            type="text"
            value={newRefStudentName}
            onChange={(e) => setNewRefStudentName(e.target.value)}
            placeholder="Enter referred student's Name or Username..."
            className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl font-mono-code text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-purple-400"
          />
          <select
            value={newRefType}
            onChange={(e) => setNewRefType(e.target.value as 'COURSE' | 'TERMINAL')}
            className="px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl font-mono-code text-xs text-slate-200 focus:outline-none focus:border-purple-400 cursor-pointer"
          >
            <option value="COURSE">Enrolled in Course (Counts toward 5)</option>
            <option value="TERMINAL">Purchased Terminal $55 (Counts toward 2)</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-military font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>ADD REFERRAL</span>
          </button>
        </form>

        {/* List of Logged Referrals */}
        {trackedReferrals.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="text-[11px] font-mono-code uppercase text-slate-400 font-bold">
              Your Recorded Referrals ({trackedReferrals.length}):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {trackedReferrals.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono-code"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        item.type === 'COURSE'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}
                    >
                      {item.type === 'COURSE' ? 'COURSE (1/5)' : 'TERMINAL (1/2)'}
                    </span>
                    <span className="text-slate-100 font-bold truncate">{item.studentName}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-amber-300">{item.dateAdded}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveReferredStudent(item.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Owner WhatsApp Contact & Direct Activation Bar */}
      <div className="bg-gradient-to-r from-emerald-950/50 via-slate-950 to-cyan-950/50 border border-emerald-500/40 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1 text-center sm:text-left">
          <div className="text-xs font-military font-bold tracking-wider text-emerald-300 uppercase flex items-center justify-center sm:justify-start gap-2">
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span>OFFICIAL OWNER WHATSAPP & DIRECT ACTIVATION</span>
          </div>
          <p className="text-xs font-mono-code text-slate-300">
            For <strong className="text-amber-300">$55 Lifetime Subscription</strong> or{' '}
            <strong className="text-purple-300">Lifetime Reward Referral Verification</strong>, contact via WhatsApp:
          </p>
          <div className="pt-1 flex items-center justify-center sm:justify-start gap-2">
            <span className="text-xs font-mono-code text-slate-400">WhatsApp Number:</span>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="text-base sm:text-lg font-mono-code font-black text-emerald-400 hover:text-emerald-300 underline decoration-emerald-500/50 tracking-wider"
            >
              03406671495 (+92 340 6671495)
            </a>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-military font-bold text-xs rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WHATSAPP: 03406671495</span>
          </a>
          <button
            onClick={() => {
              if (onContinueDemo) onContinueDemo();
              if (onClose) onClose();
            }}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono-code text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            EXPLORE DEMO
          </button>
          <button
            onClick={() => {
              if (onClose) onClose();
              if (onOpenLogin) onOpenLogin();
            }}
            className="px-4 py-2.5 bg-blue-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            LOGIN
          </button>
        </div>
      </div>
    </div>
  );
};
