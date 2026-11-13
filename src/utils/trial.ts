/**
 * FREE OPEN-ACCESS TRIAL — everyone with an account gets the full application
 * (except the Admin Panel and Meta 5) from now until the end of 12 Nov 2026, Pakistan time
 * (today + the next three days). After that moment everything reverts automatically.
 */
export const TRIAL_START = Date.parse('2026-11-09T00:00:00+05:00');
export const TRIAL_END = Date.parse('2026-11-12T23:59:59+05:00');
export const TRIAL_ID = 'open-trial-2026-11';

/** The free open-access trial is permanently over: there is no free tier any more. */
export const isTrialActive = (_now = Date.now()) => false;

export function trialRemaining(now = Date.now()) {
  const ms = Math.max(0, TRIAL_END - now);
  const s = Math.floor(ms / 1000);
  return { ms, days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}
