import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../') // __tests__ sibling of app/src root
    }
  },
  test: {
  include: ['src/__tests__/unit/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      'tests',
      '__tests__/e2e'
    ],
    environment: 'jsdom',
  setupFiles: ['src/__tests__/unit/setupTests.ts'],
    globals: true
  }
});