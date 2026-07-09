"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUserRole = exports.onUserCreated = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const https_1 = require("firebase-functions/v2/https");
admin.initializeApp();
const db = admin.firestore();
/**
 * 1. Auth Trigger: onUserCreated
 * Triggers when a new user signs up in Firebase Auth.
 * Automatically injects custom claims: tenantId, role, branchIds.
 */
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
    const uid = user.uid;
    let role = 'owner';
    let tenantId = uid;
    let branchIds = [];
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
        }
        else {
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
    }
    catch (error) {
        console.error(`[onUserCreated] Failed to set claims for user ${uid}:`, error);
    }
});
/**
 * 2. HTTPS Callable Function: setUserRole
 * Allows owners/admins to update the role and branch assignments of staff members.
 */
exports.setUserRole = (0, https_1.onCall)(async (request) => {
    // Ensure the caller is authenticated
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const callerUid = request.auth.uid;
    const callerClaims = request.auth.token;
    const callerTenantId = callerClaims.tenantId;
    const callerRole = callerClaims.role;
    // Only owner or admin can change user roles
    if (callerRole !== 'owner' && callerRole !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Only owners or admins can change user roles.');
    }
    const { targetUid, role, branchIds } = request.data;
    if (!targetUid || !role) {
        throw new https_1.HttpsError('invalid-argument', 'Missing targetUid or role parameter.');
    }
    // Validate role values
    const validRoles = ['owner', 'admin', 'manager', 'staff'];
    if (!validRoles.includes(role)) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid role value.');
    }
    try {
        // Verify target user document exists
        const targetUserDocRef = db.collection('users').doc(targetUid);
        const targetUserDoc = await targetUserDocRef.get();
        if (!targetUserDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Target user document not found in Firestore.');
        }
        const targetUserData = targetUserDoc.data();
        if (!targetUserData || targetUserData.tenantId !== callerTenantId) {
            throw new https_1.HttpsError('permission-denied', 'Target user does not belong to your tenant.');
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
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`[setUserRole] Successfully updated role for ${targetUid} by caller ${callerUid}:`, newClaims);
        return { success: true };
    }
    catch (error) {
        console.error('[setUserRole] Error updating user role:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Internal error occurred while setting user role.');
    }
});
//# sourceMappingURL=index.js.map