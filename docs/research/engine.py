import gzip, numpy as np, pandas as pd, os
from numba import njit

D = '/tmp/research/data'
SPREAD = dict(XAUUSD=0.30, XAGUSD=0.03, EURUSD=0.00010, GBPUSD=0.00014, USDJPY=0.014, AUDUSD=0.00012, USDCAD=0.00016, USDCHF=0.00016,
              NZDUSD=0.00016, GBPJPY=0.03, EURJPY=0.02, US30=3.0, US100=1.5, US500=0.6, GER40=1.5, USOIL=0.04)

def load_h1(t):
    rows = []
    for f in sorted(os.listdir(f'{D}/{t}')):
        if f.startswith('h1_'):
            rows.append(pd.read_csv(f'{D}/{t}/{f}', header=None, names=['t','o','h','l','c','v']))
    df = pd.concat(rows).drop_duplicates('t').sort_values('t')
    df.index = pd.to_datetime(df.t, unit='s', utc=True)
    df = df[(df.h >= df.l) & (df.c > 0)]
    return df[['o','h','l','c']]

def resample(df, tf):
    if tf == 'H1': return df
    rule = {'H4': '4h', 'D1': '1D'}[tf]
    r = df.resample(rule, label='left', closed='left').agg({'o':'first','h':'max','l':'min','c':'last'}).dropna()
    return r

# ---------------- indicators
def ema(x, n): return pd.Series(x).ewm(span=n, adjust=False).mean().values
def sma(x, n): return pd.Series(x).rolling(n).mean().values
def atr(h, l, c, n=14):
    pc = np.r_[c[0], c[:-1]]
    tr = np.maximum(h - l, np.maximum(abs(h - pc), abs(l - pc)))
    return pd.Series(tr).ewm(alpha=1/n, adjust=False).mean().values
def rsi(c, n):
    d = np.diff(c, prepend=c[0]); up = np.where(d > 0, d, 0); dn = np.where(d < 0, -d, 0)
    au = pd.Series(up).ewm(alpha=1/n, adjust=False).mean().values; ad = pd.Series(dn).ewm(alpha=1/n, adjust=False).mean().values
    return 100 - 100 / (1 + au / np.where(ad == 0, 1e-12, ad))
def adx(h, l, c, n=14):
    up = np.diff(h, prepend=h[0]); dn = -np.diff(l, prepend=l[0])
    pdm = np.where((up > dn) & (up > 0), up, 0.0); ndm = np.where((dn > up) & (dn > 0), dn, 0.0)
    a = atr(h, l, c, n)
    pdi = 100 * pd.Series(pdm).ewm(alpha=1/n, adjust=False).mean().values / a
    ndi = 100 * pd.Series(ndm).ewm(alpha=1/n, adjust=False).mean().values / a
    dx = 100 * abs(pdi - ndi) / np.maximum(pdi + ndi, 1e-12)
    return pd.Series(dx).ewm(alpha=1/n, adjust=False).mean().values
def hh(x, n): return pd.Series(x).rolling(n).max().shift(1).values   # prior n bars
def ll(x, n): return pd.Series(x).rolling(n).min().shift(1).values
def supertrend(h, l, c, n=10, k=3.0):
    a = atr(h, l, c, n); mid = (h + l) / 2; ub = mid + k * a; lb = mid - k * a
    st = np.zeros(len(c)); dirn = np.ones(len(c))
    fu, fl = ub.copy(), lb.copy()
    for i in range(1, len(c)):
        fu[i] = ub[i] if (ub[i] < fu[i-1] or c[i-1] > fu[i-1]) else fu[i-1]
        fl[i] = lb[i] if (lb[i] > fl[i-1] or c[i-1] < fl[i-1]) else fl[i-1]
        if dirn[i-1] == 1: dirn[i] = -1 if c[i] < fl[i] else 1
        else: dirn[i] = 1 if c[i] > fu[i] else -1
        st[i] = fl[i] if dirn[i] == 1 else fu[i]
    return st, dirn

# ---------------- simulator (signal on bar close i → fill at open i+1)
@njit(cache=True)
def simulate(o, h, l, c, sig, stopd, tpR, trailk, a, exitL, exitS, maxbars, forceflat, spread):
    n = len(c)
    res_r = np.zeros(n); res_i = np.zeros(n, dtype=np.int64); res_d = np.zeros(n, dtype=np.int64); k = 0
    pos = 0; entry = 0.0; stop = 0.0; tp = 0.0; risk = 0.0; bars = 0; ei = 0
    for i in range(1, n):
        # manage open position on bar i
        if pos != 0:
            bars += 1
            exit_px = -1.0
            if pos == 1:
                if l[i] <= stop: exit_px = min(o[i], stop) - spread * 0.1
                elif tp > 0 and h[i] >= tp: exit_px = max(o[i], tp)
            else:
                if h[i] + spread >= stop: exit_px = max(o[i] + spread, stop) + spread * 0.1
                elif tp > 0 and l[i] + spread <= tp: exit_px = min(o[i] + spread, tp)
            if exit_px < 0:
                closeexit = (pos == 1 and exitL[i]) or (pos == -1 and exitS[i]) or (maxbars > 0 and bars >= maxbars) or forceflat[i] or (sig[i] == -pos)
                if closeexit:
                    exit_px = c[i] if pos == 1 else c[i] + spread
            if exit_px >= 0:
                res_r[k] = (exit_px - entry) / risk if pos == 1 else (entry - exit_px) / risk
                res_i[k] = ei; res_d[k] = pos; k += 1; pos = 0
            elif trailk > 0:
                if pos == 1: stop = max(stop, h[i] - trailk * a[i])
                else: stop = min(stop, l[i] + spread + trailk * a[i])
        # new entry from signal at close of i, filled at open of i+1
        if pos == 0 and sig[i] != 0 and i + 1 < n and stopd[i] > 0 and not forceflat[i]:
            d = sig[i]; ei = i + 1
            entry = o[i+1] + (spread if d == 1 else 0.0)
            risk = stopd[i]
            stop = entry - risk if d == 1 else entry + risk
            tp = (entry + tpR * risk if d == 1 else entry - tpR * risk) if tpR > 0 else 0.0
            pos = d; bars = 0
            # same-bar (i+1) stop handled next iteration
    return res_r[:k], res_i[:k], res_d[:k]

def stats(r):
    if len(r) == 0: return dict(n=0, win=0, expR=0, pf=0, dd=0)
    eq = np.cumsum(r); dd = np.max(np.maximum.accumulate(eq) - eq) if len(eq) else 0
    g = r[r > 0].sum(); ls = -r[r < 0].sum()
    return dict(n=len(r), win=round(100 * (r > 0).mean(), 1), expR=round(r.mean(), 3), pf=round(g / ls, 2) if ls > 0 else 99, dd=round(dd, 1), totR=round(r.sum(), 1))
