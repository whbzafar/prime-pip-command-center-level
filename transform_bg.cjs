const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

const oldBg = `<div className="fixed inset-0 pointer-events-none z-0" style={{ background: 'radial-gradient(circle at 15% 50%, rgba(14, 165, 233, 0.05), transparent 40%), radial-gradient(circle at 85% 30%, rgba(245, 158, 11, 0.05), transparent 40%)' }}></div>
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>`;

const newBg = `<div className="fixed inset-0 pointer-events-none z-0" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.15), transparent 50%), radial-gradient(circle at 50% 100%, rgba(56, 189, 248, 0.1), transparent 50%)' }}></div>
      
      {/* Corner Light Flares */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
         <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[10px] bg-blue-500 blur-3xl transform rotate-45 opacity-40"></div>
         <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[10px] bg-cyan-400 blur-3xl transform -rotate-45 opacity-40"></div>
         <div className="absolute bottom-[-20%] left-[-10%] w-[40%] h-[10px] bg-cyan-500 blur-3xl transform -rotate-45 opacity-30"></div>
         <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[10px] bg-blue-600 blur-3xl transform rotate-45 opacity-30"></div>
      </div>
      
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>`;

// Fallback regex if exactly string match fails due to previous replacements
const regexBgContainerStart = /<div className="min-h-screen[^>]*>/;
const bgContainerMatch = app.match(regexBgContainerStart);

if (bgContainerMatch) {
  // Let's just surgically replace the inside elements up to App Layout
  const appLayoutIndex = app.indexOf('{/* App Layout */}');
  if (appLayoutIndex !== -1) {
    const beforeContainer = app.substring(0, bgContainerMatch.index);
    const containerTag = `<div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col selection:bg-blue-500/30 selection:text-cyan-200 relative overflow-hidden">`;
    const afterAppLayout = app.substring(appLayoutIndex);
    
    app = beforeContainer + containerTag + '\n      {/* Global Animated Background Elements */}\n      ' + newBg + '\n\n      ' + afterAppLayout;
    
    fs.writeFileSync('src/App.tsx', app, 'utf8');
    console.log("App background transformed.");
  }
}
