#!/usr/bin/env python3
"""
Minute-history backfill from HistData.com (free 1-minute bars, one ZIP per instrument-year).

Dukascopy's datafeed only serves ~2 files/second to GitHub runners, so its minute archive grows by a
few months per run. HistData publishes whole years of M1 bars in a single download, so the older
minute history can be filled in one pass. Dukascopy months always take priority: this job only
writes months that are missing (or empty) in the archive, and never overwrites a Dukascopy month.

Format: "YYYYMMDD HHMMSS;open;high;low;close;volume", timestamps in EST *without* daylight saving
(UTC−5 all year) — converted to UTC here. Output matches the archive: m1_YYYY-MM.csv.gz
(t,o,h,l,c,v with t = unix seconds UTC) plus hist_m1.json listing the months it supplied.
"""
import datetime as dt
import gzip
import http.cookiejar
import io
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
import zipfile

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"
EST = dt.timezone(dt.timedelta(hours=-5))
ALIAS = {  # archive ticker → HistData instrument code
    'US500': 'SPXUSD', 'US100': 'NSXUSD', 'GER40': 'GRXEUR', 'UK100': 'UKXGBP', 'JP225': 'JPXJPY',
    'FRA40': 'FRXEUR', 'AUS200': 'AUXAUD', 'HK50': 'HKXHKD', 'DXY': 'UDXUSD', 'USOIL': 'WTIUSD', 'UKOIL': 'BCOUSD',
}
SUPPORTED = set('''EURUSD EURCHF EURGBP EURJPY EURAUD USDCAD USDCHF USDJPY USDMXN GBPCHF GBPJPY GBPUSD AUDJPY AUDUSD
CHFJPY NZDJPY NZDUSD XAUUSD EURCAD AUDCAD CADJPY EURNZD GRXEUR NZDCAD SGDJPY USDHKD USDNOK USDTRY XAUAUD AUDCHF AUXAUD
EURHUF EURPLN FRXEUR HKXHKD NZDCHF SPXUSD USDHUF USDPLN USDZAR XAUCHF ZARJPY BCOUSD ETXEUR EURCZK EURSEK GBPAUD GBPNZD
JPXJPY UDXUSD USDCZK USDSEK WTIUSD XAUEUR XAUGBP AUDNZD CADCHF EURDKK EURNOK EURTRY GBPCAD NSXUSD UKXGBP USDDKK USDSGD
XAGUSD XAUJPY'''.split())

opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))


def get(url, data=None, referer=None, tries=4):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers={'User-Agent': UA, **({'Referer': referer} if referer else {})})
            with opener.open(req, timeout=90) as r:
                return r.read()
        except Exception as e:
            last = e
            time.sleep(5 * (i + 1))
    raise RuntimeError(f"{url}: {last}")


def download(code, year, month=None):
    """One HistData ZIP (a whole year, or one month of the running year) → list of UTC rows."""
    path = f"{code.lower()}/{year}" + (f"/{month}" if month else "")
    page_url = f"https://www.histdata.com/download-free-forex-historical-data/?/ascii/1-minute-bar-quotes/{path}"
    page = get(page_url).decode('utf-8', 'ignore')
    tk = re.search(r'id="tk" value="([^"]+)"', page)
    if not tk:
        return None  # year not offered for this instrument
    form = {'tk': tk.group(1), 'date': str(year), 'datemonth': f"{year}{month:02d}" if month else str(year), 'platform': 'ASCII', 'timeframe': 'M1', 'fxpair': code}
    raw = get('https://www.histdata.com/get.php', urllib.parse.urlencode(form).encode(), referer=page_url)
    if len(raw) < 100 or raw[:2] != b'PK':
        return None
    rows = []
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        name = next((n for n in z.namelist() if n.lower().endswith('.csv')), None)
        if not name:
            return None
        for line in z.read(name).decode('utf-8', 'ignore').splitlines():
            p = line.strip().split(';')
            if len(p) < 5:
                continue
            try:
                t = dt.datetime.strptime(p[0], '%Y%m%d %H%M%S').replace(tzinfo=EST)
                o, h, l, c = float(p[1]), float(p[2]), float(p[3]), float(p[4])
                v = float(p[5]) if len(p) > 5 and p[5] else 0.0
            except ValueError:
                continue
            if o <= 0 or h < l:
                continue
            rows.append((int(t.timestamp()), o, h, l, c, v))
    rows.sort()
    return rows


def to_csv_gz(rows, digits):
    fmt = "{:d},{:.%df},{:.%df},{:.%df},{:.%df},{:g}\n" % (digits, digits, digits, digits)
    return gzip.compress(''.join(fmt.format(*r) for r in rows).encode(), 9)


def main():
    ticker, digits, start_year, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
    sizes = {}
    if len(sys.argv) > 5 and sys.argv[5]:
        for item in sys.argv[5].split(','):
            n, _, z = item.partition(':')
            sizes[n] = int(z or 0)
    code = ALIAS.get(ticker, ticker)
    os.makedirs(out, exist_ok=True)
    if code not in SUPPORTED:
        print(f"{ticker}: not offered by HistData — skipped")
        return
    repo = os.environ.get('GITHUB_REPOSITORY', 'whbzafar/prime-pip-command-center-level')
    supplied = []
    if 'hist_m1.json' in sizes:
        try:
            supplied = json.loads(get(f"https://github.com/{repo}/releases/download/hist-{ticker}/hist_m1.json")).get('months', [])
        except Exception:
            supplied = []
    have = {n[3:10] for n, z in sizes.items() if n.startswith('m1_') and z > 40}  # months already archived
    today = dt.date.today()
    for year in range(max(2000, start_year), today.year + 1):
        months_needed = [m for m in range(1, 13) if f"{year}-{m:02d}" not in have and (year, m) < (today.year, today.month)]
        if not months_needed:
            continue
        chunks = [None] if year < today.year else months_needed  # whole year in one ZIP, running year per month
        for m in chunks:
            try:
                rows = download(code, year, m)
            except Exception as e:
                print(f"  {year}{'-%02d' % m if m else ''}: download failed ({e})", flush=True)
                continue
            time.sleep(2)  # polite pacing
            if not rows:
                print(f"  {year}{'-%02d' % m if m else ''}: not available", flush=True)
                continue
            by_month = {}
            for r in rows:
                d = dt.datetime.fromtimestamp(r[0], dt.timezone.utc)
                by_month.setdefault(f"{d.year}-{d.month:02d}", []).append(r)
            wrote = 0
            for key, mr in sorted(by_month.items()):
                if key in have or key[:4] != str(year) or (m is not None and key != f"{year}-{m:02d}"):
                    continue  # already archived, or spill-over hours of a neighbouring file (EST→UTC shift)
                with open(os.path.join(out, f"m1_{key}.csv.gz"), 'wb') as f:
                    f.write(to_csv_gz(mr, digits))
                have.add(key); supplied.append(key); wrote += 1
            print(f"  {year}{'-%02d' % m if m else ''}: {len(rows)} bars → {wrote} new month files", flush=True)
    supplied = sorted(set(supplied))
    with open(os.path.join(out, 'hist_m1.json'), 'w') as f:
        json.dump({'source': 'HistData.com (M1, EST→UTC)', 'months': supplied, 'builtAt': int(time.time())}, f)
    print(f"{ticker}: HistData supplies {len(supplied)} minute months ({supplied[0] if supplied else '-'} → {supplied[-1] if supplied else '-'})")


if __name__ == '__main__':
    main()
