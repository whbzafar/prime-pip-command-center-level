const fs = require('fs');
const map = JSON.parse(fs.readFileSync('dist/server.cjs.map', 'utf8'));
const index = map.sources.findIndex(s => s.endsWith('server.ts'));
if (index >= 0) {
  fs.writeFileSync('server.ts', map.sourcesContent[index], 'utf8');
  console.log('Restored server.ts!');
} else {
  console.log('Could not find server.ts in source map');
}
