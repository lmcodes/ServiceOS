import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { subscribeBranch } from '@/features/branches/repository/branchRepository';
import { getServices } from '@/features/services/repository/serviceRepository';
import { subscribeDisplayQueues } from '../repository/queueRepository';
import { getWorkflows, getWorkflowWithStages } from '@/features/workflows/repository/workflowRepository';
import { Branch, Service, QueueItem, WorkflowStage, DisplayTemplate, MediaItem } from '@/types/firestore';
import { playCallingChime } from '@/shared/utils/audio';
import { speakQueue } from '@/utils/tts';
import { 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  Clock, 
  Tv, 
  Inbox, 
  Sparkles
} from 'lucide-react';
import { 
  subscribeActiveDisplayTemplate, 
  subscribeMediaItems 
} from '@/features/display/repository/displayRepository';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';

export const DisplayPage: React.FC = () => {
  const { branchId } = useParams<{ branchId: string }>();
  const { t, i18n } = useTranslation();

  // Core Queue States
  const [branch, setBranch] = useState<Branch | null>(null);
  const [tickets, setTickets] = useState<QueueItem[]>([]);
  const [services, setServices] = useState<Record<string, Service>>({});
  const [stages, setStages] = useState<Record<string, WorkflowStage>>({});
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Template & Media Playback States
  const [activeTemplate, setActiveTemplate] = useState<DisplayTemplate | null>(null);
  const [mediaLibrary, setMediaLibrary] = useState<MediaItem[]>([]);
  const [currentPlayIndex, setCurrentPlayIndex] = useState(0);

  // Refs for tracking changes
  const lastCalledTicketIdRef = useRef<string | null>(null);
  const lastCalledTimeRef = useRef<number | null>(null);
  const flashTimeoutRef = useRef<any>(null);

  const voiceSettingsRef = useRef<any>(undefined);
  const systemVoiceSettingsRef = useRef<any>(undefined);

  useEffect(() => {
    voiceSettingsRef.current = branch?.voiceSettings;
  }, [branch?.voiceSettings]);

  // Load system fallback voice settings
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'systemSettings', 'voice'), (docSnap) => {
      if (docSnap.exists()) {
        systemVoiceSettingsRef.current = docSnap.data();
      }
    }, (err) => {
      console.warn('[DisplayPage] Failed to fetch system voice settings:', err);
    });
    return () => unsubscribe();
  }, []);

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

  // Subscribe to active display template
  useEffect(() => {
    if (!branchId) return;

    const unsubscribe = subscribeActiveDisplayTemplate(
      branchId,
      (template) => {
        setActiveTemplate(template);
        setCurrentPlayIndex(0); // Reset index on layout switch
      },
      (error) => {
        console.error('Failed to subscribe active template:', error);
      }
    );

    return () => unsubscribe();
  }, [branchId]);

  // Subscribe to media library
  useEffect(() => {
    const tenantId = branch?.tenantId;
    if (!tenantId) return;

    const unsubscribe = subscribeMediaItems(
      tenantId,
      (items) => {
        setMediaLibrary(items);
      },
      (error) => {
        console.error('Failed to subscribe media library for display:', error);
      }
    );

    return () => unsubscribe();
  }, [branch?.tenantId]);

  // Fetch Workflows and Stages based on branch.tenantId
  useEffect(() => {
    const tenantId = branch?.tenantId;
    if (!tenantId) return;

    const loadWorkflowsAndStages = async () => {
      try {
        const wfList = await getWorkflows(tenantId);
        const stgMap: Record<string, WorkflowStage> = {};

        await Promise.all(
          wfList.map(async (wf) => {
            const data = await getWorkflowWithStages(wf.id);
            if (data) {
              data.stages.forEach((stage) => {
                stgMap[stage.id] = stage;
              });
            }
          })
        );

        setStages(stgMap);
      } catch (err) {
        console.error('Failed to load workflows/stages for display:', err);
      }
    };

    loadWorkflowsAndStages();
  }, [branch?.tenantId]);

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

            // Trigger visual flash overlay
            if (flashTimeoutRef.current) {
              clearTimeout(flashTimeoutRef.current);
            }
            setIsFlashing(true);
            flashTimeoutRef.current = setTimeout(() => setIsFlashing(false), 5000);

            // Play audio alert if enabled
            if (isAudioEnabled) {
              playCallingChime();

              // Determine active settings: branch settings take priority if enabled, otherwise fall back to system settings
              const activeVoiceSettings = (voiceSettingsRef.current && voiceSettingsRef.current.ttsEnabled)
                ? voiceSettingsRef.current
                : systemVoiceSettingsRef.current;

              if (activeVoiceSettings && activeVoiceSettings.ttsEnabled) {
                // Delay voice announcement slightly to let the chime sound finish first
                setTimeout(() => {
                  speakQueue(
                    latestCalled.queueNumber,
                    latestCalled.calledByCounter || '1',
                    activeVoiceSettings
                  );
                }, 1200);
              }
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

  // Resolve playlist items with actual media information
  const playlistItems = (activeTemplate?.mediaPlaylist || [])
    .map((playItem) => {
      const media = mediaLibrary.find((m) => m.id === playItem.mediaId);
      return media ? { ...playItem, media } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  // Cycle through playlist items
  useEffect(() => {
    if (playlistItems.length === 0) {
      setCurrentPlayIndex(0);
      return;
    }

    const currentItem = playlistItems[currentPlayIndex];
    const durationMs = (currentItem?.duration || activeTemplate?.transitionSeconds || 10) * 1000;

    const timer = setTimeout(() => {
      setCurrentPlayIndex((prev) => (prev + 1) % playlistItems.length);
    }, durationMs);

    return () => clearTimeout(timer);
  }, [currentPlayIndex, playlistItems.length, activeTemplate?.transitionSeconds]);

  // Extract YouTube ID
  const getYoutubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\/\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
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

  const waitingText = waitingTickets.map(t => t.queueNumber).join(', ');
  const marqueeContent = waitingText 
    ? `${t('pages.tvDisplay.haveTicketReady')} • ${i18n.language === 'th' ? 'คิวที่กำลังรอ: ' : 'Waiting Queues: '}${waitingText} • Please proceed to your assigned counter when called.`
    : `${t('pages.tvDisplay.haveTicketReady')} • Please proceed to your assigned service counter when called.`;

  // Media Player Renderer
  const renderMediaPlayer = () => {
    if (playlistItems.length === 0) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-500 p-6 text-center">
          <Tv className="w-12 h-12 mb-3 text-slate-700" />
          <p className="text-sm font-bold">No Playlist Media</p>
          <p className="text-xs text-slate-650 mt-1">Add images or videos to this template playlist to display here.</p>
        </div>
      );
    }

    const currentItem = playlistItems[currentPlayIndex];
    if (!currentItem || !currentItem.media) return null;

    const { media } = currentItem;

    if (media.type === 'image') {
      return (
        <img 
          src={media.storageUrl} 
          alt={media.name} 
          className="w-full h-full object-cover animate-in fade-in duration-300 rounded-3xl shadow-lg border border-slate-900/50"
        />
      );
    }

    if (media.type === 'video') {
      return (
        <video 
          key={media.storageUrl}
          src={media.storageUrl} 
          className="w-full h-full object-cover rounded-3xl shadow-lg border border-slate-900/50"
          autoPlay 
          muted 
          playsInline
        />
      );
    }

    if (media.type === 'url') {
      const ytId = getYoutubeId(media.storageUrl);
      if (ytId) {
        return (
          <iframe 
            key={ytId}
            width="100%" 
            height="100%" 
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&showinfo=0`} 
            title="YouTube player" 
            frameBorder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            className="w-full h-full object-cover rounded-3xl shadow-lg border border-slate-900/50"
          ></iframe>
        );
      }
      return (
        <div className="w-full h-full flex items-center justify-center bg-slate-900 rounded-3xl p-6 text-center border border-slate-800">
          <p className="text-xs text-brand-400 break-all">{media.storageUrl}</p>
        </div>
      );
    }

    return null;
  };

  // Render Queue Panel for Split Layout
  const renderQueuePanel = (sizeClass: string) => {
    return (
      <div className={`${sizeClass} flex flex-col gap-6 justify-between h-full`}>
        {/* Now Calling Box */}
        <div className="flex-1 flex flex-col justify-center">
          {primaryCalledTicket ? (
            <div 
              className={`bg-slate-900/40 border-2 rounded-3xl p-6 flex flex-col justify-between items-center text-center shadow-xl transition-all duration-300 min-h-[260px] justify-center relative ${
                isFlashing 
                  ? 'border-brand-500 bg-brand-500/10 shadow-brand-500/20 scale-[1.01]' 
                  : 'border-slate-800/80 bg-slate-900/20'
              }`}
            >
              {isFlashing && (
                <div className="absolute top-4 flex items-center gap-1 bg-brand-500/20 border border-brand-500/40 text-brand-450 font-extrabold text-[9px] uppercase rounded-full tracking-wider animate-pulse px-2.5 py-0.5">
                  <Sparkles className="w-3 h-3" />
                  <span>{i18n.language === 'th' ? 'เรียกคิวใหม่' : 'Just Called'}</span>
                </div>
              )}
              <div className="space-y-3">
                <span className="text-[10px] font-black text-brand-450 uppercase tracking-widest bg-brand-500/10 border border-brand-500/20 px-3 py-1 rounded-full">
                  {t('pages.tvDisplay.nowCallingLabel')}
                </span>
                <h1 className="text-[56px] font-black text-white leading-none tracking-tighter my-2 drop-shadow-[0_4px_12px_rgba(255,255,255,0.05)]">
                  {primaryCalledTicket.queueNumber}
                </h1>
                <p className="text-sm text-slate-350 font-bold tracking-tight">
                  {services[primaryCalledTicket.serviceId]?.name || 'Unknown Service'}
                </p>
              </div>
              <div className="mt-4 px-4 py-2 bg-slate-950/80 border border-slate-800/80 rounded-xl text-sm text-emerald-400 font-black shadow-inner flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                {t('pages.tvDisplay.proceedToCounter', { counter: primaryCalledTicket.calledByCounter || '1' })}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/20 border border-slate-800/80 rounded-3xl p-6 flex flex-col justify-center items-center text-center shadow-xl min-h-[260px]">
              <Inbox className="w-8 h-8 text-slate-700 mb-2" />
              <h3 className="text-sm font-bold text-slate-350">
                {i18n.language === 'th' ? 'ไม่มีคิวเรียกในขณะนี้' : 'No Active Calls'}
              </h3>
            </div>
          )}
        </div>

        {/* Waiting List */}
        <div className="bg-slate-900/20 border border-slate-800/80 rounded-3xl p-5 flex flex-col h-[240px]">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-800 pb-2 mb-3">
            <span>{t('pages.tvDisplay.waitingListLabel')}</span>
            <span className="px-1.5 py-0.5 bg-slate-850 text-[9px] text-slate-400 font-extrabold rounded-full">
              {waitingTickets.length}
            </span>
          </h3>
          {waitingTickets.length === 0 ? (
            <div className="flex-grow flex flex-col justify-center items-center text-slate-500">
              <p className="text-[10px] font-bold">
                {i18n.language === 'th' ? 'ไม่มีคิวรอรับบริการ' : 'No Waiting Tickets'}
              </p>
            </div>
          ) : (
            <div className="flex-grow overflow-y-auto space-y-1.5 pr-1">
              {waitingTickets.slice(0, 4).map((ticket) => (
                <div key={ticket.id} className="p-2.5 rounded-xl flex items-center justify-between bg-slate-900/60 border border-slate-850">
                  <div>
                    <h4 className="text-sm font-black text-white">{ticket.queueNumber}</h4>
                    <p className="text-[9px] text-slate-400 truncate max-w-[120px]">{services[ticket.serviceId]?.name || 'Service'}</p>
                  </div>
                  <span className="text-[9px] font-bold text-slate-550 uppercase tracking-wider">{t('pages.queues.statusWaiting')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render layouts dynamically based on template config
  const renderLayout = () => {
    const layout = activeTemplate?.layout || 'queue-only';

    // 1. Classic Queue Only Layout
    if (layout === 'queue-only') {
      return (
        <div className="flex-grow p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch overflow-hidden">
          {/* Left Column: Now Calling Display */}
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
                    
                    <h1 className="text-[120px] sm:text-[160px] font-black text-white leading-none tracking-tighter my-4 select-none drop-shadow-[0_4px_24px_rgba(255,255,255,0.05)]">
                      {primaryCalledTicket.queueNumber}
                    </h1>

                    <div className="space-y-1.5 mt-2">
                      <p className="text-xl sm:text-2xl text-slate-350 font-bold tracking-tight">
                        {services[primaryCalledTicket.serviceId]?.name || 'Unknown Service'}
                      </p>
                      {primaryCalledTicket.currentStageId && stages[primaryCalledTicket.currentStageId] && (
                        <div className="flex flex-col items-center justify-center gap-1.5 mt-2">
                          <span className="px-3 py-1 bg-brand-500/10 border border-brand-500/30 text-brand-400 font-extrabold text-sm uppercase rounded-xl tracking-wider">
                            {i18n.language === 'th' ? 'บริการย่อย: ' : 'Sub-service: '}{stages[primaryCalledTicket.currentStageId].name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 px-8 py-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl text-lg sm:text-xl text-emerald-400 font-black shadow-inner flex items-center gap-2">
                    <span className="w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                    {t('pages.tvDisplay.proceedToCounter', { counter: primaryCalledTicket.calledByCounter || '1' })}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/20 border border-slate-800/80 rounded-3xl p-10 flex flex-col justify-center items-center text-center shadow-xl min-h-[480px]">
                  <div className="p-5 bg-slate-950 border border-slate-850 rounded-2xl mb-4 text-slate-655">
                    <Inbox className="w-12 h-12" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-355">
                    {i18n.language === 'th' ? 'ไม่มีคิวเรียกในขณะนี้' : 'No Active Calls'}
                  </h3>
                </div>
              )}
            </div>
          </section>

          {/* Right Column: Waiting List */}
          <section className="lg:col-span-5 bg-slate-900/20 border border-slate-800/80 rounded-3xl p-6 flex flex-col shadow-xl">
            <div className="pb-4 border-b border-slate-805 flex items-center justify-between mb-5">
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
              <div className="flex-grow flex flex-col justify-center items-center text-slate-500 py-16">
                <Inbox className="w-10 h-10 text-slate-700 mb-2" />
                <p className="text-xs font-bold">{i18n.language === 'th' ? 'ไม่มีคิวรอรับบริการ' : 'No Waiting Tickets'}</p>
              </div>
            ) : (
              <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-[500px] pr-1">
                {waitingTickets.map((ticket, index) => (
                  <div 
                    key={ticket.id} 
                    className={`p-4 rounded-2xl flex items-center justify-between bg-slate-900/60 border border-slate-850 shadow-sm ${
                      index === 0 ? 'border-brand-500/20 ring-1 ring-brand-500/10' : ''
                    }`}
                  >
                    <div>
                      <h4 className="text-xl font-black text-white">{ticket.queueNumber}</h4>
                      <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider truncate max-w-[130px] mt-0.5">
                        {services[ticket.serviceId]?.name || 'Service'}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('pages.queues.statusWaiting')}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      );
    }

    // 2. Split Screen Layout (60/40)
    if (layout === 'split-media') {
      const qPos = activeTemplate?.queuePosition || 'right';
      return (
        <div className="flex-grow p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch overflow-hidden">
          {qPos === 'left' ? (
            <>
              {renderQueuePanel('lg:col-span-5')}
              <section className="lg:col-span-7 rounded-3xl overflow-hidden relative shadow-2xl">
                {renderMediaPlayer()}
              </section>
            </>
          ) : (
            <>
              <section className="lg:col-span-7 rounded-3xl overflow-hidden relative shadow-2xl">
                {renderMediaPlayer()}
              </section>
              {renderQueuePanel('lg:col-span-5')}
            </>
          )}
        </div>
      );
    }

    // 3. Fullscreen Media Layout with Scrolling Ticker
    if (layout === 'fullscreen-media-with-ticker') {
      return (
        <div className="flex-grow p-8 overflow-hidden relative flex flex-col justify-center items-center">
          <div className="w-full h-full rounded-3xl overflow-hidden shadow-2xl relative">
            {renderMediaPlayer()}

            {/* 5-second High-Contrast ticket calling overlay */}
            {isFlashing && primaryCalledTicket && (
              <div className="absolute inset-0 bg-slate-950/95 z-40 flex flex-col items-center justify-center text-center animate-in fade-in duration-300">
                <div className="max-w-xl w-full p-8 bg-slate-900/90 border border-brand-500 rounded-3xl shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
                  <span className="text-xs font-black text-brand-450 uppercase tracking-widest bg-brand-500/10 border border-brand-500/20 px-4 py-1.5 rounded-full">
                    {t('pages.tvDisplay.nowCallingLabel')}
                  </span>
                  <h1 className="text-[96px] font-black text-white leading-none tracking-tighter my-2 drop-shadow-[0_4px_12px_rgba(255,255,255,0.05)]">
                    {primaryCalledTicket.queueNumber}
                  </h1>
                  <p className="text-xl text-slate-350 font-bold tracking-tight animate-pulse">
                    {services[primaryCalledTicket.serviceId]?.name || 'Unknown Service'}
                  </p>
                  <div className="px-6 py-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-lg text-emerald-400 font-black flex items-center justify-center gap-2">
                    <span className="w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                    {t('pages.tvDisplay.proceedToCounter', { counter: primaryCalledTicket.calledByCounter || '1' })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

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

      {/* Main Render Section */}
      {renderLayout()}

      {/* Bottom Footer Ticker */}
      <footer className="bg-slate-900 border-t border-slate-800/80 px-8 py-4.5 flex items-center justify-between text-slate-450 text-xs font-semibold relative z-10">
        <div className="flex-1 overflow-hidden flex items-center gap-4">
          <span className="px-2 py-0.5 bg-brand-600/20 text-brand-450 border border-brand-600/30 text-[10px] font-extrabold uppercase rounded-lg tracking-wider whitespace-nowrap">
            INFO
          </span>
          <div className="flex-1 relative w-full overflow-hidden h-5">
            {/* Smooth marquee ticker effect */}
            <p className="absolute whitespace-nowrap animate-marquee">
              {marqueeContent}
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

export default DisplayPage;
