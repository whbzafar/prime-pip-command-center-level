import { describe, it, expect } from 'vitest';
import { distanceToZone } from './sbtSetups';

describe('distanceToZone', () => {
  const z = { top: 1.1, bottom: 1.09 };
  it('is 0 inside the zone', () => expect(distanceToZone(1.095, z, 1)).toBe(0));
  it('buy: approaching from above gives the gap to the top edge', () => expect(distanceToZone(1.105, z, 1)).toBeCloseTo(0.005, 6));
  it('buy: price already below the zone is not an approach', () => expect(distanceToZone(1.08, z, 1)).toBe(-1));
  it('sell: approaching from below gives the gap to the bottom edge', () => expect(distanceToZone(1.085, z, -1)).toBeCloseTo(0.005, 6));
  it('sell: price above the zone is not an approach', () => expect(distanceToZone(1.11, z, -1)).toBe(-1));
});
