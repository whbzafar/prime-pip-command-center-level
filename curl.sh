B=https://prime-pip-command-center-level.vercel.app
t() { s=$(date +%s%N); r=$(curl -s -m 40 -o /tmp/o -w '%{http_code}' "$B$1"); e=$(( ($(date +%s%N)-s)/1000000 )); echo "LIVE $1 -> $r ${e}ms $(head -c 160 /tmp/o | tr '\n' ' ')"; }
t /api/__health
t "/api/history/candles?symbol=EURUSD&tf=h1&limit=50"
t "/api/history/archive?ticker=EURUSD"
t /api/macro/rankings
t /api/macro/sentiment
t /api/sentiment
t /api/community/messages
t /api/community/health
t /api/auth/students-count
t /version.json
t /
