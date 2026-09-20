process.env.VERCEL = "1";

const mod = await import("./dist/server.cjs");
export const app = mod.app || mod.default;
export default app;
