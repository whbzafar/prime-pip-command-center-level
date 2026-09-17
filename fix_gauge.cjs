const fs = require('fs');
let code = fs.readFileSync('src/components/MainDashboard.tsx', 'utf8');

// Replace the stroke-slate-800 circle with something slightly brighter and dashed maybe?
code = code.replace(
  'className="stroke-slate-800"\n                    strokeWidth="8"\n                    fill="transparent"',
  'className="stroke-slate-800/60"\n                    strokeWidth="8"\n                    fill="transparent"\n                    strokeDasharray="4 6"'
);

// Add a drop shadow filter to the colored circle
code = code.replace(
  'className={`${',
  'style={{ filter: \'drop-shadow(0 0 8px currentColor)\' }}\n                    className={`${'
);

// We need to fix the animation for the sub-score progress bars too. Let's make them glow.
code = code.replace(
  'className={`h-full rounded-full transition-all duration-700 ${',
  'className={`h-full rounded-full transition-all duration-700 shadow-[0_0_10px_currentColor] ${'
);

fs.writeFileSync('src/components/MainDashboard.tsx', code, 'utf8');
