const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

// Replace the image/logo where CROSSHAIR was
const oldBrand = `        <button 
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

const newBrand = `        <button 
          onClick={() => {
            if (onSelectTab) onSelectTab('DASHBOARD');
            else if (setActiveTab) setActiveTab('DASHBOARD');
          }}
          className="flex items-center gap-2 text-left group cursor-pointer transition-all duration-300 hover:opacity-90"
          title="Return to Dashboard"
        >
          <img src="/channels4_profile.jpg" alt="PrimePipsFX Logo" className="h-10 w-auto rounded object-contain group-hover:animate-prime-logo-pulse shadow-lg border border-slate-700/50" />
          <div className="group-hover:animate-prime-logo-pulse transition-opacity duration-700">
            <div className="flex items-center gap-1.5">
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

// Unhide arrows on mobile
code = code.replace(
  'className={`hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all cursor-pointer shrink-0 ${',
  'className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all cursor-pointer shrink-0 ${'
);
code = code.replace(
  'className={`hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all cursor-pointer shrink-0 ${',
  'className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all cursor-pointer shrink-0 ${'
);

fs.writeFileSync('src/components/Header.tsx', code, 'utf8');
