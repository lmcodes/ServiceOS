import {
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Counter } from '@/types/firestore';

const COLLECTION = 'counters';

export interface CreateCounterInput {
  branchId: string;
  name: string;
  primaryServiceIds: string[];
  secondaryServiceIds: string[];
  oneStopServiceIds: string[];
  isActive: boolean;
  tenantId: string; // added to ease security rule check
}

export async function createCounter(input: CreateCounterInput): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateCounter(
  counterId: string,
  input: Partial<Omit<CreateCounterInput, 'branchId' | 'tenantId'>>
): Promise<void> {
  const ref = doc(db, COLLECTION, counterId);
  await updateDoc(ref, {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCounter(counterId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, counterId));
}

export async function getCounters(branchId: string): Promise<Counter[]> {
  const q = query(
    collection(db, COLLECTION),
    where('branchId', '==', branchId),
    orderBy('name', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Counter));
}

export function subscribeCounters(
  branchId: string,
  onNext: (counters: Counter[]) => void,
  onError: (error: Error) => void
) {
  const q = query(
    collection(db, COLLECTION),
    where('branchId', '==', branchId),
    orderBy('name', 'asc')
  );
  return onSnapshot(
    q,
    (snap) => {
      const counters: Counter[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Counter));
      onNext(counters);
    },
    onError
  );
}
