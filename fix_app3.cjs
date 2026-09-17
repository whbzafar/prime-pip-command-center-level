const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace('{isNotificationsOpen <MobileBottomNav<MobileBottomNav (', '{isNotificationsOpen && (');
fs.writeFileSync('src/App.tsx', code, 'utf8');
