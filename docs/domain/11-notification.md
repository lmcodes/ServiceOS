# ServiceOS — Domain Entity: Notification

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## Purpose

A Notification represents an outbound message sent to a customer (or staff member) regarding their queue status, appointment confirmations, or system alerts. It tracks delivery channels, payloads, sending status, and error logs.

---

## Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | `string` | Auto | Firestore auto-ID | Unique identifier |
| `tenantId` | `string` | Yes | — | Parent tenant |
| `branchId` | `string` | Yes | — | Parent branch |
| `recipientId` | `string` | No | — | Optional user ID (if recipient is registered user) |
| `recipientType` | `enum` | Yes | `customer` | `customer`, `staff`, `admin` |
| `recipientContact` | `string` | Yes | — | Email address, Phone number, or Push token |
| `channel` | `enum` | Yes | — | `sms`, `email`, `push`, `webhook` |
| `type` | `enum` | Yes | — | `queue_called`, `queue_ready`, `appointment_confirmed`, `appointment_reminder`, `system_alert` |
| `title` | `string` | No | — | Message subject / title |
| `body` | `string` | Yes | — | Plain text or formatted body content |
| `relatedEntityId` | `string` | No | — | Reference to `queueItemId` or `appointmentId` |
| `relatedEntityType` | `enum` | No | — | `queue`, `appointment` |
| `status` | `enum` | Yes | `pending` | `pending`, `sent`, `delivered`, `failed` |
| `retryCount` | `number` | Yes | `0` | Count of retries after sending failures |
| `lastError` | `string` | No | — | Error description if status is failed |
| `sentAt` | `Timestamp` | No | — | Time actually sent by dispatcher |
| `deliveredAt` | `Timestamp` | No | — | Time webhook delivery callback received |
| `createdAt` | `Timestamp` | Auto | — | — |
| `updatedAt` | `Timestamp` | Auto | — | — |

---

## Relationships

```
Tenant       (1) ──── (N) Notification
Branch       (1) ──── (N) Notification
QueueItem    (0..1) ── (N) Notification (via relatedEntityId)
Appointment  (0..1) ── (N) Notification (via relatedEntityId)
```

---

## Constraints

| Constraint | Rule |
|---|---|
| C1 | `retryCount` must not exceed 3 |
| C2 | SMS notifications can only be sent if tenant subscription has remaining SMS credits |
| C3 | `sentAt` must be set immediately when status transitions to `sent` |

---

## Validation Rules

| Field | Rule |
|---|---|
| `recipientContact` | Valid email format for `channel: email`, phone for `channel: sms` |
| `channel` | Must be one of: `sms`, `email`, `push`, `webhook` |
| `status` | Must be one of: `pending`, `sent`, `delivered`, `failed` |

---

## Security Rules

| Role | Create | Read | Update | Delete |
|---|---|---|---|---|
| **Owner/Admin** | ✗ (system only) | ✓ (own tenant) | ✗ | ✗ |
| **Manager/Staff** | ✗ (system only) | ✓ (assigned branch) | ✗ | ✗ |
| **Public** | ✗ | ✗ | ✗ | ✗ |

---

## Events

| Event | Trigger | Side Effects |
|---|---|---|
| `notification.pending` | Document created | Queue in processing pipeline for dispatcher function |
| `notification.sent` | Provider accepts message | Update status to `sent`, decrement billing balance (if SMS) |
| `notification.failed` | Provider rejects message | Log error, increment retryCount, re-queue if < max |
