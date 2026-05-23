import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{mjs,ts}'],
    exclude: ['tests/e2e/**'],
  },
});
