import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  User,
  Camera,
  Check,
  X,
  Upload,
  Shield,
  Compass,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { UserAccount } from '../types';
import { setStoredUser } from '../utils/authClient';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserAccount | null;
  onUpdateUser: (updated: UserAccount) => void;
  onStartWalkthrough?: () => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  onStartWalkthrough,
}) => {
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [tradingStyle, setTradingStyle] = useState(user?.tradingStyle || 'Day Trader');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [onlineStatus, setOnlineStatus] = useState<'ONLINE' | 'AWAY' | 'OFFLINE'>(
    user?.onlineStatus || 'ONLINE'
  );
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state whenever user or modal open changes
  useEffect(() => {
    if (user && isOpen) {
      setName(user.name || '');
      setBio(user.bio || '');
      setTradingStyle(user.tradingStyle || 'Day Trader');
      setAvatarUrl(user.avatarUrl || '');
      setOnlineStatus(user.onlineStatus || 'ONLINE');
      setUploadError(null);
    }
  }, [user, isOpen]);

  // Body scroll lock while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Read and compress image using an offscreen canvas to avoid storage overflow and ensure instant rendering
    const reader = new FileReader();
    reader.onerror = () => {
      setUploadError('Failed to read image file. Please try another image.');
    };
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (!src) return;

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 400; // Optimal square size for avatar
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            setAvatarUrl(src);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setAvatarUrl(compressedDataUrl);
          setUploadError(null);
        } catch (err) {
          console.warn('Canvas resizing failed, using original source:', err);
          setAvatarUrl(src);
        }
      };
      img.onerror = () => {
        setUploadError('Invalid image file. Please select PNG, JPG, or WebP.');
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl('');
    setUploadError(null);
  };

  const handleSave = () => {
    const updated: UserAccount = {
      ...user,
      name: name.trim() || user.name,
      bio: bio.trim(),
      tradingStyle: tradingStyle.trim(),
      avatarUrl: avatarUrl || undefined,
      onlineStatus,
      updatedAt: new Date().toISOString(),
    };

    setStoredUser(updated);
    onUpdateUser(updated);

    setIsSavedNotice(true);
    setTimeout(() => {
      setIsSavedNotice(false);
      onClose();
    }, 600);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] bg-[#090E1A] border border-slate-700/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#060911]/95">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-cyan-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 id="profile-modal-title" className="text-sm sm:text-base font-military font-bold text-slate-100 uppercase tracking-wider">
                Trader Profile & Identity
              </h3>
              <p className="text-[10px] text-slate-400 font-mono-code">
                Manage your public avatar, bio, and live status
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 overscroll-contain">
          {/* Avatar Upload & Selection */}
          <div className="space-y-2.5 bg-slate-950/70 p-3 sm:p-3.5 rounded-xl border border-slate-800/80">
            <label className="text-xs font-mono-code text-slate-300 font-bold block uppercase tracking-wide">
              Profile Avatar
            </label>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative group shrink-0">
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border-2 border-cyan-400/80 overflow-hidden bg-slate-950 flex items-center justify-center shadow-lg">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Trader Avatar Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-cyan-400" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload / Change Photo"
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-cyan-400 text-slate-950 hover:bg-cyan-300 transition shadow cursor-pointer active:scale-95"
                >
                  <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-cyan-300 hover:bg-blue-500/25 text-xs font-mono-code flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{avatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/30 text-xs font-mono-code flex items-center gap-1 transition cursor-pointer"
                      title="Remove custom photo"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 font-mono-code block">
                  PNG, JPG or WebP (auto-optimized)
                </span>
                {uploadError && (
                  <div className="text-[11px] text-rose-400 flex items-center gap-1 font-mono-code">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Presets */}
            <div className="pt-2 border-t border-slate-800/60">
              <span className="text-[10px] text-slate-400 font-mono-code block mb-1.5">
                Or select a preset avatar:
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_AVATARS.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAvatarUrl(url);
                      setUploadError(null);
                    }}
                    className={`w-9 h-9 rounded-full overflow-hidden border-2 transition hover:scale-110 cursor-pointer ${
                      avatarUrl === url
                        ? 'border-cyan-400 shadow-md shadow-cyan-400/30 ring-2 ring-cyan-400/40'
                        : 'border-slate-800 hover:border-slate-600 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={url}
                      alt={`Preset ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Online Presence Status */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-bold block uppercase text-[11px] font-mono-code">
              Live Presence Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'ONLINE', label: 'Online', color: 'bg-emerald-400' },
                  { id: 'AWAY', label: 'Away / Charts', color: 'bg-cyan-400' },
                  { id: 'OFFLINE', label: 'Invisible', color: 'bg-slate-500' },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setOnlineStatus(s.id)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono-code flex items-center justify-center gap-2 transition cursor-pointer ${
                    onlineStatus === s.id
                      ? 'bg-blue-500/15 border-cyan-400/70 text-cyan-300 font-bold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${s.color}`} />
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Profile Details Inputs */}
          <div className="space-y-3 font-mono-code text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-slate-300 font-bold block mb-1 uppercase text-[11px]">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tactical Trader"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-400 text-xs sm:text-sm font-sans transition"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1 uppercase text-[11px]">
                  Trading Style
                </label>
                <input
                  type="text"
                  value={tradingStyle}
                  onChange={(e) => setTradingStyle(e.target.value)}
                  placeholder="e.g. Intraday Scalper, SBT Model 1"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-400 text-xs sm:text-sm font-sans transition"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1 uppercase text-[11px]">
                Trader Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                placeholder="Tell other community members about your journey, model, or risk philosophy..."
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-400 resize-none text-xs sm:text-sm font-sans transition"
              />
            </div>
          </div>

          {/* Guided Walkthrough Banner */}
          {onStartWalkthrough && (
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
                  <Compass className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-military font-bold text-slate-200 truncate">SYSTEM TOUR & 21 CATEGORIES</p>
                  <p className="text-[11px] font-mono-code text-slate-400 truncate">Replay orientation walkthrough anytime</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartWalkthrough();
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 text-xs font-mono-code font-bold transition cursor-pointer shrink-0"
              >
                START TOUR
              </button>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-t border-slate-800 flex items-center justify-between shrink-0 bg-[#060911]/95">
          <div className="flex items-center gap-1.5 text-xs font-mono-code text-slate-400">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>Role: <strong className="text-slate-200">{user.role}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono-code transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-military font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-400/20 transition cursor-pointer active:scale-95"
            >
              {isSavedNotice ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
              <span>{isSavedNotice ? 'SAVED!' : 'SAVE PROFILE'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
