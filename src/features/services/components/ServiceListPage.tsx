import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, ToggleLeft, ToggleRight, Sparkles, Building2 } from 'lucide-react';
import { useBranches } from '@/features/branches/hooks/useBranches';
import { useServices } from '../hooks/useServices';
import { useCreateService } from '../hooks/useCreateService';
import { useUpdateService } from '../hooks/useUpdateService';
import { Service } from '@/types/firestore';
import { ServiceForm } from './ServiceForm';

export const ServiceListPage: React.FC = () => {
  const { t } = useTranslation();

  // Load branches first
  const { data: branches = [], isLoading: isLoadingBranches } = useBranches();
  
  // Selected Branch state
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  // Auto-select first branch
  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  // Load services for selected branch
  const { data: services = [], isLoading: isLoadingServices } = useServices(selectedBranchId);
  
  // Mutations
  const createMutation = useCreateService(selectedBranchId);
  const { updateMutation, toggleMutation } = useUpdateService(selectedBranchId);

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const handleEditClick = (service: Service) => {
    setSelectedService(service);
    setIsFormOpen(true);
  };

  const handleCreateClick = () => {
    setSelectedService(null);
    setIsFormOpen(true);
  };

  const handleToggleActive = async (service: Service) => {
    try {
      await toggleMutation.mutateAsync({
        serviceId: service.id,
        isActive: !service.isActive,
      });
    } catch (err) {
      console.error('Toggle status failed:', err);
    }
  };

  const handleFormSubmit = async (fields: any) => {
    try {
      if (selectedService) {
        await updateMutation.mutateAsync({
          serviceId: selectedService.id,
          data: fields,
        });
      } else {
        await createMutation.mutateAsync(fields);
      }
      setIsFormOpen(false);
      setSelectedService(null);
    } catch (err) {
      console.error('Form submission failed:', err);
      throw err;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('services.title')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('services.subtitle')}
          </p>
        </div>

        {branches.length > 0 && selectedBranchId && (
          <button
            onClick={handleCreateClick}
            className="flex items-center gap-1.5 py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm rounded-xl shadow-md shadow-brand-600/15 hover:shadow-brand-600/25 transition-all cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>{t('services.addService')}</span>
          </button>
        )}
      </div>

      {/* Branch Selector Dropdown */}
      {!isLoadingBranches && branches.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800 rounded-2xl max-w-md">
          <Building2 className="w-5 h-5 text-slate-400" />
          <div className="flex-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
              {t('services.branchSelectLabel')}
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full bg-transparent text-sm font-extrabold text-slate-800 dark:text-white outline-none cursor-pointer"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="text-slate-900 dark:text-slate-900">
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Loading States */}
      {(isLoadingBranches || (selectedBranchId && isLoadingServices)) && (
        <div className="border border-slate-250/60 dark:border-slate-800/80 rounded-3xl overflow-hidden bg-white dark:bg-slate-900">
          <div className="h-12 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800"></div>
          <div className="p-8 space-y-4">
            <div className="h-4 bg-slate-50 dark:bg-slate-800/20 rounded-md animate-pulse w-3/4"></div>
            <div className="h-4 bg-slate-50 dark:bg-slate-800/20 rounded-md animate-pulse w-1/2"></div>
            <div className="h-4 bg-slate-50 dark:bg-slate-800/20 rounded-md animate-pulse w-5/6"></div>
          </div>
        </div>
      )}

      {/* No branches warning */}
      {!isLoadingBranches && branches.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-50/50 dark:bg-slate-900/35 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center max-w-md mx-auto mt-12">
          <div className="p-4 bg-red-50 dark:bg-red-955/20 text-red-655 rounded-2xl mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-850 dark:text-white">
            {t('pages.branches.noBranches')}
          </h3>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
            {t('pages.branches.noBranchesDesc')}
          </p>
        </div>
      )}

      {/* Empty State for services */}
      {!isLoadingBranches && branches.length > 0 && !isLoadingServices && services.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-50/50 dark:bg-slate-900/35 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center max-w-md mx-auto mt-12">
          <div className="p-4 bg-brand-50 dark:bg-brand-950/20 text-brand-655 rounded-2xl mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-850 dark:text-white">
            {t('services.noServices')}
          </h3>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
            {t('services.noServicesDesc')}
          </p>
          <button
            onClick={handleCreateClick}
            className="mt-5 flex items-center gap-1.5 py-2 px-4 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('services.addService')}</span>
          </button>
        </div>
      )}

      {/* Services Table View */}
      {!isLoadingBranches && branches.length > 0 && !isLoadingServices && services.length > 0 && (
        <div className="border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm bg-white dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-850 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">{t('services.table.name')}</th>
                  <th className="py-4 px-6">{t('services.table.category')}</th>
                  <th className="py-4 px-6">{t('services.table.duration')}</th>
                  <th className="py-4 px-6">{t('services.table.maxConcurrent')}</th>
                  <th className="py-4 px-6 text-center">{t('services.table.status')}</th>
                  <th className="py-4 px-6 text-right">{t('services.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-805/70 text-sm text-slate-800 dark:text-slate-300">
                {services.map((service) => (
                  <tr
                    key={service.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="font-extrabold text-slate-950 dark:text-white">
                        {service.name}
                      </div>
                      {service.description && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 max-w-sm">
                          {service.description}
                        </div>
                      )}
                      {service.customFields.length > 0 && (
                        <div className="mt-1.5 flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                          <span className="text-[10px] text-brand-555 dark:text-brand-400 font-bold uppercase tracking-wider">
                            {service.customFields.length} custom questions requested
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 font-medium">
                      {service.category ? (
                        <span className="py-1 px-2.5 bg-slate-100 dark:bg-slate-800 text-slate-655 dark:text-slate-350 text-xs rounded-lg">
                          {service.category}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 font-semibold">
                      {t('services.table.minutes', { count: service.estimatedDurationMinutes })}
                    </td>
                    <td className="py-4 px-6 font-medium">
                      {t('services.table.people', { count: service.maxConcurrent })}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleToggleActive(service)}
                        className="inline-flex text-slate-400 hover:text-brand-500 dark:hover:text-brand-400 transition-colors cursor-pointer"
                        title={service.isActive ? t('services.table.inactive') : t('services.table.active')}
                      >
                        {service.isActive ? (
                          <ToggleRight className="w-8 h-8 text-success" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleEditClick(service)}
                        className="py-1.5 px-3 bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>{t('pages.branches.branchCard.edit')}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Dialog Overlay */}
      {isFormOpen && (
        <ServiceForm
          initialData={selectedService}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedService(null);
          }}
          onSubmit={handleFormSubmit}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
};

export default ServiceListPage;
