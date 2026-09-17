const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx.temp', 'utf8');

// The pattern to match is the 3 closing divs
const closingDivsPattern = /        <\/div>\n      <\/div>\n    <\/div>\n/;
code = code.replace(closingDivsPattern, '        </div>\n      </div>\n'); // Removed the outermost </div>

// Now add the `</div>` just before `</header>`
const headerClosePattern = /    <\/header>/;
code = code.replace(headerClosePattern, '      </div>\n    </header>');

fs.writeFileSync('src/components/Header.tsx.temp2', code, 'utf8');
