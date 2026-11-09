B=https://prime-pip-command-center-level.vercel.app
n=$(curl -s -m 40 $B/api/news/breaking); echo "LIVE news: $(echo "$n" | head -c 100) count=$(echo "$n" | grep -o '"count":[0-9]*') sources=$(echo "$n" | grep -o '"sources":{[^}]*}')"
echo "LIVE news HIGH sample: $(echo "$n" | grep -o '"title":"[^"]*","summary":"[^"]\{0,60\}[^"]*","link":"[^"]*","source":"[^"]*","kind":"[^"]*","publishedAt":[0-9]*,"impact":"HIGH"' | head -3 | sed 's/"summary":"[^"]*",//; s/"link":"[^"]*",//' | cut -c1-200)"
r=$(curl -s $B/api/macro/rankings); echo "LIVE rankings generatedAt: $(echo "$r" | grep -o '"generatedAt":"[^"]*"')"
s=$(curl -s $B/api/macro/sentiment); echo "LIVE sentiment updatedAt: $(echo "$s" | grep -o '"updatedAt":"[^"]*"' | head -1)"
c=$(curl -s "$B/api/cot/latest" ); echo "LIVE cot: $(echo "$c" | head -c 200)"
c2=$(curl -s "$B/api/macro/pair/EURUSD"); echo "LIVE pair EURUSD cot dates: $(echo "$c2" | grep -o '"reportDate":"[^"]*"' | head -2 | tr '\n' ' ') asOf: $(echo "$c2" | grep -o '"asOf":"[^"]*"' | head -3 | tr '\n' ' ')"
echo "LIVE calendar next: $(curl -s "$B/api/calendar/upcoming?limit=2" | head -c 240)"
# 1794193142
