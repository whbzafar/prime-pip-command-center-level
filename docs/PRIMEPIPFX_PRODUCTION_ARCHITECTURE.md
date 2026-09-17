# PrimePipFx Command Center — Production Architecture

## Research decisions

### Live News Calendar
- The visual target is a Forex Factory-style economic-calendar dashboard: date/time, currency, impact, event, forecast, actual and previous, with upcoming releases prominent.
- PrimePipFx displays release times in **Asia/Karachi (PKT, UTC+05:00)**.
- The data layer must use a licensed/live provider or a user-supplied compatible endpoint. It must never manufacture Actual, Forecast or Previous values.
- The current server calendar adapter uses the existing `FMP_API_KEY` configuration or `ECONOMIC_NEWS_RADAR_URL` and keeps only a short in-memory/cache layer.
- Mobile reconnect behavior is driven by browser online/offline events and an immediate live sync when the calendar loads.
- The UI can continue to show cached values when offline, but they are explicitly treated as cached, not live.

Trading Economics documentation confirms that a production economic-calendar feed should expose release time, Actual, Previous, Forecast, source, importance and last-update metadata. The repository currently uses the existing FMP-compatible adapter so no provider credentials are hard-coded.

### Persistent application data
- **Supabase** is the recommended primary backend for persistent relational data, realtime community messaging, presence, friendships and file metadata when the deployment is on Vercel.
- **Google Drive** is retained for user-owned backups/exports and large personal files, not as the realtime relational database.
- A server-side Supabase secret key must never be shipped to the browser.
- Vercel/serverless filesystem storage is not treated as durable application storage.

### Trader Community Feed
The target data model includes:
- public Community Hub messages
- text, image, PDF/file and voice-note attachments
- message seen receipts
- registered-trader directory
- friend requests and accept/reject flow
- private conversations
- online/offline presence heartbeat
- WebRTC call/screen-share signaling
- authorization based on the authenticated PrimePipFx account

### SBT Models
- The uploaded 12-page SBT reference PDF is the authoritative visual/rules source.
- The source images already present in `/public/SBT/Model-*` are the exact reference artwork and should be the default standard view.
- The existing deterministic/vector view is retained as an optional 3D/interactive presentation, never as a replacement for the source reference.
- Rules remain locked to the source transcription in `src/data/sbtRules.ts`.

### Futuristic UX
The supplied 2090 research document proposes adaptive UI, multimodal interaction, explainable AI, realtime global data, collaboration and accessibility. It also explicitly describes a phased roadmap from a practical 2026–2030 foundation toward later AR/VR/BCI concepts. PrimePipFx should therefore ship reliable 2D/mobile/desktop foundations first and expose advanced visualization as progressive enhancement, not as a dependency for core trading workflows.

## Reliability principles
1. No fake live data.
2. No fake OAuth tokens.
3. Every live-data panel exposes source/configuration status.
4. Offline mode uses clearly labeled cache only.
5. User-private messages and files require authenticated access.
6. Realtime features degrade to safe polling when realtime transport is unavailable.
7. Risk controls are guardrails; the system does not promise profit or autonomous certainty.
8. Responsive layouts are tested at mobile, tablet and desktop breakpoints.
