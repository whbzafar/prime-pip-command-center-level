const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

code = code.replace(
  "style={{ paddingTop: '3.5rem' }}",
  "style={{ paddingTop: !isHeaderCollapsed ? '3.5rem' : '0' }}"
);

fs.writeFileSync('src/components/Header.tsx', code, 'utf8');
