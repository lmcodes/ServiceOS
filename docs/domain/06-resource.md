# ServiceOS — Domain Entity: Resource

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## Purpose

A Resource represents any assignable entity that delivers service — a doctor, stylist, technician, counter, room, or table. Resources are assigned to queue items or workflow stages to track who/what is handling the service.

---

## Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | `string` | Auto | Firestore auto-ID | Unique identifier |
| `tenantId` | `string` | Yes | — | Parent tenant |
| `branchId` | `string` | Yes | — | Parent branch |
| `name` | `string` | Yes | — | Display name (e.g., "Dr. Smith", "Counter 3") |
| `type` | `enum` | Yes | — | `person`, `counter`, `room`, `table`, `equipment` |
| `category` | `string` | No | — | Sub-category (e.g., "doctor", "nurse", "stylist") |
| `serviceIds` | `string[]` | No | `[]` | Services this resource can handle |
| `userId` | `string` | No | — | Linked user account (for `person` type) |
| `capacity` | `number` | No | `1` | Concurrent capacity (e.g., table seats 4) |
| `availability` | `object` | No | — | Schedule-based availability |
| `currentStatus` | `enum` | Yes | `available` | `available`, `busy`, `break`, `offline` |
| `currentQueueItemId` | `string` | No | — | Currently assigned queue item |
| `isActive` | `boolean` | Yes | `true` | Whether resource is operational |
| `sortOrder` | `number` | No | `0` | Display order |
| `metadata` | `object` | No | `{}` | Type-specific data |
| `createdAt` | `Timestamp` | Auto | — | — |
| `updatedAt` | `Timestamp` | Auto | — | — |

---

## Relationships

```
Branch    (1) ──── (N) Resource
Resource  (0..1) ── (0..1) User (for person-type resources)
Resource  (N) ──── (N) Service (via serviceIds)
Resource  (1) ──── (N) QueueItem (as assigned resource)
```

---

## Constraints

| Constraint | Rule |
|---|---|
| C1 | `name` unique within branch |
| C2 | `userId` must reference a user in the same tenant (if set) |
| C3 | `serviceIds` must reference valid services in the same branch |
| C4 | Cannot assign queue item to resource with `currentStatus != available` |
| C5 | `capacity` must be ≥ 1 |

---

## Validation Rules

| Field | Rule |
|---|---|
| `name` | 2-100 characters |
| `type` | Must be valid enum value |
| `capacity` | Integer, 1-100 |
| `serviceIds` | Max 50 entries, each must exist in branch |

---

## Security Rules

| Role | Create | Read | Update | Delete |
|---|---|---|---|---|
| **Owner/Admin** | ✓ | ✓ | ✓ | ✓ (soft) |
| **Manager** | ✓ (assigned branch) | ✓ (assigned) | ✓ (status only) | ✗ |
| **Staff** | ✗ | ✓ (assigned) | ✓ (own status only) | ✗ |

---

## Events

| Event | Trigger | Side Effects |
|---|---|---|
| `resource.statusChanged` | Status updated | Update availability for queue assignment, audit log |
| `resource.assigned` | Queue item assigned | Set `currentStatus: busy`, set `currentQueueItemId` |
| `resource.freed` | Queue item completed | Set `currentStatus: available`, clear `currentQueueItemId` |
