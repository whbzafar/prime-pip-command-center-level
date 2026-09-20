process.env.VERCEL = "1";

// Keep the compiled bundle path dynamic so TypeScript does not require the
// generated dist artifact during source-only linting.
const bundlePath = "./dist/server.cjs";
const mod = await import(bundlePath);
export const app = mod.app || mod.default;
export default app;
