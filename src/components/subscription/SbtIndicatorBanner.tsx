import React, { useState } from 'react';
import { ExternalLink, Sparkles, X } from 'lucide-react';
import { SBT_INDICATOR_PRICE, waLink } from '../../config/pricing';

const KEY = 'ppfx_sbt_indicator_banner_closed';

/** Announcement: the Prime Pip SBT Indicator is available. Shown on the login screen, in the demo and at the top of the app. */
export const SbtIndicatorBanner: React.FC<{ dismissible?: boolean; className?: string }> = ({ dismissible = true, className = '' }) => {
  const [closed, setClosed] = useState<boolean>(() => {
    if (!dismissible) return false;
    try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; }
  });
  if (closed) return null;
  const href = waLink(`Hello PrimePipFX, I want the Prime Pip SBT Indicator ($${SBT_INDICATOR_PRICE}).`);
  return (
    <div
      data-testid="sbt-indicator-banner"
      className={`relative z-20 w-full border-b border-amber-400/30 bg-gradient-to-r from-amber-500/15 via-slate-950/95 to-cyan-500/15 px-3 py-1.5 text-center text-[11px] sm:text-xs text-slate-100 ${className}`}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 pr-6">
        <span className="inline-flex items-center gap-1.5 font-bold text-amber-300">
          <Sparkles className="h-3.5 w-3.5" /> NEW
        </span>
        <span>
          <strong className="text-white">Prime Pip SBT Indicator</strong> is now available —{' '}
          <strong className="text-amber-300">${SBT_INDICATOR_PRICE}</strong>
        </span>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-400/10 px-2.5 py-0.5 font-semibold text-amber-200 hover:bg-amber-400/20"
        >
          Get it on WhatsApp <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      {dismissible && (
        <button
          type="button"
          aria-label="Hide announcement"
          onClick={() => { setClosed(true); try { sessionStorage.setItem(KEY, '1'); } catch { /* storage blocked */ } }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-200"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
