# ServiceOS — Domain Entity: Appointment

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## Purpose

An Appointment represents a scheduled time slot reserved by or for a customer. It guarantees availability of a service and potentially a specific resource (e.g., doctor, stylist) at a designated time. On arrival, the appointment is checked-in and resolved into an active QueueItem.

---

## Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | `string` | Auto | Firestore auto-ID | Unique identifier |
| `tenantId` | `string` | Yes | — | Parent tenant |
| `branchId` | `string` | Yes | — | Parent branch |
| `serviceId` | `string` | Yes | — | Service requested |
| `resourceId` | `string` | No | — | Preferred or assigned resource/staff |
| `customerName` | `string` | Yes | — | Customer name |
| `customerPhone` | `string` | Yes | — | Phone number for reminders |
| `customerEmail` | `string` | No | — | Email for confirmation/calendar event |
| `scheduledDate` | `string` | Yes | — | ISO Date String (`YYYY-MM-DD`) |
| `startTime` | `string` | Yes | — | 24h format (`HH:MM`) |
| `endTime` | `string` | Yes | — | 24h format (`HH:MM`) |
| `status` | `enum` | Yes | `CONFIRMED` | `CONFIRMED`, `CHECKED_IN`, `CANCELLED`, `NO_SHOW` |
| `notes` | `string` | No | — | Customer or staff comments |
| `queueItemId` | `string` | No | — | Reference to QueueItem created upon check-in |
| `checkInTime` | `Timestamp` | No | — | Actual check-in time |
| `createdAt` | `Timestamp` | Auto | — | — |
| `updatedAt` | `Timestamp` | Auto | — | — |

---

## Relationships

```
Branch      (1) ──── (N) Appointment
Service     (1) ──── (N) Appointment
Resource    (0..1) ── (N) Appointment
Appointment (1) ──── (0..1) QueueItem (after check-in)
Appointment (1) ──── (N) AuditLog
```

---

## Constraints

| Constraint | Rule |
|---|---|
| C1 | `endTime` must be strictly after `startTime` |
| C2 | No double-booking allowed for the same `resourceId` at overlapping times |
| C3 | Appointments can only be booked within branch operating hours |
| C4 | Booking slot must match service minimum time increment |

---

## Validation Rules

| Field | Rule |
|---|---|
| `customerName` | 2-100 characters |
| `customerPhone` | E.164 format |
| `scheduledDate` | Matches standard date format, cannot be in the past |
| `startTime` | `HH:MM` format (24h) |
| `endTime` | `HH:MM` format (24h) |

---

## Security Rules

| Role | Create | Read | Update | Delete |
|---|---|---|---|---|
| **Owner/Admin** | ✓ | ✓ | ✓ | ✓ (soft) |
| **Manager** | ✓ (assigned branch) | ✓ (assigned) | ✓ (assigned) | ✗ |
| **Staff** | ✓ (assigned branch) | ✓ (assigned) | ✓ (assigned) | ✗ |
| **Public** | ✓ (self-booking) | ✓ (own item via token) | ✓ (cancel own) | ✗ |

---

## Events

| Event | Trigger | Side Effects |
|---|---|---|
| `appointment.booked` | New appointment confirmed | Send confirmation email/SMS with calendar invite, log audit |
| `appointment.reminder` | Cron triggers 24h/1h before | Send SMS reminder to customer |
| `appointment.checkedIn` | Status → `CHECKED_IN` | Auto-create Priority QueueItem in branch active queue, log audit |
| `appointment.cancelled` | Status → `CANCELLED` | Free slot, notify resource owner/staff, log audit |
| `appointment.noshow` | Cron triggers past buffer | Update status to `NO_SHOW` if not checked in 15m after start, log audit |
