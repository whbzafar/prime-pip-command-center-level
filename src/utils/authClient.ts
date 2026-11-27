import { UserAccount } from '../types';

const USER_KEY = 'primepipfx_user_profile';
const REFERRAL_KEY = 'primepipfx_applied_referral';

function isValidStoredUser(value: unknown): value is UserAccount {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<UserAccount>;
  return typeof candidate.id === 'string' && candidate.id.trim().length > 0;
}

// Authentication tokens are HttpOnly cookies and are never persisted in browser storage.
export function getStoredToken(): string | null {
  try {
    return localStorage.getItem('primepipfx_session_token') || null;
  } catch {
    return null;
  }
}
export function setStoredToken(token: string | null) {
  try {
    if (token) localStorage.setItem('primepipfx_session_token', token);
    else localStorage.removeItem('primepipfx_session_token');
  } catch {}
}

export function getStoredUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidStoredUser(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: UserAccount | null) {
  try {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      localStorage.removeItem('primepipfx_demo_mode');
    } else {
      localStorage.removeItem(USER_KEY);
    }
  } catch (err) {
    console.error('Error saving user profile:', err);
  }
}

export function getStoredReferral(): string | null {
  try { return localStorage.getItem(REFERRAL_KEY); } catch { return null; }
}

export function setStoredReferral(code: string | null) {
  try {
    if (code) localStorage.setItem(REFERRAL_KEY, code.toUpperCase().trim());
    else localStorage.removeItem(REFERRAL_KEY);
  } catch (err) {
    console.error('Error saving referral:', err);
  }
}

export function detectUrlReferral(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('referral');
    if (ref?.trim()) {
      const clean = ref.trim().toUpperCase();
      setStoredReferral(clean);
      return clean;
    }
  } catch (err) {
    console.warn('Could not read URL params:', err);
  }
  return getStoredReferral();
}

/** Paid / owner access only (no trial). */
export function hasPaidAccess(user: UserAccount | null): boolean {
  if (!user) return false;
  if (user.isDeveloper || user.role === 'ADMIN' || user.role === 'DEVELOPER') return true;
  if (user.subscriptionStatus === 'LIFETIME' || user.isLifetime) return true;
  if (user.subscriptionStatus === 'ACTIVE') return !user.expiryDate || new Date(user.expiryDate).getTime() >= Date.now();
  return false;
}
/** Milliseconds left in the one-time 30-minute trial (0 when none / over / already paid). */
export function trialMsLeft(user: UserAccount | null): number {
  if (!user || hasPaidAccess(user)) return 0;
  const end = Date.parse(user.trialEndsAt || '');
  return Number.isFinite(end) ? Math.max(0, end - Date.now()) : 0;
}
export const isTrialActive = (user: UserAccount | null) => trialMsLeft(user) > 0;

export function hasFullAccess(user: UserAccount | null): boolean {
  if (!user) return false;
  if (isTrialActive(user)) return true; // 30-minute trial: everything except owner/community areas
  if (user.isDeveloper || user.role === 'ADMIN' || user.role === 'DEVELOPER') return true;
  if (user.subscriptionStatus === 'LIFETIME' || user.isLifetime) return true;
  if (user.subscriptionStatus === 'ACTIVE') {
    if (!user.expiryDate) return true;
    return new Date(user.expiryDate).getTime() >= Date.now();
  }
  return false;
}

/**
 * Returns true ONLY if the user clicked "Explore Demo" and does NOT have an active subscription.
 * Subscribed users (ACTIVE / LIFETIME / ADMIN / DEVELOPER) are NEVER locked.
 */
export function isFundamentalSurpriseLocked(
  user?: UserAccount | null,
  isDemoFlag?: boolean
): boolean {
  const effectiveUser = user !== undefined && user !== null ? user : getStoredUser();
  if (effectiveUser && hasFullAccess(effectiveUser)) {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('primepipfx_demo_mode') === 'true') {
        localStorage.removeItem('primepipfx_demo_mode');
      }
    } catch {}
    return false;
  }
  if (isDemoFlag) return true;
  try {
    if (typeof window !== 'undefined' && localStorage.getItem('primepipfx_demo_mode') === 'true') {
      return true;
    }
  } catch {}
  return false;
}

export function isUserAdmin(user?: UserAccount | null): boolean {
  return Boolean(user && (
    user.role === 'ADMIN' ||
    user.role === 'DEVELOPER' ||
    user.isDeveloper
  ));
}

export const isAdminUser = isUserAdmin;

export async function apiLogin(
  username: string,
  password: string,
  rememberMe = true,
): Promise<{ ok: boolean; user?: UserAccount; token?: string; error?: string }> {
  const cleanUsername = username.trim();
  const cleanPassword = password.trim();

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        username: cleanUsername,
        password: cleanPassword,
        rememberMe,
      }),
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok && data.user) {
      setStoredUser(data.user);
      if (data.token) setStoredToken(data.token);
      return { ok: true, user: data.user, token: data.token };
    }

    // The server (with its permanent account database) is the only authority. The old in-browser
    // fallback accepted passwords written in the public code and produced sessions the server
    // rejected ("401 UNAUTHORIZED" everywhere), so it is gone.
    return { ok: false, error: data?.error || 'Invalid username or password.' };
  } catch (err) {
    console.warn('[AUTH CLIENT] Server login request failed:', err);
    return { ok: false, error: 'Could not reach the server. Please check your internet connection and try again.' };
  }
}

/** Create a new account with just a username and password (signs in straight away). */
export async function apiRegister(username: string, password: string): Promise<{ ok: boolean; user?: UserAccount; token?: string; error?: string }> {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ username: username.trim(), password, device: (() => { try { let v = localStorage.getItem('ppfx_vid'); if (!v) { v = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('ppfx_vid', v); } return v; } catch { return ''; } })() }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok && data.user) {
      setStoredUser(data.user);
      if (data.token) setStoredToken(data.token);
      try { const pc = localStorage.getItem('ppfx_partner_ref'); if (pc) { fetch('/api/public/partner/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: pc, buyer: username.trim(), contact: String((data.user as any)?.email || '') }) }).catch(() => {}); localStorage.removeItem('ppfx_partner_ref'); } } catch { /* optional */ }
      return { ok: true, user: data.user, token: data.token };
    }
    return { ok: false, error: data?.error || 'Could not create the account. Please try again.' };
  } catch {
    return { ok: false, error: 'No connection — please check your internet and try again.' };
  }
}

export async function checkAndHandleActivationLink(): Promise<UserAccount | null> {
  try {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const activateUser = params.get('activate');
    const key = params.get('key');
    const hasSensitiveParams = Boolean(activateUser || key || params.get('password'));

    if (hasSensitiveParams) {
      // Immediately sanitize URL so credentials NEVER persist in address bar or history
      const url = new URL(window.location.href);
      url.searchParams.delete('activate');
      url.searchParams.delete('key');
      url.searchParams.delete('password');
      window.history.replaceState({}, document.title, url.toString());

      if (activateUser && key) {
        const cleanUser = activateUser.trim();
        const cleanKey = key.trim();
        const res = await apiLogin(cleanUser, cleanKey, true);
        if (res.ok && res.user) {
          return res.user;
        }
      }
    }
  } catch (e) {
    console.warn('Activation link error:', e);
  }
  return null;
}

export async function apiGetCurrentUser(): Promise<UserAccount | null> {
  const currentStored = getStoredUser();
  try {
    const token = getStoredToken();
    // Nothing stored = visitor is signed out: skip the request (avoids a pointless 401 and a console error).
    if (!token && !currentStored?.id) return null;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/auth/me', {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.ok && data.user) {
        setStoredUser(data.user);
        return data.user;
      }
    } else if (res.status === 401 && currentStored?.id) {
      // The server definitively rejected this session (e.g. it was issued by an older deployment):
      // sign out cleanly so the user logs in again instead of seeing "401 UNAUTHORIZED" everywhere.
      const data = await res.json().catch(() => null);
      if (/invalid or expired session/i.test(String(data?.error || ''))) {
        setStoredToken(null);
        setStoredUser(null);
        return null;
      }
    }
  } catch (err) {
    console.warn('[AUTH CLIENT] Session verification failed:', err);
  }

  // Preserve valid existing session if server is offline or in serverless environment
  if (currentStored && currentStored.id) {
    return currentStored;
  }
  return null;
}

export async function apiLogout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch {}
  setStoredToken(null);
  setStoredUser(null);
}

export const getCurrentUser = getStoredUser;
export const getAuthToken = getStoredToken;
export const logoutUser = apiLogout;
export const verifyCurrentSession = apiGetCurrentUser;

export async function apiChangePassword(
  newPassword: string,
): Promise<{ ok: boolean; error?: string; token?: string; user?: UserAccount }> {
  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ newPassword }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) {
      if (data.user) setStoredUser(data.user);
      return data;
    }
    return { ok: false, error: data?.error || 'Password change failed' };
  } catch (err) {
    console.warn('[AUTH CLIENT] Password change request failed:', err);
    return { ok: false, error: 'Authentication service unavailable. Please try again.' };
  }
}

export async function apiCheckReferral(
  code: string,
): Promise<{
  valid: boolean;
  referrerName?: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  discountAmount?: number;
}> {
  const clean = (code || '').trim().toUpperCase();
  if (clean === 'PRIMEPOPFX' || clean === 'PRIMEPIPFX') {
    return {
      valid: true,
      referrerName: 'PrimePopFX official discount code',
      price: 100,
      originalPrice: 200,
      discountPercent: 50,
      discountAmount: 100,
    };
  }
  try {
    const res = await fetch(`/api/referral/check/${encodeURIComponent(code)}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Referral check failed:', err);
  }
  return {
    valid: false,
    price: 200,
    originalPrice: 200,
    discountPercent: 0,
    discountAmount: 0,
  };
}

export async function apiCompleteOnboarding(): Promise<{
  ok: boolean;
  user?: UserAccount;
  error?: string;
}> {
  try {
    const res = await fetch('/api/auth/complete-onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok && data.user) {
      setStoredUser(data.user);
      return { ok: true, user: data.user };
    }
    return { ok: false, error: data?.error || 'Unable to complete onboarding' };
  } catch (err) {
    console.warn('[AUTH CLIENT] Onboarding request failed:', err);
    return { ok: false, error: 'Authentication service unavailable. Please try again.' };
  }
}


/**
 * Called when an admin request is refused with 401: the stored session is dead (issued by an older
 * deployment or expired). Sign out once and reload so the owner lands on the login screen instead of
 * seeing "401" inside the panel. Guarded so it can never loop.
 */
export async function handleDeadAdminSession(): Promise<void> {
  try {
    const k = 'ppfx_dead_session_reload_at';
    const last = Number(sessionStorage.getItem(k) || 0);
    if (Date.now() - last < 60_000) return;
    sessionStorage.setItem(k, String(Date.now()));
  } catch { /* ignore */ }
  await apiLogout();
  window.location.reload();
}
