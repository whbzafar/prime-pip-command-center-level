const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
const snippet = code.substring(0, 100);
console.log(JSON.stringify(snippet));
