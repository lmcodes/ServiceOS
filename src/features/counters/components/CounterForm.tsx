import React, { useState, useEffect } from 'react';
import { Service, Counter } from '@/types/firestore';
import { X, Loader2, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  primaryServiceIds: z.array(z.string()).default([]),
  secondaryServiceIds: z.array(z.string()).default([]),
  oneStopServiceIds: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof schema>;

interface CounterFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormValues) => Promise<void>;
  services: Service[];
  counter?: Counter | null;
}

export const CounterForm: React.FC<CounterFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  services,
  counter,
}) => {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [primaryServiceIds, setPrimaryServiceIds] = useState<string[]>([]);
  const [secondaryServiceIds, setSecondaryServiceIds] = useState<string[]>([]);
  const [oneStopServiceIds, setOneStopServiceIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (counter) {
      setName(counter.name);
      setPrimaryServiceIds(counter.primaryServiceIds || []);
      setSecondaryServiceIds(counter.secondaryServiceIds || []);
      setOneStopServiceIds(counter.oneStopServiceIds || []);
      setIsActive(counter.isActive !== false);
    } else {
      setName('');
      setPrimaryServiceIds([]);
      setSecondaryServiceIds([]);
      setOneStopServiceIds([]);
      setIsActive(true);
    }
    setErrors({});
  }, [counter, isOpen]);

  if (!isOpen) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    const parsed = schema.safeParse({
      name,
      primaryServiceIds,
      secondaryServiceIds,
      oneStopServiceIds,
      isActive,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      setSubmitting(false);
      return;
    }

    try {
      await onSubmit(parsed.data);
      onClose();
    } catch (error) {
      console.error('Failed to submit counter form:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleService = (
    serviceId: string,
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setList((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-850">
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            {counter ? t('pages.counters.editCounter', 'Edit Counter') : t('pages.counters.addCounter', 'Add Counter')}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider mb-2">
              {t('pages.counters.form.nameLabel', 'Counter Name')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Counter 1, Service Desk A"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1 font-semibold">{errors.name}</p>
            )}
          </div>

          {/* Service Configuration Guides */}
          <div className="p-3 bg-brand-50/50 dark:bg-brand-950/10 border border-brand-100 dark:border-brand-900/30 rounded-xl text-[11px] text-brand-700 dark:text-brand-400 flex items-start gap-2.5">
            <Info size={16} className="shrink-0 mt-0.5" />
            <p>
              {t(
                'pages.counters.form.servicesGuide',
                'Assign services to prioritize queue handling. Primary services are handled first, secondary when primary is empty, and One-Stop services are pooled FIFO.'
              )}
            </p>
          </div>

          {/* Primary Services */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider mb-2">
              {t('pages.counters.form.primaryServices', 'Primary Services')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/40">
              {services.map((svc) => (
                <label key={svc.id} className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={primaryServiceIds.includes(svc.id)}
                    onChange={() => handleToggleService(svc.id, setPrimaryServiceIds)}
                    className="w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500"
                  />
                  <span className="text-slate-700 dark:text-slate-300 truncate">{svc.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Secondary Services */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider mb-2">
              {t('pages.counters.form.secondaryServices', 'Secondary Services')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/40">
              {services.map((svc) => (
                <label key={svc.id} className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={secondaryServiceIds.includes(svc.id)}
                    onChange={() => handleToggleService(svc.id, setSecondaryServiceIds)}
                    className="w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500"
                  />
                  <span className="text-slate-700 dark:text-slate-330 truncate">{svc.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* One-Stop Services */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider mb-2">
              {t('pages.counters.form.oneStopServices', 'One-Stop Services')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/40">
              {services.map((svc) => (
                <label key={svc.id} className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={oneStopServiceIds.includes(svc.id)}
                    onChange={() => handleToggleService(svc.id, setOneStopServiceIds)}
                    className="w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500"
                  />
                  <span className="text-slate-700 dark:text-slate-330 truncate">{svc.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Active status */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {t('pages.counters.form.isActive', 'Active Status')}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-850">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-600/10 flex items-center gap-1.5 cursor-pointer transition-transform"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{t('common.save')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
