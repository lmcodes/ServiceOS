# ServiceOS — RBAC & Permission Business Rules

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## PR-01: Token-Based Permission Enforcement

### Description
Validates that API and database queries are authorized using custom claims injected into the user's ID token.

### Preconditions
- User requests access to a Firestore collection or triggers a Cloud Function.
- User is authenticated with Firebase Authentication.

### Actions
1. Extract custom claims from the user's decoded ID token (`request.auth.token`).
2. Verify that `request.auth.token.tenantId` matches the `tenantId` field of the target document.
3. Verify that `request.auth.token.role` is authorized to perform the requested method (Read/Write/Delete) on the document type, matching the Permission Matrix.
4. For non-admin/non-owner roles, verify that the target document's `branchId` is listed in the user's `request.auth.token.branchIds` array.

### Postconditions
- Database operation is approved or rejected by Firestore Security Rules.

### Exceptions
- **E1: Claims Desync**: A user's role was changed, but their local ID token has not refreshed yet. Action: Return `permission-denied`. The client application must detect this error and call `firebase.auth().currentUser.getIdToken(true)` to force-refresh claims.

---

## PR-02: User Invitation and Role Inheritance

### Description
Prevents lower-level staff from inviting users or promoting users to roles higher than their own.

### Preconditions
- A user creates an invite request document or calls the invitation Cloud Function.
- The active user is authenticated and has a valid role.

### Actions
1. Retrieve the active user's role from their custom claims.
2. Verify that the user has the `user.invite` permission (Owner or Admin).
3. Validate the invited user's target role:
   - If active user is `admin`, they can invite `admin`, `manager`, or `staff`. They cannot invite an `owner`.
   - If active user is `owner`, they can invite any role.
4. Create the user invitation document and send the welcome email.

### Postconditions
- Invitation document created with status `invited`.
- Audit log entry records who invited the new user.

### Exceptions
- **E1: Promotion Violation**: An admin attempts to change a user's role to `owner`. Action: Reject operation. Ownership transfers must be done via a dedicated validation function initiated by the current owner.
