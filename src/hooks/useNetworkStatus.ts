import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  lastOnlineTime: string;
  isChecking: boolean;
  checkConnection: () => Promise<boolean>;
}

export const useNetworkStatus = (): NetworkStatus => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [lastOnlineTime, setLastOnlineTime] = useState<string>(() => new Date().toISOString());
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      return false;
    }
    setIsChecking(true);
    try {
      // Lightweight heartbeat ping to verify real server reachability
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeoutId);

      const reachable = res ? res.ok || res.status < 500 : navigator.onLine;
      setIsOnline(reachable);
      if (reachable) {
        setLastOnlineTime(new Date().toISOString());
      }
      setIsChecking(false);
      return reachable;
    } catch {
      // If server unreachable but browser says online, allow graceful degraded online state
      const fallback = typeof navigator !== 'undefined' ? navigator.onLine : true;
      setIsOnline(fallback);
      setIsChecking(false);
      return fallback;
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      checkConnection();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic heartbeat check every 30 seconds
    const interval = setInterval(() => {
      checkConnection();
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [checkConnection]);

  return {
    isOnline,
    lastOnlineTime,
    isChecking,
    checkConnection,
  };
};
