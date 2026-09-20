import type { CommunityMessage } from "./commandCenterService.js";

function getSupabaseConfig() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  // Prefer the current opaque secret key. Keep the legacy service-role key as a
  // compatibility fallback for older Vercel configurations.
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";
  return { url, key };
}

export function getSupabaseCommunityStatus() {
  const { url, key } = getSupabaseConfig();
  return {
    enabled: Boolean(url && key),
    urlConfigured: Boolean(url),
    secretConfigured: Boolean(key),
  };
}

export const isSupabaseCommunityEnabled = Boolean(
  getSupabaseConfig().url && getSupabaseConfig().key
);

function headers(extra: Record<string, string> = {}) {
  const { key } = getSupabaseConfig();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function supabaseRequest(path: string, init: RequestInit = {}) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) {
    throw new Error(
      "Supabase community backend is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY in the Vercel Production environment."
    );
  }

  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: headers((init.headers || {}) as Record<string, string>),
  });
  const body = await response.text();
  let data: any = null;
  try {
    data = body ? JSON.parse(body) : null;
  } catch {
    data = body;
  }

  if (!response.ok) {
    const detail = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`Supabase ${response.status}: ${detail}`);
  }
  return data;
}

async function ensureMediaBucket() {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) return false;
  const response = await fetch(url + '/storage/v1/bucket', {
    method: 'POST',
    headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 'primepipfx-media',
      name: 'primepipfx-media',
      public: true,
      file_size_limit: 524288000,
    }),
  });
  return response.ok || response.status === 409;
}

export async function uploadMediaSupabase(params: {
  id: string;
  data: string;
  mimeType: string;
}) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) throw new Error('Supabase storage is not configured.');
  await ensureMediaBucket();
  const clean = params.data.includes(',') ? params.data.split(',')[1] : params.data;
  const buffer = Buffer.from(clean, 'base64');
  const ext = params.mimeType.includes('mp4') ? 'm4a' : params.mimeType.includes('ogg') ? 'ogg' : params.mimeType.includes('png') ? 'png' : params.mimeType.includes('jpeg') ? 'jpg' : params.mimeType.includes('webm') ? 'webm' : 'bin';
  const objectPath = 'media/' + params.id + '.' + ext;
  const response = await fetch(url + '/storage/v1/object/primepipfx-media/' + objectPath, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': params.mimeType || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body: buffer,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error('Supabase media upload failed: ' + detail);
  }
  return '/api/media/voice/' + params.id;
}

export async function readMediaObjectSupabase(id: string) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) return null;
  const prefix = 'media/' + id;
  const response = await fetch(url + '/storage/v1/object/list/primepipfx-media', {
    method: 'POST',
    headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix, limit: 10 }),
  });
  if (!response.ok) return null;
  const rows = await response.json().catch(() => []);
  const row = Array.isArray(rows) ? rows.find((item: any) => typeof item?.name === 'string' && item.name.startsWith('media/' + id + '.')) : null;
  if (!row) return null;
  const ext = String(row.name).split('.').pop() || 'bin';
  const objectUrl = url + '/storage/v1/object/primepipfx-media/' + prefix + '.' + ext;
  const file = await fetch(objectUrl, { headers: { apikey: key, Authorization: 'Bearer ' + key } });
  if (!file.ok) return null;
  return { response: file, contentType: file.headers.get('content-type') || 'application/octet-stream' };
}

export async function upsertTraderProfile(user: {
  id: string;
  username: string;
  displayName: string;
  role: string;
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

export async function syncTraderProfiles(
  users: Array<{ id: string; username: string; name?: string; role?: string }>
) {
  if (!getSupabaseCommunityStatus().enabled || !users.length) return;
  await supabaseRequest("trader_profiles?on_conflict=user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(
      users.map((u) => ({
        user_id: u.id,
        username: u.username,
        display_name: u.name || u.username,
        role: u.role === "ADMIN" ? "ADMIN" : "CUSTOMER",
        last_seen_at: new Date().toISOString(),
      }))
    ),
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
    displayName:
      row.trader_profiles?.display_name ||
      row.trader_profiles?.username ||
      row.user_id,
    text: row.text_content || "",
    attachmentUrl: row.attachment_path || undefined,
    attachmentName: row.attachment_name || undefined,
    attachmentSize: row.attachment_size || undefined,
    timestamp: new Date(row.created_at).getTime(),
    timePkt: new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Karachi",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(row.created_at)),
    datePkt: new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(row.created_at)),
  }));
}

export async function postCommunityMessageSupabase(msg: {
  userId: string;
  text?: string;
  messageType?: string;
  attachmentPath?: string;
  attachmentName?: string;
  attachmentMimeType?: string;
  attachmentSize?: number;
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

export async function markCommunityMessagesSeenSupabase(
  messageIds: string[],
  userId: string
) {
  if (!messageIds.length) return 0;

  const payload = messageIds.map((messageId) => ({
    message_id: messageId,
    user_id: userId,
    seen_at: new Date().toISOString(),
  }));

  await supabaseRequest(
    "community_message_seen?on_conflict=message_id,user_id",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(payload),
    }
  );

  return messageIds.length;
}

export async function getCommunityTradersSupabase() {
  return supabaseRequest(
    "trader_profiles?select=user_id,username,display_name,role,last_seen_at,created_at&order=created_at.asc&limit=1000"
  );
}

function mapPrivateMessageRow(row: any) {
  const createdAt = new Date(row.created_at).getTime();
  return {
    id: String(row.id),
    senderId: row.sender_id,
    senderUsername: row.sender_username || row.sender_id,
    senderDisplayName: row.sender_display_name || row.sender_username || row.sender_id,
    receiverId: row.receiver_id,
    receiverUsername: row.receiver_username || row.receiver_id,
    text: row.text_content || '',
    type: row.message_type === 'VOICE' ? 'VOICE' : row.message_type === 'IMAGE' ? 'IMAGE' : 'TEXT',
    photoUrl: row.message_type === 'IMAGE' ? row.attachment_path || undefined : undefined,
    audioUrl: row.message_type === 'VOICE' ? row.attachment_path || undefined : undefined,
    audioAttachmentId: row.message_type === 'VOICE' && row.attachment_path ? String(row.attachment_path).split('/').pop() : undefined,
    audioMimeType: row.message_type === 'VOICE' ? row.attachment_mime_type || undefined : undefined,
    audioSize: row.message_type === 'VOICE' ? row.attachment_size || undefined : undefined,
    attachmentUrl: row.message_type === 'FILE' ? row.attachment_path || undefined : undefined,
    attachmentName: row.attachment_name || undefined,
    attachmentSize: row.attachment_size || undefined,
    timestamp: createdAt,
    timePkt: new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(createdAt)),
    datePkt: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(createdAt)),
    read: false,
  };
}

export async function readPrivateMessagesSupabase(userId1: string, userId2: string) {
  const filter = `or(and(sender_id.eq.${encodeURIComponent(userId1)},receiver_id.eq.${encodeURIComponent(userId2)}),and(sender_id.eq.${encodeURIComponent(userId2)},receiver_id.eq.${encodeURIComponent(userId1)}))`;
  const rows = await supabaseRequest(
    `private_messages?select=id,sender_id,receiver_id,text_content,message_type,attachment_path,attachment_name,attachment_mime_type,attachment_size,created_at&${filter}&order=created_at.asc&limit=1000`
  );
  return (Array.isArray(rows) ? rows : []).map(mapPrivateMessageRow);
}

export async function postPrivateMessageSupabase(msg: {
  senderId: string;
  receiverId: string;
  text?: string;
  messageType?: string;
  attachmentPath?: string;
  attachmentName?: string;
  attachmentMimeType?: string;
  attachmentSize?: number;
}) {
  const rows = await supabaseRequest('private_messages', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      sender_id: msg.senderId,
      receiver_id: msg.receiverId,
      text_content: msg.text || '',
      message_type: msg.messageType || 'TEXT',
      attachment_path: msg.attachmentPath || null,
      attachment_name: msg.attachmentName || null,
      attachment_mime_type: msg.attachmentMimeType || null,
      attachment_size: msg.attachmentSize || null,
    }),
  });
  return Array.isArray(rows) ? mapPrivateMessageRow(rows[0]) : mapPrivateMessageRow(rows);
}

export async function createCallSupabase(params: {
  callId: string;
  callerId: string;
  receiverId: string;
  type: 'voice' | 'video' | 'screenshare';
  offer?: any;
}) {
  await supabaseRequest('calls', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      id: params.callId,
      caller_id: params.callerId,
      receiver_id: params.receiverId,
      type: params.type,
    }),
  });
  if (params.offer) {
    await addCallSignalSupabase(params.callId, params.callerId, params.receiverId, 'OFFER', params.offer);
  }
  return { callId: params.callId, callerId: params.callerId, receiverId: params.receiverId, status: 'CALLING', offer: params.offer || null };
}

export async function addCallSignalSupabase(
  callId: string,
  callerId: string,
  receiverId: string,
  signalType: 'OFFER' | 'ANSWER' | 'CANDIDATE' | 'END',
  payload: any
) {
  const rows = await supabaseRequest('call_signals', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      call_id: callId,
      caller_id: callerId,
      receiver_id: receiverId,
      signal_type: signalType,
      payload: payload ?? {},
    }),
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function getCallSupabase(callId: string, userId: string) {
  const calls = await supabaseRequest(`calls?id=eq.${encodeURIComponent(callId)}&select=id,caller_id,receiver_id,type,started_at,ended_at&limit=1`);
  const call = Array.isArray(calls) ? calls[0] : null;
  if (!call) return null;
  if (call.caller_id !== userId && call.receiver_id !== userId) return null;
  const signals = await supabaseRequest(`call_signals?call_id=eq.${encodeURIComponent(callId)}&select=id,caller_id,receiver_id,signal_type,payload,created_at&order=created_at.asc&limit=1000`);
  return {
    callId: String(call.id),
    callerId: call.caller_id,
    receiverId: call.receiver_id,
    type: call.type,
    status: call.ended_at ? 'ENDED' : 'CALLING',
    updatedAt: new Date(call.started_at).getTime(),
    signals: Array.isArray(signals) ? signals : [],
  };
}

export async function getActiveCallSupabase(userId: string) {
  const calls = await supabaseRequest(`calls?or=(caller_id.eq.${encodeURIComponent(userId)},receiver_id.eq.${encodeURIComponent(userId)})&ended_at=is.null&select=id,caller_id,receiver_id,type,started_at,ended_at&order=started_at.desc&limit=1`);
  const call = Array.isArray(calls) ? calls[0] : null;
  if (!call) return null;
  return getCallSupabase(String(call.id), userId);
}

export async function endCallSupabase(callId: string, userId: string) {
  const calls = await supabaseRequest(`calls?id=eq.${encodeURIComponent(callId)}&or=(caller_id.eq.${encodeURIComponent(userId)},receiver_id.eq.${encodeURIComponent(userId)})&select=id,caller_id,receiver_id&limit=1`);
  const call = Array.isArray(calls) ? calls[0] : null;
  if (!call) return null;
  await supabaseRequest(`calls?id=eq.${encodeURIComponent(callId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ ended_at: new Date().toISOString() }),
  });
  return { callId: String(call.id), status: 'ENDED' };
}
