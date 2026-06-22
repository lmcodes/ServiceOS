# ServiceOS — Domain Entity: WorkflowStage

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## Purpose

A WorkflowStage represents a single step within a Workflow process (e.g., screening, payment, doctor visit). It details the resources authorized to work at this stage, expected durations, notifications triggered on entry, and valid destination transitions.

---

## Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | `string` | Auto | Firestore auto-ID | Unique stage identifier |
| `tenantId` | `string` | Yes | — | Parent tenant |
| `branchId` | `string` | Yes | — | Parent branch |
| `workflowId` | `string` | Yes | — | Parent workflow template reference |
| `name` | `string` | Yes | — | Stage name (e.g., "Screening") |
| `description` | `string` | No | — | Description of activities in this stage |
| `sequence` | `number` | Yes | `0` | Order index in workflow |
| `estimatedDurationMinutes` | `number` | Yes | `10` | Expected duration of stay in this stage |
| `allowedResourceTypes` | `string[]` | No | `[]` | Resource categories authorized (e.g., `["nurse", "doctor"]`) |
| `transitionRules` | `object` | Yes | — | Configuration for next stages |
| `transitionRules.nextStages` | `string[]` | Yes | `[]` | Allowed destination stage IDs |
| `transitionRules.allowSkip` | `boolean` | Yes | `false` | Allow jumping over this stage |
| `transitionRules.allowRevert` | `boolean` | Yes | `false` | Allow going back to previous stages |
| `notificationTemplate` | `object` | No | — | Notification sent to patient on stage entry |
| `notificationTemplate.sms` | `string` | No | — | SMS copy |
| `notificationTemplate.push` | `string` | No | — | Push/Browser copy |
| `isActive` | `boolean` | Yes | `true` | Active status of stage |
| `createdAt` | `Timestamp` | Auto | — | — |
| `updatedAt` | `Timestamp` | Auto | — | — |

---

## Relationships

```
Workflow      (1) ─── (N) WorkflowStage
WorkflowStage (1) ─── (N) QueueItem (active items at this stage)
WorkflowStage (N) ─── (N) Resource (via allowedResourceTypes)
```

---

## Constraints

| Constraint | Rule |
|---|---|
| C1 | `sequence` must be unique per `workflowId` |
| C2 | Stage IDs listed in `transitionRules.nextStages` must exist in the same workflow |
| C3 | `estimatedDurationMinutes` must be > 0 |

---

## Validation Rules

| Field | Rule |
|---|---|
| `name` | 2-50 characters |
| `sequence` | Non-negative integer |
| `estimatedDurationMinutes` | Integer, 1-720 |

---

## Security Rules

| Role | Create | Read | Update | Delete |
|---|---|---|---|---|
| **Owner/Admin** | ✓ | ✓ | ✓ | ✓ (soft) |
| **Manager** | ✓ (assigned branch) | ✓ (assigned) | ✓ (assigned) | ✗ |
| **Staff** | ✗ | ✓ (assigned) | ✗ | ✗ |

---

## Events

| Event | Trigger | Side Effects |
|---|---|---|
| `stage.created` | New stage added | Audit log |
| `stage.updated` | Stage parameters modified | Audit log |
