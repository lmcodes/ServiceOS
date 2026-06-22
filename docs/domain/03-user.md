# ServiceOS — Domain Entity: User

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## Purpose

A User represents an authenticated person who operates ServiceOS. Users belong to exactly one Tenant and may be assigned to one or more Branches. Authentication is delegated to Firebase Auth; this entity stores application-level profile and access data.

---

## Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | `string` | Auto | Firebase Auth UID | Matches Firebase Auth UID |
| `tenantId` | `string` | Yes | — | Parent tenant reference |
| `email` | `string` | Yes | — | From Firebase Auth |
| `displayName` | `string` | Yes | — | Full name |
| `photoUrl` | `string` | No | — | Profile photo URL |
| `phone` | `string` | No | — | Contact phone |
| `role` | `enum` | Yes | `staff` | `owner`, `admin`, `manager`, `staff` |
| `branchIds` | `string[]` | Yes | `[]` | Assigned branches (empty = all for owner/admin) |
| `permissions` | `string[]` | No | Role defaults | Override permissions (future) |
| `status` | `enum` | Yes | `active` | `active`, `inactive`, `invited`, `suspended` |
| `lastLoginAt` | `Timestamp` | No | — | Last login timestamp |
| `invitedBy` | `string` | No | — | UID of inviting user |
| `invitedAt` | `Timestamp` | No | — | When invitation was sent |
| `settings` | `object` | No | `{}` | User preferences |
| `settings.notifications` | `boolean` | No | `true` | Receive notifications |
| `settings.soundEnabled` | `boolean` | No | `true` | Queue alert sounds |
| `settings.theme` | `string` | No | `system` | `light`, `dark`, `system` |
| `createdAt` | `Timestamp` | Auto | Server timestamp | — |
| `updatedAt` | `Timestamp` | Auto | Server timestamp | — |

---

## Relationships

```
Tenant (1) ──── (N) User
User   (N) ──── (N) Branch (via branchIds)
User   (1) ──── (N) QueueItem (as calledBy / servedBy)
User   (1) ──── (N) AuditLog (as actor)
```

---

## Constraints

| Constraint | Rule |
|---|---|
| C1 | User belongs to exactly one tenant |
| C2 | `id` must match Firebase Auth UID |
| C3 | Only one `owner` per tenant |
| C4 | `branchIds` entries must reference valid branches within the same tenant |
| C5 | User count per branch limited by subscription |
| C6 | `owner` role cannot be changed to another role (must transfer ownership) |
| C7 | `suspended` user cannot log in (enforced via custom claims) |

---

## Validation Rules

| Field | Rule |
|---|---|
| `email` | Valid email, matches Firebase Auth email |
| `displayName` | 2-100 characters |
| `role` | Must be one of: `owner`, `admin`, `manager`, `staff` |
| `branchIds` | Each ID must exist within tenant's branches |
| `status` | Valid transitions only (see below) |

### Status Transitions
```
invited → active (on first login)
active → inactive (manual deactivation)
active → suspended (policy violation)
inactive → active (reactivation)
suspended → active (admin lifts suspension)
```

---

## Security Rules

| Role | Create | Read | Update | Delete |
|---|---|---|---|---|
| **Owner** | ✓ (invite) | ✓ (all in tenant) | ✓ (all in tenant) | ✓ (soft) |
| **Admin** | ✓ (invite, non-owner) | ✓ (all in tenant) | ✓ (non-owner) | ✓ (soft, non-owner) |
| **Manager** | ✗ | ✓ (own branch users) | ✗ | ✗ |
| **Staff** | ✗ | ✓ (own profile only) | ✓ (own profile, limited) | ✗ |

### Self-Editable Fields (any user)
`displayName`, `photoUrl`, `phone`, `settings.*`

---

## Events

| Event | Trigger | Side Effects |
|---|---|---|
| `user.invited` | Owner/Admin creates invitation | Send invite email, create user doc with `invited` status |
| `user.activated` | First login after invite | Update status to `active`, set custom claims |
| `user.roleChanged` | Role updated | Update Firebase custom claims, audit log |
| `user.suspended` | Status → suspended | Revoke custom claims, force logout, audit log |
| `user.deactivated` | Status → inactive | Audit log |
