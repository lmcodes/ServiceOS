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
- **Description**: Set up react-i18next and Theme Context to enable reactive translation and theme changes. The i18n system uses `react-i18next` as the sole standard — no custom context or flat dictionary allowed.

#### Subtasks
- [x] Set up class-based dark mode in Tailwind configuration.
- [x] Install `react-i18next`, `i18next`, `i18next-browser-languagedetector`.
- [x] Create `src/config/i18n.ts` — initialize i18next with LanguageDetector (localStorage key: `locale`).
- [x] Create `src/locales/th/translation.json` and `src/locales/en/translation.json` with namespaced keys.
- [x] Build `ThemeContext` provider for dark/light mode toggling.
- [x] Implement floating and inline `SettingsSwitcher` components using `i18n.changeLanguage()`.
- [x] Update all layouts (`AuthLayout`, `DashboardLayout`, `PublicLayout`, `DisplayLayout`) to use `useTranslation` from react-i18next.
- [x] Refactor all auth components (`LoginForm`, `SignupForm`, `ForgotPasswordForm`, `OnboardingForm`) — replace all inline ternaries with `t()` namespaced keys.
- [x] Refactor all mock routes and skeleton pages in `AppRoutes.tsx` to use `t()` with i18next interpolation `{{var}}`.
- [x] Remove legacy `src/context/LanguageContext.tsx` and `src/shared/translations.ts`.

#### Acceptance Criteria
- Users can switch between Thai and English instantly, with translations updating React components on the fly.
- Users can toggle dark/light mode with CSS colors updating smoothly.
- Language preference is persisted in `localStorage` (key: `locale`) via i18next-browser-languagedetector.
- **Zero inline ternaries**: No component uses `locale === 'th' ? '...' : '...'` pattern.
- **Zero custom context**: `useTranslation` is always imported from `react-i18next`, never from a local file.
- All translation keys follow namespaced dot-notation: `namespace.key` (e.g. `login.emailLabel`).

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
