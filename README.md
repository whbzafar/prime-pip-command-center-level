# PRIMEPIPFX Trading Command Center

## CFTC Commitments of Traders (COT) Configuration

The COT Report feature integrates official institutional positioning data directly from the CFTC Public Reporting Environment (Socrata SODA API).

### Data Source
- **API Endpoint:** `https://publicreporting.cftc.gov/resource/6dca-aqww.json`
- **Primary Dataset:** "Legacy – Futures Only" (`6dca-aqww`)
- **Authentication:** Free, public access. No API key required.
- **Optional App Token:** Add `CFTC_APP_TOKEN=<your_token>` or `SOCRATA_APP_TOKEN=<your_token>` to `.env` to increase Socrata API rate limits.

### Adding New Markets
All markets are configured in `src/config/cotConfig.ts`:
1. Find the official CFTC Contract Market Code from the CFTC website or by querying the dataset.
2. Add an entry to the `COT_MARKETS` array:
```ts
{
  code: '020601',
  name: '30-Year U.S. Treasury Bond',
  category: 'Bonds/Rates',
  exchange: 'CBOT',
  symbolHint: 'ZB / 30Y',
}
```
3. At startup, the app automatically verifies each code against live CFTC records. Any code returning empty rows is gracefully hidden and logged.

### Column Mapping
All column names are mapped in `src/config/cotConfig.ts` under `COT_COLUMN_MAPPINGS`. If the CFTC ever alters dataset column names, updating this single file updates the entire application.

### Running Unit Tests
Execute the verification suite covering net calculation, weekly change cross-checks, Larry Williams COT Index, and Friday 15:30 ET / DST release logic:
```bash
npm test
# or specifically:
npx tsx src/cotEngine.test.ts
```

---

## Market Sentiment: Retail Positioning Engine

The Sentiment module provides retail trader crowd positioning across Crypto, Forex, Indices, and Commodities, displaying long vs. short account ratios, 1-hour delta shifts, crowded (≥70%) and extreme (≥80%) crowd indicators, and historical snapshot charts.

### Architecture & Providers (Zero-Budget, Public & Free Tier)

1. **Crypto Sentiment (Live, 100% Free & No API Key Required)**:
   - **Primary**: Binance Futures Account Long/Short Ratio (`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol={SYMBOL}&period=5m&limit=1`).
   - **Covered Pairs**: `BTCUSDT`, `ETHUSDT`, `SOLUSDT`, `XRPUSDT`, `BNBUSDT`, `DOGEUSDT`, `ADAUSDT`, `LINKUSDT`.
   - **Automatic Fallback**: If Binance returns HTTP 451/403 (geo-restriction) or fails, the engine seamlessly fails over to Bybit (`https://api.bybit.com/v5/market/account-ratio?category=linear&symbol={SYMBOL}&period=5min&limit=1`).
   - **Polling Interval**: Refreshed in the background every 60 seconds.

2. **Forex, Indices, Commodities Sentiment (Free Myfxbook Community Outlook API)**:
   - **Endpoint**: Myfxbook API (`https://www.myfxbook.com/api/login.json` and `https://www.myfxbook.com/api/get-community-outlook.json`).
   - **Authentication**: Requires a free Myfxbook account. Credentials read exclusively from environment variables:
     - `MYFXBOOK_EMAIL=<your_email>`
     - `MYFXBOOK_PASSWORD=<your_password>`
   - **Rate Limiting & Safety Quota**: Myfxbook allows approximately 100 requests per 24 hours. The engine strictly respects this:
     - Reuses session tokens across calls; only authenticates once or on invalid session.
     - Fetches at most once every 20 minutes (`1,200,000 ms`).
     - Daily safety counter limits requests to a maximum of 90/day. If reached, the engine serves cached data marked as stale.
     - Never logs or exposes credentials.
     - If credentials are not set or login fails, the Forex section clearly displays "Forex sentiment source not connected" with no fabricated numbers.

3. **Reliability & Cache Architecture**:
   - 8-second request timeouts with exponential backoff retry (3 attempts).
   - Circuit breaker per provider preventing cascaded failures.
   - Response validation: rejects `NaN`, `null`, and sums outside 100% (tolerance 1.0%).
   - Server-authoritative JSON storage in `data/retail_sentiment_store.json` using atomic safe read/write.
   - Automatically maintains up to 30 days of timestamped historical snapshots for 24h, 7d, and 30d trend analysis.
   - REST endpoints:
     - `GET /api/sentiment` (All instruments, provider status, lastUpdated timestamp)
     - `GET /api/sentiment/:symbol/history?timeframe=24h|7d|30d` (Snapshots for symbol)

---

## Free-Tier Deployment Guide

The application is lightweight, zero-budget, and deployable on popular free-tier platforms:

### Option 1: Render.com (Free Web Service)
1. Fork or push this repository to GitHub.
2. In Render Dashboard, click **New +** -> **Web Service**.
3. Connect your repository.
4. Set the build and start commands:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. In **Environment Variables**, add:
   - `MYFXBOOK_EMAIL`: Your Myfxbook account email (optional for Forex sentiment)
   - `MYFXBOOK_PASSWORD`: Your Myfxbook account password (optional for Forex sentiment)
   - `PORT`: `3000` (or allow Render default)
6. Click **Deploy Web Service**.

### Option 2: Railway.app (Free / Trial Tier)
1. In Railway, click **New Project** -> **Deploy from GitHub repo**.
2. Select this repository.
3. Add environment variables:
   - `MYFXBOOK_EMAIL`
   - `MYFXBOOK_PASSWORD`
4. Railway detects `package.json` automatically and starts via `npm start`.

### Option 3: Netlify / Vercel (Serverless Free Tier)
- The repo includes `netlify/functions/api.ts` and `vercel.json` preconfigured with `serverless-http`.
- Set `MYFXBOOK_EMAIL` and `MYFXBOOK_PASSWORD` in your project's Environment Settings dashboard.
- The build script `npm run build` compiles Vite assets and bundles the Express API.

### Option 4: Local or VPS (Node 22 / Docker)
```bash
# Clone and configure environment
cp .env.example .env
# Edit .env with your credentials if desired:
# MYFXBOOK_EMAIL=trader@example.com
# MYFXBOOK_PASSWORD=SecurePassword123

# Install dependencies and start server
npm install
npm run dev
# Command center active at http://localhost:3000
```

### Running Sentiment & Financial Tests
```bash
npm test
# Runs risk engine, COT engine, and sentiment parser/validation unit tests
```

