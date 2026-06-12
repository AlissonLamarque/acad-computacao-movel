import { getFirestore, type Firestore } from 'firebase/firestore';

import { firebaseApp } from './app';

export const firebaseDb: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null;
