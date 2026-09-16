import { CapabilityId, CapabilityHandler } from './types.js';
import { calendarHandler } from './handlers/calendarHandler.js';
import { sessionClockHandler } from './handlers/sessionClockHandler.js';
import { lotSizeHandler } from './handlers/lotSizeHandler.js';
import { crisisHandler } from './handlers/crisisHandler.js';

// Static Registry populated at module load
const registry = new Map<CapabilityId, CapabilityHandler>();

registry.set('ECONOMIC_CALENDAR', calendarHandler);
registry.set('SESSION_CLOCK', sessionClockHandler);
registry.set('LOT_SIZE', lotSizeHandler);
registry.set('CRISIS_RESOURCE', crisisHandler);

export function resolveCapability(id: CapabilityId): CapabilityHandler | undefined {
  return registry.get(id);
}

export function getAllCapabilities(): CapabilityId[] {
  return Array.from(registry.keys());
}
