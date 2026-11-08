#!/usr/bin/env python3
"""
Deep-history archive builder (runs in GitHub Actions — Dukascopy blocks Vercel's data-centre IPs,
but its public datafeed is reachable from GitHub runners).

For one instrument it downloads Dukascopy Bank's public datafeed files:
  minute candles  /datafeed/{SYM}/{YYYY}/{MM0}/{DD}/BID_candles_min_1.bi5   (offsets from day start)
  hour candles    /datafeed/{SYM}/{YYYY}/{MM0}/BID_candles_hour_1.bi5      (offsets from month start)
  day candles     /datafeed/{SYM}/{YYYY}/BID_candles_day_1.bi5             (offsets from year start)
(MM0 is the zero-based month.) Each file is LZMA-compressed; each record is 24 bytes, big-endian:
  uint32 seconds, uint32 open, uint32 close, uint32 low, uint32 high, float32 volume.
Prices are integers scaled by a power of ten; the scale is calibrated once per instrument against
an independent Yahoo Finance daily close (nearest power of ten, never guessed).

Output (into OUT dir, uploaded as release assets of tag hist-{TICKER}):
  m1_YYYY-MM.csv.gz   every minute candle of that month          (t,o,h,l,c,v ; t = unix seconds UTC)
  h1_YYYY.csv.gz      every hourly candle of that year
  d1.csv.gz           every daily candle since inception
  manifest.json       ranges, scale, last candle time, build time
Nothing is interpolated: missing source files simply produce no candles.
"""
import concurrent.futures as cf
import datetime as dt
import gzip
import io
import json
import lzma
import math
import os
import struct
import sys
import time
import urllib.request
import urllib.error

BASE = "https://datafeed.dukascopy.com/datafeed"
UA = {"User-Agent": "Mozilla/5.0"}
WORKERS = int(os.environ.get("WORKERS", "4"))
RATE = float(os.environ.get("RATE", "10"))          # requests per second for this job (be polite)
BUDGET = float(os.environ.get("BUDGET", "1500"))   # seconds of minute-history backfill per run
T0 = time.time()

import threading
_lock = threading.Lock()
_next = [0.0]


def _throttle():
    with _lock:
        now = time.time()
        wait = _next[0] - now
        _next[0] = max(now, _next[0]) + 1.0 / RATE
    if wait > 0:
        time.sleep(wait)


def http_get(url, tries=6, timeout=25):
    """Returns bytes (b'' for a missing file). Raises after repeated network failures."""
    last = None
    for i in range(tries):
        _throttle()
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return b""
            last = e
        except Exception as e:  # connection reset, timeout …
            last = e
        time.sleep(4 + 4 * i)  # 503 = throttled: back off hard, then retry
    raise RuntimeError(f"{url}: {last}")


def decode(raw, base_sec, scale):
    if not raw:
        return []
    data = lzma.decompress(raw, format=lzma.FORMAT_ALONE)
    out = []
    for i in range(0, len(data) - 23, 24):
        t, o, c, lo, hi, v = struct.unpack(">IIIIIf", data[i:i + 24])
        if o == 0 or hi == 0:
            continue
        out.append((base_sec + t, o / scale, hi / scale, lo / scale, c / scale, round(float(v), 6)))
    return out


def raw_first_open(raw):
    data = lzma.decompress(raw, format=lzma.FORMAT_ALONE)
    return [struct.unpack(">IIIIIf", data[i:i + 24]) for i in range(0, len(data) - 23, 24)]


def to_csv_gz(rows, digits):
    buf = io.StringIO()
    fmt = "{:d},{:.%df},{:.%df},{:.%df},{:.%df},{:g}\n" % (digits, digits, digits, digits)
    for r in rows:
        buf.write(fmt.format(*r))
    return gzip.compress(buf.getvalue().encode(), 9)


def epoch(d):
    return int(dt.datetime(d.year, d.month, d.day, tzinfo=dt.timezone.utc).timestamp())


def aggregate(rows, bucket):
    out = {}
    for t, o, h, l, c, v in rows:
        b = bucket(t)
        x = out.get(b)
        if x is None:
            out[b] = [b, o, h, l, c, v]
        else:
            x[2] = max(x[2], h); x[3] = min(x[3], l); x[4] = c; x[5] += v
    return [tuple(x) for _, x in sorted(out.items())]


def yahoo_daily(symbol):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.request.quote(symbol)}?range=1mo&interval=1d"
    j = json.loads(http_get(url))
    res = j["chart"]["result"][0]
    closes = [c for c in res["indicators"]["quote"][0]["close"] if c]
    return closes[-5:]


def calibrate(sym, alt):
    """Find the power-of-ten price scale by comparing a recent raw daily close with Yahoo."""
    today = dt.date.today()
    raw_close = None
    for back in range(1, 15):  # most recent completed weekday minute file
        d = today - dt.timedelta(days=back)
        raw = http_get(f"{BASE}/{sym}/{d.year}/{d.month - 1:02d}/{d.day:02d}/BID_candles_min_1.bi5")
        if raw:
            recs = raw_first_open(raw)
            if recs:
                raw_close = recs[-1][2]
                break
    if not raw_close:
        raise RuntimeError("no recent datafeed file to calibrate")
    closes = sorted(yahoo_daily(alt))
    ref = closes[len(closes) // 2]
    exp = round(math.log10(raw_close / ref))
    scale = 10 ** exp
    ratio = (raw_close / scale) / ref
    if not (0.6 < ratio < 1.6):
        raise RuntimeError(f"calibration mismatch raw={raw_close} ref={ref} scale={scale} ratio={ratio:.3f}")
    return scale, ratio


def month_iter(start, end):
    y, m = start.year, start.month
    while (y, m) <= (end.year, end.month):
        yield y, m
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)


def build_month_m1(sym, y, m, scale, until):
    first = dt.date(y, m, 1)
    days = []
    d = first
    while d.month == m and d <= until:
        if d.weekday() != 5:  # Saturday has no FX/CFD trading
            days.append(d)
        d += dt.timedelta(days=1)
    urls = [(d, f"{BASE}/{sym}/{d.year}/{d.month - 1:02d}/{d.day:02d}/BID_candles_min_1.bi5") for d in days]
    rows = []
    with cf.ThreadPoolExecutor(WORKERS) as ex:
        for d, raw in zip(days, ex.map(lambda u: http_get(u[1]), urls)):
            rows.extend(decode(raw, epoch(d), scale))
    rows.sort()
    return rows


def write(out, name, rows, digits):
    with open(os.path.join(out, name), "wb") as f:
        f.write(to_csv_gz(rows, digits))


def main():
    ticker, sym, alt, digits = sys.argv[1], sys.argv[2].upper(), sys.argv[3], int(sys.argv[4])
    start = dt.date.fromisoformat(sys.argv[5])        # documented first minute-candle day
    daily_start_year = int(sys.argv[6])
    out = sys.argv[7]
    # previously archived assets, "name:size,name:size,…"
    sizes = {}
    if len(sys.argv) > 8 and sys.argv[8]:
        for item in sys.argv[8].split(","):
            n, _, z = item.partition(":")
            sizes[n] = int(z or 0)
    existing = set(sizes)
    os.makedirs(out, exist_ok=True)

    scale, ratio = calibrate(sym, alt)
    print(f"{ticker}: scale 1e{int(math.log10(scale))} (check ratio {ratio:.4f})", flush=True)

    today = dt.datetime.now(dt.timezone.utc).date()
    until = today - dt.timedelta(days=1)  # the datafeed publishes a day once it has closed
    months = list(month_iter(start, until))
    last_ts = 0
    failed = []

    # 1) The running and previous month of minute candles (always refreshed).
    cur_month_rows = []
    for y, m in months[-2:]:
        try:
            rows = build_month_m1(sym, y, m, scale, until)
        except Exception as e:
            failed.append(f"m1_{y}-{m:02d}: {e}"); continue
        if (y, m) == (until.year, until.month):
            cur_month_rows = rows
        if rows:
            write(out, f"m1_{y}-{m:02d}.csv.gz", rows, digits)
            last_ts = max(last_ts, rows[-1][0])
            print(f"  m1_{y}-{m:02d}: {len(rows)}", flush=True)

    # 2) Hourly, one file per year: completed months from native hour files, the running month
    #    aggregated from its minute candles. Completed years already archived are skipped.
    this_year_hours = []
    for y in range(start.year, until.year + 1):
        name = f"h1_{y}.csv.gz"
        if name in existing and y < until.year - 1:
            continue
        rows, ok = [], True
        for m in range(1, 13):
            if (y, m) > (until.year, until.month):
                break
            if (y, m) == (until.year, until.month):
                rows.extend(aggregate(cur_month_rows, lambda t: t - t % 3600)); continue
            try:
                raw = http_get(f"{BASE}/{sym}/{y}/{m - 1:02d}/BID_candles_hour_1.bi5")
            except Exception as e:
                failed.append(f"{name} month {m}: {e}"); ok = False; break
            rows.extend(decode(raw, epoch(dt.date(y, m, 1)), scale))
        rows.sort()
        if y == until.year:
            this_year_hours = rows
        if ok and rows:
            write(out, name, rows, digits)
            last_ts = max(last_ts, rows[-1][0])
            print(f"  {name}: {len(rows)}", flush=True)

    # 3) Daily since inception: completed years from native day files, the running year from hours.
    daily = []
    try:
        for y in range(daily_start_year, until.year):
            raw = http_get(f"{BASE}/{sym}/{y}/BID_candles_day_1.bi5")
            daily.extend(decode(raw, epoch(dt.date(y, 1, 1)), scale))
        daily.extend(aggregate(this_year_hours, lambda t: t - t % 86400))
        daily.sort()
        if daily:
            write(out, "d1.csv.gz", daily, digits)
            print(f"  d1: {len(daily)} from {dt.datetime.fromtimestamp(daily[0][0], dt.timezone.utc).date()}", flush=True)
    except Exception as e:
        failed.append(f"d1: {e}"); daily = []

    # 4) Older minute months, newest first, until this run's time budget is used.
    pending = [ym for ym in reversed(months[:-2]) if f"m1_{ym[0]}-{ym[1]:02d}.csv.gz" not in existing]
    done_old = 0
    for y, m in pending:
        if time.time() - T0 > BUDGET:
            break
        name = f"m1_{y}-{m:02d}.csv.gz"
        try:
            rows = build_month_m1(sym, y, m, scale, until)
        except Exception as e:
            failed.append(f"{name}: {e}"); continue
        if rows:
            write(out, name, rows, digits)
            print(f"  {name}: {len(rows)}", flush=True)
        else:
            write(out, name, [], digits)  # verified empty month (before inception) — don't refetch
        done_old += 1

    for n in os.listdir(out):
        sizes[n] = os.path.getsize(os.path.join(out, n))
    have = set(sizes)
    m1_names = sorted(n for n in have if n.startswith("m1_") and sizes[n] > 40)  # skip verified-empty months
    remaining = len(pending) - done_old
    manifest = {
        "ticker": ticker, "dukascopy": sym, "scale": scale, "calibrationRatio": round(ratio, 5),
        "m1Months": [n[3:10] for n in m1_names], "m1Complete": remaining == 0,
        "h1Years": sorted(int(n[3:7]) for n in have if n.startswith("h1_")),
        "d1From": daily[0][0] if daily else None,
        "lastCandle": last_ts, "builtAt": int(time.time()),
        "source": "Dukascopy Bank SA public datafeed (BID)", "failed": failed[:50],
    }
    with open(os.path.join(out, "manifest.json"), "w") as f:
        json.dump(manifest, f)
    print(f"{ticker}: {len(m1_names)} minute months, {remaining} still to backfill, {len(failed)} failures", flush=True)
    for f_ in failed[:10]:
        print("  FAILED", f_)


if __name__ == "__main__":
    main()
