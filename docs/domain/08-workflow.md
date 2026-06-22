# ServiceOS — Domain Entity: Workflow

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## Purpose

A Workflow defines a state machine configuration that models a multi-step service process. It acts as a template containing multiple sequential or branching WorkflowStages that a QueueItem moves through.

---

## Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | `string` | Auto | Firestore auto-ID | Unique identifier |
| `tenantId` | `string` | Yes | — | Parent tenant |
| `branchId` | `string` | Yes | — | Parent branch (allows branch-specific workflows) |
| `name` | `string` | Yes | — | Workflow name (e.g., "Clinic Standard", "Repair Flow") |
| `description` | `string` | No | — | Detailed description of the workflow |
| `isDefault` | `boolean` | Yes | `false` | Whether this is the branch's default workflow |
| `isActive` | `boolean` | Yes | `true` | Active status of workflow template |
| `stageIds` | `string[]` | Yes | `[]` | Ordered list of stage IDs representing the path |
| `allowCustomTransitions` | `boolean` | Yes | `false` | Allow bypassing strict step order |
| `createdAt` | `Timestamp` | Auto | Server timestamp | — |
| `updatedAt` | `Timestamp` | Auto | Server timestamp | — |

---

## Relationships

```
Branch    (1) ──── (N) Workflow
Workflow  (1) ──── (N) WorkflowStage (subcollection or linked list)
Workflow  (1) ──── (N) Service (linked as active workflow)
Workflow  (1) ──── (N) QueueItem (active items running this workflow)
```

---

## Constraints

| Constraint | Rule |
|---|---|
| C1 | `stageIds` must contain at least 2 stages (an entry stage and an exit stage) |
| C2 | Only one workflow can be marked as default per branch |
| C3 | Active workflows cannot have their stage IDs removed if active queue items are currently at those stages |

---

## Validation Rules

| Field | Rule |
|---|---|
| `name` | 2-100 characters |
| `stageIds` | Array of non-empty strings, size >= 2 |

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
| `workflow.created` | New workflow template saved | Audit log |
| `workflow.updated` | Template changed | Audit log, validate consistency with running queues |
| `workflow.deleted` | Workflow deactivated | Audit log |
