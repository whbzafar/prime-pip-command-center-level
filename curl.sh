B=https://prime-pip-command-center-level.vercel.app
echo "API health: $(curl -s $B/api/__health | head -c 400)"
echo "HEALTH: $(curl -s $B/api/community/health)"
echo "PINE no-auth: $(curl -s -o /dev/null -w '%{http_code}' $B/api/pine/scripts)"
echo "ADMIN header bypass: $(curl -s -o /dev/null -w '%{http_code}' -H 'x-admin-role: ADMIN' $B/api/admin/customers)"
echo "LEGACY pine GET: $(curl -s $B/api/pine-scripts | head -c 400)"
echo "ICE: $(curl -s $B/api/webrtc/ice)"
echo "HUB no-auth: $(curl -s $B/api/community/hub)"
