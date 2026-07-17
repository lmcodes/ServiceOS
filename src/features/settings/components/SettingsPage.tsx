import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  Globe, 
  Image as ImageIcon, 
  Trash2, 
  CreditCard, 
  ShieldAlert, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  Upload,
  Info
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { 
  updateTenantProfile, 
  uploadTenantLogo, 
  cancelTenantSubscription, 
  getTenantResourceUsage 
} from '../repository/tenantRepository';

const COMMON_TIMEZONES = [
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Australia/Sydney',
  'UTC',
];

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { tenant, subscription } = useTenant();
  const isFreePlan = !subscription || subscription.planId === 'starter';

  // Active Tab
  const [activeTab, setActiveTab] = useState<'profile' | 'subscription' | 'danger'>('profile');

  // Form states
  const [businessName, setBusinessName] = useState('');
  const [timezone, setTimezone] = useState('Asia/Bangkok');
  const [logoUrl, setLogoUrl] = useState('');
  
  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadSuccess, setLogoUploadSuccess] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

  // Operation indicators
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Subscription usage state
  const [branchesCount, setBranchesCount] = useState(0);
  const [staffCount, setStaffCount] = useState(0);
  const [loadingUsage, setLoadingUsage] = useState(false);

  // Cancellation double confirmation state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelPhraseInput, setCancelPhraseInput] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Initialize form fields when tenant data is loaded
  useEffect(() => {
    if (tenant) {
      setBusinessName(tenant.name || '');
      setTimezone(tenant.settings?.timezone || 'Asia/Bangkok');
      setLogoUrl(tenant.logo || '');
    }
  }, [tenant]);

  // Fetch usage stats when subscription tab is active
  useEffect(() => {
    if (tenant?.id && activeTab === 'subscription') {
      setLoadingUsage(true);
      getTenantResourceUsage(tenant.id)
        .then(({ branchesCount, staffCount }) => {
          setBranchesCount(branchesCount);
          setStaffCount(staffCount);
        })
        .catch((err) => {
          console.error('Error fetching tenant usage stats:', err);
        })
        .finally(() => {
          setLoadingUsage(false);
        });
    }
  }, [tenant?.id, activeTab]);

  // Handle local logo file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoUploadError(t('pages.settings.logoError'));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setLogoUploadError('File size too large (maximum 2MB)');
      return;
    }

    setSelectedFile(file);
    setLogoUploadError(null);
    setLogoUploadSuccess(false);

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Upload logo file to storage
  const handleUploadLogo = async () => {
    if (!selectedFile || !tenant?.id) return;

    setIsUploadingLogo(true);
    setLogoUploadError(null);
    setLogoUploadSuccess(false);

    try {
      const downloadUrl = await uploadTenantLogo(tenant.id, selectedFile);
      setLogoUrl(downloadUrl);
      setLogoUploadSuccess(true);
      setSelectedFile(null);
      setFilePreview(null);
    } catch (err: any) {
      console.error('Failed to upload logo:', err);
      setLogoUploadError(t('pages.settings.logoError'));
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Save profile changes (Business Name & Timezone)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id) return;

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      await updateTenantProfile(tenant.id, businessName, timezone);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Failed to update tenant profile:', err);
      setSaveError(t('pages.settings.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  // Trigger cancel subscription action
  const handleConfirmCancellation = async () => {
    if (cancelPhraseInput !== 'CANCEL' || !tenant?.id) return;

    setIsCancelling(true);
    setCancelError(null);

    try {
      await cancelTenantSubscription(tenant.id);
      setIsCancelModalOpen(false);
      alert(t('pages.settings.cancelSuccess'));
      await logout();
      navigate('/login');
    } catch (err: any) {
      console.error('Failed to cancel subscription:', err);
      setCancelError(t('pages.settings.cancelError'));
      setIsCancelling(false);
    }
  };

  // Access check: Owner role only
  if (user?.role !== 'owner') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-lg mx-auto text-center mt-12 shadow-sm">
        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          {t('pages.settings.unauthorizedTitle')}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('pages.settings.unauthorizedDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t('pages.settings.title')}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t('pages.settings.subtitle')}
        </p>
      </div>

      {/* Tabs Menu Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-4 text-sm font-bold transition-all border-b-2 outline-none cursor-pointer ${
            activeTab === 'profile'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-905'
          }`}
        >
          {t('pages.settings.tabProfile')}
        </button>
        <button
          onClick={() => setActiveTab('subscription')}
          className={`pb-4 text-sm font-bold transition-all border-b-2 outline-none cursor-pointer ${
            activeTab === 'subscription'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-905'
          }`}
        >
          {t('pages.settings.tabSubscription')}
        </button>
        <button
          onClick={() => setActiveTab('danger')}
          className={`pb-4 text-sm font-bold transition-all border-b-2 outline-none cursor-pointer ${
            activeTab === 'danger'
              ? 'border-red-500 text-red-500'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-905'
          }`}
        >
          {t('pages.settings.tabDangerZone')}
        </button>
      </div>

      {/* Profile Form Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-8">
          
          {/* Logo Uploader Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-brand-600" />
              {t('pages.settings.logoLabel')}
            </h3>

            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900/40 shadow-sm">
              
              {/* Logo Preview */}
              <div className="relative w-24 h-24 rounded-2xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-850 flex items-center justify-center overflow-hidden shadow-inner flex-shrink-0">
                {filePreview ? (
                  <img src={filePreview} alt="New Preview" className="w-full h-full object-contain" />
                ) : !isFreePlan && logoUrl ? (
                  <img src={logoUrl} alt="Business Logo" className="w-full h-full object-contain" />
                ) : (
                  <img src="/logo_mono_1.png" alt="System Default Logo" className="w-full h-full object-contain p-2" />
                )}
              </div>

              {/* Upload controls */}
              <div className="flex-1 w-full text-center sm:text-left space-y-2">
                {isFreePlan ? (
                  <div className="text-xs text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-3.5 py-2.5 rounded-xl inline-flex items-center gap-2 max-w-md">
                    <Info size={16} className="shrink-0" />
                    <span>Custom logo upload is only available on paid subscription plans.</span>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                      <label className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-sm flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5" />
                        Browse file...
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleFileChange} 
                          className="hidden" 
                        />
                      </label>

                      {selectedFile && (
                        <button
                          onClick={handleUploadLogo}
                          disabled={isUploadingLogo}
                          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm transition-colors flex items-center gap-1.5"
                        >
                          {isUploadingLogo ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          {t('pages.settings.logoUploadBtn')}
                        </button>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-450 dark:text-slate-500">
                      PNG, JPG or WEBP formats up to 2MB allowed.
                    </p>
                  </>
                )}

                {logoUploadSuccess && (
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                    {t('pages.settings.logoSuccess')}
                  </p>
                )}

                {logoUploadError && (
                  <p className="text-xs font-semibold text-red-500 dark:text-red-400 mt-1">
                    {logoUploadError}
                  </p>
                )}
              </div>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800/80" />

          {/* Form details */}
          <form onSubmit={handleSaveProfile} className="space-y-6">
            
            {/* Business Name Field */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">
                {t('pages.settings.businessName')}
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder={t('pages.settings.businessNamePlaceholder')}
                required
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-inner"
              />
            </div>

            {/* Timezone Field */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-slate-400" />
                {t('pages.settings.timezoneLabel')}
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white text-sm font-semibold outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-inner"
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Save Button */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={isSaving || !businessName.trim()}
                className="px-6 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-bold rounded-2xl cursor-pointer shadow-md shadow-brand-500/10 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {isSaving ? t('pages.settings.savingBtn') : t('pages.settings.saveBtn')}
              </button>

              {saveSuccess && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {t('pages.settings.saveSuccess')}
                </span>
              )}

              {saveError && (
                <span className="text-xs font-bold text-red-500 dark:text-red-400">
                  {saveError}
                </span>
              )}
            </div>

          </form>
        </div>
      )}

      {/* Subscription & Usage Tab */}
      {activeTab === 'subscription' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-8">
          
          {/* Card Info Plan */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/30 dark:bg-slate-950/10 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5" />
                {t('pages.settings.planLabel')}
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Standard Trial SaaS Plan
              </h3>
              <p className="text-xs text-slate-450 dark:text-slate-550">
                Premium multi-branch access, queue logs, and TV dashboard display system.
              </p>
            </div>
            
            <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-250 dark:border-emerald-900 text-emerald-650 dark:text-emerald-400 text-xs font-bold rounded-full">
              {t('pages.settings.planStatus')}: Active
            </div>
          </div>

          <hr className="border-slate-105 dark:border-slate-800/80" />

          {/* Resource Usage Progress Bars */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-brand-600" />
              {t('pages.settings.usageTitle')}
            </h3>

            {loadingUsage ? (
              <div className="flex justify-center items-center py-6">
                <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Branches limit */}
                <div className="p-5 border border-slate-150 dark:border-slate-800 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-600 dark:text-slate-400">
                      {t('pages.settings.branchesLimit')}
                    </span>
                    <span className="text-slate-900 dark:text-white">
                      {t('pages.settings.usageProgress', { current: branchesCount, total: 5 })}
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((branchesCount / 5) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-450 dark:text-slate-500">
                    A maximum of 5 physical locations/offices are allowed under this trial package.
                  </p>
                </div>

                {/* Staff limit */}
                <div className="p-5 border border-slate-150 dark:border-slate-800 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-600 dark:text-slate-400">
                      {t('pages.settings.staffLimit')}
                    </span>
                    <span className="text-slate-900 dark:text-white">
                      {t('pages.settings.usageProgress', { current: staffCount, total: 10 })}
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((staffCount / 10) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-450 dark:text-slate-500">
                    A maximum of 10 staff member directories can be active concurrently.
                  </p>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* Danger Zone Tab */}
      {activeTab === 'danger' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-start gap-4 p-5 bg-red-50 dark:bg-red-955/10 border border-red-200 dark:border-red-950 rounded-2xl text-red-800 dark:text-red-400">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold">{t('pages.settings.dangerZoneTitle')}</h3>
              <p className="text-xs leading-relaxed text-red-700/80 dark:text-red-400/80">
                {t('pages.settings.dangerZoneDesc')}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                setCancelPhraseInput('');
                setIsCancelModalOpen(true);
              }}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-2xl cursor-pointer transition-colors shadow-md shadow-red-500/10"
            >
              {t('pages.settings.cancelSubscriptionBtn')}
            </button>
          </div>
        </div>
      )}

      {/* Dual Confirmation Cancel Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-6">
            
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-650 rounded-2xl flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {t('pages.settings.confirmCancelTitle')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t('pages.settings.confirmCancelDesc')}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider block">
                {t('pages.settings.confirmCancelPhrase')}
              </label>
              
              <input
                type="text"
                value={cancelPhraseInput}
                onChange={(e) => setCancelPhraseInput(e.target.value)}
                placeholder="CANCEL"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs font-bold outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-center uppercase tracking-widest"
              />
            </div>

            {cancelError && (
              <p className="text-xs font-semibold text-red-500 dark:text-red-400">
                {cancelError}
              </p>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                disabled={isCancelling}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-205 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                {t('pages.settings.confirmCancelCancel')}
              </button>

              <button
                onClick={handleConfirmCancellation}
                disabled={isCancelling || cancelPhraseInput !== 'CANCEL'}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5"
              >
                {isCancelling ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                {t('pages.settings.confirmCancelConfirm')}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
