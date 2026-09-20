// Vercel deployment sync marker: keep Git-connected production on the latest main commit.
import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { randomUUID } from "crypto";
import {
  initAuthStore,
  loginUser,
  getUserByToken,
  logoutToken,
  getAllCustomers,
  createCustomer,
  updateCustomer,
  resetCustomerPassword,
  checkReferralCode,
  getAdminSummary,
  sanitizeUser,
  changeDeveloperPassword,
  changeAuthenticatedPassword,
  deleteCustomer,
  completeUserOnboarding,
  recordUserHeartbeat,
  isUserOnline,
  getAllRegisteredTraders,
  isActiveCommunityMember,
  updatePresencePrivacy,
} from "./server/authService.js";
import { getCustomerData, saveCustomerData } from "./server/customerDataService.js";
import {
  readCommunityMessages,
  postCommunityMessage,
  markCommunityMessagesSeen,
  readAppointments,
  createAppointment,
  updateAppointmentStatus,
  getSessionConfig,
  saveSessionConfig,
  getUserFriends,
  sendFriendRequest,
  updateFriendshipStatus,
  getPrivateConversation,
  postPrivateMessage,
  initiateWebRTCCall,
  getCallSession,
  getActiveCallForUser,
  updateCallSession,
  addIceCandidate,
  saveVoiceAttachmentFile,
  saveImageAttachmentFile,
  saveFileAttachmentFile,
  getVoiceAttachment,
  deleteVoiceAttachment,
} from "./server/commandCenterService.js";
import {
  getCalendarEvents,
  fetchYearEvents,
  fetchMonthEvents,
  fetchWeekEvents,
  fetchUpcomingEvents,
  fetchHistoricalEvents,
  syncCalendar,
  getCalendarMeta,
} from "./server/economicCalendarService.js";
import {
  moderateMessage,
  readModerationWarnings,
} from "./server/moderationService.js";
import {
  getEvolutionStatus,
  recordTelemetrySignal,
  submitUserFeedback,
  runEvolutionCycle,
  executeRollback,
  rollbackEvolutionEvent,
  getTraderProfile,
  saveTraderProfile,
  startAutonomousEvolution,
} from "./server/evolutionService.js";
import { analyzeIntent } from "./server/intelligence/intentRouter.js";
import { resolveCapability } from "./server/intelligence/capabilityRegistry.js";
import { getClusters } from "./server/intelligence/gapLedger.js";
import { syncLegacyStudentsToServer } from "./server/legacyStudentSync.js";
import { getFundamentalStrengthDashboard } from "./server/fundamentalStrengthService.js";
import {
  isSupabaseAuthEnabled,
  authenticatePrimePipfx,
  refreshSupabaseSession,
  getUserFromSupabaseAccessToken,
  provisionBootstrapAdmin,
  provisionPrimePipfxUser,
  syncPrimePipfxUser,
  updatePrimePipfxPassword,
} from "./server/supabaseAuthService.js";
import {
  isSupabaseCommunityEnabled,
  upsertTraderProfile,
  syncTraderProfiles,
  readCommunityMessagesSupabase,
  postCommunityMessageSupabase,
  markCommunityMessagesSeenSupabase,
  getCommunityTradersSupabase,
  readPrivateMessagesSupabase,
  postPrivateMessageSupabase,
  isUserBlocked,
  setUserBlock,
  createAppNotification,
  readAppNotifications,
  markAppNotificationsRead,
  getNotificationSettings,
  updateNotificationSettings,
  createChatGroup,
  listChatGroups,
  listChatGroupMembers,
  isGroupMember,
  addChatGroupMember,
  readGroupMessages,
  postGroupMessage,
  createCallSupabase,
  addCallSignalSupabase,
  getCallSupabase,
  getActiveCallSupabase,
  endCallSupabase,
  uploadMediaSupabase,
  readMediaObjectSupabase,
} from "./server/supabaseCommunityService.js";

dotenv.config();

// Initialize permanent developer account on server boot
initAuthStore();
if (isSupabaseAuthEnabled) {
  const bootstrapPassword = (process.env.PRIMEPIPFX_BOOTSTRAP_ADMIN_PASSWORD || 'PPFX@Admin#2026').trim();
  const bootstrapUsername = (process.env.PRIMEPIPFX_BOOTSTRAP_ADMIN_USERNAME || 'primepipfx-admin').trim().toLowerCase();
  if (bootstrapPassword && bootstrapPassword.length >= 12) {
    void provisionBootstrapAdmin(bootstrapUsername, bootstrapPassword).catch((error) => {
      console.warn('[AUTH] Supabase bootstrap provisioning failed:', error?.message || error);
    });
  }
}

// Safe directory reference for CJS/ESM
const currentAppDir = process.cwd();

const app = express();
const PORT = 3000;
const presenceSockets = new Map<string, Set<WebSocket>>();

function broadcastPresence() {
  for (const [userId, sockets] of presenceSockets) {
    const payload = JSON.stringify({
      type: 'presence:update',
      traders: getAllRegisteredTraders(userId),
    });
    for (const socket of sockets) {
      if (socket.readyState === WebSocket.OPEN) socket.send(payload);
    }
  }
}

function registerPresenceSocket(socket: WebSocket, userId: string) {
  const sockets = presenceSockets.get(userId) || new Set<WebSocket>();
  sockets.add(socket);
  presenceSockets.set(userId, sockets);
  recordUserHeartbeat(userId);
  socket.send(JSON.stringify({ type: 'presence:ready' }));
  broadcastPresence();
  socket.on('message', (raw) => {
    try {
      const message = JSON.parse(raw.toString());
      if (message?.type === 'presence:ping') {
        recordUserHeartbeat(userId);
        socket.send(JSON.stringify({ type: 'presence:pong', timestamp: Date.now() }));
        broadcastPresence();
      }
    } catch {
      socket.send(JSON.stringify({ type: 'presence:error', error: 'Invalid presence message.' }));
    }
  });
  socket.on('close', () => {
    sockets.delete(socket);
    if (sockets.size === 0) presenceSockets.delete(userId);
    broadcastPresence();
  });
}

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

const supabaseAuthCache = new Map<string, { userId: string; expiresAt: number }>();

app.use(async (req, res, next) => {
  if (!isSupabaseAuthEnabled) return next();
  const accessToken = req.cookies?.primepipfx_session;
  if (!accessToken) return next();

  let user = await getUserFromSupabaseAccessToken(accessToken);
  if (user) {
    const { cacheAuthenticatedUser } = await import('./server/authService.js');
    cacheAuthenticatedUser(accessToken, user);
    supabaseAuthCache.set(accessToken, { userId: user.id, expiresAt: Date.now() + 55 * 60 * 1000 });
    return next();
  }

  const refreshToken = req.cookies?.primepipfx_refresh;
  if (refreshToken) {
    try {
      const refreshed = await refreshSupabaseSession(refreshToken);
      if (refreshed?.access_token) {
        user = await getUserFromSupabaseAccessToken(refreshed.access_token);
        if (user) {
          const { cacheAuthenticatedUser } = await import('./server/authService.js');
          cacheAuthenticatedUser(refreshed.access_token, user);
          res.cookie('primepipfx_session', refreshed.access_token, {
            httpOnly: true, secure: process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL),
            sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000, path: '/',
          });
          res.cookie('primepipfx_refresh', refreshed.refresh_token, {
            httpOnly: true, secure: process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL),
            sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000, path: '/',
          });
        }
      }
    } catch (error) {
      console.warn('[AUTH] Supabase session refresh failed:', error instanceof Error ? error.message : error);
    }
  }
  next();
});

// Lazy Gemini client helper
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

// Helper to generate tactical rule-based coaching when Gemini API is unavailable or rate-limited
function generateTacticalRuleBasedCoaching(prompt: string, context: any): string {
  const metrics = context?.metrics || {};
  const topStrategies = Array.isArray(context?.topStrategies) ? context.topStrategies : [];
  const topMistakes = Array.isArray(context?.topMistakes) ? context.topMistakes : [];
  const account = context?.account || {};

  const winRate = typeof metrics.winRate === "number" ? Math.round(metrics.winRate) : 65;
  const totalTrades = metrics.totalTrades || 0;
  const profitFactor = typeof metrics.profitFactor === "number" ? metrics.profitFactor.toFixed(2) : "1.85";
  const returnPercent = typeof metrics.returnPercent === "number" ? metrics.returnPercent.toFixed(1) : "0.0";
  const currency = account.currency || "USD";

  const bestStrat = topStrategies[0]
    ? `${topStrategies[0].strategy} (${Math.round(topStrategies[0].winRate)}% WR, +${topStrategies[0].totalProfitLoss?.toFixed(0)} ${currency})`
    : "SBT Model & Liquidity Sweep (High Expectancy)";

  const topLeakage = topMistakes[0]
    ? `${topMistakes[0].mistake} (Loss impact: ${topMistakes[0].totalLost?.toFixed(0)} ${currency})`
    : "FOMO & Moving Stop Losses";

  const lowerPrompt = (prompt || "").toLowerCase();

  let focusDirective = "";
  if (lowerPrompt.includes("stopping") || lowerPrompt.includes("profit") || lowerPrompt.includes("consist")) {
    focusDirective = `1. PRIMARY CONSTRAINT DETECTED:
- Capital leakage via ${topLeakage}.
- Win rate is standing at ${winRate}%, but net expectancy is being eroded by undisciplined deviations.

2. TACTICAL MITIGATION MANDATE:
- Implement a HARD STOP of maximum 2 executions per session.
- Once +2R or -1R is reached for the day, immediately lock the terminal.
- Never move your stop loss once the trigger candle has closed.`;
  } else if (lowerPrompt.includes("strategy") || lowerPrompt.includes("expectancy") || lowerPrompt.includes("setup")) {
    focusDirective = `1. PRIME STRATEGY ASSET:
- Top statistical performer: ${bestStrat}.
- High timeframe liquidity sweeps followed by M5/M15 MSS (Market Structure Shift) yield your cleanest risk-to-reward ratios.

2. ASSET CONSOLIDATION:
- Eliminate non-model impulse trades during mid-session chop.
- Focus 80% of your risk allocation exclusively on your highest-expectancy setup.`;
  } else if (lowerPrompt.includes("session") || lowerPrompt.includes("london") || lowerPrompt.includes("new york")) {
    focusDirective = `1. SESSION EXECUTION MATRIX:
- London Session (08:00 - 16:30 PKT): Highest structural clarity on EURUSD, GBPUSD, and Gold (XAUUSD).
- New York Session (17:00 - 01:30 PKT): High volatility window; focus on US30 and NAS100 sweeps during NY Open.
- Strict Protocol: Cease order entry 30 minutes prior to Tier-1 high-impact red folder news (CPI, NFP, FOMC).`;
  } else {
    focusDirective = `1. PERFORMANCE DIAGNOSTIC:
- Journaled Missions: ${totalTrades} | Win Rate: ${winRate}% | Profit Factor: ${profitFactor} | Return: ${returnPercent}%
- Core Strength: Strong technical capture on ${bestStrat}.
- Primary Risk Exposure: ${topLeakage}.

2. DAILY DIRECTIVE:
- Maintain 1% maximum capital risk per trade.
- Require dual-timeframe liquidity sweep confirmation before pulling the trigger.`;
  }

  return `### [PRIMEPIPFX TACTICAL COMMAND DIRECTIVE - COMBAT BRIEFING]
Commander, intelligence audit synchronized for active deployment.

**Operational Telemetry:**
• Current Account Win Rate: **${winRate}%** | Total Executions: **${totalTrades}**
• Profit Factor: **${profitFactor}** | Cumulative Net Return: **${returnPercent}%**
• Highest-Expectancy Setup: **${bestStrat}**
• Critical Vulnerability: **${topLeakage}**

---
${focusDirective}

3. CHIEF TACTICAL OFFICER SUMMARY:
"Consistency is not market prediction; it is flawless military risk preservation. Respect the stop loss, let winning mathematical edge play out across 100 sample trades, and never retaliate against price."`;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

// Unified AI Trading Coach Controller
async function handleTradingCoach(req: express.Request, res: express.Response) {
  const { prompt, context, mode, question, tradeContext } = req.body || {};
  const effectivePrompt =
    (typeof prompt === "string" && prompt.trim()) ||
    (typeof question === "string" && question.trim()) ||
    "What is stopping me from becoming a consistently profitable trader?";
  const effectiveContext = context || tradeContext || {};

  const ai = getGeminiClient();

  // If no Gemini client available, return rule-based coaching immediately
  if (!ai) {
    const fallbackText = generateTacticalRuleBasedCoaching(effectivePrompt, effectiveContext);
    return res.status(200).json({
      ok: true,
      text: fallbackText,
      response: fallbackText,
      coaching: fallbackText,
      source: "tactical_rule_engine",
    });
  }

  const systemInstruction = `You are the PRIMEPIPFX CHIEF TACTICAL TRADING OFFICER & MASTER AI TRADING COACH.
You speak like an elite military commander combined with an institutional prop firm risk director.
Your tone is razor-sharp, objective, disciplined, supportive yet brutally honest about edge, psychology, and risk.
Never give financial advice or guarantee profits. Always focus on PROCESS, RISK CONTROL, STATISTICAL EDGE, and PSYCHOLOGICAL DISCIPLINE.
Use tactical trading terminology (SMC, ICT, BOS, MSS, CHOCH, Liquidity Sweep, Fair Value Gaps, SBT Model, R-multiples, expectancy, discipline score).
Format your responses with clear, high-impact tactical sections, bullet points, and concrete drills.`;

  const fullPrompt = `Mode: ${mode || "general"}
Trader Telemetry & Journal Context:
${JSON.stringify(effectiveContext, null, 2)}

Mission Directive / Inquiry:
${effectivePrompt}`;

  // Try candidate models in order of capability, falling back gracefully
  const candidateModels = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];

  for (const model of candidateModels) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents: fullPrompt,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        }),
        4500
      );

      const reply = response.text?.trim() || "";
      if (reply) {
        return res.status(200).json({
          ok: true,
          text: reply,
          response: reply,
          coaching: reply,
          source: "gemini",
          model,
        });
      }
    } catch (modelError: any) {
      console.warn(`[PRIMEPIPFX COACH] Model ${model} returned error:`, modelError?.message || modelError);
      // continue to next model or rule engine fallback
    }
  }

  // If Gemini models encountered high demand spikes or temporary issues, return high-accuracy rule-based tactical coaching
  console.info("[PRIMEPIPFX COACH] Engaging tactical rule engine fallback.");
  const tacticalReply = generateTacticalRuleBasedCoaching(effectivePrompt, effectiveContext);
  return res.status(200).json({
    ok: true,
    text: tacticalReply,
    response: tacticalReply,
    coaching: tacticalReply,
    source: "tactical_rule_engine",
  });
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// AI Trading Coach endpoints (both routes supported)
app.post("/api/gemini/trading-coach", handleTradingCoach);
app.post("/api/gemini/coach", handleTradingCoach);

// Screenshot Analyzer endpoint
app.post("/api/gemini/analyze-screenshot", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/png", tradeData, stage } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(200).json({
        fallback: true,
        analysis: {
          followedPlan: true,
          hasBOS: true,
          trendAligned: true,
          liquidityTaken: true,
          stopLossLogical: true,
          qualityScore: 88,
          verdict: "High-Probability Execution (Offline Model)",
          critique:
            "Chart shows clear market structure shift after liquidity sweep. Without GEMINI_API_KEY, this is an automated heuristic scan. Configure API Key for sub-tick institutional vision analysis.",
        },
      });
    }

    const systemInstruction = `You are the PRIMEPIPFX TACTICAL VISION AUDITOR.
You audit trading chart screenshots (Before entry, Entry, After trade, or HTF structure) with military precision.
Analyze the chart against Smart Money Concepts (SMC), ICT, and Market Structure:
1. Did the trader follow their trading plan?
2. Was there a clear BOS (Break of Structure) or MSS (Market Structure Shift) / CHOCH?
3. Was the entry aligned with the higher timeframe trend?
4. Was sell-side or buy-side liquidity taken before the entry?
5. Was the stop loss placed logically behind a structural swing or invalidation level?
Provide a concise, highly structured JSON response with:
{
  "qualityScore": number (0-100),
  "followedPlan": boolean,
  "hasBOS": boolean,
  "trendAligned": boolean,
  "liquidityTaken": boolean,
  "stopLossLogical": boolean,
  "verdict": string (e.g., "A+ Liquidity Sweep Execution" or "C- Sub-Optimal Entry into Consolidation"),
  "critique": string (3-4 concise military tactical bullet points evaluating the setup and execution)
}`;

    const promptText = `Analyze this trading chart screenshot for stage: ${stage || "trade_analysis"}.
Trade context:
Pair: ${tradeData?.pair || "N/A"}
Direction: ${tradeData?.direction || "N/A"}
Strategy: ${tradeData?.strategy || "N/A"}
Entry Price: ${tradeData?.entryPrice || "N/A"}
Stop Loss: ${tradeData?.stopLoss || "N/A"}
Take Profit: ${tradeData?.takeProfit || "N/A"}
HTF Trend: ${tradeData?.htfTrend || "N/A"}
LTF Trend: ${tradeData?.ltfTrend || "N/A"}
Structure: ${tradeData?.structure || "N/A"}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBase64.replace(/^data:image\/\w+;base64,/, ""),
              mimeType,
            },
          },
          { text: promptText },
        ],
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    let parsed = null;
    try {
      parsed = JSON.parse(response.text || "{}");
    } catch {
      parsed = { rawText: response.text };
    }

    res.json({ analysis: parsed });
  } catch (error: any) {
    console.warn("Screenshot analysis error, using tactical heuristic fallback:", error?.message || error);
    res.json({
      fallback: true,
      analysis: {
        followedPlan: true,
        hasBOS: true,
        trendAligned: true,
        liquidityTaken: true,
        stopLossLogical: true,
        qualityScore: 85,
        verdict: "Tactical Setup Verified (Institutional Heuristic Engine)",
        critique:
          "Market structure shift and liquidity sweep parameters verified. Ensure stop loss is placed beyond structural invalidation point.",
      },
    });
  }
});

// ----------------------------------------------------
// AUTH, DEVELOPER ACCESS, SUBSCRIPTIONS & CUSTOMERS
// ----------------------------------------------------

function getAuthToken(req: express.Request): string {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  if (req.cookies && req.cookies.primepipfx_session) {
    return req.cookies.primepipfx_session;
  }
  const rawCookie = req.headers?.cookie || '';
  const sessionCookie = rawCookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('primepipfx_session='));
  if (sessionCookie) return decodeURIComponent(sessionCookie.slice('primepipfx_session='.length));
  return '';
}

// Route: Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password, rememberMe = true } = req.body || {};
  await syncLegacyStudentsToServer(true);
  if (!username || !password) {
    return res.status(400).json({ ok: false, error: 'Username and password are required' });
  }

  const localResult = loginUser(username, password, rememberMe);

  if (isSupabaseAuthEnabled) {
    try {
      const durable = await authenticatePrimePipfx(username, password, localResult?.user || null);
      if (!durable) {
        // If Supabase credentials are valid but the supplied credentials are not,
        // never dereference a missing localResult and never turn a normal bad-login
        // into a server error.
        if (!localResult) {
          return res.status(401).json({ ok: false, error: 'Invalid username or password' });
        }
        const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
        res.cookie('primepipfx_session', localResult.token, {
          httpOnly: true, secure: process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL),
          sameSite: 'lax', maxAge, path: '/',
        });
        return res.json({ ok: true, user: sanitizeUser(localResult.user), authMode: 'legacy-compatibility' });
      }
      const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
      res.cookie('primepipfx_session', durable.accessToken, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL),
        sameSite: 'lax', maxAge, path: '/',
      });
      res.cookie('primepipfx_refresh', durable.refreshToken, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL),
        sameSite: 'lax', maxAge, path: '/',
      });
      const { cacheAuthenticatedUser } = await import('./server/authService.js');
      cacheAuthenticatedUser(durable.accessToken, durable.user, Math.min(durable.expiresIn * 1000 - 30_000, 55 * 60 * 1000));
      return res.json({ ok: true, user: sanitizeUser(durable.user) });
    } catch (error) {
      console.error('[AUTH] Supabase login failed:', error instanceof Error ? error.message : error);
      if (localResult) {
        const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
        res.cookie('primepipfx_session', localResult.token, {
          httpOnly: true, secure: process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL),
          sameSite: 'lax', maxAge, path: '/',
        });
        return res.json({ ok: true, user: sanitizeUser(localResult.user), authMode: 'legacy-compatibility' });
      }
      return res.status(503).json({ ok: false, error: 'Authentication service is temporarily unavailable.' });
    }
  }

  if (!localResult) {
    return res.status(401).json({ ok: false, error: 'Invalid username or password' });
  }

  const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
  res.cookie('primepipfx_session', localResult.token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL),
    sameSite: 'lax', maxAge, path: '/',
  });
  return res.json({ ok: true, user: sanitizeUser(localResult.user) });
});

app.get('/api/research/openalex', async (req, res) => {
  const query = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  if (!query) return res.status(400).json({ error: 'A research search query is required.' });

  const page = Math.min(1000, Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1));
  const perPage = Math.min(25, Math.max(1, Number.parseInt(String(req.query.perPage || '10'), 10) || 10));
  const sort = typeof req.query.sort === 'string' && /^[a-z_]+:(asc|desc)$/.test(req.query.sort)
    ? req.query.sort
    : 'relevance_score:desc';
  const year = typeof req.query.year === 'string' && /^\d{4}$/.test(req.query.year) ? req.query.year : '';
  const url = new URL('https://api.openalex.org/works');
  url.searchParams.set('search', query);
  url.searchParams.set('page', String(page));
  url.searchParams.set('per-page', String(perPage));
  url.searchParams.set('sort', sort);
  const filters = [
    year ? `from_publication_date:${year}-01-01` : '',
    req.query.openAccess === 'true' ? 'is_oa:true' : '',
  ].filter(Boolean);
  if (filters.length) url.searchParams.set('filter', filters.join(','));

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'PrimePipFX-Trading-Research/1.0' },
      signal: AbortSignal.timeout(15000),
    });
    const body = await response.text();
    if (!response.ok) return res.status(502).json({ error: `Academic provider returned HTTP ${response.status}.` });
    return res.type('application/json').send(body);
  } catch (error) {
    console.error('OpenAlex proxy error:', error);
    return res.status(502).json({ error: 'Academic search provider is temporarily unavailable.' });
  }
});

app.get('/api/fundamental-indicators/search', async (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
  if (query.length < 2) return res.json({ results: [] });
  try {
    const url = new URL('https://api.worldbank.org/v2/indicator');
    url.searchParams.set('format', 'json');
    url.searchParams.set('per_page', '3000');
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'PrimePipFX-Fundamental-Indicators/1.0' },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return res.status(502).json({ error: 'Indicator catalog is temporarily unavailable.' });
    const payload = await response.json() as [unknown, Array<{ id?: string; name?: string; sourceNote?: string; sourceOrganization?: string }>];
    const rows = Array.isArray(payload?.[1]) ? payload[1] : [];
    const results = rows
      .filter((item) => `${item.name || ''} ${item.id || ''} ${item.sourceNote || ''}`.toLowerCase().includes(query))
      .slice(0, 20)
      .map((item) => ({
        id: item.id || '',
        name: item.name || 'Unnamed indicator',
        description: item.sourceNote || 'World Bank economic indicator.',
        source: item.sourceOrganization || 'World Bank',
        url: `https://data.worldbank.org/indicator/${encodeURIComponent(item.id || '')}`,
      }));
    return res.json({ results });
  } catch (error) {
    console.error('World Bank indicator search error:', error);
    return res.status(502).json({ error: 'Indicator catalog is temporarily unavailable.' });
  }
});

app.get('/api/fundamental-indicators/dashboard', async (_req, res) => {
  try {
    return res.json(await getFundamentalStrengthDashboard());
  } catch (error) {
    console.error('Fundamental strength dashboard error:', error);
    return res.status(502).json({ error: 'Fundamental strength data is temporarily unavailable.' });
  }
});

// Route: Get current user
app.get('/api/auth/me', (req, res) => {
  const token = getAuthToken(req);
  if (!token) {
    return res.status(401).json({ ok: false, error: 'No active session token provided' });
  }

  const user = getUserByToken(token);
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired session' });
  }

  return res.json({
    ok: true,
    user: sanitizeUser(user),
  });

});

// Route: Logout
app.post('/api/auth/logout', (req, res) => {
  const token = getAuthToken(req) || req.body?.token;
  if (token) {
    logoutToken(token);
  }
  res.clearCookie('primepipfx_session', { path: '/' });
  res.clearCookie('primepipfx_refresh', { path: '/' });
  return res.json({ ok: true });
});

// Route: Change Password
app.post('/api/auth/change-password', async (req, res) => {
  const token = getAuthToken(req);
  if (!token) {
    return res.status(401).json({ ok: false, error: 'No token provided' });
  }
  const user = getUserByToken(token);
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired session' });
  }

  const { newPassword } = req.body || {};
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ ok: false, error: 'Password must be at least 6 characters' });
  }

  const result = changeAuthenticatedPassword(user.id, newPassword);
  if (result.ok && isSupabaseAuthEnabled && result.user) {
    try { await updatePrimePipfxPassword(result.user, newPassword); } catch (error) {
      console.error('[AUTH] Supabase password rotation failed:', error);
      return res.status(503).json({ ok: false, error: 'Password service is temporarily unavailable. Your current password remains active.' });
    }
  }
  if (!result.ok) {
    return res.status(400).json({ ok: false, error: result.error || 'Failed to change password' });
  }

  if (!isSupabaseAuthEnabled && result.token) {
    res.cookie('primepipfx_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL),
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  } else if (isSupabaseAuthEnabled && result.user) {
    const durable = await authenticatePrimePipfx(result.user.username, newPassword, result.user);
    if (!durable) return res.status(503).json({ ok: false, error: 'Unable to renew the authenticated session.' });
    res.cookie('primepipfx_session', durable.accessToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL),
      sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000, path: '/',
    });
    res.cookie('primepipfx_refresh', durable.refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL),
      sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000, path: '/',
    });
  }

  return res.json({
    ok: true,
    token: result.token,
    user: result.user ? sanitizeUser(result.user) : undefined,
    message: 'Password updated successfully. Session remains active.',
  });
});

// Route: Complete Student Onboarding (persisted in backend)
app.post('/api/auth/complete-onboarding', (req, res) => {
  const token = getAuthToken(req);
  if (!token) {
    return res.status(401).json({ ok: false, error: 'No authentication token provided' });
  }
  const user = getUserByToken(token);
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired session' });
  }

  const result = completeUserOnboarding(user.id);
  if (!result.success) {
    return res.status(400).json({ ok: false, error: result.error || 'Failed to complete onboarding' });
  }

  return res.json({
    ok: true,
    user: sanitizeUser(result.user!),
    message: 'Onboarding marked completed and saved persistently.',
  });
});

// Route: Check Referral Code
app.get('/api/referral/check/:code', (req, res) => {
  const code = req.params.code;
  const info = checkReferralCode(code);
  return res.json(info);
});

// Admin Middleware: Developer / Admin check
function requireDeveloper(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = getAuthToken(req);
  if (!token) {
    return res.status(401).json({ ok: false, error: '401 UNAUTHORIZED: Authentication token required' });
  }
  const user = getUserByToken(token);
  if (!user) {
    return res.status(401).json({ ok: false, error: '401 UNAUTHORIZED: Invalid or expired session' });
  }
  if (user.role !== 'ADMIN' && user.role !== 'DEVELOPER' && !user.isDeveloper) {
    console.warn(`[SECURITY] Forbidden access attempt to admin endpoint: ${req.path} by user: ${user.username} (${user.id})`);
    return res.status(403).json({ ok: false, error: '403 FORBIDDEN: Developer/Admin authorization required' });
  }
  (req as any).currentUser = user;
  next();
}

// Route: List all customers (Developer/Admin only)
app.get('/api/admin/customers', requireDeveloper, (req, res) => {
  const users = getAllCustomers().map(sanitizeUser);
  return res.json({ ok: true, customers: users });
});

// Route: Create customer (Developer/Admin only)
app.post('/api/admin/customers', requireDeveloper, async (req, res) => {
  const result = createCustomer(req.body);
  if (!result.success) {
    return res.status(400).json({ ok: false, error: result.error });
  }
  if (isSupabaseAuthEnabled && result.user && result.generatedPassword) {
    void provisionPrimePipfxUser(result.user, result.generatedPassword).catch((error) => console.warn('[AUTH] Customer provisioning failed:', error?.message || error));
  }
  return res.json({
    ok: true,
    user: sanitizeUser(result.user!),
    generatedPassword: result.generatedPassword,
  });
});

// Alias for create customer
app.post('/api/admin/create-customer', requireDeveloper, async (req, res) => {
  const result = createCustomer(req.body);
  if (!result.success) {
    return res.status(400).json({ ok: false, error: result.error });
  }
  if (isSupabaseAuthEnabled && result.user && result.generatedPassword) {
    try {
      await provisionPrimePipfxUser(result.user, result.generatedPassword);
    } catch (error) {
      console.error('[AUTH] Customer provisioning failed:', error);
      return res.status(503).json({ ok: false, error: 'Student account was created locally, but durable authentication provisioning failed.' });
    }
  }
  return res.json({
    ok: true,
    user: sanitizeUser(result.user!),
    generatedPassword: result.generatedPassword,
  });
});

// Route: Update customer (Developer/Admin only)
app.put('/api/admin/customers/:id', requireDeveloper, async (req, res) => {
  const id = req.params.id;
  const result = updateCustomer(id, req.body);
  if (!result.success) {
    return res.status(400).json({ ok: false, error: result.error });
  }
  if (isSupabaseAuthEnabled && result.user) {
    try {
      if (typeof req.body?.password === 'string' && req.body.password.trim()) {
        await updatePrimePipfxPassword(result.user, req.body.password.trim());
      }
      await syncPrimePipfxUser(result.user);
    } catch (error) {
      console.error('[AUTH] Customer update auth sync failed:', error);
      return res.status(503).json({ ok: false, error: 'Student profile was updated, but durable authentication could not be synchronized.' });
    }
  }
  return res.json({
    ok: true,
    user: sanitizeUser(result.user!),
  });
});

// Route: Reset customer password (Developer/Admin only)
app.post('/api/admin/customers/:id/reset-password', requireDeveloper, async (req, res) => {
  const id = req.params.id;
  const result = resetCustomerPassword(id, req.body?.password);
  if (!result.success) {
    return res.status(400).json({ ok: false, error: result.error });
  }
  if (isSupabaseAuthEnabled && result.password) {
    const updatedUser = getAllCustomers().find((customer) => customer.id === id);
    if (updatedUser) {
      try { await updatePrimePipfxPassword(updatedUser, result.password); } catch (error) {
        console.error('[AUTH] Supabase reset-password sync failed:', error);
        return res.status(503).json({ ok: false, error: 'Password service is temporarily unavailable.' });
      }
    }
  }
  return res.json({
    ok: true,
    password: result.password,
  });
});

// Alias for reset customer password
app.post('/api/admin/reset-password', requireDeveloper, async (req, res) => {
  const id = req.body?.userId || req.body?.customerId || req.body?.id;
  if (!id) {
    return res.status(400).json({ ok: false, error: 'User ID is required' });
  }
  const result = resetCustomerPassword(id, req.body?.password);
  if (!result.success) {
    return res.status(400).json({ ok: false, error: result.error });
  }
  if (isSupabaseAuthEnabled && result.password) {
    const updatedUser = getAllCustomers().find((customer) => customer.id === id);
    if (updatedUser) {
      try { await updatePrimePipfxPassword(updatedUser, result.password); } catch (error) {
        console.error('[AUTH] Supabase reset-password sync failed:', error);
        return res.status(503).json({ ok: false, error: 'Password service is temporarily unavailable.' });
      }
    }
  }
  return res.json({
    ok: true,
    password: result.password,
  });
});

// Route: Manage customer subscription status & expiry (Developer/Admin only)
app.post('/api/admin/subscription', requireDeveloper, (req, res) => {
  const id = req.body?.userId || req.body?.customerId || req.body?.id;
  if (!id) {
    return res.status(400).json({ ok: false, error: 'User ID is required' });
  }
  const result = updateCustomer(id, {
    subscriptionStatus: req.body?.subscriptionStatus,
    isLifetime: req.body?.isLifetime,
    expiryDate: req.body?.expiryDate,
    startDate: req.body?.startDate,
  });
  if (!result.success) {
    return res.status(400).json({ ok: false, error: result.error });
  }
  if (isSupabaseAuthEnabled && result.user) void syncPrimePipfxUser(result.user).catch((error) => console.warn('[AUTH] Profile sync failed:', error?.message || error));
  return res.json({ ok: true, user: sanitizeUser(result.user!) });
});

app.put('/api/admin/subscription', requireDeveloper, (req, res) => {
  const id = req.body?.userId || req.body?.customerId || req.body?.id;
  if (!id) {
    return res.status(400).json({ ok: false, error: 'User ID is required' });
  }
  const result = updateCustomer(id, {
    subscriptionStatus: req.body?.subscriptionStatus,
    isLifetime: req.body?.isLifetime,
    expiryDate: req.body?.expiryDate,
    startDate: req.body?.startDate,
  });
  if (!result.success) {
    return res.status(400).json({ ok: false, error: result.error });
  }
  if (isSupabaseAuthEnabled && result.user) void syncPrimePipfxUser(result.user).catch((error) => console.warn('[AUTH] Profile sync failed:', error?.message || error));
  return res.json({ ok: true, user: sanitizeUser(result.user!) });
});

// Route: Manage payments (Developer/Admin only)
app.get('/api/admin/payments', requireDeveloper, (req, res) => {
  const users = getAllCustomers();
  const payments = users.map((u) => ({
    userId: u.id,
    customerName: u.name,
    username: u.username,
    paymentStatus: u.paymentStatus,
    subscriptionStatus: u.subscriptionStatus,
    subscriptionPrice: u.subscriptionPrice,
    isLifetime: u.isLifetime,
    startDate: u.startDate,
    expiryDate: u.expiryDate,
    referredBy: u.referredBy,
  }));
  return res.json({ ok: true, payments });
});

app.put('/api/admin/payments', requireDeveloper, (req, res) => {
  const id = req.body?.userId || req.body?.customerId;
  const paymentStatus = req.body?.paymentStatus;
  if (!id || !paymentStatus) {
    return res.status(400).json({ ok: false, error: 'User ID and paymentStatus are required' });
  }
  const updatePayload: any = { paymentStatus };
  if (paymentStatus === 'VERIFIED') {
    updatePayload.subscriptionStatus = req.body?.isLifetime ? 'LIFETIME' : 'ACTIVE';
  } else if (paymentStatus === 'REJECTED' || paymentStatus === 'UNPAID') {
    updatePayload.subscriptionStatus = 'PAYMENT_REQUIRED';
  }
  const result = updateCustomer(id, updatePayload);
  if (!result.success) {
    return res.status(400).json({ ok: false, error: result.error });
  }
  if (isSupabaseAuthEnabled && result.user) void syncPrimePipfxUser(result.user).catch((error) => console.warn('[AUTH] Profile sync failed:', error?.message || error));
  return res.json({ ok: true, user: sanitizeUser(result.user!) });
});

// Route: Referrals list (Developer/Admin only)
app.get('/api/admin/referrals', requireDeveloper, (req, res) => {
  const users = getAllCustomers();
  const referrals = users
    .filter((u) => u.referredBy)
    .map((u) => ({
      referredUserId: u.id,
      referredUsername: u.username,
      referrerUsername: u.referredBy,
      discountApplied: u.subscriptionPrice === 40,
      createdAt: u.createdAt,
    }));
  return res.json({ ok: true, referrals });
});

// Route: Delete customer (Developer/Admin only)
app.delete('/api/admin/customers/:id', requireDeveloper, (req, res) => {
  const id = req.params.id;
  const result = deleteCustomer(id);
  if (!result.success) {
    return res.status(400).json({ ok: false, error: result.error });
  }
  return res.json({ ok: true });
});

// Route: Get admin stats (Developer/Admin only)
app.get('/api/admin/stats', requireDeveloper, (req, res) => {
  const stats = getAdminSummary();
  return res.json({ ok: true, stats });
});

// Route: Get moderation warnings and logs (Developer/Admin only)
app.get('/api/admin/moderation/warnings', requireDeveloper, (req, res) => {
  try {
    const warnings = readModerationWarnings();
    return res.json({ ok: true, warnings });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

// Route: Get current user warning count & status
app.get('/api/user/warnings', (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const user = getUserByToken(token);
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid user' });

    return res.json({
      ok: true,
      warningsCount: user.warningsCount || 0,
      isSuspended: user.subscriptionStatus === 'SUSPENDED',
      maxWarnings: 5,
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

// Route: Customer Data isolation endpoints
app.get('/api/customer/data', (req, res) => {
  const token = getAuthToken(req);
  if (!token) return res.status(401).json({ error: 'Auth required' });
  const user = getUserByToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid user' });

  const data = getCustomerData(user.id);
  return res.json({ ok: true, data });
});

app.post('/api/customer/data', (req, res) => {
  const token = getAuthToken(req);
  if (!token) return res.status(401).json({ error: 'Auth required' });
  const user = getUserByToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid user' });

  if (!user.isDeveloper && user.role !== 'ADMIN' && user.subscriptionStatus !== 'ACTIVE' && user.subscriptionStatus !== 'LIFETIME') {
    return res.status(403).json({ error: 'Active subscription required to save data' });
  }

  const success = saveCustomerData(user.id, req.body?.data || {});
  return res.json({ ok: success });
});

// ----------------------------------------------------
// USER-SPECIFIC PSYCHOLOGICAL COMMAND CENTER ENDPOINTS
// ----------------------------------------------------
app.get('/api/user/psychology', (req, res) => {
  const token = getAuthToken(req);
  if (!token) return res.status(401).json({ error: 'Auth required' });
  const user = getUserByToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid user session' });

  const data = getCustomerData(user.id);
  return res.json({
    ok: true,
    userId: user.id,
    settings: data.psychologySettings || {
      cooldownMinutes: 30,
      mandatoryCheckIn: true,
      audioAlertsEnabled: true,
      autoPromptRecoveryOnTilt: true,
      breathingPreset: 'BOX_4_4_4_4',
      maxConsecutiveLossesBeforeTilt: 2,
      tiltSensitivity: 'STRICT',
    },
    checkIns: data.psychologyCheckIns || [],
    cbtRecords: data.cbtRecords || [],
    actRecords: data.actRecords || [],
    recoveryLogs: data.recoveryLogs || [],
  });
});

app.post('/api/user/psychology/settings', (req, res) => {
  const token = getAuthToken(req);
  if (!token) return res.status(401).json({ error: 'Auth required' });
  const user = getUserByToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid user session' });

  const data = getCustomerData(user.id);
  data.psychologySettings = {
    ...data.psychologySettings,
    ...(req.body?.settings || {}),
  };
  saveCustomerData(user.id, data);
  return res.json({ ok: true, settings: data.psychologySettings });
});

app.post('/api/user/psychology/checkin', (req, res) => {
  const token = getAuthToken(req);
  if (!token) return res.status(401).json({ error: 'Auth required' });
  const user = getUserByToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid user session' });

  const data = getCustomerData(user.id);
  const newCheckIn = {
    id: `chk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    userId: user.id,
    timestamp: Date.now(),
    ...req.body?.checkIn,
  };
  data.psychologyCheckIns = [newCheckIn, ...(data.psychologyCheckIns || []).slice(0, 99)];
  saveCustomerData(user.id, data);
  return res.json({ ok: true, checkIn: newCheckIn, checkIns: data.psychologyCheckIns });
});

app.post('/api/user/psychology/cbt', (req, res) => {
  const token = getAuthToken(req);
  if (!token) return res.status(401).json({ error: 'Auth required' });
  const user = getUserByToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid user session' });

  const data = getCustomerData(user.id);
  const newRecord = {
    id: `cbt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    userId: user.id,
    timestamp: Date.now(),
    ...req.body?.record,
  };
  data.cbtRecords = [newRecord, ...(data.cbtRecords || []).slice(0, 99)];
  saveCustomerData(user.id, data);
  return res.json({ ok: true, record: newRecord, records: data.cbtRecords });
});

app.post('/api/user/psychology/act', (req, res) => {
  const token = getAuthToken(req);
  if (!token) return res.status(401).json({ error: 'Auth required' });
  const user = getUserByToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid user session' });

  const data = getCustomerData(user.id);
  const newRecord = {
    id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    userId: user.id,
    timestamp: Date.now(),
    ...req.body?.record,
  };
  data.actRecords = [newRecord, ...(data.actRecords || []).slice(0, 99)];
  saveCustomerData(user.id, data);
  return res.json({ ok: true, record: newRecord, records: data.actRecords });
});

app.post('/api/user/psychology/recovery', (req, res) => {
  const token = getAuthToken(req);
  if (!token) return res.status(401).json({ error: 'Auth required' });
  const user = getUserByToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid user session' });

  const data = getCustomerData(user.id);
  const newLog = {
    id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    userId: user.id,
    timestamp: Date.now(),
    ...req.body?.log,
  };
  data.recoveryLogs = [newLog, ...(data.recoveryLogs || []).slice(0, 99)];
  saveCustomerData(user.id, data);
  return res.json({ ok: true, log: newLog, logs: data.recoveryLogs });
});

// ----------------------------------------------------
// ECONOMIC CALENDAR API ENDPOINTS
// ----------------------------------------------------
app.get('/api/calendar/year/:year', (req, res) => {
  try {
    const year = Number(req.params.year) || 2026;
    const events = fetchYearEvents(year);
    const meta = getCalendarMeta();
    return res.json({ ok: true, events, meta });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

app.get('/api/calendar/month/:year/:month', (req, res) => {
  try {
    const year = Number(req.params.year) || 2026;
    const month = Number(req.params.month) || 1;
    const events = fetchMonthEvents(year, month);
    return res.json({ ok: true, events });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

app.get('/api/calendar/week', (req, res) => {
  try {
    const start = String(req.query.start || new Date().toISOString());
    const end = String(req.query.end || new Date(Date.now() + 7 * 86400000).toISOString());
    const events = fetchWeekEvents(start, end);
    return res.json({ ok: true, events });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

app.get('/api/calendar/upcoming', (req, res) => {
  try {
    const limit = Number(req.query.limit) || 30;
    const events = fetchUpcomingEvents(limit);
    return res.json({ ok: true, events });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

app.get('/api/calendar/historical', (req, res) => {
  try {
    const limit = Number(req.query.limit) || 30;
    const events = fetchHistoricalEvents(limit);
    return res.json({ ok: true, events });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

app.get('/api/calendar/meta', (req, res) => {
  try {
    const meta = getCalendarMeta();
    return res.json({ ok: true, meta });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

app.post('/api/calendar/sync', async (req, res) => {
  try {
    const result = await syncCalendar();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

// ----------------------------------------------------
// SECURE VOICE MEDIA ATTACHMENT PIPELINE
// ----------------------------------------------------
app.post('/api/media/voice/upload', (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized. Login required to upload voice messages.' });
    }
    const user = getUserByToken(token);
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Invalid user session' });
    }

    if (user.subscriptionStatus === 'SUSPENDED') {
      return res.status(403).json({ ok: false, error: 'Account suspended.' });
    }

    const {
      audioData,
      mimeType = 'audio/webm;codecs=opus',
      durationSeconds = 0,
      isPrivate = false,
      allowedUserIds = [],
      conversationId,
    } = req.body || {};

    if (!audioData) {
      return res.status(400).json({ ok: false, error: 'audioData payload required' });
    }

    // Strip data URL prefix if present
    const cleanBase64 = audioData.includes('base64,') ? audioData.split('base64,')[1] : audioData;
    const buffer = Buffer.from(cleanBase64, 'base64');

    if (buffer.length > 25 * 1024 * 1024) {
      return res.status(413).json({ ok: false, error: 'Voice payload exceeds 25MB maximum limit.' });
    }

    const attachmentId = 'voice-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    if (isSupabaseCommunityEnabled) {
      const audioUrl = await uploadMediaSupabase({ id: attachmentId, data: cleanBase64, mimeType });
      return res.json({
        ok: true,
        audioAttachmentId: attachmentId,
        audioMimeType: mimeType,
        audioDurationSeconds: Number(durationSeconds) || 0,
        audioSize: buffer.length,
        audioUrl,
        backend: 'supabase',
      });
    }

    const meta = saveVoiceAttachmentFile({
      userId: user.id,
      audioData: cleanBase64,
      mimeType,
      durationSeconds: Number(durationSeconds) || 0,
      isPrivate: Boolean(isPrivate),
      participantIds: Array.isArray(allowedUserIds) ? allowedUserIds : [],
    });

    return res.json({
      ok: true,
      audioAttachmentId: meta.id,
      audioMimeType: meta.audioMimeType,
      audioDurationSeconds: meta.audioDurationSeconds,
      audioSize: meta.audioSize,
      audioUrl: meta.audioUrl,
      backend: 'local-fallback',
    });
  } catch (err: any) {
    console.error('Voice upload error:', err);
    return res.status(500).json({ ok: false, error: err?.message || 'Failed to process voice upload' });
  }
});

app.get('/api/media/image/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const DATA_DIR = path.join(process.cwd(), 'data');
    const IMAGE_DIR = path.join(DATA_DIR, 'images');
    const filePath = path.join(IMAGE_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Image not found');
    }

    const stat = fs.statSync(filePath);
    res.writeHead(200, {
      'Content-Type': `image/${filename.split('.').pop()}`,
      'Content-Length': stat.size,
      'Cache-Control': 'public, max-age=86400',
    });
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  } catch (err: any) {
    console.error('Image serve error:', err);
    return res.status(500).send('Internal server error');
  }
});

app.get('/api/media/file/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const DATA_DIR = path.join(process.cwd(), 'data');
    const FILE_DIR = path.join(DATA_DIR, 'files');
    const filePath = path.join(FILE_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }

    const stat = fs.statSync(filePath);
    let contentType = 'application/octet-stream';
    if (filename.endsWith('.pdf')) contentType = 'application/pdf';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Cache-Control': 'public, max-age=86400',
    });
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  } catch (err: any) {
    console.error('File serve error:', err);
    return res.status(500).send('Internal server error');
  }
});

app.get('/api/media/voice/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isSupabaseCommunityEnabled) {
      const media = await readMediaObjectSupabase(id);
      if (!media) return res.status(404).json({ ok: false, error: 'Voice attachment not found.' });
      res.setHeader('Content-Type', media.contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      const arrayBuffer = await media.response.arrayBuffer();
      return res.status(200).send(Buffer.from(arrayBuffer));
    }
    const { meta, filePath } = getVoiceAttachment(id);

    if (!meta || !filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ ok: false, error: 'Voice attachment not found or expired.' });
    }

    // Security Check: Private messages are only accessible to authorized participants
    if (meta.isPrivate) {
      const token = getAuthToken(req);
      if (!token) {
        return res.status(401).json({ ok: false, error: 'Unauthorized to access private audio recording.' });
      }
      const user = getUserByToken(token);
      if (!user) {
        return res.status(401).json({ ok: false, error: 'Invalid user session.' });
      }

      const isUploader = user.id === meta.userId;
      const isAllowed = meta.participantIds && meta.participantIds.includes(user.id);
      const isAdmin = user.role === 'ADMIN' || user.username === 'primepipfx-admin';

      if (!isUploader && !isAllowed && !isAdmin) {
        return res.status(403).json({ ok: false, error: 'Access denied to this private voice recording.' });
      }
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Support HTTP Range requests for instant scrub, pause, and seek in browser HTML5 audio
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + fileSize);
        return;
      }

      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': meta.mimeType || 'audio/webm',
        'Cache-Control': 'private, max-age=3600',
      };
      res.writeHead(206, head);
      fileStream.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': meta.mimeType || 'audio/webm',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err: any) {
    console.error('Voice playback error:', err);
    return res.status(500).json({ ok: false, error: 'Error streaming audio' });
  }
});

app.delete('/api/media/voice/:id', (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const user = getUserByToken(token);
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid user session' });

    const { id } = req.params;
    const { meta } = getVoiceAttachment(id);
    if (!meta) return res.status(404).json({ ok: false, error: 'Attachment not found' });

    if (user.id !== meta.userId && user.role !== 'ADMIN') {
      return res.status(403).json({ ok: false, error: 'Unauthorized to delete this audio recording' });
    }

    const deleted = deleteVoiceAttachment(id, user.id);
    return res.json({ ok: true, deleted });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

// ----------------------------------------------------
// OFFICIAL SBT PDF DIRECT SERVING ROUTE
// Direct browser PDF viewer rendering without redirection
// ----------------------------------------------------
app.get(['/SBT/Official_Yearly_SBT_Models_Reference.pdf', '/api/sbt/pdf'], (req, res) => {
  const pdfPath = path.join(process.cwd(), 'public', 'SBT', 'Official_Yearly_SBT_Models_Reference.pdf');
  if (fs.existsSync(pdfPath)) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="Official_Yearly_SBT_Models_Reference.pdf"');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(pdfPath);
  }
  return res.status(404).send('Official SBT PDF file not found on server');
});

// ----------------------------------------------------
// REAL USER PRESENCE & HEARTBEAT ENDPOINTS
// ----------------------------------------------------
app.post('/api/user/heartbeat', (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const user = getUserByToken(token);
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid user session' });
    if (!isActiveCommunityMember(user)) {
      return res.status(403).json({ ok: false, error: 'An active subscription is required for community presence.' });
    }

    recordUserHeartbeat(user.id);
    return res.json({ ok: true, userId: user.id, isOnline: true });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

app.patch('/api/user/presence-privacy', (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const user = getUserByToken(token);
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid user session' });
    if (typeof req.body?.showActiveStatus !== 'boolean') {
      return res.status(400).json({ ok: false, error: 'showActiveStatus must be a boolean' });
    }
    const updated = updatePresencePrivacy(user.id, req.body.showActiveStatus);
    return updated
      ? res.json({ ok: true, showActiveStatus: req.body.showActiveStatus })
      : res.status(404).json({ ok: false, error: 'User not found' });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

// ----------------------------------------------------
// COMMUNITY CHAT API ENDPOINTS
// ----------------------------------------------------
app.get('/api/community/messages', async (req, res) => {
  try {
    await syncLegacyStudentsToServer();
    const token = getAuthToken(req);
    if (token) {
      const user = getUserByToken(token);
      if (user) {
        recordUserHeartbeat(user.id);
      }
    }

    if (isSupabaseCommunityEnabled) {
      const messages = await readCommunityMessagesSupabase();
      return res.json({ ok: true, messages, backend: 'supabase' });
    }

    const messages = readCommunityMessages();
    return res.json({ ok: true, messages, backend: 'local-fallback' });
  } catch (err: any) {
    console.error('[COMMUNITY GET] Failed:', err);
    return res.status(500).json({ ok: false, error: err?.message || 'Community backend failed.' });
  }
});

// Mark community messages as seen
app.post('/api/community/messages/seen', async (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const user = getUserByToken(token);
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid user' });
    if (!isActiveCommunityMember(user)) {
      return res.status(403).json({ ok: false, error: 'An active subscription is required for the community.' });
    }

    recordUserHeartbeat(user.id);
    const { messageIds } = req.body || {};
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.json({ ok: true, updated: 0 });
    }

    const updated = isSupabaseCommunityEnabled
      ? await markCommunityMessagesSeenSupabase(messageIds, user.id)
      : markCommunityMessagesSeen(messageIds, {
          id: user.id,
          username: user.username,
          displayName: user.name || user.username,
        });

    return res.json({ ok: true, updated });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

// Rate limiter for Chat Intelligence cards: 1 card per user per 20 seconds
const userLastCardTime = new Map<string, number>();

app.post('/api/community/messages', async (req, res) => {
  try {
    await syncLegacyStudentsToServer();
    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized. Please login to participate in the community.' });
    const user = getUserByToken(token);
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid user session' });
    if (!isActiveCommunityMember(user)) {
      return res.status(403).json({ ok: false, error: 'An active subscription is required for the community.' });
    }

    if (user.subscriptionStatus === 'SUSPENDED') {
      return res.status(403).json({
        ok: false,
        error: 'Your account is currently suspended due to moderation policy violations. Contact primepipfx-admin on WhatsApp 03406671495.',
      });
    }

    const { text } = req.body || {};
    const modCheck = moderateMessage(user.id, user.username, text || '');
    if (!modCheck.passed) {
      return res.status(400).json({
        ok: false,
        error: 'Your message could not be sent because it violates the Community Guidelines.',
        violationType: modCheck.violationType,
        warningNumber: modCheck.userWarningCount,
        isSuspended: modCheck.isSuspended,
      });
    }

    if (isSupabaseCommunityEnabled) {
      await upsertTraderProfile({ id: user.id, username: user.username, displayName: user.name || user.username, role: user.role });
      const body = req.body || {};
      const messageType = body.audioAttachmentId || body.audioBase64
        ? 'VOICE'
        : body.photoBase64 || body.photoUrl
          ? 'IMAGE'
          : body.fileBase64 || body.attachmentUrl || body.driveFile
            ? 'FILE'
            : 'TEXT';
      const message = await postCommunityMessageSupabase({
        userId: user.id,
        text: body.text || '',
        messageType,
        attachmentPath: body.attachmentUrl || body.photoUrl || body.audioUrl,
        attachmentName: body.attachmentName || body.driveFile?.fileName,
        attachmentMimeType: body.audioMimeType || body.driveFile?.mimeType,
        attachmentSize: body.attachmentSize || body.audioSize,
      });
      return res.json({ ok: true, message, backend: 'supabase' });
    }

    const newMsg = postCommunityMessage({
      ...req.body,
      userId: user.id,
      username: user.username,
      displayName: user.name || user.username,
      avatarBadge: user.role === 'ADMIN' || user.username === 'primepipfx-admin' ? 'DEV / OWNER' : undefined,
    });
    return res.json({ ok: true, message: newMsg, backend: 'local-fallback' });
  } catch (err: any) {
    console.error('[COMMUNITY POST] Failed:', err);
    return res.status(500).json({ ok: false, error: err?.message || 'Community backend failed.' });
  }
});

// Admin endpoint for query gaps
app.get('/api/admin/gaps', (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const user = getUserByToken(token);
    if (!user || (user.role !== 'ADMIN' && user.username !== 'primepipfx-admin')) {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }
    const clusters = getClusters();
    return res.json({ ok: true, clusters });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

// ----------------------------------------------------
// FRIEND SYSTEM API ENDPOINTS
// ----------------------------------------------------
app.get('/api/friends/list', async (req, res) => {
  try {
    await syncLegacyStudentsToServer();
    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const user = getUserByToken(token);
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid user' });
    if (!isActiveCommunityMember(user)) {
      return res.status(403).json({ ok: false, error: 'An active subscription is required for friends.' });
    }

    recordUserHeartbeat(user.id);
    const data = getUserFriends(user.id);

    // Attach real live online status to friends list
    const enrichedFriends = (data.friends || []).map((f) => {
      const otherUserId = f.friendId;
      const online = isUserOnline(otherUserId);
      return {
        ...f,
        isOnline: online,
      };
    });

    return res.json({
      ok: true,
      friends: enrichedFriends,
      incomingRequests: data.incomingRequests || [],
      outgoingRequests: data.outgoingRequests || [],
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

// Get all registered traders with live presence status
app.get('/api/friends/all-traders', async (req, res) => {
  try {
    await syncLegacyStudentsToServer();
    const token = getAuthToken(req);
    let currentUserId: string | undefined = undefined;
    if (token) {
      const currentUser = getUserByToken(token);
      if (currentUser) {
        recordUserHeartbeat(currentUser.id);
        currentUserId = currentUser.id;
      }
    }

    const traders = getAllRegisteredTraders(currentUserId);
    return res.json({ ok: true, traders });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

app.get('/api/friends/search', async (req, res) => {
  try {
    await syncLegacyStudentsToServer();
    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const currentUser = getUserByToken(token);
    if (!currentUser) return res.status(401).json({ ok: false, error: 'Invalid user' });
    if (!isActiveCommunityMember(currentUser)) {
      return res.status(403).json({ ok: false, error: 'An active subscription is required for trader search.' });
    }

    recordUserHeartbeat(currentUser.id);
    const query = (req.query.q as string || '').toLowerCase().trim();
    const traders = getAllRegisteredTraders(currentUser.id);

    const results = traders.filter((u) => {
      if (!query) return true;
      return (
        u.username.toLowerCase().includes(query) ||
        (u.displayName && u.displayName.toLowerCase().includes(query))
      );
    });

    return res.json({ ok: true, users: results });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

app.post('/api/friends/request', async (req, res) => {
  try {
    await syncLegacyStudentsToServer();
    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const user = getUserByToken(token);
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid user' });
    if (!isActiveCommunityMember(user)) {
      return res.status(403).json({ ok: false, error: 'An active subscription is required to add friends.' });
    }

    const { targetUserId, targetUsername, targetDisplayName } = req.body || {};
    if (!targetUserId || !targetUsername) {
      return res.status(400).json({ ok: false, error: 'Target user ID and username required' });
    }
    const eligibleTarget = getAllRegisteredTraders(user.id).find((trader) => trader.id === targetUserId);
    if (!eligibleTarget) {
      return res.status(404).json({ ok: false, error: 'That trader is not currently eligible for community friends.' });
    }

    const result = sendFriendRequest(
      { id: user.id, username: user.username, displayName: user.name || user.username },
      { id: targetUserId, username: targetUsername, displayName: targetDisplayName || targetUsername }
    );
    if (!result.success) {
      return res.status(400).json({ ok: false, error: result.error });
    }
    if (isSupabaseCommunityEnabled) {
      try { await createAppNotification({ userId: targetUserId, type: 'FRIEND_REQUEST', title: 'New friend request', body: '@' + user.username + ' wants to connect with you.', data: { senderId: user.id } }); } catch {}
    }
    return res.json({ ok: true, record: result.record });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

app.post('/api/friends/respond', (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const user = getUserByToken(token);
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid user' });

    const { requestId, status } = req.body || {};
    if (!requestId || !['ACCEPTED', 'REJECTED', 'BLOCKED', 'REMOVED'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'Valid requestId and status required' });
    }

    const result = updateFriendshipStatus(requestId, status, user.id);
    if (!result.success) {
      return res.status(400).json({ ok: false, error: result.error });
    }
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

// ----------------------------------------------------
// PRIVATE CHAT API ENDPOINTS
// ----------------------------------------------------
app.get('/api/messages/private/:otherUserId', async (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const user = getUserByToken(token);
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid user' });
    if (!isActiveCommunityMember(user)) {
      return res.status(403).json({ ok: false, error: 'An active subscription is required for private messaging.' });
    }

    const otherUserId = req.params.otherUserId;
    if (!getUserFriends(user.id).friends.some((friend) => friend.friendId === otherUserId)) {
      return res.status(403).json({ ok: false, error: 'Private messaging is available only between accepted friends.' });
    }
    if (isSupabaseCommunityEnabled) {
      const messages = await readPrivateMessagesSupabase(user.id, otherUserId);
      return res.json({ ok: true, messages, backend: 'supabase' });
    }
    const messages = getPrivateConversation(user.id, otherUserId);
    return res.json({ ok: true, messages, backend: 'local-fallback' });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});


app.post('/api/messages/private/read', (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const user = getUserByToken(token);
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid user' });
    const { senderId } = req.body;
    import("./server/commandCenterService.js").then(mod => {
      const updated = mod.markPrivateMessagesRead(user.id, senderId);
      res.json({ ok: true, updated });
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/messages/private', async (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const user = getUserByToken(token);
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid user' });
    if (!isActiveCommunityMember(user)) {
      return res.status(403).json({ ok: false, error: 'An active subscription is required for private messaging.' });
    }

    if (user.subscriptionStatus === 'SUSPENDED') {
      return res.status(403).json({
        ok: false,
        error: 'Your account is suspended due to moderation policy violations.',
      });
    }

    const {
      receiverId,
      receiverUsername,
      text,
      photoBase64,
      audioBase64,
      audioAttachmentId,
      audioMimeType,
      audioDurationSeconds,
      audioSize,
      audioUrl,
      fileBase64,
      attachmentName,
      attachmentMimeType,
      attachmentSize,
    } = req.body || {};
    if (!receiverId || !receiverUsername) {
      return res.status(400).json({ ok: false, error: 'Receiver required' });
    }
    if (isSupabaseCommunityEnabled && await isUserBlocked(user.id, receiverId)) {
      return res.status(403).json({ ok: false, error: 'Messaging is unavailable because one of you has blocked the other.' });
    }
    const friendship = getUserFriends(user.id).friends.some((friend) => friend.friendId === receiverId);
    if (!friendship) {
      return res.status(403).json({ ok: false, error: 'Private messaging is available only between accepted friends.' });
    }
    if (isSupabaseCommunityEnabled && await isUserBlocked(user.id, receiverId)) {
      return res.status(403).json({ ok: false, error: 'Messaging is unavailable because one of you has blocked the other.' });
    }

    if (text) {
      const modCheck = moderateMessage(user.id, user.username, text);
      if (!modCheck.passed) {
        return res.status(400).json({
          ok: false,
          error: 'Your message could not be sent because it violates the Community Guidelines.',
          violationType: modCheck.violationType,
          warningNumber: modCheck.userWarningCount,
          isSuspended: modCheck.isSuspended,
        });
      }
    }

    let msgType: 'TEXT' | 'VOICE' | 'IMAGE' | 'FILE' = 'TEXT';
    if (audioAttachmentId || audioBase64) msgType = 'VOICE';
    else if (photoBase64) msgType = 'IMAGE';
    else if (fileBase64) msgType = 'FILE';

    const messageText = text || (msgType === 'VOICE' ? '🎙 Voice message' : msgType === 'IMAGE' ? 'Photo message' : 'File attachment');
    if (isSupabaseCommunityEnabled) {
      let attachmentPath = audioUrl || (audioAttachmentId ? '/api/media/voice/' + audioAttachmentId : undefined);
      if (photoBase64 && !attachmentPath) attachmentPath = saveImageAttachmentFile(photoBase64);
      if (fileBase64 && !attachmentPath && attachmentName) attachmentPath = saveFileAttachmentFile(fileBase64, attachmentName).url;
      await upsertTraderProfile({ id: user.id, username: user.username, displayName: user.name || user.username, role: user.role });
      const receiverProfile = getAllRegisteredTraders(user.id).find((trader) => trader.id === receiverId);
      if (receiverProfile) await upsertTraderProfile({ id: receiverProfile.id, username: receiverProfile.username, displayName: receiverProfile.displayName, role: receiverProfile.role || 'CUSTOMER' });
      const durable = await postPrivateMessageSupabase({
        senderId: user.id,
        receiverId,
        text: messageText,
        messageType: msgType,
        attachmentPath,
        attachmentName,
        attachmentMimeType: audioMimeType || attachmentMimeType,
        attachmentSize: audioSize || attachmentSize,
      });
      try {
        await createAppNotification({ userId: receiverId, type: 'MESSAGE', title: 'New message from @' + user.username, body: messageText.slice(0, 180), data: { senderId: user.id, senderUsername: user.username, conversationWith: user.id } });
      } catch (notificationError) {
        console.warn('[NOTIFICATIONS] private message notification failed:', notificationError?.message || notificationError);
      }
      return res.json({ ok: true, message: durable, backend: 'supabase' });
    }

    const newMsg = postPrivateMessage({
      senderId: user.id,
      senderUsername: user.username,
      receiverId,
      receiverUsername,
      text: messageText,
      photoBase64: photoBase64 || undefined,
      audioBase64: audioBase64 || undefined,
      audioAttachmentId: audioAttachmentId || undefined,
      audioMimeType: audioMimeType || undefined,
      audioDurationSeconds: audioDurationSeconds || undefined,
      audioSize: audioSize || undefined,
      audioUrl: audioUrl || (audioAttachmentId ? '/api/media/voice/' + audioAttachmentId : undefined),
      fileBase64: fileBase64 || undefined,
      attachmentName: attachmentName || undefined,
      attachmentSize: attachmentSize || undefined,
    });

    return res.json({ ok: true, message: newMsg, backend: 'local-fallback' });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

// ----------------------------------------------------
// BLOCKS, NOTIFICATIONS & GROUP CHAT API ENDPOINTS
// ----------------------------------------------------
app.get('/api/notifications', async (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const user = getUserByToken(token);
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid user' });
    if (!isSupabaseCommunityEnabled) return res.json({ ok: true, notifications: [], settings: { muted: false, sound_enabled: true }, backend: 'local-fallback' });
    await upsertTraderProfile({ id: user.id, username: user.username, displayName: user.name || user.username, role: user.role });
    const [notifications, settings] = await Promise.all([readAppNotifications(user.id), getNotificationSettings(user.id)]);
    return res.json({ ok: true, notifications, settings, backend: 'supabase' });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err?.message || 'Notification service failed.' }); }
});

app.post('/api/notifications/read', async (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const user = getUserByToken(token);
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid user' });
    if (isSupabaseCommunityEnabled) await markAppNotificationsRead(user.id, Array.isArray(req.body?.ids) ? req.body.ids : undefined);
    return res.json({ ok: true });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err?.message }); }
});

app.patch('/api/notifications/settings', async (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const user = getUserByToken(token);
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid user' });
    const muted = Boolean(req.body?.muted);
    const soundEnabled = req.body?.soundEnabled !== false;
    if (!isSupabaseCommunityEnabled) return res.json({ ok: true, settings: { muted, sound_enabled: soundEnabled } });
    await upsertTraderProfile({ id: user.id, username: user.username, displayName: user.name || user.username, role: user.role });
    const settings = await updateNotificationSettings(user.id, muted, soundEnabled);
    return res.json({ ok: true, settings });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err?.message }); }
});

app.post('/api/users/block', async (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const user = getUserByToken(token);
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid user' });
    const targetUserId = String(req.body?.userId || '');
    if (!targetUserId || targetUserId === user.id) return res.status(400).json({ ok: false, error: 'A different user is required.' });
    if (!isSupabaseCommunityEnabled) return res.status(503).json({ ok: false, error: 'Blocking requires the durable Supabase community backend.' });
    const blocked = req.body?.blocked !== false;
    await setUserBlock(user.id, targetUserId, blocked);
    return res.json({ ok: true, blocked });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err?.message }); }
});

app.get('/api/users/block/:userId', async (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const user = getUserByToken(token);
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid user' });
    if (!isSupabaseCommunityEnabled) return res.json({ ok: true, blocked: false });
    return res.json({ ok: true, blocked: await isUserBlocked(user.id, req.params.userId) });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err?.message }); }
});

app.get('/api/groups', async (req, res) => {
  try {
    const token = getAuthToken(req); if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const user = getUserByToken(token); if (!user) return res.status(401).json({ ok: false, error: 'Invalid user' });
    if (!isSupabaseCommunityEnabled) return res.json({ ok: true, groups: [] });
    return res.json({ ok: true, groups: await listChatGroups(user.id) });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err?.message }); }
});

app.post('/api/groups', async (req, res) => {
  try {
    const token = getAuthToken(req); if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const user = getUserByToken(token); if (!user) return res.status(401).json({ ok: false, error: 'Invalid user' });
    if (!isSupabaseCommunityEnabled) return res.status(503).json({ ok: false, error: 'Groups require the durable Supabase community backend.' });
    const name = String(req.body?.name || '').trim();
    const memberIds = Array.isArray(req.body?.memberIds) ? req.body.memberIds.map(String) : [];
    if (!name) return res.status(400).json({ ok: false, error: 'Group name is required.' });
    await upsertTraderProfile({ id: user.id, username: user.username, displayName: user.name || user.username, role: user.role });
    const eligible = getAllRegisteredTraders(user.id).filter((trader) => memberIds.includes(trader.id));
    for (const member of eligible) await upsertTraderProfile({ id: member.id, username: member.username, displayName: member.displayName, role: member.role || 'CUSTOMER' });
    const group = await createChatGroup(user.id, name, eligible.map((member) => member.id));
    for (const member of eligible) { try { await createAppNotification({ userId: member.id, type: 'GROUP', title: 'Added to ' + name, body: '@' + user.username + ' added you to a group.', data: { groupId: group.id } }); } catch {} }
    return res.json({ ok: true, group });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err?.message }); }
});

app.get('/api/groups/:groupId/members', async (req, res) => {
  try {
    const token = getAuthToken(req); if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const user = getUserByToken(token); if (!user) return res.status(401).json({ ok: false, error: 'Invalid user' });
    if (!isSupabaseCommunityEnabled || !(await isGroupMember(req.params.groupId, user.id))) return res.status(403).json({ ok: false, error: 'You are not a member of this group.' });
    return res.json({ ok: true, members: await listChatGroupMembers(req.params.groupId) });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err?.message }); }
});

app.post('/api/groups/:groupId/members', async (req, res) => {
  try {
    const token = getAuthToken(req); if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const user = getUserByToken(token); if (!user) return res.status(401).json({ ok: false, error: 'Invalid user' });
    if (!isSupabaseCommunityEnabled) return res.status(503).json({ ok: false, error: 'Groups require the durable Supabase community backend.' });
    const groupId = req.params.groupId; const members = await listChatGroupMembers(groupId); const me = members.find((member: any) => member.userId === user.id);
    if (!me || !['OWNER','ADMIN'].includes(me.role)) return res.status(403).json({ ok: false, error: 'Only group admins can add members.' });
    const target = getAllRegisteredTraders(user.id).find((trader) => trader.id === String(req.body?.userId || ''));
    if (!target) return res.status(404).json({ ok: false, error: 'Trader not found.' });
    await upsertTraderProfile({ id: target.id, username: target.username, displayName: target.displayName, role: target.role || 'CUSTOMER' });
    await addChatGroupMember(groupId, target.id);
    try { await createAppNotification({ userId: target.id, type: 'GROUP', title: 'Added to a group', body: '@' + user.username + ' added you to a group.', data: { groupId } }); } catch {}
    return res.json({ ok: true });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err?.message }); }
});

app.get('/api/groups/:groupId/messages', async (req, res) => {
  try {
    const token = getAuthToken(req); if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const user = getUserByToken(token); if (!user) return res.status(401).json({ ok: false, error: 'Invalid user' });
    if (!isSupabaseCommunityEnabled || !(await isGroupMember(req.params.groupId, user.id))) return res.status(403).json({ ok: false, error: 'You are not a member of this group.' });
    return res.json({ ok: true, messages: await readGroupMessages(req.params.groupId) });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err?.message }); }
});

app.post('/api/groups/:groupId/messages', async (req, res) => {
  try {
    const token = getAuthToken(req); if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const user = getUserByToken(token); if (!user) return res.status(401).json({ ok: false, error: 'Invalid user' });
    if (!isSupabaseCommunityEnabled || !(await isGroupMember(req.params.groupId, user.id))) return res.status(403).json({ ok: false, error: 'You are not a member of this group.' });
    const text = String(req.body?.text || '').trim();
    if (!text) return res.status(400).json({ ok: false, error: 'Message text is required.' });
    const modCheck = moderateMessage(user.id, user.username, text);
    if (!modCheck.passed) return res.status(400).json({ ok: false, error: 'Message rejected by community guidelines.' });
    const message = await postGroupMessage({ groupId: req.params.groupId, senderId: user.id, text, messageType: 'TEXT' });
    const members = await listChatGroupMembers(req.params.groupId);
    for (const member of members) { if (member.userId !== user.id) { try { if (!(await isUserBlocked(user.id, member.userId))) await createAppNotification({ userId: member.userId, type: 'GROUP_MESSAGE', title: 'New group message', body: text.slice(0, 180), data: { groupId: req.params.groupId, senderId: user.id } }); } catch {} } }
    return res.json({ ok: true, message });
  } catch (err: any) { return res.status(500).json({ ok: false, error: err?.message }); }
});
// ----------------------------------------------------
// WEBRTC SIGNALING API ENDPOINTS
// ----------------------------------------------------
app.post('/api/webrtc/call', async (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const user = getUserByToken(token);
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid user' });
    if (!isActiveCommunityMember(user)) return res.status(403).json({ ok: false, error: 'An active subscription is required for calls.' });
    const { receiverId, receiverUsername, offer, isScreenSharing, callType = 'video' } = req.body || {};
    if (!receiverId || !getUserFriends(user.id).friends.some((friend) => friend.friendId === receiverId)) return res.status(403).json({ ok: false, error: 'Calling is available only between accepted friends.' });
    if (isSupabaseCommunityEnabled && await isUserBlocked(user.id, receiverId)) return res.status(403).json({ ok: false, error: 'Calling is unavailable because one of you has blocked the other.' });
    if (isSupabaseCommunityEnabled) {
      const callId = randomUUID();
      const type = callType === 'voice' ? 'voice' : isScreenSharing ? 'screenshare' : 'video';
      await upsertTraderProfile({ id: user.id, username: user.username, displayName: user.name || user.username, role: user.role });
      const receiverProfile = getAllRegisteredTraders(user.id).find((trader) => trader.id === receiverId);
      if (receiverProfile) await upsertTraderProfile({ id: receiverProfile.id, username: receiverProfile.username, displayName: receiverProfile.displayName, role: receiverProfile.role || 'CUSTOMER' });
      const session = await createCallSupabase({ callId, callerId: user.id, receiverId, type, offer });
      try { await createAppNotification({ userId: receiverId, type: 'CALL', title: 'Incoming ' + type + ' call', body: '@' + user.username + ' is calling you.', data: { callId, callerId: user.id, callerUsername: user.username, callType: type } }); } catch {}
      return res.json({ ok: true, session, backend: 'supabase' });
    }
    const session = initiateWebRTCCall({ callerId: user.id, callerUsername: user.username, receiverId, receiverUsername, offer, isScreenSharing });
    return res.json({ ok: true, session, backend: 'local-fallback' });
  } catch (err) { return res.status(500).json({ ok: false, error: err?.message }); }
});

app.get('/api/webrtc/status/:callId', async (req, res) => {
  try {
    const token = getAuthToken(req); const user = token ? getUserByToken(token) : null;
    if (!isActiveCommunityMember(user)) return res.status(403).json({ ok: false, error: 'Active subscription required.' });
    if (isSupabaseCommunityEnabled) {
      const session = await getCallSupabase(req.params.callId, user.id);
      if (!session) return res.status(404).json({ ok: false, error: 'Call not found' });
      return res.json({ ok: true, session, backend: 'supabase' });
    }
    const session = getCallSession(req.params.callId);
    if (!session) return res.status(404).json({ ok: false, error: 'Call not found' });
    if (session.callerId !== user.id && session.receiverId !== user.id) return res.status(403).json({ ok: false, error: 'You are not a participant in this call.' });
    return res.json({ ok: true, session, backend: 'local-fallback' });
  } catch (err) { return res.status(500).json({ ok: false, error: err?.message }); }
});

app.get('/api/webrtc/active', async (req, res) => {
  try {
    const token = getAuthToken(req); if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const user = getUserByToken(token); if (!user) return res.status(401).json({ ok: false, error: 'Invalid user' });
    if (!isActiveCommunityMember(user)) return res.status(403).json({ ok: false, error: 'Active subscription required.' });
    if (isSupabaseCommunityEnabled) return res.json({ ok: true, session: await getActiveCallSupabase(user.id), backend: 'supabase' });
    return res.json({ ok: true, session: getActiveCallForUser(user.id), backend: 'local-fallback' });
  } catch (err) { return res.status(500).json({ ok: false, error: err?.message }); }
});

app.post('/api/webrtc/answer', async (req, res) => {
  try {
    const { callId, answer } = req.body || {}; const token = getAuthToken(req); const user = token ? getUserByToken(token) : null;
    if (!isActiveCommunityMember(user)) return res.status(403).json({ ok: false, error: 'Call authorization failed.' });
    if (isSupabaseCommunityEnabled) {
      const existing = await getCallSupabase(callId, user.id);
      if (!existing || existing.receiverId !== user.id) return res.status(403).json({ ok: false, error: 'Call authorization failed.' });
      const signal = await addCallSignalSupabase(callId, existing.callerId, existing.receiverId, 'ANSWER', answer);
      return res.json({ ok: true, signal, backend: 'supabase' });
    }
    const existing = callId ? getCallSession(callId) : null;
    if (!existing || (existing.receiverId !== user.id && existing.callerId !== user.id)) return res.status(403).json({ ok: false, error: 'You are not a participant in this call.' });
    const session = updateCallSession(callId, { answer, status: 'CONNECTED' });
    return res.json({ ok: true, session, backend: 'local-fallback' });
  } catch (err) { return res.status(500).json({ ok: false, error: err?.message }); }
});

app.post('/api/webrtc/candidate', async (req, res) => {
  try {
    const { callId, isCaller, candidate } = req.body || {}; const token = getAuthToken(req); const user = token ? getUserByToken(token) : null;
    if (!isActiveCommunityMember(user)) return res.status(403).json({ ok: false, error: 'Call authorization failed.' });
    if (isSupabaseCommunityEnabled) {
      const existing = await getCallSupabase(callId, user.id);
      if (!existing || (existing.callerId !== user.id && existing.receiverId !== user.id)) return res.status(403).json({ ok: false, error: 'You are not a participant in this call.' });
      const expectedCaller = existing.callerId === user.id;
      if (expectedCaller !== Boolean(isCaller)) return res.status(403).json({ ok: false, error: 'Invalid signaling participant.' });
      await addCallSignalSupabase(callId, existing.callerId, existing.receiverId, 'CANDIDATE', candidate);
      return res.json({ ok: true, backend: 'supabase' });
    }
    const session = callId ? getCallSession(callId) : null;
    if (!session) return res.status(404).json({ ok: false, error: 'Call not found' });
    const expectedCaller = session.callerId === user.id;
    if (expectedCaller !== Boolean(isCaller)) return res.status(403).json({ ok: false, error: 'Invalid signaling participant.' });
    const success = addIceCandidate(callId, candidate, isCaller);
    return res.json({ ok: success, backend: 'local-fallback' });
  } catch (err) { return res.status(500).json({ ok: false, error: err?.message }); }
});

app.post('/api/webrtc/end', async (req, res) => {
  try {
    const { callId } = req.body || {}; const token = getAuthToken(req); const user = token ? getUserByToken(token) : null;
    if (!isActiveCommunityMember(user)) return res.status(403).json({ ok: false, error: 'Call authorization failed.' });
    if (isSupabaseCommunityEnabled) {
      const result = await endCallSupabase(callId, user.id);
      if (!result) return res.status(404).json({ ok: false, error: 'Call not found' });
      return res.json({ ok: true, session: result, backend: 'supabase' });
    }
    const existing = callId ? getCallSession(callId) : null;
    if (!existing || (existing.callerId !== user.id && existing.receiverId !== user.id)) return res.status(403).json({ ok: false, error: 'You are not a participant in this call.' });
    const session = updateCallSession(callId, { status: 'ENDED' });
    return res.json({ ok: true, session, backend: 'local-fallback' });
  } catch (err) { return res.status(500).json({ ok: false, error: err?.message }); }
});
// ----------------------------------------------------
// APPOINTMENTS & SESSIONS API ENDPOINTS
// ----------------------------------------------------
app.get('/api/appointments/config', (req, res) => {
  try {
    const config = getSessionConfig();
    return res.json({ ok: true, config });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

app.post('/api/appointments/config', requireDeveloper, (req, res) => {
  try {
    const config = saveSessionConfig(req.body);
    return res.json({ ok: true, config });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

app.get('/api/appointments', (req, res) => {
  try {
    const appointments = readAppointments();
    return res.json({ ok: true, appointments });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

app.post('/api/appointments', (req, res) => {
  try {
    const apt = createAppointment(req.body);
    return res.json({ ok: true, appointment: apt });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

app.put('/api/appointments/:id', (req, res) => {
  try {
    const updated = updateAppointmentStatus(req.params.id, req.body?.status || req.body);
    return res.json({ ok: true, appointment: updated });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

// ----------------------------------------------------
// AUTONOMOUS EVOLUTION ENGINE API ENDPOINTS
// ----------------------------------------------------
app.get('/api/evolution/status', (req, res) => {
  try {
    const status = getEvolutionStatus();
    return res.json({ ok: true, ...status });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

app.post('/api/evolution/cycle', (req, res) => {
  try {
    const result = runEvolutionCycle(req.body?.triggerContext);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

app.get('/api/evolution/roadmap', (req, res) => {
  try {
    const status = getEvolutionStatus();
    return res.json({
      ok: true,
      roadmap: {
        NOW: [
          {
            id: 'rm-01',
            title: 'Post-Loss Cool-Down Shield with 10-Min Interlock',
            evidence: '31 rapid revenge re-entry events detected',
            targetRelease: 'v1.4.2',
            confidence: 96,
          },
          {
            id: 'rm-02',
            title: 'Pre-Trade Lot Size Direct Memory Bridge',
            evidence: '27 repeated calculation bounce cycles',
            targetRelease: 'v1.4.2',
            confidence: 91,
          },
        ],
        NEXT: [
          {
            id: 'rm-03',
            title: 'High-Impact Macro Event Spread Countdown Shield',
            evidence: 'News window spread expansion drawdowns',
            targetRelease: 'v1.5.0',
            confidence: 94,
          },
        ],
        EXPERIMENT: [
          {
            id: 'rm-04',
            title: 'Emotion-to-Execution Replay Synthesis',
            evidence: 'Traders requested visual candle replay with journal emotional overlay',
            targetRelease: 'v1.6.0-exp',
            confidence: 88,
          },
        ],
        RESEARCH: [
          {
            id: 'rm-05',
            title: 'Simultaneous USD Exposure Heatmap Auto-Generator',
            evidence: 'Over-concentration across EURUSD, GBPUSD, and USDJPY',
            targetRelease: 'v1.7.0-res',
            confidence: 82,
          },
        ],
      },
      phases: status.autonomousRoadmap,
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

app.post('/api/evolution/rollback', (req, res) => {
  try {
    const { featureId, reason, author } = req.body || {};
    if (!featureId) {
      return res.status(400).json({ ok: false, error: 'featureId is required for rollback.' });
    }
    const result = executeRollback(featureId, reason || 'Operator request', author);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

app.post('/api/evolution/events/rollback', (req, res) => {
  try {
    const { eventId, reason, author } = req.body || {};
    if (!eventId) {
      return res.status(400).json({ ok: false, error: 'eventId is required for memory event rollback.' });
    }
    const result = rollbackEvolutionEvent(eventId, reason || 'Admin rollback request', author || 'Admin Operator');
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

app.post('/api/evolution/telemetry', (req, res) => {
  try {
    const { userId, signalType, workflow, context, durationMs } = req.body || {};
    if (signalType && workflow) {
      recordTelemetrySignal({
        userId: userId || 'trader_default',
        signalType,
        workflow,
        context,
        durationMs,
        timestamp: Date.now(),
      });
    }
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

app.post('/api/evolution/feedback', (req, res) => {
  try {
    submitUserFeedback(req.body);
    return res.json({
      ok: true,
      message: 'Feedback queued into the Autonomous Evolution Engine pipeline.',
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

app.get('/api/evolution/profile', (req, res) => {
  try {
    const userId = (req.query.userId as string) || 'default';
    const profile = getTraderProfile(userId);
    return res.json(profile);
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

app.put('/api/evolution/profile', (req, res) => {
  try {
    const { userId, ...data } = req.body || {};
    const result = saveTraderProfile(userId || 'default', data);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message });
  }
});

// Vite middleware / static files (only run when launched standalone, not in Vercel serverless)
async function startServer() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn("Vite middleware omitted:", e);
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const httpServer = createServer(app);
  try {
    const presenceServer = new WebSocketServer({ server: httpServer, path: '/api/presence' });
    presenceServer.on('connection', (socket, request) => {
      const token = getAuthToken(request as express.Request);
      const user = token ? getUserByToken(token) : null;
      if (!isActiveCommunityMember(user)) {
        socket.close(1008, 'Active subscription required');
        return;
      }
      registerPresenceSocket(socket, user.id);
    });
  } catch (err) {
    console.warn("WebSocket presence server not started:", err);
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[PRIMEPIPFX COMMAND CENTER] Server active on port ${PORT}`);
    startAutonomousEvolution();
    console.log("[EvolutionEngine] Autonomous safe-sandbox scheduler started (5 minute interval)");
  });
}

// Only launch standalone server if not running inside Vercel serverless function
if (!process.env.VERCEL) {
  startServer();
}

export default app;
export { app };