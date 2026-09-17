const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

// Ensure Explore All Categories indicator shrinks correctly on mobile without causing overflow.
// Replace the hardcoded `min-w-[200px]` with flex settings that allow shrinking.
code = code.replace(
  '<div className="flex-1 min-w-[200px] max-w-md mx-auto flex items-center gap-3 shrink-0">',
  '<div className="flex-1 min-w-0 max-w-md mx-auto flex items-center gap-2 sm:gap-3 shrink-1">'
);

// Allow the "EXPLORE ALL CATEGORIES" text to be truncated or shrink
code = code.replace(
  '<span>EXPLORE ALL CATEGORIES</span>',
  '<span className="truncate">EXPLORE ALL CATEGORIES</span>'
);

fs.writeFileSync('src/components/Header.tsx', code, 'utf8');
