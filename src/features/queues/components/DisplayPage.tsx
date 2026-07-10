import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { subscribeBranch } from '@/features/branches/repository/branchRepository';
import { getServices } from '@/features/services/repository/serviceRepository';
import { subscribeDisplayQueues } from '../repository/queueRepository';
import { Branch, Service, QueueItem } from '@/types/firestore';
import { playCallingChime } from '@/shared/utils/audio';
import { 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  Clock, 
  Tv, 
  Inbox, 
  ChevronRight,
  Sparkles
} from 'lucide-react';

export const DisplayPage: React.FC = () => {
  const { branchId } = useParams<{ branchId: string }>();
  const { t, i18n } = useTranslation();

  // State
  const [branch, setBranch] = useState<Branch | null>(null);
  const [tickets, setTickets] = useState<QueueItem[]>([]);
  const [services, setServices] = useState<Record<string, Service>>({});
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Refs for tracking changes
  const lastCalledTicketIdRef = useRef<string | null>(null);
  const lastCalledTimeRef = useRef<number | null>(null);
  const flashTimeoutRef = useRef<any>(null);

  // Real-time Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Branch details and subscribe
  useEffect(() => {
    if (!branchId) return;

    const unsubscribe = subscribeBranch(
      branchId,
      (branchData) => {
        setBranch(branchData);
      },
      (error) => {
        console.error('Failed to subscribe branch:', error);
      }
    );

    return () => unsubscribe();
  }, [branchId]);

  // Fetch Services mapping
  useEffect(() => {
    if (!branchId) return;
    const fetchServices = async () => {
      try {
        const list = await getServices(branchId);
        const map: Record<string, Service> = {};
        list.forEach((s) => {
          map[s.id] = s;
        });
        setServices(map);
      } catch (error) {
        console.error('Failed to fetch services:', error);
      }
    };
    fetchServices();
  }, [branchId]);

  // Subscribe to Queues (called & waiting)
  useEffect(() => {
    if (!branchId) return;

    setLoading(true);
    const unsubscribe = subscribeDisplayQueues(
      branchId,
      (activeItems) => {
        setTickets(activeItems);
        setLoading(false);

        // Find the latest called ticket (status === 'CALLED' sorted by calledAt desc)
        const calledTickets = activeItems
          .filter((t) => t.status === 'CALLED' && t.calledAt)
          .sort((a, b) => {
            const timeA = a.calledAt?.seconds ? a.calledAt.seconds * 1000 : new Date(a.calledAt as any).getTime();
            const timeB = b.calledAt?.seconds ? b.calledAt.seconds * 1000 : new Date(b.calledAt as any).getTime();
            return timeB - timeA;
          });

        if (calledTickets.length > 0) {
          const latestCalled = calledTickets[0];
          const latestId = latestCalled.id;
          const latestCalledAt = latestCalled.calledAt?.seconds 
            ? latestCalled.calledAt.seconds 
            : new Date(latestCalled.calledAt as any).getTime();

          // Trigger alert if there's a new call or recall
          if (
            lastCalledTicketIdRef.current !== latestId ||
            (lastCalledTimeRef.current && latestCalledAt > lastCalledTimeRef.current)
          ) {
            lastCalledTicketIdRef.current = latestId;
            lastCalledTimeRef.current = latestCalledAt;

            // Trigger visual flash
            if (flashTimeoutRef.current) {
              clearTimeout(flashTimeoutRef.current);
            }
            setIsFlashing(true);
            flashTimeoutRef.current = setTimeout(() => setIsFlashing(false), 5000);

            // Play audio alert if enabled
            if (isAudioEnabled) {
              playCallingChime();
            }
          }
        }
      },
      (error) => {
        console.error('Failed to subscribe to display queues:', error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
    };
  }, [branchId, isAudioEnabled]);

  // Handle Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error('Error entering fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  // Fullscreen state listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Format Date and Time nicely
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(i18n.language === 'th' ? 'th-TH' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(i18n.language === 'th' ? 'th-TH' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Calculate ticket arrays
  const calledTickets = tickets.filter((t) => t.status === 'CALLED');
  const waitingTickets = tickets.filter((t) => t.status === 'WAITING').slice(0, 8);

  // Find the primary called ticket (latest)
  const primaryCalledTicket = calledTickets
    .sort((a, b) => {
      const timeA = a.calledAt?.seconds ? a.calledAt.seconds * 1000 : new Date(a.calledAt as any).getTime();
      const timeB = b.calledAt?.seconds ? b.calledAt.seconds * 1000 : new Date(b.calledAt as any).getTime();
      return timeB - timeA;
    })[0];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans overflow-hidden select-none relative">
      
      {/* Autoplay Audio Overlay Banner */}
      {!isAudioEnabled && (
        <div className="absolute inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="p-5 bg-brand-500/10 border border-brand-500/30 rounded-3xl mb-6 text-brand-450 animate-bounce">
            <VolumeX className="w-16 h-16" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">
            {i18n.language === 'th' ? 'ต้องการเปิดระบบเสียงเรียกคิว?' : 'Enable Audio Notifications?'}
          </h1>
          <p className="text-sm text-slate-450 max-w-md mb-8 leading-relaxed">
            {i18n.language === 'th' 
              ? 'เบราว์เซอร์บล็อกเสียงเริ่มต้นโดยอัตโนมัติ กรุณาคลิกปุ่มด้านล่างเพื่ออนุญาตให้ส่งเสียงกระดิ่งเมื่อมีการเรียกคิว' 
              : 'Web browsers prevent autoplay audio by default. Please click the button below to enable chime sounds when tickets are called.'}
          </p>
          <button
            onClick={() => {
              setIsAudioEnabled(true);
              playCallingChime(); // Warm up audio context
            }}
            className="px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white font-extrabold rounded-2xl shadow-xl shadow-brand-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2"
          >
            <Volume2 className="w-5 h-5" />
            <span>{i18n.language === 'th' ? 'เปิดระบบเสียงเรียกคิว' : 'Enable TV Audio Alert'}</span>
          </button>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="px-8 py-5 bg-slate-900/60 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-600/10 border border-brand-600/20 text-brand-500 rounded-2xl">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              {branch?.name || t('pages.qrJoin.mockBranchName')}
              <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 font-extrabold uppercase rounded-full tracking-wider border border-slate-700">
                TV Display
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              {t('pages.tvDisplay.title')}
            </p>
          </div>
        </div>

        {/* Localized Live Clock & Header controls */}
        <div className="flex items-center gap-6">
          <div className="text-right hidden md:block">
            <p className="text-lg font-black text-white tracking-tight">{formatTime(currentTime)}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">{formatDate(currentTime)}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              onClick={() => setIsAudioEnabled(!isAudioEnabled)}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                isAudioEnabled 
                  ? 'bg-slate-800 border-slate-700 text-brand-450 hover:bg-slate-750' 
                  : 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20'
              }`}
              title={isAudioEnabled ? 'Disable Audio' : 'Enable Audio'}
            >
              {isAudioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white rounded-xl transition-all cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch overflow-hidden">
        
        {/* Left Column: Now Calling Display (Spans 7 cols) */}
        <section className="lg:col-span-7 flex flex-col justify-between">
          <div className="flex-1 flex flex-col justify-center">
            {primaryCalledTicket ? (
              <div 
                className={`bg-slate-900/40 border-2 rounded-3xl p-10 flex flex-col justify-between items-center text-center shadow-xl transition-all duration-300 min-h-[480px] justify-center relative ${
                  isFlashing 
                    ? 'border-brand-500 bg-brand-500/10 shadow-brand-500/20 scale-[1.01]' 
                    : 'border-slate-800/80 bg-slate-900/20'
                }`}
              >
                {/* Flashing decoration */}
                {isFlashing && (
                  <div className="absolute top-6 flex items-center gap-1.5 px-3 py-1 bg-brand-500/20 border border-brand-500/40 text-brand-450 font-extrabold text-[10px] uppercase rounded-full tracking-wider animate-pulse">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{i18n.language === 'th' ? 'เรียกคิวใหม่' : 'Just Called'}</span>
                  </div>
                )}

                <div className="space-y-6">
                  <span className="text-xs font-black text-brand-450 uppercase tracking-widest bg-brand-500/10 border border-brand-500/20 px-4 py-1.5 rounded-full">
                    {t('pages.tvDisplay.nowCallingLabel')}
                  </span>
                  
                  {/* Big Ticket Number */}
                  <h1 className="text-[120px] sm:text-[160px] font-black text-white leading-none tracking-tighter my-4 select-none drop-shadow-[0_4px_24px_rgba(255,255,255,0.05)]">
                    {primaryCalledTicket.queueNumber}
                  </h1>

                  {/* Service Name */}
                  <p className="text-xl sm:text-2xl text-slate-300 font-extrabold tracking-tight">
                    {services[primaryCalledTicket.serviceId]?.name || 'Unknown Service'}
                  </p>
                </div>

                {/* Counter indicator */}
                <div className="mt-8 px-8 py-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl text-lg sm:text-xl text-emerald-400 font-black shadow-inner flex items-center gap-2">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                  {t('pages.tvDisplay.proceedToCounter', { counter: primaryCalledTicket.calledByCounter || '1' })}
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/20 border border-slate-800/80 rounded-3xl p-10 flex flex-col justify-center items-center text-center shadow-xl min-h-[480px]">
                <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl mb-4 text-slate-600">
                  <Inbox className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-bold text-slate-350">
                  {i18n.language === 'th' ? 'ไม่มีคิวเรียกในขณะนี้' : 'No Active Calls'}
                </h3>
                <p className="text-xs text-slate-550 max-w-xs mt-2 leading-relaxed">
                  {i18n.language === 'th' 
                    ? 'เมื่อเจ้าหน้าที่กดเรียกคิว ข้อมูลจะแสดงผลที่ช่องบริการนี้ทันที' 
                    : 'When staff call a ticket, it will appear here with sound alert.'}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Waiting List (Spans 5 cols) */}
        <section className="lg:col-span-5 bg-slate-900/20 border border-slate-800/80 rounded-3xl p-6 flex flex-col shadow-xl">
          <div className="pb-4 border-b border-slate-800 flex items-center justify-between mb-5">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span>{t('pages.tvDisplay.waitingListLabel')}</span>
              <span className="px-2 py-0.5 bg-slate-800 text-[10px] text-slate-400 font-extrabold rounded-full">
                {waitingTickets.length}
              </span>
            </h3>
          </div>

          {loading ? (
            <div className="flex-1 flex flex-col justify-center items-center text-slate-500 py-16">
              <span className="w-8 h-8 border-4 border-slate-800 border-t-brand-500 rounded-full animate-spin mb-3" />
              <p className="text-xs font-semibold">Updating Waiting List...</p>
            </div>
          ) : waitingTickets.length === 0 ? (
            <div className="flex-1 flex flex-col justify-center items-center text-slate-500 py-16">
              <Inbox className="w-10 h-10 text-slate-700 mb-2" />
              <p className="text-xs font-bold">
                {i18n.language === 'th' ? 'ไม่มีคิวรอรับบริการ' : 'No Waiting Tickets'}
              </p>
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-[500px] pr-1">
              {waitingTickets.map((ticket, index) => (
                <div 
                  key={ticket.id} 
                  className={`p-4 rounded-2xl flex items-center justify-between bg-slate-900/60 border border-slate-850 shadow-sm ${
                    index === 0 ? 'border-brand-500/20 ring-1 ring-brand-500/10' : ''
                  }`}
                >
                  <div>
                    <h4 className="text-xl font-black text-white">{ticket.queueNumber}</h4>
                    <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider truncate max-w-28 mt-0.5">
                      {services[ticket.serviceId]?.name || 'Service'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-slate-600">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {t('pages.queues.statusWaiting')}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Bottom Footer Ticker / Informational rolling text */}
      <footer className="bg-slate-900 border-t border-slate-800/80 px-8 py-4.5 flex items-center justify-between text-slate-450 text-xs font-semibold relative z-10">
        <div className="flex-1 overflow-hidden flex items-center gap-4">
          <span className="px-2 py-0.5 bg-brand-600/20 text-brand-450 border border-brand-600/30 text-[10px] font-extrabold uppercase rounded-lg tracking-wider whitespace-nowrap">
            INFO
          </span>
          <div className="flex-1 relative w-full overflow-hidden h-5">
            {/* Smooth marquee ticker effect */}
            <p className="absolute whitespace-nowrap animate-marquee">
              {t('pages.tvDisplay.haveTicketReady')} • {i18n.language === 'th' ? 'กรุณาตรวจสอบหน้าจอเพื่อเข้าพบเจ้าหน้าที่ช่องบริการที่กำหนด' : 'Please proceed to your assigned service counter when called.'} • Thank you for using ServiceOS.
            </p>
          </div>
        </div>
        <div className="pl-6 flex items-center gap-2 border-l border-slate-800 ml-6 whitespace-nowrap">
          <Clock className="w-4 h-4 text-brand-450" />
          <span className="text-white tracking-tight">{formatTime(currentTime)}</span>
        </div>
      </footer>
    </div>
  );
};
