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
import { QueueItem, WorkflowHistoryEntry } from '@/types/firestore';
import { incrementQueueRangeCounter } from '@/features/queueRanges/repository/queueRangeRepository';


const QUEUES_COLLECTION = 'queues';
const BRANCHES_COLLECTION = 'branches';

function getMillisFromTimestamp(timestamp: any): number {
  if (!timestamp) return Date.now();
  if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
  if (timestamp.seconds !== undefined) return timestamp.seconds * 1000;
  if (timestamp instanceof Date) return timestamp.getTime();
  if (typeof timestamp === 'string' || typeof timestamp === 'number') return new Date(timestamp).getTime();
  return Date.now();
}


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
 * Creates a new queue item using a Firestore transaction.
 * - If the service has a `queueRangeId`, uses the QueueRange counter (Phase 10).
 * - Otherwise falls back to the legacy branch-level daily counter.
 */
export async function createQueueItem(
  branchId: string,
  serviceId: string,
  customerData: {
    name: string;
    phone?: string;
    email?: string;
    customData?: Record<string, any>;
    customerGroupId?: string;
    priorityLevel?: number;
  }
): Promise<{ id: string; queueNumber: string }> {
  const branchRef = doc(db, BRANCHES_COLLECTION, branchId);
  const queueRef = doc(collection(db, QUEUES_COLLECTION));

  // ── Phase 10: check if service has a queue range ──────────────────────────
  const serviceRef = doc(db, 'services', serviceId);
  const serviceSnap = await getDoc(serviceRef);
  const serviceData = serviceSnap.exists() ? serviceSnap.data() : null;
  const queueRangeId: string | null = serviceData?.queueRangeId || null;

  // If a range is linked, use the range counter (outside the branch transaction)
  if (queueRangeId) {
    // incrementQueueRangeCounter handles its own transaction and throws QUEUE_FULL
    const formattedQueueNumber = await incrementQueueRangeCounter(queueRangeId);

    // Now run a separate transaction to create the queue item
    await runTransaction(db, async (transaction) => {
      const branchSnap = await transaction.get(branchRef);
      if (!branchSnap.exists()) throw new Error('Branch does not exist');
      const branchData = branchSnap.data();

      // Resolve workflow
      let workflowId: string | null = null;
      let currentStageId: string | null = null;
      let workflowHistory: WorkflowHistoryEntry[] = [];
      if (serviceData?.workflowId) {
        const wfRef = doc(db, 'workflows', serviceData.workflowId);
        const wfSnap = await transaction.get(wfRef);
        if (wfSnap.exists()) {
          const wfData = wfSnap.data();
          const stageIds = wfData.stageIds || [];
          if (stageIds.length > 0) {
            workflowId = serviceData.workflowId;
            currentStageId = stageIds[0];
            workflowHistory = [{
              stageId: currentStageId as string,
              enteredAt: new Date() as any,
              exitedAt: null,
              durationSeconds: null,
              assignedUserId: null,
              assignedResourceId: null
            }];
          }
        }
      }

      transaction.set(queueRef, {
        tenantId: branchData.tenantId,
        branchId,
        serviceId,
        queueRangeId,
        queueNumber: formattedQueueNumber,
        sequenceNumber: Date.now(),
        customerName: customerData.name,
        customerPhone: customerData.phone || '',
        customerEmail: customerData.email || '',
        status: 'WAITING',
        priority: 0,
        customerGroupId: customerData.customerGroupId || null,
        priorityLevel: customerData.priorityLevel || 1,
        joinedAt: serverTimestamp(),
        calledCount: 0,
        customData: customerData.customData || {},
        workflowId,
        currentStageId,
        workflowHistory,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });

    return { id: queueRef.id, queueNumber: formattedQueueNumber };
  }

  // ── Legacy: branch-level daily counter ────────────────────────────────────
  const result = await runTransaction(db, async (transaction) => {
    // 1. ALL READ OPERATIONS FIRST
    const branchSnap = await transaction.get(branchRef);
    if (!branchSnap.exists()) {
      throw new Error('Branch does not exist');
    }

    // Check if the service maps to a workflow template
    const serviceRefInner = doc(db, 'services', serviceId);
    const serviceSnapInner = await transaction.get(serviceRefInner);
    
    let workflowId: string | null = null;
    let currentStageId: string | null = null;
    let workflowHistory: WorkflowHistoryEntry[] = [];

    if (serviceSnapInner.exists()) {
      const sd = serviceSnapInner.data();
      if (sd.workflowId) {
        const workflowRef = doc(db, 'workflows', sd.workflowId);
        const workflowSnap = await transaction.get(workflowRef);
        if (workflowSnap.exists()) {
          const workflowData = workflowSnap.data();
          const stageIds = workflowData.stageIds || [];
          if (stageIds.length > 0) {
            workflowId = sd.workflowId;
            currentStageId = stageIds[0];
            workflowHistory = [{
              stageId: currentStageId as string,
              enteredAt: new Date() as any,
              exitedAt: null,
              durationSeconds: null,
              assignedUserId: null,
              assignedResourceId: null
            }];
          }
        }
      }
    }

    // 2. WRITE OPERATIONS AFTER READS
    const branchData = branchSnap.data();
    const timezone = branchData.timezone || 'Asia/Bangkok';
    const todayStr = getTodayDateInTimezone(timezone);

    let nextQueueNumber = 1;
    const lastResetDate = branchData.lastDailyResetDate;

    if (lastResetDate === todayStr) {
      nextQueueNumber = (branchData.currentQueueNumber || 0) + 1;
    }

    // Update branch counters
    transaction.update(branchRef, {
      currentQueueNumber: nextQueueNumber,
      lastDailyResetDate: todayStr,
      updatedAt: serverTimestamp()
    });

    const prefix = branchData.queuePrefix || 'A';
    const formattedQueueNumber = `${prefix}-${String(nextQueueNumber).padStart(3, '0')}`;

    // Create queue item doc
    transaction.set(queueRef, {
      tenantId: branchData.tenantId,
      branchId,
      serviceId,
      queueNumber: formattedQueueNumber,
      sequenceNumber: Date.now(),
      customerName: customerData.name,
      customerPhone: customerData.phone || '',
      customerEmail: customerData.email || '',
      status: 'WAITING',
      priority: 0,
      customerGroupId: customerData.customerGroupId || null,
      priorityLevel: customerData.priorityLevel || 1,
      joinedAt: serverTimestamp(),
      calledCount: 0,
      customData: customerData.customData || {},
      workflowId,
      currentStageId,
      workflowHistory,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { id: queueRef.id, queueNumber: formattedQueueNumber };
  });

  return result;
}

/**
 * Fetch a queue item statically by its ID
 */
export async function getQueueItemById(ticketId: string): Promise<QueueItem | null> {
  const docRef = doc(db, QUEUES_COLLECTION, ticketId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as QueueItem;
}

/**
 * Subscribe to real-time changes of a single queue item
 */
export function subscribeQueueItem(
  ticketId: string,
  onNext: (item: QueueItem | null) => void,
  onError: (error: Error) => void
) {
  const docRef = doc(db, QUEUES_COLLECTION, ticketId);
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (!docSnap.exists()) {
        onNext(null);
      } else {
        onNext({ id: docSnap.id, ...docSnap.data() } as QueueItem);
      }
    },
    onError
  );
}

/**
 * Cancel a waiting queue item
 */
export async function cancelQueueItem(ticketId: string): Promise<void> {
  const docRef = doc(db, QUEUES_COLLECTION, ticketId);
  await runTransaction(db, async (transaction) => {
    const snapRead = await transaction.get(docRef);
    if (!snapRead.exists()) return;
    const currentData = snapRead.data() as QueueItem;
    const updatePayload: Record<string, any> = {
      status: 'CANCELLED',
      cancelledAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (currentData.workflowId && currentData.currentStageId) {
      const history = [...(currentData.workflowHistory || [])];
      const activeEntryIndex = history.findIndex((h) => h.stageId === currentData.currentStageId && !h.exitedAt);
      if (activeEntryIndex !== -1) {
        const activeEntry = history[activeEntryIndex];
        const enteredMs = getMillisFromTimestamp(activeEntry.enteredAt);
        const now = new Date();
        const durationSeconds = Math.max(0, Math.floor((now.getTime() - enteredMs) / 1000));
        history[activeEntryIndex] = {
          ...activeEntry,
          exitedAt: now as any,
          durationSeconds
        };
        updatePayload.workflowHistory = history;
      }
    }

    transaction.update(docRef, updatePayload);
  });
}

/**
 * Subscribe to active queue items of a branch in real-time
 */
export function subscribeActiveQueues(
  branchId: string,
  onNext: (items: QueueItem[]) => void,
  onError: (error: Error) => void
) {
  const q = query(
    collection(db, QUEUES_COLLECTION),
    where('branchId', '==', branchId),
    where('status', 'in', ['WAITING', 'CALLED', 'SERVING']),
    orderBy('sequenceNumber', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: QueueItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as QueueItem);
      });
      onNext(items);
    },
    (error) => {
      console.error('[subscribeActiveQueues]', error);
      onError(error);
    }
  );
}

/**
 * Subscribe to the count of waiting tickets ahead of a given sequence number for a service
 */
export function subscribeWaitingAheadCount(
  branchId: string,
  serviceId: string,
  sequenceNumber: number,
  onNext: (count: number) => void,
  onError: (error: Error) => void
) {
  const q = query(
    collection(db, QUEUES_COLLECTION),
    where('branchId', '==', branchId),
    where('serviceId', '==', serviceId),
    where('status', '==', 'WAITING'),
    where('sequenceNumber', '<', sequenceNumber)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      onNext(snapshot.size);
    },
    (error) => {
      console.error('[subscribeWaitingAheadCount]', error);
      onError(error);
    }
  );
}

/**
 * Call the next waiting ticket in line (highest priority, oldest sequence number)
 */
export async function callNextTicket(
  branchId: string, 
  staffUserId: string, 
  counter?: string,
  currentStageId?: string | null
): Promise<QueueItem | null> {
  const branchRef = doc(db, BRANCHES_COLLECTION, branchId);
  const branchSnap = await getDoc(branchRef);
  if (!branchSnap.exists()) return null;
  const branchData = branchSnap.data();
  const tenantId = branchData.tenantId;

  // 1. Fetch Customer Groups to get escalation rules
  const cgQuery = query(collection(db, 'customerGroups'), where('tenantId', '==', tenantId));
  const cgSnap = await getDocs(cgQuery);
  const customerGroupsMap: Record<string, any> = {};
  cgSnap.forEach((docSnap) => {
    customerGroupsMap[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
  });

  // 2. Fetch Counter configuration if counter name is provided
  let counterConfig: any = null;
  if (counter) {
    const counterQuery = query(
      collection(db, 'counters'),
      where('branchId', '==', branchId),
      where('name', '==', counter.trim()),
      where('isActive', '==', true)
    );
    const counterSnap = await getDocs(counterQuery);
    if (!counterSnap.empty) {
      counterConfig = counterSnap.docs[0].data();
    }
  }

  // 3. Fetch all WAITING tickets for this branch
  const constraints = [
    where('branchId', '==', branchId),
    where('status', '==', 'WAITING')
  ];
  if (currentStageId !== undefined) {
    constraints.push(where('currentStageId', '==', currentStageId));
  }

  const q = query(
    collection(db, QUEUES_COLLECTION),
    ...constraints,
    orderBy('sequenceNumber', 'asc') // Fetch in arrival order first
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;

  const tickets = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));

  // 4. Score and Pool each ticket
  const now = Date.now();
  const scoredTickets = tickets.map((t: any) => {
    const group = t.customerGroupId ? customerGroupsMap[t.customerGroupId] : null;
    const priorityLevel = t.priorityLevel || 1;
    const timeMax = group?.timeMax ?? 15;

    // Calculate elapsed time in minutes
    const joinedTime = getMillisFromTimestamp(t.joinedAt || t.createdAt);
    const elapsedMinutes = (now - joinedTime) / 60000;

    const isOvertimeVip = priorityLevel > 1 && elapsedMinutes >= timeMax;

    // Determine counter mapping pool
    let pool: 'primary' | 'secondary' | 'oneStop' | 'ineligible' = 'primary';
    if (counterConfig) {
      if (counterConfig.primaryServiceIds?.includes(t.serviceId)) {
        pool = 'primary';
      } else if (counterConfig.secondaryServiceIds?.includes(t.serviceId)) {
        pool = 'secondary';
      } else if (counterConfig.oneStopServiceIds?.includes(t.serviceId)) {
        pool = 'oneStop';
      } else {
        pool = 'ineligible';
      }
    }

    return {
      ...t,
      isOvertimeVip,
      priorityLevel,
      pool,
      elapsedMinutes
    };
  });

  // Filter out ineligible tickets
  const eligibleTickets = scoredTickets.filter(t => t.pool !== 'ineligible');
  if (eligibleTickets.length === 0) return null;

  // 5. Select the best candidate based on the prioritized pools
  // Priority order:
  // Pool A: Overtime VIPs (across all eligible pools)
  // Pool B: Primary Services (sorted by priorityLevel desc, sequenceNumber asc)
  // Pool C: Secondary Services (sorted by priorityLevel desc, sequenceNumber asc)
  // Pool D: One-Stop Services (sorted by sequenceNumber asc)
  
  let selectedTicket: any = null;

  // Check Pool A: Overtime VIPs
  const overtimeVips = eligibleTickets.filter(t => t.isOvertimeVip);
  if (overtimeVips.length > 0) {
    // Sort by priorityLevel desc, sequenceNumber asc
    overtimeVips.sort((a, b) => {
      if (b.priorityLevel !== a.priorityLevel) {
        return b.priorityLevel - a.priorityLevel;
      }
      return a.sequenceNumber - b.sequenceNumber;
    });
    selectedTicket = overtimeVips[0];
  }

  // Check Pool B: Primary Services
  if (!selectedTicket) {
    const primaryPool = eligibleTickets.filter(t => t.pool === 'primary');
    if (primaryPool.length > 0) {
      primaryPool.sort((a, b) => {
        if (b.priorityLevel !== a.priorityLevel) {
          return b.priorityLevel - a.priorityLevel;
        }
        return a.sequenceNumber - b.sequenceNumber;
      });
      selectedTicket = primaryPool[0];
    }
  }

  // Check Pool C: Secondary Services
  if (!selectedTicket) {
    const secondaryPool = eligibleTickets.filter(t => t.pool === 'secondary');
    if (secondaryPool.length > 0) {
      secondaryPool.sort((a, b) => {
        if (b.priorityLevel !== a.priorityLevel) {
          return b.priorityLevel - a.priorityLevel;
        }
        return a.sequenceNumber - b.sequenceNumber;
      });
      selectedTicket = secondaryPool[0];
    }
  }

  // Check Pool D: One-Stop Services
  if (!selectedTicket) {
    const oneStopPool = eligibleTickets.filter(t => t.pool === 'oneStop');
    if (oneStopPool.length > 0) {
      oneStopPool.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
      selectedTicket = oneStopPool[0];
    }
  }

  if (!selectedTicket) return null;

  // 6. Perform transaction to update status
  const docRef = doc(db, QUEUES_COLLECTION, selectedTicket.id);
  const updatedItem = await runTransaction(db, async (transaction) => {
    const snapRead = await transaction.get(docRef);
    if (!snapRead.exists()) {
      throw new Error('Ticket does not exist');
    }
    const currentData = snapRead.data();
    if (currentData.status !== 'WAITING') {
      throw new Error('Ticket is no longer WAITING');
    }

    const nextCalledCount = (currentData.calledCount || 0) + 1;
    const updatePayload = {
      status: 'CALLED',
      calledByUserId: staffUserId,
      calledByCounter: counter || '',
      calledAt: serverTimestamp(),
      calledCount: nextCalledCount,
      updatedAt: serverTimestamp()
    };

    transaction.update(docRef, updatePayload);
    return { id: selectedTicket.id, ...currentData, ...updatePayload } as unknown as QueueItem;
  });

  return updatedItem;
}

/**
 * Manually call a specific waiting ticket
 */
export async function callSpecificTicket(
  ticketId: string, 
  staffUserId: string, 
  counter?: string
): Promise<void> {
  const docRef = doc(db, QUEUES_COLLECTION, ticketId);
  await runTransaction(db, async (transaction) => {
    const snapRead = await transaction.get(docRef);
    if (!snapRead.exists()) {
      throw new Error('Ticket does not exist');
    }
    const currentData = snapRead.data();
    const nextCalledCount = (currentData.calledCount || 0) + 1;
    
    transaction.update(docRef, {
      status: 'CALLED',
      calledByUserId: staffUserId,
      calledByCounter: counter || '',
      calledAt: serverTimestamp(),
      calledCount: nextCalledCount,
      updatedAt: serverTimestamp()
    });
  });
}

/**
 * Start serving a called ticket
 */
export async function startServingTicket(
  ticketId: string, 
  staffUserId: string, 
  counter?: string
): Promise<void> {
  const docRef = doc(db, QUEUES_COLLECTION, ticketId);
  await updateDoc(docRef, {
    status: 'SERVING',
    calledByUserId: staffUserId,
    calledByCounter: counter || '',
    servingStartedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

/**
 * Complete serving a ticket
 */
export async function completeTicket(ticketId: string): Promise<void> {
  const docRef = doc(db, QUEUES_COLLECTION, ticketId);
  await runTransaction(db, async (transaction) => {
    const snapRead = await transaction.get(docRef);
    if (!snapRead.exists()) {
      throw new Error('Ticket does not exist');
    }
    const currentData = snapRead.data() as QueueItem;
    const updatePayload: Record<string, any> = {
      status: 'COMPLETED',
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (currentData.workflowId && currentData.currentStageId) {
      const history = [...(currentData.workflowHistory || [])];
      const activeEntryIndex = history.findIndex((h) => h.stageId === currentData.currentStageId && !h.exitedAt);
      if (activeEntryIndex !== -1) {
        const activeEntry = history[activeEntryIndex];
        const enteredMs = getMillisFromTimestamp(activeEntry.enteredAt);
        const now = new Date();
        const durationSeconds = Math.max(0, Math.floor((now.getTime() - enteredMs) / 1000));
        history[activeEntryIndex] = {
          ...activeEntry,
          exitedAt: now as any,
          durationSeconds
        };
        updatePayload.workflowHistory = history;
      }
    }

    transaction.update(docRef, updatePayload);
  });
}

/**
 * Mark a ticket as a no-show
 */
export async function markNoShow(ticketId: string): Promise<void> {
  const docRef = doc(db, QUEUES_COLLECTION, ticketId);
  await runTransaction(db, async (transaction) => {
    const snapRead = await transaction.get(docRef);
    if (!snapRead.exists()) return;
    const currentData = snapRead.data() as QueueItem;
    const updatePayload: Record<string, any> = {
      status: 'NO_SHOW',
      noShowAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (currentData.workflowId && currentData.currentStageId) {
      const history = [...(currentData.workflowHistory || [])];
      const activeEntryIndex = history.findIndex((h) => h.stageId === currentData.currentStageId && !h.exitedAt);
      if (activeEntryIndex !== -1) {
        const activeEntry = history[activeEntryIndex];
        const enteredMs = getMillisFromTimestamp(activeEntry.enteredAt);
        const now = new Date();
        const durationSeconds = Math.max(0, Math.floor((now.getTime() - enteredMs) / 1000));
        history[activeEntryIndex] = {
          ...activeEntry,
          exitedAt: now as any,
          durationSeconds
        };
        updatePayload.workflowHistory = history;
      }
    }

    transaction.update(docRef, updatePayload);
  });
}

/**
 * Advance a queue ticket to a target workflow stage
 */
export async function advanceWorkflowStage(
  ticketId: string,
  targetStageId: string,
  staffUserId: string
): Promise<void> {
  const docRef = doc(db, QUEUES_COLLECTION, ticketId);
  await runTransaction(db, async (transaction) => {
    const snapRead = await transaction.get(docRef);
    if (!snapRead.exists()) {
      throw new Error('Ticket does not exist');
    }
    const currentData = snapRead.data() as QueueItem;
    if (!currentData.workflowId || !currentData.currentStageId) {
      throw new Error('Ticket is not in a workflow');
    }

    const now = new Date();
    const history = [...(currentData.workflowHistory || [])];
    const activeEntryIndex = history.findIndex(
      (h) => h.stageId === currentData.currentStageId && !h.exitedAt
    );

    if (activeEntryIndex !== -1) {
      const activeEntry = history[activeEntryIndex];
      const enteredMs = getMillisFromTimestamp(activeEntry.enteredAt);
      const durationSeconds = Math.max(0, Math.floor((now.getTime() - enteredMs) / 1000));
      history[activeEntryIndex] = {
        ...activeEntry,
        exitedAt: now as any,
        durationSeconds,
        assignedUserId: staffUserId
      };
    }

    // Append new stage
    history.push({
      stageId: targetStageId,
      enteredAt: now as any,
      exitedAt: null,
      durationSeconds: null,
      assignedUserId: null,
      assignedResourceId: null
    });

    transaction.update(docRef, {
      currentStageId: targetStageId,
      status: 'WAITING',
      calledByUserId: null,
      calledByCounter: '',
      calledAt: null,
      calledCount: 0,
      servingStartedAt: null,
      workflowHistory: history,
      updatedAt: serverTimestamp()
    });
  });
}

/**
 * Recall a called ticket (repeats sound notification/voice recall)
 */
export async function recallTicket(ticketId: string, counter?: string): Promise<void> {
  const docRef = doc(db, QUEUES_COLLECTION, ticketId);
  await runTransaction(db, async (transaction) => {
    const snapRead = await transaction.get(docRef);
    if (!snapRead.exists()) {
      throw new Error('Ticket does not exist');
    }
    const currentData = snapRead.data();
    const nextCalledCount = (currentData.calledCount || 0) + 1;

    transaction.update(docRef, {
      calledByCounter: counter || '',
      calledAt: serverTimestamp(),
      calledCount: nextCalledCount,
      updatedAt: serverTimestamp()
    });
  });
}

/**
 * Subscribe to the active display queue items (status WAITING or CALLED) in real-time
 */
export function subscribeDisplayQueues(
  branchId: string,
  onNext: (items: QueueItem[]) => void,
  onError: (error: Error) => void
) {
  const q = query(
    collection(db, QUEUES_COLLECTION),
    where('branchId', '==', branchId),
    where('status', 'in', ['WAITING', 'CALLED']),
    orderBy('sequenceNumber', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: QueueItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as QueueItem);
      });
      onNext(items);
    },
    (error) => {
      console.error('[subscribeDisplayQueues]', error);
      onError(error);
    }
  );
}
