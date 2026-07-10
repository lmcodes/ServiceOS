import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/config/firebase';
import { User } from '@/types/firestore';

/**
 * Subscribes to the list of staff members (users) for a specific tenant in real-time.
 */
export function subscribeStaffMembers(
  tenantId: string,
  onUpdate: (users: User[]) => void,
  onError: (error: any) => void
): () => void {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('tenantId', '==', tenantId));

  return onSnapshot(
    q,
    (snapshot) => {
      const users: User[] = [];
      snapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() } as User);
      });
      onUpdate(users);
    },
    (error) => {
      console.error('Failed to subscribe staff members:', error);
      onError(error);
    }
  );
}

/**
 * Invokes Cloud Function to invite a new staff member.
 */
export async function inviteStaff(
  email: string,
  role: 'admin' | 'manager' | 'staff',
  branchIds: string[],
  name?: string
): Promise<{ success: boolean; uid: string; inviteLink: string; isNewUser: boolean }> {
  const inviteStaffFn = httpsCallable<
    { email: string; role: string; branchIds: string[]; name?: string },
    { success: boolean; uid: string; inviteLink: string; isNewUser: boolean }
  >(functions, 'inviteStaff');

  const result = await inviteStaffFn({ email, role, branchIds, name });
  return result.data;
}

/**
 * Invokes Cloud Function to update a staff member's role and branch list.
 */
export async function updateStaffRoleAndBranches(
  targetUid: string,
  role: 'admin' | 'manager' | 'staff',
  branchIds: string[]
): Promise<void> {
  const setUserRoleFn = httpsCallable<
    { targetUid: string; role: string; branchIds: string[] },
    { success: boolean }
  >(functions, 'setUserRole');

  await setUserRoleFn({ targetUid, role, branchIds });
}

/**
 * Sets a staff member's status to 'suspended' in Firestore.
 */
export async function suspendStaff(uid: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    status: 'suspended',
    updatedAt: serverTimestamp()
  });
}

/**
 * Sets a staff member's status to 'active' in Firestore.
 */
export async function reactivateStaff(uid: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    status: 'active',
    updatedAt: serverTimestamp()
  });
}

/**
 * Deletes a staff member's Firestore document.
 */
export async function deleteStaff(uid: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await deleteDoc(userRef);
}
