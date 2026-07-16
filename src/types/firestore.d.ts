// Type definitions for ServiceOS Firestore collections

export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

export interface OperatingHours {
  open: string | null; // e.g. "09:00"
  close: string | null; // e.g. "17:00"
  isOpen: boolean;
}

export interface Tenant {
  id: string; // Document ID
  name: string;
  slug: string;
  businessType: 'restaurant' | 'clinic' | 'salon' | 'repair_shop' | 'service_center';
  ownerId: string; // Auth UID
  email: string;
  phone?: string;
  address?: Address;
  logo?: string;
  settings: {
    timezone: string; // IANA e.g. "Asia/Bangkok"
    locale: string; // e.g. "th"
    currency: string; // e.g. "THB"
    dateFormat: string; // e.g. "DD/MM/YYYY"
  };
  status: 'pending_onboarding' | 'active' | 'suspended' | 'cancelled';
  subscriptionId?: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface Branch {
  id: string; // Document ID
  tenantId: string;
  name: string;
  code: string;
  address?: Address;
  phone?: string;
  email?: string;
  operatingHours: {
    monday: OperatingHours;
    tuesday: OperatingHours;
    wednesday: OperatingHours;
    thursday: OperatingHours;
    friday: OperatingHours;
    saturday: OperatingHours;
    sunday: OperatingHours;
  };
  timezone: string;
  qrCodeUrl?: string;
  displayUrl?: string;
  queuePrefix: string; // e.g. "A"
  currentQueueNumber: number; // daily running count
  settings: {
    autoCallNext: boolean;
    noShowTimeoutMinutes: number;
    maxQueueSize: number; // 0 = unlimited
    requirePhone: boolean;
  };
  kioskSettings?: {
    showLogo: boolean;
    idleTimeoutSeconds: number;
    themeColor: 'brand' | 'blue' | 'emerald' | 'violet' | 'amber';
    allowedServiceIds: string[];
  };
  status: 'active' | 'inactive';
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface DailyMetrics {
  id: string; // YYYY-MM-DD
  totalQueuesCreated: number;
  totalQueuesCompleted: number;
  totalNoShows: number;
  totalCancelled: number;
  avgWaitTimeSeconds: number;
  avgServiceTimeSeconds: number;
  serviceBreakdown: {
    [serviceId: string]: number;
  };
  hourlyTraffic: {
    [hourString: string]: number; // "09:00": count
  };
}

export interface User {
  id: string; // Matches Firebase Auth UID
  tenantId: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  phone?: string;
  role: 'owner' | 'admin' | 'manager' | 'staff';
  branchIds: string[]; // Branches assigned to
  status: 'active' | 'inactive' | 'invited' | 'suspended';
  lastLoginAt?: FirestoreTimestamp;
  invitedBy?: string;
  invitedAt?: FirestoreTimestamp;
  settings: {
    notifications: boolean;
    soundEnabled: boolean;
    theme: 'light' | 'dark' | 'system';
  };
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface ServiceFieldOption {
  key: string;
  label: string;
}

export interface ServiceCustomField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'textarea';
  required: boolean;
  options?: string[];
  min?: number;
  max?: number;
}

export interface Service {
  id: string; // Document ID
  tenantId: string;
  branchId: string;
  name: string;
  description?: string;
  category?: string;
  estimatedDurationMinutes: number;
  price?: number;
  currency?: string;
  workflowId?: string;
  queueRangeId?: string; // Phase 10: linked queue range
  requiresResource: boolean;
  resourceType?: string;
  maxConcurrent: number;
  isActive: boolean;
  sortOrder: number;
  icon?: string;
  color?: string;
  customFields: ServiceCustomField[];
  requireName?: boolean; // Phase 13
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

/**
 * QueueRange — Phase 10 (V6)
 * Tenant-level collection defining a named number range with prefix and reset policy.
 */
export type QueueRangeResetPolicy = 'daily' | 'manual' | 'never';

export interface QueueRange {
  id: string; // Document ID
  tenantId: string;
  name: string; // e.g. "A-Series"
  prefix: string; // e.g. "A" (max 3 chars)
  startNumber: number; // e.g. 1
  endNumber: number; // e.g. 99
  padLength: number; // e.g. 3 → "001"
  resetPolicy: QueueRangeResetPolicy; // daily | manual | never
  currentNumber: number; // current counter — increments on each ticket
  lastResetDate?: string; // YYYY-MM-DD — last daily reset date
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface Resource {
  id: string; // Document ID
  tenantId: string;
  branchId: string;
  name: string;
  type: string; // e.g. "counter", "room", "stylist"
  status: 'available' | 'busy' | 'offline';
  assignedUserId?: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface WorkflowTransitionRules {
  nextStages: string[];
  allowSkip: boolean;
  allowRevert: boolean;
}

export interface WorkflowStageGuard {
  type: 'customDataPresent' | 'resourceAssigned' | 'roleAuthorized' | 'minimumDuration';
  field?: string;
  roles?: string[];
  minutes?: number;
}

export interface WorkflowStage {
  id: string; // Stage ID
  name: string;
  allowedResourceTypes: string[];
  transitionRules: WorkflowTransitionRules;
  guards: WorkflowStageGuard[];
  subServiceId?: string; // Links to SubService
}

export interface SubService {
  id: string; // Document ID
  tenantId: string;
  name: {
    th: string;
    en: string;
  };
  icon: string; // lucide icon name
  estimatedMinutes: number;
  category: string;
  createdAt: FirestoreTimestamp;
}

export interface Workflow {
  id: string; // Document ID
  tenantId: string;
  name: string;
  description?: string;
  stageIds: string[]; // Ordered list of stages
  allowCustomTransitions: boolean;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface WorkflowHistoryEntry {
  stageId: string;
  enteredAt: FirestoreTimestamp;
  exitedAt: FirestoreTimestamp | null;
  durationSeconds: number | null;
  assignedUserId: string | null;
  assignedResourceId: string | null;
  notes?: string;
}

export interface Counter {
  id: string; // Document ID
  branchId: string;
  name: string;
  primaryServiceIds: string[];
  secondaryServiceIds: string[];
  oneStopServiceIds: string[];
  isActive: boolean;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface CustomerGroup {
  id: string; // Document ID
  tenantId: string;
  name: string;
  priorityLevel: number; // 1 = normal, 2-10 = VIP levels
  timeMin: number; // minutes before warning highlight
  timeMax: number; // minutes before absolute cut-in priority
  color: string; // hex or tailwind class name
  badge: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface QueueItem {
  id: string; // Document ID
  tenantId: string;
  branchId: string;
  serviceId: string;
  queueNumber: string; // e.g. "A001"
  sequenceNumber: number; // sequential sort key
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  status: 'WAITING' | 'CALLED' | 'SERVING' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
  priority: number; // default = 0, elevated for appointments = 5
  customerGroupId?: string;
  priorityLevel?: number;
  joinedAt?: FirestoreTimestamp;
  estimatedWaitMinutes?: number;
  workflowId?: string;
  currentStageId?: string;
  workflowHistory: WorkflowHistoryEntry[];
  assignedResourceId?: string;
  calledByUserId?: string;
  calledByCounter?: string;
  calledAt?: FirestoreTimestamp;
  calledCount: number;
  servingStartedAt?: FirestoreTimestamp;
  completedAt?: FirestoreTimestamp;
  noShowAt?: FirestoreTimestamp;
  cancelledAt?: FirestoreTimestamp;
  customData: Record<string, unknown>;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface Appointment {
  id: string; // Document ID
  tenantId: string;
  branchId: string;
  serviceId: string;
  resourceId?: string; // Preferred or assigned resource
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  scheduledDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  status: 'CONFIRMED' | 'CHECKED_IN' | 'NO_SHOW' | 'CANCELLED';
  queueItemId?: string; // Created queue item ID reference after check-in
  checkInTime?: FirestoreTimestamp;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface Notification {
  id: string; // Document ID
  tenantId: string;
  branchId?: string;
  recipient: string; // email or phone
  channel: 'sms' | 'email' | 'push';
  title: string;
  body: string;
  status: 'pending' | 'sent' | 'failed';
  errorMessage?: string;
  sentAt?: FirestoreTimestamp;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface Subscription {
  tenantId: string; // Shared key document ID
  status: 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled';
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  planId: 'starter' | 'professional' | 'enterprise';
  limits: {
    branches: number;
    servicesPerBranch: number;
    usersPerBranch: number;
    queueItemsPerDay: number;
    smsIncluded: number;
  };
  usage: {
    smsSentThisMonth: number;
    queuesCreatedThisMonth: number;
  };
  trialEndsAt?: FirestoreTimestamp;
  currentPeriodEndsAt: FirestoreTimestamp;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface AuditLog {
  id: string; // Document ID
  tenantId: string;
  branchId?: string;
  userId: string;
  action: string; // e.g. "QUEUE_CALL", "BRANCH_UPDATE"
  entity: string; // e.g. "queues", "branches"
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  timestamp: FirestoreTimestamp;
}
