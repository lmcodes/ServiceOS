import React, { useState, useEffect } from 'react';
import { CustomerGroup } from '@/types/firestore';
import { X, Loader2, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  priorityLevel: z.number().min(1).max(10),
  timeMin: z.number().min(1, 'Warning time must be at least 1 minute'),
  timeMax: z.number().min(2, 'Max time must be greater than warning time'),
  color: z.string().min(2, 'Please select a color'),
  badge: z.string().min(1, 'Badge label is required'),
});

type FormValues = z.infer<typeof schema>;

interface CustomerGroupFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormValues) => Promise<void>;
  group?: CustomerGroup | null;
}

const PRESET_COLORS = [
  { name: 'Amber/Gold', value: 'amber', textClass: 'text-amber-700 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40' },
  { name: 'Blue/Premium', value: 'blue', textClass: 'text-blue-700 bg-blue-50 dark:bg-blue-955/20 border-blue-200 dark:border-blue-900/40' },
  { name: 'Purple/Royal', value: 'purple', textClass: 'text-purple-700 bg-purple-50 dark:bg-purple-955/20 border-purple-200 dark:border-purple-900/40' },
  { name: 'Rose/VIP Platinum', value: 'rose', textClass: 'text-rose-700 bg-rose-50 dark:bg-rose-955/20 border-rose-200 dark:border-rose-900/40' },
  { name: 'Emerald/Regular', value: 'emerald', textClass: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-955/20 border-emerald-200 dark:border-emerald-900/40' },
];

export const CustomerGroupForm: React.FC<CustomerGroupFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  group,
}) => {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [priorityLevel, setPriorityLevel] = useState(1);
  const [timeMin, setTimeMin] = useState(5);
  const [timeMax, setTimeMax] = useState(15);
  const [color, setColor] = useState('blue');
  const [badge, setBadge] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (group) {
      setName(group.name);
      setPriorityLevel(group.priorityLevel);
      setTimeMin(group.timeMin);
      setTimeMax(group.timeMax);
      setColor(group.color);
      setBadge(group.badge);
    } else {
      setName('');
      setPriorityLevel(1);
      setTimeMin(5);
      setTimeMax(15);
      setColor('blue');
      setBadge('');
    }
    setErrors({});
  }, [group, isOpen]);

  if (!isOpen) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    const parsed = schema.safeParse({
      name,
      priorityLevel: Number(priorityLevel),
      timeMin: Number(timeMin),
      timeMax: Number(timeMax),
      color,
      badge,
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

    if (parsed.data.timeMax <= parsed.data.timeMin) {
      setErrors({
        timeMax: 'Max waiting time must be strictly greater than warning time',
      });
      setSubmitting(false);
      return;
    }

    try {
      await onSubmit(parsed.data);
      onClose();
    } catch (error) {
      console.error('Failed to submit customer group form:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-850">
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            {group ? t('pages.customerGroups.editGroup', 'Edit VIP Customer Group') : t('pages.customerGroups.addGroup', 'Add VIP Customer Group')}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider mb-2">
              {t('pages.customerGroups.form.nameLabel', 'Group Name')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. VIP Gold, Platinum Member"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1 font-semibold">{errors.name}</p>
            )}
          </div>

          {/* Badge & Color Picker */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider mb-2">
                {t('pages.customerGroups.form.badgeLabel', 'Badge Label')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="e.g. GOLD, PLATINUM"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
              />
              {errors.badge && (
                <p className="text-xs text-red-500 mt-1 font-semibold">{errors.badge}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider mb-2">
                {t('pages.customerGroups.form.colorLabel', 'Theme Color')}
              </label>
              <select
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none cursor-pointer"
              >
                {PRESET_COLORS.map((c) => (
                  <option key={c.value} value={c.value} className="text-slate-900">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority Level */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
                {t('pages.customerGroups.form.priorityLabel', 'Priority Level (1 - 10)')}
              </label>
              <span className="text-xs font-extrabold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/30 px-2 py-0.5 rounded-md border border-brand-100/50 dark:border-brand-900/30">
                {priorityLevel}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={priorityLevel}
              onChange={(e) => setPriorityLevel(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold mt-1">
              <span>1 (Normal)</span>
              <span>10 (Highest VIP)</span>
            </div>
          </div>

          {/* Escalation Configurations */}
          <div className="p-3 bg-brand-50/50 dark:bg-brand-950/10 border border-brand-100 dark:border-brand-900/30 rounded-xl text-[11px] text-brand-700 dark:text-brand-400 flex items-start gap-2.5">
            <Info size={16} className="shrink-0 mt-0.5" />
            <p>
              {t(
                'pages.customerGroups.form.escalationInfo',
                'VIP customers start waiting normally. Upon warning threshold, they highlight on screen. Upon overtime threshold, they are bumped to the absolute top of the queue.'
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider mb-2">
                {t('pages.customerGroups.form.timeMinLabel', 'Warning Alert Time (Mins)')} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={timeMin}
                onChange={(e) => setTimeMin(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
              />
              {errors.timeMin && (
                <p className="text-xs text-red-500 mt-1 font-semibold">{errors.timeMin}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider mb-2">
                {t('pages.customerGroups.form.timeMaxLabel', 'Overtime Bump Time (Mins)')} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={timeMax}
                onChange={(e) => setTimeMax(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
              />
              {errors.timeMax && (
                <p className="text-xs text-red-500 mt-1 font-semibold">{errors.timeMax}</p>
              )}
            </div>
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
