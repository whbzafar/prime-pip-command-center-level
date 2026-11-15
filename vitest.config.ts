import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['backend/tests/**/*.test.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx', 'server/macro/**/*.test.ts', 'server/history/**/*.test.ts', 'server/pine/**/*.test.ts', 'server/routes/**/*.test.ts'],
    // Self-running assertion scripts (no describe/it) — run directly with tsx, not as vitest suites.
    exclude: ['**/node_modules/**', 'src/cotEngine.test.ts', 'src/cotPairEngine.test.ts', 'src/riskEngine.test.ts'],
  },
});
