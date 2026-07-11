import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, onSnapshot, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Branch, Service, Appointment } from '@/types/firestore';
import { createAppointment } from '../repository/appointmentRepository';
import { 
  MapPin, 
  Phone as PhoneIcon, 
  Clock, 
  User as UserIcon, 
  Mail, 
  Calendar as CalendarIcon,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { SettingsSwitcher } from '@/shared/components/SettingsSwitcher';

export const BookingPage: React.FC = () => {
  const { branchId } = useParams<{ branchId: string }>();
  const { t } = useTranslation();

  // Loading States
  const [branch, setBranch] = useState<Branch | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wizard Steps State
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(''); // YYYY-MM-DD
  const [selectedTime, setSelectedTime] = useState<string>(''); // HH:MM
  const [bookedTimes, setBookedTimes] = useState<Record<string, number>>({}); // time -> count of appointments

  // Customer Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Success Appointment Details
  const [createdId, setCreatedId] = useState<string | null>(null);

  // 1. Fetch branch and services on load
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

  // 2. Fetch booked slots when date is selected
  useEffect(() => {
    if (!branchId || !selectedService || !selectedDate) return;

    const fetchBookedSlots = async () => {
      const q = query(
        collection(db, 'appointments'),
        where('branchId', '==', branchId),
        where('serviceId', '==', selectedService.id),
        where('scheduledDate', '==', selectedDate),
        where('status', 'in', ['CONFIRMED', 'CHECKED_IN'])
      );

      try {
        const snap = await getDocs(q);
        const bookings: Record<string, number> = {};
        snap.forEach((docSnap) => {
          const appt = docSnap.data() as Appointment;
          bookings[appt.startTime] = (bookings[appt.startTime] || 0) + 1;
        });
        setBookedTimes(bookings);
      } catch (err) {
        console.error('Failed to fetch booked slots:', err);
      }
    };

    fetchBookedSlots();
  }, [branchId, selectedService, selectedDate]);

  // 3. Helper to generate next 14 calendar dates
  const getNext14Days = () => {
    const dates: { dateStr: string; label: string; dayOfWeek: string; disabled: boolean }[] = [];
    const today = new Date();

    for (let i = 0; i < 14; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);

      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const day = String(targetDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const weekdayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = weekdayNames[targetDate.getDay()];

      let disabled = false;
      if (branch?.operatingHours) {
        const hours = (branch.operatingHours as any)[dayOfWeek];
        if (!hours || !hours.isOpen) {
          disabled = true;
        }
      }

      const label = targetDate.toLocaleDateString(t('locale') === 'th' ? 'th-TH' : 'en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });

      dates.push({ dateStr, label, dayOfWeek, disabled });
    }

    return dates;
  };

  // 4. Helper to generate 30-minute intervals
  const getTimeSlots = () => {
    if (!branch || !selectedDate) return [];

    const weekdayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const parts = selectedDate.split('-');
    const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const dayOfWeek = weekdayNames[dateObj.getDay()];

    const hours = (branch.operatingHours as any)[dayOfWeek];
    if (!hours || !hours.isOpen || !hours.open || !hours.close) return [];

    const openTime = hours.open; // e.g. "09:00"
    const closeTime = hours.close; // e.g. "17:00"

    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);

    const slots: string[] = [];
    let currH = openH;
    let currM = openM;

    while (currH < closeH || (currH === closeH && currM < closeM)) {
      const slotStr = `${String(currH).padStart(2, '0')}:${String(currM).padStart(2, '0')}`;
      slots.push(slotStr);

      currM += 30;
      if (currM >= 60) {
        currH += 1;
        currM -= 60;
      }
    }

    return slots;
  };

  // 5. Submit Form
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Name is required';
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Invalid email address';
    }
    if (phone.trim() && !/^0[0-9]{8,9}$/.test(phone.trim())) {
      errors.phone = 'Phone number format must be e.g. 0812345678';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branch || !selectedService || !selectedDate || !selectedTime) return;

    if (!validateForm()) return;

    setSubmitting(true);
    setError(null);

    // Calculate end time
    const [h, m] = selectedTime.split(':').map(Number);
    const dur = selectedService.estimatedDurationMinutes || 30;
    let endM = m + dur;
    let endH = h;
    if (endM >= 60) {
      endH += Math.floor(endM / 60);
      endM = endM % 60;
    }
    const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    try {
      const apptId = await createAppointment(
        branch.tenantId,
        branch.id,
        selectedService.id,
        {
          customerName: name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim() || undefined,
          scheduledDate: selectedDate,
          startTime: selectedTime,
          endTime: endTimeStr
        }
      );
      setCreatedId(apptId);
      setStep(4);
    } catch (err: any) {
      console.error('Failed to create appointment:', err);
      setError(err?.message || 'Failed to book slot. Please try another slot.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 font-medium animate-pulse">
          Loading branch details...
        </p>
      </div>
    );
  }

  if (error && step !== 4) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="glass-panel max-w-md w-full p-6 text-center border-danger/25">
          <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-955 dark:text-white">
            {error || 'Branch Unavailable'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Please double check the link or try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col py-8 px-4 relative overflow-hidden transition-colors">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-500/5 dark:bg-brand-500/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[80px] -z-10 pointer-events-none" />

      <div className="absolute top-4 right-4 z-50">
        <SettingsSwitcher />
      </div>

      <div className="max-w-2xl w-full mx-auto flex-1 flex flex-col justify-center">
        
        {/* Header (hidden on success step) */}
        {step !== 4 && branch && (
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-brand-100 dark:bg-brand-950/40 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand-200/50 dark:border-brand-900/50 shadow-md">
              <CalendarIcon className="w-7 h-7 text-brand-655" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {branch.name} - Online Booking
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
              {branch.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {branch.address.street || branch.address.city}
                </span>
              )}
              {branch.phone && (
                <span className="flex items-center gap-1">
                  <PhoneIcon className="w-3.5 h-3.5" />
                  {branch.phone}
                </span>
              )}
            </div>
          </div>
        )}

        {/* STEP 1: Select Service */}
        {step === 1 && (
          <div className="glass-panel p-6 rounded-3xl animate-in fade-in slide-in-from-bottom-6 duration-300">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-500" />
              Select Service
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Select the service you wish to book an appointment for.
            </p>

            {services.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                  No active services are open for booking at this branch.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {services.map((svc) => (
                  <button
                    key={svc.id}
                    onClick={() => {
                      setSelectedService(svc);
                      setStep(2);
                    }}
                    className="flex flex-col items-start p-5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl text-left transition-all hover:scale-[1.015] hover:shadow-md hover:border-brand-500/40 cursor-pointer group"
                  >
                    <span className="px-2 py-0.5 bg-brand-50 dark:bg-brand-950/30 text-brand-655 font-bold text-[10px] uppercase rounded-full tracking-wider mb-2 border border-brand-100/50 dark:border-brand-900/20">
                      {svc.category || 'Service'}
                    </span>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-brand-655 transition-colors">
                      {svc.name}
                    </h3>
                    {svc.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                        {svc.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-4 text-[11px] font-semibold text-slate-450 dark:text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{svc.estimatedDurationMinutes} mins</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Choose Date & Time */}
        {step === 2 && selectedService && (
          <div className="glass-panel p-6 rounded-3xl animate-in fade-in zoom-in-95 duration-250 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
              <div>
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">Selected Service</span>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{selectedService.name}</h3>
              </div>
              <button 
                onClick={() => setStep(1)} 
                className="text-xs font-bold text-brand-655 hover:underline cursor-pointer"
              >
                Change
              </button>
            </div>

            {/* Date selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider block">
                1. Select Date
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {getNext14Days().map((d) => (
                  <button
                    key={d.dateStr}
                    type="button"
                    disabled={d.disabled}
                    onClick={() => {
                      setSelectedDate(d.dateStr);
                      setSelectedTime('');
                    }}
                    className={`py-3 px-2 border rounded-xl text-center flex flex-col items-center justify-center transition-all ${
                      d.disabled
                        ? 'bg-slate-100 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 opacity-30 cursor-not-allowed'
                        : selectedDate === d.dateStr
                        ? 'border-brand-600 bg-brand-50/20 dark:bg-brand-955/10 text-brand-655 font-bold shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-medium tracking-wide text-slate-400">{d.dayOfWeek}</span>
                    <span className="text-xs mt-0.5 font-bold">{d.label.split(',').slice(-1)[0].trim()}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Time slot selector */}
            {selectedDate && (
              <div className="space-y-2 animate-in fade-in duration-200">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider block">
                  2. Select Time Slot
                </label>
                {getTimeSlots().length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No slots available on this day.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {getTimeSlots().map((tStr) => {
                      const bookCount = bookedTimes[tStr] || 0;
                      const maxConcurrent = selectedService.maxConcurrent || 1;
                      const isFull = bookCount >= maxConcurrent;

                      return (
                        <button
                          key={tStr}
                          type="button"
                          disabled={isFull}
                          onClick={() => setSelectedTime(tStr)}
                          className={`py-2 px-3 border rounded-xl text-center text-xs font-bold transition-all ${
                            isFull
                              ? 'bg-red-50/50 dark:bg-red-955/10 border-red-100 dark:border-red-950 text-red-400 opacity-40 cursor-not-allowed'
                              : selectedTime === tStr
                              ? 'border-brand-600 bg-brand-50/20 dark:bg-brand-955/10 text-brand-655 shadow-sm'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer'
                          }`}
                        >
                          <span>{tStr}</span>
                          {isFull && <span className="block text-[8px] font-medium text-red-500 uppercase tracking-wide">Full</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Navigation Button */}
            {selectedDate && selectedTime && (
              <div className="pt-2 animate-in fade-in duration-200">
                <button
                  onClick={() => setStep(3)}
                  className="w-full py-3 bg-brand-655 hover:bg-brand-600 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-brand-655/10 cursor-pointer"
                >
                  <span>Continue to Contact Details</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Customer Form */}
        {step === 3 && selectedService && selectedDate && selectedTime && (
          <div className="glass-panel p-6 rounded-3xl animate-in fade-in zoom-in-95 duration-250">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60 mb-6">
              <div>
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">Appointment summary</span>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {selectedService.name} on {selectedDate} @ {selectedTime}
                </h3>
              </div>
              <button 
                onClick={() => setStep(2)} 
                className="text-xs font-bold text-brand-655 hover:underline cursor-pointer"
              >
                Change Time
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-900 text-red-750 dark:text-red-300 text-xs rounded-2xl mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-205 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                  />
                </div>
                {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. jane@example.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-205 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                  />
                </div>
                {formErrors.email && <p className="text-xs text-red-550 mt-1">{formErrors.email}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <PhoneIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 0812345678"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-205 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                  />
                </div>
                {formErrors.phone && <p className="text-xs text-red-550 mt-1">{formErrors.phone}</p>}
              </div>

              {/* Submit */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-brand-655 hover:bg-brand-600 disabled:opacity-50 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-brand-655/15 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Confirming Booking...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm Appointment Booking</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 4: Success Screen */}
        {step === 4 && branch && selectedService && (
          <div className="glass-panel p-8 rounded-3xl animate-in fade-in zoom-in-95 duration-300 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-550 border border-emerald-100 dark:border-emerald-900/50 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Booking Confirmed!</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                Your appointment has been successfully scheduled. We look forward to seeing you.
              </p>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm mx-auto space-y-3.5 text-left text-xs">
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-2">
                <span className="text-slate-450">Branch</span>
                <span className="font-bold text-slate-900 dark:text-white">{branch.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-2">
                <span className="text-slate-450">Service</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedService.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-2">
                <span className="text-slate-450">Date</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedDate}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-2">
                <span className="text-slate-450">Time Slot</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450">Reference ID</span>
                <span className="font-bold text-brand-655 uppercase tracking-wide">{createdId?.slice(0, 8)}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setStep(1);
                  setSelectedService(null);
                  setSelectedDate('');
                  setSelectedTime('');
                  setName('');
                  setEmail('');
                  setPhone('');
                  setCreatedId(null);
                }}
                className="py-2.5 px-6 border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-655 dark:text-slate-350 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Book Another Appointment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingPage;
