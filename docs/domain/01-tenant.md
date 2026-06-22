# ServiceOS — Domain Entity: Tenant

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## Purpose

The Tenant is the top-level organizational entity representing a single business customer. All data in ServiceOS is scoped to a tenant. A tenant may operate one or more branches. Tenant isolation is the foundational security boundary.

---

## Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | `string` | Auto | Firestore auto-ID | Unique tenant identifier |
| `name` | `string` | Yes | — | Business display name |
| `slug` | `string` | Yes | Generated from name | URL-safe identifier (unique) |
| `businessType` | `enum` | Yes | — | `restaurant`, `clinic`, `salon`, `repair_shop`, `service_center` |
| `ownerId` | `string` | Yes | — | Firebase Auth UID of the owner |
| `email` | `string` | Yes | — | Primary contact email |
| `phone` | `string` | No | — | Primary contact phone |
| `address` | `object` | No | — | `{ street, city, state, postalCode, country }` |
| `logo` | `string` | No | — | Firebase Storage URL |
| `settings` | `object` | No | `{}` | Tenant-level configuration |
| `settings.timezone` | `string` | No | `Asia/Bangkok` | IANA timezone |
| `settings.locale` | `string` | No | `th` | Language locale |
| `settings.currency` | `string` | No | `THB` | ISO currency code |
| `settings.dateFormat` | `string` | No | `DD/MM/YYYY` | Display date format |
| `status` | `enum` | Yes | `active` | `active`, `suspended`, `cancelled` |
| `subscriptionId` | `string` | No | — | Reference to subscription document |
| `createdAt` | `Timestamp` | Auto | Server timestamp | Creation time |
| `updatedAt` | `Timestamp` | Auto | Server timestamp | Last modification time |

---

## Relationships

```
Tenant (1) ──── (N) Branch
Tenant (1) ──── (N) User (via tenantUsers)
Tenant (1) ──── (1) Subscription
Tenant (1) ──── (N) AuditLog
```

- **Branches**: A tenant has 1..N branches. Branch limit enforced by subscription.
- **Users**: Users belong to exactly one tenant. RBAC scoped within tenant.
- **Subscription**: Exactly one active subscription per tenant at any time.
- **Audit Logs**: All tenant actions logged with `tenantId` for filtering.

---

## Constraints

| Constraint | Rule |
|---|---|
| C1 | `slug` must be globally unique |
| C2 | `ownerId` must reference a valid Firebase Auth user |
| C3 | `businessType` must be one of the allowed enum values |
| C4 | `status: suspended` blocks all write operations except payment update |
| C5 | `status: cancelled` triggers 30-day data retention countdown |
| C6 | One owner per tenant (ownership transfer is a separate process) |
| C7 | Tenant cannot be deleted if it has active branches with queue items |

---

## Validation Rules

| Field | Rule |
|---|---|
| `name` | 2-100 characters, non-empty, trimmed |
| `slug` | 3-50 characters, lowercase alphanumeric + hyphens only, unique |
| `email` | Valid email format |
| `phone` | Valid phone format (E.164 recommended) |
| `businessType` | Must be in allowed enum |
| `status` | Transitions: `active→suspended`, `active→cancelled`, `suspended→active` |

---

## Security Rules

| Role | Create | Read | Update | Delete |
|---|---|---|---|---|
| **Unauthenticated** | ✗ | ✗ | ✗ | ✗ |
| **Owner** | ✓ (own) | ✓ (own) | ✓ (own) | ✗ (soft delete only) |
| **Admin** | ✗ | ✓ (own tenant) | ✓ (limited fields) | ✗ |
| **Manager** | ✗ | ✓ (own tenant) | ✗ | ✗ |
| **Staff** | ✗ | ✓ (own tenant, limited) | ✗ | ✗ |
| **System** | ✓ | ✓ | ✓ | ✓ |

### Firestore Security Rule Principles
- All reads/writes must include `tenantId` matching the user's tenant claim
- Owner-only fields: `name`, `slug`, `businessType`, `settings`
- Admin-updatable fields: `logo`, `address`, `phone`
- Status changes: Cloud Function only (not client-writable)

---

## Events

| Event | Trigger | Side Effects |
|---|---|---|
| `tenant.created` | New tenant document created | Create default subscription, send welcome email, create audit log |
| `tenant.updated` | Tenant fields modified | Create audit log |
| `tenant.suspended` | Status → suspended | Block all branch operations, notify owner, create audit log |
| `tenant.reactivated` | Status → active (from suspended) | Unblock operations, notify owner |
| `tenant.cancelled` | Status → cancelled | Start 30-day retention timer, notify owner |
