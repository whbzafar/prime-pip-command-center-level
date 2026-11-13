import React, { useState } from 'react';
import { ExternalLink, Play, Sparkles, X } from 'lucide-react';
import { SBT_INDICATOR_PRICE, SBT_INDICATOR_VIDEO, waLink } from '../../config/pricing';

const KEY = 'ppfx_sbt_indicator_banner_closed';

interface Props {
  /** 'card' = highlighted announcement on the login screen; 'ticker' = scrolling banner inside the app. */
  variant?: 'card' | 'ticker';
  dismissible?: boolean;
  className?: string;
}

/** Announcement: the Prime Pip SBT Indicator is available ($500) with a link to the demo video. */
export const SbtIndicatorBanner: React.FC<Props> = ({ variant = 'ticker', dismissible = variant === 'ticker', className = '' }) => {
  const [closed, setClosed] = useState<boolean>(() => {
    if (!dismissible) return false;
    try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; }
  });
  if (closed) return null;
  const buy = waLink(`Hello PrimePipFX, I want the Prime Pip SBT Indicator ($${SBT_INDICATOR_PRICE}).`);
  const close = () => { setClosed(true); try { sessionStorage.setItem(KEY, '1'); } catch { /* storage blocked */ } };

  if (variant === 'card') {
    return (
      <div data-testid="sbt-indicator-banner" className={`ppfx-sbt-glow relative overflow-hidden rounded-2xl border border-amber-300/60 bg-gradient-to-r from-amber-500/25 via-slate-950/95 to-cyan-500/20 px-3 py-2.5 text-center ${className}`}>
        <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 text-[12px] sm:text-[13px] text-slate-100">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-slate-950"><Sparkles className="h-3 w-3" /> NEW</span>
          <span><strong className="text-white">Prime Pip SBT Indicator</strong> is now available — <strong className="text-amber-300 text-sm">${SBT_INDICATOR_PRICE}</strong></span>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <a href={SBT_INDICATOR_VIDEO} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/60 bg-rose-500/15 px-3 py-1 text-[11px] font-bold text-rose-100 hover:bg-rose-500/30">
            <Play className="h-3 w-3 fill-current" /> Watch it live on YouTube
          </a>
          <a href={buy} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-400/15 px-3 py-1 text-[11px] font-bold text-amber-100 hover:bg-amber-400/30">
            Get it on WhatsApp <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    );
  }

  const items = (
    <>
      <span className="mx-6 inline-flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-slate-950"><Sparkles className="h-3 w-3" /> NEW</span>
        <strong className="text-white">Prime Pip SBT Indicator</strong> now available — <strong className="text-amber-300">${SBT_INDICATOR_PRICE}</strong>
      </span>
      <a href={SBT_INDICATOR_VIDEO} target="_blank" rel="noopener noreferrer" className="mx-6 inline-flex items-center gap-1.5 rounded-full border border-rose-400/60 bg-rose-500/20 px-2.5 py-0.5 font-bold text-rose-100 hover:bg-rose-500/40">
        <Play className="h-3 w-3 fill-current" /> Watch the indicator demo on YouTube
      </a>
      <a href={buy} target="_blank" rel="noopener noreferrer" className="mx-6 inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-400/15 px-2.5 py-0.5 font-bold text-amber-100 hover:bg-amber-400/30">
        Get it on WhatsApp <ExternalLink className="h-3 w-3" />
      </a>
    </>
  );
  return (
    <div data-testid="sbt-indicator-banner" className={`ppfx-sbt-glow relative z-20 flex w-full items-center overflow-hidden border-b border-amber-300/50 bg-gradient-to-r from-amber-500/25 via-slate-950 to-cyan-500/20 py-1.5 text-[11px] sm:text-xs text-slate-100 ${className}`}>
      <div className="ppfx-marquee flex min-w-max items-center whitespace-nowrap pr-10">
        <div className="flex items-center">{items}{items}</div>
        <div className="flex items-center" aria-hidden="true">{items}{items}</div>
      </div>
      {dismissible && (
        <button type="button" aria-label="Close announcement" onClick={close}
          className="absolute right-0 top-0 z-10 flex h-full items-center bg-slate-950/90 px-2.5 text-slate-300 hover:text-white shadow-[-8px_0_8px_rgba(2,6,23,0.9)]">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
