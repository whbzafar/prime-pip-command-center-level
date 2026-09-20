import { UserAccount, SubscriptionStatus } from '../types';
import {
  authenticateLocal,
  authenticateLocalAsync,
  setLocalAdminPassword,
  saveLocalStudent,
  getLocalStudents,
  syncStudentsFromCloud,
} from './localAuthStore';

const USER_KEY = 'primepipfx_user_profile';
const REFERRAL_KEY = 'primepipfx_applied_referral';

function isValidStoredUser(value: unknown): value is UserAccount {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<UserAccount>;
  return typeof candidate.id === 'string' && candidate.id.trim().length > 0;
}

export function getStoredToken(): string | null { return null; }
export function setStoredToken(_token: string | null) { /* Session is HttpOnly cookie only. */ }

export function getStoredUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!isValidStoredUser(parsed)) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function setStoredUser(user: UserAccount | null) {
  try {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  } catch (err) {
    console.error('Error saving user:', err);
  }
}

export function getStoredReferral(): string | null {
  try {
    return localStorage.getItem(REFERRAL_KEY);
  } catch {
    return null;
  }
}

export function setStoredReferral(code: string | null) {
  try {
    if (code) {
      localStorage.setItem(REFERRAL_KEY, code.toUpperCase().trim());
    } else {
      localStorage.removeItem(REFERRAL_KEY);
    }
  } catch (err) {
    console.error('Error saving referral:', err);
  }
}

// Check URL for referral parameter (?ref=PPFX123 or ?referral=PPFX123)
export function detectUrlReferral(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('referral');
    if (ref && ref.trim()) {
      const clean = ref.trim().toUpperCase();
      setStoredReferral(clean);
      return clean;
    }
  } catch (err) {
    console.warn('Could not read URL params:', err);
  }
  return getStoredReferral();
}

// Check if user has active/valid full access
export function hasFullAccess(user: UserAccount | null): boolean {
  if (!user) return false;
  if (user.isDeveloper || user.role === 'ADMIN' || user.role === 'DEVELOPER' || user.username === 'primepipfx-admin') return true;
  if (user.subscriptionStatus === 'LIFETIME' || user.isLifetime) return true;
  if (user.subscriptionStatus === 'ACTIVE') {
    if (!user.expiryDate) return true;
    const exp = new Date(user.expiryDate).getTime();
    return exp >= Date.now();
  }
  return false;
}

// Check if user has developer/admin privileges
export function isUserAdmin(user?: UserAccount | null): boolean {
  if (!user) return false;
  return (
    user.role === 'ADMIN' ||
    user.role === 'DEVELOPER' ||
    Boolean(user.isDeveloper) ||
    user.username === 'primepipfx-admin'
  );
}

export const isAdminUser = isUserAdmin;

// API client calls
export async function apiLogin(
  username: string,
  password: string,
  rememberMe: boolean = true
): Promise<{ ok: boolean; user?: UserAccount; token?: string; error?: string }> {
  const cleanUsername = (username || '').trim();
  const cleanPassword = (password || '').trim();

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username: cleanUsername, password: cleanPassword, rememberMe }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (res.ok && data.ok && data.user) {
        setStoredUser(data.user);
        return { ok: true, user: data.user, token: data.token };
      }
      

      return { ok: false, error: data.error || 'Login failed' };
    }
  } catch (err: any) {
    console.warn('[AUTH CLIENT] Server endpoint unavailable or network error, attempting local authentication:', err);
  }

  return { ok: false, error: 'Authentication service unavailable. Please try again.' };
}

/**
 * Checks URL for direct 1-click student activation link (?activate=username&key=password)
 * If found, activates the student account and logs them in immediately with zero errors!
 */
export async function checkAndHandleActivationLink(): Promise<UserAccount | null> {
  try {
    const params = new URLSearchParams(window.location.search);
    const activateUser = params.get('activate') || params.get('student_login') || params.get('user');
    const activateKey = params.get('key') || params.get('password') || params.get('pass');

    if (activateUser && activateKey) {
      const res = await apiLogin(activateUser, activateKey);
      if (res.ok && res.user) {
        // Clean URL params without reloading
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        return res.user;
      }
    }
  } catch (e) {
    console.warn('Failed to handle activation link:', e);
  }
  return null;
}

export async function apiGetCurrentUser(): Promise<UserAccount | null> {
  const headers: Record<string, string> = {};

  try {
    const res = await fetch('/api/auth/me', {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      if (res.status === 401) {
        setStoredToken(null);
        setStoredUser(null);
        return null;
      }
      return null;
    }

    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (data.ok && data.user) {
        setStoredUser(data.user);
        return data.user;
      }
    }
    return getStoredUser();
  } catch (err) {
    console.warn('[AUTH CLIENT] Session verification failed:', err);
    return null;
  }
}

export async function apiLogout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
  } catch {
    // ignore
  }
  setStoredToken(null);
  setStoredUser(null);
}

export const getCurrentUser = getStoredUser;
export const getAuthToken = getStoredToken;
export const logoutUser = apiLogout;
export const verifyCurrentSession = apiGetCurrentUser;

export async function apiChangePassword(newPassword: string): Promise<{ ok: boolean; error?: string; token?: string; user?: UserAccount }> {
  const currentUser = getStoredUser();

  // Save to local store so password updates are immediately persistent on Vercel
  if (currentUser?.role === 'ADMIN' || currentUser?.isDeveloper || currentUser?.username === 'primepipfx-admin') {
    setLocalAdminPassword(newPassword);
  } else if (currentUser) {
    saveLocalStudent({
      ...currentUser,
      password: newPassword,
      mustChangePassword: false,
    });
  }

  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ newPassword }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (data.ok) {
        if (data.user) setStoredUser(data.user);
      }
      return data;
    }
  } catch (err: any) {
    console.warn('[AUTH CLIENT] Server change password endpoint unavailable, persisted locally:', err);
  }

  return { ok: false, error: 'Authentication service unavailable. Please try again.' };
}

export async function apiCheckReferral(code: string): Promise<{ valid: boolean; referrerName?: string; price: number }> {
  try {
    const res = await fetch(`/api/referral/check/${encodeURIComponent(code)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Referral check failed:', err);
  }
  return { valid: false, price: 50 };
}

// Complete student onboarding and persist to backend
export async function apiCompleteOnboarding(): Promise<{ ok: boolean; user?: UserAccount; error?: string }> {
  const token = getStoredToken();
  const currentUser = getStoredUser();

  try {
    const res = await fetch('/api/auth/complete-onboarding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (data.ok && data.user) {
        setStoredUser(data.user);
        return { ok: true, user: data.user };
      }
    }
  } catch (err: any) {
    console.warn('[AUTH CLIENT] Server complete onboarding unavailable, saving locally:', err);
  }

  // Fallback for offline or local cache
  if (currentUser) {
    const updated: UserAccount = {
      ...currentUser,
      hasCompletedOnboarding: true,
      needsOnboarding: false,
      updatedAt: new Date().toISOString(),
    };
    setStoredUser(updated);
    return { ok: true, user: updated };
  }

  return { ok: true };
}