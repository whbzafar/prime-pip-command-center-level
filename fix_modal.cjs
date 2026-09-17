const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx.final', 'utf8');

const modalRegex = /      {\/\* Global Time & Market Session Modal \*\/}[\s\S]*?      \/>\n      <\/div>\n    <\/header>\n  \);\n};\n/;
const match = code.match(modalRegex);

if (match) {
  const newEnd = `      </div>\n      {/* Global Time & Market Session Modal */}\n      <GlobalTimeSessionModal\n        isOpen={isTimeModalOpen}\n        onClose={() => setIsTimeModalOpen(false)}\n      />\n    </header>\n  );\n};\n`;
  code = code.replace(modalRegex, newEnd);
  fs.writeFileSync('src/components/Header.tsx', code, 'utf8');
} else {
  console.log("Could not find modal section");
}
