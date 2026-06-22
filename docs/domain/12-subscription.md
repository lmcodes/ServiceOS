# ServiceOS — Domain Entity: Subscription

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## Purpose

A Subscription tracks the billing status, subscription plan, and usage limits of a Tenant. It manages active quotas (e.g., maximum branches, users, and daily queues) and integrates directly with Stripe webhook events.

---

## Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | `string` | Auto | Stripe Subscription ID | Matches Stripe Subscription ID |
| `tenantId` | `string` | Yes | — | Parent tenant identifier |
| `plan` | `enum` | Yes | `free` | `free`, `starter`, `professional`, `enterprise` |
| `status` | `enum` | Yes | `incomplete` | `incomplete`, `active`, `past_due`, `cancelled`, `unpaid`, `trialing` |
| `billingCycle` | `enum` | Yes | `monthly` | `monthly`, `annual` |
| `stripeCustomerId` | `string` | Yes | — | Stripe customer identifier |
| `stripePriceId` | `string` | Yes | — | Stripe pricing plan identifier |
| `quantity` | `number` | Yes | `1` | License quantity (e.g., number of branches) |
| `currentPeriodStart` | `Timestamp` | Yes | — | Billing period start timestamp |
| `currentPeriodEnd` | `Timestamp` | Yes | — | Billing period end timestamp |
| `cancelAtPeriodEnd` | `boolean` | Yes | `false` | Whether subscription cancels at end of period |
| `trialStart` | `Timestamp` | No | — | Trial period start |
| `trialEnd` | `Timestamp` | No | — | Trial period end |
| `limits` | `object` | Yes | — | Hard quotas calculated from the plan |
| `limits.branches` | `number` | Yes | `1` | Max branches allowed |
| `limits.usersPerBranch` | `number` | Yes | `2` | Max users allowed per branch |
| `limits.servicesPerBranch`| `number` | Yes | `5` | Max services allowed per branch |
| `limits.queueItemsPerDay` | `number` | Yes | `50` | Max queue operations allowed per day |
| `limits.smsIncluded` | `number` | Yes | `0` | Monthly free SMS allocation |
| `usage` | `object` | Yes | — | Current period usage accumulators |
| `usage.branchesCount` | `number` | Yes | `1` | Current branch count |
| `usage.smsSentThisMonth` | `number` | Yes | `0` | SMS sent during current month |
| `createdAt` | `Timestamp` | Auto | — | — |
| `updatedAt` | `Timestamp` | Auto | — | — |

---

## Relationships

```
Tenant       (1) ──── (1) Subscription
Subscription (1) ──── (N) AuditLog
```

---

## Constraints

| Constraint | Rule |
|---|---|
| C1 | Exactly one subscription record per tenant |
| C2 | If `status == past_due`, notify owner but allow access for 7 days grace |
| C3 | If `status == unpaid` or `suspended`, block all client database write operations except payments |

---

## Validation Rules

| Field | Rule |
|---|---|
| `plan` | Must match one of: `free`, `starter`, `professional`, `enterprise` |
| `status` | Must match Stripe-standard subscription states |
| `limits.*` | Non-negative integers |

---

## Security Rules

| Role | Create | Read | Update | Delete |
|---|---|---|---|---|
| **Owner** | ✗ (system only) | ✓ (own tenant) | ✗ (via Stripe billing portal) | ✗ |
| **Admin/Manager/Staff** | ✗ | ✗ | ✗ | ✗ |
| **Public** | ✗ | ✗ | ✗ | ✗ |

---

## Events

| Event | Trigger | Side Effects |
|---|---|---|
| `subscription.updated` | Stripe Webhook (e.g., plan change) | Update subscription document limits, update user claims, log audit |
| `subscription.pastDue` | Stripe webhook charge failed | Send billing failure notification, log audit |
| `subscription.cancelled` | Period ends / cancelled | Revert tenant to Free tier limits, log audit |
