# ServiceOS — Domain Entity: QueueItem

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## Purpose

A QueueItem represents a single customer waiting for or receiving service. It tracks the customer's position, status, wait times, assigned resource/staff, and progression through workflow stages.

---

## Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | `string` | Auto | Firestore auto-ID | Unique identifier |
| `tenantId` | `string` | Yes | — | Parent tenant |
| `branchId` | `string` | Yes | — | Parent branch |
| `serviceId` | `string` | Yes | — | Selected service |
| `queueNumber` | `string` | Yes | — | Generated display number (e.g., "A001") |
| `sequenceNumber` | `number` | Yes | — | Daily running integer used for FIFO sorting |
| `customerName` | `string` | Yes | — | Customer display name |
| `customerPhone` | `string` | No | — | Customer phone for notifications |
| `customerEmail` | `string` | No | — | Customer email |
| `status` | `enum` | Yes | `WAITING` | `WAITING`, `CALLED`, `SERVING`, `COMPLETED`, `NO_SHOW`, `CANCELLED` |
| `priority` | `number` | Yes | `0` | Priority level (higher = faster service, default = 0) |
| `estimatedWaitMinutes` | `number` | No | — | Current estimated wait time |
| `workflowId` | `string` | No | — | Linked active workflow template |
| `currentStageId` | `string` | No | — | Current workflow stage ID |
| `workflowHistory` | `object[]` | No | `[]` | History of workflow stage transitions |
| `assignedResourceId` | `string` | No | — | Currently assigned resource (counter, room, etc.) |
| `calledByUserId` | `string` | No | — | Staff user ID who called the customer |
| `calledAt` | `Timestamp` | No | — | Time the customer was first called |
| `calledCount` | `number` | Yes | `0` | Number of times the customer has been called/summoned |
| `servingStartedAt` | `Timestamp` | No | — | Time service delivery began |
| `completedAt` | `Timestamp` | No | — | Time service was completed |
| `noShowAt` | `Timestamp` | No | — | Time marked as no-show |
| `cancelledAt` | `Timestamp` | No | — | Time cancelled by customer/staff |
| `customData` | `object` | No | `{}` | Service-specific custom fields submitted |
| `createdAt` | `Timestamp` | Auto | Server timestamp | Ticket creation time |
| `updatedAt` | `Timestamp` | Auto | Server timestamp | Last modification time |

### Workflow History Item Structure
```json
{
  "stageId": "screening",
  "enteredAt": "2026-06-22T10:00:00Z",
  "exitedAt": "2026-06-22T10:15:00Z",
  "durationSeconds": 900,
  "assignedUserId": "staff_xyz",
  "assignedResourceId": "room_101",
  "notes": "Patient stable"
}
```

---

## Relationships

```
Branch    (1) ──── (N) QueueItem
Service   (1) ──── (N) QueueItem
QueueItem (0..1) ── (1) Workflow
QueueItem (0..1) ── (1) Resource (via assignedResourceId)
QueueItem (0..1) ── (1) User (via calledByUserId)
QueueItem (1) ──── (N) AuditLog
```

---

## Constraints

| Constraint | Rule |
|---|---|
| C1 | `queueNumber` must be unique per branch per day |
| C2 | `sequenceNumber` must be strictly increasing per branch per day |
| C3 | QueueItems in terminal states (`COMPLETED`, `NO_SHOW`, `CANCELLED`) cannot change status |
| C4 | If `status == SERVING`, `servingStartedAt` and `assignedResourceId`/`calledByUserId` are required |
| C5 | Transitions must match the valid state machine |

---

## Validation Rules

| Field | Rule |
|---|---|
| `customerName` | 1-50 characters |
| `customerPhone` | E.164 phone format (if present) |
| `priority` | Integer, 0 to 10 |
| `calledCount` | Integer, 0 to 5 |
| `status` | Must belong to allowed enum |

---

## Security Rules

| Role | Create | Read | Update | Delete |
|---|---|---|---|---|
| **Owner/Admin** | ✓ | ✓ (own tenant) | ✓ (own tenant) | ✓ (soft) |
| **Manager** | ✓ (assigned branch) | ✓ (assigned) | ✓ (assigned) | ✗ |
| **Staff** | ✓ (assigned branch) | ✓ (assigned) | ✓ (assigned) | ✗ |
| **Public** | ✓ (QR entry only) | ✓ (own item / display list) | ✓ (limited: cancel own) | ✗ |

---

## Events

| Event | Trigger | Side Effects |
|---|---|---|
| `queue.created` | New queue ticket created | Notify staff, update display count, calculate wait time, log audit |
| `queue.called` | `status → CALLED` | Display animation/audio, send customer notification (SMS/Push), log audit |
| `queue.servingStarted` | `status → SERVING` | Set resource to busy, log audit |
| `queue.completed` | `status → COMPLETED` | Free resource, log service duration, update analytics, log audit |
| `queue.noshow` | `status → NO_SHOW` | Free resource, update no-show metrics, log audit |
| `queue.stageTransition` | `currentStageId` updated | Route to new resource/staff, update display, log audit |
