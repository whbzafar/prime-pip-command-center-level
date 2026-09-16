import { CapabilityHandler, CalendarCardPayload, CalendarEventSummary } from '../types.js';
import { fetchUpcomingEvents, CalendarEvent } from '../../economicCalendarService.js';

export const calendarHandler: CapabilityHandler = async (entities, userId) => {
  const currency = entities.currency ? entities.currency.toUpperCase().trim() : undefined;
  const rawEvents: CalendarEvent[] = fetchUpcomingEvents(10);

  let filtered = rawEvents;
  if (currency && currency !== 'ALL') {
    filtered = rawEvents.filter((e) => e.currency === currency);
  }

  // Fallback to high importance if filtered is empty
  if (filtered.length === 0) {
    filtered = rawEvents.filter((e) => e.importance === 'HIGH');
  }

  const selected = filtered.slice(0, 3);

  const eventSummaries: CalendarEventSummary[] = selected.map((e) => ({
    id: e.id,
    eventName: e.eventName,
    currency: e.currency,
    importance: e.importance,
    timePkt: e.timePkt,
    timeUtc: e.timeUtc,
    dateStr: e.datePkt || e.date,
  }));

  const payload: CalendarCardPayload = {
    kind: 'ECONOMIC_CALENDAR',
    title: currency ? `Upcoming Macro Events for ${currency}` : 'High-Impact Economic Calendar Wire',
    timestamp: Date.now(),
    confidence: 0.92,
    currencyFilter: currency,
    events: eventSummaries,
    nextHighImpactTime: eventSummaries[0]?.timePkt,
  };

  return payload;
};
