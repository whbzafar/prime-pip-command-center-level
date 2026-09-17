import http from 'node:http';

// server.ts is also the local development entrypoint and starts Express with app.listen().
// Vercel needs the same Express app as a serverless handler, so suppress the local listener
// only while importing the application into this function.
const originalListen = http.Server.prototype.listen;
(http.Server.prototype as any).listen = function () {
  return this;
};

const { app } = await import('../server.ts');

(http.Server.prototype as any).listen = originalListen;

export default app;
