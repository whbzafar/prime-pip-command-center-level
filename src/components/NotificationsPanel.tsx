import React, { useEffect, useState } from 'react';
import { Bell, X, Check, CheckCheck } from 'lucide-react';
import { getStoredToken } from '../utils/authClient';

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  isRead: boolean;
  timestamp: number;
}

interface Props {
  onClose: () => void;
  onNavigate: (link: string) => void;
}

export const NotificationsPanel: React.FC<Props> = ({ onClose, onNavigate }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = getStoredToken();
      if (!token) return;
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const markRead = async (id?: string) => {
    try {
      const token = getStoredToken();
      if (!token) return;
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ notifIds: id ? [id] : undefined })
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => 
          (id ? n.id === id : true) ? { ...n, isRead: true } : n
        ));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-[#020617] border-l border-slate-800 shadow-2xl z-50 flex flex-col font-mono-code animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-200 font-bold">
          <Bell className="w-4 h-4 text-cyan-400" />
          NOTIFICATIONS
        </div>
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.isRead) && (
            <button 
              onClick={() => markRead()}
              className="text-xs text-slate-400 hover:text-emerald-400 transition cursor-pointer"
              title="Mark all as read"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="text-center text-slate-500 text-xs py-10">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center text-slate-500 text-xs py-10">
            No notifications
          </div>
        ) : (
          notifications.map(n => (
            <div 
              key={n.id} 
              className={`p-3 rounded-xl border transition relative ${
                n.isRead 
                  ? 'bg-slate-950/50 border-slate-800 text-slate-400' 
                  : 'bg-slate-950 border-blue-500/30 text-slate-200'
              }`}
            >
              {!n.isRead && (
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              )}
              <h4 className={`text-xs font-bold mb-1 pr-6 ${!n.isRead ? 'text-cyan-400' : ''}`}>
                {n.title}
              </h4>
              <p className="text-xs mb-2">{n.body}</p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/50">
                <span className="text-[9px] text-slate-500">
                  {new Date(n.timestamp).toLocaleString()}
                </span>
                <div className="flex items-center gap-2">
                  {n.link && (
                    <button 
                      onClick={() => {
                        if (!n.isRead) markRead(n.id);
                        onNavigate(n.link!);
                        onClose();
                      }}
                      className="text-[10px] text-sky-400 hover:underline font-bold cursor-pointer"
                    >
                      VIEW
                    </button>
                  )}
                  {!n.isRead && (
                    <button 
                      onClick={() => markRead(n.id)}
                      className="text-[10px] text-emerald-400 hover:underline font-bold cursor-pointer"
                    >
                      MARK READ
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
