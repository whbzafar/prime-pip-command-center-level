type DurableTrader = {
  id: string;
  username: string;
  name: string;
  role: string;
  subscriptionStatus: string;
  expiryDate?: string | null;
  isLifetime?: boolean;
  isDeveloper?: boolean;
  showActiveStatus?: boolean;
  createdAt?: string;
};

function getConfig() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return { url, key };
}

async function request(path: string, init: RequestInit = {}) {
  const { url, key } = getConfig();
  if (!url || !key) throw new Error('Supabase durable community backend is not configured.');
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...((init.headers || {}) as Record<string, string>),
    },
  });
  const text = await response.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  return data;
}

export async function getDurableTraderById(id: string): Promise<DurableTrader | null> {
  const clean = String(id || '').trim();
  if (!clean) return null;
  const rows = await request(`primepipfx_users?legacy_user_id=eq.${encodeURIComponent(clean)}&select=legacy_user_id,username,name,role,subscription_status,expiry_date,is_lifetime,is_developer,show_active_status,created_at&limit=1`);
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) return null;
  return {
    id: row.legacy_user_id,
    username: row.username,
    name: row.name || row.username,
    role: row.role || 'CUSTOMER',
    subscriptionStatus: row.subscription_status || 'PAYMENT_REQUIRED',
    expiryDate: row.expiry_date,
    isLifetime: Boolean(row.is_lifetime),
    isDeveloper: Boolean(row.is_developer),
    showActiveStatus: row.show_active_status !== false,
    createdAt: row.created_at,
  };
}

export async function listDurableCommunityTraders(currentUserId?: string): Promise<DurableTrader[]> {
  const rows = await request('primepipfx_users?select=legacy_user_id,username,name,role,subscription_status,expiry_date,is_lifetime,is_developer,show_active_status,created_at&order=created_at.asc&limit=2000');
  const now = Date.now();
  return (Array.isArray(rows) ? rows : [])
    .filter((row: any) => String(row.legacy_user_id) !== String(currentUserId || ''))
    .filter((row: any) => {
      if (row.is_developer || row.role === 'ADMIN' || row.role === 'DEVELOPER' || row.is_lifetime) return true;
      if (row.subscription_status !== 'ACTIVE' && row.subscription_status !== 'LIFETIME') return false;
      return !row.expiry_date || new Date(row.expiry_date).getTime() >= now;
    })
    .map((row: any) => ({
      id: row.legacy_user_id,
      username: row.username,
      name: row.name || row.username,
      role: row.role || 'CUSTOMER',
      subscriptionStatus: row.subscription_status || 'PAYMENT_REQUIRED',
      expiryDate: row.expiry_date,
      isLifetime: Boolean(row.is_lifetime),
      isDeveloper: Boolean(row.is_developer),
      showActiveStatus: row.show_active_status !== false,
      createdAt: row.created_at,
    }));
}

export async function syncDurableCommunityTraders() {
  const traders = await listDurableCommunityTraders();
  if (!traders.length) return traders;
  await request('trader_profiles?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(traders.map((trader) => ({
      user_id: trader.id,
      username: trader.username,
      display_name: trader.name,
      role: trader.role === 'ADMIN' || trader.isDeveloper ? 'ADMIN' : 'CUSTOMER',
    }))),
  });
  return traders;
}
