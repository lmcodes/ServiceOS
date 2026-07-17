import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { X, Plus, Trash2, Save, Sliders } from 'lucide-react';
import { Service, ServiceCustomField, Workflow, QueueRange } from '@/types/firestore';
import { CreateServiceInput } from '../types';

interface ServiceFormProps {
  initialData?: Service | null;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  isLoading: boolean;
  workflows: Workflow[];
  queueRanges: QueueRange[];
}

export const ServiceForm: React.FC<ServiceFormProps> = ({
  initialData,
  onClose,
  onSubmit,
  isLoading,
  workflows,
  queueRanges,
}) => {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState(initialData?.name || '');
  const [nameEn, setNameEn] = useState(initialData?.nameEn || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [descriptionEn, setDescriptionEn] = useState(initialData?.descriptionEn || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [estimatedDuration, setEstimatedDuration] = useState(initialData?.estimatedDurationMinutes || 15);
  const [requiresResource, setRequiresResource] = useState(initialData?.requiresResource ?? false);
  const [maxConcurrent, setMaxConcurrent] = useState(initialData?.maxConcurrent || 1);
  const [customFields, setCustomFields] = useState<ServiceCustomField[]>(initialData?.customFields || []);
  const [workflowId, setWorkflowId] = useState<string | null>(initialData?.workflowId || null);
  const [queueRangeId, setQueueRangeId] = useState<string | null>(initialData?.queueRangeId || null);
  const [requireName, setRequireName] = useState(initialData?.requireName ?? false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAddField = () => {
    const newField: ServiceCustomField = {
      key: `field_${Date.now()}`,
      label: '',
      type: 'text',
      required: false,
    };
    setCustomFields((prev) => [...prev, newField]);
  };

  const handleRemoveField = (index: number) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, key: keyof ServiceCustomField, value: any) => {
    setCustomFields((prev) =>
      prev.map((field, i) => {
        if (i === index) {
          const updated = { ...field, [key]: value };
          // If we change label, generate a clean key from the label string
          if (key === 'label') {
            updated.key = value
              .toLowerCase()
              .replace(/[^a-z0-9_]/g, '_')
              .replace(/_+/g, '_')
              .substring(0, 30) || `field_${Date.now()}`;
          }
          return updated;
        }
        return field;
      })
    );
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    // Validation schema
    const schema = z.object({
      name: z.string().min(2, t('validation.nameMin')),
      estimatedDuration: z.number().min(1),
      maxConcurrent: z.number().min(1),
    });

    const parsed = schema.safeParse({
      name,
      estimatedDuration: Number(estimatedDuration),
      maxConcurrent: Number(maxConcurrent),
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

    // Ensure custom fields have non-empty labels
    const invalidFields = customFields.some((f) => !f.label.trim());
    if (invalidFields) {
      setServerError('All custom field labels must be filled out.');
      return;
    }

    try {
      const payload: CreateServiceInput = {
        name,
        nameEn,
        description,
        descriptionEn,
        category,
        estimatedDurationMinutes: Number(estimatedDuration),
        requiresResource,
        maxConcurrent: Number(maxConcurrent),
        customFields: customFields.map((f) => ({
          ...f,
          label: f.label.trim(),
        })),
        workflowId,
        queueRangeId,
        requireName,
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
              {initialData ? t('pages.services.editService') : t('pages.services.addService')}
            </h3>
            <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
              {t('pages.services.subtitle')}
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

            {/* Basic Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                  {t('pages.services.form.nameLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('pages.services.form.namePlaceholder')}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                  {t('pages.services.form.nameEnLabel')}
                </label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder={t('pages.services.form.nameEnPlaceholder')}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                  {t('pages.services.form.categoryLabel')}
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder={t('pages.services.form.categoryPlaceholder')}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                  {t('pages.services.form.descriptionLabel')}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('pages.services.form.descriptionPlaceholder')}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none resize-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                  {t('pages.services.form.descriptionEnLabel')}
                </label>
                <textarea
                  value={descriptionEn}
                  onChange={(e) => setDescriptionEn(e.target.value)}
                  placeholder={t('pages.services.form.descriptionEnPlaceholder')}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-705 dark:text-slate-350 mb-1.5">
                  {t('pages.services.form.durationLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(Number(e.target.value))}
                  min={1}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                />
                {errors.estimatedDuration && <p className="text-xs text-red-500 mt-1">{errors.estimatedDuration}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                  {t('pages.services.form.maxConcurrentLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={maxConcurrent}
                  onChange={(e) => setMaxConcurrent(Number(e.target.value))}
                  min={1}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                />
                {errors.maxConcurrent && <p className="text-xs text-red-500 mt-1">{errors.maxConcurrent}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                  Workflow Template
                </label>
                <select
                  value={workflowId || ''}
                  onChange={(e) => setWorkflowId(e.target.value || null)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none cursor-pointer"
                >
                  <option value="">None (Standard Single Stage)</option>
                  {workflows.map((wf) => (
                    <option key={wf.id} value={wf.id}>
                      {wf.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                  {t('pages.services.form.queueRangeLabel')}
                </label>
                <select
                  value={queueRangeId || ''}
                  onChange={(e) => setQueueRangeId(e.target.value || null)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none cursor-pointer"
                >
                  <option value="">{t('pages.services.form.queueRangeNone')}</option>
                  {queueRanges.map((qr) => (
                    <option key={qr.id} value={qr.id}>
                      {qr.prefix ? `[${qr.prefix}] ` : ''}{qr.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                  {t('pages.services.form.queueRangeHint')}
                </p>
              </div>
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-xl">
                <span className="text-xs text-slate-750 dark:text-slate-350">
                  {t('pages.services.form.requiresResource')}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresResource}
                    onChange={(e) => setRequiresResource(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:height-4 after:w-4 after:h-4 after:transition-all dark:border-slate-600 peer-checked:bg-brand-655 cursor-pointer"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-xl">
                <span className="text-xs text-slate-750 dark:text-slate-350">
                  {t('pages.services.form.requireName', 'Require Customer Name on Kiosk/QR')}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireName}
                    onChange={(e) => setRequireName(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:height-4 after:w-4 after:h-4 after:transition-all dark:border-slate-600 peer-checked:bg-brand-655 cursor-pointer"></div>
                </label>
              </div>
            </div>

            {/* Custom Fields Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-850 dark:text-white flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-brand-500" />
                  {t('pages.services.form.customFieldsTitle')}
                </h4>
                <button
                  type="button"
                  onClick={handleAddField}
                  className="flex items-center gap-1 py-1.5 px-3 bg-brand-50 dark:bg-brand-950/40 text-brand-655 dark:text-brand-400 hover:bg-brand-100/50 dark:hover:bg-brand-900/30 border border-brand-100 dark:border-brand-900/40 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('pages.services.form.addField')}</span>
                </button>
              </div>

              {customFields.length === 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                  No questions defined yet. Add custom fields if you want to request info during registration.
                </p>
              )}

              {customFields.length > 0 && (
                <div className="space-y-3.5">
                  {customFields.map((field, index) => (
                    <div
                      key={field.key}
                      className="p-4 bg-slate-50/70 dark:bg-slate-800/20 border border-slate-200/60 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center gap-3 relative"
                    >
                      {/* Question Label */}
                      <div className="flex-1">
                        <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          {t('pages.services.form.fieldLabel')}
                        </label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
                          placeholder={t('pages.services.form.fieldPlaceholder')}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs text-slate-900 dark:text-white outline-none"
                        />
                      </div>

                      {/* Input Type */}
                      <div className="w-full md:w-44">
                        <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          {t('pages.services.form.fieldType')}
                        </label>
                        <select
                          value={field.type}
                          onChange={(e) => handleFieldChange(index, 'type', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs text-slate-900 dark:text-white outline-none"
                        >
                          <option value="text">{t('pages.services.fieldTypes.text')}</option>
                          <option value="number">{t('pages.services.fieldTypes.number')}</option>
                          <option value="checkbox">{t('pages.services.fieldTypes.checkbox')}</option>
                          <option value="textarea">{t('pages.services.fieldTypes.textarea')}</option>
                        </select>
                      </div>

                      {/* Required Checkbox */}
                      <div className="flex items-center gap-2 pt-4 md:pt-2">
                        <input
                          type="checkbox"
                          id={`required-${field.key}`}
                          checked={field.required}
                          onChange={(e) => handleFieldChange(index, 'required', e.target.checked)}
                          className="w-4 h-4 text-brand-600 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 rounded-md focus:ring-brand-500 cursor-pointer"
                        />
                        <label
                          htmlFor={`required-${field.key}`}
                          className="text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
                        >
                          {t('pages.services.form.fieldRequired')}
                        </label>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveField(index)}
                        className="absolute md:relative top-4 right-4 md:top-auto md:right-auto md:mt-4 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-955/20 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold text-sm rounded-xl transition-colors cursor-pointer"
            >
              {t('pages.services.form.cancel')}
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
                  <span>{initialData ? t('pages.services.form.submitUpdate') : t('pages.services.form.submitCreate')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default ServiceForm;
