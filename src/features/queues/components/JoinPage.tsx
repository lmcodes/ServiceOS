import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, onSnapshot, query, collection, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Branch, Service, CustomerGroup } from '@/types/firestore';
import { createQueueItem } from '../repository/queueRepository';
import { 
  Building2, 
  MapPin, 
  Phone as PhoneIcon, 
  Clock, 
  User as UserIcon, 
  Mail, 
  ArrowRight,
  Loader2,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { SettingsSwitcher } from '@/shared/components/SettingsSwitcher';

export const JoinPage: React.FC = () => {
  const { branchId } = useParams<{ branchId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // State
  const [branch, setBranch] = useState<Branch | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [customData, setCustomData] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [customerGroups, setCustomerGroups] = useState<CustomerGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  // Fetch branch and active services
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

  // Fetch customer groups
  useEffect(() => {
    if (!branch?.tenantId) return;

    const q = query(
      collection(db, 'customerGroups'),
      where('tenantId', '==', branch.tenantId)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: CustomerGroup[] = [];
        snap.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as CustomerGroup);
        });
        setCustomerGroups(list.sort((a, b) => b.priorityLevel - a.priorityLevel));
      },
      (err) => {
        console.error('Error fetching customer groups:', err);
      }
    );

    return () => unsub();
  }, [branch?.tenantId]);

  const handleCustomFieldChange = (key: string, value: any) => {
    setCustomData((prev) => ({ ...prev, [key]: value }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = t('pages.queues.validationName');
    }

    if (branch?.settings.requirePhone && !phone.trim()) {
      errors.phone = t('pages.queues.validationPhone');
    } else if (phone.trim() && !/^0[0-9]{8,9}$/.test(phone.trim())) {
      errors.phone = t('pages.queues.validationPhone');
    }

    // Custom Fields validation
    if (selectedService?.customFields) {
      selectedService.customFields.forEach((field) => {
        if (field.required) {
          const val = customData[field.key];
          if (val === undefined || val === null || val === '' || val === false) {
            errors[field.key] = `${field.label} is required`;
          }
        }
      });
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId || !selectedService) return;

    if (!validateForm()) return;

    setSubmitting(true);
    setError(null);

    try {
      const selectedGroup = customerGroups.find((g) => g.id === selectedGroupId);
      const result = await createQueueItem(branchId, selectedService.id, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        customData,
        customerGroupId: selectedGroupId || undefined,
        priorityLevel: selectedGroup ? selectedGroup.priorityLevel : 1
      });

      navigate(`/status/${result.id}`);
    } catch (err: any) {
      console.error('Error joining queue:', err);
      setError(err?.message || 'Failed to join the queue. Please try again.');
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

  if (error || !branch) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="glass-panel max-w-md w-full p-6 text-center border-danger/25">
          <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-950 dark:text-white">
            {error || 'Branch Unavailable'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Please make sure the QR code matches a valid active branch in our system.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col py-8 px-4 relative overflow-hidden transition-colors">
      {/* Decorative gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-500/5 dark:bg-brand-500/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[80px] -z-10 pointer-events-none" />

      {/* Floating utility switchers */}
      <div className="absolute top-4 right-4 z-50">
        <SettingsSwitcher />
      </div>

      <div className="max-w-2xl w-full mx-auto flex-1 flex flex-col justify-center">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-brand-100 dark:bg-brand-950/40 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand-200/50 dark:border-brand-900/50 shadow-md">
            <Building2 className="w-7 h-7 text-brand-655 dark:text-brand-400" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {branch.name}
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

        {/* Step 1: Select Service */}
        {!selectedService ? (
          <div className="glass-panel p-6 rounded-3xl animate-in fade-in slide-in-from-bottom-6 duration-300">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-500" />
              {t('pages.queues.selectService')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Choose one of our available options below to request a ticket.
            </p>

            {services.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 shadow-sm">
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                  No active services available at this branch right now.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {services.map((svc) => (
                  <button
                    key={svc.id}
                    onClick={() => setSelectedService(svc)}
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
        ) : (
          /* Step 2: Form Input Details */
          <div className="glass-panel p-6 rounded-3xl animate-in fade-in zoom-in-95 duration-250">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60 mb-6">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                  Selected Service
                </span>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {selectedService.name}
                </h2>
              </div>
              <button
                onClick={() => {
                  setSelectedService(null);
                  setFormErrors({});
                }}
                className="text-xs font-bold text-brand-655 hover:underline cursor-pointer"
              >
                Change Service
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">
                  {t('pages.queues.customerInfo')}
                </h3>
                <div className="space-y-4">
                  {/* Name Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                      {t('pages.queues.customerName')} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                      />
                    </div>
                    {formErrors.name && (
                      <p className="text-xs text-red-550 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {formErrors.name}
                      </p>
                    )}
                  </div>

                  {/* Phone Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                      {t('pages.queues.customerPhone')}{' '}
                      {branch.settings.requirePhone && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                      <PhoneIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 0812345678"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                      />
                    </div>
                    {formErrors.phone && (
                      <p className="text-xs text-red-550 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {formErrors.phone}
                      </p>
                    )}
                  </div>

                  {/* Email Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                      {t('pages.queues.customerEmail')}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. john@example.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                      />
                    </div>
                  </div>

                  {/* Customer Group / VIP Tier Selector */}
                  {customerGroups.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                        {t('pages.queues.customerGroupLabel', 'Customer Tier / Group')}
                      </label>
                      <select
                        value={selectedGroupId}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none cursor-pointer"
                      >
                        <option value="">{t('pages.queues.groupNormal', 'Regular Customer')}</option>
                        {customerGroups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name} ({g.badge})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Custom Questions Section */}
              {selectedService.customFields && selectedService.customFields.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">
                    Additional Information
                  </h3>
                  <div className="space-y-4">
                    {selectedService.customFields.map((field) => {
                      const value = customData[field.key] ?? '';
                      return (
                        <div key={field.key}>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </label>

                          {field.type === 'textarea' ? (
                            <textarea
                              value={value}
                              onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                              rows={3}
                              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none resize-none"
                            />
                          ) : field.type === 'checkbox' ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`custom-${field.key}`}
                                checked={!!value}
                                onChange={(e) => handleCustomFieldChange(field.key, e.target.checked)}
                                className="w-4.5 h-4.5 text-brand-600 bg-slate-100 dark:bg-slate-800 border-slate-350 dark:border-slate-700 rounded focus:ring-brand-500"
                              />
                              <label
                                htmlFor={`custom-${field.key}`}
                                className="text-xs text-slate-655 dark:text-slate-400 font-medium"
                              >
                                {field.label}
                              </label>
                            </div>
                          ) : (
                            <input
                              type={field.type === 'number' ? 'number' : 'text'}
                              value={value}
                              onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                            />
                          )}

                          {formErrors[field.key] && (
                            <p className="text-xs text-red-550 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {formErrors[field.key]}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Submission Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-brand-655 hover:bg-brand-600 disabled:opacity-50 text-white rounded-2xl text-sm font-bold shadow-lg shadow-brand-655/15 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4.5 h-4.5 animate-spin" />
                      <span>Requesting Ticket...</span>
                    </>
                  ) : (
                    <>
                      <span>{t('pages.queues.submitJoin')}</span>
                      <ArrowRight className="w-4.5 h-4.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default JoinPage;
