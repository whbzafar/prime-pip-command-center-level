const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

code = code.replace(
  'transition-[max-height,opacity]',
  'transition-all'
);

fs.writeFileSync('src/components/Header.tsx', code, 'utf8');
