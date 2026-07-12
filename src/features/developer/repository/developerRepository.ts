import { 
  collection, 
  doc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { db } from '@/config/firebase';

const API_KEYS_COLLECTION = 'apiKeys';
const WEBHOOKS_COLLECTION = 'webhooks';
const WEBHOOK_LOGS_COLLECTION = 'webhookLogs';

export interface ApiKeyData {
  id?: string;
  name: string;
  secret: string;
  tenantId: string;
  status: 'active' | 'revoked';
  createdAt: any;
}

export interface WebhookData {
  id?: string;
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
  tenantId: string;
  createdAt: any;
}

export interface WebhookLogData {
  id?: string;
  webhookId: string;
  eventType: string;
  url: string;
  payload: string;
  statusCode: number;
  errorMessage?: string;
  attempts?: number;
  status?: 'success' | 'failed';
  deliveredAt: any;
}

// Generate random secret key prefix
function generateSecret(prefix: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}_${result}`;
}

/**
 * Fetch all API keys for a tenant
 */
export async function getApiKeys(tenantId: string): Promise<ApiKeyData[]> {
  const q = query(
    collection(db, API_KEYS_COLLECTION),
    where('tenantId', '==', tenantId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ApiKeyData));
}

/**
 * Create a new API Key
 */
export async function createApiKey(tenantId: string, name: string): Promise<ApiKeyData> {
  const secret = generateSecret('svcos_live');
  const docRef = await addDoc(collection(db, API_KEYS_COLLECTION), {
    name,
    secret,
    tenantId,
    status: 'active',
    createdAt: serverTimestamp()
  });

  return {
    id: docRef.id,
    name,
    secret,
    tenantId,
    status: 'active',
    createdAt: new Date()
  };
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(keyId: string): Promise<void> {
  const docRef = doc(db, API_KEYS_COLLECTION, keyId);
  await updateDoc(docRef, {
    status: 'revoked',
    updatedAt: serverTimestamp()
  });
}

/**
 * Fetch all Webhooks for a tenant
 */
export async function getWebhooks(tenantId: string): Promise<WebhookData[]> {
  const q = query(
    collection(db, WEBHOOKS_COLLECTION),
    where('tenantId', '==', tenantId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WebhookData));
}

/**
 * Create a new Webhook endpoint
 */
export async function createWebhook(tenantId: string, url: string, events: string[]): Promise<WebhookData> {
  const secret = generateSecret('whsec');
  const docRef = await addDoc(collection(db, WEBHOOKS_COLLECTION), {
    url,
    secret,
    events,
    isActive: true,
    tenantId,
    createdAt: serverTimestamp()
  });

  return {
    id: docRef.id,
    url,
    secret,
    events,
    isActive: true,
    tenantId,
    createdAt: new Date()
  };
}

/**
 * Update webhook status or details
 */
export async function updateWebhook(
  webhookId: string, 
  updates: Partial<{ url: string; events: string[]; isActive: boolean }>
): Promise<void> {
  const docRef = doc(db, WEBHOOKS_COLLECTION, webhookId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

/**
 * Delete a webhook endpoint
 */
export async function deleteWebhook(webhookId: string): Promise<void> {
  const docRef = doc(db, WEBHOOKS_COLLECTION, webhookId);
  await deleteDoc(docRef);
}

/**
 * Fetch webhook logs for a tenant
 */
export async function getWebhookLogs(tenantId: string, maxLimit = 50): Promise<WebhookLogData[]> {
  const q = query(
    collection(db, WEBHOOK_LOGS_COLLECTION),
    where('tenantId', '==', tenantId),
    orderBy('deliveredAt', 'desc'),
    limit(maxLimit)
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WebhookLogData));
}

/**
 * Ping / Test a Webhook endpoint
 */
export async function testWebhook(webhookId: string, apiKey: string): Promise<{ success: boolean; statusCode: number; body: string }> {
  const isEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'service-os-3c62c';
  const API_BASE_URL = isEmulator
    ? `http://127.0.0.1:5001/${projectId}/us-central1/api/v1`
    : `https://us-central1-${projectId}.cloudfunctions.net/api/v1`;

  const res = await fetch(`${API_BASE_URL}/webhooks/${webhookId}/test`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json'
    }
  });

  const data = await res.json();
  return {
    success: data.success,
    statusCode: data.statusCode,
    body: data.body
  };
}

/**
 * Redeliver a Webhook log payload
 */
export async function redeliverWebhookLog(logId: string, apiKey: string): Promise<{ success: boolean; statusCode: number }> {
  const isEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'service-os-3c62c';
  const API_BASE_URL = isEmulator
    ? `http://127.0.0.1:5001/${projectId}/us-central1/api/v1`
    : `https://us-central1-${projectId}.cloudfunctions.net/api/v1`;

  const res = await fetch(`${API_BASE_URL}/webhook-logs/${logId}/redeliver`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json'
    }
  });

  const data = await res.json();
  return {
    success: data.success,
    statusCode: data.statusCode
  };
}
