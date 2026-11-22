import { describe, it, expect } from 'vitest';
import { getSelected, deleteSelected } from './chartTools';
describe('chart selection helpers', () => {
  it('are safe without a chart', () => { expect(getSelected(null)).toBeNull(); expect(deleteSelected(null)).toBe(false); });
  it('delete the selected overlay only', () => {
    const removed: string[] = [];
    const chart: any = { _chartStore: { getOverlayStore: () => ({ getClickInstanceInfo: () => ({ instance: { id: 'o1', name: 'segment' } }), getInstanceById: (id: string) => (id === 'o1' ? {} : null) }) }, removeOverlay: (f: any) => removed.push(f.id) };
    expect(getSelected(chart)).toEqual({ id: 'o1', name: 'segment' });
    expect(deleteSelected(chart)).toBe(true); expect(removed).toEqual(['o1']);
  });
});
