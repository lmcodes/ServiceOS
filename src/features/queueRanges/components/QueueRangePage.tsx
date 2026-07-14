import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTenant } from '@/context/TenantContext';
import { 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Clock
} from 'lucide-react';
import { QueueRange } from '@/types/firestore';
import { 
  subscribeQueueRanges, 
  createQueueRange, 
  updateQueueRange, 
  deleteQueueRange, 
  resetQueueRangeCounter,
  CreateQueueRangeInput 
} from '../repository/queueRangeRepository';
import { QueueRangeForm } from './QueueRangeForm';

export const QueueRangePage: React.FC = () => {
  const { t } = useTranslation();
  const { tenant } = useTenant();

  const [ranges, setRanges] = useState<QueueRange[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<QueueRange | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (!tenant?.id) return;

    setLoading(true);
    const unsubscribe = subscribeQueueRanges(
      tenant.id,
      (data) => {
        setRanges(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error subscribing to queue ranges:', err);
        setError(t('pages.queueRanges.errorLoad', 'Failed to load queue ranges'));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tenant?.id, t]);

  const handleCreateOrUpdate = async (formData: Omit<CreateQueueRangeInput, 'tenantId'>) => {
    if (!tenant?.id) return;
    setFormLoading(true);
    setError(null);
    try {
      if (selectedRange) {
        await updateQueueRange(selectedRange.id, formData);
        showSuccess(t('pages.queueRanges.successUpdate', 'Queue range updated successfully'));
      } else {
        await createQueueRange({
          ...formData,
          tenantId: tenant.id,
        });
        showSuccess(t('pages.queueRanges.successCreate', 'Queue range created successfully'));
      }
      setIsFormOpen(false);
      setSelectedRange(null);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || t('common.errorConnection'));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('pages.queueRanges.confirmDelete', 'Are you sure you want to delete this range? Services linked to this range will fall back to legacy branch-level counters.'))) return;
    try {
      await deleteQueueRange(id);
      showSuccess(t('pages.queueRanges.successDelete', 'Queue range deleted successfully'));
    } catch (err: any) {
      console.error(err);
      setError(t('pages.queueRanges.errorDelete', 'Failed to delete queue range'));
    }
  };

  const handleReset = async (id: string) => {
    if (!window.confirm(t('pages.queueRanges.confirmReset', 'Are you sure you want to reset this counter? The next issued ticket will start back from the starting number.'))) return;
    try {
      await resetQueueRangeCounter(id);
      showSuccess(t('pages.queueRanges.successReset', 'Queue counter reset successfully'));
    } catch (err: any) {
      console.error(err);
      setError(t('pages.queueRanges.errorReset', 'Failed to reset queue counter'));
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const filteredRanges = ranges.filter((r) =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.prefix.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('pages.queueRanges.title', 'Queue Ranges')}
          </h2>
          <p className="text-sm text-slate-550 dark:text-slate-400 mt-1">
            {t('pages.queueRanges.subtitle', 'Configure custom prefixed number ranges to link with your services')}
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedRange(null);
            setIsFormOpen(true);
          }}
          className="flex items-center gap-1.5 py-2.5 px-4 bg-brand-655 hover:bg-brand-600 text-white font-semibold text-sm rounded-xl shadow-md shadow-brand-655/10 transition-all cursor-pointer w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>{t('pages.queueRanges.addBtn', 'Add Queue Range')}</span>
        </button>
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

      {/* Main Board Filter / Search */}
      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4.5 h-4.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('pages.queueRanges.searchPlaceholder', 'Search ranges by name or prefix...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
        </div>
        <button className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-500 dark:text-slate-400 cursor-pointer">
          <SlidersHorizontal className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Queue Ranges Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-3xl">
          <Clock className="w-8 h-8 text-brand-655 animate-spin" />
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">{t('common.loading')}</p>
        </div>
      ) : filteredRanges.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-3xl shadow-sm">
          <SlidersHorizontal className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="font-bold text-slate-905 dark:text-white text-base">{t('pages.queueRanges.noRangesTitle', 'No Queue Ranges Found')}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {t('pages.queueRanges.noRangesDesc', 'Create prefixed queue ranges to assign them to services. Link ranges for separate counters.')}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('pages.queueRanges.table.name', 'Name')}</th>
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('pages.queueRanges.table.prefix', 'Prefix')}</th>
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('pages.queueRanges.table.range', 'Range Bounds')}</th>
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('pages.queueRanges.table.reset', 'Reset Policy')}</th>
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('pages.queueRanges.table.counter', 'Current Counter')}</th>
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">{t('pages.queueRanges.table.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredRanges.map((range) => (
                  <tr key={range.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="p-4">
                      <span className="font-bold text-slate-900 dark:text-white text-sm block">{range.name}</span>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-brand-50 dark:bg-brand-950/40 text-brand-655 dark:text-brand-400 font-black text-xs rounded-lg border border-brand-100/50 dark:border-brand-900/30 font-mono">
                        {range.prefix || '-'}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-mono text-slate-600 dark:text-slate-300">
                      {range.startNumber} - {range.endNumber}
                    </td>
                    <td className="p-4">
                      <span className="capitalize text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {range.resetPolicy === 'daily' ? t('pages.queueRanges.form.policyDaily', 'Daily') : range.resetPolicy === 'manual' ? t('pages.queueRanges.form.policyManual', 'Manual') : t('pages.queueRanges.form.policyNever', 'Never')}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                          {range.prefix ? `${range.prefix}-` : ''}{String(range.currentNumber + 1).padStart(range.padLength, '0')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          (raw: {range.currentNumber})
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleReset(range.id)}
                          title={t('pages.queueRanges.tooltips.reset', 'Reset Counter')}
                          className="p-1.5 text-slate-450 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRange(range);
                            setIsFormOpen(true);
                          }}
                          title={t('pages.queueRanges.tooltips.edit', 'Edit Range')}
                          className="p-1.5 text-slate-455 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(range.id)}
                          title={t('pages.queueRanges.tooltips.delete', 'Delete Range')}
                          className="p-1.5 text-slate-455 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-955/20 rounded-lg cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Form Modal */}
      {isFormOpen && (
        <QueueRangeForm
          initialData={selectedRange}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedRange(null);
          }}
          onSubmit={handleCreateOrUpdate}
          isLoading={formLoading}
        />
      )}
    </div>
  );
};

export default QueueRangePage;
