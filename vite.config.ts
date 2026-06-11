import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // In dev the extract API + /j/ OG route are served by the functions emulator.
      '/api': { target: 'http://127.0.0.1:5001/demo-billsplit/europe-west1/app', changeOrigin: true },
      '^/j/': { target: 'http://127.0.0.1:5001/demo-billsplit/europe-west1/app', changeOrigin: true },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
