import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Building2, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { useBranches } from '@/features/branches/hooks/useBranches';
import { useServices } from '@/features/services/hooks/useServices';
import { Counter } from '@/types/firestore';
import { useAuth } from '@/context/AuthContext';
import {
  createCounter,
  updateCounter,
  deleteCounter,
  subscribeCounters,
} from '../repository/counterRepository';
import { CounterForm } from './CounterForm';

export const CounterManagePage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Load branches
  const { data: branches = [], isLoading: isLoadingBranches } = useBranches();
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  // Auto-select first branch
  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  // Load services for selected branch
  const { data: services = [], isLoading: isLoadingServices } = useServices(selectedBranchId);

  // Counters state
  const [counters, setCounters] = useState<Counter[]>([]);
  const [isLoadingCounters, setIsLoadingCounters] = useState(false);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCounter, setSelectedCounter] = useState<Counter | null>(null);

  // Subscribe to counters
  useEffect(() => {
    if (!selectedBranchId) return;

    setIsLoadingCounters(true);
    const unsub = subscribeCounters(
      selectedBranchId,
      (list) => {
        setCounters(list);
        setIsLoadingCounters(false);
      },
      (err) => {
        console.error('Failed to subscribe to counters:', err);
        setIsLoadingCounters(false);
      }
    );

    return () => unsub();
  }, [selectedBranchId]);

  const handleCreateClick = () => {
    setSelectedCounter(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (counter: Counter) => {
    setSelectedCounter(counter);
    setIsFormOpen(true);
  };

  const handleToggleActive = async (counter: Counter) => {
    try {
      await updateCounter(counter.id, { isActive: !counter.isActive });
    } catch (err) {
      console.error('Failed to toggle counter status:', err);
    }
  };

  const handleToggleSound = async (counter: Counter) => {
    try {
      const nextSound = counter.soundStatus === 'muted' ? 'enabled' : 'muted';
      await updateCounter(counter.id, { soundStatus: nextSound });
    } catch (err) {
      console.error('Failed to toggle counter sound status:', err);
    }
  };

  const handleDeleteClick = async (counter: Counter) => {
    if (!confirm(t('pages.counters.confirmDelete', 'Are you sure you want to delete this counter?'))) {
      return;
    }
    try {
      await deleteCounter(counter.id);
    } catch (err) {
      console.error('Failed to delete counter:', err);
    }
  };

  const handleFormSubmit = async (values: any) => {
    if (!selectedBranchId || !user?.tenantId) return;
    try {
      if (selectedCounter) {
        await updateCounter(selectedCounter.id, values);
      } else {
        await createCounter({
          ...values,
          branchId: selectedBranchId,
          tenantId: user.tenantId,
        });
      }
      setIsFormOpen(false);
      setSelectedCounter(null);
    } catch (err) {
      console.error('Counter submission failed:', err);
      throw err;
    }
  };

  // Helper to map service IDs to names
  const renderServiceBadgeList = (ids: string[] = []) => {
    if (!ids || ids.length === 0) {
      return <span className="text-slate-400 dark:text-slate-655 text-xs italic">—</span>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {ids.map((id) => {
          const serviceName = services.find((s) => s.id === id)?.name || id;
          return (
            <span
              key={id}
              className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded-md border border-slate-200/50 dark:border-slate-700/50 max-w-[120px] truncate"
              title={serviceName}
            >
              {serviceName}
            </span>
          );
        })}
      </div>
    );
  };

  const isLoading = isLoadingBranches || (selectedBranchId && (isLoadingServices || isLoadingCounters));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('pages.counters.title', 'Counters Management')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('pages.counters.subtitle', 'Configure branch counters and prioritize service queues.')}
          </p>
        </div>

        <div>
          {branches.length > 0 && selectedBranchId && (
            <button
              onClick={handleCreateClick}
              className="flex items-center gap-1.5 py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm rounded-xl shadow-md shadow-brand-600/15 hover:shadow-brand-600/25 transition-all cursor-pointer"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>{t('pages.counters.addBtn', 'Add Counter')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Branch Selector */}
      {!isLoadingBranches && branches.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800 rounded-2xl max-w-md">
          <Building2 className="w-5 h-5 text-slate-400" />
          <div className="flex-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
              {t('pages.counters.branchSelectLabel', 'Select Branch')}
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
      {isLoading && (
        <div className="border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden bg-white dark:bg-slate-900">
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
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl text-center max-w-md mx-auto mt-12 shadow-sm">
          <div className="p-4 bg-red-50 dark:bg-red-955/40 text-red-655 dark:text-red-405 rounded-2xl mb-4 border border-red-100/50 dark:border-red-900/30">
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

      {/* Empty State for counters */}
      {!isLoading && branches.length > 0 && counters.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl text-center max-w-md mx-auto mt-12 shadow-sm">
          <div className="p-4 bg-brand-50 dark:bg-brand-950/40 text-brand-655 dark:text-brand-400 rounded-2xl mb-4 border border-brand-100/50 dark:border-brand-900/30">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-850 dark:text-white">
            {t('pages.counters.noCounters', 'No Counters Defined')}
          </h3>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
            {t('pages.counters.noCountersDesc', 'Define counters for this branch to start dispatching tickets.')}
          </p>
          <button
            onClick={handleCreateClick}
            className="mt-5 flex items-center gap-1.5 py-2 px-4 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>{t('pages.counters.addBtn', 'Add Counter')}</span>
          </button>
        </div>
      )}

      {/* Table view */}
      {!isLoading && branches.length > 0 && counters.length > 0 && (
        <div className="border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm bg-white dark:bg-slate-900 animate-in fade-in duration-150">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-850 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">{t('pages.counters.table.name', 'Counter Name')}</th>
                  <th className="py-4 px-6">{t('pages.counters.table.primary', 'Primary Services')}</th>
                  <th className="py-4 px-6">{t('pages.counters.table.secondary', 'Secondary Services')}</th>
                  <th className="py-4 px-6">{t('pages.counters.table.oneStop', 'One-Stop Services')}</th>
                  <th className="py-4 px-6 text-center">{t('pages.counters.table.sound', 'Sound')}</th>
                  <th className="py-4 px-6 text-center">{t('pages.counters.table.status', 'Status')}</th>
                  <th className="py-4 px-6 text-right">{t('pages.counters.table.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-805/70 text-sm text-slate-850 dark:text-slate-300">
                {counters.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors"
                  >
                    <td className="py-4 px-6 font-extrabold text-slate-950 dark:text-white">
                      {c.name}
                    </td>
                    <td className="py-4 px-6">
                      {renderServiceBadgeList(c.primaryServiceIds)}
                    </td>
                    <td className="py-4 px-6">
                      {renderServiceBadgeList(c.secondaryServiceIds)}
                    </td>
                    <td className="py-4 px-6">
                      {renderServiceBadgeList(c.oneStopServiceIds)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleToggleSound(c)}
                        className="inline-flex p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title={c.soundStatus === 'muted' ? t('pages.counters.sound.muted', 'Muted') : t('pages.counters.sound.enabled', 'Enabled')}
                      >
                        {c.soundStatus === 'muted' ? (
                          <VolumeX className="w-5 h-5 text-red-500" />
                        ) : (
                          <Volume2 className="w-5 h-5 text-emerald-500" />
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleToggleActive(c)}
                        className="inline-flex text-slate-400 hover:text-brand-500 dark:hover:text-brand-400 transition-colors cursor-pointer"
                        title={c.isActive ? t('pages.counters.status.active', 'Active') : t('pages.counters.status.inactive', 'Inactive')}
                      >
                        {c.isActive ? (
                          <ToggleRight className="w-8 h-8 text-success" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleEditClick(c)}
                        className="py-1.5 px-3 bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-750 dark:text-slate-200 font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>{t('common.edit', 'Edit')}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(c)}
                        className="py-1.5 px-3 bg-white dark:bg-slate-800 border border-danger-200 dark:border-danger-900/50 hover:bg-danger-50 dark:hover:bg-danger-955/20 text-danger font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t('common.delete', 'Delete')}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form modal */}
      {isFormOpen && (
        <CounterForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedCounter(null);
          }}
          onSubmit={handleFormSubmit}
          services={services}
          counter={selectedCounter}
          voiceSettings={branches.find((b) => b.id === selectedBranchId)?.voiceSettings}
        />
      )}
    </div>
  );
};

export default CounterManagePage;
