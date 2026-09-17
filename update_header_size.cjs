const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

// 1. Tactical Status Bar: Make it flex-wrap instead of overflow-x-auto so it fits on mobile
code = code.replace(
  '<div className="px-3 sm:px-4 py-1.5 border-b border-slate-800/60 bg-[#070A11] flex items-center justify-between gap-2 text-xs font-mono-code text-slate-400 overflow-x-auto no-scrollbar">',
  '<div className="px-3 sm:px-4 py-1.5 border-b border-slate-800/60 bg-[#070A11] flex flex-wrap items-center justify-between gap-y-1.5 gap-x-2 text-[10px] sm:text-xs font-mono-code text-slate-400">'
);

// 2. Branding Row: Make it smaller and shift upwards (less padding)
const oldBrand = `{/* Main Branding & Navigation Row */}
      <div className="px-4 lg:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <button 
          onClick={() => {
            if (onSelectTab) onSelectTab('DASHBOARD');
            else if (setActiveTab) setActiveTab('DASHBOARD');
          }}
          className="flex items-center gap-3 text-left group cursor-pointer transition-all duration-300 hover:opacity-90"
          title="Return to Dashboard"
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-400/40 group-hover:shadow-amber-500/40 transition-shadow">
            <Crosshair className="w-6 h-6 text-slate-950 stroke-[2.5] group-hover:animate-pulse" />
          </div>
          <div className="group-hover:animate-pulse transition-opacity duration-700">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-military font-bold tracking-wider text-slate-100 group-hover:text-amber-400 transition-colors">
                PRIMEPIPFX
              </h1>
              <span className="text-[10px] uppercase tracking-widest font-mono-code px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold group-hover:bg-amber-500/20">
                COMMAND CENTER
              </span>
            </div>
            <p className="text-[11px] text-slate-400 tracking-wide font-sans group-hover:text-slate-300 transition-colors">
              Tactical Journal • Psychology Intelligence • Risk Defense • AI Coach
            </p>
          </div>
        </button>`;

const newBrand = `{/* Main Branding & Navigation Row */}
      <div className="px-4 lg:px-6 py-1.5 lg:py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <button 
          onClick={() => {
            if (onSelectTab) onSelectTab('DASHBOARD');
            else if (setActiveTab) setActiveTab('DASHBOARD');
          }}
          className="flex items-center gap-2.5 text-left group cursor-pointer transition-all duration-300 hover:opacity-90"
          title="Return to Dashboard"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-400/40 group-hover:shadow-amber-500/40 transition-shadow">
            <Crosshair className="w-5 h-5 text-slate-950 stroke-[2.5] group-hover:animate-prime-logo-pulse" />
          </div>
          <div className="group-hover:animate-prime-logo-pulse transition-opacity duration-700">
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-military font-bold tracking-wider text-slate-100 group-hover:text-amber-400 transition-colors leading-none">
                PRIMEPIPFX
              </h1>
              <span className="text-[9px] uppercase tracking-widest font-mono-code px-1.5 py-[1px] rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold group-hover:bg-amber-500/20">
                COMMAND CENTER
              </span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-wide font-sans group-hover:text-slate-300 transition-colors mt-0.5">
              Tactical Journal • Psychology Intelligence • Risk Defense • AI Coach
            </p>
          </div>
        </button>`;

code = code.replace(oldBrand, newBrand);

// 3. Hide Explore All Categories scroll buttons on mobile so it fits seamlessly
code = code.replace(
  'className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all cursor-pointer shrink-0 ${',
  'className={`hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all cursor-pointer shrink-0 ${'
);
code = code.replace(
  'className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all cursor-pointer shrink-0 ${',
  'className={`hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all cursor-pointer shrink-0 ${'
);

// 4. Reduce Top Slim Bar from h-14 to h-10/12
code = code.replace(
  '<div className="w-full h-14 shrink-0 sticky top-0 px-3 sm:px-4 bg-[#080C14]/95 backdrop-blur border-b border-slate-800/80 flex items-center justify-between gap-2 text-xs font-mono-code text-slate-300 z-[1000]">',
  '<div className="w-full h-12 shrink-0 sticky top-0 px-3 sm:px-4 bg-[#080C14]/95 backdrop-blur border-b border-slate-800/80 flex items-center justify-between gap-2 text-xs font-mono-code text-slate-300 z-[1000]">'
);

// 5. Update top sticky offset for Nav Bar
code = code.replace(
  '<div className="w-full border-t border-slate-800/60 py-1.5 bg-[#090D15]/95 backdrop-blur overflow-hidden sticky top-14 z-[990] min-h-[52px] flex flex-col justify-center shadow-md shadow-slate-900/50">',
  '<div className="w-full border-t border-slate-800/60 py-1.5 bg-[#090D15]/95 backdrop-blur overflow-hidden sticky top-12 z-[990] min-h-[44px] flex flex-col justify-center shadow-md shadow-slate-900/50">'
);

fs.writeFileSync('src/components/Header.tsx', code, 'utf8');
