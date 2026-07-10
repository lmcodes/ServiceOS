# Epic: Tenant Onboarding & User Authentication

> Version: 1.0 | Last Updated: 2026-07-10 | Status: Completed

---

## 1. Feature: Account Setup & Auth Flows

### Story: Self-Service Tenant Registration
*As a business owner, I want to sign up for ServiceOS and create my tenant workspace, so that I can configure my branches.*

- **Task ID**: `TS-01`
- **Estimated Complexity**: Medium (5 story points)
- **Dependencies**: None
- **Description**: Implement email/password and Google OAuth signup forms that initiate the Tenant creation pipeline.

#### Subtasks
- [x] Create signup page with email input and password confirmation.
- [x] Configure Firebase Auth providers in the Firebase console.
- [x] Build `AuthContext` provider in React to track active user state.
- [x] Implement Tenant creation helper: writes custom tenant document to `/tenants/{tenantId}` containing initial profile and status `pending_onboarding`.
- [x] Set up basic React Router routes redirecting newly created users to the dashboard.

#### Acceptance Criteria
- User can successfully register using a new email address or Google account.
- Successful registration creates both a Firebase Auth entry and a corresponding `tenants` document in Firestore.
- Redirects user to `/onboarding` tenant metadata form immediately.

---

### Story: Onboarding Form (Tenant Profile Setup)
*As a new business owner, I want to set up my organization details on first sign-in, so that my dashboard represents my brand correctly.*

- **Task ID**: `TS-01b`
- **Estimated Complexity**: Low (3 story points)
- **Dependencies**: `TS-01`
- **Description**: Design and implement the Onboarding form component, handling details like Business Name, Type, Phone, and Timezone, and updating the tenant document state.

#### Subtasks
- [x] Create `/onboarding` route and form page.
- [x] Build form fields: Business Name, Business Type (dropdown), Phone, and Timezone.
- [x] Implement onboarding form handler updating tenant state to `active` in Firestore.
- [x] Resolve delay and fallback logic for newly registered profiles (get/set fallback).

#### Acceptance Criteria
- User is forced to complete the onboarding flow if their tenant profile status is pending.
- Submitting the onboarding form updates Firestore and redirects user to `/dashboard`.

---

### Story: Multi-Language & Theme Setup
*As a user, I want to toggle between Thai/English and Light/Dark themes across all pages, so that the app matches my preferred visual and language style.*

- **Task ID**: `TS-01c`
- **Estimated Complexity**: Medium (5 story points)
- **Dependencies**: `TS-01`
- **Description**: Set up i18n dictionary and Theme Context to enable reactive translation and theme changes.

#### Subtasks
- [x] Set up class-based dark mode in Tailwind configuration.
- [x] Create translation dictionary `src/shared/translations.ts` supporting TH/EN.
- [x] Build `LanguageContext` and `ThemeContext` providers.
- [x] Implement floating and inline `SettingsSwitcher` components.
- [x] Update all layouts (`AuthLayout`, `DashboardLayout`, `PublicLayout`, `DisplayLayout`) to support light/dark modes and multi-language keys.
- [x] Refactor all mock routes and skeleton pages to be fully translated and responsive.

#### Acceptance Criteria
- Users can switch between Thai and English instantly, with translations updating React components on the fly.
- Users can toggle dark/light mode with CSS colors updating smoothly.
- Settings are persisted in `localStorage`.

---

## 2. Feature: Role-Based Access Control (RBAC)

### Story: Inject Roles into User Tokens
*As an administrator, I want staff permissions to be enforced by the database, so that staff cannot access billing settings.*

- **Task ID**: `TS-02`
- **Estimated Complexity**: High (8 story points)
- **Dependencies**: `TS-01`
- **Description**: Build a Cloud Function trigger that intercepts user metadata updates, verifies permissions, and injects Custom Claims (tenantId, role, branchIds) into the Firebase Auth token.

#### Subtasks
- [x] Create Cloud Function `onUserCreated` triggered on Auth register.
- [x] Write logic inside function validating target role permissions.
- [x] Call `admin.auth().setCustomUserClaims(uid, claims)` to inject values.
- [x] Implement client-side claim verification to display dashboard panels selectively depending on role.

#### Acceptance Criteria
- User custom claims are correctly generated upon account creation or role update.
- Users with the role `staff` are blocked by security rules when attempting reads/writes on `/subscriptions` or `/auditLogs`.
- Tokens refresh correctly on the client side when branch assignments are updated.
