import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-bar-til-bar';

// Wipe all Firestore docs and Auth users between tests via the emulator REST API.
export async function clearEmulators(): Promise<void> {
  await Promise.all([
    fetch(
      `http://127.0.0.1:8085/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
      { method: 'DELETE' },
    ),
    fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT_ID}/accounts`, {
      method: 'DELETE',
    }),
  ]);
  await signOut(auth).catch(() => {});
}

// Deterministic unique emails (no Math.random) so reruns are reproducible.
let userCounter = 0;

// Create a fresh user and sign in. Returns the new user's uid, which becomes
// `request.auth.uid` for every Firestore request the helpers issue afterwards.
export async function signInAsNewUser(): Promise<string> {
  userCounter += 1;
  const credential = await createUserWithEmailAndPassword(
    auth,
    `user${userCounter}@test.dev`,
    'password123',
  );
  return credential.user.uid;
}

// Assert that a Firestore operation is blocked by the security rules.
export async function expectDenied(action: Promise<unknown>, label = 'operation'): Promise<void> {
  try {
    await action;
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === 'permission-denied') return;
    throw new Error(`${label}: expected permission-denied but got "${code ?? String(err)}"`);
  }
  throw new Error(`${label}: expected permission-denied but the operation succeeded`);
}
