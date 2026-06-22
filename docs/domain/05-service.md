# ServiceOS — Domain Entity: Service

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## Purpose

A Service defines a type of work offered by a Branch. Customers select a service when joining the queue. Services determine expected duration, required resources, and can be linked to workflow templates.

---

## Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | `string` | Auto | Firestore auto-ID | Unique identifier |
| `tenantId` | `string` | Yes | — | Parent tenant |
| `branchId` | `string` | Yes | — | Parent branch |
| `name` | `string` | Yes | — | Display name (e.g., "Haircut", "General Checkup") |
| `description` | `string` | No | — | Short description |
| `category` | `string` | No | — | Grouping category |
| `estimatedDurationMinutes` | `number` | Yes | `30` | Expected service time in minutes |
| `price` | `number` | No | — | Service price (display only, not billing) |
| `currency` | `string` | No | Inherits tenant | ISO currency code |
| `workflowId` | `string` | No | — | Associated workflow template |
| `requiresResource` | `boolean` | No | `false` | Whether a resource must be assigned |
| `resourceType` | `string` | No | — | Type of resource needed (e.g., "doctor", "stylist") |
| `maxConcurrent` | `number` | No | `0` | Max concurrent queue items for this service (0 = unlimited) |
| `isActive` | `boolean` | Yes | `true` | Whether service is available for queue |
| `sortOrder` | `number` | No | `0` | Display order in service list |
| `icon` | `string` | No | — | Icon identifier |
| `color` | `string` | No | — | Hex color for UI display |
| `customFields` | `object[]` | No | `[]` | Additional fields for queue entry form |
| `createdAt` | `Timestamp` | Auto | — | — |
| `updatedAt` | `Timestamp` | Auto | — | — |

### Custom Fields Structure
```json
{
  "customFields": [
    {
      "key": "partySize",
      "label": "Party Size",
      "type": "number",
      "required": true,
      "min": 1,
      "max": 20
    },
    {
      "key": "seatingPreference",
      "label": "Seating",
      "type": "select",
      "required": false,
      "options": ["Indoor", "Outdoor", "Bar"]
    }
  ]
}
```

---

## Relationships

```
Branch   (1) ──── (N) Service
Service  (1) ──── (N) QueueItem
Service  (1) ──── (0..1) Workflow
Service  (1) ──── (0..N) Resource (via resourceType)
```

---

## Constraints

| Constraint | Rule |
|---|---|
| C1 | Service count per branch limited by subscription |
| C2 | `name` must be unique within branch |
| C3 | Service cannot be deleted if referenced by active queue items |
| C4 | `estimatedDurationMinutes` must be 1-1440 (24 hours max) |
| C5 | If `requiresResource` is true, `resourceType` is required |
| C6 | `workflowId` must reference a workflow within the same tenant |

---

## Validation Rules

| Field | Rule |
|---|---|
| `name` | 2-100 characters, unique within branch |
| `estimatedDurationMinutes` | Integer, 1-1440 |
| `price` | Non-negative number, max 2 decimal places |
| `maxConcurrent` | Integer, 0-999 |
| `customFields[].key` | Alphanumeric + underscore, unique within array |
| `customFields[].type` | One of: `text`, `number`, `select`, `checkbox`, `textarea` |

---

## Security Rules

| Role | Create | Read | Update | Delete |
|---|---|---|---|---|
| **Owner** | ✓ | ✓ | ✓ | ✓ (soft) |
| **Admin** | ✓ | ✓ | ✓ | ✓ (soft) |
| **Manager** | ✓ (assigned branch) | ✓ (assigned) | ✓ (assigned) | ✗ |
| **Staff** | ✗ | ✓ (assigned) | ✗ | ✗ |
| **Public** | ✗ | ✓ (active only, limited fields) | ✗ | ✗ |

---

## Events

| Event | Trigger | Side Effects |
|---|---|---|
| `service.created` | New service | Audit log |
| `service.updated` | Fields modified | Audit log, update active queue items if duration changed |
| `service.deactivated` | `isActive` → false | Remove from public queue form, audit log |
