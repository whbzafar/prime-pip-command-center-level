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


def http_get(url, tries=4, timeout=20):
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
        if v == 0 and o == c == lo == hi:  # flat filler bar (market closed) — not a real candle
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


def over_budget():
    return time.time() - T0 > BUDGET


def write(out, name, rows, digits):
    with open(os.path.join(out, name), "wb") as f:
        f.write(to_csv_gz(rows, digits))


def read_asset(release_base, name):
    """Rows of an asset archived by an earlier run (empty if absent)."""
    raw = http_get_plain(f"{release_base}/{name}")
    if not raw:
        return []
    rows = []
    for line in gzip.decompress(raw).decode().splitlines():
        p = line.split(",")
        if len(p) >= 6:
            rows.append((int(p[0]), float(p[1]), float(p[2]), float(p[3]), float(p[4]), float(p[5])))
    return rows


def http_get_plain(url):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return b""
        raise


def fetch_units(units, fetch):
    """Fetch many datafeed files in parallel. Returns ({unit: rows}, [failed units])."""
    got, failed = {}, []
    def one(u):
        try:
            return u, fetch(u), None
        except Exception as e:
            return u, None, e
    with cf.ThreadPoolExecutor(WORKERS) as ex:
        for u, rows, err in ex.map(one, units):
            if err is None:
                got[u] = rows
            else:
                failed.append(u)
    return got, failed


def merge(old_rows, new_rows, drop):
    """Existing rows minus those `drop(t)` says are being replaced, plus new rows; sorted, unique."""
    keep = {r[0]: r for r in old_rows if not drop(r[0])}
    for r in new_rows:
        keep[r[0]] = r
    return [keep[k] for k in sorted(keep)]


def main():
    ticker, sym, alt, digits = sys.argv[1], sys.argv[2].upper(), sys.argv[3], int(sys.argv[4])
    start = dt.date.fromisoformat(sys.argv[5])        # documented first minute-candle day
    daily_start_year = int(sys.argv[6])
    out = sys.argv[7]
    sizes = {}                                        # assets archived by earlier runs, "name:size,…"
    if len(sys.argv) > 8 and sys.argv[8]:
        for item in sys.argv[8].split(","):
            n, _, z = item.partition(":")
            sizes[n] = int(z or 0)
    repo = os.environ.get("GITHUB_REPOSITORY", "whbzafar/prime-pip-command-center-level")
    rel = f"https://github.com/{repo}/releases/download/hist-{ticker}"
    os.makedirs(out, exist_ok=True)

    prev = {}
    if "manifest.json" in sizes:
        try:
            prev = json.loads(http_get_plain(f"{rel}/manifest.json") or b"{}")
        except Exception:
            prev = {}
    # Coverage bookkeeping carried between runs. A file archived without bookkeeping is complete.
    m1_missing = {k: set(v) for k, v in (prev.get("m1Missing") or {}).items()}   # "YYYY-MM" -> missing days
    m1_until = dict(prev.get("m1Until") or {})                                   # "YYYY-MM" -> last day considered
    h1_missing = {k: set(v) for k, v in (prev.get("h1Missing") or {}).items()}   # "YYYY" -> missing months
    h1_until = dict(prev.get("h1Until") or {})                                   # "YYYY" -> last month considered
    d1_missing = set(prev.get("d1Missing") or [])

    scale, ratio = calibrate(sym, alt)
    print(f"{ticker}: scale 1e{int(math.log10(scale))} (check ratio {ratio:.4f})", flush=True)

    today = dt.datetime.now(dt.timezone.utc).date()
    until = today - dt.timedelta(days=1)  # the datafeed publishes a day once it has closed
    months = list(month_iter(start, until))
    cur_key = f"{until.year}-{until.month:02d}"

    def m1_file(y, m):
        key = f"{y}-{m:02d}"
        name = f"m1_{key}.csv.gz"
        expected = []
        d = dt.date(y, m, 1)
        while d.month == m and d <= until:
            if d.weekday() != 5:
                expected.append(d.day)
            d += dt.timedelta(days=1)
        if name in sizes and key not in m1_missing and key not in m1_until:
            considered = expected[-1] if expected else 0      # legacy complete file
            lc = prev.get("lastCandle") or 0
            if (y, m) >= months[-2] and lc:                   # legacy running month: resume after its last candle
                last_day = dt.datetime.fromtimestamp(lc, dt.timezone.utc).date()
                considered = last_day.day - 1 if (last_day.year, last_day.month) == (y, m) else 0
        else:
            considered = int(m1_until.get(key, 0)) if name in sizes else 0
        need = sorted(set(m1_missing.get(key, set())) | {x for x in expected if x > considered})
        if not need:
            return None
        got, failed = fetch_units(need, lambda day: decode(http_get(f"{BASE}/{sym}/{y}/{m - 1:02d}/{day:02d}/BID_candles_min_1.bi5"), epoch(dt.date(y, m, day)), scale))
        fresh = [r for day in sorted(got) for r in got[day]]
        old = read_asset(rel, name) if name in sizes and sizes[name] > 40 else []
        rows = merge(old, fresh, lambda t: False)
        write(out, name, rows, digits)
        sizes[name] = os.path.getsize(os.path.join(out, name))
        m1_until[key] = expected[-1] if expected else 0
        if failed:
            m1_missing[key] = set(failed)
        else:
            m1_missing.pop(key, None)
        print(f"  {name}: {len(rows)} candles (+{len(fresh)}, {len(failed)} days pending)", flush=True)
        return rows

    # 1) Newest minute candles first: current and previous month.
    cur_rows = None
    for y, m in months[-2:]:
        r = m1_file(y, m)
        if (y, m) == (until.year, until.month):
            cur_rows = r
    if cur_rows is None:
        cur_rows = read_asset(rel, f"m1_{cur_key}.csv.gz")

    # 2) Hourly per year: native monthly hour files for closed months, running month from minutes.
    cur_year_hours = []
    for y in range(until.year, start.year - 1, -1):
        if over_budget() and y != until.year:
            break
        key, name = str(y), f"h1_{y}.csv.gz"
        last_closed = 12 if y < until.year else until.month - 1
        if name in sizes and key not in h1_missing and key not in h1_until:
            considered = last_closed if y < until.year else 0   # legacy complete year (current year re-checked)
        else:
            considered = int(h1_until.get(key, 0)) if name in sizes else 0
        need = sorted(set(h1_missing.get(key, set())) | set(range(considered + 1, last_closed + 1)))
        if y == until.year or need:
            got, failed = fetch_units(need, lambda mo: decode(http_get(f"{BASE}/{sym}/{y}/{mo - 1:02d}/BID_candles_hour_1.bi5"), epoch(dt.date(y, mo, 1)), scale))
            fresh = [r for mo in sorted(got) for r in got[mo]]
            old = read_asset(rel, name) if name in sizes and sizes[name] > 40 else []
            if y == until.year:
                m0 = epoch(dt.date(until.year, until.month, 1))
                fresh += aggregate(cur_rows or [], lambda t: t - t % 3600)
                rows = merge(old, fresh, lambda t: t >= m0)
            else:
                rows = merge(old, fresh, lambda t: False)
            if rows:
                write(out, name, rows, digits)
                sizes[name] = os.path.getsize(os.path.join(out, name))
            h1_until[key] = last_closed
            if failed:
                h1_missing[key] = set(failed)
            else:
                h1_missing.pop(key, None)
            print(f"  {name}: {len(rows)} candles ({len(failed)} months pending)", flush=True)
            if y == until.year:
                cur_year_hours = rows

    # 3) Daily per year since inception: native yearly day files, running year from the hours.
    y0 = epoch(dt.date(until.year, 1, 1))
    write(out, f"d1_{until.year}.csv.gz", aggregate([r for r in cur_year_hours if r[0] >= y0], lambda t: t - t % 86400), digits)
    sizes[f"d1_{until.year}.csv.gz"] = 1
    todo = [y for y in range(until.year - 1, daily_start_year - 1, -1) if f"d1_{y}.csv.gz" not in sizes or y in d1_missing]
    if todo and not over_budget():
        got, failed = fetch_units(todo, lambda y: decode(http_get(f"{BASE}/{sym}/{y}/BID_candles_day_1.bi5"), epoch(dt.date(y, 1, 1)), scale))
        for y, rows in got.items():
            write(out, f"d1_{y}.csv.gz", rows, digits)
            sizes[f"d1_{y}.csv.gz"] = os.path.getsize(os.path.join(out, f"d1_{y}.csv.gz"))
        d1_missing = (d1_missing - set(got)) | set(failed)
        print(f"  d1: {len(got)} years fetched, {len(failed)} pending", flush=True)

    # 4) Older minute months, newest first, until this run's time budget is used.
    for y, m in reversed(months[:-2]):
        if over_budget():
            break
        m1_file(y, m)

    m1_all = sorted(n[3:10] for n in sizes if n.startswith("m1_"))
    m1_with_data = [k for k in m1_all if sizes.get(f"m1_{k}.csv.gz", 0) > 40]
    m1_left = [k for k in (f"{y}-{m:02d}" for y, m in months) if k not in m1_all or k in m1_missing]
    d1_years = sorted(int(n[3:7]) for n in sizes if n.startswith("d1_") and n[3:7].isdigit())
    manifest = {
        "ticker": ticker, "dukascopy": sym, "scale": scale, "calibrationRatio": round(ratio, 5),
        "m1Months": m1_with_data, "m1Complete": not m1_left, "m1Pending": len(m1_left),
        "h1Years": sorted(int(n[3:7]) for n in sizes if n.startswith("h1_")),
        "d1Years": d1_years,
        "lastCandle": (cur_rows[-1][0] if cur_rows else 0),
        "builtAt": int(time.time()), "source": "Dukascopy Bank SA public datafeed (BID)",
        "m1Missing": {k: sorted(v) for k, v in m1_missing.items()}, "m1Until": m1_until,
        "h1Missing": {k: sorted(v) for k, v in h1_missing.items()}, "h1Until": h1_until,
        "d1Missing": sorted(d1_missing),
    }
    with open(os.path.join(out, "manifest.json"), "w") as f:
        json.dump(manifest, f)
    print(f"{ticker}: {len(m1_with_data)} minute months with data, {len(m1_left)} months still pending, "
          f"{len(manifest['h1Years'])} hourly years, {len(d1_years)} daily years", flush=True)


if __name__ == "__main__":
    main()
