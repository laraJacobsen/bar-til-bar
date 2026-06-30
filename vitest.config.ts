import { defineConfig } from 'vitest/config';
import path from 'node:path';

// These tests talk to the Firebase emulators (started by `firebase emulators:exec`),
// so they enforce the real firestore.rules against the app's real Firestore helpers.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    // Tests share emulator state and clear it between runs, so keep files serial.
    fileParallelism: false,
    env: {
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-bar-til-bar',
      NEXT_PUBLIC_FIREBASE_API_KEY: 'demo-key',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-bar-til-bar.firebaseapp.com',
    },
  },
});
