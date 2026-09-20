import serverless from "serverless-http";

// Prevent server.ts from opening a long-lived HTTP/WebSocket listener.
process.env.VERCEL = "1";

const { app } = await import("../../server.js");
const handler = serverless(app);

export { handler };
