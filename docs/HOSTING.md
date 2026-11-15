# Hosting PrimePipFX Command Center for free (Render)

Vercel paused the project on 14 Nov 2026 ("Fluid Active CPU" exceeded the Hobby fair-use limit;
pause ends 14 Dec 2026). The app also runs as one ordinary Node server (`npm start` →
`dist/server.cjs`), so it can live on any free long-running host. `render.yaml` in the repo root
sets it up on Render's free plan.

## 1. Create the service (≈5 minutes)

1. Go to render.com → Sign up with GitHub (free, no card).
2. Dashboard → **New → Blueprint** → choose the repo `whbzafar/prime-pip-command-center-level`.
3. Render reads `render.yaml`, shows one web service `primepipfx-command-center` (plan: Free) → **Apply**.
4. First build takes a few minutes. When it is live you get a URL like
   `https://primepipfx-command-center.onrender.com`.

## 2. Copy the environment variables

Service → **Environment** → **Add from .env** (paste), or add one by one. Copy the values from the
old Vercel project (Vercel → Project → Settings → Environment Variables). Only the ones you had
set on Vercel are needed; the server works without the optional ones.

Main ones:
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`), `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`, `PRIMEPIPFX_SESSION_SECRET`, `PRIMEPIPFX_BOOTSTRAP_ADMIN_USERNAME`,
`PRIMEPIPFX_BOOTSTRAP_ADMIN_PASSWORD`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`,
`GEMINI_API_KEY`, `PPFX_STRATEGY_KEY`.

Optional data keys (free tiers): `FRED_API_KEY`, `BLS_API_KEY`, `BEA_API_KEY`, `ALPHA_VANTAGE_API_KEY`,
`TWELVE_DATA_API_KEY`, `FMP_API_KEY`, `CFTC_APP_TOKEN`, `SOCRATA_APP_TOKEN`, `SEC_USER_AGENT`,
`MYFXBOOK_EMAIL`, `MYFXBOOK_PASSWORD`, `TURN_URLS`, `TURN_USERNAME`, `TURN_CREDENTIAL`.

`VITE_*` values are baked in at build time, so after adding them click **Manual Deploy → Clear build
cache & deploy** once.

## 3. Point the domain

Service → **Settings → Custom Domains** → add `primepipfx.site` and `www.primepipfx.site`.
Render then shows the exact DNS records to create — use the values it shows:

- `primepipfx.site` (apex) → **A** record to Render's IP (shown in the panel)
- `www` → **CNAME** to `primepipfx-command-center.onrender.com`

Create them where the domain's DNS is managed (currently the Vercel DNS page you had open — those
records can be edited there, or move the nameservers to your registrar). Remove/replace the old
Vercel A/CNAME records for the same names. HTTPS certificates are issued automatically by Render;
propagation takes from a few minutes to a few hours.

## 4. Free-plan behaviour to know

- Sleeps after 15 minutes without visitors; the next visitor waits ~30–60 s while it wakes.
- 750 hours/month, 512 MB RAM, shared CPU — enough for this app's current traffic.
- Background refreshers (fundamentals, news, sentiment) run on a schedule inside the server, so
  visitors no longer trigger heavy work per request (that per-request work is what burned Vercel's
  CPU allowance).

## Vercel afterwards

Keep the Vercel project if you want it as a fallback after 14 Dec, but leave the domain pointed at
Render. Deploys to `main` continue to build on Render automatically (`autoDeploy: true`).
