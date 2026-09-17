const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

const oldBrand = `{/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-400/40">
            <Crosshair className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-military font-bold tracking-wider text-slate-100">
                PRIMEPIPFX
              </h1>
              <span className="text-[10px] uppercase tracking-widest font-mono-code px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
                COMMAND CENTER
              </span>
            </div>
            <p className="text-[11px] text-slate-400 tracking-wide font-sans">
              Tactical Journal • Psychology Intelligence • Risk Defense • AI Coach
            </p>
          </div>
        </div>`;

const newBrand = `{/* Brand */}
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

code = code.replace(oldBrand, newBrand);
fs.writeFileSync('src/components/Header.tsx', code, 'utf8');
