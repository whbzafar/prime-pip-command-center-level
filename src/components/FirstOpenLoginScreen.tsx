import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  KeyRound,
  Shield,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  MessageCircle,
} from 'lucide-react';
import { apiLogin, apiChangePassword, setStoredUser, checkAndHandleActivationLink, getStoredToken } from '../utils/authClient';
import { syncStudentsFromCloud } from '../utils/localAuthStore';
import { UserAccount } from '../types';

interface FirstOpenLoginScreenProps {
  onLoginSuccess: (user: UserAccount, token: string) => void;
  onExploreDemo: () => void;
  onOpenSubscription?: () => void;
}

export const FirstOpenLoginScreen: React.FC<FirstOpenLoginScreenProps> = ({
  onLoginSuccess,
  onExploreDemo,
  onOpenSubscription,
}) => {
  const [step, setStep] = useState<'LOGIN' | 'CHANGE_PASSWORD'>('LOGIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // First-time developer/customer password change state
  const [pendingUser, setPendingUser] = useState<UserAccount | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeSuccess, setChangeSuccess] = useState(false);

  useEffect(() => {
    // Check for 1-click activation link in URL (?activate=username&key=password)
    checkAndHandleActivationLink().then((activatedUser) => {
      if (activatedUser) {
        onLoginSuccess(activatedUser, getStoredToken() || 'token');
      }
    });
    // Pre-sync latest registered student credentials from Cloud KV (Vercel support)
    syncStudentsFromCloud().catch(() => {});
  }, []);

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

      if (result.ok && result.user && result.token) {
        // If account requires immediate password change (Section 3)
        if (result.user.mustChangePassword) {
          setPendingUser(result.user);
          setPendingToken(result.token);
          setStep('CHANGE_PASSWORD');
          return;
        }

        onLoginSuccess(result.user, result.token);
      } else {
        setError(result.error || 'Invalid credentials. Please verify username and password.');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Authentication error. Please try again.');
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
        setChangeSuccess(true);
        const tokenToUse = res.token || pendingToken || '';
        const updatedUser: UserAccount = res.user || {
          ...pendingUser,
          mustChangePassword: false,
        };
        setStoredUser(updatedUser);

        setTimeout(() => {
          onLoginSuccess(updatedUser, tokenToUse);
        }, 1000);
      } else {
        setError(res.error || 'Failed to update password. Please try again.');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Failed to update password.');
    }
  };

  const whatsappLink = `https://wa.me/923406671495?text=${encodeURIComponent(
    'Hello PrimePipFX Developer / Owner, I want authorized access to the PRIMEPIPFX Trading Command Center.'
  )}`;

  return (
    <div className="min-h-screen w-full bg-[#070A11] flex items-center justify-center p-4 relative overflow-hidden selection:bg-amber-500/30 selection:text-amber-200">
      {/* Background Ambience & Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Authentication Card with signature Prime Animated Gradient Border */}
      <div className="relative w-full max-w-md prime-gradient-box p-6 sm:p-8 shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Subtle Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-amber-500" />

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3 shadow-lg shadow-amber-500/15">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-military font-black tracking-wider text-slate-100 uppercase">
            PRIMEPIPFX
          </h1>
          <h2 className="text-sm font-military font-bold tracking-widest text-amber-400 uppercase mt-0.5">
            TRADING COMMAND CENTER
          </h2>
          <p className="text-xs text-slate-400 font-mono-code mt-1.5">
            {step === 'CHANGE_PASSWORD'
              ? 'First login detected. Set your private permanent password.'
              : 'Institutional Risk, Discipline & Execution Terminal'}
          </p>
        </div>

        {/* Error Alert Banner */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono-code flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert Banner */}
        {changeSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono-code flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Password updated securely. Launching Command Center...</span>
          </div>
        )}

        {/* Step 1: Login Form */}
        {step === 'LOGIN' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono-code text-slate-400 uppercase mb-1.5 font-bold">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. primepipfx-admin or trader_alex"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/90 border border-slate-700/80 rounded-xl font-mono-code text-sm text-slate-100 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all placeholder:text-slate-600"
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono-code text-slate-400 uppercase mb-1.5 font-bold">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/90 border border-slate-700/80 rounded-xl font-mono-code text-sm text-slate-100 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all placeholder:text-slate-600"
                />
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Persistent Session / Remember Me option */}
            <div className="flex items-center justify-between py-1 px-1">
              <label className="flex items-center gap-2 text-xs font-mono-code text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 focus:ring-offset-0 accent-amber-500 cursor-pointer"
                />
                <span>Remember me on this device</span>
              </label>
              <span className="text-[10px] text-emerald-400 font-mono-code font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                PERSISTENT
              </span>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-military font-bold text-xs tracking-wider uppercase rounded-xl transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{loading ? 'AUTHENTICATING...' : 'LOGIN'}</span>
            </button>

            {/* Explore Demo Mode Button */}
            <button
              type="button"
              onClick={onExploreDemo}
              className="w-full py-2.5 bg-slate-950/80 hover:bg-slate-800 active:scale-95 text-slate-300 font-mono-code text-xs font-bold rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>EXPLORE DEMO MODE</span>
            </button>
          </form>
        ) : (
          /* Step 2: First-Login Password Change Form (Section 3) */
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono-code leading-relaxed">
              Welcome <strong>{pendingUser?.username}</strong>! For system security, please create your personal permanent password.
            </div>

            <div>
              <label className="block text-xs font-mono-code text-slate-400 uppercase mb-1 font-bold">
                New Permanent Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl font-mono-code text-sm text-slate-100 focus:outline-none focus:border-amber-400 transition-all"
                />
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono-code text-slate-400 uppercase mb-1 font-bold">
                Confirm Permanent Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl font-mono-code text-sm text-slate-100 focus:outline-none focus:border-amber-400 transition-all"
                />
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || changeSuccess}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-military font-bold text-xs tracking-wider uppercase rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'SECURING ACCOUNT...' : 'SET PASSWORD & ENTER COMMAND CENTER'}</span>
            </button>
          </form>
        )}

        {/* Footer Support & WhatsApp */}
        <div className="mt-6 pt-5 border-t border-slate-800 text-center">
          <p className="text-[11px] font-mono-code text-slate-400 mb-2">
            Need authorized account credentials or enrollment?
          </p>
          <div className="flex items-center justify-center gap-2">
            {onOpenSubscription && (
              <>
                <button
                  type="button"
                  onClick={onOpenSubscription}
                  className="text-xs font-mono-code text-amber-400 hover:text-amber-300 font-bold underline decoration-amber-500/40"
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
              className="text-xs font-mono-code text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp: 03406671495</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
