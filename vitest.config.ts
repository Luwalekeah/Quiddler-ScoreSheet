import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * Unit tests only. The e2e directory belongs to Playwright, which brings its
 * own `test` and `expect`, so vitest must not try to collect it.
 */
export default defineConfig({
  resolve: {
    alias: {
      // Mirrors the `@/*` path alias in tsconfig.json.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**', '.next/**'],
  },
})
