import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { QueueItem, Service, Branch } from '@/types/firestore';
import { subscribeQueueItem, cancelQueueItem, subscribeWaitingAheadCount } from '../repository/queueRepository';
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
  const { t } = useTranslation();

  // State
  const [ticket, setTicket] = useState<QueueItem | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [peopleAhead, setPeopleAhead] = useState<number>(0);
  
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prevStatusRef = useRef<string | null>(null);

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

          <span className="text-xs font-bold tracking-widest text-slate-450 dark:text-slate-500 uppercase">
            {service ? service.name : t('pages.queues.yourTicket')}
          </span>

          {/* Ticket Number */}
          <h1 className="text-6xl font-black text-slate-900 dark:text-white my-6 tracking-tight font-outfit select-all bg-gradient-to-tr from-brand-655 to-indigo-650 bg-clip-text text-transparent">
            {ticket.queueNumber}
          </h1>

          {/* Customer Name */}
          <p className="text-sm text-slate-655 dark:text-slate-350 font-bold mb-6">
            {ticket.customerName}
          </p>

          {/* Status Badge */}
          <div className={`p-4 border rounded-2xl ${statusStyle.bg} mb-8 flex flex-col items-center justify-center transition-all`}>
            <span className={`text-sm font-bold uppercase tracking-wide ${statusStyle.text}`}>
              {statusStyle.label}
            </span>
            {ticket.status === 'CALLED' && (
              <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80 font-semibold mt-1">
                Please proceed to the reception / serving counter immediately.
              </span>
            )}
          </div>

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
