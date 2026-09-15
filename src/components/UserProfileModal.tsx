import React, { useState, useRef } from 'react';
import {
  User,
  Camera,
  Check,
  X,
  Upload,
  Sparkles,
  Shield,
  Activity,
  Award,
} from 'lucide-react';
import { UserAccount } from '../types';
import { setStoredUser } from '../utils/authClient';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserAccount | null;
  onUpdateUser: (updated: UserAccount) => void;
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
}) => {
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [tradingStyle, setTradingStyle] = useState(user?.tradingStyle || 'Day Trader');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [onlineStatus, setOnlineStatus] = useState<'ONLINE' | 'AWAY' | 'OFFLINE'>(
    user?.onlineStatus || 'ONLINE'
  );
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen || !user) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (under 3MB)
    if (file.size > 3 * 1024 * 1024) {
      alert('Avatar image must be under 3MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setAvatarUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
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
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
                Trader Profile & Identity
              </h3>
              <p className="text-[10px] text-slate-400 font-mono-code">
                Manage your public avatar, bio, and live status
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Avatar Upload & Selection */}
        <div className="space-y-3">
          <label className="text-xs font-mono-code text-slate-300 font-bold block uppercase">
            Profile Avatar
          </label>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="w-16 h-16 rounded-full border-2 border-amber-500/80 overflow-hidden bg-slate-950 flex items-center justify-center shadow-lg">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Trader Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-amber-400" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Upload Photo"
                className="absolute bottom-0 right-0 p-1.5 rounded-full bg-amber-500 text-slate-950 hover:bg-amber-400 transition shadow cursor-pointer"
              >
                <Camera className="w-3 h-3 stroke-[2.5]" />
              </button>
            </div>

            <div className="space-y-1.5 flex-1">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-slate-100 hover:border-slate-700 text-xs font-mono-code flex items-center gap-1.5 transition cursor-pointer"
              >
                <Upload className="w-3 h-3 text-amber-400" />
                <span>Upload Custom Image</span>
              </button>
              <span className="text-[10px] text-slate-500 font-mono-code block">
                PNG, JPG or WEBP under 3MB
              </span>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="pt-1">
            <span className="text-[10px] text-slate-400 font-mono-code block mb-1.5">
              Or choose a preset trader avatar:
            </span>
            <div className="flex items-center gap-2">
              {PRESET_AVATARS.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setAvatarUrl(url)}
                  className={`w-8 h-8 rounded-full overflow-hidden border-2 transition cursor-pointer ${
                    avatarUrl === url
                      ? 'border-amber-500 scale-110 shadow-md ring-2 ring-amber-400/40'
                      : 'border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'
                  }`}
                >
                  <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Online Status Toggle */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono-code text-slate-300 font-bold block uppercase">
            Online Presence
          </label>
          <div className="grid grid-cols-3 gap-2 font-mono-code text-xs">
            {[
              { id: 'ONLINE', label: 'Online', dot: 'bg-emerald-400' },
              { id: 'AWAY', label: 'Away / Charts', dot: 'bg-amber-400' },
              { id: 'OFFLINE', label: 'Invisible', dot: 'bg-slate-500' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setOnlineStatus(st.id as any)}
                className={`py-2 px-3 rounded-lg border flex items-center gap-2 justify-center transition cursor-pointer ${
                  onlineStatus === st.id
                    ? 'bg-slate-950 border-amber-500 text-amber-300 font-bold shadow-md'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                <span className="text-[11px]">{st.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Name & Bio */}
        <div className="space-y-3 font-mono-code text-xs">
          <div>
            <label className="text-slate-300 font-bold block mb-1 uppercase text-[11px]">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Master Trader Farhan"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-slate-300 font-bold block mb-1 uppercase text-[11px]">
              Trading Style / Methodology
            </label>
            <input
              type="text"
              value={tradingStyle}
              onChange={(e) => setTradingStyle(e.target.value)}
              placeholder="e.g. ICT SBT Model | London & NY Session Scalper"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500"
            />
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
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-mono-code text-slate-400">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Role: <strong className="text-slate-200">{user.role}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono-code transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-military font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition cursor-pointer"
            >
              {isSavedNotice ? <Check className="w-3.5 h-3.5" /> : null}
              <span>{isSavedNotice ? 'SAVED!' : 'SAVE PROFILE'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
