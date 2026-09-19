import React from 'react';
import { Facebook, Linkedin, MessageCircle, Youtube } from 'lucide-react';

const SOCIAL_LINKS = [
  { label: 'YouTube', href: 'https://www.youtube.com/@primepipfx', icon: Youtube },
  { label: 'WhatsApp', href: 'https://chat.whatsapp.com/H9uEqx5DYDEATKXTfi3jlr', icon: MessageCircle },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/primepip-fx-39a861433/', icon: Linkedin },
  { label: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61584926081390', icon: Facebook },
];

export const AppFooter: React.FC = () => (
  <footer className="w-full border-t border-slate-800/80 bg-[#070B14]/90 backdrop-blur px-3 py-3 sm:py-5 md:px-4 md:bg-slate-950/80 select-none mt-auto">
    <div className="mx-auto flex max-w-7xl flex-row items-center justify-between gap-2 md:flex-row md:items-center">
      <div className="flex items-center gap-1.5 sm:gap-2 truncate min-w-0">
        <p className="font-military text-xs sm:text-sm font-bold tracking-wider text-slate-200 shrink-0">
          PRIMEPIP<span className="text-cyan-400">FX</span>
        </p>
        <span className="text-slate-600 hidden xs:inline shrink-0">|</span>
        <p className="hidden xs:block text-[10px] sm:text-[11px] text-slate-500 truncate">
          Trade with process. Grow with discipline.
        </p>
      </div>
      <nav aria-label="PrimePipFX social links" className="flex items-center gap-1.5 shrink-0">
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
