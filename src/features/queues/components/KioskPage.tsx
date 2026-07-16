import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot, query, collection, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Branch, Service } from '@/types/firestore';
import { createQueueItem } from '../repository/queueRepository';
import { 
  Loader2, 
  AlertCircle, 
  Printer, 
  ArrowLeft, 
  Globe,
  CheckCircle,
  HelpCircle,
  Building
} from 'lucide-react';

export const KioskPage: React.FC = () => {
  const { branchId } = useParams<{ branchId: string }>();

  // Branch & Services states
  const [branch, setBranch] = useState<Branch | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const [keyboardLanguage, setKeyboardLanguage] = useState<'en' | 'th'>('en');

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
          setBranch({ id: snap.id, ...snap.data() } as Branch);
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

  // 3. Filter services allowed on Kiosk
  const allowedServiceIds = branch?.kioskSettings?.allowedServiceIds || [];
  const kioskServices = services.filter((s) => 
    allowedServiceIds.length === 0 || allowedServiceIds.includes(s.id)
  );

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
      await handleBookTicket(service, 'Walk-in Guest');
    }
  };

  const handleBookTicket = async (service: Service, nameVal: string) => {
    if (!branchId) return;
    setSubmitting(true);

    try {
      const result = await createQueueItem(branchId, service.id, {
        name: nameVal.trim() || 'Walk-in Guest',
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
              Kiosk Ticket Dispenser
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700/60 font-bold uppercase tracking-wider">
            Branch Code: {branch.code}
          </span>
        </div>
      </header>

      {/* Main Grid View */}
      {!showKeyboard && !showSuccessModal && (
        <main className="flex-1 flex flex-col justify-center my-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Please Select a Service
            </h1>
            <p className="text-sm text-slate-550 dark:text-slate-400 mt-2 font-medium">
              แตะเลือกบริการที่ท่านต้องการเพื่อรับบัตรคิว
            </p>
          </div>

          {kioskServices.length === 0 ? (
            <div className="text-center p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400 italic">
              No kiosk services configured. Please update settings in the dashboard.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[60vh] overflow-y-auto pr-2">
              {kioskServices.map((service) => (
                <button
                  key={service.id}
                  onClick={() => handleSelectService(service)}
                  className="flex flex-col items-center justify-between p-8 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:border-brand-500/30 group active:scale-[0.98] min-h-[190px] shadow-sm relative cursor-pointer"
                >
                  <div className={`p-4 rounded-2xl ${theme.accent} mb-4`}>
                    <HelpCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-snug group-hover:text-brand-600 transition-colors">
                      {service.name}
                    </h3>
                    {service.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 max-w-[200px] mx-auto">
                        {service.description}
                      </p>
                    )}
                  </div>

                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-450 mt-4 block">
                    {service.estimatedDurationMinutes} Mins est.
                  </span>
                </button>
              ))}
            </div>
          )}
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
            <span>Back to services</span>
          </button>

          {/* Form Banner */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Please Enter Your Name
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold uppercase tracking-wider">
              Service: {selectedService.name} (Optional)
            </p>
          </div>

          {/* Custom Input Display */}
          <div className="relative mb-6">
            <input
              type="text"
              readOnly
              value={customerName}
              placeholder="Guest Customer (แตะที่แป้นพิมพ์ด้านล่างเพื่อพิมพ์ชื่อ)"
              className="w-full text-center py-4 px-6 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl text-xl font-bold text-slate-900 dark:text-white outline-none shadow-md"
            />
            {customerName && (
              <button
                onClick={handleClear}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-red-500 hover:underline uppercase tracking-wider px-3 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-955/25 cursor-pointer"
              >
                Clear
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
                Space
              </button>

              <button
                onClick={handleBackspace}
                className="w-24 h-12 bg-amber-50 dark:bg-amber-955/25 text-amber-600 dark:text-amber-400 font-bold text-xs rounded-xl border border-amber-250 dark:border-amber-900 shadow-sm cursor-pointer"
              >
                Backspace
              </button>

              <button
                onClick={() => handleBookTicket(selectedService, customerName || 'Walk-in Guest')}
                disabled={submitting}
                className={`w-40 h-12 ${theme.bg} hover:bg-opacity-90 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer`}
              >
                {submitting ? 'Confirming...' : 'Confirm Ticket'}
              </button>
            </div>
          </div>

          {/* Idle notice */}
          <div className="text-center mt-4">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800/60 px-3 py-1 rounded-full">
              Screen will auto-reset in {idleCountdown}s
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
              <h2 className="text-xl font-black text-slate-950 dark:text-white">Ticket Printed!</h2>
              <p className="text-xs text-slate-500">โปรดหยิบบัตรคิวของท่านที่ช่องรับบัตร</p>
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
                  <span>Date: {new Date().toLocaleDateString()}</span>
                </div>
                <div className="text-right">
                  <span>Time: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
                <span>Reprint Ticket</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className={`w-full py-3 ${theme.bg} text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer`}
              >
                Finish ({idleCountdown}s)
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
        <div id="kiosk-print-slip" className="hidden text-slate-900 text-center font-mono text-xs w-[80mm] p-4 bg-white">
          <h3 className="font-bold text-sm">{branch.name}</h3>
          <p className="text-[10px]">Daily Ticket Receipt</p>
          <div className="border-t border-b border-black border-dashed my-2 py-1">
            <p className="font-bold text-xs uppercase">{selectedService.name}</p>
            <h1 className="text-4xl font-extrabold my-2">{createdTicket.queueNumber}</h1>
            <p className="text-[10px]">Name: {customerName || 'Walk-in Guest'}</p>
          </div>
          <div className="text-[9px] space-y-0.5">
            <p>Date: {new Date().toLocaleDateString()}</p>
            <p>Time: {new Date().toLocaleTimeString()}</p>
            <p className="font-bold mt-2">Thank you for your visit!</p>
          </div>
        </div>
      )}

      {/* Custom print styling */}
      <style dangerouslySetInnerHTML={{__html: `
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
            width: 80mm !important;
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
