import React from 'react';
import { Facebook, Linkedin, MessageCircle, Youtube } from 'lucide-react';

const SOCIAL_LINKS = [
  { label: 'YouTube', href: 'https://www.youtube.com/@primepipfx', icon: Youtube },
  { label: 'WhatsApp', href: 'https://chat.whatsapp.com/H9uEqx5DYDEATKXTfi3jlr', icon: MessageCircle },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/primepip-fx-39a861433/', icon: Linkedin },
  { label: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61584926081390', icon: Facebook },
];

export const AppFooter: React.FC = () => (
  <footer className="border-t border-slate-800/80 bg-slate-950/80 px-4 py-6 pb-24 md:pb-6">
    <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-military text-sm font-bold tracking-wider text-slate-200">PRIMEPIP<span className="text-cyan-400">FX</span></p>
        <p className="mt-1 text-[11px] text-slate-500">Trade with process. Grow with discipline.</p>
      </div>
      <nav aria-label="PrimePipFX social links" className="flex flex-wrap items-center gap-2">
        {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
          <a key={label} href={href} target="_blank" rel="noreferrer noopener" aria-label={label} title={label} className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-1.5 text-[11px] text-slate-400 transition hover:border-cyan-400/50 hover:text-cyan-300">
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
          </a>
        ))}
        <a href="https://x.com/primepipfx" target="_blank" rel="noreferrer noopener" aria-label="X" title="X" className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/70 text-xs font-bold text-slate-400 transition hover:border-cyan-400/50 hover:text-cyan-300">X</a>
      </nav>
    </div>
  </footer>
);
