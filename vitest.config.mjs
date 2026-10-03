import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.mjs'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'html', 'json-summary', 'lcov'],
      thresholds: {
        perFile: true,
        statements: 95,
        branches: 95,
        functions: 100,
        lines: 95,
      },
    },
  },
});
