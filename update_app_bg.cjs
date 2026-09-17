const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  '<div className="min-h-screen bg-[#070A11] text-slate-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200">',
  '<div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200 relative overflow-hidden">\n      {/* Global Animated Background Elements */}\n      <div className="fixed inset-0 pointer-events-none z-0" style={{ background: \'radial-gradient(circle at 15% 50%, rgba(14, 165, 233, 0.05), transparent 40%), radial-gradient(circle at 85% 30%, rgba(245, 158, 11, 0.05), transparent 40%)\' }}></div>\n      <div className="fixed inset-0 pointer-events-none z-0 opacity-20" style={{ backgroundImage: \'linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)\', backgroundSize: \'30px 30px\' }}></div>\n'
);

fs.writeFileSync('src/App.tsx', code, 'utf8');
