const fs = require('fs');
let code = fs.readFileSync('src/components/MainDashboard.tsx', 'utf8');

const tier2start = `{/* ================================================================= */}
      {/* OPERATIONAL INTELLIGENCE: AI COACH • DAILY DEVELOPMENT • SIGNALS  */}
      {/* ================================================================= */}`;

const tier3end = `      <DashboardQuickActions
        onOpenNewTrade={onOpenNewTrade}
        onNavigateToTab={onNavigateToTab}
      />`;

const startIndex = code.indexOf(tier2start);
const endIndex = code.indexOf(tier3end) + tier3end.length;

if (startIndex !== -1 && endIndex > startIndex) {
  code = code.substring(0, startIndex) + code.substring(endIndex);
  console.log("Blocks removed.");
} else {
  console.log("Could not find the blocks to remove.");
}

code = code.replace("import { DashboardAiCoach } from './dashboard/DashboardAiCoach';", "");
code = code.replace("import { DashboardDailyDevelopment } from './dashboard/DashboardDailyDevelopment';", "");
code = code.replace("import { DashboardSignals } from './dashboard/DashboardSignals';", "");
code = code.replace("import { DashboardQuickActions } from './dashboard/DashboardQuickActions';", "");

fs.writeFileSync('src/components/MainDashboard.tsx', code, 'utf8');
