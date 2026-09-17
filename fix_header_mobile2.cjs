const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

// The `overflow-x-auto` on the parent strip makes it scrollable. That is exactly what the user wanted:
// "Keep the category navigation horizontally scrollable where appropriate."
// "Do not allow the entire page to become horizontally scrollable."
// The flex-row layout + overflow-x-auto prevents page overflow and lets the strip itself scroll.

// We need to double check the container wrapping the explore bar and the nav.
// Both the nav bar and explore bar are inside `<div className="sticky top-14 z-[990] w-full flex flex-col shadow-md shadow-slate-900/50">`
// They shouldn't overflow the page.
// The `w-full` helps.

code = code.replace(
  '<div className="w-full bg-[#060A12]/95 backdrop-blur border-t border-b border-slate-800/60 px-3 sm:px-4 py-1 flex items-center justify-between gap-4 text-[10px] font-mono-code text-slate-400 select-none overflow-x-auto no-scrollbar whitespace-nowrap">',
  '<div className="w-full bg-[#060A12]/95 backdrop-blur border-t border-b border-slate-800/60 px-3 sm:px-4 py-1 flex items-center justify-between gap-2 sm:gap-4 text-[10px] font-mono-code text-slate-400 select-none overflow-x-auto no-scrollbar whitespace-nowrap">'
);

fs.writeFileSync('src/components/Header.tsx', code, 'utf8');
