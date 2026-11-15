import numpy as np, pandas as pd, json
from engine import *
from strategies import S_donchian, S_rsi2
SPLIT = pd.Timestamp('2023-01-01', tz='UTC')
out = {}
def go(t, tf, fn, longonly=False, **p):
    df = resample(load_h1(t), tf); o,h,l,c = (df[k].values.astype(float) for k in 'ohlc')
    sig, stopd, tpR, trail, a, xl, xs, mb, ff = fn(df, **p)
    if longonly: sig[sig < 0] = 0
    r, ei, d = simulate(o,h,l,c,sig.astype(np.int64),np.nan_to_num(stopd),float(tpR),float(trail),np.nan_to_num(a),xl.astype(np.bool_),xs.astype(np.bool_),int(mb),ff.astype(np.bool_),SPREAD[t])
    w = df.index[np.minimum(ei, len(df)-1)]
    yrs = (df.index[-1]-df.index[0]).days/365.25
    S = lambda m: stats(r[m])
    out[t] = dict(tf=tf, from_=str(df.index[0].date()), to=str(df.index[-1].date()), all=S(np.ones(len(r),bool)), inSample=S(w<SPLIT), outOfSample=S(w>=SPLIT), longs=S(d==1), shorts=S(d==-1), perYear=round(len(r)/yrs,1),
                  years={int(y): round(float(v),1) for y,v in pd.Series(r,index=w.year).groupby(level=0).sum().items()})
for t in ['XAUUSD','XAGUSD']: go(t,'H4',S_donchian,N=55,trail=3.0)
for t in ['US30','US100','US500','GER40']: go(t,'D1',S_rsi2,longonly=True,th=10)
json.dump(out, open('final_stats.json','w'), indent=1, default=str)
for k,v in out.items(): print(k, v['tf'], v['from_'], 'ALL', v['all'], '\n   IS', v['inSample'], '\n   OOS', v['outOfSample'], '\n   L', v['longs'], 'S', v['shorts'], 'per yr', v['perYear'])
