import React, { useState, useEffect } from 'react';
import { fundamentalsService } from '../../services';

export interface DataSourceIndicatorProps {
  className?: string;
  showToggle?: boolean;
}

export const DataSourceIndicator: React.FC<DataSourceIndicatorProps> = ({
  className = '',
  showToggle = false,
}) => {
  const [meta, setMeta] = useState<{ isDemo: boolean; lastUpdated: string; source: string }>({
    isDemo: true,
    lastUpdated: new Date().toISOString(),
    source: 'Demo Baseline Feeds',
  });
  const [currentMode, setCurrentMode] = useState<'mock' | 'real'>(() => {
    return fundamentalsService.getProviderMode ? fundamentalsService.getProviderMode() : 'mock';
  });

  useEffect(() => {
    let isMounted = true;
    fundamentalsService.getMetadata().then((data) => {
      if (isMounted) setMeta(data);
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [currentMode]);

  const handleToggle = () => {
    const nextMode = currentMode === 'mock' ? 'real' : 'mock';
    if (fundamentalsService.setProviderMode) {
      fundamentalsService.setProviderMode(nextMode);
      setCurrentMode(nextMode);
    }
  };

  const isReal = currentMode === 'real' && !meta.isDemo;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono font-medium transition-colors ${
          isReal
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}
        title={`Data Provider: ${meta.source} (Updated: ${new Date(meta.lastUpdated).toLocaleTimeString()})`}
      >
        <span className="relative flex h-2 w-2">
          {isReal && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isReal ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          />
        </span>
        <span className="font-semibold">
          {isReal ? 'Live Macro API (Supabase)' : 'Demo Data (Mock)'}
        </span>
      </div>

      {showToggle && (
        <button
          type="button"
          onClick={handleToggle}
          className="text-[11px] font-mono px-2 py-0.5 rounded border border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white transition"
        >
          Switch to {currentMode === 'mock' ? 'Live' : 'Mock'}
        </button>
      )}
    </div>
  );
};
