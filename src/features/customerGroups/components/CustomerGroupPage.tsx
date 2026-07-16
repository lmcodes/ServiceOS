import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Sparkles } from 'lucide-react';
import { CustomerGroup } from '@/types/firestore';
import { useAuth } from '@/context/AuthContext';
import {
  createCustomerGroup,
  updateCustomerGroup,
  deleteCustomerGroup,
  subscribeCustomerGroups,
} from '../repository/customerGroupRepository';
import { CustomerGroupForm } from './CustomerGroupForm';

const PRESET_COLORS: Record<string, string> = {
  amber: 'text-amber-700 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40',
  blue: 'text-blue-700 bg-blue-50 dark:bg-blue-955/20 border-blue-200 dark:border-blue-900/40',
  purple: 'text-purple-700 bg-purple-50 dark:bg-purple-955/20 border-purple-200 dark:border-purple-900/40',
  rose: 'text-rose-700 bg-rose-50 dark:bg-rose-955/20 border-rose-200 dark:border-rose-900/40',
  emerald: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-955/20 border-emerald-200 dark:border-emerald-900/40',
};

export const CustomerGroupPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Customer Groups state
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<CustomerGroup | null>(null);

  // Subscribe to groups
  useEffect(() => {
    if (!user?.tenantId) return;

    setIsLoading(true);
    const unsub = subscribeCustomerGroups(
      user.tenantId,
      (list) => {
        setGroups(list);
        setIsLoading(false);
      },
      (err) => {
        console.error('Failed to subscribe to customer groups:', err);
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  const handleCreateClick = () => {
    setSelectedGroup(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (group: CustomerGroup) => {
    setSelectedGroup(group);
    setIsFormOpen(true);
  };

  const handleDeleteClick = async (group: CustomerGroup) => {
    if (!confirm(t('pages.customerGroups.confirmDelete', 'Are you sure you want to delete this customer priority group?'))) {
      return;
    }
    try {
      await deleteCustomerGroup(group.id);
    } catch (err) {
      console.error('Failed to delete group:', err);
    }
  };

  const handleFormSubmit = async (values: any) => {
    if (!user?.tenantId) return;
    try {
      if (selectedGroup) {
        await updateCustomerGroup(selectedGroup.id, values);
      } else {
        await createCustomerGroup({
          ...values,
          tenantId: user.tenantId,
        });
      }
      setIsFormOpen(false);
      setSelectedGroup(null);
    } catch (err) {
      console.error('Customer group submission failed:', err);
      throw err;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('pages.customerGroups.title', 'Customer Groups & Priority')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('pages.customerGroups.subtitle', 'Configure customer tiers, waiting limits, and queue priorities.')}
          </p>
        </div>

        <div>
          {user?.tenantId && (
            <button
              onClick={handleCreateClick}
              className="flex items-center gap-1.5 py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm rounded-xl shadow-md shadow-brand-600/15 hover:shadow-brand-600/25 transition-all cursor-pointer"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>{t('pages.customerGroups.addBtn', 'Add Customer Group')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Loading States */}
      {isLoading && (
        <div className="border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden bg-white dark:bg-slate-900">
          <div className="h-12 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800"></div>
          <div className="p-8 space-y-4">
            <div className="h-4 bg-slate-50 dark:bg-slate-800/20 rounded-md animate-pulse w-3/4"></div>
            <div className="h-4 bg-slate-50 dark:bg-slate-800/20 rounded-md animate-pulse w-1/2"></div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && groups.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl text-center max-w-md mx-auto mt-12 shadow-sm">
          <div className="p-4 bg-brand-50 dark:bg-brand-950/40 text-brand-655 dark:text-brand-400 rounded-2xl mb-4 border border-brand-100/50 dark:border-brand-900/30">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-850 dark:text-white">
            {t('pages.customerGroups.noGroups', 'No VIP Groups Defined')}
          </h3>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
            {t('pages.customerGroups.noGroupsDesc', 'Create priority categories like VIP Gold or Corporate Tiers to prioritize queue service.')}
          </p>
          <button
            onClick={handleCreateClick}
            className="mt-5 flex items-center gap-1.5 py-2 px-4 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>{t('pages.customerGroups.addBtn', 'Add Customer Group')}</span>
          </button>
        </div>
      )}

      {/* Table view */}
      {!isLoading && groups.length > 0 && (
        <div className="border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm bg-white dark:bg-slate-900 animate-in fade-in duration-150">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-850 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">{t('pages.customerGroups.table.name', 'Group Name')}</th>
                  <th className="py-4 px-6">{t('pages.customerGroups.table.badge', 'Badge Preview')}</th>
                  <th className="py-4 px-6 text-center">{t('pages.customerGroups.table.priority', 'Priority Level')}</th>
                  <th className="py-4 px-6 text-center">{t('pages.customerGroups.table.warning', 'Warning Threshold')}</th>
                  <th className="py-4 px-6 text-center">{t('pages.customerGroups.table.overtime', 'Overtime Bump')}</th>
                  <th className="py-4 px-6 text-right">{t('pages.customerGroups.table.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-805/70 text-sm text-slate-850 dark:text-slate-300">
                {groups.map((g) => (
                  <tr
                    key={g.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors"
                  >
                    <td className="py-4 px-6 font-extrabold text-slate-950 dark:text-white">
                      {g.name}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 text-xs font-extrabold uppercase rounded-lg border tracking-wider ${PRESET_COLORS[g.color] || PRESET_COLORS.blue}`}>
                        {g.badge}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center font-bold">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-655 dark:text-brand-400 border border-brand-100/50 dark:border-brand-900/30 text-xs font-extrabold">
                        {g.priorityLevel}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center font-medium">
                      {g.timeMin} mins
                    </td>
                    <td className="py-4 px-6 text-center font-medium text-danger">
                      {g.timeMax} mins
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleEditClick(g)}
                        className="py-1.5 px-3 bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-750 dark:text-slate-205 font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>{t('common.edit', 'Edit')}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(g)}
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
        <CustomerGroupForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedGroup(null);
          }}
          onSubmit={handleFormSubmit}
          group={selectedGroup}
        />
      )}
    </div>
  );
};

export default CustomerGroupPage;
