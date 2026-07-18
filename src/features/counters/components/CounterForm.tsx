import React, { useState, useEffect } from 'react';
import { Service, Counter } from '@/types/firestore';
import { X, Loader2, Info, Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  primaryServiceIds: z.array(z.string()).default([]),
  secondaryServiceIds: z.array(z.string()).default([]),
  oneStopServiceIds: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  soundStatus: z.enum(['enabled', 'muted']).default('enabled'),
  announcementStyleId: z.string().nullable().optional(),
  announcementTemplates: z.record(z.string()).nullable().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CounterFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormValues) => Promise<void>;
  services: Service[];
  counter?: Counter | null;
  voiceSettings?: any;
}

export const CounterForm: React.FC<CounterFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  services,
  counter,
  voiceSettings,
}) => {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [primaryServiceIds, setPrimaryServiceIds] = useState<string[]>([]);
  const [secondaryServiceIds, setSecondaryServiceIds] = useState<string[]>([]);
  const [oneStopServiceIds, setOneStopServiceIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [soundStatus, setSoundStatus] = useState<'enabled' | 'muted'>('enabled');
  const [announcementStyleId, setAnnouncementStyleId] = useState('');
  const [announcementTemplateTh, setAnnouncementTemplateTh] = useState('');
  const [announcementTemplateEn, setAnnouncementTemplateEn] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (counter) {
      setName(counter.name);
      setPrimaryServiceIds(counter.primaryServiceIds || []);
      setSecondaryServiceIds(counter.secondaryServiceIds || []);
      setOneStopServiceIds(counter.oneStopServiceIds || []);
      setIsActive(counter.isActive !== false);
      setSoundStatus(counter.soundStatus || 'enabled');
      setAnnouncementStyleId(counter.announcementStyleId || '');
      setAnnouncementTemplateTh(counter.announcementTemplates?.th || '');
      setAnnouncementTemplateEn(counter.announcementTemplates?.en || '');
    } else {
      setName('');
      setPrimaryServiceIds([]);
      setSecondaryServiceIds([]);
      setOneStopServiceIds([]);
      setIsActive(true);
      setSoundStatus('enabled');
      setAnnouncementStyleId('');
      setAnnouncementTemplateTh('');
      setAnnouncementTemplateEn('');
    }
    setErrors({});
    setServerError(null);
  }, [counter, isOpen]);

  if (!isOpen) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError(null);
    setSubmitting(true);

    const parsed = schema.safeParse({
      name,
      primaryServiceIds,
      secondaryServiceIds,
      oneStopServiceIds,
      isActive,
      soundStatus,
      announcementStyleId: announcementStyleId || null,
      announcementTemplates: (announcementTemplateTh.trim() || announcementTemplateEn.trim())
        ? {
            ...(announcementTemplateTh.trim() && { th: announcementTemplateTh.trim() }),
            ...(announcementTemplateEn.trim() && { en: announcementTemplateEn.trim() }),
          }
        : null
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
    } catch (error: any) {
      console.error('Failed to submit counter form:', error);
      setServerError(error.message || 'Failed to submit counter form. Please try again.');
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
        <form onSubmit={handleFormSubmit}>
          <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
            {serverError && (
              <div className="p-4 bg-red-50 dark:bg-red-955/35 border border-red-200 dark:border-red-900 text-red-750 dark:text-red-300 text-sm rounded-2xl flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-650 animate-pulse"></span>
                <span>{serverError}</span>
              </div>
            )}
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

          {/* Sound status */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider flex items-center gap-1.5">
              {soundStatus === 'enabled' ? (
                <Volume2 className="w-4 h-4 text-brand-500" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
              {t('pages.counters.form.soundStatus', 'Counter Sound')}
            </span>
            <select
              value={soundStatus}
              onChange={(e) => setSoundStatus(e.target.value as 'enabled' | 'muted')}
              className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
            >
              <option value="enabled">{t('pages.counters.form.soundEnabled', 'Enabled (Unmute)')}</option>
              <option value="muted">{t('pages.counters.form.soundMuted', 'Muted')}</option>
            </select>
          </div>

          {/* Voice Overrides */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-brand-550" />
              Voice Settings & Override
            </h3>

            {/* Style Selector */}
            {voiceSettings?.styles && Object.keys(voiceSettings.styles).length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5">
                  Announcement Style Override
                </label>
                <select
                  value={announcementStyleId}
                  onChange={(e) => setAnnouncementStyleId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-lg text-slate-955 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none text-xs cursor-pointer"
                >
                  <option value="">Use Default ({voiceSettings.styles[voiceSettings.activeStyleId || '']?.name || 'Default Settings'})</option>
                  {Object.entries(voiceSettings.styles).map(([id, s]: [string, any]) => (
                    <option key={id} value={id}>{s.name} ({id})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Template Overrides */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Thai Template Override (Optional)
                </label>
                <input
                  type="text"
                  value={announcementTemplateTh}
                  onChange={(e) => setAnnouncementTemplateTh(e.target.value)}
                  placeholder="เช่น หมายเลข {{number}} ที่ช่องบริการ {{counter}} ค่ะ"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-255 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  English Template Override (Optional)
                </label>
                <input
                  type="text"
                  value={announcementTemplateEn}
                  onChange={(e) => setAnnouncementTemplateEn(e.target.value)}
                  placeholder="e.g. Number {{number}} at {{counter}}"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-255 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none text-xs"
                />
              </div>
            </div>
          </div>

          {/* Active status */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
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
        </div>

        {/* Actions */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/50">
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
