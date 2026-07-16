import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot, query, collection, where, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Branch, Service, TicketLayoutElement } from '@/types/firestore';

const DEFAULT_TICKET_LAYOUT: TicketLayoutElement[] = [
  { id: 'logo', type: 'logo', visible: true, fontSize: 'sm', align: 'center' },
  { id: 'branchName', type: 'branchName', visible: true, fontSize: 'sm', bold: true, align: 'center' },
  { id: 'serviceName', type: 'serviceName', visible: true, fontSize: 'xs', bold: true, align: 'center' },
  { id: 'queueNumber', type: 'queueNumber', visible: true, fontSize: 'xl', bold: true, align: 'center' },
  { id: 'customerName', type: 'customerName', text: 'Name: ', visible: true, fontSize: 'xs', align: 'center' },
  { id: 'dateTime', type: 'dateTime', visible: true, fontSize: 'xs', align: 'center' },
  { id: 'footerText', type: 'text', text: 'Thank you for your visit!', visible: true, fontSize: 'xs', align: 'center' },
];

const getFontSizeStyle = (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => {
  switch (size) {
    case 'xs': return { fontSize: '10px' };
    case 'sm': return { fontSize: '12px' };
    case 'md': return { fontSize: '14px', fontWeight: 600 };
    case 'lg': return { fontSize: '18px', fontWeight: 700 };
    case 'xl': return { fontSize: '28px', fontWeight: 800 };
    default: return { fontSize: '12px' };
  }
};

const getAlignStyle = (align?: 'left' | 'center' | 'right') => {
  return { textAlign: align || 'center' };
};
import { createQueueItem } from '../repository/queueRepository';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { useTranslation } from 'react-i18next';
import {
  Loader2,
  AlertCircle,
  Printer,
  ArrowLeft,
  Globe,
  CheckCircle,
  HelpCircle,
  Building,
  Edit2,
  Save,
  RotateCcw,
  GripVertical,
  Move
} from 'lucide-react';

export const KioskPage: React.FC = () => {
  const { branchId } = useParams<{ branchId: string }>();
  const { user } = useAuth();
  const { subscription } = useTenant();
  const { t, i18n } = useTranslation();

  const isOwner = user?.role === 'owner';
  const isNotFree = subscription?.planId && subscription.planId !== 'starter';
  const canEditLayout = isOwner && isNotFree;

  const selectedLang = (i18n.language?.startsWith('th') ? 'th' : 'en') as 'en' | 'th';

  const translate = (key: string, param?: string | number) => {
    return t(`kiosk.${key}`, { param });
  };

  // Branch & Services states
  const [branch, setBranch] = useState<Branch | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Layout customizer states
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [customLayout, setCustomLayout] = useState<{ id: string; x: number; y: number; w: number; h: number }[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeResizeId, setActiveResizeId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ mouseX: number; mouseY: number; x: number; y: number } | null>(null);
  const [resizeStart, setResizeStart] = useState<{ mouseX: number; mouseY: number; w: number; h: number } | null>(null);

  // Ticketing states
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Success Modal states
  const [createdTicket, setCreatedTicket] = useState<{ id: string; queueNumber: string } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Timer states
  const [idleCountdown, setIdleCountdown] = useState(30);
  const [keyboardLanguage, setKeyboardLanguage] = useState<'en' | 'th'>(
    (i18n.language?.startsWith('th') ? 'th' : 'en') as 'en' | 'th'
  );

  // Idle timeout limit
  const timeoutLimit = branch?.kioskSettings?.idleTimeoutSeconds || 30;

  // 1. Fetch branch and active services
  useEffect(() => {
    if (!branchId) return;

    setLoading(true);
    const branchRef = doc(db, 'branches', branchId);

    const unsubBranch = onSnapshot(
      branchRef,
      (snap) => {
        if (snap.exists() && snap.data().status === 'active') {
          const data = snap.data();
          setBranch({ id: snap.id, ...data } as Branch);
          if (data.kioskSettings?.customLayout) {
            setCustomLayout(data.kioskSettings.customLayout);
          }
        } else {
          setBranch(null);
          setError('Branch not found or inactive');
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching branch:', err);
        setError('Failed to load branch details');
        setLoading(false);
      }
    );

    const servicesQuery = query(
      collection(db, 'services'),
      where('branchId', '==', branchId),
      where('isActive', '==', true)
    );

    const unsubServices = onSnapshot(
      servicesQuery,
      (snap) => {
        const list: Service[] = [];
        snap.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Service);
        });
        setServices(list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
      },
      (err) => {
        console.error('Error fetching services:', err);
      }
    );

    return () => {
      unsubBranch();
      unsubServices();
    };
  }, [branchId]);

  // 2. Idle timeout auto-reset logic
  useEffect(() => {
    if (!showKeyboard && !showSuccessModal) {
      return;
    }
    setIdleCountdown(timeoutLimit);
    const interval = setInterval(() => {
      setIdleCountdown((prev) => {
        if (prev <= 1) {
          handleReset();
          return timeoutLimit;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showKeyboard, showSuccessModal, timeoutLimit]);

  const resetInactivityTimer = () => {
    setIdleCountdown(timeoutLimit);
  };

  const handleReset = () => {
    setSelectedService(null);
    setShowKeyboard(false);
    setCustomerName('');
    setCreatedTicket(null);
    setShowSuccessModal(false);
    setIdleCountdown(timeoutLimit);
  };

  // 3. Filter and sort services allowed on Kiosk based on allowedServiceIds order
  const allowedServiceIds = branch?.kioskSettings?.allowedServiceIds || [];
  const kioskServices = services
    .filter((s) => allowedServiceIds.length === 0 || allowedServiceIds.includes(s.id))
    .sort((a, b) => {
      if (allowedServiceIds.length === 0) return 0;
      const indexA = allowedServiceIds.indexOf(a.id);
      const indexB = allowedServiceIds.indexOf(b.id);
      return indexA - indexB;
    });

  // 3.5 Kiosk Grid Layout Helpers and Mouse/Touch Handlers
  const getLayoutItems = () => {
    const items = [
      ...kioskServices.map((s) => ({ id: `service-${s.id}`, type: 'service' as const, data: s })),
      { id: 'qr-code', type: 'qr' as const, data: null },
      { id: 'language-select', type: 'language' as const, data: null }
    ];

    let currentX = 0;
    let currentY = 0;

    return items.map((item) => {
      const saved = customLayout.find((l) => l.id === item.id);
      if (saved) {
        return { ...item, layout: saved };
      }

      // Default values
      const w = item.type === 'qr' ? 4 : item.type === 'language' ? 4 : 4;
      const h = item.type === 'qr' ? 3 : item.type === 'language' ? 2 : 2;
      const x = currentX;
      const y = currentY;

      currentX += 4;
      if (currentX >= 12) {
        currentX = 0;
        currentY += 2;
      }

      return {
        ...item,
        layout: { id: item.id, x, y, w, h }
      };
    });
  };

  const handleDragStart = (e: React.MouseEvent, id: string, initialX: number, initialY: number) => {
    e.preventDefault();
    setActiveDragId(id);
    setDragStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      x: initialX,
      y: initialY
    });
  };

  const handleTouchDragStart = (e: React.TouchEvent, id: string, initialX: number, initialY: number) => {
    const touch = e.touches[0];
    setActiveDragId(id);
    setDragStart({
      mouseX: touch.clientX,
      mouseY: touch.clientY,
      x: initialX,
      y: initialY
    });
  };

  const handleResizeStart = (e: React.MouseEvent, id: string, initialW: number, initialH: number) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveResizeId(id);
    setResizeStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      w: initialW,
      h: initialH
    });
  };

  const handleTouchResizeStart = (e: React.TouchEvent, id: string, initialW: number, initialH: number) => {
    e.stopPropagation();
    const touch = e.touches[0];
    setActiveResizeId(id);
    setResizeStart({
      mouseX: touch.clientX,
      mouseY: touch.clientY,
      w: initialW,
      h: initialH
    });
  };

  // Mouse drag & resize listener
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const colWidthPx = window.innerWidth * 0.85 / 12;
      const rowHeightPx = 130;

      if (activeDragId && dragStart) {
        const dx = Math.round((e.clientX - dragStart.mouseX) / colWidthPx);
        const dy = Math.round((e.clientY - dragStart.mouseY) / rowHeightPx);

        setCustomLayout((prev) => {
          const currentItem = getLayoutItems().find(item => item.id === activeDragId);
          const w = currentItem?.layout.w || 4;
          const h = currentItem?.layout.h || 2;
          const newX = Math.max(0, Math.min(12 - w, dragStart.x + dx));
          const newY = Math.max(0, dragStart.y + dy);

          const filtered = prev.filter((l) => l.id !== activeDragId);
          return [...filtered, { id: activeDragId, x: newX, y: newY, w, h }];
        });
      }

      if (activeResizeId && resizeStart) {
        const dw = Math.round((e.clientX - resizeStart.mouseX) / colWidthPx);
        const dh = Math.round((e.clientY - resizeStart.mouseY) / rowHeightPx);

        setCustomLayout((prev) => {
          const currentItem = getLayoutItems().find(item => item.id === activeResizeId);
          const x = currentItem?.layout.x || 0;
          const y = currentItem?.layout.y || 0;
          const newW = Math.max(2, Math.min(12 - x, resizeStart.w + dw));
          const newH = Math.max(1, resizeStart.h + dh);

          const filtered = prev.filter((l) => l.id !== activeResizeId);
          return [...filtered, { id: activeResizeId, x, y, w: newW, h: newH }];
        });
      }
    };

    const handleGlobalMouseUp = () => {
      setActiveDragId(null);
      setActiveResizeId(null);
      setDragStart(null);
      setResizeStart(null);
    };

    if (activeDragId || activeResizeId) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [activeDragId, activeResizeId, dragStart, resizeStart, customLayout]);

  // Touch drag & resize listener
  useEffect(() => {
    const handleGlobalTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const colWidthPx = window.innerWidth * 0.85 / 12;
      const rowHeightPx = 130;

      if (activeDragId && dragStart) {
        const dx = Math.round((touch.clientX - dragStart.mouseX) / colWidthPx);
        const dy = Math.round((touch.clientY - dragStart.mouseY) / rowHeightPx);

        setCustomLayout((prev) => {
          const currentItem = getLayoutItems().find(item => item.id === activeDragId);
          const w = currentItem?.layout.w || 4;
          const h = currentItem?.layout.h || 2;
          const newX = Math.max(0, Math.min(12 - w, dragStart.x + dx));
          const newY = Math.max(0, dragStart.y + dy);

          const filtered = prev.filter((l) => l.id !== activeDragId);
          return [...filtered, { id: activeDragId, x: newX, y: newY, w, h }];
        });
      }

      if (activeResizeId && resizeStart) {
        const dw = Math.round((touch.clientX - resizeStart.mouseX) / colWidthPx);
        const dh = Math.round((touch.clientY - resizeStart.mouseY) / rowHeightPx);

        setCustomLayout((prev) => {
          const currentItem = getLayoutItems().find(item => item.id === activeResizeId);
          const x = currentItem?.layout.x || 0;
          const y = currentItem?.layout.y || 0;
          const newW = Math.max(2, Math.min(12 - x, resizeStart.w + dw));
          const newH = Math.max(1, resizeStart.h + dh);

          const filtered = prev.filter((l) => l.id !== activeResizeId);
          return [...filtered, { id: activeResizeId, x, y, w: newW, h: newH }];
        });
      }
    };

    const handleGlobalTouchEnd = () => {
      setActiveDragId(null);
      setActiveResizeId(null);
      setDragStart(null);
      setResizeStart(null);
    };

    if (activeDragId || activeResizeId) {
      window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      window.addEventListener('touchend', handleGlobalTouchEnd);
    }

    return () => {
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [activeDragId, activeResizeId, dragStart, resizeStart, customLayout]);

  const handleSaveLayout = async () => {
    if (!branchId) return;
    try {
      const branchRef = doc(db, 'branches', branchId);
      const currentItemIds = getLayoutItems().map(item => item.id);
      const filteredLayout = customLayout.filter(l => currentItemIds.includes(l.id));

      await updateDoc(branchRef, {
        'kioskSettings.customLayout': filteredLayout
      });
      setIsEditingLayout(false);
    } catch (err) {
      console.error('Failed to save kiosk layout:', err);
    }
  };

  const handleResetLayout = () => {
    setCustomLayout([]);
  };

  // 4. Color theme mapper
  const themeColor = branch?.kioskSettings?.themeColor || 'brand';
  const theme = {
    brand: {
      bg: 'bg-brand-600',
      bgHover: 'hover:bg-brand-700',
      text: 'text-brand-600',
      border: 'border-brand-500/25',
      accent: 'bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-400',
      gradient: 'from-brand-600 to-indigo-600',
      ring: 'focus:ring-brand-500',
      buttonBg: 'bg-brand-600 hover:bg-brand-700',
    },
    blue: {
      bg: 'bg-blue-600',
      bgHover: 'hover:bg-blue-700',
      text: 'text-blue-600',
      border: 'border-blue-500/25',
      accent: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
      gradient: 'from-blue-600 to-sky-600',
      ring: 'focus:ring-blue-500',
      buttonBg: 'bg-blue-600 hover:bg-blue-700',
    },
    emerald: {
      bg: 'bg-emerald-600',
      bgHover: 'hover:bg-emerald-700',
      text: 'text-emerald-600',
      border: 'border-emerald-500/25',
      accent: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
      gradient: 'from-emerald-600 to-teal-600',
      ring: 'focus:ring-emerald-500',
      buttonBg: 'bg-emerald-600 hover:bg-emerald-700',
    },
    violet: {
      bg: 'bg-violet-600',
      bgHover: 'hover:bg-violet-700',
      text: 'text-violet-600',
      border: 'border-violet-500/25',
      accent: 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400',
      gradient: 'from-violet-600 to-fuchsia-600',
      ring: 'focus:ring-violet-500',
      buttonBg: 'bg-violet-600 hover:bg-violet-700',
    },
    amber: {
      bg: 'bg-amber-600',
      bgHover: 'hover:bg-amber-700',
      text: 'text-amber-600',
      border: 'border-amber-500/25',
      accent: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
      gradient: 'from-amber-600 to-orange-600',
      ring: 'focus:ring-amber-500',
      buttonBg: 'bg-amber-600 hover:bg-amber-700',
    }
  }[themeColor];

  // 5. Booking ticket triggers
  const handleSelectService = async (service: Service) => {
    setSelectedService(service);
    if (service.requireName) {
      setCustomerName('');
      setShowKeyboard(true);
    } else {
      await handleBookTicket(service, translate('guestWalkIn'));
    }
  };

  const handleBookTicket = async (service: Service, nameVal: string) => {
    if (!branchId) return;
    setSubmitting(true);

    try {
      const result = await createQueueItem(branchId, service.id, {
        name: nameVal.trim() || translate('guestWalkIn'),
        priorityLevel: 1,
      });
      setCreatedTicket(result);
      setShowSuccessModal(true);
      setShowKeyboard(false);

      // Trigger auto-print
      setTimeout(() => {
        window.print();
      }, 500);
    } catch (err) {
      console.error('Failed to book ticket via Kiosk:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // 6. Virtual Keyboard Logic
  const handleKeyPress = (char: string) => {
    resetInactivityTimer();
    if (customerName.length < 32) {
      setCustomerName((prev) => prev + char);
    }
  };

  const handleBackspace = () => {
    resetInactivityTimer();
    setCustomerName((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    resetInactivityTimer();
    setCustomerName('');
  };

  // Virtual Keyboard layouts
  const kbLayout = {
    en: [
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
    ],
    th: [
      ['ภ', 'ถ', 'ุ', 'ึ', 'ค', 'ต', 'จ', 'ข', 'ช'],
      ['ๆ', 'ไ', 'ำ', 'พ', 'ะ', 'ร', 'น', 'ย', 'บ', 'ล'],
      ['ฟ', 'ห', 'ก', 'ด', 'เ', '้', '่', 'า', 'ส', 'ว'],
      ['ผ', 'ป', 'แ', 'อ', 'ิ', 'ี', 'ม', 'ใ', 'ฝ']
    ]
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center h-full">
        <Loader2 className="w-12 h-12 text-brand-600 animate-spin" />
        <p className="mt-4 text-sm text-slate-500 font-medium">Loading kiosk terminal...</p>
      </div>
    );
  }

  if (error || !branch) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center h-full p-4">
        <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-950/30 p-8 rounded-3xl text-center max-w-md shadow-2xl">
          <AlertCircle className="w-16 h-16 text-danger mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {error || 'Terminal Unregistered'}
          </h3>
          <p className="text-sm text-slate-550 dark:text-slate-400">
            Please make sure this device has a valid branch parameter and database permissions.
          </p>
        </div>
      </div>
    );
  }

  const layoutItems = getLayoutItems();
  const maxH = layoutItems.reduce((max, item) => Math.max(max, item.layout.y + item.layout.h), 0);
  const containerHeight = Math.max(480, maxH * 130);

  return (
    <div className="flex-1 flex flex-col justify-between h-full select-none" onClick={resetInactivityTimer}>
      {/* Top Header */}
      <header className="flex justify-between items-center pb-6 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-500 flex items-center justify-center shadow-lg border border-brand-400/20 overflow-hidden">
            {branch?.kioskSettings?.showLogo && branch.qrCodeUrl ? (
              <img src={branch.qrCodeUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Building className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {branch.name}
            </h2>
            <span className="text-[10px] text-slate-500 dark:text-slate-450 uppercase tracking-widest font-extrabold">
              {translate('kioskSubtitle')}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <span className="text-xs bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700/60 font-bold uppercase tracking-wider">
            Branch Code: {branch.code}
          </span>

          {canEditLayout && (
            <div className="flex items-center space-x-2 border-l border-slate-200 dark:border-slate-800 pl-3 py-1">
              {!isEditingLayout ? (
                <button
                  onClick={() => setIsEditingLayout(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/20 dark:hover:bg-brand-950/30 text-brand-655 dark:text-brand-400 font-extrabold text-[11px] rounded-full border border-brand-500/20 transition-all cursor-pointer uppercase tracking-wider"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Layout</span>
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSaveLayout}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-full shadow-md shadow-emerald-600/10 transition-all cursor-pointer uppercase tracking-wider animate-pulse"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Layout</span>
                  </button>
                  <button
                    onClick={handleResetLayout}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-455 font-extrabold text-[11px] rounded-full border border-rose-500/25 transition-all cursor-pointer uppercase tracking-wider"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Grid</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingLayout(false);
                      if (branch?.kioskSettings?.customLayout) {
                        setCustomLayout(branch.kioskSettings.customLayout);
                      } else {
                        setCustomLayout([]);
                      }
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 font-extrabold text-[11px] rounded-full transition-all cursor-pointer uppercase tracking-wider"
                  >
                    <span>Cancel</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Grid View */}
      {!showKeyboard && !showSuccessModal && (
        <main className="flex-1 flex flex-col justify-center my-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {translate('selectService')}
            </h1>
            <p className="text-sm text-slate-550 dark:text-slate-400 mt-2 font-medium">
              {translate('selectServiceSub')}
            </p>
          </div>

          <div className="relative w-full overflow-x-hidden" style={{ height: `${containerHeight}px` }}>
            {layoutItems.map((item) => {
              const isQr = item.type === 'qr';
              const isLanguage = item.type === 'language';

              return (
                <div key={item.id} style={{
                  position: 'absolute',
                  left: `${(item.layout.x / 12) * 100}%`,
                  top: `${item.layout.y * 130}px`,
                  width: `${(item.layout.w / 12) * 100}%`,
                  height: `${item.layout.h * 130}px`,
                  padding: '8px',
                  transition: activeDragId || activeResizeId ? 'none' : 'all 0.15s ease-out',
                  zIndex: activeDragId === item.id || activeResizeId === item.id ? 50 : 10,
                }}>
                  {/* Outer container card wrapper to allow drag header overlays */}
                  <div className="relative w-full h-full group">

                    {/* Drag Header overlay when editing */}
                    {isEditingLayout && (
                      <>
                        <div
                          onMouseDown={(e) => handleDragStart(e, item.id, item.layout.x, item.layout.y)}
                          onTouchStart={(e) => handleTouchDragStart(e, item.id, item.layout.x, item.layout.y)}
                          className="absolute top-2 left-2 right-2 h-7 bg-slate-800/90 hover:bg-slate-800 text-white rounded-lg flex items-center justify-between px-2.5 cursor-move z-30 select-none text-[9px] font-extrabold uppercase tracking-wider shadow-md"
                        >
                          <div className="flex items-center gap-1">
                            <GripVertical className="w-3 h-3 text-slate-400" />
                            <span>Move Widget</span>
                          </div>
                          <span>Grid: {item.layout.x},{item.layout.y} ({item.layout.w}x{item.layout.h})</span>
                        </div>

                        {/* Resize handle overlay */}
                        <div
                          onMouseDown={(e) => handleResizeStart(e, item.id, item.layout.w, item.layout.h)}
                          onTouchStart={(e) => handleTouchResizeStart(e, item.id, item.layout.w, item.layout.h)}
                          className="absolute bottom-2 right-2 w-5.5 h-5.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg flex items-center justify-center cursor-se-resize z-30 shadow-md border border-brand-500/20 active:scale-95"
                          title="Resize"
                        >
                          <Move className="w-3 h-3 rotate-45" />
                        </div>
                      </>
                    )}

                    {/* Widget Content */}
                    {isLanguage ? (
                      <div className="w-full h-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] p-5 shadow-md flex flex-col items-center justify-center space-y-3.5 overflow-hidden select-none">
                        <div className="text-center min-h-0 shrink">
                          <h3 className="text-xs font-bold text-slate-450 dark:text-slate-500 tracking-wider leading-none uppercase">
                            {translate('languageTitle')}
                          </h3>
                        </div>

                        {/* Language Selection Buttons */}
                        <div className="flex w-full gap-2">
                          <button
                            type="button"
                            disabled={isEditingLayout}
                            onClick={() => {
                              setKeyboardLanguage('th');
                              i18n.changeLanguage('th');
                            }}
                            className={`flex-1 py-2.5 px-2 rounded-2xl font-black text-sm transition-all border-2 cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${selectedLang === 'th'
                              ? `${theme.border} bg-brand-50/20 dark:bg-brand-950/10 text-brand-655 dark:text-brand-400 font-extrabold`
                              : 'border-slate-150 dark:border-slate-800 text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-850 bg-white dark:bg-slate-900'
                              }`}
                          >
                            <span className="text-lg">🇹🇭</span>
                            <span>ไทย</span>
                          </button>
                          <button
                            type="button"
                            disabled={isEditingLayout}
                            onClick={() => {
                              setKeyboardLanguage('en');
                              i18n.changeLanguage('en');
                            }}
                            className={`flex-1 py-2.5 px-2 rounded-2xl font-black text-sm transition-all border-2 cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${selectedLang === 'en'
                              ? `${theme.border} bg-brand-50/20 dark:bg-brand-950/10 text-brand-655 dark:text-brand-400 font-extrabold`
                              : 'border-slate-150 dark:border-slate-800 text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-850 bg-white dark:bg-slate-900'
                              }`}
                          >
                            <span className="text-lg">🇬🇧</span>
                            <span>EN</span>
                          </button>
                        </div>
                      </div>
                    ) : isQr ? (
                      <div className="w-full h-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] p-2 shadow-md text-center flex flex-col items-center justify-center space-y-3 overflow-hidden select-none">
                        <div className="min-h-0 shrink">
                          <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                            {translate('scanJoin')}
                          </h3>
                          {item.layout.h >= 3 && (
                            <p className="text-[10px] font-bold text-slate-555 dark:text-slate-455 mt-0.5 uppercase tracking-wider">
                              {translate('scanJoinSub')}
                            </p>
                          )}
                        </div>

                        {/* QR Container */}
                        <div className="p-2.5 bg-white border border-slate-100 rounded-2xl shadow-inner flex items-center justify-center shrink-0">
                          <QRCodeSVG
                            value={`${window.location.origin}/join/${branchId}`}
                            size={Math.min(160, Math.max(70, item.layout.h * 110 - 130))}
                            level="M"
                            includeMargin={false}
                          />
                        </div>

                        {item.layout.h >= 3 && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 max-w-[240px] leading-snug truncate-3-lines">
                            {translate('skipPaper')}
                            <p className="mt-0.5 font-bold text-slate-450">{translate('scanStatus')}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        disabled={isEditingLayout}
                        onClick={() => handleSelectService(item.data as Service)}
                        className={`w-full h-full flex flex-col items-center justify-between p-6 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] text-center transition-all duration-200 group relative shadow-sm overflow-hidden select-none ${isEditingLayout
                          ? 'opacity-80 cursor-default'
                          : 'hover:-translate-y-1 hover:shadow-xl hover:border-brand-500/30 active:scale-[0.98] cursor-pointer'
                          }`}
                      >
                        <div className={`p-3 rounded-2xl ${theme.accent} mb-2`}>
                          <HelpCircle className="w-7 h-7" />
                        </div>
                        <div className="flex-1 flex flex-col justify-center min-h-0">
                          <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight leading-snug group-hover:text-brand-600 transition-colors">
                            {item.data?.name}
                          </h3>
                          {item.layout.h >= 2 && item.data?.description && (
                            <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-1 line-clamp-2 max-w-[200px] mx-auto leading-relaxed">
                              {item.data.description}
                            </p>
                          )}
                        </div>

                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-455 mt-2 block">
                          {item.data?.estimatedDurationMinutes} {translate('minsEst')}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* Virtual Keyboard Mode */}
      {showKeyboard && selectedService && (
        <main className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full my-6">
          {/* Back button */}
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6 uppercase tracking-wider cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{translate('backToServices')}</span>
          </button>

          {/* Form Banner */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              {translate('enterName')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-450 mt-1 font-semibold uppercase tracking-wider">
              {translate('serviceOptional', selectedService.name)}
            </p>
          </div>

          {/* Custom Input Display */}
          <div className="relative mb-6">
            <input
              type="text"
              readOnly
              value={customerName}
              placeholder={translate('guestPlaceholder')}
              className="w-full text-center py-4 px-6 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl text-xl font-bold text-slate-900 dark:text-white outline-none shadow-md"
            />
            {customerName && (
              <button
                onClick={handleClear}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-red-500 hover:underline uppercase tracking-wider px-3 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-955/25 cursor-pointer"
              >
                {translate('clear')}
              </button>
            )}
          </div>

          {/* Keyboard Container */}
          <div className="bg-slate-150/65 dark:bg-slate-900/50 border border-slate-250 dark:border-slate-800 rounded-[32px] p-5 space-y-2.5 shadow-lg select-none">
            {kbLayout[keyboardLanguage].map((row, rIdx) => (
              <div key={rIdx} className="flex justify-center gap-1.5">
                {row.map((char) => (
                  <button
                    key={char}
                    onClick={() => handleKeyPress(char)}
                    className="flex-1 max-w-[64px] h-12 bg-white dark:bg-slate-800 text-sm font-bold text-slate-850 dark:text-white rounded-xl shadow-sm border border-slate-200/55 dark:border-slate-700/60 active:bg-slate-200 dark:active:bg-slate-700 transition-colors select-none cursor-pointer"
                  >
                    {char}
                  </button>
                ))}
              </div>
            ))}

            {/* Bottom Keyboard Row (Actions) */}
            <div className="flex justify-center gap-2 pt-1">
              <button
                onClick={() => setKeyboardLanguage((lang) => (lang === 'en' ? 'th' : 'en'))}
                className="w-28 h-12 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-white font-bold text-xs rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm flex items-center justify-center gap-1 cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{keyboardLanguage === 'en' ? 'ไทย' : 'English'}</span>
              </button>

              <button
                onClick={() => handleKeyPress(' ')}
                className="flex-1 h-12 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-350 font-bold text-xs rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                {translate('space')}
              </button>

              <button
                onClick={handleBackspace}
                className="w-24 h-12 bg-amber-50 dark:bg-amber-955/25 text-amber-600 dark:text-amber-400 font-bold text-xs rounded-xl border border-amber-250 dark:border-amber-900 shadow-sm cursor-pointer"
              >
                {translate('backspace')}
              </button>

              <button
                onClick={() => handleBookTicket(selectedService, customerName || translate('guestWalkIn'))}
                disabled={submitting}
                className={`w-40 h-12 ${theme.bg} hover:bg-opacity-90 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer`}
              >
                {submitting ? translate('confirming') : translate('confirmTicket')}
              </button>
            </div>
          </div>

          {/* Idle notice */}
          <div className="text-center mt-4">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800/60 px-3 py-1 rounded-full">
              {translate('autoReset', idleCountdown)}
            </span>
          </div>
        </main>
      )}

      {/* Ticket Booking Confirmation Modal */}
      {showSuccessModal && createdTicket && selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-[32px] p-8 max-w-md w-full shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200 select-none">

            <div className="flex flex-col items-center">
              <CheckCircle className="w-14 h-14 text-emerald-500 mb-2" />
              <h2 className="text-xl font-black text-slate-950 dark:text-white">{translate('ticketPrinted')}</h2>
              <p className="text-xs text-slate-500">{translate('takeTicket')}</p>
            </div>

            {/* Virtual Slip Card */}
            <div className="border border-dashed border-slate-250 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl p-6 relative overflow-hidden text-slate-900 dark:text-white">
              <span className="text-[9px] font-mono tracking-widest text-slate-400 dark:text-slate-500 uppercase block border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
                {branch.name}
              </span>

              <span className="text-[11px] font-bold text-slate-655 dark:text-brand-400 block mb-1">
                {selectedService.name}
              </span>

              <h1 className="text-5xl font-black tracking-wider text-slate-950 dark:text-white font-mono my-2 animate-pulse">
                {createdTicket.queueNumber}
              </h1>

              <div className="grid grid-cols-2 gap-2 text-left pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] font-medium text-slate-500">
                <div>
                  <span>{translate('date')}: {new Date().toLocaleDateString(selectedLang === 'th' ? 'th-TH' : 'en-US')}</span>
                </div>
                <div className="text-right">
                  <span>{translate('time')}: {new Date().toLocaleTimeString(selectedLang === 'th' ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>

            {/* Inactivity reset notice */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center justify-center gap-2 w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-white border border-slate-250 dark:border-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer"
              >
                <Printer className="w-4.5 h-4.5" />
                <span>{translate('reprintTicket')}</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className={`w-full py-3 ${theme.bg} text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer`}
              >
                {translate('finish', idleCountdown)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Branding */}
      <footer className="text-center border-t border-slate-100 dark:border-slate-800/80 pt-6 text-[10px] font-mono tracking-widest text-slate-400 uppercase select-none">
        Powered by ServiceOS
      </footer>

      {/* Hidden Thermal Slip for Printing */}
      {createdTicket && selectedService && (
        <div
          id="kiosk-print-slip"
          className="hidden text-slate-900 text-center font-mono text-xs p-4 bg-white"
          style={{ width: branch?.kioskSettings?.pageSize || '80mm' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
            {(branch?.kioskSettings?.ticketLayout || DEFAULT_TICKET_LAYOUT)
              .filter((el) => el.visible)
              .map((el) => {
                const alignStyle = getAlignStyle(el.align);
                const sizeStyle = getFontSizeStyle(el.fontSize);
                const boldStyle = el.bold ? { fontWeight: 'bold' } : {};
                const combinedStyle = { ...alignStyle, ...sizeStyle, ...boldStyle };

                switch (el.type) {
                  case 'logo':
                    return (
                      <div
                        key={el.id}
                        style={{ display: 'flex', justifyContent: el.align === 'left' ? 'flex-start' : el.align === 'right' ? 'flex-end' : 'center', margin: '4px 0' }}
                      >
                        <div style={{ width: '36px', height: '36px', border: '1.5px solid #000', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '9px' }}>
                          LOGO
                        </div>
                      </div>
                    );
                  case 'branchName':
                    return (
                      <div key={el.id} style={combinedStyle}>
                        {branch.name}
                      </div>
                    );
                  case 'serviceName':
                    return (
                      <div key={el.id} style={combinedStyle}>
                        {selectedService.name}
                      </div>
                    );
                  case 'queueNumber':
                    return (
                      <div key={el.id} style={{ ...combinedStyle, margin: '6px 0', lineHeight: 1.1 }}>
                        {createdTicket.queueNumber}
                      </div>
                    );
                  case 'customerName':
                    return (
                      <div key={el.id} style={combinedStyle}>
                        {el.text || (selectedLang === 'th' ? 'ชื่อ: ' : 'Name: ')}{customerName || translate('guestWalkIn')}
                      </div>
                    );
                  case 'dateTime':
                    return (
                      <div key={el.id} style={combinedStyle}>
                        {new Date().toLocaleDateString(selectedLang === 'th' ? 'th-TH' : 'en-US')} {new Date().toLocaleTimeString(selectedLang === 'th' ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    );
                  case 'text':
                  default:
                    return (
                      <div key={el.id} style={combinedStyle}>
                        {el.text || ''}
                      </div>
                    );
                }
              })}
          </div>
        </div>
      )}

      {/* Custom print styling */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          /* Hide normal web page elements */
          body * {
            visibility: hidden !important;
          }
          /* Show ONLY our printable slip card full screen */
          #kiosk-print-slip, #kiosk-print-slip * {
            visibility: visible !important;
          }
          #kiosk-print-slip {
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: ${branch?.kioskSettings?.pageSize || '80mm'} !important;
            height: auto !important;
            padding: 10mm 5mm !important;
            border: none !important;
            box-shadow: none !important;
            background-color: white !important;
            color: black !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
          }
        }
      `}} />
    </div>
  );
};
export default KioskPage;
