# ServiceOS — Domain Entity: AuditLog

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## Purpose

AuditLogs record every state change, transaction, and management action within the platform. They provide security logging, compliance tracking, and analytical tracking of queue operational timelines (e.g. check-in duration, queue waiting times).

---

## Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | `string` | Auto | Firestore auto-ID | Unique log identifier |
| `tenantId` | `string` | Yes | — | Parent tenant identifier |
| `branchId` | `string` | No | — | Associated branch (if action occurred at branch level) |
| `userId` | `string` | No | — | Actor user ID (empty if action by customer or system) |
| `userEmail` | `string` | No | — | Email of the actor for readability |
| `userRole` | `string` | No | — | Role of the actor at time of event |
| `action` | `string` | Yes | — | Action name (e.g., `queue.call`, `settings.update`, `user.invite`) |
| `entityId` | `string` | Yes | — | ID of the target document modified (e.g., `queueItemId`) |
| `entityType` | `enum` | Yes | — | Type of entity: `tenant`, `branch`, `user`, `service`, `queue`, `workflow`, `appointment`, `subscription` |
| `changes` | `object` | No | — | Before/after state snapshot |
| `changes.before` | `object` | No | — | Value map before change |
| `changes.after` | `object` | No | — | Value map after change |
| `clientInfo` | `object` | No | — | Context metadata |
| `clientInfo.ipAddress` | `string` | No | — | Requester IP |
| `clientInfo.userAgent` | `string` | No | — | Browser agent string |
| `clientInfo.origin` | `string` | No | — | Web/Mobile interface indicator |
| `timestamp` | `Timestamp` | Auto | Server timestamp | Event logging time |

---

## Relationships

```
Tenant    (1) ──── (N) AuditLog
Branch    (0..1) ── (N) AuditLog
User      (0..1) ── (N) AuditLog (as actor)
```

---

## Constraints

| Constraint | Rule |
|---|---|
| C1 | AuditLog documents are **strictly read-only** for clients and cannot be updated or deleted |
| C2 | Logs must be created via transaction secure Cloud Functions or highly controlled database triggers |
| C3 | Retention policy: Professional tier retention is 365 days; system removes older records daily via scheduled runner |

---

## Validation Rules

| Field | Rule |
|---|---|
| `action` | Matching hierarchy format: `category.action` |
| `entityType` | One of the allowed entity system identifiers |

---

## Security Rules

| Role | Create | Read | Update | Delete |
|---|---|---|---|---|
| **Owner/Admin** | ✗ (system only) | ✓ (own tenant) | ✗ | ✗ |
| **Manager** | ✗ | ✓ (own branch logs) | ✗ | ✗ |
| **Staff/Public** | ✗ | ✗ | ✗ | ✗ |

---

## Events

| Event | Trigger | Side Effects |
|---|---|---|
| `auditLog.written` | System action writes log | None (terminal write for security auditing) |
