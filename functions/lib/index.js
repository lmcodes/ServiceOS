"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inviteStaff = exports.setUserRole = exports.onUserCreated = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
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
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
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
/**
 * 3. HTTPS Callable Function: inviteStaff
 * Allows owners/admins to invite team members by creating their Firebase Auth account
 * and writing a document to the Firestore users collection with 'invited' status.
 */
exports.inviteStaff = (0, https_1.onCall)(async (request) => {
    // Ensure the caller is authenticated
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const callerUid = request.auth.uid;
    const callerClaims = request.auth.token;
    const callerTenantId = callerClaims.tenantId;
    const callerRole = callerClaims.role;
    // Only owner or admin can invite staff
    if (callerRole !== 'owner' && callerRole !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Only owners or admins can invite staff.');
    }
    const { email, role, branchIds, name } = request.data;
    if (!email || !role) {
        throw new https_1.HttpsError('invalid-argument', 'Missing email or role parameter.');
    }
    // Validate role values
    const validRoles = ['admin', 'manager', 'staff'];
    if (!validRoles.includes(role)) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid role value.');
    }
    try {
        let userRecord;
        let isNewUser = false;
        // Check if the user already exists in Firebase Auth
        try {
            userRecord = await admin.auth().getUserByEmail(email);
        }
        catch (err) {
            if (err.code === 'auth/user-not-found') {
                // Create user in Auth
                userRecord = await admin.auth().createUser({
                    email,
                    displayName: name || '',
                });
                isNewUser = true;
            }
            else {
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
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        // Generate secure password reset/invite link
        const inviteLink = await admin.auth().generatePasswordResetLink(email);
        console.log(`[inviteStaff] Successfully invited user ${targetUid} by caller ${callerUid}`);
        return { success: true, uid: targetUid, inviteLink, isNewUser };
    }
    catch (error) {
        console.error('[inviteStaff] Error inviting staff:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', error.message || 'Failed to invite staff.');
    }
});
//# sourceMappingURL=index.js.map