import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { X, Save, Sparkles } from 'lucide-react';
import { QueueRange, QueueRangeResetPolicy } from '@/types/firestore';
import { CreateQueueRangeInput } from '../repository/queueRangeRepository';

interface QueueRangeFormProps {
  initialData?: QueueRange | null;
  onClose: () => void;
  onSubmit: (data: Omit<CreateQueueRangeInput, 'tenantId'>) => Promise<void>;
  isLoading: boolean;
}

export const QueueRangeForm: React.FC<QueueRangeFormProps> = ({
  initialData,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState(initialData?.name || '');
  const [prefix, setPrefix] = useState(initialData?.prefix || '');
  const [startNumber, setStartNumber] = useState<number>(initialData?.startNumber ?? 1);
  const [endNumber, setEndNumber] = useState<number>(initialData?.endNumber ?? 999);
  const [padLength, setPadLength] = useState<number>(initialData?.padLength ?? 3);
  const [resetPolicy, setResetPolicy] = useState<QueueRangeResetPolicy>(initialData?.resetPolicy || 'daily');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Live preview formatting helper
  const formatNumber = (num: number) => {
    const formatted = String(num).padStart(padLength, '0');
    return prefix ? `${prefix}-${formatted}` : formatted;
  };

  // Presets
  const applyPreset = (type: 'clinic' | 'restaurant' | 'bank') => {
    if (type === 'clinic') {
      setName(t('pages.queueRanges.presets.clinicName', 'Clinic Range'));
      setPrefix('A');
      setStartNumber(1);
      setEndNumber(99);
      setPadLength(3);
      setResetPolicy('daily');
    } else if (type === 'restaurant') {
      setName(t('pages.queueRanges.presets.restaurantName', 'Restaurant Range'));
      setPrefix('');
      setStartNumber(1);
      setEndNumber(199);
      setPadLength(3);
      setResetPolicy('daily');
    } else if (type === 'bank') {
      setName(t('pages.queueRanges.presets.bankName', 'Bank Range'));
      setPrefix('B');
      setStartNumber(1);
      setEndNumber(299);
      setPadLength(3);
      setResetPolicy('daily');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    // Validation schema
    const schema = z.object({
      name: z.string().min(2, t('validation.nameMin', 'Name must be at least 2 characters')),
      prefix: z.string().max(3, t('validation.prefixMax', 'Prefix cannot exceed 3 characters')),
      startNumber: z.number().min(0),
      endNumber: z.number().min(1),
      padLength: z.number().min(1).max(6),
    }).refine((data) => data.startNumber < data.endNumber, {
      message: t('validation.startLessThanEnd', 'Start number must be less than end number'),
      path: ['startNumber'],
    });

    const parsed = schema.safeParse({
      name: name.trim(),
      prefix: prefix.trim(),
      startNumber: Number(startNumber),
      endNumber: Number(endNumber),
      padLength: Number(padLength),
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      const payload: Omit<CreateQueueRangeInput, 'tenantId'> = {
        name: name.trim(),
        prefix: prefix.trim(),
        startNumber: Number(startNumber),
        endNumber: Number(endNumber),
        padLength: Number(padLength),
        resetPolicy,
      };
      await onSubmit(payload);
    } catch (err: any) {
      setServerError(err?.message || t('common.errorConnection'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/80">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {initialData ? t('pages.queueRanges.editRange', 'Edit Queue Range') : t('pages.queueRanges.addRange', 'Add Queue Range')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t('pages.queueRanges.formSubtitle', 'Configure daily running queue numbers for specific services')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleFormSubmit}>
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {serverError && (
              <div className="p-4 bg-red-50 dark:bg-red-955/35 border border-red-200 dark:border-red-900 text-red-750 dark:text-red-300 text-sm rounded-2xl flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-650 animate-pulse"></span>
                <span>{serverError}</span>
              </div>
            )}

            {/* Live Preview Banner */}
            <div className="p-4 bg-brand-50 dark:bg-brand-950/20 border border-brand-100 dark:border-brand-900/50 rounded-2xl">
              <h4 className="text-xs font-bold text-brand-655 dark:text-brand-400 uppercase tracking-wider mb-2">
                {t('pages.queueRanges.previewTitle', 'Live Range Preview')}
              </h4>
              <div className="flex items-center gap-3">
                <span className="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 text-sm font-black rounded-xl text-slate-900 dark:text-white shadow-sm font-mono">
                  {formatNumber(startNumber)}
                </span>
                <span className="text-slate-400 font-bold">...</span>
                <span className="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-205 dark:border-slate-700 text-sm font-black rounded-xl text-slate-900 dark:text-white shadow-sm font-mono">
                  {formatNumber(endNumber)}
                </span>
              </div>
            </div>

            {/* Presets Row (Only show when creating new) */}
            {!initialData && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                  {t('pages.queueRanges.quickPresets', 'Quick Presets')}
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset('clinic')}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    🏥 {t('pages.queueRanges.presets.clinic', 'Clinic (A-001 ~ A-99)')}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('restaurant')}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    🍔 {t('pages.queueRanges.presets.restaurant', 'Restaurant (001 ~ 199)')}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('bank')}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    🏦 {t('pages.queueRanges.presets.bank', 'Bank (B-001 ~ B-299)')}
                  </button>
                </div>
              </div>
            )}

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                  {t('pages.queueRanges.form.nameLabel', 'Range Name')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('pages.queueRanges.form.namePlaceholder', 'e.g. A-Series, Main Clinic')}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                  {t('pages.queueRanges.form.prefixLabel', 'Prefix (Optional)')}
                </label>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                  placeholder={t('pages.queueRanges.form.prefixPlaceholder', 'e.g. A, VIP')}
                  maxLength={3}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none uppercase"
                />
                {errors.prefix && <p className="text-xs text-red-500 mt-1">{errors.prefix}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                  {t('pages.queueRanges.form.padLengthLabel', 'Number Padding')}
                </label>
                <select
                  value={padLength}
                  onChange={(e) => setPadLength(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none cursor-pointer"
                >
                  <option value={1}>{t('pages.queueRanges.form.padOption1', 'None (1)')}</option>
                  <option value={2}>{t('pages.queueRanges.form.padOption2', '2 Digits (01)')}</option>
                  <option value={3}>{t('pages.queueRanges.form.padOption3', '3 Digits (001)')}</option>
                  <option value={4}>{t('pages.queueRanges.form.padOption4', '4 Digits (0001)')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                  {t('pages.queueRanges.form.startLabel', 'Start Number')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={startNumber}
                  onChange={(e) => setStartNumber(Number(e.target.value))}
                  min={0}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                />
                {errors.startNumber && <p className="text-xs text-red-500 mt-1">{errors.startNumber}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                  {t('pages.queueRanges.form.endLabel', 'End Number')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={endNumber}
                  onChange={(e) => setEndNumber(Number(e.target.value))}
                  min={1}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                />
                {errors.endNumber && <p className="text-xs text-red-500 mt-1">{errors.endNumber}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                  {t('pages.queueRanges.form.resetPolicyLabel', 'Reset Policy')}
                </label>
                <select
                  value={resetPolicy}
                  onChange={(e) => setResetPolicy(e.target.value as QueueRangeResetPolicy)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none cursor-pointer"
                >
                  <option value="daily">{t('pages.queueRanges.form.policyDaily', 'Daily Reset (Recommended)')}</option>
                  <option value="manual">{t('pages.queueRanges.form.policyManual', 'Manual Reset Only')}</option>
                  <option value="never">{t('pages.queueRanges.form.policyNever', 'Never Reset (Infinite Counter)')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold text-sm rounded-xl transition-colors cursor-pointer"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1.5 py-2 px-5 bg-brand-655 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-md shadow-brand-655/15 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{initialData ? t('common.save', 'Save Changes') : t('pages.queueRanges.form.submitCreate', 'Create Range')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
