B=https://prime-pip-command-center-level.vercel.app
echo "LIVE health: $(curl -s $B/api/__health | head -c 200)"
echo "LIVE community: $(curl -s $B/api/community/health | head -c 700)"
echo "LIVE pine noauth: $(curl -s -o /dev/null -w '%{http_code}' $B/api/pine/scripts)"
