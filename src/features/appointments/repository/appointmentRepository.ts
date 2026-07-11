import { 
  collection, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  serverTimestamp,
  getDoc,
  getDocs,
  runTransaction
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Appointment, WorkflowHistoryEntry } from '@/types/firestore';

const APPOINTMENTS_COLLECTION = 'appointments';
const QUEUES_COLLECTION = 'queues';
const BRANCHES_COLLECTION = 'branches';
const SERVICES_COLLECTION = 'services';

function getTodayDateInTimezone(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(new Date()); // Returns "YYYY-MM-DD"
  } catch {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Subscribe to appointments for a branch on a specific date in real-time
 */
export function subscribeAppointmentsForDate(
  branchId: string,
  dateStr: string,
  onNext: (items: Appointment[]) => void,
  onError: (error: Error) => void
) {
  const q = query(
    collection(db, APPOINTMENTS_COLLECTION),
    where('branchId', '==', branchId),
    where('scheduledDate', '==', dateStr),
    orderBy('startTime', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Appointment[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Appointment);
      });
      onNext(items);
    },
    (error) => {
      console.error('[subscribeAppointmentsForDate]', error);
      onError(error);
    }
  );
}

/**
 * Create a new appointment in CONFIRMED status
 */
export async function createAppointment(
  tenantId: string,
  branchId: string,
  serviceId: string,
  data: Omit<Appointment, 'id' | 'tenantId' | 'branchId' | 'serviceId' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = doc(collection(db, APPOINTMENTS_COLLECTION));
  
  const payload: Omit<Appointment, 'id'> = {
    tenantId,
    branchId,
    serviceId,
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    customerPhone: data.customerPhone || '',
    scheduledDate: data.scheduledDate,
    startTime: data.startTime,
    endTime: data.endTime,
    resourceId: data.resourceId || '',
    status: 'CONFIRMED',
    createdAt: serverTimestamp() as any,
    updatedAt: serverTimestamp() as any
  };

  // Mocking notification logs
  console.log(`[Notification Mock] Appointment confirmation email queued for ${data.customerEmail}`);
  if (data.customerPhone) {
    console.log(`[Notification Mock] Appointment confirmation SMS queued for ${data.customerPhone}`);
  }

  await runTransaction(db, async (transaction) => {
    // Check concurrency capacity limit
    const capacityAvailable = await checkSlotAvailabilityTx(transaction, branchId, serviceId, data.scheduledDate, data.startTime);
    if (!capacityAvailable) {
      throw new Error('This time slot is fully booked.');
    }
    transaction.set(docRef, payload);
  });

  return docRef.id;
}

/**
 * Cancel a confirmed appointment
 */
export async function cancelAppointment(appointmentId: string): Promise<void> {
  const docRef = doc(db, APPOINTMENTS_COLLECTION, appointmentId);
  await updateDoc(docRef, {
    status: 'CANCELLED',
    updatedAt: serverTimestamp()
  });
  console.log(`[Notification Mock] Appointment cancellation notification sent for ${appointmentId}`);
}

/**
 * Mark a confirmed appointment as No-Show
 */
export async function markNoShowAppointment(appointmentId: string): Promise<void> {
  const docRef = doc(db, APPOINTMENTS_COLLECTION, appointmentId);
  await updateDoc(docRef, {
    status: 'NO_SHOW',
    updatedAt: serverTimestamp()
  });
}

/**
 * Check-in an appointment, converting it transactionally to a high-priority QueueItem
 */
export async function checkInAppointment(
  appointmentId: string,
  _staffUserId: string
): Promise<{ queueNumber: string; ticketId: string }> {
  const appointmentRef = doc(db, APPOINTMENTS_COLLECTION, appointmentId);
  const queueRef = doc(collection(db, QUEUES_COLLECTION));

  const result = await runTransaction(db, async (transaction) => {
    // 1. Read appointment details
    const appointmentSnap = await transaction.get(appointmentRef);
    if (!appointmentSnap.exists()) {
      throw new Error('Appointment not found');
    }
    const appointmentData = appointmentSnap.data() as Appointment;
    if (appointmentData.status !== 'CONFIRMED') {
      throw new Error(`Appointment status is '${appointmentData.status}', cannot check-in.`);
    }

    const { branchId, serviceId, customerName, customerPhone, customerEmail, tenantId } = appointmentData;

    // 2. Read branch counters for daily queue number reset/increment
    const branchRef = doc(db, BRANCHES_COLLECTION, branchId);
    const branchSnap = await transaction.get(branchRef);
    if (!branchSnap.exists()) {
      throw new Error('Branch not found');
    }
    const branchData = branchSnap.data();
    const timezone = branchData.timezone || 'Asia/Bangkok';
    const todayStr = getTodayDateInTimezone(timezone);

    let nextQueueNumber = 1;
    const lastResetDate = branchData.lastDailyResetDate;

    if (lastResetDate === todayStr) {
      nextQueueNumber = (branchData.currentQueueNumber || 0) + 1;
    }

    // 3. Update branch counters
    transaction.update(branchRef, {
      currentQueueNumber: nextQueueNumber,
      lastDailyResetDate: todayStr,
      updatedAt: serverTimestamp()
    });

    const prefix = branchData.queuePrefix || 'A';
    const formattedQueueNumber = `${prefix}-${String(nextQueueNumber).padStart(3, '0')}`;

    // 4. Resolve workflows if service uses one
    const serviceRef = doc(db, SERVICES_COLLECTION, serviceId);
    const serviceSnap = await transaction.get(serviceRef);
    
    let workflowId: string | null = null;
    let currentStageId: string | null = null;
    let workflowHistory: WorkflowHistoryEntry[] = [];

    if (serviceSnap.exists()) {
      const serviceData = serviceSnap.data();
      if (serviceData.workflowId) {
        const workflowRef = doc(db, 'workflows', serviceData.workflowId);
        const workflowSnap = await transaction.get(workflowRef);
        if (workflowSnap.exists()) {
          const workflowData = workflowSnap.data();
          const stageIds = workflowData.stageIds || [];
          if (stageIds.length > 0) {
            workflowId = serviceData.workflowId;
            currentStageId = stageIds[0];
            workflowHistory = [{
              stageId: currentStageId as string,
              enteredAt: new Date() as any, // Local timestamp inside transaction
              exitedAt: null,
              durationSeconds: null,
              assignedUserId: null,
              assignedResourceId: null
            }];
          }
        }
      }
    }

    // 5. Create high-priority QueueItem (priority = 5)
    transaction.set(queueRef, {
      tenantId,
      branchId,
      serviceId,
      queueNumber: formattedQueueNumber,
      sequenceNumber: Date.now(),
      customerName,
      customerPhone: customerPhone || '',
      customerEmail: customerEmail || '',
      status: 'WAITING',
      priority: 5, // ELEVATED PRIORITY
      calledCount: 0,
      customData: {},
      workflowId,
      currentStageId,
      workflowHistory,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // 6. Update appointment status
    transaction.update(appointmentRef, {
      status: 'CHECKED_IN',
      queueItemId: queueRef.id,
      checkInTime: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { queueNumber: formattedQueueNumber, ticketId: queueRef.id };
  });

  return result;
}

/**
 * Public helper to verify slot availability based on maxConcurrent capacity limit
 */
export async function checkSlotAvailability(
  branchId: string,
  serviceId: string,
  dateStr: string,
  timeStr: string
): Promise<boolean> {
  const serviceRef = doc(db, SERVICES_COLLECTION, serviceId);
  const serviceSnap = await getDoc(serviceRef);
  if (!serviceSnap.exists()) return false;
  const serviceData = serviceSnap.data();
  const maxConcurrent = serviceData.maxConcurrent || 1;

  const q = query(
    collection(db, APPOINTMENTS_COLLECTION),
    where('branchId', '==', branchId),
    where('serviceId', '==', serviceId),
    where('scheduledDate', '==', dateStr),
    where('startTime', '==', timeStr),
    where('status', 'in', ['CONFIRMED', 'CHECKED_IN'])
  );

  const snapshot = await getDocs(q);
  return snapshot.size < maxConcurrent;
}

/**
 * Internal transaction helper for checking availability during creation
 */
async function checkSlotAvailabilityTx(
  transaction: any,
  branchId: string,
  serviceId: string,
  dateStr: string,
  timeStr: string
): Promise<boolean> {
  const serviceRef = doc(db, SERVICES_COLLECTION, serviceId);
  const serviceSnap = await transaction.get(serviceRef);
  if (!serviceSnap.exists()) return false;
  const serviceData = serviceSnap.data();
  const maxConcurrent = serviceData.maxConcurrent || 1;

  const q = query(
    collection(db, APPOINTMENTS_COLLECTION),
    where('branchId', '==', branchId),
    where('serviceId', '==', serviceId),
    where('scheduledDate', '==', dateStr),
    where('startTime', '==', timeStr),
    where('status', 'in', ['CONFIRMED', 'CHECKED_IN'])
  );

  const snapshot = await getDocs(q);
  return snapshot.size < maxConcurrent;
}
