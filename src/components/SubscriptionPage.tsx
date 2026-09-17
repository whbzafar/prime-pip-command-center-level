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

export const SubscriptionPage: React.FC<SubscriptionPageProps> = ({
  onOpenLogin,
  onContinueDemo,
  appliedReferralCode,
  currentUser,
  onClose,
  onContactDeveloper,
}) => {
  const [referralInput, setReferralInput] = useState<string>(appliedReferralCode || getStoredReferral() || '');
  const [discountApplied, setDiscountApplied] = useState<boolean>(false);
  const [referrerName, setReferrerName] = useState<string>('');
  const [verifying, setVerifying] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

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
      setStatusMessage(`Referral verified! You receive the exclusive $40 trader access price (Referred by ${res.referrerName || codeToTest}).`);
    } else {
      setDiscountApplied(false);
      setStatusMessage('Invalid or unrecognized referral code. Standard $50 rate applies.');
    }
  };

  const whatsappMessage = discountApplied
    ? `Hello PrimePipFX, I want access to the PRIMEPIPFX Trading Command Center with referral code: ${referralInput.trim()} ($40 discounted access).`
    : `Hello PrimePipFX, I want access to the PRIMEPIPFX Trading Command Center.`;

  const whatsappUrl = `https://wa.me/923406671495?text=${encodeURIComponent(whatsappMessage)}`;

  const handleCopyUserReferral = () => {
    if (!currentUser) return;
    const refCode = currentUser.username;
    const link = `${window.location.origin}/?ref=${encodeURIComponent(refCode)}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
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
          PRIMEPIPFX TRADING COMMAND CENTER
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
                HAVE A TRADER REFERRAL CODE?
              </div>
              <p className="text-[11px] font-mono-code text-slate-400">
                Apply a referral code to unlock the $40 discounted access price!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={referralInput}
              onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
              placeholder="ENTER REFERRAL CODE"
              className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl font-mono-code text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 uppercase tracking-wider w-full sm:w-48 font-bold"
            />
            <button
              onClick={() => verifyReferral(referralInput)}
              disabled={verifying}
              className="px-4 py-2 bg-blue-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-xs rounded-xl transition-colors shrink-0 disabled:opacity-50"
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

      {/* Pricing Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <span className="text-4xl font-mono-code font-black text-slate-100">$50</span>
              <span className="text-xs font-mono-code text-slate-400">USD</span>
            </div>

            <p className="text-xs font-mono-code text-slate-400 mb-6">
              Complete access to all professional modules. Offline vault + cloud ready.
            </p>

            <ul className="space-y-2.5 text-xs font-mono-code text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Isolated Trading Journal</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Master 1% Risk Engine</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Dedicated Lot Size Calculator</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Audio Lockout & Circuit Breaker</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>AI Trading Coach & SMC Auditor</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 font-military font-bold text-xs tracking-wider uppercase rounded-xl transition-colors flex items-center justify-center gap-2 border border-slate-700"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              SUBSCRIBE ($50)
            </a>
          </div>
        </div>

        {/* Tier 2: Referral Discount Access (Prime Gradient Treatment) */}
        <div className="prime-gradient-box p-6 flex flex-col justify-between relative shadow-2xl">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-military font-bold text-[10px] uppercase tracking-wider shadow-md">
            RECOMMENDED FOR TRADERS
          </div>

          <div>
            <div className="flex items-center justify-between mb-4 mt-1">
              <span className="text-xs font-military font-bold text-cyan-400 uppercase tracking-wider">
                REFERRAL ACCESS
              </span>
              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-lg bg-blue-500/20 text-amber-300 font-bold border border-blue-500/30">
                SAVE $10
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-mono-code font-black text-amber-300">$40</span>
              <span className="text-xs font-mono-code text-slate-400 line-through">$50</span>
              <span className="text-xs font-mono-code text-emerald-400 font-bold">20% OFF</span>
            </div>

            <p className="text-xs font-mono-code text-slate-300 mb-6">
              Unlocked via valid trader referral code. Full institutional command center access with discount.
            </p>

            <ul className="space-y-2.5 text-xs font-mono-code text-slate-200">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Everything in Standard Access</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Discounted $40 Entry Rate</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Personal Referral Code to Earn Lifetime</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Priority Developer Onboarding</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800/80">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-military font-bold text-xs tracking-wider uppercase rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
            >
              <MessageCircle className="w-4 h-4 text-slate-950" />
              <span>{discountApplied ? 'CLAIM $40 ACCESS ON WHATSAPP' : 'GET ACCESS ($40 VIA REFERRAL)'}</span>
            </a>
          </div>
        </div>

        {/* Tier 3: Lifetime Referral Reward / Member Stats */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-military font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5" />
                LIFETIME REWARD
              </span>
              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                EARN FREE
              </span>
            </div>

            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-mono-code font-black text-purple-300">FREE</span>
              <span className="text-xs font-mono-code text-slate-400">LIFETIME</span>
            </div>

            <p className="text-xs font-mono-code text-slate-400 mb-4">
              When you join and refer another paying trader using your unique referral code:
            </p>

            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl mb-4 text-xs font-mono-code text-purple-200">
              <span className="font-bold block mb-1">🎁 REFERRAL BONUS RULE:</span>
              Once your referred trader activates their subscription, your account is automatically upgraded to <span className="text-cyan-400 font-bold">LIFETIME FREE ACCESS</span>!
            </div>

            {currentUser ? (
              <div className="space-y-3 bg-slate-950/80 p-3.5 rounded-xl border border-purple-500/30 font-mono-code text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Your User:</span>
                  <span className="font-bold text-slate-200">{currentUser.username}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Referral Code:</span>
                  <span className="font-bold text-cyan-400 uppercase">{currentUser.username}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Account Status:</span>
                  <span className="font-bold text-emerald-400">{currentUser.subscriptionStatus}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUserReferral}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 text-xs transition mt-2"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'REFERRAL LINK COPIED!' : 'COPY MY REFERRAL LINK'}</span>
                </button>
              </div>
            ) : (
              <ul className="space-y-2.5 text-xs font-mono-code text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Zero Subscription Fees Forever</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>All Future Updates & Models</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Never Expires</span>
                </li>
              </ul>
            )}
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800">
            {currentUser ? (
              <div className="text-center text-[11px] font-mono-code text-emerald-400">
                ✓ Logged in as {currentUser.username} • Referral tracking active
              </div>
            ) : (
              <button
                onClick={() => {
                  if (onOpenLogin) {
                    if (onClose) onClose();
                    onOpenLogin();
                  }
                }}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-purple-300 font-military font-bold text-xs tracking-wider uppercase rounded-xl transition-colors flex items-center justify-center gap-2 border border-slate-700"
              >
                <Lock className="w-3.5 h-3.5" />
                LOGIN TO VIEW REFERRAL STATS
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Developer Contact Card */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="text-xs font-military font-bold tracking-wider text-slate-200 uppercase">
            DIRECT DEVELOPER / OWNER ACTIVATION
          </div>
          <p className="text-xs font-mono-code text-slate-400 mt-0.5">
            Accounts are activated directly by the owner. WhatsApp:{' '}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 font-bold hover:underline"
            >
              03406671495
            </a>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (onContinueDemo) onContinueDemo();
              if (onClose) onClose();
            }}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono-code text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            CONTINUE IN DEMO MODE
          </button>
          <button
            onClick={() => {
              if (onClose) onClose();
              if (onOpenLogin) onOpenLogin();
            }}
            className="px-4 py-2.5 bg-blue-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            ALREADY SUBSCRIBED? LOGIN
          </button>
        </div>
      </div>
    </div>
  );
};
