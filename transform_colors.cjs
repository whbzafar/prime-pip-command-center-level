const fs = require('fs');
const path = require('path');

function walkSync(dir, filelist) {
  let files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        filelist.push(path.join(dir, file));
      }
    }
  });
  return filelist;
}

const files = walkSync('src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  // Replace amber with blue/cyan
  content = content.replace(/amber-400/g, 'cyan-400');
  content = content.replace(/amber-500/g, 'blue-500');
  content = content.replace(/amber-900/g, 'blue-900');
  content = content.replace(/amber-200/g, 'cyan-200');
  content = content.replace(/amber-100/g, 'cyan-100');
  
  // Deepen dark backgrounds
  content = content.replace(/bg-slate-900/g, 'bg-slate-950');
  content = content.replace(/#070A11/g, '#020617'); // Darker slate-950 equivalent
  content = content.replace(/#070a12/g, '#020617');
  
  // Fix specific premium card instance in MainDashboard if it exists
  content = content.replace(/border-amber-500/g, 'border-blue-500');
  content = content.replace(/bg-amber-500/g, 'bg-blue-500');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
  }
});

console.log("TSX colors transformed.");
