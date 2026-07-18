import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Edit2, 
  Trash2, 
  ShieldAlert, 
  ShieldCheck, 
  Mail, 
  User as UserIcon, 
  Check, 
  Copy, 
  X,
  UserPlus
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useBranches } from '@/features/branches/hooks/useBranches';
import { 
  subscribeStaffMembers, 
  inviteStaff, 
  updateStaffRoleAndBranches, 
  suspendStaff, 
  reactivateStaff, 
  deleteStaff 
} from '../repository/staffRepository';
import { User } from '@/types/firestore';

export const StaffListPage: React.FC = () => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const { data: branches = [] } = useBranches();

  // State
  const [staffList, setStaffList] = useState<User[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null); // Null means "Invite New"
  
  // Form State
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'manager' | 'staff'>('staff');
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Invite Link State
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Real-time subscription to staff members
  useEffect(() => {
    if (!currentUser?.tenantId) return;

    setIsFetching(true);
    const unsubscribe = subscribeStaffMembers(
      currentUser.tenantId,
      (users) => {
        // Sort: Super Admin first, then Owner, then Admin, then Manager, then Staff
        const roleOrder = { super_admin: 0, owner: 1, admin: 2, manager: 3, staff: 4 };
        const sorted = [...users].sort((a, b) => {
          return (roleOrder[a.role] ?? 5) - (roleOrder[b.role] ?? 5);
        });
        setStaffList(sorted);
        setIsFetching(false);
      },
      (_error) => {
        setErrorMessage(t('common.errorConnection'));
        setIsFetching(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.tenantId, t]);

  const handleOpenInviteModal = () => {
    setSelectedStaff(null);
    setEmail('');
    setName('');
    setRole('staff');
    setSelectedBranches([]);
    setErrorMessage(null);
    setInviteLink(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (staff: User) => {
    setSelectedStaff(staff);
    setEmail(staff.email);
    setName(staff.displayName);
    setRole((staff.role === 'owner' ? 'admin' : staff.role) as any);
    setSelectedBranches(staff.branchIds || []);
    setErrorMessage(null);
    setInviteLink(null);
    setIsModalOpen(true);
  };

  const handleBranchToggle = (branchId: string) => {
    setSelectedBranches(prev => 
      prev.includes(branchId) 
        ? prev.filter(id => id !== branchId)
        : [...prev, branchId]
    );
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (selectedStaff) {
        // Edit flow (Role & Branches assignment)
        await updateStaffRoleAndBranches(selectedStaff.id, role, selectedBranches);
        setIsModalOpen(false);
      } else {
        // Invite flow
        if (!email) {
          setErrorMessage(t('validation.emailInvalid'));
          setIsSubmitting(false);
          return;
        }
        const result = await inviteStaff(email, role, selectedBranches, name);
        if (result.success && result.inviteLink) {
          setInviteLink(result.inviteLink);
        } else {
          setIsModalOpen(false);
        }
      }
    } catch (error: any) {
      console.error('Staff action failed:', error);
      setErrorMessage(error.message || t('common.errorConnection'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (staff: User) => {
    const isSuspended = staff.status === 'suspended';
    const confirmMsg = isSuspended 
      ? t('pages.staff.reactivateConfirm')
      : t('pages.staff.suspendConfirm');

    if (window.confirm(confirmMsg)) {
      try {
        if (isSuspended) {
          await reactivateStaff(staff.id);
        } else {
          await suspendStaff(staff.id);
        }
      } catch (err) {
        console.error('Status toggle failed:', err);
      }
    }
  };

  const handleDeleteStaff = async (uid: string) => {
    if (window.confirm(t('pages.staff.deleteConfirm'))) {
      try {
        await deleteStaff(uid);
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const getRoleBadgeStyle = (userRole: string) => {
    switch (userRole) {
      case 'owner':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40';
      case 'admin':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40';
      case 'manager':
        return 'bg-teal-50 text-teal-705 dark:bg-teal-950/30 dark:text-teal-400 border border-teal-100 dark:border-teal-900/40';
      default:
        return 'bg-slate-50 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 border border-slate-100 dark:border-slate-700/60';
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40';
      case 'invited':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40';
      case 'suspended':
      default:
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('pages.staff.title')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('pages.staff.subtitle')}
          </p>
        </div>
        
        {/* Only Owner or Admin can trigger invite */}
        {(currentUser?.role === 'owner' || currentUser?.role === 'admin') && (
          <button
            onClick={handleOpenInviteModal}
            className="flex items-center gap-1.5 py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm rounded-xl shadow-md shadow-brand-600/15 hover:shadow-brand-600/25 transition-all cursor-pointer"
          >
            <UserPlus className="w-4.5 h-4.5" />
            <span>{t('pages.staff.addStaff')}</span>
          </button>
        )}
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 rounded-2xl text-sm border border-rose-100 dark:border-rose-900/40">
          {errorMessage}
        </div>
      )}

      {/* Loading Skeleton */}
      {isFetching && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 space-y-4 animate-pulse">
            <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-12 bg-slate-50 dark:bg-slate-850 rounded-lg"></div>
            ))}
          </div>
        </div>
      )}

      {/* Table Container */}
      {!isFetching && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          {staffList.length === 0 ? (
            <div className="p-12 text-center text-slate-550 dark:text-slate-400">
              <UserIcon className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-650 mb-3" />
              <p className="text-sm font-semibold">{t('pages.staff.noStaff')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <th className="p-4 pl-6 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t('pages.staff.nameLabel')}</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t('pages.staff.emailLabel')}</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t('pages.staff.roleLabel')}</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t('pages.staff.branchesLabel')}</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t('pages.staff.statusLabel')}</th>
                    <th className="p-4 pr-6 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-right">{t('pages.staff.actionsLabel')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {staffList.map((staff) => {
                    const initials = (staff.displayName || staff.email || '?')
                      .substring(0, 2)
                      .toUpperCase();
                    const isSelf = staff.id === currentUser?.uid;
                    const isOwner = staff.role === 'owner';

                    return (
                      <tr key={staff.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/20 transition-colors">
                        {/* Name and avatar */}
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-655 dark:text-brand-400 font-bold text-sm flex items-center justify-center border border-brand-100/40 dark:border-brand-900/30">
                              {initials}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white text-sm">
                                {staff.displayName || '-'}
                                {isSelf && (
                                  <span className="ml-1.5 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-medium">
                                    You
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                          {staff.email}
                        </td>

                        {/* Role Badge */}
                        <td className="p-4">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${getRoleBadgeStyle(staff.role)}`}>
                            {t(`pages.staff.role${staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}`)}
                          </span>
                        </td>

                        {/* Assigned Branches */}
                        <td className="p-4 text-xs text-slate-600 dark:text-slate-400 max-w-[200px] truncate">
                          {isOwner ? (
                            <span className="italic text-slate-400 dark:text-slate-500">All Branches</span>
                          ) : (
                            staff.branchIds && staff.branchIds.length > 0 
                              ? staff.branchIds.map(id => branches.find(b => b.id === id)?.name || id).join(', ')
                              : <span className="text-slate-400 dark:text-slate-600 font-medium">None</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="p-4">
                          <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${getStatusBadgeStyle(staff.status || 'active')}`}>
                            {t(`pages.staff.status${(staff.status || 'active').charAt(0).toUpperCase() + (staff.status || 'active').slice(1)}`)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-4 pr-6 text-right">
                          {/* Owner profiles cannot be edited/deactivated/deleted by others */}
                          {!isOwner && !isSelf && (currentUser?.role === 'owner' || currentUser?.role === 'admin') && (
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit Button */}
                              <button
                                onClick={() => handleOpenEditModal(staff)}
                                className="p-2 text-slate-550 hover:text-slate-800 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                                title={t('pages.staff.editTooltip')}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* Toggle Status Button */}
                              <button
                                onClick={() => handleToggleStatus(staff)}
                                className={`p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer ${
                                  staff.status === 'suspended' 
                                    ? 'text-emerald-600 hover:text-emerald-700' 
                                    : 'text-amber-600 hover:text-amber-700'
                                }`}
                                title={staff.status === 'suspended' ? t('pages.staff.reactivateTooltip') : t('pages.staff.suspendTooltip')}
                              >
                                {staff.status === 'suspended' ? (
                                  <ShieldCheck className="w-4 h-4" />
                                ) : (
                                  <ShieldAlert className="w-4 h-4" />
                                )}
                              </button>

                              {/* Delete Button */}
                              {currentUser?.role === 'owner' && (
                                <button
                                  onClick={() => handleDeleteStaff(staff.id)}
                                  className="p-2 text-red-500 hover:text-red-700 hover:bg-rose-50/50 dark:hover:bg-rose-950/25 rounded-xl transition-all cursor-pointer"
                                  title={t('pages.staff.deleteTooltip')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
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

      {/* Invite / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl p-6 overflow-hidden">
            
            {/* Success Invitation overlay */}
            {inviteLink ? (
              <div className="space-y-6 py-4">
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-605 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100 dark:border-emerald-900/40">
                  <Check className="w-6 h-6" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">{t('pages.staff.inviteSuccessTitle')}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 px-4">
                    {t('pages.staff.inviteSuccessDesc')}
                  </p>
                </div>

                <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-855/50 border border-slate-200/50 dark:border-slate-800 rounded-2xl">
                  <span className="text-xs text-slate-550 dark:text-slate-400 font-mono truncate select-all flex-1">
                    {inviteLink}
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="p-2 text-brand-655 hover:text-brand-700 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl hover:shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-[11px] text-emerald-605 font-bold">{t('pages.staff.copiedAlert')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span className="text-[11px] font-bold">Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-xl cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {selectedStaff ? t('pages.staff.modalEditTitle') : t('pages.staff.modalInviteTitle')}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="p-1.5 text-slate-450 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                {errorMessage && (
                  <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-450 rounded-xl text-xs border border-rose-100 dark:border-rose-900/30">
                    {errorMessage}
                  </div>
                )}

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                    {t('pages.staff.emailLabel')}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      required
                      disabled={!!selectedStaff || isSubmitting}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-750 text-slate-900 dark:text-white placeholder-slate-400 text-sm rounded-xl py-2.5 pl-9 pr-3 outline-none focus:ring-1 focus:ring-brand-500/30 focus:border-brand-500 disabled:opacity-50 transition-all"
                    />
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                    {t('pages.staff.nameLabel')}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                      <UserIcon className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      disabled={!!selectedStaff || isSubmitting}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-750 text-slate-900 dark:text-white placeholder-slate-400 text-sm rounded-xl py-2.5 pl-9 pr-3 outline-none focus:ring-1 focus:ring-brand-500/30 focus:border-brand-500 disabled:opacity-50 transition-all"
                    />
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                    {t('pages.staff.roleLabel')}
                  </label>
                  <select
                    disabled={isSubmitting}
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-750 text-slate-900 dark:text-white text-sm rounded-xl py-2.5 px-3 outline-none focus:ring-1 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                  >
                    <option value="staff">{t('pages.staff.roleStaff')}</option>
                    <option value="manager">{t('pages.staff.roleManager')}</option>
                    <option value="admin">{t('pages.staff.roleAdmin')}</option>
                  </select>
                </div>

                {/* Branches checkboxes */}
                <div>
                  <label className="block text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                    {t('pages.staff.branchesLabel')}
                  </label>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl max-h-40 overflow-y-auto p-3.5 space-y-2.5 bg-slate-50/50 dark:bg-slate-950/20">
                    {branches.length === 0 ? (
                      <p className="text-xs text-slate-450 italic">No branches available</p>
                    ) : (
                      branches.map((branch) => (
                        <label 
                          key={branch.id} 
                          className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-350 cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={selectedBranches.includes(branch.id)}
                            onChange={() => handleBranchToggle(branch.id)}
                            disabled={isSubmitting}
                            className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500/20 border-slate-300 dark:border-slate-750 dark:bg-slate-800"
                          />
                          <span>{branch.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setIsModalOpen(false)}
                    className="py-2.5 px-4 bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-xl disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {t('pages.staff.cancelBtn')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 py-2.5 px-5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm rounded-xl disabled:opacity-55 shadow-md shadow-brand-600/10 transition-colors cursor-pointer"
                  >
                    {isSubmitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    <span>{selectedStaff ? t('pages.staff.submitSaveBtn') : t('pages.staff.submitInviteBtn')}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffListPage;
