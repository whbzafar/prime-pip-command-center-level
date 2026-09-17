const fs = require('fs');
let code = fs.readFileSync('src/components/MainDashboard.tsx', 'utf8');

// I will use regex or string replace to remove TIER 2 and TIER 3.
// Since these sections are large, I'll match the blocks.

const tier2start = `{/* ================================================================= */}
      {/* TIER 2: OPERATIONAL INTELLIGENCE BENTO (AI COACH, DEV, SIGNALS)   */}
      {/* ================================================================= */}`;

const tier3end = `      <DashboardQuickActions
        onOpenNewTrade={onOpenNewTrade}
        onNavigateToTab={onNavigateToTab}
      />`;

// Let's find the exact string from tier2start to tier3end
const startIndex = code.indexOf(tier2start);
const endIndex = code.indexOf(tier3end) + tier3end.length;

if (startIndex !== -1 && endIndex > startIndex) {
  code = code.substring(0, startIndex) + code.substring(endIndex);
} else {
  console.log("Could not find the blocks to remove.");
}

// Remove imports for the deleted components
code = code.replace("import { DashboardAiCoach } from './dashboard/DashboardAiCoach';", "");
code = code.replace("import { DashboardDailyDevelopment } from './dashboard/DashboardDailyDevelopment';", "");
code = code.replace("import { DashboardSignals } from './dashboard/DashboardSignals';", "");
code = code.replace("import { DashboardQuickActions } from './dashboard/DashboardQuickActions';", "");

fs.writeFileSync('src/components/MainDashboard.tsx', code, 'utf8');
