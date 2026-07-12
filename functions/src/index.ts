import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import Stripe from 'stripe';

admin.initializeApp();
const db = admin.firestore();

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
export const onQueueItemWrite = functions.firestore
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
