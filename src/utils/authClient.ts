import { UserAccount, SubscriptionStatus } from '../types';

const TOKEN_KEY = 'primepipfx_auth_token';
const USER_KEY = 'primepipfx_user_profile';
const REFERRAL_KEY = 'primepipfx_applied_referral';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (err) {
    console.error('Error saving token:', err);
  }
}

export function getStoredUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
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
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password, rememberMe }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || 'Login failed' };
    }
    if (data.token) {
      setStoredToken(data.token);
    }
    if (data.user) {
      setStoredUser(data.user);
    }
    return { ok: true, user: data.user, token: data.token };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error. Please check connection.' };
  }
}

export async function apiGetCurrentUser(): Promise<UserAccount | null> {
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch('/api/auth/me', {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!res.ok) {
      // If server explicitly returns 401 Unauthorized
      if (res.status === 401) {
        setStoredToken(null);
        setStoredUser(null);
        return null;
      }
      // Non-401 error: fall back to cached user in localStorage
      return getStoredUser();
    }

    const data = await res.json();
    if (data.ok && data.user) {
      setStoredUser(data.user);
      return data.user;
    }
    return null;
  } catch (err) {
    // Offline / temporary network loss: return cached user so Admin is never prematurely logged out
    console.warn('[AUTH CLIENT] Network offline, using cached credentials:', err);
    return getStoredUser();
  }
}

export async function apiLogout(): Promise<void> {
  const token = getStoredToken();
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ token }),
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
  const token = getStoredToken();
  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ newPassword }),
    });
    const data = await res.json();
    if (data.ok) {
      if (data.token) {
        setStoredToken(data.token);
      }
      if (data.user) {
        setStoredUser(data.user);
      }
    }
    return data;
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to update password' };
  }
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
