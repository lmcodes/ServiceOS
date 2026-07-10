import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useActiveQueues } from '../hooks/useActiveQueues';
import { useQueueActions } from '../hooks/useQueueActions';
import { getBranches } from '@/features/branches/repository/branchRepository';
import { getServices } from '@/features/services/repository/serviceRepository';
import { Branch, Service } from '@/types/firestore';
import { db } from '@/config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  ConciergeBell, 
  CheckCircle2, 
  Play,
  RotateCcw,
  UserX,
  Check,
  Loader2,
  Clock,
  Inbox,
  UserCheck
} from 'lucide-react';

export const QueueConsolePage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  // State
  const [counter, setCounter] = useState(() => localStorage.getItem('serviceos_staff_counter') || '');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Record<string, Service>>({});
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'waiting' | 'serving' | 'completed'>('all');
  const [loadingBranches, setLoadingBranches] = useState(true);

  // Sync counter to localStorage
  useEffect(() => {
    localStorage.setItem('serviceos_staff_counter', counter);
  }, [counter]);

  // Daily statistics
  const [completedCount, setCompletedCount] = useState(0);
  const [noShowCount, setNoShowCount] = useState(0);

  // Time tracker for ticket cards
  const [now, setNow] = useState(Date.now());

  // Load branches accessible to the user
  useEffect(() => {
    const tenantId = user?.tenantId;
    if (!tenantId) return;

    const loadBranches = async () => {
      setLoadingBranches(true);
      try {
        const list = await getBranches(tenantId);
        
        // Filter by user's assigned branches if they are not owner/admin
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

  // Load services mapping for name resolver
  useEffect(() => {
    if (!selectedBranchId) return;
    const loadServices = async () => {
      try {
        const list = await getServices(selectedBranchId);
        const map: Record<string, Service> = {};
        list.forEach((s) => {
          map[s.id] = s;
        });
        setServices(map);
      } catch (err) {
        console.error('Failed to load services:', err);
      }
    };
    loadServices();
  }, [selectedBranchId]);

  // Subscribe to real-time Completed/No Show counters for today
  useEffect(() => {
    if (!selectedBranchId) return;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const completedQuery = query(
      collection(db, 'queues'),
      where('branchId', '==', selectedBranchId),
      where('status', '==', 'COMPLETED'),
      where('completedAt', '>=', todayStart)
    );

    const unsubCompleted = onSnapshot(completedQuery, (snap) => {
      setCompletedCount(snap.size);
    });

    const noShowQuery = query(
      collection(db, 'queues'),
      where('branchId', '==', selectedBranchId),
      where('status', '==', 'NO_SHOW'),
      where('noShowAt', '>=', todayStart)
    );

    const unsubNoShow = onSnapshot(noShowQuery, (snap) => {
      setNoShowCount(snap.size);
    });

    return () => {
      unsubCompleted();
      unsubNoShow();
    };
  }, [selectedBranchId]);

  // Update time tracker every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Sync active tickets
  const { data: activeTickets = [], isLoading: loadingTickets } = useActiveQueues(selectedBranchId);
  const actions = useQueueActions(selectedBranchId);

  // Action handers
  const handleCallNext = async () => {
    if (!counter.trim()) {
      alert(t('pages.queues.selectCounterAlert'));
      return;
    }
    try {
      const nextTicket = await actions.callNext.mutateAsync(counter);
      if (!nextTicket) {
        alert(t('pages.queues.noWaitingTickets'));
      }
    } catch (err: any) {
      console.error('Failed to call next ticket:', err);
      alert(err.message || t('common.errorConnection'));
    }
  };

  // Filter queues by active tab
  const getFilteredTickets = () => {
    switch (activeTab) {
      case 'waiting':
        return activeTickets.filter((t) => t.status === 'WAITING' || t.status === 'CALLED');
      case 'serving':
        return activeTickets.filter((t) => t.status === 'SERVING');
      case 'completed':
        // Display called/serving as completed column tab is empty, showing completed counts
        return [];
      default:
        return activeTickets;
    }
  };

  const getWaitDurationMinutes = (createdAt: any) => {
    if (!createdAt) return 0;
    const createdTime = createdAt.seconds ? createdAt.seconds * 1000 : createdAt.toMillis ? createdAt.toMillis() : new Date(createdAt).getTime();
    return Math.max(0, Math.floor((now - createdTime) / 60000));
  };

  if (loadingBranches) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        <span className="ml-3 text-sm text-slate-500 font-medium">{t('pages.queues.loadingConsole')}</span>
      </div>
    );
  }

  const waitingTickets = activeTickets.filter((t) => t.status === 'WAITING');
  const servingTickets = activeTickets.filter((t) => t.status === 'SERVING');

  const displayedTickets = getFilteredTickets();

  return (
    <div className="space-y-6">
      {/* Top Header Control Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ConciergeBell className="w-5.5 h-5.5 text-brand-655" />
            {t('pages.queues.consoleTitle')}
          </h2>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
            {t('pages.queues.consoleSubtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto justify-end">
          {/* Counter Selector */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 px-3 py-1.5 rounded-xl">
            <span className="text-xs font-semibold text-slate-550 dark:text-slate-400 whitespace-nowrap">
              {t('pages.queues.counterLabel')}
            </span>
            <input
              type="text"
              value={counter}
              onChange={(e) => setCounter(e.target.value)}
              placeholder={t('pages.queues.counterPlaceholder')}
              className="w-16 px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 text-center"
            />
          </div>

          {/* Branch selector */}
          {branches.length > 1 && (
            <div className="relative flex-1 sm:flex-initial">
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full sm:w-56 pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-white outline-none cursor-pointer focus:ring-2 focus:ring-brand-500/20"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Call Next Button */}
          <button
            onClick={handleCallNext}
            disabled={actions.callNext.isPending || waitingTickets.length === 0}
            className="flex items-center gap-1.5 px-5 py-2 bg-brand-655 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-655/15 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer w-full sm:w-auto justify-center"
          >
            {actions.callNext.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ConciergeBell className="w-4 h-4" />
            )}
            <span>{t('pages.queues.callNext')}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Waiting Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">
              {t('pages.queues.waitingCount')}
            </span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {waitingTickets.length}
            </p>
          </div>
          <div className="p-3 bg-brand-50 dark:bg-brand-950/20 rounded-xl text-brand-655">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Serving Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">
              {t('pages.queues.servingCount')}
            </span>
            <p className="text-2xl font-black text-emerald-650 mt-1">
              {servingTickets.length}
            </p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl text-emerald-650">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Completed Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">
              {t('pages.queues.completedToday')}
            </span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {completedCount}
            </p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* No-Shows Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">
              {t('pages.queues.noShowsCount')}
            </span>
            <p className="text-2xl font-black text-red-600 dark:text-red-500 mt-1">
              {noShowCount}
            </p>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-xl text-red-650">
            <UserX className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Board Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800/80 px-6 pt-4 bg-slate-50/50 dark:bg-slate-950/20">
          {(['all', 'waiting', 'serving'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 pb-4 text-xs font-bold capitalize transition-all border-b-2 outline-none cursor-pointer -mb-px ${
                activeTab === tab
                  ? 'border-brand-655 text-brand-655 dark:text-brand-400 font-extrabold'
                  : 'border-transparent text-slate-450 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab === 'all'
                ? t('pages.queues.tabAll')
                : tab === 'waiting'
                ? t('pages.queues.tabWaiting')
                : t('pages.queues.tabServing')}
            </button>
          ))}
        </div>

        {/* Board body */}
        <div className="p-6">
          {loadingTickets ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
              <span className="ml-2.5 text-xs text-slate-500 font-medium">{t('pages.queues.syncingBoard')}</span>
            </div>
          ) : displayedTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Inbox className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-sm font-semibold">{t('pages.queues.noTickets')}</p>
              <p className="text-xs text-slate-450 dark:text-slate-550 mt-1">
                {t('pages.queues.noTicketsDesc')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedTickets.map((ticket) => {
                const serviceName = services[ticket.serviceId]?.name || t('pages.queues.unknownService');
                const waitMins = getWaitDurationMinutes(ticket.createdAt);

                return (
                  <div
                    key={ticket.id}
                    className={`bg-white dark:bg-slate-955 border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                      ticket.status === 'CALLED'
                        ? 'border-amber-300 dark:border-amber-900 bg-amber-50/5 dark:bg-amber-955/5 animate-pulse'
                        : ticket.status === 'SERVING'
                        ? 'border-emerald-250 dark:border-emerald-900 bg-emerald-50/5 dark:bg-emerald-955/5'
                        : 'border-slate-200/80 dark:border-slate-800'
                    }`}
                  >
                    <div>
                      {/* Top Header Row of card */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-4">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-655 dark:text-slate-400 rounded-lg">
                          {serviceName}
                        </span>
                        
                        {/* Time duration indicator */}
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-450 dark:text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{t('pages.queues.waitingDuration', { count: waitMins })}</span>
                        </div>
                      </div>

                      {/* Queue Number */}
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                          {ticket.queueNumber}
                        </span>
                        <span
                          className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border ${
                            ticket.status === 'CALLED'
                              ? 'bg-amber-100 dark:bg-amber-955/40 border-amber-250 text-amber-700 dark:text-amber-400'
                              : ticket.status === 'SERVING'
                              ? 'bg-emerald-100 dark:bg-emerald-955/40 border-emerald-250 text-emerald-700 dark:text-emerald-450'
                              : 'bg-blue-100 dark:bg-blue-955/40 border-blue-200 text-blue-700 dark:text-blue-450'
                          }`}
                        >
                          {ticket.status}
                        </span>
                      </div>

                      {/* Customer Info */}
                      <h4 className="font-bold text-sm text-slate-850 dark:text-slate-200">
                        {ticket.customerName}
                      </h4>
                      {(ticket.customerPhone || ticket.customerEmail) && (
                        <p className="text-[11px] text-slate-500 mt-1 truncate">
                          {ticket.customerPhone} {ticket.customerPhone && ticket.customerEmail && '•'} {ticket.customerEmail}
                        </p>
                      )}

                      {/* Custom Question data answers */}
                      {ticket.customData && Object.keys(ticket.customData).length > 0 && (
                        <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl space-y-1 border border-slate-100 dark:border-slate-800">
                          {Object.entries(ticket.customData).map(([key, val]) => (
                            <div key={key} className="flex justify-between text-[10px] font-semibold">
                              <span className="text-slate-450 capitalize">{key.replace(/_/g, ' ')}:</span>
                              <span className="text-slate-700 dark:text-slate-350 truncate max-w-40">
                                {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Operational Action Buttons */}
                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-2.5">
                      {/* WAITING status Actions */}
                      {ticket.status === 'WAITING' && (
                        <button
                          onClick={() => {
                            if (!counter.trim()) {
                              alert(t('pages.queues.selectCounterAlert'));
                              return;
                            }
                            actions.callSpecific.mutate({ ticketId: ticket.id, counter });
                          }}
                          disabled={actions.callSpecific.isPending}
                          className="flex-1 py-1.5 px-3 bg-brand-50 dark:bg-brand-950/20 text-brand-655 hover:bg-brand-100 dark:hover:bg-brand-900/30 font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{t('pages.queues.actionCall')}</span>
                        </button>
                      )}

                      {/* CALLED status Actions */}
                      {ticket.status === 'CALLED' && (
                        <>
                          <button
                            onClick={() => actions.noShow.mutate(ticket.id)}
                            disabled={actions.noShow.isPending}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-955/20 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-red-200"
                            title={t('pages.queues.actionNoShow')}
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (!counter.trim()) {
                                alert(t('pages.queues.selectCounterAlert'));
                                return;
                              }
                              actions.recall.mutate({ ticketId: ticket.id, counter });
                            }}
                            disabled={actions.recall.isPending}
                            className="p-2 text-slate-400 hover:text-brand-655 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-brand-200"
                            title={t('pages.queues.actionRecall')}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (!counter.trim()) {
                                alert(t('pages.queues.selectCounterAlert'));
                                return;
                              }
                              actions.startServing.mutate({ ticketId: ticket.id, counter });
                            }}
                            disabled={actions.startServing.isPending}
                            className="flex-1 py-1.5 px-3 bg-emerald-650 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-transform"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>{t('pages.queues.actionStart')}</span>
                          </button>
                        </>
                      )}

                      {/* SERVING status Actions */}
                      {ticket.status === 'SERVING' && (
                        <>
                          <button
                            onClick={() => actions.noShow.mutate(ticket.id)}
                            disabled={actions.noShow.isPending}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-955/20 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-red-200"
                            title={t('pages.queues.actionNoShow')}
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => actions.complete.mutate(ticket.id)}
                            disabled={actions.complete.isPending}
                            className="flex-1 py-1.5 px-3 bg-emerald-655 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-transform shadow-md shadow-emerald-500/10"
                          >
                            <Check className="w-4 h-4" />
                            <span>{t('pages.queues.actionComplete')}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QueueConsolePage;
