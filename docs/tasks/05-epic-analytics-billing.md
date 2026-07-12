# Epic: Analytics & Billing Integration

> Version: 1.0 | Last Updated: 2026-07-12 | Status: Completed

---

## 1. Feature: Analytics Dashboard

### Story: Real-Time Performance Analytics & Metrics
*As a business owner or administrator, I want to view real-time performance analytics and queue metrics, so that I can monitor service efficiency, track busiest operating hours, and plan staffing allocations.*

- **Task ID**: `ANL-01`
- **Estimated Complexity**: High (8 story points)
- **Dependencies**: `QC-01`, `QC-02`
- **Description**: Dashboard view displaying charts and aggregates built from the `dailyMetrics` Firestore sub-collection for each branch.

#### Completed Tasks
- [x] Create Firestore trigger `onQueueItemWrite` (in Cloud Functions) to aggregate daily stats on ticket creation and status updates.
- [x] Implement daily metrics schema in Firestore: `/branches/{branchId}/dailyMetrics/{dateStr}`.
- [x] Build front-end `AnalyticsPage.tsx` interface featuring KPI metrics (Total Tickets, Completed, No-Shows, Avg Wait Time, Avg Service Time).
- [x] Embed interactive charts:
  - Daily queue volume (7 or 30 days range).
  - Average wait and service time trends.
  - Per-service breakdown (donut chart).
  - Busiest hours heatmap.
- [x] Build a mock metrics seeder in development mode (`VITE_USE_FIREBASE_EMULATOR === 'true'`) to populate 30 days of data for local testing.

#### Acceptance Criteria
- Owners and admins can view the dashboard. Managers and Staff are restricted.
- Changing branches or date range (7 days / 30 days) automatically re-fetches and updates the analytics.
- Real-time Firestore trigger correctly updates metrics transactionally on ticket events.

---

## 2. Feature: Stripe Billing Integration

### Story: SaaS Tier Subscription & Payments
*As a business owner, I want to subscribe to pricing tiers (Starter, Professional, Enterprise) and upgrade/downgrade my subscription, so that I can access higher resource limits and advanced features.*

- **Task ID**: `BILL-01`
- **Estimated Complexity**: High (8 story points)
- **Dependencies**: `TS-01`
- **Description**: Front-end subscription page and backend functions integrating Stripe Checkout and Webhooks to manage multi-tenant billing.

#### Completed Tasks
- [x] Set up Stripe SDK inside Firebase Cloud Functions backend.
- [x] Implement `createCheckoutSession` callable Cloud Function generating Stripe session URLs.
- [x] Implement `stripeWebhook` Cloud Function to handle `checkout.session.completed` and `customer.subscription.deleted` events.
- [x] Build `SubscriptionPage.tsx` interface:
  - Displays pricing tiers: Starter ($0), Professional ($29), and Enterprise ($99).
  - Renders resource limit progress bars (branches, staff, services) relative to the active plan.
  - Features mock payment flow and local webhook simulation in Emulator mode.
- [x] Link subscription active status to tenant documents to enforce security rules and resource constraints.

#### Acceptance Criteria
- Clicking "Upgrade" redirects to Stripe Checkout (production) or prompts the simulated Checkout Modal (development/emulator).
- Completing payment triggers a webhook event updating `subscriptions/{tenantId}` and `tenants/{tenantId}`.
- Limits are checked dynamically when creating branches, services, or inviting staff.
