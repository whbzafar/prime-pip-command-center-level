const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

// 1. Remove the automatic scroll collapse useEffect
const scrollEffectRegex = /  useEffect\(\(\) => \{\n    let lastScrollY = window\.scrollY;\n    const handleScroll = \(\) => \{[\s\S]*?window\.removeEventListener\('scroll', handleScroll\);\n  \}, \[\]\);\n/g;
code = code.replace(scrollEffectRegex, '');

// 2. Remove sticky from outer header
code = code.replace(
  '<header className="sticky top-0 z-[100] border-b border-slate-800/80 bg-[#0B0F19]/95 backdrop-blur flex flex-col transition-all duration-300 ease-in-out">',
  '<header className="relative z-[100] border-b border-slate-800/80 bg-[#0B0F19] flex flex-col transition-all duration-300 ease-in-out">'
);

// 3. Make Slim Top Bar sticky
code = code.replace(
  '<div className="w-full h-14 shrink-0 relative px-3 sm:px-4 bg-[#080C14] border-b border-slate-800/80 flex items-center justify-between gap-2 text-xs font-mono-code text-slate-300 z-[1000]">',
  '<div className="w-full h-14 shrink-0 sticky top-0 px-3 sm:px-4 bg-[#080C14]/95 backdrop-blur border-b border-slate-800/80 flex items-center justify-between gap-2 text-xs font-mono-code text-slate-300 z-[1000]">'
);

// 4. Make Navigation Bar sticky
code = code.replace(
  '<div className="w-full border-t border-slate-800/60 py-1.5 bg-[#090D15]/95 relative z-30 overflow-hidden">',
  '<div className="w-full border-t border-slate-800/60 py-1.5 bg-[#090D15]/95 backdrop-blur sticky top-[56px] z-[990] overflow-hidden shadow-md shadow-slate-900/50">'
);

// 5. Make Explore Strip more compact
code = code.replace(
  '<div className="w-full bg-[#060A12] border-t border-slate-800/60 px-3 sm:px-6 py-1 flex items-center justify-between gap-3 text-[11px] font-mono-code text-slate-400 select-none">',
  '<div className="w-full bg-[#060A12] border-t border-slate-800/60 px-3 sm:px-6 py-0.5 flex items-center justify-between gap-2 sm:gap-3 text-[10px] font-mono-code text-slate-400 select-none">'
);

// 6. Make buttons in Explore Strip more compact
// The buttons have: className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
code = code.replaceAll(
  'className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${',
  'className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${'
);

fs.writeFileSync('src/components/Header.tsx', code, 'utf8');
