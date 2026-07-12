import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, QrCode, Trash2, MapPin, Phone, Mail, Clock } from 'lucide-react';
import { useBranches } from '../hooks/useBranches';
import { useCreateBranch } from '../hooks/useCreateBranch';
import { useUpdateBranch } from '../hooks/useUpdateBranch';
import { Branch } from '@/types/firestore';
import { BranchForm } from './BranchForm';
import { QRPosterModal } from './QRPosterModal';

export const BranchListPage: React.FC = () => {
  const { t } = useTranslation();
  
  // Hooks
  const { data: branches = [], isLoading: isFetching } = useBranches();
  const createMutation = useCreateBranch();
  const { updateMutation, deleteMutation } = useUpdateBranch();

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isQROpen, setIsQROpen] = useState(false);
  const [qrBranch, setQRBranch] = useState<Branch | null>(null);

  const handleEditClick = (branch: Branch) => {
    setSelectedBranch(branch);
    setIsFormOpen(true);
  };

  const handleCreateClick = () => {
    setSelectedBranch(null);
    setIsFormOpen(true);
  };

  const handleQRClick = (branch: Branch) => {
    setQRBranch(branch);
    setIsQROpen(true);
  };

  const handleDeleteClick = async (branchId: string) => {
    if (window.confirm(t('pages.branches.deleteConfirm'))) {
      try {
        await deleteMutation.mutateAsync(branchId);
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  const handleFormSubmit = async (fields: any) => {
    try {
      if (selectedBranch) {
        await updateMutation.mutateAsync({
          branchId: selectedBranch.id,
          data: fields,
        });
      } else {
        await createMutation.mutateAsync(fields);
      }
      setIsFormOpen(false);
      setSelectedBranch(null);
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
            {t('pages.branches.title')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('pages.branches.subtitle')}
          </p>
        </div>
        
        {branches.length > 0 && (
          <button
            onClick={handleCreateClick}
            className="flex items-center gap-1.5 py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm rounded-xl shadow-md shadow-brand-600/15 hover:shadow-brand-600/25 transition-all cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>{t('pages.branches.addBranch')}</span>
          </button>
        )}
      </div>

      {/* Loading State */}
      {isFetching && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-56 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-3xl animate-pulse"
            ></div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isFetching && branches.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl text-center max-w-md mx-auto mt-12 shadow-sm">
          <div className="p-4 bg-brand-50 dark:bg-brand-950/40 text-brand-655 dark:text-brand-400 rounded-2xl mb-4 border border-brand-100/50 dark:border-brand-900/30">
            <Plus className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            {t('pages.branches.noBranches')}
          </h3>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
            {t('pages.branches.noBranchesDesc')}
          </p>
          <button
            onClick={handleCreateClick}
            className="mt-5 flex items-center gap-1.5 py-2 px-4 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('pages.branches.addBranch')}</span>
          </button>
        </div>
      )}

      {/* Grid of Branches */}
      {!isFetching && branches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="group relative flex flex-col justify-between p-6 bg-white dark:bg-slate-900 border border-slate-200/85 dark:border-slate-800/80 rounded-3xl hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-700/60 transition-all duration-300 overflow-hidden"
            >
              <div>
                {/* Prefix Badge */}
                <div className="absolute top-6 right-6 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-655 dark:text-slate-300 font-bold text-xs rounded-lg uppercase">
                  {branch.queuePrefix}001+
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-3 bg-brand-50 dark:bg-brand-950/40 text-brand-655 dark:text-brand-400 rounded-2xl border border-brand-100/50 dark:border-brand-900/30">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {branch.name}
                    </h3>
                    <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">
                      {t('pages.branches.branchCard.code')}: {branch.code}
                    </p>
                  </div>
                </div>

                {/* Details list */}
                <div className="mt-6 space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                  {branch.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{branch.phone}</span>
                    </div>
                  )}
                  {branch.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span>{branch.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="truncate">{branch.timezone}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleEditClick(branch)}
                    className="p-2 text-slate-500 hover:text-slate-850 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-100 dark:border-slate-800 hover:border-slate-200 transition-all cursor-pointer"
                    title={t('pages.branches.branchCard.edit')}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleQRClick(branch)}
                    className="p-2 text-brand-655 hover:text-brand-600 dark:hover:text-brand-400 rounded-xl hover:bg-brand-50/50 dark:hover:bg-brand-950/10 border border-brand-100/50 dark:border-brand-900/30 hover:border-brand-200 transition-all cursor-pointer"
                    title={t('pages.branches.branchCard.qrCode')}
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => handleDeleteClick(branch.id)}
                  className="p-2 text-red-500 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 border border-transparent hover:border-red-200 dark:hover:border-red-900/40 rounded-xl transition-all cursor-pointer"
                  title={t('pages.branches.branchCard.delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Forms and Modal overlays */}
      {isFormOpen && (
        <BranchForm
          initialData={selectedBranch}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedBranch(null);
          }}
          onSubmit={handleFormSubmit}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {isQROpen && (
        <QRPosterModal
          branch={qrBranch}
          onClose={() => {
            setIsQROpen(false);
            setQRBranch(null);
          }}
        />
      )}
    </div>
  );
};

export default BranchListPage;
