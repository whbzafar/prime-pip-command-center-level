const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');

// Button color mapping
css = css.replace(/#f59e0b/g, '#3b82f6');
css = css.replace(/#d97706/g, '#1d4ed8');
css = css.replace(/#fbbf24/g, '#38bdf8');
css = css.replace(/rgba\(245, 158, 11/g, 'rgba(59, 130, 246');

// Rewrite prime-premium-card
const premiumCardRegex = /\.prime-premium-card\s*\{[\s\S]*?\}\s*\.prime-premium-card::before\s*\{[\s\S]*?\}\s*\.prime-premium-card::after\s*\{[\s\S]*?\}/;
css = css.replace(premiumCardRegex, `.prime-premium-card {
  position: relative;
  background: linear-gradient(180deg, #050b14 0%, #020617 100%);
  border: 1px solid rgba(56, 189, 248, 0.4);
  box-shadow: 0 0 25px rgba(59, 130, 246, 0.15), inset 0 0 15px rgba(56, 189, 248, 0.05);
  border-radius: 16px;
  overflow: hidden;
}
.prime-premium-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(59, 130, 246, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(59, 130, 246, 0.05) 1px, transparent 1px);
  background-size: 20px 20px;
  pointer-events: none;
  opacity: 0.5;
}
.prime-premium-card::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 100%;
  background: linear-gradient(to bottom, transparent, rgba(56, 189, 248, 0.05), transparent);
  animation: prime-grid-scan 4s linear infinite;
  pointer-events: none;
}
.prime-premium-card:hover {
  border-color: rgba(56, 189, 248, 0.8);
  box-shadow: 0 0 35px rgba(59, 130, 246, 0.3), inset 0 0 25px rgba(56, 189, 248, 0.1);
}`);

// Add glowing neon utilities
if (!css.includes('.neon-border')) {
  css += `
.neon-border {
  border: 1px solid rgba(56, 189, 248, 0.5);
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.3), inset 0 0 10px rgba(59, 130, 246, 0.1);
}
.neon-text {
  color: #fff;
  text-shadow: 0 0 10px rgba(56, 189, 248, 0.8), 0 0 20px rgba(59, 130, 246, 0.5);
}
`;
}

fs.writeFileSync('src/index.css', css, 'utf8');
console.log("CSS transformed.");
