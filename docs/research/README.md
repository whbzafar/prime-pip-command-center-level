# Prime Pip Quant Edge — strategy research

Reproducible walk-forward study behind the Quant Edge setup (`server/strategy/quantEdge.ts`).

* Data: Dukascopy H1 candles 2016 → 2026 from this repo's `hist-<TICKER>` release archive, aggregated to H4/D1 (UTC).
* 16 markets × 3 timeframes × 7 strategy families (17 parameter sets) = 752 backtests (`walkforward_results.csv`).
* Costs: realistic spread on every fill + 10% of spread slippage on stops; signals on bar close, fills at next open; stop assumed first when a bar touches both.
* Selection on 2016–2022 only; 2023 → today is the untouched out-of-sample test.
* Result: intraday versions and all FX-major/oil variants failed out-of-sample. Kept: H4 55-bar Donchian breakout + 200 EMA + 3×ATR trailing (gold, silver) and D1 RSI(2)<10 long-only pullbacks above the 200 EMA (US30, US100, US500, GER40).
* The TypeScript engine reproduces the Python numbers exactly (e.g. XAUUSD: 303 trades, 40.9% wins, +0.309R, PF 1.74).

Run: `python3 run.py` (all candidates) and `python3 final.py` (chosen setup) with the data downloaded into `/tmp/research/data/<TICKER>/h1_<YEAR>.csv.gz`.
