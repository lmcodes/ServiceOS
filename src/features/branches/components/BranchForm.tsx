import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { X, Clock, HelpCircle, Save } from 'lucide-react';
import { Branch, OperatingHours } from '@/types/firestore';
import { CreateBranchInput } from '../types';

interface BranchFormProps {
  initialData?: Branch | null;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  isLoading: boolean;
}

const TIMEZONES = [
  { value: 'Asia/Bangkok', label: 'Bangkok (ICT - UTC+07:00)' },
  { value: 'Asia/Vientiane', label: 'Vientiane (ICT - UTC+07:00)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT - UTC+08:00)' },
  { value: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur (MYT - UTC+08:00)' },
  { value: 'Asia/Jakarta', label: 'Jakarta (WIB - UTC+07:00)' },
  { value: 'Asia/Manila', label: 'Manila (PHT - UTC+08:00)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST - UTC+09:00)' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
];

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

// Create operating hours defaults
const defaultHours = (): OperatingHours => ({
  open: '09:00',
  close: '17:00',
  isOpen: true,
});

const defaultWeekendHours = (): OperatingHours => ({
  open: null,
  close: null,
  isOpen: false,
});

export const BranchForm: React.FC<BranchFormProps> = ({
  initialData,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState(initialData?.name || '');
  const [code, setCode] = useState(initialData?.code || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [addressStreet, setAddressStreet] = useState(initialData?.address?.street || '');
  const [addressCity, setAddressCity] = useState(initialData?.address?.city || '');
  const [timezone, setTimezone] = useState(initialData?.timezone || 'Asia/Bangkok');
  const [queuePrefix, setQueuePrefix] = useState(initialData?.queuePrefix || 'A');

  // Operating Hours state
  const [hours, setHours] = useState<{ [key in typeof DAYS[number]]: OperatingHours }>({
    monday: initialData?.operatingHours?.monday || defaultHours(),
    tuesday: initialData?.operatingHours?.tuesday || defaultHours(),
    wednesday: initialData?.operatingHours?.wednesday || defaultHours(),
    thursday: initialData?.operatingHours?.thursday || defaultHours(),
    friday: initialData?.operatingHours?.friday || defaultHours(),
    saturday: initialData?.operatingHours?.saturday || defaultWeekendHours(),
    sunday: initialData?.operatingHours?.sunday || defaultWeekendHours(),
  });

  // Settings state
  const [autoCallNext, setAutoCallNext] = useState(initialData?.settings?.autoCallNext ?? false);
  const [requirePhone, setRequirePhone] = useState(initialData?.settings?.requirePhone ?? false);
  const [noShowTimeout, setNoShowTimeout] = useState(initialData?.settings?.noShowTimeoutMinutes ?? 15);
  const [maxQueueSize, setMaxQueueSize] = useState(initialData?.settings?.maxQueueSize ?? 0);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleDayToggle = (day: typeof DAYS[number]) => {
    setHours((prev) => {
      const current = prev[day];
      return {
        ...prev,
        [day]: {
          ...current,
          isOpen: !current.isOpen,
          open: !current.isOpen ? '09:00' : null,
          close: !current.isOpen ? '17:00' : null,
        },
      };
    });
  };

  const handleTimeChange = (day: typeof DAYS[number], field: 'open' | 'close', value: string) => {
    setHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    // Validation using Zod
    const schema = z.object({
      name: z.string().min(2, t('validation.nameMin')),
      code: z.string().min(2, t('pages.branches.form.codePlaceholder')).regex(/^[a-zA-Z0-9]+$/, 'Alpha-numeric only'),
      queuePrefix: z.string().min(1).max(2).toUpperCase(),
      email: z.string().email().optional().or(z.literal('')),
      phone: z.string().optional().or(z.literal('')),
      noShowTimeout: z.number().min(1),
      maxQueueSize: z.number().min(0),
    });

    const parsed = schema.safeParse({
      name,
      code,
      queuePrefix,
      email,
      phone,
      noShowTimeout: Number(noShowTimeout),
      maxQueueSize: Number(maxQueueSize),
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
      const payload: CreateBranchInput = {
        name,
        code: code.toUpperCase(),
        phone,
        email,
        address: {
          street: addressStreet,
          city: addressCity,
        },
        timezone,
        queuePrefix: queuePrefix.toUpperCase(),
        operatingHours: hours,
        settings: {
          autoCallNext,
          noShowTimeoutMinutes: Number(noShowTimeout),
          maxQueueSize: Number(maxQueueSize),
          requirePhone,
        },
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
              {initialData ? t('pages.branches.editBranch') : t('pages.branches.addBranch')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t('pages.branches.subtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-650 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleFormSubmit}>
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {serverError && (
              <div className="p-4 bg-red-50 dark:bg-red-955/35 border border-red-200 dark:border-red-900 text-red-750 dark:text-red-300 text-sm rounded-2xl flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-650 animate-pulse"></span>
                <span>{serverError}</span>
              </div>
            )}

            {/* Basic Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                  {t('pages.branches.form.nameLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('pages.branches.form.namePlaceholder')}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                  {t('pages.branches.form.codeLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={t('pages.branches.form.codePlaceholder')}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                  disabled={!!initialData}
                />
                {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                  {t('pages.branches.form.phoneLabel')}
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('pages.branches.form.phonePlaceholder')}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                  {t('pages.branches.form.emailLabel')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('pages.branches.form.emailPlaceholder')}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                  {t('pages.branches.form.prefixLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={queuePrefix}
                  onChange={(e) => setQueuePrefix(e.target.value)}
                  placeholder={t('pages.branches.form.prefixPlaceholder')}
                  maxLength={2}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                />
                {errors.queuePrefix && <p className="text-xs text-red-500 mt-1">{errors.queuePrefix}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                  {t('pages.branches.form.timezoneLabel')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                  Street / Address Detail
                </label>
                <input
                  type="text"
                  value={addressStreet}
                  onChange={(e) => setAddressStreet(e.target.value)}
                  placeholder="e.g. 123 Sukhumvit Rd"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                  City / State
                </label>
                <input
                  type="text"
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                  placeholder="e.g. Bangkok"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                />
              </div>
            </div>

            {/* Settings Card */}
            <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/55 dark:border-slate-800/70 rounded-2xl space-y-4">
              <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-brand-500" />
                {t('pages.branches.form.settingsLabel')}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Auto Call */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-650 dark:text-slate-300">
                    {t('pages.branches.form.autoCallNext')}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoCallNext}
                      onChange={(e) => setAutoCallNext(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:height-4 after:w-4 after:h-4 after:transition-all dark:border-slate-600 peer-checked:bg-brand-655 cursor-pointer"></div>
                  </label>
                </div>

                {/* Require Phone */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-655 dark:text-slate-300">
                    {t('pages.branches.form.requirePhone')}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requirePhone}
                      onChange={(e) => setRequirePhone(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:height-4 after:w-4 after:h-4 after:transition-all dark:border-slate-600 peer-checked:bg-brand-655 cursor-pointer"></div>
                  </label>
                </div>

                {/* No Show Timeout */}
                <div>
                  <label className="block text-xs text-slate-650 dark:text-slate-350 mb-1">
                    {t('pages.branches.form.noShowTimeout')}
                  </label>
                  <input
                    type="number"
                    value={noShowTimeout}
                    onChange={(e) => setNoShowTimeout(Number(e.target.value))}
                    min={1}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white outline-none"
                  />
                  {errors.noShowTimeout && <p className="text-xs text-red-500 mt-1">{errors.noShowTimeout}</p>}
                </div>

                {/* Max Queue Size */}
                <div>
                  <label className="block text-xs text-slate-650 dark:text-slate-350 mb-1">
                    {t('pages.branches.form.maxQueueSize')}
                  </label>
                  <input
                    type="number"
                    value={maxQueueSize}
                    onChange={(e) => setMaxQueueSize(Number(e.target.value))}
                    min={0}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white outline-none"
                  />
                  {errors.maxQueueSize && <p className="text-xs text-red-500 mt-1">{errors.maxQueueSize}</p>}
                </div>
              </div>
            </div>

            {/* Operating Hours Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-850 dark:text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-brand-500" />
                {t('pages.branches.form.operatingHoursLabel')}
              </h4>

              <div className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60 bg-slate-50/20 dark:bg-slate-900/30">
                {DAYS.map((day) => {
                  const dayHours = hours[day];
                  return (
                    <div key={day} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={`open-${day}`}
                          checked={dayHours.isOpen}
                          onChange={() => handleDayToggle(day)}
                          className="w-4.5 h-4.5 text-brand-600 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 rounded-md focus:ring-brand-500 cursor-pointer"
                        />
                        <label htmlFor={`open-${day}`} className="text-sm font-medium capitalize text-slate-800 dark:text-slate-200 cursor-pointer">
                          {t(`onboarding.businessTypes.clinic`) ? day : day}
                        </label>
                      </div>

                      {dayHours.isOpen && (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={dayHours.open || '09:00'}
                            onChange={(e) => handleTimeChange(day, 'open', e.target.value)}
                            className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white focus:outline-none"
                          />
                          <span className="text-slate-400 text-xs">to</span>
                          <input
                            type="time"
                            value={dayHours.close || '17:00'}
                            onChange={(e) => handleTimeChange(day, 'close', e.target.value)}
                            className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs dark:text-white focus:outline-none"
                          />
                        </div>
                      )}

                      {!dayHours.isOpen && (
                        <span className="text-xs text-slate-400 italic">Closed</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="p-6 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold text-sm rounded-xl transition-colors cursor-pointer"
            >
              {t('pages.branches.form.cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1.5 py-2 px-5 bg-brand-655 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-md shadow-brand-600/15 transition-all cursor-pointer"
            >
              {isLoading ? (
                <span>{t('common.loading')}</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{initialData ? t('pages.branches.form.submitUpdate') : t('pages.branches.form.submitCreate')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default BranchForm;
