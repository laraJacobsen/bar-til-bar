// Point the app's Firebase singletons at the local emulators. This runs once per
// test process, before any test imports `db`/`auth` and issues a request.
import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

connectFirestoreEmulator(db, '127.0.0.1', 8085);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
