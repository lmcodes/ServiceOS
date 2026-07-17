import { 
  collection, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  serverTimestamp,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Branch } from '@/types/firestore';
import { CreateBranchInput, UpdateBranchInput } from '../types';

const BRANCHES_COLLECTION = 'branches';

/**
 * Subscribe to branches of a tenant in real-time
 */
export function subscribeBranches(
  tenantId: string, 
  onNext: (branches: Branch[]) => void, 
  onError: (error: Error) => void
) {
  const q = query(
    collection(db, BRANCHES_COLLECTION),
    where('tenantId', '==', tenantId),
    where('status', '==', 'active')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const branches: Branch[] = [];
      snapshot.forEach((docSnap) => {
        branches.push({
          id: docSnap.id,
          ...docSnap.data(),
        } as Branch);
      });
      onNext(branches);
    },
    (error) => {
      console.error('[subscribeBranches]', error);
      onError(error);
    }
  );
}

/**
 * Get branches once (useful for initialization or single fetch)
 */
export async function getBranches(tenantId: string): Promise<Branch[]> {
  const q = query(
    collection(db, BRANCHES_COLLECTION),
    where('tenantId', '==', tenantId),
    where('status', '==', 'active')
  );
  
  const snapshot = await getDocs(q);
  const branches: Branch[] = [];
  snapshot.forEach((docSnap) => {
    branches.push({
      id: docSnap.id,
      ...docSnap.data(),
    } as Branch);
  });
  return branches;
}

/**
 * Create a new branch
 */
export async function createBranch(tenantId: string, input: CreateBranchInput): Promise<string> {
  const docRef = await addDoc(collection(db, BRANCHES_COLLECTION), {
    tenantId,
    name: input.name,
    code: input.code,
    phone: input.phone || '',
    email: input.email || '',
    address: input.address || {},
    timezone: input.timezone,
    queuePrefix: input.queuePrefix,
    currentQueueNumber: 0,
    operatingHours: input.operatingHours,
    settings: {
      autoCallNext: input.settings.autoCallNext,
      noShowTimeoutMinutes: input.settings.noShowTimeoutMinutes,
      maxQueueSize: input.settings.maxQueueSize,
      requirePhone: input.settings.requirePhone,
    },
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Update an existing branch
 */
export async function updateBranch(branchId: string, input: UpdateBranchInput): Promise<void> {
  const branchRef = doc(db, BRANCHES_COLLECTION, branchId);
  const updateData: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.code !== undefined) updateData.code = input.code;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.email !== undefined) updateData.email = input.email;
  if (input.address !== undefined) updateData.address = input.address;
  if (input.timezone !== undefined) updateData.timezone = input.timezone;
  if (input.queuePrefix !== undefined) updateData.queuePrefix = input.queuePrefix;
  if (input.operatingHours !== undefined) updateData.operatingHours = input.operatingHours;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.settings !== undefined) {
    updateData.settings = input.settings;
  }
  if (input.kioskSettings !== undefined) {
    updateData.kioskSettings = input.kioskSettings;
  }
  if (input.voiceSettings !== undefined) {
    updateData.voiceSettings = input.voiceSettings;
  }

  await updateDoc(branchRef, updateData);
}

/**
 * Soft delete a branch (mark status as inactive)
 */
export async function deleteBranch(branchId: string): Promise<void> {
  await updateBranch(branchId, { status: 'inactive' });
}

/**
 * Get a single branch statically by ID
 */
export async function getBranchById(branchId: string): Promise<Branch | null> {
  const branchRef = doc(db, BRANCHES_COLLECTION, branchId);
  const snap = await getDoc(branchRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Branch;
}

/**
 * Subscribe to a single branch in real-time
 */
export function subscribeBranch(
  branchId: string,
  onNext: (branch: Branch | null) => void,
  onError: (error: Error) => void
) {
  const branchRef = doc(db, BRANCHES_COLLECTION, branchId);
  return onSnapshot(
    branchRef,
    (snap) => {
      if (!snap.exists()) {
        onNext(null);
      } else {
        onNext({ id: snap.id, ...snap.data() } as Branch);
      }
    },
    (error) => {
      console.error('[subscribeBranch]', error);
      onError(error);
    }
  );
}
