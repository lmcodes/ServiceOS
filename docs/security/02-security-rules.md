# ServiceOS — Firestore Security Rules Specification

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## 1. Firestore Security Rules File (`firestore.rules`)

The following rules enforce tenant isolation and role-based permissions directly in the database layer.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // --- Helper Functions ---

    // Checks if the user is authenticated
    function isAuth() {
      return request.auth != null;
    }

    // Extracts tenantId claim from Auth token
    function userTenantId() {
      return request.auth.token.tenantId;
    }

    // Extracts role claim from Auth token
    function userRole() {
      return request.auth.token.role;
    }

    // Extracts assigned branchIds from Auth token
    function userBranches() {
      return request.auth.token.branchIds;
    }

    // Verifies the user belongs to the specified tenant
    function belongsToTenant(tenantId) {
      return isAuth() && userTenantId() == tenantId;
    }

    // Role verification helpers
    function isOwner() {
      return isAuth() && userRole() == 'owner';
    }

    function isAdmin() {
      return isAuth() && userRole() == 'admin';
    }

    function isManager() {
      return isAuth() && userRole() == 'manager';
    }

    function isStaff() {
      return isAuth() && userRole() == 'staff';
    }

    function isOwnerOrAdmin(tenantId) {
      return belongsToTenant(tenantId) && (isOwner() || isAdmin());
    }

    // Verifies access to a specific branch
    function hasBranchAccess(tenantId, branchId) {
      return belongsToTenant(tenantId) && (
        isOwner() || 
        isAdmin() || 
        (isManager() && branchId in userBranches()) || 
        (isStaff() && branchId in userBranches())
      );
    }

    // --- Rules for Collections ---

    // 1. Tenants Collection
    match /tenants/{tenantId} {
      allow read: if belongsToTenant(tenantId);
      allow create: if isAuth(); // allowed for signup
      allow update: if isOwnerOrAdmin(tenantId);
      allow delete: if false; // soft delete only
    }

    // 2. Subscriptions Collection
    match /subscriptions/{tenantId} {
      allow read: if belongsToTenant(tenantId);
      allow write: if false; // Managed by Cloud Functions / Stripe webhooks only
    }

    // 3. Branches Collection
    match /branches/{branchId} {
      allow read: if true; // Public display / QR check-in
      allow create: if isOwnerOrAdmin(request.resource.data.tenantId);
      allow update: if isOwnerOrAdmin(resource.data.tenantId) || 
                      (belongsToTenant(resource.data.tenantId) && isManager() && branchId in userBranches());
      allow delete: if isOwnerOrAdmin(resource.data.tenantId);
    }

    // 4. Services Collection
    match /services/{serviceId} {
      allow read: if true; // Public QR needs to see services
      allow create, update, delete: if isOwnerOrAdmin(request.resource.data.tenantId);
    }

    // 5. Queues Collection
    match /queues/{queueItemId} {
      allow read: if true; // Public status check
      allow create: if true; // Customers can join via QR code
      
      // Update logic (state changes)
      allow update: if 
        // 1. Staff performing operations
        hasBranchAccess(resource.data.tenantId, resource.data.branchId) ||
        // 2. Customer canceling their own active ticket
        (request.resource.data.status == 'CANCELLED' && resource.data.status == 'WAITING');
        
      allow delete: if false; // Never delete tickets physically
    }

    // 6. Appointments Collection
    match /appointments/{appointmentId} {
      allow read: if belongsToTenant(resource.data.tenantId) || isAuth();
      allow create: if true; // Public self-booking
      allow update: if belongsToTenant(resource.data.tenantId) || 
                      (request.resource.data.status == 'CANCELLED' && resource.data.status == 'CONFIRMED');
      allow delete: if false;
    }

    // 7. Audit Logs (Read-only, system creates)
    match /auditLogs/{logId} {
      allow read: if isOwnerOrAdmin(resource.data.tenantId);
      allow write: if false; // System only
    }
  }
}
```
