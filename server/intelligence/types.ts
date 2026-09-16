/**
 * Chat Intelligence Types & Capability Contracts
 */

export type CapabilityId =
  | 'ECONOMIC_CALENDAR'
  | 'SESSION_CLOCK'
  | 'LOT_SIZE'
  | 'CRISIS_RESOURCE'
  | 'UNKNOWN';

export interface BaseCardPayload {
  kind: CapabilityId;
  title: string;
  timestamp: number;
  confidence: number;
}

export interface CalendarEventSummary {
  id: string;
  eventName: string;
  currency: string;
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
  timePkt: string;
  timeUtc: string;
  dateStr: string;
}

export interface CalendarCardPayload extends BaseCardPayload {
  kind: 'ECONOMIC_CALENDAR';
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

export interface SessionClockCardPayload extends BaseCardPayload {
  kind: 'SESSION_CLOCK';
  currentTimeUtc: string;
  currentTimePkt: string;
  activeSessions: string[];
  isOverlapActive: boolean;
  overlapName?: string;
  sessions: MarketSessionInfo[];
  nextEventDescription: string;
}

export interface LotSizeCardPayload extends BaseCardPayload {
  kind: 'LOT_SIZE';
  pair: string;
  accountBalance: number;
  riskPercentage: number;
  riskAmount: number;
  stopLossPips: number;
  calculatedLotSize: number;
}

export interface CrisisCardPayload extends BaseCardPayload {
  kind: 'CRISIS_RESOURCE';
  compassionateMessage: string;
  helplines: { name: string; contact: string; desc: string }[];
  recommendedAction: string;
}

export interface UnavailableCardPayload extends BaseCardPayload {
  kind: 'UNKNOWN';
  reason: string;
}

export type IntentCardPayload =
  | CalendarCardPayload
  | SessionClockCardPayload
  | LotSizeCardPayload
  | CrisisCardPayload
  | UnavailableCardPayload;

export type CapabilityHandler = (
  entities: Record<string, string>,
  userId: string
) => Promise<IntentCardPayload | null>;
