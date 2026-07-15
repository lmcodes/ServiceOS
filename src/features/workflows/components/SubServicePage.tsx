import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTenant } from '@/context/TenantContext';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { SubService } from '@/types/firestore';
import { 
  subscribeSubServices, 
  createSubService, 
  updateSubService, 
  deleteSubService,
  loadSubServicePresets,
  CreateSubServiceInput 
} from '../repository/subServiceRepository';
import { SubServiceForm } from './SubServiceForm';

export const SubServicePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { tenant } = useTenant();

  const [subServices, setSubServices] = useState<SubService[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSubService, setSelectedSubService] = useState<SubService | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [presetLoading, setPresetLoading] = useState(false);

  useEffect(() => {
    if (!tenant?.id) return;

    setLoading(true);
    const unsubscribe = subscribeSubServices(
      tenant.id,
      (data) => {
        setSubServices(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error subscribing to sub-services:', err);
        setError(t('pages.subServices.errorLoad', 'Failed to load sub-services'));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tenant?.id, t]);

  const handleCreateOrUpdate = async (formData: Omit<CreateSubServiceInput, 'tenantId'>) => {
    if (!tenant?.id) return;
    setFormLoading(true);
    setError(null);
    try {
      if (selectedSubService) {
        await updateSubService(selectedSubService.id, formData);
        showSuccess(t('pages.subServices.successUpdate', 'Sub-service updated successfully'));
      } else {
        await createSubService(tenant.id, formData);
        showSuccess(t('pages.subServices.successCreate', 'Sub-service created successfully'));
      }
      setIsFormOpen(false);
      setSelectedSubService(null);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || t('common.errorConnection'));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('pages.subServices.confirmDelete', 'Are you sure you want to delete this sub-service? This will not affect active queues, but it will remove it from workflow template builders.'))) return;
    try {
      await deleteSubService(id);
      showSuccess(t('pages.subServices.successDelete', 'Sub-service deleted successfully'));
    } catch (err: any) {
      console.error(err);
      setError(t('pages.subServices.errorDelete', 'Failed to delete sub-service'));
    }
  };

  const handleLoadPresets = async () => {
    if (!tenant?.id) return;
    if (!window.confirm(t('pages.subServices.confirmLoadPresets', 'Load sub-service presets for your business type? Existing custom sub-services will be kept.'))) return;
    
    setPresetLoading(true);
    setError(null);
    try {
      const type = tenant.businessType || 'general';
      const mappedType = type === 'clinic' ? 'clinic' : type === 'restaurant' ? 'restaurant' : 'general';
      await loadSubServicePresets(tenant.id, mappedType);
      showSuccess(t('pages.subServices.successLoadPresets', 'Loaded default presets successfully'));
    } catch (err: any) {
      console.error(err);
      setError(t('pages.subServices.errorLoadPresets', 'Failed to load presets'));
    } finally {
      setPresetLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const getLocalizedName = (sub: SubService) => {
    if (i18n.language === 'th') {
      return sub.name.th || sub.name.en;
    }
    return sub.name.en || sub.name.th;
  };

  const filteredSubServices = subServices.filter((s) => {
    const locName = getLocalizedName(s).toLowerCase();
    const cat = (s.category || '').toLowerCase();
    return locName.includes(searchTerm.toLowerCase()) || cat.includes(searchTerm.toLowerCase());
  });

  const renderIcon = (iconName: string, className?: string) => {
    const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.HelpCircle;
    return <IconComponent className={className || "w-5 h-5"} />;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('pages.subServices.title', 'Sub-Services & Workflow Steps')}
          </h2>
          <p className="text-sm text-slate-550 dark:text-slate-400 mt-1">
            {t('pages.subServices.subtitle', 'Manage modular step templates to reuse across multiple services and custom workflows')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {subServices.length === 0 && (
            <button
              onClick={handleLoadPresets}
              disabled={presetLoading}
              className="flex items-center gap-1.5 py-2.5 px-4 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:hover:bg-brand-900/60 text-brand-655 dark:text-brand-400 font-semibold text-sm rounded-xl border border-brand-200 dark:border-brand-900/50 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-brand-555 animate-pulse" />
              <span>{presetLoading ? t('common.loading') : t('pages.subServices.loadPresetsBtn', 'Load Presets')}</span>
            </button>
          )}
          <button
            onClick={() => {
              setSelectedSubService(null);
              setIsFormOpen(true);
            }}
            className="flex items-center gap-1.5 py-2.5 px-4 bg-brand-655 hover:bg-brand-600 text-white font-semibold text-sm rounded-xl shadow-md shadow-brand-655/10 transition-all cursor-pointer w-fit"
          >
            <Plus className="w-4 h-4" />
            <span>{t('pages.subServices.addBtn', 'Add Sub-Service')}</span>
          </button>
        </div>
      </div>

      {/* Alert Notices */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-900 text-red-750 dark:text-red-300 text-xs rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-955/20 border border-emerald-205 dark:border-emerald-900 text-emerald-750 dark:text-emerald-300 text-xs rounded-2xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter / Search */}
      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4.5 h-4.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('pages.subServices.searchPlaceholder', 'Search sub-services by name or category...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-3xl">
          <Clock className="w-8 h-8 text-brand-655 animate-spin" />
          <p className="mt-2 text-xs text-slate-550 dark:text-slate-400 font-medium">{t('common.loading')}</p>
        </div>
      ) : filteredSubServices.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-3xl shadow-sm">
          <Layers className="w-12 h-12 text-slate-350 dark:text-slate-650 mx-auto mb-4" />
          <h3 className="font-bold text-slate-905 dark:text-white text-base">{t('pages.subServices.noSubServicesTitle', 'No Sub-Services Found')}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto mb-4">
            {t('pages.subServices.noSubServicesDesc', 'Create reusable steps for your custom workflow queues, or load predefined templates.')}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleLoadPresets}
              disabled={presetLoading}
              className="flex items-center gap-1.5 py-2 px-4 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:hover:bg-brand-900/60 text-brand-655 dark:text-brand-400 font-semibold text-xs rounded-xl border border-brand-250/50 dark:border-brand-900/50 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-brand-555 animate-pulse" />
              <span>{presetLoading ? t('common.loading') : t('pages.subServices.loadPresetsBtn', 'Load Presets')}</span>
            </button>
            <button
              onClick={() => {
                setSelectedSubService(null);
                setIsFormOpen(true);
              }}
              className="flex items-center gap-1 py-2 px-4 bg-brand-655 hover:bg-brand-600 text-white font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('pages.subServices.addBtn', 'Add Sub-Service')}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubServices.map((sub) => (
            <div 
              key={sub.id} 
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-brand-50 dark:bg-brand-950/40 text-brand-655 dark:text-brand-400 rounded-2xl border border-brand-100/50 dark:border-brand-900/30">
                    {renderIcon(sub.icon)}
                  </div>
                  <span className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 text-slate-550 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                    {sub.category}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base line-clamp-1">
                  {getLocalizedName(sub)}
                </h4>
                <div className="flex items-center gap-1.5 text-xs text-slate-450 dark:text-slate-400 mt-2 font-medium">
                  <Clock className="w-4 h-4 text-brand-500" />
                  <span>{sub.estimatedMinutes} {t('pages.services.table.minutes', { count: sub.estimatedMinutes })}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800/85 mt-4 pt-3.5 flex items-center justify-end gap-1">
                <button
                  onClick={() => {
                    setSelectedSubService(sub);
                    setIsFormOpen(true);
                  }}
                  title={t('common.edit', 'Edit')}
                  className="p-2 text-slate-455 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl cursor-pointer transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(sub.id)}
                  title={t('common.delete', 'Delete')}
                  className="p-2 text-slate-455 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-955/20 rounded-xl cursor-pointer transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Form Modal */}
      {isFormOpen && (
        <SubServiceForm
          initialData={selectedSubService}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedSubService(null);
          }}
          onSubmit={handleCreateOrUpdate}
          isLoading={formLoading}
        />
      )}
    </div>
  );
};

export default SubServicePage;
