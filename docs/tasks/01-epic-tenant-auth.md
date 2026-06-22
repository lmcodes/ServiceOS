# Epic: Tenant Onboarding & User Authentication

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## 1. Feature: Account Setup & Auth Flows

### Story: Self-Service Tenant Registration
*As a business owner, I want to sign up for ServiceOS and create my tenant workspace, so that I can configure my branches.*

- **Task ID**: `TS-01`
- **Estimated Complexity**: Medium (5 story points)
- **Dependencies**: None
- **Description**: Implement email/password and Google OAuth signup forms that initiate the Tenant creation pipeline.

#### Subtasks
- [ ] Create signup page with email input and password confirmation.
- [ ] Configure Firebase Auth providers in the Firebase console.
- [ ] Build `AuthContext` provider in React to track active user state.
- [ ] Implement Tenant creation helper: writes custom tenant document to `/tenants/{tenantId}` containing initial profile and status `active`.
- [ ] Set up basic React Router routes redirecting newly created users to the dashboard.

#### Acceptance Criteria
- User can successfully register using a new email address or Google account.
- Successful registration creates both a Firebase Auth entry and a corresponding `tenants` document in Firestore.
- Redirects user to `/signup` tenant metadata form immediately.

---

## 2. Feature: Role-Based Access Control (RBAC)

### Story: Inject Roles into User Tokens
*As an administrator, I want staff permissions to be enforced by the database, so that staff cannot access billing settings.*

- **Task ID**: `TS-02`
- **Estimated Complexity**: High (8 story points)
- **Dependencies**: `TS-01`
- **Description**: Build a Cloud Function trigger that intercepts user metadata updates, verifies permissions, and injects Custom Claims (tenantId, role, branchIds) into the Firebase Auth token.

#### Subtasks
- [ ] Create Cloud Function `onUserCreated` triggered on Auth register.
- [ ] Write logic inside function validating target role permissions.
- [ ] Call `admin.auth().setCustomUserClaims(uid, claims)` to inject values.
- [ ] Implement client-side claim verification to display dashboard panels selectively depending on role.

#### Acceptance Criteria
- User custom claims are correctly generated upon account creation or role update.
- Users with the role `staff` are blocked by security rules when attempting reads/writes on `/subscriptions` or `/auditLogs`.
- Tokens refresh correctly on the client side when branch assignments are updated.
