import { describe, it, expect } from 'vitest';
import { createCustomer, deleteCustomer, readUsers, refreshRemovedMembers } from '../authService';

describe('removed members stay removed', () => {
  it('a stale/empty shared list can not bring a deleted member back', async () => {
    const name = `tmpmember${Date.now()}`;
    const c = createCustomer({ name, username: name, password: 'secret12' });
    expect(c.success).toBe(true);
    expect(deleteCustomer(c.user!.id).success).toBe(true);
    expect(readUsers().some((u) => u.username === name)).toBe(false);
    await refreshRemovedMembers(); // shared store unreachable here → empty fallback must not shrink the in-memory list
    expect(readUsers().some((u) => u.username === name)).toBe(false);
  });
  it('the same username can be created again on purpose', () => {
    const name = `tmpagain${Date.now()}`;
    const a = createCustomer({ name, username: name, password: 'secret12' });
    deleteCustomer(a.user!.id);
    const b = createCustomer({ name, username: name, password: 'secret12' });
    expect(b.success).toBe(true);
    expect(readUsers().some((u) => u.username === name)).toBe(true);
    deleteCustomer(b.user!.id);
  });
});
