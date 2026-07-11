import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, Edit2, ToggleLeft, ToggleRight, Sparkles, Building2, 
  Workflow as WorkflowIcon, Trash2, ArrowRight
} from 'lucide-react';
import { useBranches } from '@/features/branches/hooks/useBranches';
import { useServices } from '../hooks/useServices';
import { useCreateService } from '../hooks/useCreateService';
import { useUpdateService } from '../hooks/useUpdateService';
import { Service, Workflow } from '@/types/firestore';
import { ServiceForm } from './ServiceForm';
import { useAuth } from '@/context/AuthContext';
import { subscribeWorkflows, deleteWorkflow } from '@/features/workflows/repository/workflowRepository';
import { WorkflowBuilderPage } from '@/features/workflows/components/WorkflowBuilderPage';

export const ServiceListPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Active Tab state
  const [activeTab, setActiveTab] = useState<'services' | 'workflows'>('services');

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

  // Modal & Builder States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [builderWorkflowId, setBuilderWorkflowId] = useState<string | null>(null);
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false);

  // Workflows state
  const [workflows, setWorkflows] = useState<Workflow[]>([]);

  // Subscribe to workflows
  useEffect(() => {
    if (!user?.tenantId) return;
    const unsub = subscribeWorkflows(
      user.tenantId,
      (list) => {
        setWorkflows(list);
      },
      (err) => {
        console.error('Failed to subscribe workflows:', err);
      }
    );
    return () => unsub();
  }, [user]);

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

  const handleDeleteWorkflow = async (wfId: string) => {
    if (!confirm('Are you sure you want to delete this workflow template? Services mapped to this workflow will fallback to standard queues.')) {
      return;
    }
    try {
      await deleteWorkflow(wfId);
    } catch (err) {
      console.error('Failed to delete workflow template:', err);
      alert('Failed to delete workflow template.');
    }
  };

  // If Workflow builder is active, render it full page within container
  if (isCreatingWorkflow || builderWorkflowId !== null) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <WorkflowBuilderPage
          workflowId={builderWorkflowId}
          onClose={() => {
            setIsCreatingWorkflow(false);
            setBuilderWorkflowId(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {activeTab === 'services' ? t('pages.services.title') : t('pages.workflows.title')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {activeTab === 'services' 
              ? t('pages.services.subtitle') 
              : t('pages.workflows.listSubtitle')}
          </p>
        </div>

        <div>
          {activeTab === 'services' ? (
            branches.length > 0 && selectedBranchId && (
              <button
                onClick={handleCreateClick}
                className="flex items-center gap-1.5 py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm rounded-xl shadow-md shadow-brand-600/15 hover:shadow-brand-600/25 transition-all cursor-pointer"
              >
                <Plus className="w-4.5 h-4.5" />
                <span>{t('pages.services.addService')}</span>
              </button>
            )
          ) : (
            <button
              onClick={() => setIsCreatingWorkflow(true)}
              className="flex items-center gap-1.5 py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm rounded-xl shadow-md shadow-brand-600/15 hover:shadow-brand-600/25 transition-all cursor-pointer"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>{t('pages.workflows.createWorkflowBtn')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('services')}
          className={`pb-3 text-sm font-extrabold border-b-2 transition-all outline-none cursor-pointer ${
            activeTab === 'services'
              ? 'border-brand-600 text-brand-655 dark:text-brand-400'
              : 'border-transparent text-slate-450 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {t('pages.services.title')}
        </button>
        <button
          onClick={() => setActiveTab('workflows')}
          className={`pb-3 text-sm font-extrabold border-b-2 transition-all outline-none cursor-pointer ${
            activeTab === 'workflows'
              ? 'border-brand-600 text-brand-655 dark:text-brand-400'
              : 'border-transparent text-slate-450 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {t('pages.workflows.title')}
        </button>
      </div>

      {/* SERVICES TAB CONTENT */}
      {activeTab === 'services' && (
        <>
          {/* Branch Selector Dropdown */}
          {!isLoadingBranches && branches.length > 0 && (
            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800 rounded-2xl max-w-md">
              <Building2 className="w-5 h-5 text-slate-400" />
              <div className="flex-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
                  {t('pages.services.branchSelectLabel')}
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
                {t('pages.services.noServices')}
              </h3>
              <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
                {t('pages.services.noServicesDesc')}
              </p>
              <button
                onClick={handleCreateClick}
                className="mt-5 flex items-center gap-1.5 py-2 px-4 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4.5 h-4.5" />
                <span>{t('pages.services.addService')}</span>
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
                      <th className="py-4 px-6">{t('pages.services.table.name')}</th>
                      <th className="py-4 px-6">{t('pages.services.table.category')}</th>
                      <th className="py-4 px-6">{t('pages.services.table.workflow')}</th>
                      <th className="py-4 px-6">{t('pages.services.table.duration')}</th>
                      <th className="py-4 px-6">{t('pages.services.table.maxConcurrent')}</th>
                      <th className="py-4 px-6 text-center">{t('pages.services.table.status')}</th>
                      <th className="py-4 px-6 text-right">{t('pages.services.table.actions')}</th>
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
                                {t('pages.services.table.customQuestions', { count: service.customFields.length })}
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
                        <td className="py-4 px-6">
                          {service.workflowId ? (
                            <span className="py-1 px-2.5 bg-brand-50 dark:bg-brand-955/20 text-brand-655 dark:text-brand-400 text-xs font-bold rounded-lg border border-brand-100 dark:border-brand-900/40 flex items-center gap-1 w-fit">
                              <WorkflowIcon className="w-3.5 h-3.5" />
                              {workflows.find((w) => w.id === service.workflowId)?.name || 'Mapped'}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">{t('pages.services.table.noneStandard')}</span>
                          )}
                        </td>
                        <td className="py-4 px-6 font-semibold">
                          {t('pages.services.table.minutes', { count: service.estimatedDurationMinutes })}
                        </td>
                        <td className="py-4 px-6 font-medium">
                          {t('pages.services.table.people', { count: service.maxConcurrent })}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => handleToggleActive(service)}
                            className="inline-flex text-slate-400 hover:text-brand-500 dark:hover:text-brand-400 transition-colors cursor-pointer"
                            title={service.isActive ? t('pages.services.table.inactive') : t('pages.services.table.active')}
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
        </>
      )}      {/* WORKFLOWS TAB CONTENT */}
      {activeTab === 'workflows' && (
        <div className="space-y-6">
          {workflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-slate-50/50 dark:bg-slate-900/35 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center max-w-md mx-auto mt-12">
              <div className="p-4 bg-brand-50 dark:bg-brand-950/20 text-brand-655 rounded-2xl mb-4">
                <WorkflowIcon className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-850 dark:text-white">
                {t('pages.workflows.noWorkflowsTitle')}
              </h3>
              <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
                {t('pages.workflows.noWorkflowsDesc')}
              </p>
              <button
                onClick={() => setIsCreatingWorkflow(true)}
                className="mt-5 flex items-center gap-1.5 py-2 px-4 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4.5 h-4.5" />
                <span>{t('pages.workflows.createWorkflowBtn')}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {workflows.map((wf) => (
                <div
                  key={wf.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-brand-50 dark:bg-brand-955/20 text-brand-655 rounded-2xl border border-brand-100 dark:border-brand-900/40">
                        <WorkflowIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 dark:text-white">{wf.name}</h3>
                        <span className="text-[10px] text-slate-450 dark:text-slate-550 font-bold uppercase tracking-wider block mt-0.5">
                          ID: {wf.id}
                        </span>
                      </div>
                    </div>

                    {wf.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {wf.description}
                      </p>
                    )}

                    {/* Stages Preview */}
                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">
                        {t('pages.workflows.chronologicalStages')} ({wf.stageIds?.length || 0})
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {wf.stageIds?.map((stageId, idx) => (
                          <React.Fragment key={stageId}>
                            <span className="py-1 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-800 text-[10px] font-extrabold text-slate-700 dark:text-slate-350 rounded-lg">
                              {/* Simple fallback since we don't have stage names loaded fully yet unless fetching details, but we can display the index or custom formatted stage name */}
                              Stage {idx + 1}
                            </span>
                            {idx < wf.stageIds.length - 1 && (
                              <ArrowRight className="w-3 h-3 text-slate-300 dark:text-slate-700" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleDeleteWorkflow(wf.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-955/20 rounded-xl transition-colors cursor-pointer border border-transparent"
                      title={t('pages.workflows.deleteTemplateTooltip')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setBuilderWorkflowId(wf.id)}
                      className="py-1.5 px-4 bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-205 font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>{t('pages.workflows.editTemplateBtn')}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
