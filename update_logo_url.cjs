const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

code = code.replace('<img src="/channels4_profile.jpg"', '<img src="https://yt3.ggpht.com/a/AATXAJyB_3l6v_Gk8k-uM5p_4-1w9fW_s8l_h2e2Ew=s900-c-k-c0xffffffff-no-rj-mo"');

fs.writeFileSync('src/components/Header.tsx', code, 'utf8');
