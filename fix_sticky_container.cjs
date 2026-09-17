const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

// 1. Remove the sticky container wrapper that wraps BOTH the Nav and Explore strips.
code = code.replace(
  '<div className="sticky top-14 z-[990] w-full flex flex-col shadow-md shadow-slate-900/50">\n      {/* Horizontally Scrollable Full Navigation Bar (Desktop, Laptop, Tablet & Mobile) */}\n      <div className="w-full border-t border-slate-800/60 py-1.5 bg-[#090D15]/95 backdrop-blur overflow-hidden relative">',
  '{/* Horizontally Scrollable Full Navigation Bar (Desktop, Laptop, Tablet & Mobile) */}\n      <div className="w-full border-t border-slate-800/60 py-1.5 bg-[#090D15]/95 backdrop-blur overflow-hidden sticky top-14 z-[990] shadow-md shadow-slate-900/50">'
);

// 2. Remove the closing </div> of the sticky container
code = code.replace(
  '        </button>\n      </div>\n      </div>\n      </div>\n      {/* Global Time & Market Session Modal */}',
  '        </button>\n      </div>\n      </div>\n      {/* Global Time & Market Session Modal */}'
);

fs.writeFileSync('src/components/Header.tsx', code, 'utf8');
