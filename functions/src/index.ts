import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import Stripe from 'stripe';

admin.initializeApp();
const db = admin.firestore();
const rateLimitCache = new Map<string, number[]>();

/**
 * 1. Auth Trigger: onUserCreated
 * Triggers when a new user signs up in Firebase Auth.
 * Automatically injects custom claims: tenantId, role, branchIds.
 */
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  const uid = user.uid;

  let role = 'owner';
  let tenantId = uid;
  let branchIds: string[] = [];

  try {
    // Check if the user document already exists (e.g. staff created by owner)
    const userDocRef = db.collection('users').doc(uid);
    const userDoc = await userDocRef.get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData) {
        role = userData.role || 'staff';
        tenantId = userData.tenantId || uid;
        branchIds = userData.branchIds || [];
      }
    } else {
      // Check if a tenant already exists for this uid
      const tenantDoc = await db.collection('tenants').doc(uid).get();
      if (tenantDoc.exists) {
        tenantId = uid;
        role = 'owner';
      }
    }

    const claims = { tenantId, role, branchIds };
    await admin.auth().setCustomUserClaims(uid, claims);
    
    console.log(`[onUserCreated] Successfully set custom claims for user ${uid}:`, claims);
  } catch (error) {
    console.error(`[onUserCreated] Failed to set claims for user ${uid}:`, error);
  }
});

/**
 * 2. HTTPS Callable Function: setUserRole
 * Allows owners/admins to update the role and branch assignments of staff members.
 */
export const setUserRole = onCall(async (request) => {
  // Ensure the caller is authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const callerUid = request.auth.uid;
  const callerClaims = request.auth.token;
  const callerTenantId = callerClaims.tenantId as string;
  const callerRole = callerClaims.role as string;

  // Only owner or admin can change user roles
  if (callerRole !== 'owner' && callerRole !== 'admin') {
    throw new HttpsError('permission-denied', 'Only owners or admins can change user roles.');
  }

  const { targetUid, role, branchIds } = request.data;

  if (!targetUid || !role) {
    throw new HttpsError('invalid-argument', 'Missing targetUid or role parameter.');
  }

  // Validate role values
  const validRoles = ['owner', 'admin', 'manager', 'staff'];
  if (!validRoles.includes(role)) {
    throw new HttpsError('invalid-argument', 'Invalid role value.');
  }

  try {
    // Verify target user document exists
    const targetUserDocRef = db.collection('users').doc(targetUid);
    const targetUserDoc = await targetUserDocRef.get();

    if (!targetUserDoc.exists) {
      throw new HttpsError('not-found', 'Target user document not found in Firestore.');
    }

    const targetUserData = targetUserDoc.data();
    if (!targetUserData || targetUserData.tenantId !== callerTenantId) {
      throw new HttpsError('permission-denied', 'Target user does not belong to your tenant.');
    }

    // Set custom claims for target user
    const newClaims = {
      tenantId: callerTenantId,
      role,
      branchIds: branchIds || [],
    };
    await admin.auth().setCustomUserClaims(targetUid, newClaims);

    // Sync state into Firestore users collection
    await targetUserDocRef.update({
      role,
      branchIds: branchIds || [],
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`[setUserRole] Successfully updated role for ${targetUid} by caller ${callerUid}:`, newClaims);
    return { success: true };
  } catch (error) {
    console.error('[setUserRole] Error updating user role:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'Internal error occurred while setting user role.');
  }
});

/**
 * 3. HTTPS Callable Function: inviteStaff
 * Allows owners/admins to invite team members by creating their Firebase Auth account
 * and writing a document to the Firestore users collection with 'invited' status.
 */
export const inviteStaff = onCall(async (request) => {
  // Ensure the caller is authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const callerUid = request.auth.uid;
  const callerClaims = request.auth.token;
  const callerTenantId = callerClaims.tenantId as string;
  const callerRole = callerClaims.role as string;

  // Only owner or admin can invite staff
  if (callerRole !== 'owner' && callerRole !== 'admin') {
    throw new HttpsError('permission-denied', 'Only owners or admins can invite staff.');
  }

  const { email, role, branchIds, name } = request.data;

  if (!email || !role) {
    throw new HttpsError('invalid-argument', 'Missing email or role parameter.');
  }

  // Validate role values
  const validRoles = ['admin', 'manager', 'staff'];
  if (!validRoles.includes(role)) {
    throw new HttpsError('invalid-argument', 'Invalid role value.');
  }

  try {
    let userRecord;
    let isNewUser = false;

    // Check if the user already exists in Firebase Auth
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        // Create user in Auth
        userRecord = await admin.auth().createUser({
          email,
          displayName: name || '',
        });
        isNewUser = true;
      } else {
        throw err;
      }
    }

    const targetUid = userRecord.uid;

    // Set custom claims for the invited/existing user
    const newClaims = {
      tenantId: callerTenantId,
      role,
      branchIds: branchIds || [],
    };
    await admin.auth().setCustomUserClaims(targetUid, newClaims);

    // Sync/Create state in Firestore users collection
    const userDocRef = db.collection('users').doc(targetUid);
    await userDocRef.set({
      id: targetUid,
      name: name || '',
      email,
      role,
      branchIds: branchIds || [],
      tenantId: callerTenantId,
      status: 'invited',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Generate secure password reset/invite link
    const inviteLink = await admin.auth().generatePasswordResetLink(email);

    console.log(`[inviteStaff] Successfully invited user ${targetUid} by caller ${callerUid}`);
    return { success: true, uid: targetUid, inviteLink, isNewUser };
  } catch (error: any) {
    console.error('[inviteStaff] Error inviting staff:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', error.message || 'Failed to invite staff.');
  }
});

/**
 * 4. Firestore Trigger: onQueueItemWrite
 * Aggregates daily queue volume, wait times, service times, and breakdowns per branch.
 */
export const onQueueItemWrite = functions.region('asia-southeast3').firestore
  .document('queues/{queueItemId}')
  .onWrite(async (change) => {
    const beforeData = change.before.exists ? change.before.data() : null;
    const afterData = change.after.exists ? change.after.data() : null;

    const data = afterData || beforeData;
    if (!data) return;

    const { tenantId, branchId, serviceId } = data;
    if (!tenantId || !branchId) return;

    // Use ticket createdAt timestamp or fallback to current time
    const createdAtSeconds = data.createdAt ? (data.createdAt.seconds || data.createdAt._seconds || Math.floor(Date.now() / 1000)) : Math.floor(Date.now() / 1000);
    const date = new Date(createdAtSeconds * 1000);

    let timezone = 'Asia/Bangkok';
    try {
      const branchSnap = await db.collection('branches').doc(branchId).get();
      if (branchSnap.exists) {
        const branchData = branchSnap.data();
        if (branchData && branchData.timezone) {
          timezone = branchData.timezone;
        }
      }
    } catch (err) {
      console.error(`[onQueueItemWrite] Error fetching branch ${branchId}:`, err);
    }

    let dateStr = '2026-07-11';
    try {
      dateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date);
    } catch (err) {
      console.error('[onQueueItemWrite] Error formatting dateStr:', err);
    }

    let hourStr = '09:00';
    try {
      const hr = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        hour12: false
      }).format(date);
      hourStr = `${hr}:00`;
    } catch (err) {
      console.error('[onQueueItemWrite] Error formatting hourStr:', err);
    }

    const metricsDocRef = db
      .collection('branches')
      .doc(branchId)
      .collection('dailyMetrics')
      .doc(dateStr);

    let deltaCreated = 0;
    let deltaCompleted = 0;
    let deltaNoShows = 0;
    let deltaCancelled = 0;

    let deltaWaitTimeSeconds = 0;
    let deltaWaitTimeCount = 0;

    let deltaServiceTimeSeconds = 0;
    let deltaServiceTimeCount = 0;

    const serviceBreakdownDelta: Record<string, number> = {};
    const hourlyTrafficDelta: Record<string, number> = {};

    // Ticket Created
    if (!beforeData && afterData) {
      deltaCreated = 1;
      if (serviceId) serviceBreakdownDelta[serviceId] = 1;
      hourlyTrafficDelta[hourStr] = 1;
    }

    // Ticket Updated Status
    if (beforeData && afterData) {
      const beforeStatus = beforeData.status;
      const afterStatus = afterData.status;

      if (beforeStatus !== afterStatus) {
        if (afterStatus === 'COMPLETED') {
          deltaCompleted = 1;

          // Wait time: servingStartedAt - createdAt
          const startSec = afterData.servingStartedAt?.seconds || afterData.servingStartedAt?._seconds;
          const createdSec = afterData.createdAt?.seconds || afterData.createdAt?._seconds;
          if (startSec && createdSec && startSec >= createdSec) {
            deltaWaitTimeSeconds = startSec - createdSec;
            deltaWaitTimeCount = 1;
          }

          // Service time: completedAt - servingStartedAt
          const completedSec = afterData.completedAt?.seconds || afterData.completedAt?._seconds;
          if (completedSec && startSec && completedSec >= startSec) {
            deltaServiceTimeSeconds = completedSec - startSec;
            deltaServiceTimeCount = 1;
          }
        } else if (afterStatus === 'NO_SHOW') {
          deltaNoShows = 1;
        } else if (afterStatus === 'CANCELLED') {
          deltaCancelled = 1;
        }
      }
    }

    try {
      await db.runTransaction(async (transaction) => {
        const docSnap = await transaction.get(metricsDocRef);
        let currentMetrics = {
          totalQueuesCreated: 0,
          totalQueuesCompleted: 0,
          totalNoShows: 0,
          totalCancelled: 0,
          totalWaitTimeSeconds: 0,
          totalWaitTimeCount: 0,
          totalServiceTimeSeconds: 0,
          totalServiceTimeCount: 0,
          serviceBreakdown: {} as Record<string, number>,
          hourlyTraffic: {} as Record<string, number>
        };

        if (docSnap.exists) {
          const docData = docSnap.data();
          if (docData) {
            currentMetrics = {
              totalQueuesCreated: docData.totalQueuesCreated || 0,
              totalQueuesCompleted: docData.totalQueuesCompleted || 0,
              totalNoShows: docData.totalNoShows || 0,
              totalCancelled: docData.totalCancelled || 0,
              totalWaitTimeSeconds: docData.totalWaitTimeSeconds || 0,
              totalWaitTimeCount: docData.totalWaitTimeCount || 0,
              totalServiceTimeSeconds: docData.totalServiceTimeSeconds || 0,
              totalServiceTimeCount: docData.totalServiceTimeCount || 0,
              serviceBreakdown: docData.serviceBreakdown || {},
              hourlyTraffic: docData.hourlyTraffic || {}
            };
          }
        }

        const nextMetrics = {
          tenantId,
          branchId,
          totalQueuesCreated: currentMetrics.totalQueuesCreated + deltaCreated,
          totalQueuesCompleted: currentMetrics.totalQueuesCompleted + deltaCompleted,
          totalNoShows: currentMetrics.totalNoShows + deltaNoShows,
          totalCancelled: currentMetrics.totalCancelled + deltaCancelled,
          totalWaitTimeSeconds: currentMetrics.totalWaitTimeSeconds + deltaWaitTimeSeconds,
          totalWaitTimeCount: currentMetrics.totalWaitTimeCount + deltaWaitTimeCount,
          totalServiceTimeSeconds: currentMetrics.totalServiceTimeSeconds + deltaServiceTimeSeconds,
          totalServiceTimeCount: currentMetrics.totalServiceTimeCount + deltaServiceTimeCount,
          serviceBreakdown: { ...currentMetrics.serviceBreakdown },
          hourlyTraffic: { ...currentMetrics.hourlyTraffic }
        };

        for (const [sId, count] of Object.entries(serviceBreakdownDelta)) {
          nextMetrics.serviceBreakdown[sId] = (nextMetrics.serviceBreakdown[sId] || 0) + count;
        }
        for (const [hStr, count] of Object.entries(hourlyTrafficDelta)) {
          nextMetrics.hourlyTraffic[hStr] = (nextMetrics.hourlyTraffic[hStr] || 0) + count;
        }

        const avgWaitTimeSeconds = nextMetrics.totalWaitTimeCount > 0 
          ? Math.round(nextMetrics.totalWaitTimeSeconds / nextMetrics.totalWaitTimeCount) 
          : 0;
        const avgServiceTimeSeconds = nextMetrics.totalServiceTimeCount > 0 
          ? Math.round(nextMetrics.totalServiceTimeSeconds / nextMetrics.totalServiceTimeCount) 
          : 0;

        transaction.set(metricsDocRef, {
          ...nextMetrics,
          avgWaitTimeSeconds,
          avgServiceTimeSeconds,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      });
      console.log(`[onQueueItemWrite] Updated metrics for branch ${branchId} on date ${dateStr}`);
    } catch (err) {
      console.error('[onQueueItemWrite] Error in metrics transaction:', err);
    }
  });

/**
 * 5. HTTPS Callable Function: createCheckoutSession
 * Generates Stripe Checkout url or local mock payment url.
 */
export const createCheckoutSession = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const tenantId = request.auth.token.tenantId as string;
  const { planId, successUrl, cancelUrl } = request.data;

  if (!planId || !successUrl || !cancelUrl) {
    throw new HttpsError('invalid-argument', 'Missing planId, successUrl or cancelUrl');
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    // Return mock checkout url
    const mockUrl = `${successUrl}?mock_checkout=true&planId=${planId}`;
    return { url: mockUrl };
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-04-10' as any });
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `ServiceOS ${planId.toUpperCase()} Plan`,
            },
            unit_amount: planId === 'professional' ? 2900 : 9900,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      metadata: { tenantId, planId },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    return { url: session.url };
  } catch (error: any) {
    console.error('Error creating Stripe session:', error);
    throw new HttpsError('internal', error.message || 'Stripe error');
  }
});

/**
 * 6. HTTPS HTTP Webhook Function: stripeWebhook
 * Listens to stripe events to activate or cancel subscriptions.
 */
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, stripe-signature');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const sig = req.headers['stripe-signature'];

  let event: any;

  if (process.env.FUNCTIONS_EMULATOR === 'true' && (!stripeKey || !sig)) {
    console.log('[stripeWebhook] Mock Webhook triggered in emulator mode');
    event = req.body;
  } else {
    if (!stripeKey || !sig) {
      res.status(400).send('Missing signature or stripe key');
      return;
    }
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-04-10' as any });
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }
  }

  const session = event.data.object;
  const now = new Date();

  try {
    if (event.type === 'checkout.session.completed') {
      const tenantId = session.metadata?.tenantId;
      const planId = session.metadata?.planId || 'professional';
      if (tenantId) {
        await db.collection('subscriptions').doc(tenantId).set({
          tenantId,
          status: 'active',
          stripeSubscriptionId: session.subscription || 'mock_sub_id',
          stripeCustomerId: session.customer || 'mock_cust_id',
          planId,
          limits: {
            branches: planId === 'professional' ? 10 : 9999,
            servicesPerBranch: planId === 'professional' ? 20 : 9999,
            usersPerBranch: planId === 'professional' ? 50 : 9999,
            queueItemsPerDay: planId === 'professional' ? 500 : 99999,
            smsIncluded: planId === 'professional' ? 100 : 1000
          },
          usage: {
            smsSentThisMonth: 0,
            queuesCreatedThisMonth: 0
          },
          currentPeriodEndsAt: admin.firestore.Timestamp.fromDate(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)),
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });

        await db.collection('tenants').doc(tenantId).update({
          subscriptionId: session.subscription || 'mock_sub_id',
          updatedAt: FieldValue.serverTimestamp()
        });
        console.log(`[stripeWebhook] Activated subscription for tenant ${tenantId} on plan ${planId}`);
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const query = await db.collection('subscriptions')
        .where('stripeSubscriptionId', '==', session.id)
        .limit(1)
        .get();

      if (!query.empty) {
        const subDoc = query.docs[0];
        const tenantId = subDoc.id;
        await subDoc.ref.update({
          status: 'cancelled',
          updatedAt: FieldValue.serverTimestamp()
        });
        await db.collection('tenants').doc(tenantId).update({
          subscriptionId: '',
          updatedAt: FieldValue.serverTimestamp()
        });
        console.log(`[stripeWebhook] Subscription cancelled for tenant ${tenantId}`);
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error handling webhook event:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * 7. Public REST API Endpoint: api
 * Serves /queues endpoints with authorization via API keys.
 */
export const api = functions.https.onRequest(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  let apiKey = req.headers['x-api-key'] as string;
  if (!apiKey && req.headers.authorization?.startsWith('Bearer ')) {
    apiKey = req.headers.authorization.split(' ')[1];
  }

  if (!apiKey) {
    res.status(401).json({ error: 'Unauthorized: Missing API Key' });
    return;
  }

  // Rate Limiting Check (100 requests per minute)
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  const timestamps = rateLimitCache.get(apiKey) || [];
  const activeTimestamps = timestamps.filter(t => t > oneMinuteAgo);
  activeTimestamps.push(now);
  rateLimitCache.set(apiKey, activeTimestamps);

  if (activeTimestamps.length > 100) {
    res.status(429).json({ error: 'Too Many Requests: Rate limit exceeded (100 requests per minute)' });
    return;
  }

  try {
    const apiKeyQuery = await db.collection('apiKeys')
      .where('secret', '==', apiKey)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (apiKeyQuery.empty) {
      res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
      return;
    }

    const keyDoc = apiKeyQuery.docs[0];
    const tenantId = keyDoc.data().tenantId;

    const path = req.path || req.url?.split('?')[0] || '';
    const cleanPath = path.replace(/^\/api\/v1/, '').replace(/^\/v1/, '').replace(/^\//, '');
    const pathParts = cleanPath.split('/').filter(Boolean);

    if (pathParts[0] === 'queues') {
      // GET /queues -> list queues for a branch
      if (req.method === 'GET' && pathParts.length === 1) {
        const branchId = req.query.branchId as string;
        if (!branchId) {
          res.status(400).json({ error: 'Missing query parameter: branchId' });
          return;
        }

        const branchDoc = await db.collection('branches').doc(branchId).get();
        if (!branchDoc.exists || branchDoc.data()?.tenantId !== tenantId) {
          res.status(404).json({ error: 'Branch not found or unauthorized' });
          return;
        }

        const queuesQuery = await db.collection('queues')
          .where('tenantId', '==', tenantId)
          .where('branchId', '==', branchId)
          .orderBy('createdAt', 'desc')
          .get();

        const queueList = queuesQuery.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json({ queues: queueList });
        return;
      }

      // POST /queues -> create queue item
      if (req.method === 'POST' && pathParts.length === 1) {
        const { branchId, serviceId, customerName, customerPhone, customerEmail, customFields } = req.body;
        if (!branchId || !serviceId || !customerName) {
          res.status(400).json({ error: 'Missing required fields: branchId, serviceId, customerName' });
          return;
        }

        const branchRef = db.collection('branches').doc(branchId);
        const branchSnap = await branchRef.get();
        if (!branchSnap.exists || branchSnap.data()?.tenantId !== tenantId) {
          res.status(404).json({ error: 'Branch not found or unauthorized' });
          return;
        }

        const serviceRef = db.collection('services').doc(serviceId);
        const serviceSnap = await serviceRef.get();
        if (!serviceSnap.exists || serviceSnap.data()?.tenantId !== tenantId) {
          res.status(404).json({ error: 'Service not found or unauthorized' });
          return;
        }

        const serviceData = serviceSnap.data() || {};
        let workflowId = null;
        let currentStageId = null;
        let workflowHistory: any[] = [];

        if (serviceData.workflowId) {
          const workflowSnap = await db.collection('workflows').doc(serviceData.workflowId).get();
          if (workflowSnap.exists) {
            const workflowData = workflowSnap.data() || {};
            const stageIds = workflowData.stageIds || [];
            if (stageIds.length > 0) {
              workflowId = serviceData.workflowId;
              currentStageId = stageIds[0];
              workflowHistory = [{
                stageId: currentStageId,
                enteredAt: new Date(),
                exitedAt: null,
                durationSeconds: null,
                assignedUserId: null,
                assignedResourceId: null
              }];
            }
          }
        }

        const queueDocRef = db.collection('queues').doc();
        let formattedQueueNumber = '';

        await db.runTransaction(async (transaction) => {
          const freshBranchSnap = await transaction.get(branchRef);
          if (!freshBranchSnap.exists) {
            throw new Error('Branch not found');
          }
          const freshBranchData = freshBranchSnap.data() || {};

          const timezone = freshBranchData.timezone || 'Asia/Bangkok';
          let todayStr = '2026-07-12';
          try {
            todayStr = new Intl.DateTimeFormat('en-CA', {
              timeZone: timezone,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            }).format(new Date());
          } catch (err) {}

          let nextQueueNumber = 1;
          const lastResetDate = freshBranchData.lastDailyResetDate;

          if (lastResetDate === todayStr) {
            nextQueueNumber = (freshBranchData.currentQueueNumber || 0) + 1;
          }

          transaction.update(branchRef, {
            currentQueueNumber: nextQueueNumber,
            lastDailyResetDate: todayStr,
            updatedAt: FieldValue.serverTimestamp()
          });

          const prefix = freshBranchData.queuePrefix || 'A';
          formattedQueueNumber = `${prefix}-${String(nextQueueNumber).padStart(3, '0')}`;

          const newQueueItem = {
            tenantId,
            branchId,
            serviceId,
            queueNumber: formattedQueueNumber,
            sequenceNumber: Date.now(),
            customerName,
            customerPhone: customerPhone || '',
            customerEmail: customerEmail || '',
            status: 'WAITING',
            priority: 0,
            calledCount: 0,
            customData: customFields || {},
            workflowId,
            currentStageId,
            workflowHistory,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          };

          transaction.set(queueDocRef, newQueueItem);
        });

        res.status(201).json({ id: queueDocRef.id, queueNumber: formattedQueueNumber });
        return;
      }

      // GET /queues/:id -> get status
      if (req.method === 'GET' && pathParts.length === 2) {
        const queueItemId = pathParts[1];
        const queueDoc = await db.collection('queues').doc(queueItemId).get();
        if (!queueDoc.exists || queueDoc.data()?.tenantId !== tenantId) {
          res.status(404).json({ error: 'Queue item not found or unauthorized' });
          return;
        }

        res.status(200).json({ id: queueDoc.id, ...queueDoc.data() });
        return;
      }

      // POST /queues/:id/cancel -> cancel queue item
      if (req.method === 'POST' && pathParts.length === 3 && pathParts[2] === 'cancel') {
        const queueItemId = pathParts[1];
        const queueRef = db.collection('queues').doc(queueItemId);
        const queueDoc = await queueRef.get();
        if (!queueDoc.exists || queueDoc.data()?.tenantId !== tenantId) {
          res.status(404).json({ error: 'Queue item not found or unauthorized' });
          return;
        }

        if (queueDoc.data()?.status !== 'WAITING') {
          res.status(400).json({ error: 'Only WAITING queue items can be cancelled' });
          return;
        }

        await queueRef.update({
          status: 'CANCELLED',
          updatedAt: FieldValue.serverTimestamp()
        });

        res.status(200).json({ success: true, message: 'Queue item cancelled successfully' });
        return;
      }
    }

    if (pathParts[0] === 'webhooks') {
      // POST /webhooks/:id/test
      if (req.method === 'POST' && pathParts[2] === 'test') {
        const webhookId = pathParts[1];
        const webhookDoc = await db.collection('webhooks').doc(webhookId).get();
        if (!webhookDoc.exists || webhookDoc.data()?.tenantId !== tenantId) {
          res.status(404).json({ error: 'Webhook not found or unauthorized' });
          return;
        }

        const webhook = webhookDoc.data()!;
        const url = webhook.url;
        const secret = webhook.secret;

        const pingPayload = {
          event: 'ping.test',
          id: 'ping-' + Date.now(),
          timestamp: new Date().toISOString(),
          data: {
            message: 'Webhook configuration test successful',
            tenantId
          }
        };

        const body = JSON.stringify(pingPayload);
        const crypto = require('crypto');
        const signature = crypto.createHmac('sha256', secret || '').update(body).digest('hex');

        let statusCode = 0;
        let responseText = '';
        let errorMessage = '';

        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-svcos-signature': signature
            },
            body
          });
          statusCode = response.status;
          responseText = await response.text();
          if (!response.ok) {
            errorMessage = responseText;
          }
        } catch (err: any) {
          errorMessage = err.message || 'Fetch failed';
          statusCode = 500;
        }

        // Record a log in webhookLogs
        const logDocRef = db.collection('webhookLogs').doc();
        await logDocRef.set({
          tenantId,
          webhookId,
          eventType: 'ping.test',
          url,
          payload: body,
          statusCode,
          errorMessage: errorMessage.substring(0, 1000),
          attempts: 1,
          status: statusCode >= 200 && statusCode < 300 ? 'success' : 'failed',
          deliveredAt: FieldValue.serverTimestamp()
        });

        res.status(200).json({
          success: statusCode >= 200 && statusCode < 300,
          statusCode,
          body: responseText || errorMessage
        });
        return;
      }
    }

    if (pathParts[0] === 'webhook-logs') {
      // POST /webhook-logs/:id/redeliver
      if (req.method === 'POST' && pathParts[2] === 'redeliver') {
        const logId = pathParts[1];
        const logDoc = await db.collection('webhookLogs').doc(logId).get();
        if (!logDoc.exists || logDoc.data()?.tenantId !== tenantId) {
          res.status(404).json({ error: 'Webhook log not found or unauthorized' });
          return;
        }

        const logData = logDoc.data()!;
        const webhookId = logData.webhookId;
        const webhookDoc = await db.collection('webhooks').doc(webhookId).get();
        if (!webhookDoc.exists) {
          res.status(404).json({ error: 'Webhook configuration no longer exists' });
          return;
        }

        const webhook = webhookDoc.data()!;
        const url = webhook.url;
        const secret = webhook.secret;
        const payload = JSON.parse(logData.payload);

        // Update timestamp in payload
        payload.timestamp = new Date().toISOString();

        const body = JSON.stringify(payload);
        const crypto = require('crypto');
        const signature = crypto.createHmac('sha256', secret || '').update(body).digest('hex');

        let statusCode = 0;
        let errorMessage = '';

        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-svcos-signature': signature
            },
            body
          });
          statusCode = response.status;
          if (!response.ok) {
            errorMessage = await response.text();
          }
        } catch (err: any) {
          errorMessage = err.message || 'Fetch failed';
          statusCode = 500;
        }

        const logDocRef = db.collection('webhookLogs').doc();
        await logDocRef.set({
          tenantId,
          webhookId,
          eventType: logData.eventType + '.redeliver',
          url,
          payload: body,
          statusCode,
          errorMessage: errorMessage.substring(0, 1000),
          attempts: 1,
          status: statusCode >= 200 && statusCode < 300 ? 'success' : 'failed',
          deliveredAt: FieldValue.serverTimestamp()
        });

        res.status(200).json({
          success: statusCode >= 200 && statusCode < 300,
          statusCode
        });
        return;
      }
    }

    res.status(404).json({ error: `Not Found: ${req.method} ${path}` });
  } catch (error: any) {
    console.error('[api] Error processing request:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

/**
 * 8. Firestore Trigger: onQueueItemWriteWebhook
 * Sends webhook notification to registered URLs when queue items change status.
 */
export const onQueueItemWriteWebhook = functions.region('asia-southeast3').firestore
  .document('queues/{queueItemId}')
  .onWrite(async (change, context) => {
    const queueItemId = context.params.queueItemId;
    const beforeData = change.before.exists ? change.before.data() : null;
    const afterData = change.after.exists ? change.after.data() : null;

    if (!afterData) {
      return;
    }

    const tenantId = afterData.tenantId;
    if (!tenantId) return;

    let eventType = 'queue.updated';
    if (!beforeData) {
      eventType = 'queue.created';
    } else if (beforeData.status !== afterData.status) {
      if (afterData.status === 'WAITING') {
        eventType = 'queue.created';
      } else if (afterData.status === 'SERVING') {
        eventType = 'queue.serving';
      } else if (afterData.status === 'COMPLETED') {
        eventType = 'queue.completed';
      } else if (afterData.status === 'CANCELLED') {
        eventType = 'queue.cancelled';
      } else if (afterData.status === 'NO_SHOW') {
        eventType = 'queue.noshow';
      }
    } else {
      // No status change, skip
      return;
    }

    const webhooksQuery = await db.collection('webhooks')
      .where('tenantId', '==', tenantId)
      .where('isActive', '==', true)
      .get();

    if (webhooksQuery.empty) return;

    const payload = {
      event: eventType,
      id: queueItemId,
      timestamp: new Date().toISOString(),
      data: {
        queueItemId,
        tenantId: afterData.tenantId,
        branchId: afterData.branchId,
        serviceId: afterData.serviceId,
        queueNumber: afterData.queueNumber,
        status: afterData.status,
        customerName: afterData.customerName,
        customerPhone: afterData.customerPhone,
        customerEmail: afterData.customerEmail,
        createdAt: afterData.createdAt ? new Date(afterData.createdAt.seconds * 1000).toISOString() : null,
        updatedAt: afterData.updatedAt ? new Date(afterData.updatedAt.seconds * 1000).toISOString() : null
      }
    };

    const promises = webhooksQuery.docs.map(async (docSnap) => {
      const webhook = docSnap.data();
      const url = webhook.url;
      const secret = webhook.secret;
      const events = webhook.events || [];

      if (events.length > 0 && !events.includes(eventType)) {
        return;
      }

      const logDocRef = db.collection('webhookLogs').doc();
      let statusCode = 0;
      let errorMessage = '';
      let attempt = 0;
      const maxAttempts = 3;
      let success = false;

      const body = JSON.stringify(payload);
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', secret || '').update(body).digest('hex');

      while (attempt < maxAttempts && !success) {
        attempt++;
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-svcos-signature': signature
            },
            body
          });

          statusCode = response.status;
          if (response.ok) {
            success = true;
            errorMessage = '';
          } else {
            errorMessage = await response.text();
          }
        } catch (err: any) {
          errorMessage = err.message || 'Fetch failed';
          statusCode = 500;
        }

        if (!success && attempt < maxAttempts) {
          // Exponential backoff: 1s, 2s
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }
      }

      await logDocRef.set({
        tenantId,
        webhookId: docSnap.id,
        eventType,
        url,
        payload: JSON.stringify(payload),
        statusCode,
        errorMessage: errorMessage.substring(0, 1000),
        attempts: attempt,
        status: success ? 'success' : 'failed',
        deliveredAt: FieldValue.serverTimestamp()
      });
    });

    await Promise.all(promises);
  });

