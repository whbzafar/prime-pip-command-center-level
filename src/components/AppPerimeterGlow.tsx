import React from 'react';

/**
 * AppPerimeterGlow
 * High-End Institutional Command Center Perimeter Engine
 * Renders traveling hyper-laser photon comets, micro-calibrated cyber rails,
 * ambient edge bloom, and tactical corner reticles around all 4 sides of the application.
 */
export const AppPerimeterGlow: React.FC = () => {
  return (
    <div
      id="app-perimeter-animated-frame"
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-30 overflow-hidden select-none"
    >
      {/* =========================================================================
          1. TOP HORIZONTAL RAIL & HYPER PHOTON COMET (CYAN -> SKY -> FUCHSIA)
          ========================================================================= */}
      {/* Ambient Top Glow Bloom */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500/10 via-fuchsia-500/10 to-cyan-500/10 blur-[3px]" />

      {/* Top Precision Conduit Rail */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-slate-900/60 overflow-hidden">
        {/* Micro-tick marks along rail */}
        <div className="absolute inset-0 flex justify-between px-16 opacity-30 text-[6px] font-mono text-cyan-400 pointer-events-none">
          <span>| 25%</span>
          <span>|| 50%</span>
          <span>| 75%</span>
        </div>
        {/* Photon Comet */}
        <div className="w-full h-full relative">
          <div className="absolute inset-y-0 w-80 sm:w-96 flex items-center animate-perimeter-top">
            {/* Trailing Comet Tail */}
            <div className="w-full h-full bg-gradient-to-r from-transparent via-cyan-400 via-sky-300 to-fuchsia-400 opacity-95 shadow-[0_0_16px_#00f0ff,0_0_32px_#d946ef]" />
            {/* White-Hot Leading Particle Core */}
            <div className="w-2.5 h-2.5 -ml-1 rounded-full bg-white shadow-[0_0_10px_#ffffff,0_0_20px_#00f0ff] shrink-0" />
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. RIGHT VERTICAL RAIL & HYPER PHOTON COMET (FUCHSIA -> VIOLET -> AMBER)
          ========================================================================= */}
      {/* Ambient Right Glow Bloom */}
      <div className="absolute top-0 right-0 bottom-0 w-1 bg-gradient-to-b from-fuchsia-500/10 via-amber-500/10 to-fuchsia-500/10 blur-[3px]" />

      {/* Right Precision Conduit Rail */}
      <div className="absolute top-0 right-0 bottom-0 w-[2px] bg-slate-900/60 overflow-hidden">
        {/* Micro-tick marks */}
        <div className="absolute inset-0 flex flex-col justify-between py-24 opacity-30 text-[6px] font-mono text-fuchsia-400 pointer-events-none">
          <span>— 25%</span>
          <span>== 50%</span>
          <span>— 75%</span>
        </div>
        {/* Photon Comet */}
        <div className="w-full h-full relative">
          <div className="absolute inset-x-0 h-80 sm:h-96 flex flex-col items-center animate-perimeter-right">
            {/* Trailing Comet Tail */}
            <div className="w-full h-full bg-gradient-to-b from-transparent via-fuchsia-400 via-purple-400 to-amber-300 opacity-95 shadow-[0_0_16px_#d946ef,0_0_32px_#f59e0b]" />
            {/* White-Hot Leading Particle Core */}
            <div className="w-2.5 h-2.5 -mt-1 rounded-full bg-white shadow-[0_0_10px_#ffffff,0_0_20px_#d946ef] shrink-0" />
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. BOTTOM HORIZONTAL RAIL & HYPER PHOTON COMET (AMBER -> GOLD -> EMERALD)
          ========================================================================= */}
      {/* Ambient Bottom Glow Bloom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-emerald-500/10 blur-[3px]" />

      {/* Bottom Precision Conduit Rail */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-900/60 overflow-hidden">
        {/* Micro-tick marks */}
        <div className="absolute inset-0 flex justify-between px-16 opacity-30 text-[6px] font-mono text-amber-400 pointer-events-none">
          <span>| 75%</span>
          <span>|| 50%</span>
          <span>| 25%</span>
        </div>
        {/* Photon Comet */}
        <div className="w-full h-full relative">
          <div className="absolute inset-y-0 w-80 sm:w-96 flex items-center justify-end animate-perimeter-bottom">
            {/* White-Hot Leading Particle Core */}
            <div className="w-2.5 h-2.5 -mr-1 rounded-full bg-white shadow-[0_0_10px_#ffffff,0_0_20px_#10b981] shrink-0" />
            {/* Trailing Comet Tail */}
            <div className="w-full h-full bg-gradient-to-r from-emerald-400 via-amber-300 to-transparent opacity-95 shadow-[0_0_16px_#f59e0b,0_0_32px_#10b981]" />
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. LEFT VERTICAL RAIL & HYPER PHOTON COMET (EMERALD -> MINT -> CYAN)
          ========================================================================= */}
      {/* Ambient Left Glow Bloom */}
      <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500/10 via-emerald-500/10 to-cyan-500/10 blur-[3px]" />

      {/* Left Precision Conduit Rail */}
      <div className="absolute top-0 left-0 bottom-0 w-[2px] bg-slate-900/60 overflow-hidden">
        {/* Micro-tick marks */}
        <div className="absolute inset-0 flex flex-col justify-between py-24 opacity-30 text-[6px] font-mono text-emerald-400 pointer-events-none">
          <span>— 75%</span>
          <span>== 50%</span>
          <span>— 25%</span>
        </div>
        {/* Photon Comet */}
        <div className="w-full h-full relative">
          <div className="absolute inset-x-0 h-80 sm:h-96 flex flex-col items-center justify-end animate-perimeter-left">
            {/* White-Hot Leading Particle Core */}
            <div className="w-2.5 h-2.5 -mb-1 rounded-full bg-white shadow-[0_0_10px_#ffffff,0_0_20px_#00f0ff] shrink-0" />
            {/* Trailing Comet Tail */}
            <div className="w-full h-full bg-gradient-to-b from-cyan-400 via-emerald-400 to-transparent opacity-95 shadow-[0_0_16px_#10b981,0_0_32px_#00f0ff]" />
          </div>
        </div>
      </div>

      {/* =========================================================================
          5. FOUR TACTICAL CORNER RETICLES & QUANTUM TELEMETRY NODES
          ========================================================================= */}
      {/* Top-Left: Cyber Cyan Reticle */}
      <div className="absolute top-0 left-0 w-7 h-7 flex items-start justify-start p-0.5">
        <div className="w-5 h-5 border-t-2 border-l-2 border-cyan-400 shadow-[0_0_12px_#00f0ff] rounded-tl-sm relative">
          <div className="absolute -top-1 -left-1 w-1.5 h-1.5 rounded-full bg-cyan-300 animate-ping" />
          <div className="absolute top-0.5 left-0.5 w-2 h-2 rounded-full border border-cyan-400/60 animate-reticle-spin" />
        </div>
        <span className="hidden sm:inline-block ml-1 mt-0.5 text-[7px] font-mono font-bold text-cyan-400 tracking-wider opacity-80">
          HUD.SYS//01
        </span>
      </div>

      {/* Top-Right: Holographic Fuchsia Reticle */}
      <div className="absolute top-0 right-0 w-7 h-7 flex items-start justify-end p-0.5">
        <span className="hidden sm:inline-block mr-1 mt-0.5 text-[7px] font-mono font-bold text-fuchsia-400 tracking-wider opacity-80">
          QUANTUM//02
        </span>
        <div className="w-5 h-5 border-t-2 border-r-2 border-fuchsia-400 shadow-[0_0_12px_#d946ef] rounded-tr-sm relative">
          <div className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-fuchsia-300 animate-ping" />
          <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full border border-fuchsia-400/60 animate-reticle-spin" />
        </div>
      </div>

      {/* Bottom-Right: Solar Amber Reticle */}
      <div className="absolute bottom-0 right-0 w-7 h-7 flex items-end justify-end p-0.5">
        <span className="hidden sm:inline-block mr-1 mb-0.5 text-[7px] font-mono font-bold text-amber-400 tracking-wider opacity-80">
          ORBIT//03
        </span>
        <div className="w-5 h-5 border-b-2 border-r-2 border-amber-400 shadow-[0_0_12px_#f59e0b] rounded-br-sm relative">
          <div className="absolute -bottom-1 -right-1 w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping" />
          <div className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border border-amber-400/60 animate-reticle-spin" />
        </div>
      </div>

      {/* Bottom-Left: Matrix Emerald Reticle */}
      <div className="absolute bottom-0 left-0 w-7 h-7 flex items-end justify-start p-0.5">
        <div className="w-5 h-5 border-b-2 border-l-2 border-emerald-400 shadow-[0_0_12px_#10b981] rounded-bl-sm relative">
          <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
          <div className="absolute bottom-0.5 left-0.5 w-2 h-2 rounded-full border border-emerald-400/60 animate-reticle-spin" />
        </div>
        <span className="hidden sm:inline-block ml-1 mb-0.5 text-[7px] font-mono font-bold text-emerald-400 tracking-wider opacity-80">
          MATRIX//04
        </span>
      </div>
    </div>
  );
};
