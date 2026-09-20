/**
 * Gap Ledger for Community Chat Intelligence
 * Tracks user requests that could not be handled or had low confidence,
 * clustering them into thematic buckets so developers know what to build next.
 */

export interface GapRecord {
  id: string;
  timestamp: number;
  anonymizedQuery: string;
  cluster: string;
  detectedKeywords: string[];
  frequency: number;
}

export interface GapClusterSummary {
  clusterName: string;
  count: number;
  sampleQueries: string[];
  lastObserved: string;
}

const gapHistory: GapRecord[] = [];
const clusterMap = new Map<string, { count: number; samples: string[]; lastSeen: number }>();

// Predefined cluster categorization rules
const CLUSTER_RULES: { name: string; pattern: RegExp }[] = [
  { name: 'CHART_SCREENSHOT_ANALYSIS', pattern: /chart|screenshot|look at this|image|photo|candlestick|pattern/i },
  { name: 'SPECIFIC_BROKER_INTEGRATION', pattern: /exness|ic markets|mt4|mt5|metatrader|broker|deposit|withdraw/i },
  { name: 'CRYPTO_PAIRS', pattern: /btc|bitcoin|eth|ethereum|sol|crypto|binance/i },
  { name: 'SIGNAL_BOT_ALERTS', pattern: /alert me|signal bot|telegram|notification|ping me/i },
  { name: 'FUNDED_ACCOUNT_RULES', pattern: /ftmo|mff|prop firm|challenge|phase 1|phase 2|drawdown limit/i },
  { name: 'GENERAL_MACRO_INQUIRY', pattern: /fed|powell|cpi|interest rate|inflation|recession/i },
];

export function recordGap(rawText: string): void {
  // Anonymize text
  const clean = rawText
    .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[REDACTED_EMAIL]')
    .replace(/(?:https?:\/\/|www\.)\S+/gi, '[REDACTED_LINK]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[REDACTED_PHONE]')
    .replace(/\b\d{7,}\b/g, '[REDACTED_NUMBER]')
    .slice(0, 150);

  let assignedCluster = 'UNCLASSIFIED_INTENT';
  for (const rule of CLUSTER_RULES) {
    if (rule.pattern.test(clean)) {
      assignedCluster = rule.name;
      break;
    }
  }

  const existing = clusterMap.get(assignedCluster);
  if (existing) {
    existing.count += 1;
    existing.lastSeen = Date.now();
    if (existing.samples.length < 5 && !existing.samples.includes(clean)) {
      existing.samples.push(clean);
    }
  } else {
    clusterMap.set(assignedCluster, {
      count: 1,
      samples: [clean],
      lastSeen: Date.now(),
    });
  }

  gapHistory.push({
    id: `gap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    anonymizedQuery: clean,
    cluster: assignedCluster,
    detectedKeywords: clean.toLowerCase().split(/\s+/).slice(0, 5),
    frequency: 1,
  });

  // Keep gapHistory bounded
  if (gapHistory.length > 500) {
    gapHistory.splice(0, 100);
  }
}

export function getClusters(): GapClusterSummary[] {
  const result: GapClusterSummary[] = [];
  for (const [name, data] of clusterMap.entries()) {
    result.push({
      clusterName: name,
      count: data.count,
      sampleQueries: data.samples,
      lastObserved: new Date(data.lastSeen).toISOString(),
    });
  }
  return result.sort((a, b) => b.count - a.count);
}