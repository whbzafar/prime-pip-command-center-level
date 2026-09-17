const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

// 1. Remove the toggle button
// Search for: {/* Manual Chevron Toggle Button ... to the end of the button
const toggleBtnRegex = /\{\/\* Manual Chevron Toggle Button[\s\S]*?<\/button>/;
code = code.replace(toggleBtnRegex, '');

// 2. Remove shrinking on Explore All Categories
code = code.replace(
  '<div className="flex-1 min-w-0 max-w-md mx-auto flex items-center gap-2 sm:gap-3 shrink-1">',
  '<div className="flex-1 min-w-[200px] max-w-md mx-auto flex items-center gap-3 shrink-0">'
);
code = code.replace(
  '<span className="truncate">EXPLORE ALL CATEGORIES</span>',
  '<span>EXPLORE ALL CATEGORIES</span>'
);

// Remove the `toggleHeader` function definition since it's no longer used
const toggleFuncRegex = /const toggleHeader = \(\) => \{\s*setIsHeaderCollapsed\(\(prev\) => !prev\);\s*\};/;
code = code.replace(toggleFuncRegex, '');

fs.writeFileSync('src/components/Header.tsx', code, 'utf8');
