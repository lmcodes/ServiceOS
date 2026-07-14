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
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { QueueRange, QueueRangeResetPolicy } from '@/types/firestore';

const COLLECTION = 'queueRanges';

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ─── CRUD ───────────────────────────────────────────────────────────────────────

export interface CreateQueueRangeInput {
  tenantId: string;
  name: string;
  prefix: string;
  startNumber: number;
  endNumber: number;
  padLength: number;
  resetPolicy: QueueRangeResetPolicy;
}

export async function createQueueRange(input: CreateQueueRangeInput): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...input,
    currentNumber: input.startNumber - 1, // starts BEFORE startNumber so first ticket = startNumber
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateQueueRange(
  rangeId: string,
  input: Partial<Omit<CreateQueueRangeInput, 'tenantId'>>
): Promise<void> {
  const ref = doc(db, COLLECTION, rangeId);
  await updateDoc(ref, {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteQueueRange(rangeId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, rangeId));
}

export async function getQueueRanges(tenantId: string): Promise<QueueRange[]> {
  const q = query(
    collection(db, COLLECTION),
    where('tenantId', '==', tenantId),
    orderBy('name', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as QueueRange));
}

// ─── Real-time Subscription ─────────────────────────────────────────────────────

export function subscribeQueueRanges(
  tenantId: string,
  onNext: (ranges: QueueRange[]) => void,
  onError: (error: Error) => void
) {
  const q = query(
    collection(db, COLLECTION),
    where('tenantId', '==', tenantId),
    orderBy('name', 'asc')
  );
  return onSnapshot(
    q,
    (snap) => {
      const ranges: QueueRange[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as QueueRange));
      onNext(ranges);
    },
    onError
  );
}

// ─── Counter Increment (used inside createQueueItem transaction) ─────────────────

/**
 * Increments the queue range counter atomically.
 * Returns the formatted queue number string (e.g. "A-001").
 * Throws 'QUEUE_FULL' error code if counter would exceed endNumber.
 */
export async function incrementQueueRangeCounter(rangeId: string): Promise<string> {
  const rangeRef = doc(db, COLLECTION, rangeId);
  const today = getTodayString();

  const queueNumber = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(rangeRef);
    if (!snap.exists()) {
      throw new Error('QueueRange not found: ' + rangeId);
    }
    const data = snap.data() as QueueRange;

    let currentNumber = data.currentNumber;

    // Daily reset: if resetPolicy=daily and lastResetDate differs from today
    if (data.resetPolicy === 'daily' && data.lastResetDate !== today) {
      currentNumber = data.startNumber - 1; // will become startNumber after +1
    }

    const nextNumber = currentNumber + 1;

    if (nextNumber > data.endNumber) {
      const err = new Error('Queue is full for range: ' + data.name);
      (err as any).code = 'QUEUE_FULL';
      throw err;
    }

    const updates: Record<string, any> = {
      currentNumber: nextNumber,
      updatedAt: serverTimestamp(),
    };
    if (data.resetPolicy === 'daily') {
      updates.lastResetDate = today;
    }

    transaction.update(rangeRef, updates);

    const prefix = data.prefix ? `${data.prefix}-` : '';
    return `${prefix}${String(nextNumber).padStart(data.padLength, '0')}`;
  });

  return queueNumber;
}

/**
 * Manually reset a queue range counter back to startNumber - 1.
 */
export async function resetQueueRangeCounter(rangeId: string): Promise<void> {
  const rangeRef = doc(db, COLLECTION, rangeId);
  const snap = await import('firebase/firestore').then(({ getDoc }) => getDoc(rangeRef));
  if (!snap.exists()) throw new Error('QueueRange not found');
  const data = snap.data() as QueueRange;

  await updateDoc(rangeRef, {
    currentNumber: data.startNumber - 1,
    lastResetDate: getTodayString(),
    updatedAt: serverTimestamp(),
  });
}
