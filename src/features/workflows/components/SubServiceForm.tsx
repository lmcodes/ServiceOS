import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { X, Save } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { SubService } from '@/types/firestore';
import { CreateSubServiceInput } from '../repository/subServiceRepository';

interface SubServiceFormProps {
  initialData?: SubService | null;
  onClose: () => void;
  onSubmit: (data: Omit<CreateSubServiceInput, 'tenantId'>) => Promise<void>;
  isLoading: boolean;
}

const AVAILABLE_ICONS = [
  'UserCheck',
  'Heart',
  'Stethoscope',
  'CreditCard',
  'Package',
  'Calendar',
  'FileText',
  'Activity',
  'Clock',
  'Coffee',
  'ShoppingBag',
  'Smile',
  'HelpCircle'
];

export const SubServiceForm: React.FC<SubServiceFormProps> = ({
  initialData,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);

  // Form states
  const [nameTh, setNameTh] = useState(initialData?.name?.th || '');
  const [nameEn, setNameEn] = useState(initialData?.name?.en || '');
  const [icon, setIcon] = useState(initialData?.icon || 'UserCheck');
  const [estimatedMinutes, setEstimatedMinutes] = useState(initialData?.estimatedMinutes || 10);
  const [category, setCategory] = useState(initialData?.category || 'general');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    // Validation schema
    const schema = z.object({
      nameTh: z.string().min(2, t('validation.nameMin', 'Name must be at least 2 characters')),
      nameEn: z.string().min(2, t('validation.nameMin', 'Name must be at least 2 characters')),
      estimatedMinutes: z.number().min(1),
      category: z.string().min(1),
    });

    const parsed = schema.safeParse({
      nameTh,
      nameEn,
      estimatedMinutes: Number(estimatedMinutes),
      category,
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
      const payload: Omit<CreateSubServiceInput, 'tenantId'> = {
        name: {
          th: nameTh.trim(),
          en: nameEn.trim(),
        },
        icon,
        estimatedMinutes: Number(estimatedMinutes),
        category: category.trim(),
      };
      await onSubmit(payload);
    } catch (err: any) {
      setServerError(err?.message || t('common.errorConnection'));
    }
  };

  const renderIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.HelpCircle;
    return <IconComponent className="w-5 h-5" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/80">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {initialData ? t('pages.subServices.editSubService', 'Edit Sub-Service') : t('pages.subServices.addSubService', 'Add Sub-Service')}
            </h3>
            <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
              {t('pages.subServices.formSubtitle', 'Configure template workflow steps and details')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-655 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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

            {/* Names Input */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                  {t('pages.subServices.form.nameThLabel', 'Sub-Service Name (Thai)')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nameTh}
                  onChange={(e) => setNameTh(e.target.value)}
                  placeholder={t('pages.subServices.form.nameThPlaceholder', 'เช่น ชำระเงิน, คัดกรอง')}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                />
                {errors.nameTh && <p className="text-xs text-red-500 mt-1">{errors.nameTh}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                  {t('pages.subServices.form.nameEnLabel', 'Sub-Service Name (English)')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder={t('pages.subServices.form.nameEnPlaceholder', 'e.g. Payment, Screening')}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                />
                {errors.nameEn && <p className="text-xs text-red-500 mt-1">{errors.nameEn}</p>}
              </div>
            </div>

            {/* Category & Estimated Minutes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                  {t('pages.subServices.form.categoryLabel', 'Category')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder={t('pages.subServices.form.categoryPlaceholder', 'e.g. clinical, billing')}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                />
                {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-705 dark:text-slate-350 mb-1.5">
                  {t('pages.subServices.form.durationLabel', 'Estimated Duration (Minutes)')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                  min={1}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                />
                {errors.estimatedMinutes && <p className="text-xs text-red-500 mt-1">{errors.estimatedMinutes}</p>}
              </div>
            </div>

            {/* Icon Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-2">
                {t('pages.subServices.form.iconLabel', 'Select Icon')}
              </label>
              <div className="grid grid-cols-6 gap-2">
                {AVAILABLE_ICONS.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setIcon(iconName)}
                    className={`p-3 flex items-center justify-center rounded-xl border transition-all cursor-pointer ${
                      icon === iconName
                        ? 'bg-brand-50 dark:bg-brand-950/40 border-brand-555 text-brand-655 dark:text-brand-400 ring-2 ring-brand-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-750'
                    }`}
                    title={iconName}
                  >
                    {renderIcon(iconName)}
                  </button>
                ))}
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
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1.5 py-2 px-5 bg-brand-655 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-md shadow-brand-655/15 transition-all cursor-pointer"
            >
              {isLoading ? (
                <span>{t('common.loading')}</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{initialData ? t('pages.subServices.form.submitUpdate', 'Save Changes') : t('pages.subServices.form.submitCreate', 'Create Sub-Service')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
