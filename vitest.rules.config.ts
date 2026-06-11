import { defineConfig } from 'vitest/config';

// Run with the Firestore emulator up:  npm run test:rules
export default defineConfig({
  test: {
    include: ['rules-tests/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
