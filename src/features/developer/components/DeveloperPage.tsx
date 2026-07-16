import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Code, 
  Key, 
  Webhook, 
  History, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  AlertTriangle, 
  Loader2, 
  ShieldAlert, 
  ToggleLeft, 
  ToggleRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Send,
  Activity
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import {
  getApiKeys,
  createApiKey,
  revokeApiKey,
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  getWebhookLogs,
  testWebhook,
  redeliverWebhookLog,
  ApiKeyData,
  WebhookData,
  WebhookLogData
} from '../repository/developerRepository';

export const DeveloperPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { tenant } = useTenant();

  // Tabs
  const [activeTab, setActiveTab] = useState<'apikeys' | 'webhooks' | 'logs'>('apikeys');

  // Loading states
  const [loading, setLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [seedingSub, setSeedingSub] = useState(false);

  const handleSeedSubscription = async () => {
    if (!tenant?.id) return;
    setSeedingSub(true);
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('@/config/firebase');
      
      const subRef = doc(db, 'subscriptions', tenant.id);
      await setDoc(subRef, {
        tenantId: tenant.id,
        planId: 'professional',
        status: 'active',
        stripeSubscriptionId: 'sub_test_seeding',
        stripeCustomerId: 'cus_test_seeding',
        limits: {
          branches: 5,
          servicesPerBranch: 10,
          usersPerBranch: 20,
          queueItemsPerDay: 500,
          smsIncluded: 100
        },
        usage: {
          smsSentThisMonth: 0,
          queuesCreatedThisMonth: 0
        },
        currentPeriodEndsAt: new Date(Date.now() + 365*24*60*60*1000),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      alert('Subscription seeded successfully as "professional" plan!');
    } catch (err: any) {
      console.error(err);
      alert('Failed to seed subscription: ' + err.message);
    } finally {
      setSeedingSub(false);
    }
  };

  // Data states
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [logs, setLogs] = useState<WebhookLogData[]>([]);

  // Modal states
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    'queue.created',
    'queue.serving',
    'queue.completed',
    'queue.cancelled'
  ]);
  const [submittingWebhook, setSubmittingWebhook] = useState(false);

  // Log UI detail toggle
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // New testing & redelivery states
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [redeliveringLogId, setRedeliveringLogId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ webhookUrl: string; success: boolean; statusCode: number; body: string } | null>(null);

  // Load API keys or Webhooks depending on tab
  useEffect(() => {
    if (!tenant?.id) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'apikeys') {
          const keys = await getApiKeys(tenant.id);
          setApiKeys(keys);
        } else if (activeTab === 'webhooks') {
          const whs = await getWebhooks(tenant.id);
          setWebhooks(whs);
          const keys = await getApiKeys(tenant.id);
          setApiKeys(keys);
        } else if (activeTab === 'logs') {
          setLogsLoading(true);
          const history = await getWebhookLogs(tenant.id);
          setLogs(history);
          const keys = await getApiKeys(tenant.id);
          setApiKeys(keys);
          setLogsLoading(false);
        }
      } catch (err) {
        console.error('Error loading developer portal data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [tenant?.id, activeTab]);

  const handleRefreshLogs = async () => {
    if (!tenant?.id) return;
    setLogsLoading(true);
    try {
      const history = await getWebhookLogs(tenant.id);
      setLogs(history);
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  // Generate Key
  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !newKeyName.trim()) return;

    try {
      const newKey = await createApiKey(tenant.id, newKeyName);
      setApiKeys(prev => [newKey, ...prev]);
      setGeneratedKey(newKey.secret);
      setNewKeyName('');
    } catch (err) {
      console.error('Failed to generate API Key:', err);
    }
  };

  // Revoke Key
  const handleRevokeKey = async (keyId: string) => {
    if (!window.confirm('Are you sure you want to revoke this API key? Applications using it will instantly lose access.')) {
      return;
    }

    try {
      await revokeApiKey(keyId);
      setApiKeys(prev => prev.map(k => k.id === keyId ? { ...k, status: 'revoked' } : k));
    } catch (err) {
      console.error('Failed to revoke API key:', err);
    }
  };

  // Create Webhook
  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !webhookUrl.trim()) return;

    setSubmittingWebhook(true);
    try {
      const newWebhook = await createWebhook(tenant.id, webhookUrl, selectedEvents);
      setWebhooks(prev => [newWebhook, ...prev]);
      setIsWebhookModalOpen(false);
      setWebhookUrl('');
    } catch (err) {
      console.error('Failed to create webhook:', err);
    } finally {
      setSubmittingWebhook(false);
    }
  };

  // Toggle Webhook Status
  const handleToggleWebhook = async (webhook: WebhookData) => {
    if (!webhook.id) return;

    const newActiveState = !webhook.isActive;
    try {
      await updateWebhook(webhook.id, { isActive: newActiveState });
      setWebhooks(prev => prev.map(w => w.id === webhook.id ? { ...w, isActive: newActiveState } : w));
    } catch (err) {
      console.error('Failed to toggle webhook:', err);
    }
  };

  // Delete Webhook
  const handleDeleteWebhook = async (webhookId: string) => {
    if (!window.confirm('Are you sure you want to delete this webhook endpoint?')) {
      return;
    }

    try {
      await deleteWebhook(webhookId);
      setWebhooks(prev => prev.filter(w => w.id !== webhookId));
    } catch (err) {
      console.error('Failed to delete webhook:', err);
    }
  };

  // Test / Ping Webhook Connection
  const handleTestWebhook = async (webhook: WebhookData) => {
    if (!webhook.id) return;

    const activeKey = apiKeys.find(k => k.status === 'active');
    if (!activeKey) {
      alert('Cannot test webhook: You must first generate an active API Key on the API Keys tab.');
      return;
    }

    setTestingWebhookId(webhook.id);
    try {
      const result = await testWebhook(webhook.id, activeKey.secret);
      setTestResult({
        webhookUrl: webhook.url,
        success: result.success,
        statusCode: result.statusCode,
        body: result.body
      });
    } catch (err: any) {
      alert(`Webhook test failed: ${err.message || 'Unknown error'}`);
    } finally {
      setTestingWebhookId(null);
    }
  };

  // Redeliver a Webhook Log
  const handleRedeliverLog = async (log: WebhookLogData) => {
    if (!log.id) return;

    const activeKey = apiKeys.find(k => k.status === 'active');
    if (!activeKey) {
      alert('Cannot redeliver webhook log: You must first generate an active API Key.');
      return;
    }

    setRedeliveringLogId(log.id);
    try {
      const result = await redeliverWebhookLog(log.id, activeKey.secret);
      if (result.success) {
        alert('Webhook payload redelivered successfully! A new log entry has been recorded.');
        // Refresh logs list to show the redelivered attempt
        handleRefreshLogs();
      } else {
        alert(`Redelivery failed with status: ${result.statusCode}`);
        handleRefreshLogs();
      }
    } catch (err: any) {
      alert(`Redelivery failed: ${err.message || 'Unknown error'}`);
    } finally {
      setRedeliveringLogId(null);
    }
  };

  const handleCopyKey = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Check roles: Only Owner and Admin allowed
  if (user?.role !== 'owner' && user?.role !== 'admin') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-lg mx-auto text-center mt-12 shadow-sm">
        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          {t('pages.developer.unauthorizedTitle', 'Access Denied')}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('pages.developer.unauthorizedDesc', 'Only tenant owners or administrators can access developer tools.')}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Code className="w-7 h-7 text-brand-600 dark:text-brand-400" />
            {t('pages.developer.title', 'Developer Portal')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('pages.developer.subtitle', 'Manage API keys and Webhook integration endpoints')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSeedSubscription}
            disabled={seedingSub}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold rounded-2xl cursor-pointer transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${seedingSub ? 'animate-spin' : ''}`} />
            <span>Seed Pro Subscription</span>
          </button>

          {activeTab === 'apikeys' && (
            <button
              onClick={() => {
                setGeneratedKey(null);
                setIsKeyModalOpen(true);
              }}
              className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-2xl cursor-pointer transition-colors shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              {t('pages.developer.btnGenerateKey', 'Generate API Key')}
            </button>
          )}

          {activeTab === 'webhooks' && (
            <button
              onClick={() => setIsWebhookModalOpen(true)}
              className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-2xl cursor-pointer transition-colors shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              {t('pages.developer.btnCreateWebhook', 'Add Webhook')}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('apikeys')}
          className={`pb-4 text-sm font-bold transition-all border-b-2 outline-none cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'apikeys'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          <Key className="w-4 h-4" />
          {t('pages.developer.tabApiKeys', 'API Keys')}
        </button>

        <button
          onClick={() => setActiveTab('webhooks')}
          className={`pb-4 text-sm font-bold transition-all border-b-2 outline-none cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'webhooks'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          <Webhook className="w-4 h-4" />
          {t('pages.developer.tabWebhooks', 'Webhooks')}
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-4 text-sm font-bold transition-all border-b-2 outline-none cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'logs'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          <History className="w-4 h-4" />
          {t('pages.developer.tabLogs', 'Webhook Logs')}
        </button>
      </div>

      {/* Main Contents */}
      {loading ? (
        <div className="flex justify-center items-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* 1. API Keys View */}
          {activeTab === 'apikeys' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              {apiKeys.length === 0 ? (
                <div className="text-center py-16 text-slate-400 dark:text-slate-500">
                  <Key className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-semibold">No API keys active. Generate a key to query the public API.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-4 px-6">{t('pages.developer.apiKeyName', 'Name')}</th>
                        <th className="py-4 px-6">{t('pages.developer.apiKeySecret', 'Secret Key')}</th>
                        <th className="py-4 px-6">{t('pages.developer.apiKeyStatus', 'Status')}</th>
                        <th className="py-4 px-6">{t('pages.developer.apiKeyCreated', 'Created At')}</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm font-medium text-slate-700 dark:text-slate-350">
                      {apiKeys.map((key) => (
                        <tr key={key.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-850/10 transition-colors">
                          <td className="py-4 px-6 text-slate-900 dark:text-white font-bold">{key.name}</td>
                          <td className="py-4 px-6 font-mono text-xs text-slate-400">
                            {key.secret.substring(0, 12)}...••••
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                              key.status === 'active' 
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 text-emerald-600 dark:text-emerald-450'
                                : 'bg-rose-50 dark:bg-rose-955/15 border border-rose-100 dark:border-rose-950 text-rose-500 dark:text-rose-400'
                            }`}>
                              {key.status === 'active' ? 'Active' : 'Revoked'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-450">
                            {key.createdAt?.toDate ? key.createdAt.toDate().toLocaleString() : new Date(key.createdAt).toLocaleString()}
                          </td>
                          <td className="py-4 px-6 text-right">
                            {key.status === 'active' && (
                              <button
                                onClick={() => key.id && handleRevokeKey(key.id)}
                                className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-955/15 rounded-xl cursor-pointer transition-colors"
                                title="Revoke Key"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 2. Webhooks View */}
          {activeTab === 'webhooks' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              {webhooks.length === 0 ? (
                <div className="text-center py-16 text-slate-400 dark:text-slate-500">
                  <Webhook className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-semibold">No Webhook endpoints registered. Add an endpoint to receive live event payloads.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-4 px-6">{t('pages.developer.webhookUrl', 'Payload URL')}</th>
                        <th className="py-4 px-6">{t('pages.developer.webhookEvents', 'Events')}</th>
                        <th className="py-4 px-6">{t('pages.developer.webhookSecret', 'Secret')}</th>
                        <th className="py-4 px-6">{t('pages.developer.webhookStatus', 'Active')}</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm font-medium text-slate-700 dark:text-slate-350">
                      {webhooks.map((wh) => (
                        <tr key={wh.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-850/10 transition-colors">
                          <td className="py-4 px-6 text-slate-900 dark:text-white font-bold max-w-xs truncate" title={wh.url}>
                            {wh.url}
                          </td>
                          <td className="py-4 px-6 text-xs space-y-1">
                            {wh.events.map((e) => (
                              <span key={e} className="inline-block bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-400 px-1.5 py-0.5 rounded-md mr-1 font-mono text-[10px]">
                                {e}
                              </span>
                            ))}
                          </td>
                          <td className="py-4 px-6 font-mono text-xs text-slate-400">
                            {wh.secret.substring(0, 10)}...••••
                          </td>
                          <td className="py-4 px-6">
                            <button
                              onClick={() => handleToggleWebhook(wh)}
                              className="focus:outline-none cursor-pointer"
                            >
                              {wh.isActive ? (
                                <ToggleRight className="w-8 h-8 text-brand-600" />
                              ) : (
                                <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                              )}
                            </button>
                          </td>
                          <td className="py-4 px-6 text-right flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleTestWebhook(wh)}
                              disabled={testingWebhookId === wh.id}
                              className="p-2 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-955/20 rounded-xl cursor-pointer transition-colors disabled:opacity-55"
                              title="Test Connection"
                            >
                              {testingWebhookId === wh.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => wh.id && handleDeleteWebhook(wh.id)}
                              className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-955/15 rounded-xl cursor-pointer transition-colors"
                              title="Delete Webhook"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 3. Webhook Logs View */}
          {activeTab === 'logs' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm space-y-4 p-6">
              
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Webhook Dispatch Logs (Last 50 Events)
                </span>
                <button
                  onClick={handleRefreshLogs}
                  disabled={logsLoading}
                  className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 text-xs font-bold border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {logsLoading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-16 text-slate-400 dark:text-slate-500">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-semibold">No webhook delivery logs. Dispatches will populate here on queue updates.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    const isSuccess = log.statusCode >= 200 && log.statusCode < 300;
                    return (
                      <div key={log.id} className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/20 dark:bg-slate-950/5">
                        {/* Log Item Header Row */}
                        <div 
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id || '')}
                          className="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Success Badge */}
                            <span className={`inline-flex px-2 py-0.5 text-xs font-mono font-bold rounded-full ${
                              isSuccess
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900'
                                : 'bg-rose-50 dark:bg-rose-955/15 text-rose-500 dark:text-rose-400 border border-rose-100 dark:border-rose-950'
                            }`}>
                              {log.statusCode}
                            </span>
                            
                            <span className="font-mono text-xs font-bold text-slate-800 dark:text-white uppercase">
                              {log.eventType}
                            </span>

                            <span className="text-xs text-slate-400 truncate max-w-xs md:max-w-md hidden sm:inline" title={log.url}>
                              {log.url}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 flex-shrink-0">
                            <span className="text-[11px] text-slate-450">
                              {log.deliveredAt?.toDate ? log.deliveredAt.toDate().toLocaleString() : new Date(log.deliveredAt).toLocaleString()}
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </div>
                        </div>

                        {/* Log Item Details Expanded Body */}
                        {isExpanded && (
                          <div className="p-4 border-t border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-950/40 space-y-4 text-xs font-medium">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Payload URL</span>
                                <p className="font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-2 rounded-xl text-slate-700 dark:text-slate-350 break-all">
                                  {log.url}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Error Details</span>
                                <p className="font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-2 rounded-xl text-slate-700 dark:text-slate-350">
                                  {log.errorMessage || 'No errors reported.'}
                                  {log.attempts !== undefined ? ` (Attempts: ${log.attempts})` : ''}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">HTTP Payload Data</span>
                                <button
                                  onClick={() => handleRedeliverLog(log)}
                                  disabled={redeliveringLogId === log.id}
                                  className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-800 dark:text-white rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 text-[11px] font-bold disabled:opacity-55"
                                >
                                  {redeliveringLogId === log.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  )}
                                  Redeliver Payload
                                </button>
                              </div>
                              <pre className="font-mono bg-slate-955 text-slate-300 p-4 rounded-2xl overflow-x-auto text-xs leading-relaxed max-h-60 shadow-inner">
                                {JSON.stringify(JSON.parse(log.payload), null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL: Generate API Key */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-5">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {generatedKey ? 'API Key Generated' : 'Generate New API Key'}
            </h3>

            {generatedKey ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-950 text-amber-800 dark:text-amber-450 rounded-2xl text-xs leading-relaxed">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong>Warning:</strong> Copy this API Key secret now. For security purposes, it will never be displayed here again.
                  </p>
                </div>

                <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-805 rounded-xl">
                  <span className="font-mono text-xs select-all text-slate-900 dark:text-white font-bold flex-1 break-all">
                    {generatedKey}
                  </span>
                  <button
                    onClick={handleCopyKey}
                    className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700 transition-colors flex-shrink-0"
                    title="Copy to Clipboard"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  onClick={() => setIsKeyModalOpen(false)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleGenerateKey} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    API Key Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. Website Queue Integrator"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsKeyModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
                  >
                    Generate
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Register Webhook */}
      {isWebhookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-5">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Add Webhook Endpoint
            </h3>

            <form onSubmit={handleCreateWebhook} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Payload URL
                </label>
                <input
                  type="url"
                  required
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-domain.com/webhooks"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Trigger Events
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  {[
                    { id: 'queue.created', label: 'Queue Created' },
                    { id: 'queue.serving', label: 'Queue Serving' },
                    { id: 'queue.completed', label: 'Queue Completed' },
                    { id: 'queue.cancelled', label: 'Queue Cancelled' },
                    { id: 'queue.noshow', label: 'Queue No-Show' }
                  ].map((evt) => (
                    <label key={evt.id} className="flex items-center gap-2 cursor-pointer p-1">
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(evt.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEvents(prev => [...prev, evt.id]);
                          } else {
                            setSelectedEvents(prev => prev.filter(x => x !== evt.id));
                          }
                        }}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      {evt.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsWebhookModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingWebhook}
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  {submittingWebhook && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Webhook Test Result */}
      {testResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-lg w-full rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Activity className={`w-6 h-6 ${testResult.success ? 'text-emerald-500' : 'text-rose-500'}`} />
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Webhook Test Result
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Target URL</span>
                <p className="font-mono bg-slate-50 dark:bg-slate-950 p-2 rounded-xl text-slate-700 dark:text-slate-350 break-all border border-slate-100 dark:border-slate-850">
                  {testResult.webhookUrl}
                </p>
              </div>

              <div className="flex gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Status</span>
                  <p className={`font-bold mt-0.5 ${testResult.success ? 'text-emerald-600 dark:text-emerald-450' : 'text-rose-600 dark:text-rose-400'}`}>
                    {testResult.success ? 'Success' : 'Failed'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">HTTP Code</span>
                  <p className="font-mono mt-0.5 font-bold text-slate-900 dark:text-white">
                    {testResult.statusCode}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Response Body</span>
                <pre className="font-mono bg-slate-950 text-slate-300 p-4 rounded-2xl overflow-x-auto text-[11px] leading-relaxed max-h-40 shadow-inner break-all whitespace-pre-wrap">
                  {testResult.body || 'No response body returned.'}
                </pre>
              </div>
            </div>

            <button
              onClick={() => setTestResult(null)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeveloperPage;
