# ServiceOS — Domain Entity: Branch

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## Purpose

A Branch represents a physical location where service is delivered. Each branch operates independently with its own services, staff, queues, and operating hours, but is owned by a single Tenant.

---

## Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | `string` | Auto | Firestore auto-ID | Unique branch identifier |
| `tenantId` | `string` | Yes | — | Parent tenant reference |
| `name` | `string` | Yes | — | Branch display name |
| `code` | `string` | Yes | Auto-generated | Short code (e.g., "BKK-01") for display |
| `address` | `object` | No | — | `{ street, city, state, postalCode, country, lat, lng }` |
| `phone` | `string` | No | — | Branch contact phone |
| `email` | `string` | No | — | Branch contact email |
| `operatingHours` | `object` | Yes | — | Per-day open/close times |
| `operatingHours.monday` | `object` | — | — | `{ open: "09:00", close: "17:00", isOpen: true }` |
| `operatingHours.tuesday` | `object` | — | — | Same structure for each day |
| `timezone` | `string` | No | Inherits tenant | IANA timezone |
| `qrCodeUrl` | `string` | Auto | — | Firebase Storage URL for QR code image |
| `displayUrl` | `string` | Auto | — | Public URL for queue display page |
| `queuePrefix` | `string` | No | `A` | Prefix for queue numbers (A001, B001) |
| `currentQueueNumber` | `number` | Auto | `0` | Counter for daily queue number generation |
| `settings` | `object` | No | `{}` | Branch-level settings |
| `settings.autoCallNext` | `boolean` | No | `false` | Auto-call next after completing |
| `settings.noShowTimeoutMinutes` | `number` | No | `5` | Minutes before auto-no-show |
| `settings.maxQueueSize` | `number` | No | `0` (unlimited) | Max waiting queue items |
| `settings.requirePhone` | `boolean` | No | `false` | Require phone on queue join |
| `settings.displaySettings` | `object` | No | `{}` | Display page customization |
| `status` | `enum` | Yes | `active` | `active`, `inactive`, `closed` |
| `createdAt` | `Timestamp` | Auto | Server timestamp | — |
| `updatedAt` | `Timestamp` | Auto | Server timestamp | — |

### Operating Hours Structure
```json
{
  "monday": { "open": "09:00", "close": "17:00", "isOpen": true },
  "tuesday": { "open": "09:00", "close": "17:00", "isOpen": true },
  "wednesday": { "open": "09:00", "close": "17:00", "isOpen": true },
  "thursday": { "open": "09:00", "close": "17:00", "isOpen": true },
  "friday": { "open": "09:00", "close": "17:00", "isOpen": true },
  "saturday": { "open": "10:00", "close": "15:00", "isOpen": true },
  "sunday": { "open": null, "close": null, "isOpen": false }
}
```

---

## Relationships

```
Tenant (1) ──── (N) Branch
Branch (1) ──── (N) Service
Branch (1) ──── (N) Resource
Branch (1) ──── (N) QueueItem
Branch (1) ──── (N) Workflow
Branch (1) ──── (N) Appointment
Branch (1) ──── (N) User (via branchAssignment)
```

---

## Constraints

| Constraint | Rule |
|---|---|
| C1 | Branch count per tenant limited by subscription |
| C2 | `code` must be unique within tenant |
| C3 | `queuePrefix` must be unique within tenant |
| C4 | Branch cannot be deleted with active (non-completed) queue items |
| C5 | `currentQueueNumber` resets to 0 daily (via scheduled function) |
| C6 | Operating hours: `close` must be after `open` for each day |

---

## Validation Rules

| Field | Rule |
|---|---|
| `name` | 2-100 characters, non-empty |
| `code` | 2-20 characters, uppercase alphanumeric + hyphens |
| `queuePrefix` | 1-3 uppercase letters |
| `operatingHours` | Must have all 7 days defined |
| `settings.noShowTimeoutMinutes` | 1-60 |
| `settings.maxQueueSize` | 0-9999 (0 = unlimited) |

---

## Security Rules

| Role | Create | Read | Update | Delete |
|---|---|---|---|---|
| **Owner** | ✓ | ✓ (own tenant) | ✓ (own tenant) | ✓ (soft) |
| **Admin** | ✓ | ✓ (own tenant) | ✓ (own tenant) | ✗ |
| **Manager** | ✗ | ✓ (assigned branch) | ✓ (limited: settings) | ✗ |
| **Staff** | ✗ | ✓ (assigned branch) | ✗ | ✗ |
| **Public** | ✗ | ✓ (display data only) | ✗ | ✗ |

---

## Events

| Event | Trigger | Side Effects |
|---|---|---|
| `branch.created` | New branch | Generate QR code, generate display URL, audit log |
| `branch.updated` | Fields modified | Audit log, invalidate QR if prefix changed |
| `branch.deactivated` | Status → inactive | Close all active queues, audit log |
| `branch.dailyReset` | Scheduled (midnight) | Reset `currentQueueNumber` to 0, archive day's data |
