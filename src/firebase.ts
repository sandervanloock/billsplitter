import { initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCustomToken,
  type User,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

// Production values come from .env.production.production (VITE_FIREBASE_*) after you create
// the real Firebase project; the demo-* fallbacks drive the local emulators.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'demo-billsplit.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'demo-billsplit',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? 'demo-app-id',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const useEmulators = import.meta.env.DEV || import.meta.env.VITE_USE_EMULATORS === '1';
if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

/**
 * Dev-only: the seed script prints URLs like /s/{id}?dev-uid=seed-host; the auth
 * emulator accepts unsigned (alg:none) custom tokens, so we can become that uid.
 */
async function devImpersonate(): Promise<User | null> {
  if (!useEmulators) return null;
  const uid = new URLSearchParams(location.search).get('dev-uid');
  if (!uid || auth.currentUser?.uid === uid) return auth.currentUser;
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const now = Math.floor(Date.now() / 1000);
  const token = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({
    iss: 'billsplit-dev',
    sub: 'billsplit-dev',
    aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    uid,
    iat: now,
    exp: now + 3600,
  })}.`;
  const cred = await signInWithCustomToken(auth, token);
  return cred.user;
}

/** Everyone is an anonymous Firebase user; a "login" is just a browser profile. */
export function ensureSignedIn(): Promise<User> {
  return devImpersonate().then(
    (impersonated) =>
      impersonated ??
      new Promise((resolve, reject) => {
        const stop = onAuthStateChanged(auth, (user) => {
          if (user) {
            stop();
            resolve(user);
          } else {
            signInAnonymously(auth).catch(reject);
          }
        });
      }),
  );
}
