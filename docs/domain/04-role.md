# ServiceOS — Domain Entity: Role & Permissions

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## Purpose

Roles define what a user can do within ServiceOS. The RBAC system uses a hierarchical role model where each role inherits permissions from the level below. Permissions are enforced at both the Firestore security rules level and the application level.

---

## Role Hierarchy

```
OWNER (all permissions)
  └── ADMIN (manage branch, users, settings)
        └── MANAGER (manage queue, view reports for assigned branch)
              └── STAFF (operate queue for assigned branch)
```

---

## Role Definitions

### Owner
| Aspect | Detail |
|---|---|
| **Scope** | Entire tenant |
| **Limit** | 1 per tenant |
| **Description** | Business owner. Full control over all settings, billing, and users. |
| **Can do** | Everything |
| **Cannot do** | — |

### Admin
| Aspect | Detail |
|---|---|
| **Scope** | Entire tenant |
| **Limit** | Unlimited (within subscription) |
| **Description** | Business administrator. Manages branches, users, and settings. |
| **Can do** | Everything except billing and ownership transfer |
| **Cannot do** | Manage subscription, transfer ownership, delete tenant |

### Manager
| Aspect | Detail |
|---|---|
| **Scope** | Assigned branch(es) only |
| **Limit** | Unlimited (within subscription) |
| **Description** | Branch manager. Manages daily operations of assigned branch. |
| **Can do** | Queue operations, view branch reports, manage branch settings |
| **Cannot do** | Create branches, manage users outside branch, access billing |

### Staff
| Aspect | Detail |
|---|---|
| **Scope** | Assigned branch(es) only |
| **Limit** | Unlimited (within subscription) |
| **Description** | Frontline operator. Processes queue items. |
| **Can do** | Call next, serve, complete, no-show, view queue |
| **Cannot do** | Manage settings, view reports, manage users |

---

## Permission Matrix

| Permission | Owner | Admin | Manager | Staff |
|---|---|---|---|---|
| **Tenant** | | | | |
| `tenant.read` | ✓ | ✓ | ✓ | ✓ |
| `tenant.update` | ✓ | ✗ | ✗ | ✗ |
| `tenant.delete` | ✓ | ✗ | ✗ | ✗ |
| **Branch** | | | | |
| `branch.create` | ✓ | ✓ | ✗ | ✗ |
| `branch.read` | ✓ (all) | ✓ (all) | ✓ (assigned) | ✓ (assigned) |
| `branch.update` | ✓ | ✓ | ✓ (assigned) | ✗ |
| `branch.delete` | ✓ | ✗ | ✗ | ✗ |
| **Service** | | | | |
| `service.create` | ✓ | ✓ | ✓ (assigned) | ✗ |
| `service.read` | ✓ | ✓ | ✓ (assigned) | ✓ (assigned) |
| `service.update` | ✓ | ✓ | ✓ (assigned) | ✗ |
| `service.delete` | ✓ | ✓ | ✗ | ✗ |
| **Queue** | | | | |
| `queue.create` | ✓ | ✓ | ✓ | ✓ |
| `queue.read` | ✓ | ✓ | ✓ (assigned) | ✓ (assigned) |
| `queue.call` | ✓ | ✓ | ✓ | ✓ |
| `queue.serve` | ✓ | ✓ | ✓ | ✓ |
| `queue.complete` | ✓ | ✓ | ✓ | ✓ |
| `queue.cancel` | ✓ | ✓ | ✓ | ✓ |
| `queue.noshow` | ✓ | ✓ | ✓ | ✓ |
| `queue.transfer` | ✓ | ✓ | ✓ | ✗ |
| `queue.prioritize` | ✓ | ✓ | ✓ | ✗ |
| **Workflow** | | | | |
| `workflow.create` | ✓ | ✓ | ✗ | ✗ |
| `workflow.read` | ✓ | ✓ | ✓ (assigned) | ✓ (assigned) |
| `workflow.update` | ✓ | ✓ | ✗ | ✗ |
| `workflow.delete` | ✓ | ✓ | ✗ | ✗ |
| `workflow.advance` | ✓ | ✓ | ✓ | ✓ |
| **User** | | | | |
| `user.invite` | ✓ | ✓ (non-owner) | ✗ | ✗ |
| `user.read` | ✓ (all) | ✓ (all) | ✓ (branch) | ✓ (self) |
| `user.update` | ✓ (all) | ✓ (non-owner) | ✗ | ✓ (self) |
| `user.deactivate` | ✓ | ✓ (non-owner) | ✗ | ✗ |
| **Subscription** | | | | |
| `subscription.read` | ✓ | ✓ | ✗ | ✗ |
| `subscription.update` | ✓ | ✗ | ✗ | ✗ |
| **Analytics** | | | | |
| `analytics.read` | ✓ (all) | ✓ (all) | ✓ (branch) | ✗ |
| `analytics.export` | ✓ | ✓ | ✗ | ✗ |
| **Audit** | | | | |
| `audit.read` | ✓ | ✓ | ✓ (branch) | ✗ |
| **Settings** | | | | |
| `settings.tenant` | ✓ | ✗ | ✗ | ✗ |
| `settings.branch` | ✓ | ✓ | ✓ (assigned) | ✗ |

---

## Firebase Custom Claims Structure

```json
{
  "tenantId": "tenant_abc123",
  "role": "manager",
  "branchIds": ["branch_1", "branch_2"]
}
```

### Claim Rules
- Set via Cloud Function on user creation/role change
- Validated in Firestore security rules
- Token refreshed on role/branch changes
- Maximum claim size: 1000 bytes

---

## Security Rules

### Firestore Rule Pattern
```
// Pseudocode for security rules pattern
function isTenantMember(tenantId) {
  return request.auth.token.tenantId == tenantId;
}

function hasRole(role) {
  return request.auth.token.role == role;
}

function isOwnerOrAdmin() {
  return hasRole('owner') || hasRole('admin');
}

function hasBranchAccess(branchId) {
  return isOwnerOrAdmin() || 
         branchId in request.auth.token.branchIds;
}
```

---

## Constraints

| Constraint | Rule |
|---|---|
| C1 | Role changes require equal or higher role (staff can't promote to admin) |
| C2 | Owner role cannot be assigned — only transferred |
| C3 | Custom claims must be refreshed within 1 hour of role change |
| C4 | Branch access list is validated against existing branches |
| C5 | Permissions are additive — no explicit deny mechanism |
