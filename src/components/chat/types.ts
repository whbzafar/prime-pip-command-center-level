export type CapabilityId =
  | 'ECONOMIC_CALENDAR'
  | 'SESSION_CLOCK'
  | 'LOT_SIZE'
  | 'CRISIS_RESOURCE'
  | 'UNKNOWN';

export interface CalendarEventSummary {
  id: string;
  eventName: string;
  currency: string;
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
  timePkt: string;
  timeUtc: string;
  dateStr: string;
}

export interface CalendarCardPayload {
  kind: 'ECONOMIC_CALENDAR';
  title: string;
  timestamp: number;
  confidence: number;
  currencyFilter?: string;
  events: CalendarEventSummary[];
  nextHighImpactTime?: string;
}

export interface MarketSessionInfo {
  name: 'Sydney' | 'Tokyo' | 'London' | 'New York';
  status: 'OPEN' | 'CLOSED';
  opensUtc: string;
  closesUtc: string;
  opensPkt: string;
  closesPkt: string;
}

export interface SessionClockCardPayload {
  kind: 'SESSION_CLOCK';
  title: string;
  timestamp: number;
  confidence: number;
  currentTimeUtc: string;
  currentTimePkt: string;
  activeSessions: string[];
  isOverlapActive: boolean;
  overlapName?: string;
  sessions: MarketSessionInfo[];
  nextEventDescription: string;
}

export interface LotSizeCardPayload {
  kind: 'LOT_SIZE';
  title: string;
  timestamp: number;
  confidence: number;
  pair: string;
  accountBalance: number;
  riskPercentage: number;
  riskAmount: number;
  stopLossPips: number;
  calculatedLotSize: number;
}

export interface CrisisCardPayload {
  kind: 'CRISIS_RESOURCE';
  title: string;
  timestamp: number;
  confidence: number;
  compassionateMessage: string;
  helplines: { name: string; contact: string; desc: string }[];
  recommendedAction: string;
}

export interface UnavailableCardPayload {
  kind: 'UNKNOWN';
  title: string;
  timestamp: number;
  confidence: number;
  reason: string;
}

export type IntentCardPayload =
  | CalendarCardPayload
  | SessionClockCardPayload
  | LotSizeCardPayload
  | CrisisCardPayload
  | UnavailableCardPayload;
