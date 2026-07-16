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
import { CustomerGroup } from '@/types/firestore';

const COLLECTION = 'customerGroups';

export interface CreateCustomerGroupInput {
  tenantId: string;
  name: string;
  priorityLevel: number;
  timeMin: number;
  timeMax: number;
  color: string;
  badge: string;
}

export async function createCustomerGroup(input: CreateCustomerGroupInput): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateCustomerGroup(
  groupId: string,
  input: Partial<Omit<CreateCustomerGroupInput, 'tenantId'>>
): Promise<void> {
  const ref = doc(db, COLLECTION, groupId);
  await updateDoc(ref, {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCustomerGroup(groupId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, groupId));
}

export async function getCustomerGroups(tenantId: string): Promise<CustomerGroup[]> {
  const q = query(
    collection(db, COLLECTION),
    where('tenantId', '==', tenantId),
    orderBy('priorityLevel', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CustomerGroup));
}

export function subscribeCustomerGroups(
  tenantId: string,
  onNext: (groups: CustomerGroup[]) => void,
  onError: (error: Error) => void
) {
  const q = query(
    collection(db, COLLECTION),
    where('tenantId', '==', tenantId),
    orderBy('priorityLevel', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      const groups: CustomerGroup[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CustomerGroup));
      onNext(groups);
    },
    onError
  );
}
