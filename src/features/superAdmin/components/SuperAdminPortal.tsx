import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  collection, 
  doc, 
  updateDoc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { 
  Film, 
  Sliders, 
  Plus, 
  Search, 
  AlertTriangle, 
  Trash2, 
  ShieldAlert, 
  RefreshCw,
  Edit,
  Check,
  Building,
  Volume2,
  Save,
  Play,
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { speakQueue } from '@/utils/tts';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  businessType: string | null;
  ownerId: string;
  email: string;
  status: string;
  phone?: string;
  createdAt: any;
}

interface Subscription {
  id: string;
  planId: 'starter' | 'professional' | 'enterprise';
  status: string;
  limits: {
    branches: number;
    servicesPerBranch: number;
    usersPerBranch: number;
    queueItemsPerDay: number;
  };
}

interface SystemMedia {
  id: string;
  name: string;
  type: 'image' | 'video' | 'url';
  storageUrl: string;
  duration: number;
  createdAt: any;
}

export const SuperAdminPortal: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'tenants' | 'plans' | 'media' | 'voice'>('tenants');

  // System Voice States
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsEngine, setTtsEngine] = useState<'browser' | 'google-cloud' | 'openai' | 'custom-api'>('browser');
  const [ttsLanguage, setTtsLanguage] = useState('th-TH');
  const [ttsVoice, setTtsVoice] = useState('');
  const [ttsApiKey, setTtsApiKey] = useState('');
  const [ttsCustomUrl, setTtsCustomUrl] = useState('');
  const [ttsTemplate, setTtsTemplate] = useState('หมายเลข {{number}} เชิญที่ช่องบริการ {{counter}}');
  const [ttsVolume, setTtsVolume] = useState(1.0);
  const [repeatCount, setRepeatCount] = useState(1);
  const [loadingVoice, setLoadingVoice] = useState(true);
  const [savingVoice, setSavingVoice] = useState(false);
  const [voiceSuccess, setVoiceSuccess] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Tenants State
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [subscriptions, setSubscriptions] = useState<Record<string, Subscription>>({});
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Central Media State
  const [mediaList, setMediaList] = useState<SystemMedia[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [newMediaName, setNewMediaName] = useState('');
  const [newMediaType, setNewMediaType] = useState<'image' | 'video' | 'url'>('image');
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newMediaDuration, setNewMediaDuration] = useState(10);
  const [addingMedia, setAddingMedia] = useState(false);

  // Edit Subscription Plan Modal
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editPlanId, setEditPlanId] = useState<'starter' | 'professional' | 'enterprise'>('starter');
  const [editStatus, setEditStatus] = useState('active');
  const [savingPlan, setSavingPlan] = useState(false);

  // Predefined Plan limits
  const planLimits = {
    starter: { branches: 1, servicesPerBranch: 2, usersPerBranch: 5, queueItemsPerDay: 50 },
    professional: { branches: 10, servicesPerBranch: 20, usersPerBranch: 50, queueItemsPerDay: 500 },
    enterprise: { branches: 9999, servicesPerBranch: 9999, usersPerBranch: 9999, queueItemsPerDay: 9999 }
  };

  // Real-time listener for Tenants
  useEffect(() => {
    setLoadingTenants(true);
    const unsubscribe = onSnapshot(collection(db, 'tenants'), (snapshot) => {
      const list: Tenant[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Tenant);
      });
      setTenants(list);
      setLoadingTenants(false);
    }, (err) => {
      console.error('Error fetching tenants:', err);
      setLoadingTenants(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time listener for Subscriptions
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'subscriptions'), (snapshot) => {
      const map: Record<string, Subscription> = {};
      snapshot.forEach((docSnap) => {
        map[docSnap.id] = { id: docSnap.id, ...docSnap.data() } as Subscription;
      });
      setSubscriptions(map);
    }, (err) => {
      console.error('Error fetching subscriptions:', err);
    });

    return () => unsubscribe();
  }, []);

  // Real-time listener for Central System Media
  useEffect(() => {
    setLoadingMedia(true);
    const unsubscribe = onSnapshot(collection(db, 'systemMedia'), (snapshot) => {
      const list: SystemMedia[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as SystemMedia);
      });
      setMediaList(list);
      setLoadingMedia(false);
    }, (err) => {
      console.error('Error fetching system media:', err);
      setLoadingMedia(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time listener for System Voice Settings
  useEffect(() => {
    setLoadingVoice(true);
    const unsubscribe = onSnapshot(doc(db, 'systemSettings', 'voice'), (docSnap) => {
      if (docSnap.exists()) {
        const vSettings = docSnap.data();
        setTtsEnabled(vSettings.ttsEnabled ?? false);
        setTtsEngine(vSettings.ttsEngine ?? 'browser');
        setTtsLanguage(vSettings.ttsLanguage ?? 'th-TH');
        setTtsVoice(vSettings.ttsVoice ?? '');
        setTtsApiKey(vSettings.ttsApiKey ?? '');
        setTtsCustomUrl(vSettings.ttsCustomUrl ?? '');
        setTtsTemplate(vSettings.ttsTemplate ?? 'หมายเลข {{number}} เชิญที่ช่องบริการ {{counter}}');
        setTtsVolume(vSettings.ttsVolume ?? 1.0);
        setRepeatCount(vSettings.repeatCount ?? 1);
      }
      setLoadingVoice(false);
    }, (err) => {
      console.error('Error fetching system voice settings:', err);
      setLoadingVoice(false);
    });

    return () => unsubscribe();
  }, []);

  // Save System Voice Settings
  const handleSaveVoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingVoice(true);
    setVoiceSuccess(false);
    setVoiceError('');

    try {
      const voiceSettingsPayload = {
        ttsEnabled,
        ttsEngine,
        ttsLanguage,
        ttsVoice,
        ttsTemplate,
        ttsVolume,
        repeatCount,
        ...(ttsApiKey && { ttsApiKey }),
        ...(ttsCustomUrl && { ttsCustomUrl }),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'systemSettings', 'voice'), voiceSettingsPayload, { merge: true });
      setVoiceSuccess(true);
      setTimeout(() => setVoiceSuccess(false), 3000);
    } catch (err: any) {
      console.error('[SystemVoiceSettings] Save error:', err);
      setVoiceError(err.message || 'Failed to save system voice settings');
    } finally {
      setSavingVoice(false);
    }
  };

  // Test System Voice Settings
  const handleTestVoice = () => {
    const testSettings = {
      ttsEnabled: true, // Force enabled for testing
      ttsEngine,
      ttsLanguage,
      ttsVoice,
      ttsTemplate,
      ttsVolume,
      repeatCount,
      ttsApiKey,
      ttsCustomUrl
    };

    const testTicket = 'A101';
    const testCounter = ttsLanguage.toLowerCase().startsWith('th') ? 'ช่องบริการ 1' : 'Counter 1';

    speakQueue(testTicket, testCounter, testSettings as any);
  };

  // Filter Tenants based on search query
  const filteredTenants = tenants.filter(tenant => 
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tenant.slug && tenant.slug.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Handle plan update
  const handleOpenEditPlan = (tenant: Tenant) => {
    setEditingTenant(tenant);
    const sub = subscriptions[tenant.id];
    setEditPlanId(sub?.planId || 'starter');
    setEditStatus(sub?.status || 'active');
  };

  const handleSavePlan = async () => {
    if (!editingTenant) return;
    setSavingPlan(true);
    try {
      const limits = planLimits[editPlanId];
      const subRef = doc(db, 'subscriptions', editingTenant.id);
      
      // Update or create subscription document
      await setDoc(subRef, {
        planId: editPlanId,
        status: editStatus,
        limits,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Also update tenant status if needed
      const tenantRef = doc(db, 'tenants', editingTenant.id);
      await updateDoc(tenantRef, {
        status: editStatus === 'active' ? 'active' : 'suspended',
        updatedAt: serverTimestamp()
      });

      setEditingTenant(null);
    } catch (err) {
      console.error('Failed to update subscription:', err);
      alert('Error updating subscription: ' + (err as Error).message);
    } finally {
      setSavingPlan(false);
    }
  };

  // Add global system media
  const handleAddMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMediaName || !newMediaUrl) {
      alert('Please fill out all fields.');
      return;
    }
    setAddingMedia(true);
    try {
      const newDocRef = doc(collection(db, 'systemMedia'));
      await setDoc(newDocRef, {
        name: newMediaName,
        type: newMediaType,
        storageUrl: newMediaUrl,
        duration: Number(newMediaDuration),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      // Reset inputs
      setNewMediaName('');
      setNewMediaUrl('');
      setNewMediaDuration(10);
    } catch (err) {
      console.error('Failed to add system media:', err);
      alert('Error adding system media: ' + (err as Error).message);
    } finally {
      setAddingMedia(false);
    }
  };

  // Delete global system media
  const handleDeleteMedia = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this central media asset?')) return;
    try {
      await deleteDoc(doc(db, 'systemMedia', id));
    } catch (err) {
      console.error('Failed to delete system media:', err);
      alert('Error deleting system media: ' + (err as Error).message);
    }
  };

  // Manual Tenant Onboarding Approval
  const handleApproveTenant = async (tenantId: string) => {
    try {
      const tenantRef = doc(db, 'tenants', tenantId);
      await updateDoc(tenantRef, {
        status: 'active',
        updatedAt: serverTimestamp()
      });
      
      // Ensure they have a subscription doc initialized
      const subRef = doc(db, 'subscriptions', tenantId);
      await setDoc(subRef, {
        planId: 'starter',
        status: 'active',
        limits: planLimits.starter,
        updatedAt: serverTimestamp()
      }, { merge: true });

    } catch (err) {
      console.error('Failed to approve tenant:', err);
      alert('Failed to approve: ' + (err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-950 dark:text-white flex items-center space-x-2">
            <ShieldAlert className="text-brand-500" size={24} />
            <span>{t('pages.superAdmin.title', 'Super Admin System Portal')}</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('pages.superAdmin.subtitle', 'Configure system-wide subscriptions, central resources and tenant plan levels')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-4">
        <button
          onClick={() => setActiveTab('tenants')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'tenants'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
          } flex items-center space-x-2`}
        >
          <Building size={16} />
          <span>Tenants & Billing</span>
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'plans'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
          } flex items-center space-x-2`}
        >
          <Sliders size={16} />
          <span>System Pricing Tiers</span>
        </button>
        <button
          onClick={() => setActiveTab('media')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'media'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
          } flex items-center space-x-2`}
        >
          <Film size={16} />
          <span>Central Media Repository</span>
        </button>
        <button
          onClick={() => setActiveTab('voice')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'voice'
              ? 'border-brand-500 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
          } flex items-center space-x-2`}
        >
          <Volume2 size={16} />
          <span>System Voice Settings</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'tenants' && (
        <div className="space-y-6">
          {/* Search Box */}
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 px-4 py-2.5 rounded-xl shadow-sm max-w-md">
            <Search className="text-slate-400 mr-2 shrink-0" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm w-full outline-none dark:text-slate-200"
              placeholder="Search tenant by name, email, or id..."
            />
          </div>

          {loadingTenants ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
              <RefreshCw className="animate-spin text-brand-500 mb-3" size={32} />
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading system tenants...</p>
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
              <AlertTriangle className="text-slate-400 mx-auto mb-2" size={32} />
              <p className="text-sm text-slate-500 dark:text-slate-400">No tenants matched search query.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-900/60">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Tenant Info</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Active Subscription</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Tenant Status</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredTenants.map((tenant) => {
                    const sub = subscriptions[tenant.id];
                    const planName = sub?.planId || 'starter (free)';
                    const planStatus = sub?.status || 'inactive';

                    return (
                      <tr key={tenant.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                        <td className="px-6 py-4">
                          <div className="font-bold text-sm text-slate-950 dark:text-white">{tenant.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Slug: {tenant.slug || 'none'}</div>
                          <div className="text-xs text-slate-400 mt-0.5">ID: {tenant.id}</div>
                          <div className="text-xs text-slate-400">Email: {tenant.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${
                              planName === 'enterprise'
                                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                                : planName === 'professional'
                                ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              {planName}
                            </span>
                            <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full capitalize ${
                              planStatus === 'active'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            }`}>
                              {planStatus}
                            </span>
                          </div>
                          {sub?.limits && (
                            <div className="text-[10px] text-slate-450 mt-1 space-y-0.5">
                              <div>Branches limit: {sub.limits.branches === 9999 ? '∞' : sub.limits.branches}</div>
                              <div>Services limit: {sub.limits.servicesPerBranch === 9999 ? '∞' : sub.limits.servicesPerBranch}</div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                            tenant.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : tenant.status === 'pending_onboarding'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-450 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          }`}>
                            {tenant.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {tenant.status === 'pending_onboarding' && (
                              <button
                                onClick={() => handleApproveTenant(tenant.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold flex items-center space-x-1"
                              >
                                <Check size={12} />
                                <span>Approve</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenEditPlan(tenant)}
                              className="p-1.5 text-slate-500 hover:text-brand-500 dark:hover:text-white bg-slate-100 hover:bg-brand-50 dark:bg-slate-800 rounded transition-all"
                              title="Edit Plan"
                            >
                              <Edit size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(planLimits).map(([tierId, limits]) => (
            <div key={tierId} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white capitalize border-b border-slate-150 dark:border-slate-800 pb-2">{tierId} Tier</h3>
                <ul className="mt-4 space-y-3 text-sm text-slate-650 dark:text-slate-350">
                  <li className="flex justify-between">
                    <span>Max Active Branches:</span>
                    <span className="font-semibold text-slate-950 dark:text-white">{limits.branches === 9999 ? 'Unlimited' : limits.branches}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Max Services per Branch:</span>
                    <span className="font-semibold text-slate-950 dark:text-white">{limits.servicesPerBranch === 9999 ? 'Unlimited' : limits.servicesPerBranch}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Max Staff members:</span>
                    <span className="font-semibold text-slate-950 dark:text-white">{limits.usersPerBranch === 9999 ? 'Unlimited' : limits.usersPerBranch}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Daily Queue Ticket Limit:</span>
                    <span className="font-semibold text-slate-950 dark:text-white">{limits.queueItemsPerDay === 9999 ? 'Unlimited' : limits.queueItemsPerDay}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Custom Logo Upload:</span>
                    <span className="font-semibold text-slate-950 dark:text-white">{tierId !== 'starter' ? 'Allowed' : 'System Default Only'}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>TTS Engine Access:</span>
                    <span className="font-semibold text-slate-950 dark:text-white">{tierId === 'enterprise' ? 'All (Google/OpenAI)' : 'Browser TTS Only'}</span>
                  </li>
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'media' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: Add System Media */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
              <h3 className="text-md font-bold text-slate-950 dark:text-white flex items-center space-x-2">
                <Plus className="text-brand-500" size={18} />
                <span>Upload Central Media</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                These media files are curated centrally and are shared dynamically with all Starter (Free) plan tenants.
              </p>

              <form onSubmit={handleAddMedia} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-450 mb-1">Asset Name</label>
                  <input
                    type="text"
                    required
                    value={newMediaName}
                    onChange={(e) => setNewMediaName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-slate-200"
                    placeholder="e.g. System Banner 1"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-450 mb-1">Asset Type</label>
                  <select
                    value={newMediaType}
                    onChange={(e) => setNewMediaType(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-slate-200"
                  >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                    <option value="url">External Web URL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-450 mb-1">Media Source URL</label>
                  <input
                    type="url"
                    required
                    value={newMediaUrl}
                    onChange={(e) => setNewMediaUrl(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-slate-200"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-450 mb-1">Slide Duration (seconds)</label>
                  <input
                    type="number"
                    min="3"
                    max="60"
                    required
                    value={newMediaDuration}
                    onChange={(e) => setNewMediaDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-slate-200"
                  />
                </div>

                <button
                  type="submit"
                  disabled={addingMedia}
                  className="w-full py-2.5 bg-brand-650 hover:bg-brand-600 text-white font-bold rounded-lg text-xs transition-all shadow-md shadow-brand-600/10 flex items-center justify-center space-x-1"
                >
                  {addingMedia ? (
                    <RefreshCw className="animate-spin" size={14} />
                  ) : (
                    <>
                      <Plus size={14} />
                      <span>Add Media Asset</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right panel: Media List */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
              <h3 className="text-md font-bold text-slate-950 dark:text-white mb-4">Central Assets List</h3>

              {loadingMedia ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <RefreshCw className="animate-spin text-brand-500 mb-2" size={24} />
                  <p className="text-xs text-slate-500">Loading system assets...</p>
                </div>
              ) : mediaList.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <Film className="text-slate-350 mx-auto mb-2" size={32} />
                  <p className="text-xs text-slate-500">No system media uploaded yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mediaList.map((media) => (
                    <div key={media.id} className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all bg-slate-50/50 dark:bg-slate-950/20">
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{media.name}</div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-400 font-semibold rounded capitalize">{media.type}</span>
                          <span className="text-[10px] text-slate-450">{media.duration}s slide</span>
                        </div>
                        {media.type === 'image' && (
                          <img src={media.storageUrl} alt={media.name} className="h-20 w-full object-cover rounded mt-2 border border-slate-200 dark:border-slate-850" />
                        )}
                        {media.type === 'video' && (
                          <div className="h-20 w-full bg-slate-850 rounded mt-2 flex items-center justify-center text-xs text-slate-400 border border-slate-200 dark:border-slate-850">
                            Video: {media.name}
                          </div>
                        )}
                        {media.type === 'url' && (
                          <div className="h-20 w-full bg-slate-850 rounded mt-2 p-2 text-[10px] text-slate-400 break-all border border-slate-200 dark:border-slate-850">
                            Web Frame: {media.storageUrl}
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end mt-3 pt-2 border-t border-slate-100 dark:border-slate-850">
                        <button
                          onClick={() => handleDeleteMedia(media.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded bg-transparent hover:bg-rose-500/10 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'voice' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm space-y-6">
          <div className="border-b border-slate-150 dark:border-slate-800 pb-4">
            <h3 className="text-md font-bold text-slate-950 dark:text-white flex items-center space-x-2">
              <Volume2 className="text-brand-500" size={18} />
              <span>System-Wide Default Voice Settings</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Configure the default fallback Text-to-Speech engine, voices, templates, and repeat rates used platform-wide when a branch does not specify its own voice settings.
            </p>
          </div>

          {loadingVoice ? (
            <div className="flex flex-col items-center justify-center py-10">
              <RefreshCw className="animate-spin text-brand-500 mb-2" size={24} />
              <p className="text-xs text-slate-500">Loading system voice settings...</p>
            </div>
          ) : (
            <form onSubmit={handleSaveVoice} className="space-y-6">
              {voiceError && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-450 rounded-xl text-xs border border-rose-100 dark:border-rose-900/30">
                  {voiceError}
                </div>
              )}

              {/* Main Toggle */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/30 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/80">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Enable System-Wide Default TTS
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Toggle to play text-to-speech audio when a ticket status switches to CALLED on display screens.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ttsEnabled}
                    onChange={(e) => setTtsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-650 peer-checked:bg-brand-600"></div>
                </label>
              </div>

              {/* Settings Fields */}
              <div className={`space-y-6 transition-all duration-200 ${ttsEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Engine Select */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                      TTS Engine
                    </label>
                    <select
                      value={ttsEngine}
                      onChange={(e) => setTtsEngine(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
                    >
                      <option value="browser">Browser Synthesis (Free / Native)</option>
                      <option value="google-cloud">Google Cloud TTS (Premium)</option>
                      <option value="openai">OpenAI TTS (Natural AI)</option>
                      <option value="custom-api">Custom URL API</option>
                    </select>
                  </div>

                  {/* Language */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                      Language
                    </label>
                    <select
                      value={ttsLanguage}
                      onChange={(e) => setTtsLanguage(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
                    >
                      <option value="th-TH">Thai (th-TH)</option>
                      <option value="en-US">English (en-US)</option>
                      <option value="en-GB">English (en-GB)</option>
                    </select>
                  </div>

                  {/* Voice Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1">
                      <span>Voice Name / Model</span>
                      <span className="group relative">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-slate-950 text-white text-[10px] rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">
                          Browser: Keep blank for default. Cloud Google: e.g. th-TH-Standard-A. OpenAI: alloy, echo, fable, onyx, nova, shimmer.
                        </span>
                      </span>
                    </label>
                    <input
                      type="text"
                      value={ttsVoice}
                      onChange={(e) => setTtsVoice(e.target.value)}
                      placeholder={
                        ttsEngine === 'openai' 
                          ? 'alloy, echo, nova, etc.' 
                          : ttsEngine === 'google-cloud' 
                          ? 'th-TH-Standard-A' 
                          : 'Default browser voice'
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
                    />
                  </div>

                  {/* API Key for Cloud/OpenAI */}
                  {(ttsEngine === 'google-cloud' || ttsEngine === 'openai' || ttsEngine === 'custom-api') && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                        {ttsEngine === 'custom-api' 
                          ? 'API Key / Auth Header (Optional)' 
                          : 'API Key'}
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={ttsApiKey}
                          onChange={(e) => setTtsApiKey(e.target.value)}
                          placeholder="Enter API credentials key"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none pr-10 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                        >
                          {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Custom Endpoint URL */}
                  {ttsEngine === 'custom-api' && (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                        Custom Endpoint URL
                      </label>
                      <input
                        type="url"
                        value={ttsCustomUrl}
                        onChange={(e) => setTtsCustomUrl(e.target.value)}
                        placeholder="https://your-custom-tts-api.com/synthesize"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
                      />
                    </div>
                  )}

                  {/* Announcement Template */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-455 mb-2">
                      Announcement Template
                    </label>
                    <input
                      type="text"
                      value={ttsTemplate}
                      onChange={(e) => setTtsTemplate(e.target.value)}
                      placeholder="หมายเลข {{number}} เชิญที่ช่องบริการ {{counter}}"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Use <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-brand-600">{'{{number}}'}</code> for ticket number and <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-brand-600">{'{{counter}}'}</code> for counter name.
                    </p>
                  </div>

                  {/* Volume Slider */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 flex justify-between">
                      <span>Volume</span>
                      <span className="font-mono text-brand-500">{Math.round(ttsVolume * 100)}%</span>
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.1"
                      value={ttsVolume}
                      onChange={(e) => setTtsVolume(Number(e.target.value))}
                      className="w-full accent-brand-500"
                    />
                  </div>

                  {/* Repeat Count */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                      Repeat Count
                    </label>
                    <select
                      value={repeatCount}
                      onChange={(e) => setRepeatCount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm"
                    >
                      <option value={1}>1 time</option>
                      <option value={2}>2 times</option>
                      <option value={3}>3 times</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-150 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  {voiceSuccess && (
                    <div className="flex items-center text-xs text-emerald-600 font-semibold space-x-1">
                      <Check className="w-4 h-4" />
                      <span>Settings saved successfully!</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleTestVoice}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all flex items-center space-x-1"
                  >
                    <Play size={14} />
                    <span>Test Sound</span>
                  </button>
                  <button
                    type="submit"
                    disabled={savingVoice}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-brand-600/10 flex items-center space-x-1"
                  >
                    {savingVoice ? (
                      <RefreshCw className="animate-spin" size={12} />
                    ) : (
                      <>
                        <Save size={12} />
                        <span>Save System Voice</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Edit Subscription Modal */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-slate-950 dark:text-white flex items-center space-x-2">
              <Sliders className="text-brand-500" size={20} />
              <span>Modify Subscription</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Manually override plan limits and status for <strong>{editingTenant.name}</strong>
            </p>

            <div className="space-y-4 mt-6">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-450 mb-1">Pricing Plan Tier</label>
                <select
                  value={editPlanId}
                  onChange={(e) => setEditPlanId(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-slate-200"
                >
                  <option value="starter">Starter (Free)</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-450 mb-1">Subscription Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none dark:text-slate-200"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="canceled">Canceled</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setEditingTenant(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlan}
                disabled={savingPlan}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-brand-600/10 flex items-center space-x-1"
              >
                {savingPlan ? (
                  <RefreshCw className="animate-spin" size={12} />
                ) : (
                  <span>Save Plan Changes</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
