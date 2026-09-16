import { CapabilityHandler, SessionClockCardPayload, MarketSessionInfo } from '../types.js';

export const sessionClockHandler: CapabilityHandler = async (entities, userId) => {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const utcTotalMin = utcHours * 60 + utcMinutes;

  // Session hours in UTC minutes from 00:00
  // Sydney: 21:00 UTC to 06:00 UTC (crosses midnight)
  // Tokyo: 00:00 UTC to 09:00 UTC
  // London: 08:00 UTC to 16:30 UTC
  // New York: 13:00 UTC to 21:30 UTC
  const isSydneyOpen = utcTotalMin >= 21 * 60 || utcTotalMin < 6 * 60;
  const isTokyoOpen = utcTotalMin >= 0 && utcTotalMin < 9 * 60;
  const isLondonOpen = utcTotalMin >= 8 * 60 && utcTotalMin < 16.5 * 60;
  const isNewYorkOpen = utcTotalMin >= 13 * 60 && utcTotalMin < 21.5 * 60;

  const activeSessions: string[] = [];
  if (isLondonOpen) activeSessions.push('London');
  if (isNewYorkOpen) activeSessions.push('New York');
  if (isTokyoOpen) activeSessions.push('Tokyo');
  if (isSydneyOpen) activeSessions.push('Sydney');

  const isLondonNyOverlap = isLondonOpen && isNewYorkOpen;
  const isTokyoLondonOverlap = isTokyoOpen && isLondonOpen;

  const sessions: MarketSessionInfo[] = [
    {
      name: 'London',
      status: isLondonOpen ? 'OPEN' : 'CLOSED',
      opensUtc: '08:00 UTC',
      closesUtc: '16:30 UTC',
      opensPkt: '01:00 PM PKT',
      closesPkt: '09:30 PM PKT',
    },
    {
      name: 'New York',
      status: isNewYorkOpen ? 'OPEN' : 'CLOSED',
      opensUtc: '13:00 UTC',
      closesUtc: '21:30 UTC',
      opensPkt: '06:00 PM PKT',
      closesPkt: '02:30 AM PKT',
    },
    {
      name: 'Tokyo',
      status: isTokyoOpen ? 'OPEN' : 'CLOSED',
      opensUtc: '00:00 UTC',
      closesUtc: '09:00 UTC',
      opensPkt: '05:00 AM PKT',
      closesPkt: '02:00 PM PKT',
    },
    {
      name: 'Sydney',
      status: isSydneyOpen ? 'OPEN' : 'CLOSED',
      opensUtc: '21:00 UTC',
      closesUtc: '06:00 UTC',
      opensPkt: '02:00 AM PKT',
      closesPkt: '11:00 AM PKT',
    },
  ];

  const timeStrUtc = now.toUTCString().slice(17, 22) + ' UTC';
  const timeStrPkt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(now) + ' PKT';

  let overlapName: string | undefined;
  if (isLondonNyOverlap) {
    overlapName = 'London / New York Institutional Overlap (Peak Liquidity)';
  } else if (isTokyoLondonOverlap) {
    overlapName = 'Tokyo / London Transition';
  }

  let nextEventDescription = 'Normal Session Flow';
  if (isLondonNyOverlap) {
    nextEventDescription = 'High volatility window active. Prime institutional SBT Model execution.';
  } else if (isLondonOpen) {
    nextEventDescription = 'London Session active. European order flow dominates.';
  } else if (isNewYorkOpen) {
    nextEventDescription = 'New York Session active. US afternoon volume settling.';
  } else if (isAsianOpen(isTokyoOpen, isSydneyOpen)) {
    nextEventDescription = 'Asian Session range accumulation.';
  }

  const payload: SessionClockCardPayload = {
    kind: 'SESSION_CLOCK',
    title: 'Global Forex Session Clock',
    timestamp: Date.now(),
    confidence: 0.98,
    currentTimeUtc: timeStrUtc,
    currentTimePkt: timeStrPkt,
    activeSessions,
    isOverlapActive: Boolean(overlapName),
    overlapName,
    sessions,
    nextEventDescription,
  };

  return payload;
};

function isAsianOpen(tokyo: boolean, sydney: boolean): boolean {
  return tokyo || sydney;
}
