import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command:
        'npm run build --prefix functions && npx firebase emulators:start --only auth,firestore,functions --project demo-billsplit',
      // readiness = the function itself responds, not just the firestore port
      url: 'http://127.0.0.1:5001/demo-billsplit/europe-west1/app/j/readycheck123',
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: 'npm run dev',
      port: 5173,
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
