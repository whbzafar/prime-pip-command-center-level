import React from 'react';
import { Lock, AlertTriangle, RefreshCw, CheckCircle2, ChevronRight, X } from 'lucide-react';

/* ==========================================================================
   PRIME CARD COMPONENT
   Supports: Layered depth, animated gradient borders, interactive hover
   ========================================================================== */

export interface PrimeCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive' | 'gradient' | 'gold-accent' | 'calm' | 'cyber';
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export const PrimeCard: React.FC<PrimeCardProps> = ({
  variant = 'default',
  children,
  className = '',
  glow = false,
  ...props
}) => {
  let variantClass = 'prime-card';
  if (variant === 'elevated') variantClass = 'prime-card-elevated';
  if (variant === 'interactive') variantClass = 'prime-card prime-card-interactive cursor-pointer';
  if (variant === 'gradient') variantClass = 'prime-gradient-box shadow-2xl';
  if (variant === 'gold-accent') variantClass = 'prime-gold-accent-box shadow-xl';
  if (variant === 'calm') variantClass = 'psychology-calm-card';
  if (variant === 'cyber') variantClass = 'bg-[#060D18] border border-emerald-500/30 shadow-2xl shadow-emerald-950/40';

  return (
    <div
      className={`${variantClass} ${glow ? 'prime-glow-underlay' : ''} p-4 sm:p-5 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

/* ==========================================================================
   PRIME BUTTON COMPONENT
   Tactile 150-200ms micro-interactions with rich pressed & hover states
   ========================================================================== */

export interface PrimeButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'calm' | 'cyber' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const PrimeButton: React.FC<PrimeButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  isLoading = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 rounded-lg gap-1.5 min-h-[34px]',
    md: 'text-xs sm:text-sm px-3.5 py-2 rounded-xl gap-2 min-h-[42px]',
    lg: 'text-sm sm:text-base px-5 py-2.5 rounded-xl gap-2.5 min-h-[48px]',
  };

  const variantClasses = {
    primary: 'prime-btn-primary',
    secondary: 'prime-btn-secondary',
    ghost: 'bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-slate-100 active:scale-95 transition-all duration-150',
    danger: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 active:scale-95 shadow-sm shadow-rose-950/50 transition-all duration-150',
    calm: 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:border-indigo-400 active:scale-95 transition-all duration-150 shadow-sm shadow-indigo-950/40',
    cyber: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:border-emerald-400 active:scale-95 transition-all duration-150 font-bold',
    gradient: 'bg-gradient-to-r from-amber-500 via-rose-500 to-cyan-500 hover:opacity-95 text-slate-950 font-bold active:scale-97 shadow-lg shadow-amber-500/20 transition-all duration-150',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-military tracking-wide transition select-none disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <RefreshCw className="w-4 h-4 animate-spin text-current" />
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
          {children && <span>{children}</span>}
          {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
};

/* ==========================================================================
   PRIME BADGE COMPONENT
   Pill tags with active status dot and micro-border
   ========================================================================== */

export interface PrimeBadgeProps {
  variant?: 'gold' | 'emerald' | 'sky' | 'rose' | 'indigo' | 'slate';
  pulse?: boolean;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export const PrimeBadge: React.FC<PrimeBadgeProps> = ({
  variant = 'gold',
  pulse = false,
  children,
  className = '',
  icon,
}) => {
  const styles = {
    gold: 'bg-amber-500/10 text-amber-300 border-amber-500/30 dot-bg-amber-400',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 dot-bg-emerald-400',
    sky: 'bg-sky-500/10 text-sky-300 border-sky-500/30 dot-bg-sky-400',
    rose: 'bg-rose-500/10 text-rose-300 border-rose-500/30 dot-bg-rose-400',
    indigo: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30 dot-bg-indigo-400',
    slate: 'bg-slate-800/80 text-slate-300 border-slate-700/80 dot-bg-slate-400',
  };

  const dotColors = {
    gold: 'bg-amber-400',
    emerald: 'bg-emerald-400',
    sky: 'bg-sky-400',
    rose: 'bg-rose-400',
    indigo: 'bg-indigo-400',
    slate: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono-code font-bold tracking-tight border uppercase shadow-sm ${styles[variant]} ${className}`}
    >
      {pulse && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} animate-pulse`} />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

/* ==========================================================================
   PRIME MODAL SYSTEM
   Mobile bottom-sheet & desktop floating dialog with backdrop blur
   ========================================================================== */

export interface PrimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
  showGradientBorder?: boolean;
}

export const PrimeModal: React.FC<PrimeModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-xl',
  showGradientBorder = true,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        className="fixed inset-0 -z-10"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`w-full ${maxWidth} max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-2xl overflow-hidden bg-[#0B0F19] border-t sm:border border-slate-800 shadow-2xl shadow-black/90 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 my-auto ${
          showGradientBorder ? 'prime-gradient-box' : ''
        }`}
      >
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Modal Header */}
        {(title || subtitle) && (
          <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between gap-3 shrink-0">
            <div>
              {typeof title === 'string' ? (
                <h3 className="text-base sm:text-lg font-military font-bold text-slate-100 tracking-wide">
                  {title}
                </h3>
              ) : (
                title
              )}
              {subtitle && (
                <p className="text-xs text-slate-400 font-sans mt-0.5 leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-200 transition cursor-pointer shrink-0"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-slate-200">
          {children}
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   PRIME LOCKED FEATURE CARD
   Frosted glass, iridescent gradient border, desirable without deception
   ========================================================================== */

export interface PrimeLockedFeatureProps {
  title: string;
  description: string;
  badgeText?: string;
  onUnlock?: () => void;
  unlockText?: string;
  featureList?: string[];
  className?: string;
}

export const PrimeLockedFeature: React.FC<PrimeLockedFeatureProps> = ({
  title,
  description,
  badgeText = 'MEMBERSHIP REQUIRED',
  onUnlock,
  unlockText = 'UPGRADE TO UNLOCK',
  featureList = [],
  className = '',
}) => {
  return (
    <div
      className={`prime-gradient-box p-6 sm:p-8 rounded-2xl relative overflow-hidden backdrop-blur-xl bg-gradient-to-b from-[#0F172A]/90 to-[#070A11]/95 text-center flex flex-col items-center justify-center shadow-2xl ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10 mb-4 animate-pulse-soft">
        <Lock className="w-6 h-6 stroke-[2.2]" />
      </div>

      <PrimeBadge variant="gold" pulse className="mb-3">
        {badgeText}
      </PrimeBadge>

      <h3 className="text-lg sm:text-xl font-military font-bold text-slate-100 tracking-wide max-w-md">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-slate-300 max-w-md mt-2 leading-relaxed font-sans">
        {description}
      </p>

      {featureList.length > 0 && (
        <div className="my-5 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-left w-full max-w-sm space-y-2">
          {featureList.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}

      {onUnlock && (
        <PrimeButton
          variant="primary"
          size="md"
          onClick={onUnlock}
          icon={<ChevronRight className="w-4 h-4" />}
          iconPosition="right"
          className="mt-2 shadow-xl shadow-amber-500/25"
        >
          {unlockText}
        </PrimeButton>
      )}
    </div>
  );
};

/* ==========================================================================
   PRIME EMPTY STATE
   Tactile icon, glowing ambient circle, clean guidance
   ========================================================================== */

export interface PrimeEmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const PrimeEmptyState: React.FC<PrimeEmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`prime-card p-8 sm:p-12 text-center flex flex-col items-center justify-center border-dashed border-slate-800 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400/80 mb-4 shadow-inner">
        {icon}
      </div>

      <h4 className="text-base font-military font-bold text-slate-200 tracking-wider">
        {title}
      </h4>

      <p className="text-xs text-slate-400 max-w-sm mt-1.5 leading-relaxed font-sans">
        {description}
      </p>

      {actionText && onAction && (
        <PrimeButton
          variant="secondary"
          size="sm"
          onClick={onAction}
          className="mt-4"
        >
          {actionText}
        </PrimeButton>
      )}
    </div>
  );
};

/* ==========================================================================
   PRIME ERROR STATE
   Calm, non-frightening error recovery
   ========================================================================== */

export interface PrimeErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const PrimeErrorState: React.FC<PrimeErrorStateProps> = ({
  title = 'UNABLE TO RETRIEVE TELEMETRY',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`p-5 rounded-xl bg-rose-500/5 border border-rose-500/20 text-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-military font-bold text-amber-300 tracking-wider">
            {title}
          </h4>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed font-sans">
            {message}
          </p>
        </div>
      </div>

      {onRetry && (
        <PrimeButton
          variant="secondary"
          size="sm"
          onClick={onRetry}
          icon={<RefreshCw className="w-3.5 h-3.5" />}
          className="shrink-0 text-xs"
        >
          RETRY
        </PrimeButton>
      )}
    </div>
  );
};

/* ==========================================================================
   PRIME SKELETON LOADER
   Shimmering placeholder for asynchronous telemetry
   ========================================================================== */

export const PrimeSkeleton: React.FC<{
  className?: string;
  height?: string;
  width?: string;
}> = ({ className = '', height = 'h-4', width = 'w-full' }) => {
  return (
    <div
      className={`bg-slate-800/60 rounded-md animate-pulse ${height} ${width} ${className}`}
    />
  );
};
