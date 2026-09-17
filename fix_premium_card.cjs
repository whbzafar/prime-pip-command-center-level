const fs = require('fs');
let code = fs.readFileSync('src/components/MainDashboard.tsx', 'utf8');

code = code.replace(
  '<div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-[#121927] border border-amber-500/30 rounded-xl p-5 shadow-xl relative overflow-hidden">',
  '<div className="lg:col-span-2 prime-premium-card border border-amber-500/30 rounded-xl p-5 relative overflow-hidden group hover:border-amber-500/50 transition-colors">' +
  '\n          <div className="absolute -top-20 -right-20 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl animate-[prime-pulse-slow_4s_ease-in-out_infinite] pointer-events-none"></div>' +
  '\n          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl animate-[prime-pulse-slow_4s_ease-in-out_infinite]" style={{ animationDelay: \'2s\' }}></div>'
);

fs.writeFileSync('src/components/MainDashboard.tsx', code, 'utf8');
