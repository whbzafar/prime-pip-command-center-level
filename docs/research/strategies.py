import numpy as np, pandas as pd
from engine import *

def base(df):
    o, h, l, c = (df[k].values.astype(float) for k in 'ohlc')
    return o, h, l, c, atr(h, l, c, 14)

def S_donchian(df, N=20, filt=True, trail=3.0, regime=False):
    o, h, l, c, a = base(df); e200 = ema(c, 200)
    up, dn = hh(h, N), ll(l, N)
    sig = np.zeros(len(c), dtype=np.int64)
    sig[(c > up) & ((c > e200) | (not filt))] = 1
    sig[(c < dn) & ((c < e200) | (not filt))] = -1
    if regime:
        ax = adx(h, l, c); sig[ax < 20] = 0
    z = np.zeros(len(c), dtype=np.bool_)
    return sig, 2.0 * a, 0.0, trail, a, z, z, 0, z

def S_pullback(df, tpR=2.0, lvl=40):
    o, h, l, c, a = base(df); e50, e200 = ema(c, 50), ema(c, 200); r = rsi(c, 14); pr = np.r_[50, r[:-1]]
    sig = np.zeros(len(c), dtype=np.int64)
    sig[(c > e200) & (e50 > e200) & (pr < lvl) & (r >= lvl)] = 1
    sig[(c < e200) & (e50 < e200) & (pr > 100 - lvl) & (r <= 100 - lvl)] = -1
    z = np.zeros(len(c), dtype=np.bool_)
    return sig, 1.5 * a, tpR, 0.0, a, z, z, 0, z

def S_rsi2(df, th=10):
    o, h, l, c, a = base(df); e200 = ema(c, 200); r = rsi(c, 2); s5 = sma(c, 5)
    sig = np.zeros(len(c), dtype=np.int64)
    sig[(c > e200) & (r < th)] = 1
    sig[(c < e200) & (r > 100 - th)] = -1
    return sig, 2.5 * a, 0.0, 0.0, a, (c > s5), (c < s5), 10, np.zeros(len(c), dtype=np.bool_)

def S_squeeze(df, tpR=2.0):
    o, h, l, c, a = base(df); m = sma(c, 20); sd = pd.Series(c).rolling(20).std().values
    w = 4 * sd / m; wp = pd.Series(w).rolling(120).rank(pct=True).values
    sq = np.r_[False, (wp < 0.2)[:-1]]
    sig = np.zeros(len(c), dtype=np.int64)
    sig[sq & (c > m + 2 * sd)] = 1; sig[sq & (c < m - 2 * sd)] = -1
    stopd = np.maximum(np.abs(c - m), a)
    z = np.zeros(len(c), dtype=np.bool_)
    return sig, stopd, tpR, 0.0, a, z, z, 0, z

def S_supertrend(df, k=3.0, adxmin=20):
    o, h, l, c, a = base(df); st, d = supertrend(h, l, c, 10, k); ax = adx(h, l, c); pd_ = np.r_[d[0], d[:-1]]
    sig = np.zeros(len(c), dtype=np.int64)
    sig[(d == 1) & (pd_ == -1) & (ax > adxmin)] = 1; sig[(d == -1) & (pd_ == 1) & (ax > adxmin)] = -1
    stopd = np.maximum(np.abs(c - st), a)
    return sig, stopd, 0.0, 0.0, a, (d == -1), (d == 1), 0, np.zeros(len(c), dtype=np.bool_)

def S_macd(df, tpR=2.0):
    o, h, l, c, a = base(df); e200 = ema(c, 200); m = ema(c, 12) - ema(c, 26); s = ema(m, 9); ax = adx(h, l, c)
    pm, ps = np.r_[m[0], m[:-1]], np.r_[s[0], s[:-1]]
    sig = np.zeros(len(c), dtype=np.int64)
    sig[(pm <= ps) & (m > s) & (m < 0) & (c > e200) & (ax > 20)] = 1
    sig[(pm >= ps) & (m < s) & (m > 0) & (c < e200) & (ax > 20)] = -1
    z = np.zeros(len(c), dtype=np.bool_)
    return sig, 2.0 * a, tpR, 0.0, a, z, z, 0, z

def S_asian_orb(df, tpR=1.5):
    """H1 only: Asian range 00–07 UTC, trade first breakout 07–12 UTC with EMA200 bias, flat at 20 UTC."""
    o, h, l, c, a = base(df); hr = df.index.hour.values; day = df.index.normalize().values; e200 = ema(c, 200)
    n = len(c); sig = np.zeros(n, dtype=np.int64); stopd = np.zeros(n); flat = (hr >= 20)
    rh = rl = np.nan; cur = None; traded = False
    for i in range(n):
        if day[i] != cur: cur = day[i]; rh, rl, traded = -np.inf, np.inf, False
        if hr[i] < 7: rh = max(rh, h[i]); rl = min(rl, l[i]); continue
        if traded or hr[i] >= 12 or not np.isfinite(rh): continue
        rng = rh - rl
        if rng <= 0 or rng > 3 * a[i]: continue
        if c[i] > rh and c[i] > e200[i]: sig[i] = 1; stopd[i] = c[i] - rl; traded = True
        elif c[i] < rl and c[i] < e200[i]: sig[i] = -1; stopd[i] = rh - c[i]; traded = True
    z = np.zeros(n, dtype=np.bool_)
    return sig, stopd, tpR, 0.0, a, z, z, 0, flat

GRID = {
  'Donchian breakout + EMA200': [dict(N=20), dict(N=55), dict(N=20, trail=4.0), dict(N=20, regime=True)],
  'Trend pullback (EMA50/200 + RSI)': [dict(tpR=2.0), dict(tpR=3.0), dict(tpR=2.0, lvl=35)],
  'RSI(2) mean reversion': [dict(th=10), dict(th=5)],
  'Bollinger squeeze breakout': [dict(tpR=2.0), dict(tpR=3.0)],
  'Supertrend + ADX': [dict(k=3.0), dict(k=2.0)],
  'MACD trend cross': [dict(tpR=2.0), dict(tpR=3.0)],
  'Asian-range breakout (London)': [dict(tpR=1.5), dict(tpR=2.0)],
}
FN = {'Donchian breakout + EMA200': S_donchian, 'Trend pullback (EMA50/200 + RSI)': S_pullback, 'RSI(2) mean reversion': S_rsi2,
      'Bollinger squeeze breakout': S_squeeze, 'Supertrend + ADX': S_supertrend, 'MACD trend cross': S_macd, 'Asian-range breakout (London)': S_asian_orb}
