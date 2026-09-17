const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Add notification API at the end before Vite middleware
code = code.replace('// Vite middleware / static files', `// ----------------------------------------------------
// NOTIFICATIONS API
// ----------------------------------------------------
import { getNotificationsForUser, markNotificationsRead } from "./server/notificationsService.js";

app.get("/api/notifications", (req, res) => {
  const token = getAuthToken(req);
  if (!token) return res.status(401).json({ ok: false, error: "Unauthorized" });
  const user = getUserByToken(token);
  if (!user) return res.status(401).json({ ok: false, error: "Invalid user" });
  const notifs = getNotificationsForUser(user.id);
  res.json({ ok: true, notifications: notifs });
});

app.post("/api/notifications/read", (req, res) => {
  const token = getAuthToken(req);
  if (!token) return res.status(401).json({ ok: false, error: "Unauthorized" });
  const user = getUserByToken(token);
  if (!user) return res.status(401).json({ ok: false, error: "Invalid user" });
  const { notifIds } = req.body || {};
  markNotificationsRead(user.id, notifIds);
  res.json({ ok: true });
});

// Vite middleware / static files`);

// 2. Add mentions to postCommunityMessage
const mentionsLogic = `
    // Handle mentions
    const mentions = [];
    if (text) {
      const mentionRegex = /@(\\w+)/g;
      let match;
      const allTraders = getAllRegisteredTraders();
      while ((match = mentionRegex.exec(text)) !== null) {
        const uName = match[1];
        const matchedUser = allTraders.find(t => t.username.toLowerCase() === uName.toLowerCase());
        if (matchedUser && !mentions.find(m => m.userId === matchedUser.id)) {
          mentions.push({ userId: matchedUser.id, username: matchedUser.username });
          // Notify
          import("./server/notificationsService.js").then(mod => {
            mod.createNotification({
              userId: matchedUser.id,
              type: "MENTION",
              title: "New Mention",
              body: \`\${user.username} mentioned you in the Community Hub.\`,
              link: "/community"
            });
          });
        }
      }
    }

    const newMsg = postCommunityMessage({
      mentions,`;

code = code.replace('    const newMsg = postCommunityMessage({', mentionsLogic);

fs.writeFileSync('server.ts', code, 'utf8');
console.log('Patched server.ts');
