import React, { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, MessageSquare, Phone, Users, Volume2, VolumeX, X } from 'lucide-react';
import { UserAccount } from '../types';

type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  created_at: string;
  read_at?: string | null;
};

interface CommunicationNotificationsProps {
  currentUser?: UserAccount | null;
  onOpenCommunication?: () => void;
}

export const CommunicationNotifications: React.FC<CommunicationNotificationsProps> = ({ currentUser, onOpenCommunication }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [muted, setMuted] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toast, setToast] = useState<AppNotification | null>(null);
  const previousIds = useRef<Set<string>>(new Set());

  const playIncomingSound = () => {
    if (muted || !soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(660, context.currentTime + 0.14);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.09, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.18);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.2);
      window.setTimeout(() => void context.close(), 300);
    } catch {}
  };

  const load = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/notifications', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const next: AppNotification[] = data.notifications || [];
      const settings = data.settings || {};
      setNotifications(next);
      setMuted(Boolean(settings.muted));
      setSoundEnabled(settings.sound_enabled !== false);

      const newUnread = next.filter((item) => !item.read_at && !previousIds.current.has(item.id));
      if (previousIds.current.size > 0 && newUnread.length > 0) {
        const newest = newUnread[0];
        setToast(newest);
        playIncomingSound();
        window.setTimeout(() => setToast((current) => current?.id === newest.id ? null : current), 5000);
      }
      previousIds.current = new Set(next.map((item) => item.id));
    } catch {}
  };

  useEffect(() => {
    previousIds.current = new Set();
    load();
    const timer = window.setInterval(load, 1000);
    return () => window.clearInterval(timer);
  }, [currentUser?.id]);

  const updateSettings = async (nextMuted: boolean, nextSound: boolean) => {
    setMuted(nextMuted);
    setSoundEnabled(nextSound);
    try {
      await fetch('/api/notifications/settings', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ muted: nextMuted, soundEnabled: nextSound }),
      });
    } catch {}
  };

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
    } catch {}
  };

  if (!currentUser) return null;

  const unread = notifications.filter((item) => !item.read_at).length;

  const iconFor = (type: string) => {
    if (type === 'CALL') return <Phone className="w-4 h-4" />;
    if (type === 'GROUP' || type === 'GROUP_MESSAGE') return <Users className="w-4 h-4" />;
    return <MessageSquare className="w-4 h-4" />;
  };

  return (
    <>
      <div className="fixed top-3 right-3 z-[80] flex items-center gap-1.5">
        <button type="button" onClick={() => updateSettings(!muted, soundEnabled)} title={muted ? 'Unmute notifications' : 'Mute notifications'} className="relative p-2 rounded-xl bg-slate-950/95 border border-slate-700 text-slate-300 shadow-xl">
          {muted ? <BellOff className="w-4 h-4 text-rose-300" /> : <Bell className="w-4 h-4 text-cyan-300" />}
          {unread > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">{unread > 99 ? '99+' : unread}</span>}
        </button>
        <button type="button" onClick={() => updateSettings(muted, !soundEnabled)} title={soundEnabled ? 'Disable notification sound' : 'Enable notification sound'} className="p-2 rounded-xl bg-slate-950/95 border border-slate-700 text-slate-300 shadow-xl">
          {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-300" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
        </button>
      </div>

      {toast && (
        <div className="fixed top-14 right-3 z-[81] w-[min(360px,calc(100vw-1.5rem))] rounded-2xl bg-slate-950 border border-cyan-500/30 shadow-2xl p-3">
          <div className="flex items-start gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-cyan-300">{iconFor(toast.type)}</div>
            <button type="button" onClick={() => setToast(null)} className="ml-auto text-slate-500 hover:text-slate-200"><X className="w-4 h-4" /></button>
          </div>
          <button type="button" onClick={() => { markRead(toast.id); setToast(null); onOpenCommunication?.(); }} className="mt-2 text-left w-full">
            <div className="text-xs font-bold text-slate-100">{toast.title}</div>
            <div className="text-[11px] text-slate-400 mt-1">{toast.body}</div>
          </button>
        </div>
      )}
    </>
  );
};
