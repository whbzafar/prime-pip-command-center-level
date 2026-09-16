# PrimePipFX Chat Intelligence Layer

## Overview

The **PrimePipFX Chat Intelligence Layer** is an automated assistant subsystem built directly into the Community Chat. It observes conversational inquiries from traders and enriches public chat discussions with rich, interactive, real-time institutional and operational cards (e.g. CFTC COT reports, macroeconomic calendar releases, market session clocks, and lot size calculators) while maintaining strict safety, privacy, and rate-limiting safeguards.

---

## 1. System Architecture

```
User Message in Community Chat
             │
             ▼
   [Privacy Redaction Engine]
    (strips emails, phone numbers,
     long account digits, and URLs)
             │
             ▼
    [Safety Distress Gate] ──────────► If extreme emotional distress detected:
             │                           - Bypasses cooldown
             ▼                           - Renders Crisis Intervention Card
  [Deterministic Lexicon Matcher]         (Helplines, calming protocol)
             │
   (Confidence >= 0.75?)
      ├── YES ──► Route to Capability
      └── NO  ──► [Gemini 2.5 Flash Classifier (Closed Enum)]
                       │
             (Confidence >= 0.75?)
                ├── YES ──► Route to Capability
                └── NO  ──► [Gap Ledger] (Records unclassified query)
                                │
                                ▼
                       No card attached (preserves chat flow)
```

---

## 2. Closed Capability Enum

To prevent open-ended hallucinations or irrelevant responses, the intelligence layer operates on a strictly closed capability enum:

| Capability ID | Description | Source Handler | Client Component |
| :--- | :--- | :--- | :--- |
| `COT_REPORT` | Institutional futures positioning (Hedge Funds vs Commercials) | `server/intelligence/handlers/cotHandler.ts` | `<CotCard />` |
| `ECONOMIC_CALENDAR` | Upcoming high-impact macroeconomic data releases (NFP, CPI, Rates) | `server/intelligence/handlers/calendarHandler.ts` | `<CalendarCard />` |
| `SESSION_CLOCK` | Global market sessions (London, NY, Tokyo, Sydney) and overlaps | `server/intelligence/handlers/sessionClockHandler.ts` | `<SessionClockCard />` |
| `LOT_SIZE` | Position risk sizing calculated from account balance and stop loss pips | `server/intelligence/handlers/lotSizeHandler.ts` | `<LotSizeCard />` |
| `CRISIS_RESOURCE` | Emotional support intervention and 24/7 emergency psychological helplines | `server/intelligence/handlers/crisisHandler.ts` | `<CrisisCard />` |

---

## 3. Privacy & Safety Mandates

1. **Privacy Redaction (`redactSensitiveData`)**:
   - Strips email addresses (`[REDACTED_EMAIL]`)
   - Strips international and domestic telephone numbers (`[REDACTED_PHONE]`)
   - Strips bank/broker account strings of 7+ continuous digits (`[REDACTED_NUMBER]`)
   - Strips links (`[REDACTED_LINK]`)
   - Redacted text is passed to both logging and any classification engines.

2. **Trader Wellbeing Interventions (`isDistressSignal`)**:
   - Detects extreme emotional statements (e.g., "lost everything", "want to die", "can't take this anymore").
   - **Hard Rule**: The system will never output trading calculations or risk lot sizing when a trader is in acute distress. Instead, it serves a dedicated `<CrisisCard />` with compassionate guidance and 24/7 helplines.
   - Crisis resources bypass normal cooldown limits to ensure immediate help.

3. **Execution Budget & Rate Limiting**:
   - **Timeout Budget**: Capability handlers are restricted to a **3000ms** execution ceiling via `Promise.race`. If a handler hangs or third-party upstream delays, the system silently yields to preserve message posting speed.
   - **Cooldown**: Regular cards are rate-limited to at most **1 card per user every 20 seconds** to prevent chat feed flooding.

---

## 4. Query Gap Ledger

When a user's question does not match any existing capability or has low classification confidence (< 0.75), it is automatically scrubbed of sensitive data and recorded into the **Gap Ledger** (`server/intelligence/gapLedger.ts`).

- Queries are clustered into thematic categories:
  - `CHART_SCREENSHOT_ANALYSIS`
  - `SPECIFIC_BROKER_INTEGRATION`
  - `CRYPTO_PAIRS`
  - `SIGNAL_BOT_ALERTS`
  - `FUNDED_ACCOUNT_RULES`
  - `GENERAL_MACRO_INQUIRY`
- Administrators can review trending clusters via `GET /api/admin/gaps` to direct future capability engineering.
