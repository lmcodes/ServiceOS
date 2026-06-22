# ServiceOS — Billing & Limit Business Rules

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## BR-01: Quota Enforcement (Write Interceptor)

### Description
Prevents tenants from exceeding their subscription limits when creating new branches, services, users, or queues.

### Preconditions
- A create request is initiated for a scoped entity (Branch, Service, User, QueueItem).
- The tenant subscription exists.

### Actions
1. Retrieve the active `subscription` document for the tenant.
2. Read the specific limit for the entity type:
   - For Branch: `limits.branches`
   - For Service: `limits.servicesPerBranch`
   - For User: `limits.usersPerBranch`
   - For QueueItem: `limits.queueItemsPerDay`
3. Query the current active count:
   - For branches: count of branch documents where `tenantId == tenantId` and `status == active`.
   - For services: count of service documents where `branchId == targetBranchId` and `isActive == true`.
   - For users: count of user documents where `tenantId == tenantId` and `status == active`.
   - For queues: read daily aggregator counter or count items created since midnight.
4. If `currentCount >= limit`: block the request and return an over-limit warning.
5. If `currentCount < limit`: allow the creation to proceed.

### Postconditions
- Entity creation completes or is blocked depending on the limits check.

### Exceptions
- **E1: Enterprise Bypass**: Plan is `enterprise`. Action: Bypass limits checks (limit values are set to -1 / unlimited).

---

## BR-02: Payment Failure Grace Period

### Description
Handles the transition from active service to suspension when subscription payments fail.

### Preconditions
- Stripe triggers a `customer.subscription.updated` webhook showing `status: past_due`.

### Actions
1. Update `Subscription.status` to `past_due`.
2. Record the first failed payment date.
3. Send an email alert to the tenant owner notifying them of the failed payment and the 7-day grace period.
4. Keep the tenant status as `active` during the 7-day grace period.
5. If payment is not resolved within 7 days (Stripe triggers `customer.subscription.updated` with status `unpaid` or `cancelled`):
   - Update `Subscription.status` to `suspended` or `cancelled`.
   - Update `Tenant.status` to `suspended`.
   - Block all write operations for all users under the tenant (enforced in Security Rules).

### Postconditions
- Tenant is notified of past due status.
- System transitions to suspended state after 7 days if unresolved.

### Exceptions
- None.

---

## BR-03: SMS Usage Credits

### Description
Prevents sending outbound SMS messages once the monthly tier allotment has been exhausted, unless billing overages are enabled.

### Preconditions
- An event requests sending an SMS notification.
- The subscription is active.

### Actions
1. Retrieve the active `subscription` document.
2. If `usage.smsSentThisMonth >= limits.smsIncluded`:
   - If overages are **disabled**: Block SMS sending and fall back to email or push notifications.
   - If overages are **enabled**: Allow sending, log SMS usage, and enqueue an overage charge ($0.05/SMS) to Stripe metered billing.
3. If `usage.smsSentThisMonth < limits.smsIncluded`:
   - Send the SMS.
   - Increment `usage.smsSentThisMonth` in the subscription document.

### Postconditions
- SMS is sent or blocked. Usage counter updated.
