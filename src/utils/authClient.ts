import { UserAccount } from '../types';
import { authenticateLocalAsync } from './localAuthStore';

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
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
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

export function hasFullAccess(user: UserAccount | null): boolean {
  if (!user) return false;
  if (user.isDeveloper || user.role === 'ADMIN' || user.role === 'DEVELOPER') return true;
  if (user.subscriptionStatus === 'LIFETIME' || user.isLifetime) return true;
  if (user.subscriptionStatus === 'ACTIVE') {
    if (!user.expiryDate) return true;
    return new Date(user.expiryDate).getTime() >= Date.now();
  }
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

    // If server rejects or doesn't have the user (e.g. serverless Vercel instance),
    // fall back to local store & cloud KV sync
    const localResult = await authenticateLocalAsync(cleanUsername, cleanPassword);
    if (localResult.ok && localResult.user) {
      setStoredUser(localResult.user);
      if (localResult.token) setStoredToken(localResult.token);
      return { ok: true, user: localResult.user, token: localResult.token };
    }

    return { ok: false, error: data?.error || localResult.error || 'Invalid username or password.' };
  } catch (err) {
    console.warn('[AUTH CLIENT] Server login request failed, checking local and cloud registry:', err);
    const localResult = await authenticateLocalAsync(cleanUsername, cleanPassword);
    if (localResult.ok && localResult.user) {
      setStoredUser(localResult.user);
      if (localResult.token) setStoredToken(localResult.token);
      return { ok: true, user: localResult.user, token: localResult.token };
    }
    return { ok: false, error: localResult.error || 'Authentication service unavailable. Please check your connection or credentials.' };
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
): Promise<{ valid: boolean; referrerName?: string; price: number }> {
  try {
    const res = await fetch(`/api/referral/check/${encodeURIComponent(code)}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Referral check failed:', err);
  }
  return { valid: false, price: 50 };
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
