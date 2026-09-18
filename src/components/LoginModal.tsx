import React, { useState } from 'react';
import {
  Lock,
  User,
  KeyRound,
  Shield,
  MessageCircle,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { apiLogin, apiChangePassword, setStoredUser } from '../utils/authClient';
import { UserAccount } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: UserAccount, token: string) => void;
  onLoginSuccess?: (user: UserAccount, token?: string) => void;
  onOpenSubscription?: () => void;
  onContinueDemo?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onLoginSuccess,
  onOpenSubscription,
  onContinueDemo,
}) => {
  const [step, setStep] = useState<'LOGIN' | 'CHANGE_PASSWORD'>('LOGIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // First-time password change state
  const [pendingUser, setPendingUser] = useState<UserAccount | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeSuccess, setChangeSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await apiLogin(username.trim(), password.trim(), rememberMe);
    setLoading(false);

    if (result.ok && result.user && result.token) {
      if (onSuccess) onSuccess(result.user, result.token);
      if (onLoginSuccess) onLoginSuccess(result.user, result.token);
      onClose();
    } else {
      setError(result.error || 'Authentication failed. Please verify your credentials.');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);

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
        if (onSuccess) onSuccess(updatedUser, tokenToUse);
        if (onLoginSuccess) onLoginSuccess(updatedUser, tokenToUse);
        onClose();
      }, 1000);
    } else {
      setError(res.error || 'Failed to update password. Please try again.');
    }
  };

  const whatsappLink = `https://wa.me/923406671495?text=${encodeURIComponent(
    'Hello PrimePipFX, I want access to the PRIMEPIPFX Trading Command Center.'
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-md prime-gradient-box p-6 sm:p-8 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Decorative corner glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-100 transition rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-700/60 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-cyan-400 mb-3 shadow-lg shadow-blue-500/10">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-military font-bold tracking-wider text-slate-100 uppercase">
            {step === 'CHANGE_PASSWORD' ? 'CHANGE DEVELOPER PASSWORD' : 'PRIMEPIPFX TRADING COMMAND CENTER'}
          </h2>
          <p className="text-xs text-slate-400 font-mono-code mt-1">
            {step === 'CHANGE_PASSWORD'
              ? 'First login detected. Set your private permanent password.'
              : 'Authorized Trader & Developer Access'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono-code flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {changeSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono-code flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Password updated successfully! Launching Command Center...</span>
          </div>
        )}

        {step === 'CHANGE_PASSWORD' ? (
          /* First-time Change Password Form */
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="text-xs font-mono-code text-slate-300 font-bold block mb-1.5 uppercase">
                New Permanent Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl font-mono-code text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
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
              <label className="text-xs font-mono-code text-slate-300 font-bold block mb-1.5 uppercase">
                Confirm Permanent Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl font-mono-code text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
                />
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || changeSuccess}
              className="w-full mt-2 py-3 bg-gradient-to-r from-blue-500 to-amber-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-military font-bold text-xs tracking-wider uppercase rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              {loading ? 'SAVING PERMANENT PASSWORD...' : 'SET PASSWORD & ENTER COMMAND CENTER'}
            </button>
          </form>
        ) : (
          /* Standard Login Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-mono-code text-slate-300 font-bold block mb-1.5 uppercase">
                Username or ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  autoCapitalize="none"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. primepipfx-admin or customer ID"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl font-mono-code text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono-code text-slate-300 font-bold block mb-1.5 uppercase">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl font-mono-code text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
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

            {/* Persistent Session / Remember Me option */}
            <div className="flex items-center justify-between py-1 px-1">
              <label className="flex items-center gap-2 text-xs font-mono-code text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-blue-500 focus:ring-0 focus:ring-offset-0 accent-blue-500 cursor-pointer"
                />
                <span>Remember me on this device</span>
              </label>
              <span className="text-[10px] text-emerald-400 font-mono-code font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                PERSISTENT
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-gradient-to-r from-blue-500 to-amber-600 hover:from-cyan-400 hover:to-blue-500 active:scale-95 text-slate-950 font-military font-bold text-xs tracking-wider uppercase rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{loading ? 'AUTHENTICATING...' : 'LOGIN TO COMMAND CENTER'}</span>
            </button>
          </form>
        )}

        {/* Demo Mode Button & Help */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col gap-2.5">
          {step === 'LOGIN' && (
            <button
              type="button"
              onClick={() => {
                if (onContinueDemo) onContinueDemo();
                onClose();
              }}
              className="w-full py-2.5 bg-slate-950/90 hover:bg-slate-800 active:scale-95 text-slate-300 font-mono-code text-xs font-bold rounded-xl border border-slate-800 hover:border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>EXPLORE IN DEMO / PREVIEW MODE</span>
            </button>
          )}

          {/* Need Access / WhatsApp */}
          <div className="text-center pt-2">
            <p className="text-[11px] font-mono-code text-slate-400 mb-2">
              Need authorized account credentials?
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenSubscription) onOpenSubscription();
                }}
                className="text-xs font-mono-code text-cyan-400 hover:text-amber-300 font-bold underline decoration-blue-500/40"
              >
                SUBSCRIBE / GET ACCESS
              </button>
              <span className="text-slate-600">•</span>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono-code text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp: 03406671495
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
