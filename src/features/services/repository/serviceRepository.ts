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
  orderBy
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Service } from '@/types/firestore';
import { CreateServiceInput, UpdateServiceInput } from '../types';

const SERVICES_COLLECTION = 'services';

/**
 * Subscribe to services of a branch in real-time
 */
export function subscribeServices(
  branchId: string, 
  onNext: (services: Service[]) => void, 
  onError: (error: Error) => void
) {
  const q = query(
    collection(db, SERVICES_COLLECTION),
    where('branchId', '==', branchId),
    orderBy('sortOrder', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const services: Service[] = [];
      snapshot.forEach((docSnap) => {
        services.push({
          id: docSnap.id,
          ...docSnap.data(),
        } as Service);
      });
      onNext(services);
    },
    (error) => {
      console.error('[subscribeServices]', error);
      onError(error);
    }
  );
}

/**
 * Get services of a branch once
 */
export async function getServices(branchId: string): Promise<Service[]> {
  const q = query(
    collection(db, SERVICES_COLLECTION),
    where('branchId', '==', branchId),
    orderBy('sortOrder', 'asc')
  );
  
  const snapshot = await getDocs(q);
  const services: Service[] = [];
  snapshot.forEach((docSnap) => {
    services.push({
      id: docSnap.id,
      ...docSnap.data(),
    } as Service);
  });
  return services;
}

/**
 * Create a new service
 */
export async function createService(
  tenantId: string, 
  branchId: string, 
  input: CreateServiceInput, 
  nextSortOrder: number = 0
): Promise<string> {
  const docRef = await addDoc(collection(db, SERVICES_COLLECTION), {
    tenantId,
    branchId,
    name: input.name,
    description: input.description || '',
    category: input.category || '',
    estimatedDurationMinutes: input.estimatedDurationMinutes,
    requiresResource: input.requiresResource,
    maxConcurrent: input.maxConcurrent,
    customFields: input.customFields,
    workflowId: input.workflowId || null,
    queueRangeId: input.queueRangeId || null,
    requireName: input.requireName ?? false,
    isActive: true,
    sortOrder: nextSortOrder,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Update an existing service
 */
export async function updateService(serviceId: string, input: UpdateServiceInput): Promise<void> {
  const serviceRef = doc(db, SERVICES_COLLECTION, serviceId);
  const updateData: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.category !== undefined) updateData.category = input.category;
  if (input.estimatedDurationMinutes !== undefined) updateData.estimatedDurationMinutes = input.estimatedDurationMinutes;
  if (input.requiresResource !== undefined) updateData.requiresResource = input.requiresResource;
  if (input.maxConcurrent !== undefined) updateData.maxConcurrent = input.maxConcurrent;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;
  if (input.customFields !== undefined) updateData.customFields = input.customFields;
  if (input.workflowId !== undefined) updateData.workflowId = input.workflowId;
  if (input.queueRangeId !== undefined) updateData.queueRangeId = input.queueRangeId;
  if (input.requireName !== undefined) updateData.requireName = input.requireName;

  await updateDoc(serviceRef, updateData);
}

/**
 * Toggle active state of service
 */
export async function toggleServiceActive(serviceId: string, isActive: boolean): Promise<void> {
  await updateService(serviceId, { isActive });
}
