const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

const oldBrand = `          <img src="https://yt3.ggpht.com/a/AATXAJyB_3l6v_Gk8k-uM5p_4-1w9fW_s8l_h2e2Ew=s900-c-k-c0xffffffff-no-rj-mo" alt="PrimePipsFX Logo" className="h-10 w-auto rounded object-contain group-hover:animate-prime-logo-pulse shadow-lg border border-slate-700/50" />
          <div className="group-hover:animate-prime-logo-pulse transition-opacity duration-700">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase tracking-widest font-mono-code px-1.5 py-[1px] rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold group-hover:bg-amber-500/20">
                COMMAND CENTER
              </span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-wide font-sans group-hover:text-slate-300 transition-colors mt-0.5">
              Tactical Journal • Psychology Intelligence • Risk Defense • AI Coach
            </p>
          </div>`;

const newBrand = `          <div className="flex items-center justify-center w-10 h-10 shrink-0 group-hover:animate-prime-logo-pulse drop-shadow-[0_0_8px_rgba(14,165,233,0.5)]">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              {/* Ascending Chart Bars */}
              <rect x="10" y="55" width="15" height="35" rx="1.5" fill="url(#barGrad)"/>
              <rect x="30" y="40" width="15" height="50" rx="1.5" fill="url(#barGrad)"/>
              <rect x="50" y="25" width="15" height="65" rx="1.5" fill="url(#barGrad)"/>
              <rect x="70" y="10" width="15" height="80" rx="1.5" fill="url(#barGrad)"/>
              
              {/* Sweeping Arrow */}
              <path d="M 2 55 Q 40 45 68 15 L 65 2 L 98 2 L 98 35 L 85 32 Q 50 65 5 65 Z" fill="#38bdf8"/>
              
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#0ea5e9"/>
                  <stop offset="1" stopColor="#0369a1"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="group-hover:animate-prime-logo-pulse transition-opacity duration-700">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-100 transition-colors leading-none" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                PrimePips<span className="text-sky-400">FX</span>
              </h1>
              <span className="text-[8px] uppercase tracking-widest font-mono-code px-1.5 py-[1px] rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold group-hover:bg-amber-500/20">
                COMMAND CENTER
              </span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-wide font-sans group-hover:text-slate-300 transition-colors mt-0.5">
              Tactical Journal • Psychology Intelligence • Risk Defense • AI Coach
            </p>
          </div>`;

if (code.includes(oldBrand)) {
  code = code.replace(oldBrand, newBrand);
  fs.writeFileSync('src/components/Header.tsx', code, 'utf8');
  console.log("Replaced successfully!");
} else {
  console.log("Could not find exact block.");
}
