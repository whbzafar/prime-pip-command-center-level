B=https://prime-pip-command-center-level.vercel.app
for i in $(seq 1 30); do v=$(curl -s $B/api/community/health); echo "$v" | grep -q supabase && break; sleep 20; done
echo "HEALTH: $v"
echo "PINE no-auth: $(curl -s -o /dev/null -w '%{http_code}' $B/api/pine/scripts)"
echo "ADMIN header bypass: $(curl -s -o /dev/null -w '%{http_code}' -H 'x-admin-role: ADMIN' $B/api/admin/customers)"
echo "LEGACY pine GET: $(curl -s $B/api/pine-scripts | head -c 300)"
echo "API health: $(curl -s $B/api/__health | head -c 300)"
