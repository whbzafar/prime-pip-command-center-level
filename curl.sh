B=https://prime-pip-command-center-level.vercel.app
t() { s=$(date +%s%N); r=$(curl -s -m 30 -o /tmp/o -w '%{http_code}' -H "Cookie: primepipfx_session=$2" -H "Authorization: Bearer $2" "$B$1"); e=$(( ($(date +%s%N)-s)/1000000 )); echo "LIVE [$3] $1 -> $r ${e}ms $(head -c 120 /tmp/o | tr '\n' ' ')"; }
for tok in "" "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.sig"; do
 n=${#tok}
 t /api/macro/rankings "$tok" "tok$n"
 t "/api/history/archive?ticker=XAUUSD" "$tok" "tok$n"
 t /api/macro/sentiment "$tok" "tok$n"
 t /api/community/hub "$tok" "tok$n"
done
# rerun 1794160979
