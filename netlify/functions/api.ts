import serverless from "serverless-http";

// Prevent server.ts from opening a long-lived HTTP/WebSocket listener.
process.env.VERCEL = "1";

const { app } = await import("../../server.ts");
const expressHandler = serverless(app);

export const handler = async (event: any, context: any) => {
  const requestPath = event?.path || event?.rawPath || '';
  const normalizedPath = requestPath.startsWith('/api/')
    ? requestPath
    : `/api${requestPath.startsWith('/') ? '' : '/'}${requestPath}`;

  const normalizedEvent = {
    ...event,
    path: normalizedPath,
    rawPath: normalizedPath,
    requestContext: {
      ...(event?.requestContext || {}),
      path: normalizedPath,
    },
  };

  return expressHandler(normalizedEvent, context);
};
