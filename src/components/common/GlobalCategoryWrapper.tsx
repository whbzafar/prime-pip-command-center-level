import React, { useState, useEffect } from 'react';
import { Maximize2, Minimize2, Minus, RotateCcw, ChevronUp } from 'lucide-react';

export type CategoryWindowState = 'NORMAL' | 'FULLSCREEN' | 'MINIMIZED';

interface GlobalCategoryWrapperProps {
  title: string;
  categoryBadge?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  extraHeaderControls?: React.ReactNode;
  className?: string;
  initialState?: CategoryWindowState;
}

export const GlobalCategoryWrapper: React.FC<GlobalCategoryWrapperProps> = ({
  title,
  categoryBadge,
  icon,
  children,
  extraHeaderControls,
  className = '',
  initialState = 'NORMAL',
}) => {
  const [windowState, setWindowState] = useState<CategoryWindowState>(initialState);

  // Keyboard accessibility: ESC key to restore from Fullscreen
  useEffect(() => {
    if (windowState !== 'FULLSCREEN') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setWindowState('NORMAL');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [windowState]);

  // Lock body scroll in fullscreen mode to prevent double scrollbars
  useEffect(() => {
    if (windowState === 'FULLSCREEN') {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [windowState]);

  if (windowState === 'MINIMIZED') {
    return (
      <div className="w-full">
        {/* Sleek Minimized Dock Banner */}
        <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 flex items-center justify-between shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/25 text-cyan-400 shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-military font-bold text-slate-200 tracking-wider truncate">
                  {title}
                </span>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-blue-500/15 text-cyan-400 border border-blue-500/30 font-bold shrink-0">
                  MINIMIZED
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono-code">
                Click restore or expand to resume viewing this category.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setWindowState('NORMAL')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono-code font-bold transition cursor-pointer shadow-md"
              title="Restore to normal category view"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESTORE</span>
            </button>
            <button
              type="button"
              onClick={() => setWindowState('FULLSCREEN')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono-code transition cursor-pointer"
              title="Expand directly to Fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">FULLSCREEN</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (windowState === 'FULLSCREEN') {
    return (
      <div
        id="global-category-fullscreen-container"
        className="fixed inset-0 z-50 bg-[#020617]/98 backdrop-blur-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Fullscreen HUD Header Bar */}
        <header className="h-14 sm:h-16 px-4 sm:px-6 bg-[#0B0F19]/95 border-b border-slate-800 flex items-center justify-between shrink-0 select-none z-20">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/25 text-cyan-400 shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-military font-bold text-slate-100 tracking-wider truncate">
                  {title}
                </h1>
                {categoryBadge && (
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-cyan-400 border border-blue-500/25 font-military font-bold text-[10px] tracking-wider shrink-0">
                    {categoryBadge}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-300 border border-teal-500/30 font-mono-code font-bold text-[10px] shrink-0">
                  FULLSCREEN
                </span>
              </div>
              <p className="text-[11px] font-mono-code text-slate-400 hidden sm:block">
                Press [Esc] or click Restore to return to regular dashboard view.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {extraHeaderControls}

            {/* Minimize in Fullscreen */}
            <button
              type="button"
              onClick={() => setWindowState('MINIMIZED')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono-code transition cursor-pointer"
              title="Minimize panel"
            >
              <Minus className="w-3.5 h-3.5" />
              <span className="hidden md:inline">MINIMIZE</span>
            </button>

            {/* Restore Button */}
            <button
              type="button"
              onClick={() => setWindowState('NORMAL')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono-code font-bold transition cursor-pointer shadow-md"
              title="Restore back to standard dashboard layout (Esc)"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>RESTORE</span>
            </button>
          </div>
        </header>

        {/* Fullscreen Body Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8">
          <div className="max-w-7xl w-full mx-auto">{children}</div>
        </div>
      </div>
    );
  }

  // Normal View with persistent Category Window Controls
  return (
    <div className={`space-y-3 w-full ${className}`}>
      {/* Category HUD Action Strip */}
      <div className="flex items-center justify-between px-1 py-1 text-xs font-mono-code">
        <div className="flex items-center gap-2">
          {categoryBadge && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-400 font-military font-bold">
              {categoryBadge}
            </span>
          )}
          <span className="text-slate-400 text-[11px]">Category Workspace</span>
        </div>

        <div className="flex items-center gap-1.5">
          {extraHeaderControls}

          {/* Minimize Button */}
          <button
            type="button"
            onClick={() => setWindowState('MINIMIZED')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            title="Minimize category view"
          >
            <Minus className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] hidden sm:inline">MINIMIZE</span>
          </button>

          {/* Full Screen Button */}
          <button
            type="button"
            onClick={() => setWindowState('FULLSCREEN')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-blue-500/40 transition cursor-pointer"
            title="Expand to Fullscreen (Real Fullscreen Expansion)"
          >
            <Maximize2 className="w-3 h-3 text-teal-400" />
            <span className="text-[10px] hidden sm:inline">FULLSCREEN</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full">{children}</div>
    </div>
  );
};
