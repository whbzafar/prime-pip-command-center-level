import type { NextFunction, Request, Response } from 'express';

const PK_TIMEZONE = 'Asia/Karachi';
const MAX_COLLECTIONS = { accounts: 100, trades: 5000, rules: 500, goals: 200 };

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.removeHeader('X-Powered-By');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(self), microphone=(self)');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  if (_req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
  next();
}

export function getPakistanCalendarDate(input: unknown): string | null {
  if (typeof input !== 'string' && !(input instanceof Date) && typeof input !== 'number') return null;
  if (typeof input === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(input.trim())) return input.trim();
  const date = input instanceof Date ? input : new Date(input as string | number);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PK_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

export function validateCustomerDataPayload(
  data: any,
  currentUser: { id: string; role?: string; isDeveloper?: boolean }
): { ok: true; data: any } | { ok: false; status: number; error: string } {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, status: 400, error: 'Customer data must be a JSON object.' };
  }

  for (const [key, max] of Object.entries(MAX_COLLECTIONS)) {
    if (data[key] !== undefined && !Array.isArray(data[key])) {
      return { ok: false, status: 400, error: key + ' must be an array.' };
    }
    if (Array.isArray(data[key]) && data[key].length > max) {
      return { ok: false, status: 413, error: key + ' exceeds the maximum supported size of ' + max + ' records.' };
    }
  }

  const safeData = { ...data };
  if (Array.isArray(data.trades)) {
    const privileged = currentUser.role === 'ADMIN' || currentUser.role === 'DEVELOPER' || currentUser.isDeveloper === true;
    if (!privileged) {
      const counts = new Map<string, number>();
      for (const trade of data.trades) {
        const day = getPakistanCalendarDate(trade?.date);
        if (day) counts.set(day, (counts.get(day) || 0) + 1);
      }
      const violations = [...counts.entries()].filter(([, count]) => count > 2);
      if (violations.length > 0) {
        return {
          ok: false,
          status: 409,
          error: 'Daily trade policy violation: maximum 2 trades are allowed per Pakistan calendar day. Invalid day(s): ' +
            violations.map(([day, count]) => day + ' (' + count + ')').join(', ') + '.',
        };
      }
    }
    safeData.trades = data.trades.map((trade: any) => ({ ...trade, userId: currentUser.id }));
  }
  if (Array.isArray(data.accounts)) safeData.accounts = data.accounts.map((item: any) => ({ ...item, userId: currentUser.id }));
  if (Array.isArray(data.rules)) safeData.rules = data.rules.map((item: any) => ({ ...item, userId: currentUser.id }));
  if (Array.isArray(data.goals)) safeData.goals = data.goals.map((item: any) => ({ ...item, userId: currentUser.id }));

  return { ok: true, data: safeData };
}
