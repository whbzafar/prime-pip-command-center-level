import React, { useState } from 'react';
import { Download, Check, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, install, isIOS } = usePWAInstall();
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isIOS) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowIOSPrompt(!showIOSPrompt)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-amber-300 border border-blue-500/30 text-xs font-military font-bold tracking-wider transition"
          title="Install as App"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden md:inline">INSTALL APP</span>
        </button>

        {showIOSPrompt && (
          <div className="absolute right-0 mt-2 w-64 p-3 rounded-xl bg-slate-950 border border-blue-500/40 shadow-2xl z-50 text-xs font-mono-code text-slate-300">
            <p className="font-bold text-cyan-400 mb-1">Install on iOS:</p>
            <p className="text-[11px] text-slate-400">
              Tap the Share button <span className="text-slate-200">[↑]</span> in Safari and choose <strong className="text-slate-100">&quot;Add to Home Screen&quot;</strong>.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (!isInstallable) {
    return null;
  }

  return (
    <button
      id="pwa-install-btn"
      onClick={install}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-cyan-400 text-slate-950 text-xs font-military font-bold tracking-wider transition shadow-md shadow-blue-500/20"
      title="Install PrimePipFX as standalone offline app"
    >
      <Download className="w-3.5 h-3.5 stroke-[2.5]" />
      <span className="hidden sm:inline">INSTALL APP</span>
    </button>
  );
};
