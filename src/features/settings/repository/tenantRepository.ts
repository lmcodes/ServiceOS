import { doc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/config/firebase';

const TENANTS_COLLECTION = 'tenants';

/**
 * Update tenant profile details (Name & Timezone)
 */
export async function updateTenantProfile(
  tenantId: string,
  name: string,
  timezone: string
): Promise<void> {
  const docRef = doc(db, TENANTS_COLLECTION, tenantId);
  await updateDoc(docRef, {
    name,
    'settings.timezone': timezone,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Upload tenant logo to Firebase Storage and update logo URL in Firestore
 */
export async function uploadTenantLogo(tenantId: string, file: File): Promise<string> {
  // Sanitize file name to avoid path issues
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
  const storagePath = `tenants/${tenantId}/logo/${Date.now()}_${cleanFileName}`;
  const fileRef = ref(storage, storagePath);

  const uploadResult = await uploadBytes(fileRef, file);
  const downloadUrl = await getDownloadURL(uploadResult.ref);

  const docRef = doc(db, TENANTS_COLLECTION, tenantId);
  await updateDoc(docRef, {
    logo: downloadUrl,
    updatedAt: serverTimestamp(),
  });

  return downloadUrl;
}

/**
 * Mark subscription status as cancelled
 */
export async function cancelTenantSubscription(tenantId: string): Promise<void> {
  const docRef = doc(db, TENANTS_COLLECTION, tenantId);
  await updateDoc(docRef, {
    status: 'cancelled',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Fetch counts of branches and staff for usage statistics
 */
export async function getTenantResourceUsage(
  tenantId: string
): Promise<{ branchesCount: number; staffCount: number }> {
  const branchesQuery = query(
    collection(db, 'branches'),
    where('tenantId', '==', tenantId),
    where('status', '==', 'active')
  );
  
  const staffQuery = query(
    collection(db, 'users'),
    where('tenantId', '==', tenantId)
  );

  const [branchesSnap, staffSnap] = await Promise.all([
    getDocs(branchesQuery),
    getDocs(staffQuery),
  ]);

  return {
    branchesCount: branchesSnap.size,
    staffCount: staffSnap.size,
  };
}
