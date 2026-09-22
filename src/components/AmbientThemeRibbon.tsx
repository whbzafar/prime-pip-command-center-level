import React from 'react';

/**
 * AmbientThemeRibbon
 * A distinctive, ultra-slim luminous optical accent ribbon that anchors the top of the interface.
 * Dynamically reacts to the active theme's CSS custom properties (--accent, --accent-secondary)
 * with a subtle ambient specular glow and breathing prism effect.
 */
export const AmbientThemeRibbon: React.FC = () => {
  return (
    <div className="relative w-full z-[100] select-none pointer-events-none" aria-hidden="true">
      {/* Top 2px Prismatic Laser Line */}
      <div
        className="w-full h-[2.5px] transition-all duration-300 relative overflow-hidden"
        style={{
          background: 'linear-gradient(90deg, var(--accent) 0%, var(--accent-secondary) 50%, var(--accent) 100%)',
          backgroundSize: '200% 100%',
        }}
      >
        {/* Animated ambient shimmer wave */}
        <div
          className="absolute inset-0 opacity-70 animate-pulse"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.85) 50%, transparent 100%)',
          }}
        />
      </div>

      {/* Diffuse Sub-Surface Ambient Glow */}
      <div
        className="w-full h-1 opacity-25 blur-xs transition-colors duration-300"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, var(--accent) 0%, transparent 80%)',
        }}
      />
    </div>
  );
};
