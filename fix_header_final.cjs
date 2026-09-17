const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

code = code.replace(
  '<header className="relative z-[100] border-b border-slate-800/80 bg-[#0B0F19] flex flex-col transition-all duration-300 ease-in-out">',
  '<header className="contents">'
);

code = code.replace(
  '<div\n        className={`header-collapsible transition-all duration-300 ease-in-out overflow-hidden ${',
  '<div\n        className={`w-full bg-[#0B0F19] relative z-[100] header-collapsible transition-all duration-300 ease-in-out overflow-hidden ${'
);

code = code.replace(
  '{/* Horizontally Scrollable Full Navigation Bar (Desktop, Laptop, Tablet & Mobile) */}',
  '<div className="sticky top-14 z-[990] w-full flex flex-col shadow-md shadow-slate-900/50">\n      {/* Horizontally Scrollable Full Navigation Bar (Desktop, Laptop, Tablet & Mobile) */}'
);

code = code.replace(
  '<div className="w-full border-t border-slate-800/60 py-1.5 bg-[#090D15]/95 backdrop-blur sticky top-[56px] z-[990] overflow-hidden shadow-md shadow-slate-900/50">',
  '<div className="w-full border-t border-slate-800/60 py-1.5 bg-[#090D15]/95 backdrop-blur overflow-hidden relative">'
);

code = code.replace(
  '<div className="w-full bg-[#060A12] border-t border-slate-800/60 px-3 sm:px-6 py-0.5 flex items-center justify-between gap-2 sm:gap-3 text-[10px] font-mono-code text-slate-400 select-none">',
  '<div className="w-full bg-[#060A12]/95 backdrop-blur border-t border-b border-slate-800/60 px-3 sm:px-4 py-1 flex items-center justify-between gap-4 text-[10px] font-mono-code text-slate-400 select-none overflow-x-auto no-scrollbar whitespace-nowrap">'
);

code = code.replace(
  '        </button>\n      </div>\n      </div>\n      {/* Global Time & Market Session Modal */}',
  '        </button>\n      </div>\n      </div>\n      </div>\n      {/* Global Time & Market Session Modal */}'
);

code = code.replaceAll(
  'className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${',
  'className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all cursor-pointer shrink-0 ${'
);

code = code.replace(
  '<div className="flex-1 max-w-md mx-auto flex items-center gap-3">',
  '<div className="flex-1 min-w-[200px] max-w-md mx-auto flex items-center gap-3 shrink-0">'
);

fs.writeFileSync('src/components/Header.tsx', code, 'utf8');
