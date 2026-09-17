const fs = require('fs');
let code = fs.readFileSync('server/commandCenterService.ts', 'utf8');

const readLogic = `
export function markPrivateMessagesRead(receiverId: string, senderId: string): number {
  const msgs = readPrivateMessages();
  let updated = 0;
  for (const m of msgs) {
    if (m.receiverId === receiverId && m.senderId === senderId && !m.read) {
      m.read = true;
      updated++;
    }
  }
  if (updated > 0) writePrivateMessages(msgs);
  return updated;
}
`;

code = code.replace('export function postPrivateMessage', readLogic + '\nexport function postPrivateMessage');
fs.writeFileSync('server/commandCenterService.ts', code, 'utf8');

let serverCode = fs.readFileSync('server.ts', 'utf8');
const endpointLogic = `
app.post('/api/messages/private/read', (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const user = getUserByToken(token);
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid user' });
    const { senderId } = req.body;
    import("./server/commandCenterService.js").then(mod => {
      const updated = mod.markPrivateMessagesRead(user.id, senderId);
      res.json({ ok: true, updated });
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});
`;

serverCode = serverCode.replace("app.post('/api/messages/private', (req, res) => {", endpointLogic + "\napp.post('/api/messages/private', (req, res) => {");
fs.writeFileSync('server.ts', serverCode, 'utf8');
console.log('Patched private message read functionality');
