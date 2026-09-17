const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

code = code.replace(
  '<div className="w-full border-t border-slate-800/60 py-1.5 bg-[#090D15]/95 backdrop-blur overflow-hidden sticky top-14 z-[990] shadow-md shadow-slate-900/50">',
  '<div className="w-full border-t border-slate-800/60 py-1.5 bg-[#090D15]/95 backdrop-blur overflow-hidden sticky top-14 z-[990] min-h-[52px] flex flex-col justify-center shadow-md shadow-slate-900/50">'
);

fs.writeFileSync('src/components/Header.tsx', code, 'utf8');
