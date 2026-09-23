import React from 'react';
import { Facebook, Linkedin, MessageCircle, Youtube, Star, Award } from 'lucide-react';

const SOCIAL_LINKS = [
  { label: 'YouTube', href: 'https://www.youtube.com/@primepipfx', icon: Youtube },
  { label: 'WhatsApp', href: 'https://chat.whatsapp.com/H9uEqx5DYDEATKXTfi3jlr', icon: MessageCircle },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/primepip-fx-39a861433/', icon: Linkedin },
  { label: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61584926081390', icon: Facebook },
];

interface AppFooterProps {
  onOpenReviews?: () => void;
}

export const AppFooter: React.FC<AppFooterProps> = ({ onOpenReviews }) => (
  <footer className="w-full border-t border-slate-800/80 bg-[#070B14]/90 backdrop-blur px-3 py-3 sm:py-4 md:px-4 md:bg-slate-950/80 select-none mt-auto">
    <div className="mx-auto flex max-w-7xl flex-row items-center justify-between gap-2 md:flex-row md:items-center">
      <div className="flex items-center gap-1.5 sm:gap-2.5 truncate min-w-0">
        <p className="font-military text-xs sm:text-sm font-bold tracking-wider text-slate-200 shrink-0">
          PRIMEPIP<span className="text-cyan-400">FX</span>
        </p>
        <span className="text-slate-600 hidden xs:inline shrink-0">|</span>
        <p className="hidden xs:block text-[10px] sm:text-[11px] text-slate-500 truncate">
          Trade with process. Grow with discipline.
        </p>

        {/* 5-Star Reviews Quick Access Pill */}
        {onOpenReviews && (
          <button
            type="button"
            onClick={onOpenReviews}
            title="Read Verified Trader Reviews & Submit Your Own (5.0 ★★★★★)"
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[10px] font-mono-code font-bold transition cursor-pointer shrink-0 ml-1 shadow-xs active:scale-95"
          >
            <div className="flex text-amber-400">
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
            </div>
            <span>5.0</span>
            <span className="hidden sm:inline">REVIEWS</span>
          </button>
        )}
      </div>

      <nav aria-label="PrimePipFX social links" className="flex items-center gap-1.5 shrink-0">
        {onOpenReviews && (
          <button
            type="button"
            onClick={onOpenReviews}
            title="Community Ratings & Reviews"
            className="sm:hidden flex items-center justify-center p-1 rounded-md border border-amber-500/40 bg-amber-500/15 text-[10px] text-amber-300 transition hover:bg-amber-500/25"
          >
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          </button>
        )}

        {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={label}
            title={label}
            className="flex items-center justify-center p-1 sm:px-2 sm:py-1 rounded-md border border-slate-800 bg-slate-900/80 text-[10px] text-slate-400 transition hover:border-cyan-400/50 hover:text-cyan-300"
          >
            <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="hidden sm:inline ml-1">{label}</span>
          </a>
        ))}
        <a
          href="https://x.com/primepipfx"
          target="_blank"
          rel="noreferrer noopener"
          aria-label="X"
          title="X"
          className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-md border border-slate-800 bg-slate-900/80 text-[10px] font-bold text-slate-400 transition hover:border-cyan-400/50 hover:text-cyan-300"
        >
          X
        </a>
      </nav>
    </div>
  </footer>
);
