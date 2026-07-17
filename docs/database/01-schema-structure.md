# ServiceOS — Firestore Schema Structure

> Version: 1.0 | Last Updated: 2026-06-22 | Status: Draft

---

## 1. Firestore Hierarchical Collection Tree

ServiceOS uses a mix of root-level collections and subcollections. Subcollections are used for tightly bound hierarchical data (e.g. branch-level metrics) where lifecycle operations are grouped. Root collections are used for scalable, queryable domain models like `queues`, `users`, and `appointments` to enable flexible cross-branch queries and efficient indexing.

```
/tenants (root collection)
   └── {tenantId} (document)
/branches (root collection)
   └── {branchId} (document)
        └── /dailyMetrics (subcollection)
                 └── {dateString YYYY-MM-DD} (document)
/users (root collection)
   └── {userId} (document)
/services (root collection)
   └── {serviceId} (document)
/resources (root collection)
   └── {resourceId} (document)
/workflows (root collection)
   └── {workflowId} (document)
        └── /stages (subcollection)
                 └── {stageId} (document)
/queues (root collection)
   └── {queueItemId} (document)
/appointments (root collection)
   └── {appointmentId} (document)
/notifications (root collection)
   └── {notificationId} (document)
/subscriptions (root collection)
   └── {tenantId} (document - shared key)
/auditLogs (root collection)
   └── {logId} (document)
/mediaLibrary (root collection)
   └── {mediaId} (document)
/displayTemplates (root collection)
   └── {templateId} (document)
```

---

## 2. Detailed Collection & Document Schemas

### 2.1 Collection: `tenants`
```typescript
interface Tenant {
  id: string; // matches document ID
  name: string;
  slug: string;
  businessType: 'restaurant' | 'clinic' | 'salon' | 'repair_shop' | 'service_center';
  ownerId: string; // Auth UID
  email: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  logo?: string;
  settings: {
    timezone: string; // IANA e.g. "Asia/Bangkok"
    locale: string; // e.g. "th"
    currency: string; // e.g. "THB"
    dateFormat: string; // e.g. "DD/MM/YYYY"
  };
  status: 'active' | 'suspended' | 'cancelled';
  subscriptionId?: string;
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
}
```

### 2.2 Collection: `branches`
```typescript
interface Branch {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    lat?: number;
    lng?: number;
  };
  phone?: string;
  email?: string;
  operatingHours: {
    [dayOfWeek in 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday']: {
      open: string | null; // "09:00"
      close: string | null; // "17:00"
      isOpen: boolean;
    };
  };
  timezone: string;
  qrCodeUrl?: string;
  displayUrl?: string;
  queuePrefix: string; // e.g., "A"
  currentQueueNumber: number; // daily running count
  settings: {
    autoCallNext: boolean;
    noShowTimeoutMinutes: number;
    maxQueueSize: number; // 0 = unlimited
    requirePhone: boolean;
  };
  status: 'active' | 'inactive';
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
}
```

#### Subcollection: `branches/{branchId}/dailyMetrics`
```typescript
interface DailyMetrics {
  id: string; // format "YYYY-MM-DD"
  totalQueuesCreated: number;
  totalQueuesCompleted: number;
  totalNoShows: number;
  totalCancelled: number;
  avgWaitTimeSeconds: number;
  avgServiceTimeSeconds: number;
  serviceBreakdown: {
    [serviceId: string]: number; // count
  };
  hourlyTraffic: {
    [hourString: string]: number; // "09:00": count
  };
}
```

### 2.3 Collection: `users`
```typescript
interface User {
  id: string; // matches Firebase Auth UID
  tenantId: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  phone?: string;
  role: 'owner' | 'admin' | 'manager' | 'staff';
  branchIds: string[]; // branches assigned to
  status: 'active' | 'inactive' | 'invited' | 'suspended';
  lastLoginAt?: firebase.firestore.Timestamp;
  invitedBy?: string;
  invitedAt?: firebase.firestore.Timestamp;
  settings: {
    notifications: boolean;
    soundEnabled: boolean;
    theme: 'light' | 'dark' | 'system';
  };
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
}
```

### 2.4 Collection: `services`
```typescript
interface Service {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  description?: string;
  category?: string;
  estimatedDurationMinutes: number;
  price?: number;
  currency?: string;
  workflowId?: string;
  requiresResource: boolean;
  resourceType?: string;
  maxConcurrent: number;
  isActive: boolean;
  sortOrder: number;
  icon?: string;
  color?: string;
  customFields: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'checkbox' | 'textarea';
    required: boolean;
    options?: string[]; // for select
    min?: number;
    max?: number;
  }>;
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
}
```

### 2.5 Collection: `queues`
```typescript
interface QueueItem {
  id: string;
  tenantId: string;
  branchId: string;
  serviceId: string;
  queueNumber: string; // e.g. "A001"
  sequenceNumber: number; // incremental sorting index
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  status: 'WAITING' | 'CALLED' | 'SERVING' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
  priority: number; // default = 0
  estimatedWaitMinutes?: number;
  workflowId?: string;
  currentStageId?: string;
  workflowHistory: Array<{
    stageId: string;
    enteredAt: firebase.firestore.Timestamp;
    exitedAt: firebase.firestore.Timestamp | null;
    durationSeconds: number | null;
    assignedUserId: string | null;
    assignedResourceId: string | null;
    notes?: string;
  }>;
  assignedResourceId?: string;
  calledByUserId?: string;
  calledAt?: firebase.firestore.Timestamp;
  calledCount: number;
  servingStartedAt?: firebase.firestore.Timestamp;
  completedAt?: firebase.firestore.Timestamp;
  noShowAt?: firebase.firestore.Timestamp;
  cancelledAt?: firebase.firestore.Timestamp;
  customData: Record<string, any>;
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
}
```

### 2.6 Collection: `mediaLibrary`
```typescript
interface MediaItem {
  id: string; // matches document ID
  tenantId: string;
  name: string;
  type: 'image' | 'video' | 'url';
  storageUrl: string;
  duration: number; // default display time in seconds
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
}
```

### 2.7 Collection: `displayTemplates`
```typescript
interface DisplayTemplate {
  id: string; // matches document ID
  branchId: string;
  name: string;
  layout: 'queue-only' | 'split-media' | 'fullscreen-media-with-ticker';
  mediaPlaylist: Array<{
    mediaId: string;
    duration: number; // custom duration for this item
  }>;
  queuePosition?: 'left' | 'right' | 'none';
  transitionSeconds: number; // fallback duration in seconds
  isActive: boolean;
  createdAt: firebase.firestore.Timestamp;
  updatedAt: firebase.firestore.Timestamp;
}
```
