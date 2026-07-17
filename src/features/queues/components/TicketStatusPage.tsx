import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { QueueItem, Service, Branch, Workflow, WorkflowStage } from '@/types/firestore';
import { subscribeQueueItem, cancelQueueItem, subscribeWaitingAheadCount } from '../repository/queueRepository';
import { getWorkflowWithStages } from '@/features/workflows/repository/workflowRepository';
import { playCallingChime } from '@/shared/utils/audio';
import { 
  Clock, 
  Users, 
  Trash2, 
  ChevronLeft, 
  AlertTriangle,
  Loader2, 
  CheckCircle,
  Building,
  Volume2
} from 'lucide-react';
import { SettingsSwitcher } from '@/shared/components/SettingsSwitcher';

export const TicketStatusPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { t, i18n } = useTranslation();

  // State
  const [ticket, setTicket] = useState<QueueItem | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [peopleAhead, setPeopleAhead] = useState<number>(0);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prevStatusRef = useRef<string | null>(null);

  const getServiceName = (s?: Service | null) => {
    if (!s) return '';
    return i18n.language?.startsWith('th') ? s.name : (s.nameEn || s.name);
  };

  // Subscribe to ticket details
  useEffect(() => {
    if (!ticketId) return;

    setLoading(true);
    const unsubscribe = subscribeQueueItem(
      ticketId,
      (item) => {
        if (item) {
          setTicket(item);
          setError(null);
        } else {
          setTicket(null);
          setError('Ticket not found');
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching ticket status:', err);
        setError('Failed to sync ticket data');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [ticketId]);

  // Play chime on status transitions from WAITING to CALLED
  useEffect(() => {
    if (ticket && ticket.status === 'CALLED' && prevStatusRef.current === 'WAITING') {
      playCallingChime();
    }
    if (ticket) {
      prevStatusRef.current = ticket.status;
    }
  }, [ticket?.status]);

  // Subscribe to service details and branch details
  useEffect(() => {
    if (!ticket) return;

    const unsubService = onSnapshot(doc(db, 'services', ticket.serviceId), (snap) => {
      if (snap.exists()) {
        setService({ id: snap.id, ...snap.data() } as Service);
      }
    });

    const unsubBranch = onSnapshot(doc(db, 'branches', ticket.branchId), (snap) => {
      if (snap.exists()) {
        setBranch({ id: snap.id, ...snap.data() } as Branch);
      }
    });

    return () => {
      unsubService();
      unsubBranch();
    };
  }, [ticket]);

  // Fetch workflow and stages
  useEffect(() => {
    if (!service?.workflowId) {
      setWorkflow(null);
      setStages([]);
      return;
    }

    const fetchWorkflowData = async () => {
      try {
        const data = await getWorkflowWithStages(service.workflowId!);
        if (data) {
          setWorkflow(data.workflow);
          setStages(data.stages);
        }
      } catch (err) {
        console.error('Failed to fetch workflow details:', err);
      }
    };

    fetchWorkflowData();
  }, [service?.workflowId]);

  // Calculate workflow stage information
  const currentStageIndex = ticket?.currentStageId && workflow?.stageIds
    ? workflow.stageIds.indexOf(ticket.currentStageId)
    : -1;
  
  const currentStageName = ticket?.currentStageId && stages.length > 0
    ? stages.find(s => s.id === ticket.currentStageId)?.name
    : null;

  const totalStagesCount = workflow?.stageIds?.length || 0;

  // Subscribe to people ahead count
  useEffect(() => {
    if (!ticket || ticket.status !== 'WAITING') {
      setPeopleAhead(0);
      return;
    }

    const unsubscribe = subscribeWaitingAheadCount(
      ticket.branchId,
      ticket.serviceId,
      ticket.sequenceNumber,
      (count) => {
        setPeopleAhead(count);
      },
      (err) => {
        console.error('Error listening to people ahead:', err);
      }
    );

    return () => unsubscribe();
  }, [ticket]);

  const handleCancelTicket = async () => {
    if (!ticketId) return;
    setCancelling(true);
    try {
      await cancelQueueItem(ticketId);
      setShowCancelModal(false);
    } catch (err) {
      console.error('Failed to cancel ticket:', err);
      alert('Could not cancel ticket. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  // Status Badge UI configuration
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'WAITING':
        return {
          bg: 'bg-brand-50 dark:bg-brand-955/20 border-brand-200/50 dark:border-brand-900/30',
          text: 'text-brand-655 dark:text-brand-400',
          label: t('pages.queues.statusWaiting'),
          pulse: false
        };
      case 'CALLED':
        return {
          bg: 'bg-amber-50 dark:bg-amber-955/20 border-amber-300 dark:border-amber-900/40 animate-pulse',
          text: 'text-amber-700 dark:text-amber-400 font-extrabold',
          label: t('pages.queues.statusCalled'),
          pulse: true
        };
      case 'SERVING':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-955/20 border-emerald-250 dark:border-emerald-900/40',
          text: 'text-emerald-700 dark:text-emerald-400 font-bold',
          label: t('pages.queues.statusServing'),
          pulse: false
        };
      case 'COMPLETED':
        return {
          bg: 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800',
          text: 'text-slate-500 dark:text-slate-400',
          label: t('pages.queues.statusCompleted'),
          pulse: false
        };
      case 'NO_SHOW':
        return {
          bg: 'bg-red-50 dark:bg-red-955/20 border-red-200 dark:border-red-900/40',
          text: 'text-red-650 dark:text-red-400',
          label: t('pages.queues.statusNoShow'),
          pulse: false
        };
      case 'CANCELLED':
        return {
          bg: 'bg-slate-100 dark:bg-slate-900/30 border-slate-250 dark:border-slate-800/80',
          text: 'text-slate-400 dark:text-slate-500',
          label: t('pages.queues.statusCancelled'),
          pulse: false
        };
      default:
        return {
          bg: 'bg-slate-50 dark:bg-slate-900 border-slate-200',
          text: 'text-slate-600',
          label: status,
          pulse: false
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 font-medium">Syncing ticket status...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="glass-panel max-w-md w-full p-6 text-center border-danger/25">
          <AlertTriangle className="w-12 h-12 text-danger mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-950 dark:text-white">
            {error || 'Ticket Not Found'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            The ticket ID does not exist or may have been deleted.
          </p>
          <Link
            to="/"
            className="inline-block mt-6 px-5 py-2.5 bg-brand-655 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            {t('pages.queues.goBack')}
          </Link>
        </div>
      </div>
    );
  }

  const statusStyle = getStatusConfig(ticket.status);
  const estimatedWaitTime = (peopleAhead + 1) * (service?.estimatedDurationMinutes || 15);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col py-8 px-4 relative overflow-hidden transition-colors">
      {/* Decorative gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-500/5 dark:bg-brand-500/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[80px] -z-10 pointer-events-none" />

      {/* Floating utility switchers */}
      <div className="absolute top-4 right-4 z-50">
        <SettingsSwitcher />
      </div>

      <div className="max-w-md w-full mx-auto flex-1 flex flex-col justify-center">
        {/* Branch name header */}
        {branch && (
          <div className="flex items-center justify-center gap-2 mb-6 text-slate-500 dark:text-slate-400">
            <Building className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">{branch.name}</span>
          </div>
        )}

        {/* Main Ticket Card */}
        <div className="glass-panel p-8 rounded-3xl text-center shadow-2xl relative border-brand-500/15 overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">
          
          {/* Subtle audio indicator if ticket is called */}
          {ticket.status === 'CALLED' && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-955/35 border border-amber-250/40 rounded-full text-[10px] font-bold text-amber-700 dark:text-amber-400">
              <Volume2 className="w-3.5 h-3.5 animate-bounce" />
              <span>Chime Played</span>
            </div>
          )}

          <span className="text-xs font-bold tracking-widest text-slate-455 dark:text-slate-500 uppercase">
            {service ? getServiceName(service) : t('pages.queues.yourTicket')}
          </span>
          {/* Ticket Number */}
          <h1 className="text-6xl font-black text-slate-900 dark:text-white my-6 tracking-tight font-outfit select-all bg-gradient-to-tr from-brand-655 to-indigo-650 bg-clip-text text-transparent">
            {ticket.queueNumber}
          </h1>

          {/* Customer Name */}
          <p className="text-sm text-slate-655 dark:text-slate-350 font-bold mb-6">
            {ticket.customerName}
          </p>

          {/* Status Badge & Step/Counter details */}
          <div className={`p-5 border rounded-2xl ${statusStyle.bg} mb-6 flex flex-col items-center justify-center transition-all space-y-3`}>
            <div className="flex flex-col items-center">
              <span className={`text-[10px] uppercase font-extrabold tracking-widest opacity-80 ${statusStyle.text}`}>
                {t('pages.appointments.tableStatus')}
              </span>
              <span className={`text-base font-black uppercase tracking-wide mt-0.5 ${statusStyle.text}`}>
                {statusStyle.label}
              </span>
            </div>

            {/* Waiting for service info */}
            {ticket.status === 'WAITING' && (
              <div className="text-xs font-semibold text-slate-550 dark:text-slate-400 border-t border-slate-200/50 dark:border-slate-800/50 pt-2 w-full text-center">
                <span>
                  {i18n.language === 'th' ? 'กำลังรอรับบริการ: ' : 'Waiting for: '}
                </span>
                <span className="text-brand-655 dark:text-brand-400 font-bold">
                  {currentStageName || getServiceName(service)}
                </span>
                {currentStageName && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">
                    ({i18n.language === 'th' ? 'บริการหลัก: ' : 'Main service: '}{getServiceName(service)})
                  </span>
                )}
              </div>
            )}

            {/* Called by counter info */}
            {ticket.status === 'CALLED' && (
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-350 border-t border-slate-200/50 dark:border-slate-800/50 pt-2 w-full text-center space-y-1">
                <div>
                  {i18n.language === 'th' ? 'กรุณาติดต่อที่: ' : 'Please proceed to: '}
                  <span className="text-amber-700 dark:text-amber-400 font-extrabold text-sm block sm:inline">
                    {i18n.language === 'th' ? `ช่องบริการ ${ticket.calledByCounter || '1'}` : `Counter ${ticket.calledByCounter || '1'}`}
                  </span>
                </div>
                {currentStageName && (
                  <div className="text-[10px] text-slate-500">
                    {i18n.language === 'th' ? 'สำหรับบริการย่อย: ' : 'For sub-service: '}
                    <span className="font-bold text-amber-700 dark:text-amber-450">{currentStageName}</span>
                  </div>
                )}
              </div>
            )}

            {/* Currently serving info */}
            {ticket.status === 'SERVING' && (
              <div className="text-xs font-semibold text-slate-750 dark:text-slate-350 border-t border-slate-200/50 dark:border-slate-800/50 pt-2 w-full text-center space-y-1">
                <div>
                  {i18n.language === 'th' ? 'กำลังรับบริการที่: ' : 'Currently serving at: '}
                  <span className="text-emerald-700 dark:text-emerald-450 font-extrabold text-sm block sm:inline">
                    {i18n.language === 'th' ? `ช่องบริการ ${ticket.calledByCounter || '1'}` : `Counter ${ticket.calledByCounter || '1'}`}
                  </span>
                </div>
                {currentStageName && (
                  <div className="text-[10px] text-slate-550">
                    {i18n.language === 'th' ? 'ขั้นตอนย่อย: ' : 'Sub-service stage: '}
                    <span className="font-bold text-emerald-750 dark:text-emerald-450">{currentStageName}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Workflow progress/step visualization */}
          {currentStageIndex !== -1 && totalStagesCount > 0 && (
            <div className="mb-6 p-4 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-150/50 dark:border-slate-800 rounded-2xl text-left">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                <span>{i18n.language === 'th' ? 'ความคืบหน้าการรับบริการ' : 'Service Progress'}</span>
                <span className="text-brand-655 dark:text-brand-400">
                  {i18n.language === 'th' ? `ขั้นตอน ${currentStageIndex + 1} จาก ${totalStagesCount}` : `Step ${currentStageIndex + 1} of ${totalStagesCount}`}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-brand-655 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${((currentStageIndex + 1) / totalStagesCount) * 100}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-1 mt-3">
                {stages.map((stg, idx) => {
                  const isPast = idx < currentStageIndex;
                  const isCurrent = idx === currentStageIndex;
                  return (
                    <span 
                      key={stg.id} 
                      className={`text-[9px] px-2 py-0.5 rounded-md border font-semibold ${
                        isCurrent 
                          ? 'bg-brand-500/10 border-brand-500 text-brand-600 dark:text-brand-400 font-extrabold'
                          : isPast
                          ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 text-slate-400 line-through'
                          : 'bg-slate-50 dark:bg-slate-900/20 border-slate-200 text-slate-400 dark:text-slate-600'
                      }`}
                    >
                      {idx + 1}. {stg.name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Real-time stats (only when WAITING) */}
          {ticket.status === 'WAITING' && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex flex-col items-center p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-150/40 dark:border-slate-800 rounded-2xl">
                <Users className="w-5 h-5 text-brand-500 mb-1.5" />
                <span className="text-[10px] font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-wider">
                  People Ahead
                </span>
                <span className="text-lg font-black text-slate-850 dark:text-white mt-0.5">
                  {peopleAhead}
                </span>
              </div>
              <div className="flex flex-col items-center p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-150/40 dark:border-slate-800 rounded-2xl">
                <Clock className="w-5 h-5 text-brand-500 mb-1.5" />
                <span className="text-[10px] font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-wider">
                  Estimated Wait
                </span>
                <span className="text-lg font-black text-slate-850 dark:text-white mt-0.5">
                  {estimatedWaitTime} <span className="text-xs font-normal text-slate-500">mins</span>
                </span>
              </div>
            </div>
          )}

          {/* Completed / Cancelled final states */}
          {ticket.status === 'COMPLETED' && (
            <div className="flex flex-col items-center py-2 text-emerald-650">
              <CheckCircle className="w-8 h-8 mb-2" />
              <p className="text-xs font-bold">Thank you for visiting us!</p>
            </div>
          )}

          {/* Action triggers */}
          {ticket.status === 'WAITING' && (
            <div className="mt-8">
              <button
                onClick={() => setShowCancelModal(true)}
                className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-danger/10 hover:text-danger hover:border-danger/30 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-350 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t('pages.queues.cancelBtn')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link
            to={`/join/${ticket.branchId}`}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-655 font-bold transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Join another service</span>
          </Link>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-950 dark:text-white mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-danger" />
              Confirm Cancellation
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              {t('pages.queues.cancelConfirm')}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCancelModal(false)}
                className="py-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/50 text-slate-700 dark:text-slate-350 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Keep Ticket
              </button>
              <button
                onClick={handleCancelTicket}
                disabled={cancelling}
                className="py-2 px-4 bg-danger text-white hover:bg-danger/90 rounded-xl text-xs font-bold shadow-md shadow-danger/15 flex items-center gap-1 cursor-pointer"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Cancel Ticket</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketStatusPage;
