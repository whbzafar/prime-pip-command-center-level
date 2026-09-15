import React, { useEffect } from 'react';
import { Minimize2, X, Maximize2 } from 'lucide-react';

interface FullscreenViewerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  categoryBadge?: string;
  subtitle?: string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  className?: string;
}

export const FullscreenViewer: React.FC<FullscreenViewerProps> = ({
  isOpen,
  onClose,
  title,
  categoryBadge,
  subtitle,
  children,
  headerActions,
  className = '',
}) => {
  // Handle ESC key to minimize
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when in fullscreen
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      id="fullscreen-viewer-overlay"
      className="fixed inset-0 z-50 bg-[#070A11]/98 backdrop-blur-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Top HUD Control Bar */}
      <header className="h-14 sm:h-16 px-4 sm:px-6 bg-[#0B0F19]/90 border-b border-slate-800/90 flex items-center justify-between shrink-0 select-none z-20">
        <div className="flex items-center gap-3 min-w-0">
          {categoryBadge && (
            <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/25 font-military font-bold text-xs tracking-wider shrink-0">
              {categoryBadge}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-military font-bold text-slate-100 truncate tracking-wide">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[11px] font-mono-code text-slate-400 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {headerActions}

          {/* Primary Minimize Button */}
          <button
            id="fullscreen-minimize-btn"
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-amber-300 border border-amber-500/30 hover:border-amber-400/50 transition cursor-pointer text-xs font-mono-code font-bold shadow-sm"
            title="Minimize back to normal view (Esc)"
          >
            <Minimize2 className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">MINIMIZE</span>
          </button>

          {/* Close Icon Button */}
          <button
            id="fullscreen-close-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer border border-slate-800"
            title="Close Fullscreen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Fullscreen Stage (Scrollable & responsive) */}
      <main className={`flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto ${className}`}>
        {children}
      </main>
    </div>
  );
};
