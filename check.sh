AT=$(node -e "console.log(require('/tmp/tokens.json').admin.token)")
echo "PINE as admin (bearer): $(curl -s -H "Authorization: Bearer $AT" localhost:3000/api/pine/scripts | head -c 300)"
echo "PINE as admin (cookie): $(curl -s -b primepipfx_session=$AT localhost:3000/api/pine/scripts | head -c 300)"
echo "ME: $(curl -s -H "Authorization: Bearer $AT" localhost:3000/api/auth/me | head -c 300)"
