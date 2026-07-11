import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { getBranches } from '@/features/branches/repository/branchRepository';
import { getServices } from '@/features/services/repository/serviceRepository';
import { Branch, Service, Appointment } from '@/types/firestore';
import { 
  useAppointmentsList, 
  useCheckInAppointment, 
  useCancelAppointment, 
  useNoShowAppointment 
} from '../hooks/useAppointments';
import { 
  Calendar as CalendarIcon,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Building,
  Search,
  Sparkles
} from 'lucide-react';

export const AppointmentsPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  // Branch Selection
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [loadingBranches, setLoadingBranches] = useState(true);

  // Services Mapping
  const [servicesMap, setServicesMap] = useState<Record<string, Service>>({});

  // Date selection
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  // Search Filter
  const [searchQuery, setSearchQuery] = useState('');
  
  // Status Filter
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONFIRMED' | 'CHECKED_IN' | 'NO_SHOW' | 'CANCELLED'>('ALL');

  // Success Check-In Notification
  const [successCheckIn, setSuccessCheckIn] = useState<{ name: string; queueNumber: string } | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  // Hooks
  const { data: appointments = [], isLoading: loadingAppointments } = useAppointmentsList(selectedBranchId, selectedDate);
  const checkInMutation = useCheckInAppointment();
  const cancelMutation = useCancelAppointment();
  const noShowMutation = useNoShowAppointment();

  // 1. Fetch branches
  useEffect(() => {
    const tenantId = user?.tenantId;
    if (!tenantId) return;

    const loadBranches = async () => {
      setLoadingBranches(true);
      try {
        const list = await getBranches(tenantId);
        let filtered = list;
        if (user.role !== 'owner' && user.role !== 'admin' && user.branchIds?.length > 0) {
          filtered = list.filter((b) => user.branchIds.includes(b.id));
        }
        setBranches(filtered);
        if (filtered.length > 0) {
          setSelectedBranchId(filtered[0].id);
        }
      } catch (err) {
        console.error('Failed to load branches:', err);
      } finally {
        setLoadingBranches(false);
      }
    };

    loadBranches();
  }, [user]);

  // 2. Fetch services mapping
  useEffect(() => {
    if (!selectedBranchId) return;
    const loadServices = async () => {
      try {
        const list = await getServices(selectedBranchId);
        const map: Record<string, Service> = {};
        list.forEach((s) => {
          map[s.id] = s;
        });
        setServicesMap(map);
      } catch (err) {
        console.error('Failed to load services:', err);
      }
    };
    loadServices();
  }, [selectedBranchId]);

  // 3. Clear alerts after timeout
  useEffect(() => {
    if (!successCheckIn) return;
    const timer = setTimeout(() => setSuccessCheckIn(null), 8000);
    return () => clearTimeout(timer);
  }, [successCheckIn]);

  // Date Shift Helper
  const shiftDate = (days: number) => {
    const parts = selectedDate.split('-');
    const current = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    current.setDate(current.getDate() + days);
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  // Perform actions
  const handleCheckIn = async (appointment: Appointment) => {
    if (!user?.uid) return;
    setCheckInError(null);
    setSuccessCheckIn(null);
    try {
      const res = await checkInMutation.mutateAsync({
        appointmentId: appointment.id,
        staffUserId: user.uid
      });
      setSuccessCheckIn({
        name: appointment.customerName,
        queueNumber: res.queueNumber
      });
    } catch (err: any) {
      console.error('Check-in failed:', err);
      setCheckInError(err?.message || 'Failed to check in appointment.');
    }
  };

  const handleCancel = async (apptId: string) => {
    if (window.confirm(t('pages.appointments.confirmCancelPrompt'))) {
      try {
        await cancelMutation.mutateAsync(apptId);
      } catch (err) {
        console.error('Cancel failed:', err);
      }
    }
  };

  const handleNoShow = async (apptId: string) => {
    try {
      await noShowMutation.mutateAsync(apptId);
    } catch (err) {
      console.error('No-show marking failed:', err);
    }
  };

  // Filter & Search Logic
  const filteredAppointments = appointments.filter((appt) => {
    // Status filter
    if (statusFilter !== 'ALL' && appt.status !== statusFilter) return false;
    
    // Search query
    if (searchQuery.trim()) {
      const queryLower = searchQuery.toLowerCase();
      const nameMatch = appt.customerName.toLowerCase().includes(queryLower);
      const emailMatch = appt.customerEmail.toLowerCase().includes(queryLower);
      const phoneMatch = appt.customerPhone?.toLowerCase().includes(queryLower) ?? false;
      const refMatch = appt.id.toLowerCase().includes(queryLower);
      return nameMatch || emailMatch || phoneMatch || refMatch;
    }
    
    return true;
  });

  // Calculate stats
  const stats = appointments.reduce(
    (acc, curr) => {
      if (curr.status === 'CONFIRMED') acc.scheduled++;
      else if (curr.status === 'CHECKED_IN') acc.checkedIn++;
      else if (curr.status === 'NO_SHOW') acc.noShows++;
      else if (curr.status === 'CANCELLED') acc.cancelled++;
      return acc;
    },
    { scheduled: 0, checkedIn: 0, noShows: 0, cancelled: 0 }
  );

  return (
    <div className="space-y-6">
      
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-brand-655" />
            {t('pages.appointments.consoleTitle')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('pages.appointments.consoleSubtitle')}
          </p>
        </div>

        {/* Branch Selector */}
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4 text-slate-400" />
          {loadingBranches ? (
            <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
          ) : (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-white dark:bg-slate-905 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-250 font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Date navigation bar */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => shiftDate(-1)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-slate-900 dark:text-white min-w-[120px] text-center">
            {selectedDate === new Date().toISOString().split('T')[0] ? t('pages.appointments.today') : selectedDate}
          </span>
          <button
            onClick={() => shiftDate(1)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              const d = new Date();
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              setSelectedDate(`${y}-${m}-${day}`);
            }}
            className="px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-655 dark:text-slate-350 border border-slate-200 dark:border-slate-800 cursor-pointer transition-colors"
          >
            {t('pages.appointments.goToToday')}
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
          />
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric Scheduled */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t('pages.appointments.statScheduled')}</span>
            <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">{stats.scheduled}</span>
          </div>
          <div className="w-10 h-10 bg-brand-50 dark:bg-brand-950/20 text-brand-655 border border-brand-100 dark:border-brand-900/50 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Metric Checked In */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t('pages.appointments.statCheckedIn')}</span>
            <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">{stats.checkedIn}</span>
          </div>
          <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-550 border border-emerald-100 dark:border-emerald-900/50 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Metric No Show */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t('pages.appointments.statNoShow')}</span>
            <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">{stats.noShows}</span>
          </div>
          <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/20 text-amber-550 border border-amber-100 dark:border-amber-900/50 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Metric Cancelled */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t('pages.appointments.statCancelled')}</span>
            <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">{stats.cancelled}</span>
          </div>
          <div className="w-10 h-10 bg-red-50 dark:bg-red-955/20 text-red-550 border border-red-100 dark:border-red-900/50 rounded-xl flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Success alert for check-in */}
      {successCheckIn && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-955/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-sm font-medium rounded-2xl shadow-sm flex items-center justify-between animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-555" />
            <span>
              {t('pages.appointments.checkInSuccess', { name: successCheckIn.name, queueNumber: successCheckIn.queueNumber })}
            </span>
          </div>
          <button onClick={() => setSuccessCheckIn(null)} className="text-xs hover:underline cursor-pointer">
            {t('pages.branches.form.cancel')}
          </button>
        </div>
      )}

      {checkInError && (
        <div className="p-4 bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-900/50 text-red-750 dark:text-red-300 text-sm rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{checkInError}</span>
          </div>
          <button onClick={() => setCheckInError(null)} className="text-xs hover:underline cursor-pointer">
            {t('pages.branches.form.cancel')}
          </button>
        </div>
      )}

      {/* Filter and Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Filters Top Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Status Tabs */}
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/55 p-1 rounded-xl w-full md:w-auto">
            {(['ALL', 'CONFIRMED', 'CHECKED_IN', 'NO_SHOW', 'CANCELLED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === s
                    ? 'bg-white dark:bg-slate-900 text-brand-655 shadow-sm'
                    : 'text-slate-500 hover:text-slate-750 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {s === 'ALL' ? t('pages.appointments.filterAll') : s === 'CONFIRMED' ? t('pages.appointments.filterConfirmed') : s === 'CHECKED_IN' ? t('pages.appointments.filterCheckedIn') : s === 'NO_SHOW' ? t('pages.appointments.filterNoShow') : t('pages.appointments.filterCancelled')}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('pages.appointments.searchPlaceholder')}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
            />
          </div>
        </div>

        {/* Content list */}
        {loadingAppointments ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto" />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">{t('pages.appointments.loadingAppointments')}</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="p-12 text-center text-slate-400 italic text-xs">
            {t('pages.appointments.noAppointments')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/30 text-slate-450 border-b border-slate-100 dark:border-slate-800/80 font-bold uppercase tracking-wider">
                  <th className="p-4">{t('pages.appointments.tableTime')}</th>
                  <th className="p-4">{t('pages.appointments.tableCustomer')}</th>
                  <th className="p-4">{t('pages.appointments.tableService')}</th>
                  <th className="p-4">{t('pages.appointments.tableStatus')}</th>
                  <th className="p-4 text-right">{t('pages.appointments.tableActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {filteredAppointments.map((appt) => {
                  const svc = servicesMap[appt.serviceId];
                  return (
                    <tr key={appt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/25 transition-colors">
                      <td className="p-4 font-bold text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{appt.startTime} - {appt.endTime}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{appt.customerName}</span>
                        </div>
                        <div className="text-[10px] text-slate-450 mt-0.5">{appt.customerEmail} {appt.customerPhone && `| ${appt.customerPhone}`}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-655 dark:text-slate-350 font-bold rounded-lg uppercase text-[10px]">
                          {svc?.name || t('common.loading')}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                          appt.status === 'CONFIRMED'
                            ? 'bg-blue-50 dark:bg-blue-955/20 text-blue-600 border border-blue-100/50 dark:border-blue-900/30'
                            : appt.status === 'CHECKED_IN'
                            ? 'bg-emerald-50 dark:bg-emerald-955/20 text-emerald-600 border border-emerald-100/50 dark:border-emerald-900/30'
                            : appt.status === 'NO_SHOW'
                            ? 'bg-amber-50 dark:bg-amber-955/20 text-amber-600 border border-amber-100/50 dark:border-amber-900/30'
                            : 'bg-red-50 dark:bg-red-955/20 text-red-655 border border-red-100/50 dark:border-red-900/30'
                        }`}>
                          {appt.status === 'CONFIRMED' ? t('pages.appointments.filterConfirmed') : appt.status === 'CHECKED_IN' ? t('pages.appointments.filterCheckedIn') : appt.status === 'NO_SHOW' ? t('pages.appointments.filterNoShow') : t('pages.appointments.filterCancelled')}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {appt.status === 'CONFIRMED' ? (
                          <div className="flex justify-end gap-1.5">
                            <button
                               onClick={() => handleCheckIn(appt)}
                              className="px-2.5 py-1 bg-emerald-655 hover:bg-emerald-600 text-white rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm shadow-emerald-600/10 hover:scale-[1.02]"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>{t('pages.appointments.btnCheckIn')}</span>
                            </button>
                            <button
                              onClick={() => handleNoShow(appt.id)}
                              className="px-2 py-1 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 rounded-lg font-bold transition-all cursor-pointer"
                            >
                              {t('pages.appointments.btnNoShow')}
                            </button>
                            <button
                              onClick={() => handleCancel(appt.id)}
                              className="px-2 py-1 bg-red-50 dark:bg-red-955/20 hover:bg-red-100 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded-lg font-bold transition-all cursor-pointer"
                            >
                              {t('pages.appointments.btnCancel')}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">{t('pages.appointments.noActions')}</span>
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
    </div>
  );
};

export default AppointmentsPage;
