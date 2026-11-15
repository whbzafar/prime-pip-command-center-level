import sys, json, numpy as np, pandas as pd
from engine import *
from strategies import *
SPLIT = pd.Timestamp('2023-01-01', tz='UTC')
rows = []
for t in SPREAD:
    h1 = load_h1(t)
    for tf in ['H1', 'H4', 'D1']:
        df = resample(h1, tf)
        idx = df.index
        for name, params in GRID.items():
            if name.startswith('Asian') and tf != 'H1': continue
            for p in params:
                sig, stopd, tpR, trail, a, xl, xs, mb, ff = FN[name](df, **p)
                o, h, l, c = (df[k].values.astype(float) for k in 'ohlc')
                r, ei, d = simulate(o, h, l, c, sig.astype(np.int64), np.nan_to_num(stopd), float(tpR), float(trail), np.nan_to_num(a), xl.astype(np.bool_), xs.astype(np.bool_), int(mb), ff.astype(np.bool_), SPREAD[t])
                when = idx[np.minimum(ei, len(idx) - 1)]
                ins, oos = r[when < SPLIT], r[when >= SPLIT]
                rows.append(dict(sym=t, tf=tf, strat=name, params=json.dumps(p), **{f'is_{k}': v for k, v in stats(ins).items()}, **{f'oos_{k}': v for k, v in stats(oos).items()}))
    print(t, file=sys.stderr, flush=True)
pd.DataFrame(rows).to_csv('/tmp/research/results.csv', index=False)
