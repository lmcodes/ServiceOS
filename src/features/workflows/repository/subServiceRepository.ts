import { 
  collection, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { SubService } from '@/types/firestore';

const SUB_SERVICES_COLLECTION = 'subServices';

export type CreateSubServiceInput = Omit<SubService, 'id' | 'createdAt'>;

/**
 * Subscribe to sub-services of a tenant in real-time
 */
export function subscribeSubServices(
  tenantId: string,
  onNext: (subServices: SubService[]) => void,
  onError: (error: Error) => void
) {
  const q = query(
    collection(db, SUB_SERVICES_COLLECTION),
    where('tenantId', '==', tenantId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const subServices: SubService[] = [];
      snapshot.forEach((docSnap) => {
        subServices.push({
          id: docSnap.id,
          ...docSnap.data()
        } as SubService);
      });
      onNext(subServices);
    },
    (error) => {
      console.error('[subscribeSubServices]', error);
      onError(error);
    }
  );
}

/**
 * Get all sub-services of a tenant once
 */
export async function getSubServices(tenantId: string): Promise<SubService[]> {
  const q = query(
    collection(db, SUB_SERVICES_COLLECTION),
    where('tenantId', '==', tenantId)
  );
  
  const snapshot = await getDocs(q);
  const subServices: SubService[] = [];
  snapshot.forEach((docSnap) => {
    subServices.push({
      id: docSnap.id,
      ...docSnap.data()
    } as SubService);
  });
  return subServices;
}

/**
 * Create a new sub-service
 */
export async function createSubService(
  tenantId: string,
  input: Omit<CreateSubServiceInput, 'tenantId'>
): Promise<string> {
  const ref = collection(db, SUB_SERVICES_COLLECTION);
  const docRef = await addDoc(ref, {
    ...input,
    tenantId,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

/**
 * Update an existing sub-service
 */
export async function updateSubService(
  id: string,
  input: Partial<Omit<SubService, 'id' | 'tenantId' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, SUB_SERVICES_COLLECTION, id);
  await updateDoc(docRef, input);
}

/**
 * Delete a sub-service
 */
export async function deleteSubService(id: string): Promise<void> {
  const docRef = doc(db, SUB_SERVICES_COLLECTION, id);
  await deleteDoc(docRef);
}

/**
 * Preset data map for business types
 */
export const BUSINESS_PRESETS = {
  clinic: [
    { name: { th: 'ตรวจสอบสิทธิ์', en: 'Eligibility Check' }, icon: 'UserCheck', estimatedMinutes: 5, category: 'registration' },
    { name: { th: 'คัดกรองอาการ', en: 'Vitals & Screening' }, icon: 'Heart', estimatedMinutes: 10, category: 'clinical' },
    { name: { th: 'พบแพทย์', en: 'Doctor Consultation' }, icon: 'Stethoscope', estimatedMinutes: 15, category: 'clinical' },
    { name: { th: 'ชำระเงิน', en: 'Payment' }, icon: 'CreditCard', estimatedMinutes: 10, category: 'billing' },
    { name: { th: 'รับยา', en: 'Pharmacy' }, icon: 'Package', estimatedMinutes: 10, category: 'pharmacy' }
  ],
  restaurant: [
    { name: { th: 'ลงทะเบียนคิว', en: 'Register Queue' }, icon: 'UserCheck', estimatedMinutes: 5, category: 'reception' },
    { name: { th: 'รอโต๊ะ', en: 'Wait for Table' }, icon: 'Coffee', estimatedMinutes: 15, category: 'waiting' },
    { name: { th: 'สั่งอาหาร', en: 'Order Food' }, icon: 'FileText', estimatedMinutes: 10, category: 'ordering' },
    { name: { th: 'รับอาหาร', en: 'Receive Food' }, icon: 'ShoppingBag', estimatedMinutes: 20, category: 'service' },
    { name: { th: 'ชำระเงิน', en: 'Payment' }, icon: 'CreditCard', estimatedMinutes: 5, category: 'billing' }
  ],
  bank: [
    { name: { th: 'รับคิว', en: 'Ticket Reception' }, icon: 'UserCheck', estimatedMinutes: 3, category: 'reception' },
    { name: { th: 'ดำเนินการ', en: 'Processing' }, icon: 'Activity', estimatedMinutes: 10, category: 'service' },
    { name: { th: 'ตรวจสอบ', en: 'Verification' }, icon: 'FileText', estimatedMinutes: 5, category: 'verification' },
    { name: { th: 'ชำระ/เบิกถอน', en: 'Deposit & Withdrawal' }, icon: 'CreditCard', estimatedMinutes: 8, category: 'transaction' }
  ],
  general: [
    { name: { th: 'รับคิว', en: 'Reception' }, icon: 'UserCheck', estimatedMinutes: 5, category: 'reception' },
    { name: { th: 'รอรับบริการ', en: 'Waiting Stage' }, icon: 'Clock', estimatedMinutes: 15, category: 'waiting' },
    { name: { th: 'รับบริการ', en: 'Service Delivery' }, icon: 'Smile', estimatedMinutes: 15, category: 'service' },
    { name: { th: 'เสร็จสิ้น', en: 'Completed' }, icon: 'Smile', estimatedMinutes: 2, category: 'completion' }
  ]
};

/**
 * Bulk load presets based on tenant's business type
 */
export async function loadSubServicePresets(
  tenantId: string,
  businessType: 'clinic' | 'restaurant' | 'bank' | 'general'
): Promise<void> {
  const presets = BUSINESS_PRESETS[businessType] || BUSINESS_PRESETS.general;
  const batch = writeBatch(db);
  const subServicesColl = collection(db, SUB_SERVICES_COLLECTION);
  
  presets.forEach((preset) => {
    const newDocRef = doc(subServicesColl);
    batch.set(newDocRef, {
      ...preset,
      tenantId,
      createdAt: serverTimestamp()
    });
  });

  await batch.commit();
}
