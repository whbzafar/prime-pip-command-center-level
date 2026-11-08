import time, urllib.request, urllib.error, datetime as dt, collections, sys, concurrent.futures as cf
def get(u):
    t=time.time()
    try:
        with urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":"Mozilla/5.0"}),timeout=20) as r: r.read(); c=r.status
    except urllib.error.HTTPError as e: c=e.code
    except Exception as e: c=type(e).__name__
    return c, time.time()-t
days=[dt.date(2024,1,1)+dt.timedelta(days=i) for i in range(400)]
urls=[f"https://datafeed.dukascopy.com/datafeed/{sys.argv[1]}/{d.year}/{d.month-1:02d}/{d.day:02d}/BID_candles_min_1.bi5" for d in days]
i=0
for workers,n in [(1,40),(2,60),(4,80),(8,100)]:
    t=time.time()
    with cf.ThreadPoolExecutor(workers) as ex: res=list(ex.map(get, urls[i:i+n]))
    i+=n; el=time.time()-t
    print(f"workers={workers} n={n} {n/el:.1f} req/s", collections.Counter(r[0] for r in res), f"avg {sum(r[1] for r in res)/n:.2f}s", flush=True)
    time.sleep(5)
