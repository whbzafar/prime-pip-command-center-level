const fs = require('fs');
let code = fs.readFileSync('src/components/CommunityChat.tsx', 'utf8');

code = code.replace(/if \(!inputText\.trim\(\) if \(!inputText.*return;/g, 'if (!inputText.trim() && !selectedPhoto && !audioBase64 && !selectedDriveFile && !selectedLocalFile) return;');

fs.writeFileSync('src/components/CommunityChat.tsx', code, 'utf8');
