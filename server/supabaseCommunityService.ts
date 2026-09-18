import type { CommunityMessage } from "./commandCenterService.js";

const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || "";

export const isSupabaseCommunityEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY);

function headers(extra: Record<string,string> = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function supabaseRequest(path: string, init: RequestInit = {}) {
  if (!isSupabaseCommunityEnabled) throw new Error("Supabase community backend is not configured.");
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: headers((init.headers || {}) as Record<string,string>),
  });
  const body = await response.text();
  let data: any = null;
  try { data = body ? JSON.parse(body) : null; } catch { data = body; }
  if (!response.ok) {
    const detail = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`Supabase ${response.status}: ${detail}`);
  }
  return data;
}

export async function upsertTraderProfile(user: {
  id: string; username: string; displayName: string; role: string;
}) {
  await supabaseRequest("trader_profiles?on_conflict=user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      user_id: user.id,
      username: user.username,
      display_name: user.displayName,
      role: user.role === "ADMIN" ? "ADMIN" : "CUSTOMER",
      last_seen_at: new Date().toISOString(),
    }),
  });
}

export async function syncTraderProfiles(users: Array<{
  id: string; username: string; name?: string; role?: string;
}>) {
  if (!isSupabaseCommunityEnabled || !users.length) return;
  await supabaseRequest("trader_profiles?on_conflict=user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(users.map((u) => ({
      user_id: u.id,
      username: u.username,
      display_name: u.name || u.username,
      role: u.role === "ADMIN" ? "ADMIN" : "CUSTOMER",
      last_seen_at: new Date().toISOString(),
    }))),
  });
}

export async function readCommunityMessagesSupabase(): Promise<CommunityMessage[]> {
  const rows = await supabaseRequest(
    "community_messages?select=id,user_id,text_content,message_type,attachment_path,attachment_name,attachment_mime_type,attachment_size,created_at,trader_profiles(username,display_name,role)&order=created_at.asc&limit=500"
  );
  return (Array.isArray(rows) ? rows : []).map((row: any) => ({
    id: String(row.id),
    userId: row.user_id,
    username: row.trader_profiles?.username || row.user_id,
    userRole: row.trader_profiles?.role === "ADMIN" ? "ADMIN" : "CUSTOMER",
    displayName: row.trader_profiles?.display_name || row.trader_profiles?.username || row.user_id,
    text: row.text_content || "",
    attachmentUrl: row.attachment_path || undefined,
    attachmentName: row.attachment_name || undefined,
    attachmentSize: row.attachment_size || undefined,
    timestamp: new Date(row.created_at).getTime(),
    timePkt: new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit", hour12: true,
    }).format(new Date(row.created_at)),
    datePkt: new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date(row.created_at)),
  }));
}

export async function postCommunityMessageSupabase(msg: {
  userId: string; text?: string; messageType?: string;
  attachmentPath?: string; attachmentName?: string; attachmentMimeType?: string; attachmentSize?: number;
}) {
  const rows = await supabaseRequest("community_messages", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: msg.userId,
      text_content: (msg.text || "").trim().slice(0, 4000),
      message_type: msg.messageType || "TEXT",
      attachment_path: msg.attachmentPath || null,
      attachment_name: msg.attachmentName || null,
      attachment_mime_type: msg.attachmentMimeType || null,
      attachment_size: msg.attachmentSize || null,
    }),
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function markCommunityMessagesSeenSupabase(messageIds: string[], userId: string) {
  if (!messageIds.length) return 0;
  const payload = messageIds.map((messageId) => ({
    message_id: messageId,
    user_id: userId,
    seen_at: new Date().toISOString(),
  }));
  await supabaseRequest("community_message_seen?on_conflict=message_id,user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(payload),
  });
  return messageIds.length;
}

export async function getCommunityTradersSupabase() {
  return supabaseRequest(
    "trader_profiles?select=user_id,username,display_name,role,last_seen_at,created_at&order=created_at.asc&limit=1000"
  );
}
