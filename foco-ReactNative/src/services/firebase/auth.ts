import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';

import { firebaseApp } from './app';

export const firebaseAuth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;

export function observeAuthState(onChange: (user: User | null) => void) {
  if (!firebaseAuth) {
    onChange(null);
    return () => undefined;
  }

  return onAuthStateChanged(firebaseAuth, onChange);
}

export async function signInFirebaseWithGoogleIdToken(idToken: string) {
  if (!firebaseAuth) {
    throw new Error('Firebase Auth is not configured.');
  }

  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(firebaseAuth, credential);
}

export async function signOutFirebase() {
  if (!firebaseAuth) {
    return;
  }

  await signOut(firebaseAuth);
}
