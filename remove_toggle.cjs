const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

const toggleBtnRegex = /\{\/\* Manual Chevron Toggle Button[\s\S]*?<\/button>/;
code = code.replace(toggleBtnRegex, '');

fs.writeFileSync('src/components/Header.tsx', code, 'utf8');
