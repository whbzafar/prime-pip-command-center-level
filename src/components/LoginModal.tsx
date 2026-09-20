import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Lock,
  User,
  KeyRound,
  Shield,
  MessageCircle,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X,
  ArrowRight,
  Cloud,
} from 'lucide-react';
import { apiLogin, apiChangePassword, setStoredUser } from '../utils/authClient';
import { UserAccount } from '../types';
import { googleDriveService } from '../services/googleDriveService';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: UserAccount, token?: string) => void;
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
  const [step, setStep] = useState<'LOGIN' | 'CHANGE_PASSWORD' | 'LINK_STORAGE'>('LOGIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [linkingDrive, setLinkingDrive] = useState(false);
  const [driveLinkSuccess, setDriveLinkSuccess] = useState(false);

  // First-time password change state
  const [pendingUser, setPendingUser] = useState<UserAccount | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeSuccess, setChangeSuccess] = useState(false);

  // Body scroll lock while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const triggerBurst = () => {
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#00f0ff', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
      });
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
        if (result.user.mustChangePassword) {
          setPendingUser(result.user);
          setPendingToken(result.token || null);
          setStep('CHANGE_PASSWORD');
          setPassword('');
          setNewPassword('');
          setConfirmPassword('');
          return;
        }

        proceedAfterAuth(result.user, result.token);
      } else {
        setError(result.error || 'Authentication failed. Please verify your credentials.');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Authentication error. Please try again.');
    }
  };

  const proceedAfterAuth = (user: UserAccount, token?: string) => {
    googleDriveService.setCurrentUserId(user.id);
    const alreadyPrompted = googleDriveService.hasPromptedInitialLink(user.id);
    const alreadyConnected = googleDriveService.isConnected();

    // The option to link the account should appear ONLY during initial login without prompting repeatedly afterward
    if (!alreadyPrompted && !alreadyConnected) {
      setPendingUser(user);
      setPendingToken(token || null);
      setStep('LINK_STORAGE');
      return;
    }

    if (onSuccess) onSuccess(user, token);
    if (onLoginSuccess) onLoginSuccess(user, token);
    onClose();
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
          if (onSuccess) onSuccess(pendingUser, pendingToken || undefined);
          if (onLoginSuccess) onLoginSuccess(pendingUser, pendingToken || undefined);
          onClose();
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
      // Mark as prompted so never prompted again
      googleDriveService.setPromptedInitialLink(pendingUser.id, true);
      if (onSuccess) onSuccess(pendingUser, pendingToken || undefined);
      if (onLoginSuccess) onLoginSuccess(pendingUser, pendingToken || undefined);
      onClose();
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

  const whatsappLink = `https://wa.me/923406671495?text=${encodeURIComponent(
    'Hello PrimePipFX, I want access to the PRIMEPIPFX Trading Command Center.'
  )}`;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md overflow-y-auto p-4 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Dynamic Ambient Blur Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md my-auto"
      >
        {/* Iridescent Rim Glow */}
        <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-r from-cyan-500 via-blue-600 to-amber-500 opacity-80 blur-[2px]" />

        {/* Card Body */}
        <div className="relative rounded-3xl bg-slate-950/95 border border-white/10 p-5 sm:p-7 shadow-2xl backdrop-blur-2xl overflow-hidden">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 cursor-pointer z-20"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="text-center mb-5 relative z-10">
            <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 mb-2.5 shadow-lg shadow-cyan-500/15">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-lg sm:text-xl font-military font-bold tracking-wider text-slate-100 uppercase">
              {step === 'CHANGE_PASSWORD' ? 'CONFIGURE PERMANENT PASSWORD' : 'PRIMEPIPFX COMMAND CENTER'}
            </h2>
            <p className="text-xs text-slate-400 font-mono-code mt-0.5">
              {step === 'CHANGE_PASSWORD'
                ? 'First login detected. Set your personal permanent password.'
                : 'Authorized Trader & Developer Access'}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono-code flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Success Alert */}
          {changeSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono-code flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Password updated successfully! Entering Command Center...</span>
            </motion.div>
          )}

          {step === 'CHANGE_PASSWORD' ? (
            /* First-time Change Password Form */
            <form onSubmit={handlePasswordChange} className="space-y-4 relative z-10">
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
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-900 border border-slate-700 rounded-xl font-mono-code text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
                  />
                  <KeyRound className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200"
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
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl font-mono-code text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
                  />
                  <KeyRound className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || changeSuccess}
                className="w-full mt-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-military font-bold text-xs tracking-wider uppercase rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                {loading ? 'SAVING PERMANENT PASSWORD...' : 'SET PASSWORD & ENTER COMMAND CENTER'}
              </button>
            </form>
          ) : step === 'LINK_STORAGE' ? (
            /* First-login Google Drive Cloud Linking */
            <div className="space-y-4 relative z-10">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-teal-500/5 to-cyan-500/10 border border-emerald-500/30 text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
                  <Cloud className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="text-sm font-military font-bold text-white uppercase tracking-wider">
                  Free Automatic Cloud Storage
                </h3>
                <p className="text-xs text-slate-300 font-sans mt-1 leading-relaxed">
                  Link your personal Google Drive for free automatic backup of all your journals, trades, and configurations without needing your own hosting.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 text-xs font-mono-code text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Auto-save your journal and trades in background</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Access and download your stored records anytime</span>
                </div>
              </div>

              {driveLinkSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono-code flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Google Drive linked successfully! Entering...</span>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  disabled={linkingDrive || driveLinkSuccess}
                  onClick={handleLinkDrive}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-military font-bold text-xs tracking-wider uppercase rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Cloud className="w-4 h-4" />
                  <span>{linkingDrive ? 'CONNECTING DRIVE...' : 'LINK GOOGLE DRIVE & CONTINUE'}</span>
                </button>

                <button
                  type="button"
                  disabled={linkingDrive || driveLinkSuccess}
                  onClick={handleSkipDriveLink}
                  className="w-full py-2 bg-transparent hover:bg-slate-900 text-slate-400 hover:text-slate-200 font-mono-code text-xs rounded-xl transition cursor-pointer text-center"
                >
                  Skip for Now
                </button>
              </div>
            </div>
          ) : (
            /* Standard Login Form */
            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
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
                    placeholder="e.g. primepipfx-admin or username"
                    className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700/80 rounded-xl font-mono-code text-base sm:text-sm text-slate-100 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  />
                  <User className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3.5" />
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
                    className="w-full pl-10 pr-11 py-3 bg-slate-900 border border-slate-700/80 rounded-xl font-mono-code text-base sm:text-sm text-slate-100 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  />
                  <KeyRound className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3.5" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200"
                    aria-label="Toggle password visibility"
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
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 accent-cyan-500 cursor-pointer"
                  />
                  <span>Remember on this device</span>
                </label>
                <span className="text-[10px] text-emerald-400 font-mono-code font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  PERSISTENT
                </span>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-military font-bold text-sm tracking-wider uppercase rounded-xl transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                <span>{loading ? 'AUTHENTICATING...' : 'ENTER COMMAND CENTER'}</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </form>
          )}

          {/* Demo Mode Button & Help */}
          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col gap-2.5 relative z-10">
            {step === 'LOGIN' && (
              <button
                type="button"
                onClick={() => {
                  triggerBurst();
                  if (onContinueDemo) onContinueDemo();
                  onClose();
                }}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono-code text-xs font-bold rounded-xl border border-slate-700 hover:border-cyan-500/40 transition flex items-center justify-center gap-2 cursor-pointer"
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
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenSubscription) onOpenSubscription();
                  }}
                  className="text-xs font-mono-code text-cyan-400 hover:text-cyan-300 font-bold underline decoration-cyan-500/40 cursor-pointer"
                >
                  SUBSCRIBE / GET ACCESS
                </button>
                <span className="text-slate-600">•</span>
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
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
