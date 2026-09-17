const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

// The first button in the Explore strip:
code = code.replace(
  'className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${',
  'className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all cursor-pointer shrink-0 ${'
);

// We need to make sure this applies to both buttons (left and right scroll) in the explore strip.
// It will replace both since we can use replaceAll or regex.
code = code.replaceAll(
  'className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${',
  'className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all cursor-pointer shrink-0 ${'
);

fs.writeFileSync('src/components/Header.tsx', code, 'utf8');
