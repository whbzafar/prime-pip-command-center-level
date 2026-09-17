const fs = require('fs');
let code = fs.readFileSync('src/components/communication/PrivateChat.tsx', 'utf8');

code = code.replace(/if \(!inputText\.trim\(\) if \(!inputText.*return;/g, 'if (!inputText.trim() && !selectedPhoto && !audioBase64 && !selectedLocalFile) return;');

fs.writeFileSync('src/components/communication/PrivateChat.tsx', code, 'utf8');
