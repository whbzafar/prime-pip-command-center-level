import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../utils/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono-code font-bold transition border ${
        isOnline
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          : 'bg-blue-500/15 border-blue-500/40 text-amber-300 animate-pulse'
      }`}
      title={isOnline ? 'Online - Local Database synced' : 'Offline mode active - All core operations fully operational locally'}
    >
      {isOnline ? (
        <>
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="hidden sm:inline">ONLINE</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3 text-cyan-400" />
          <span>OFFLINE (JOURNAL ACTIVE)</span>
        </>
      )}
    </div>
  );
};
