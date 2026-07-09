import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOnboarding } from '@/features/auth/hooks/useOnboarding';
import { Building2, Briefcase, Phone, Clock, LogOut, AlertCircle, Sparkles } from 'lucide-react';
import { z } from 'zod';

// ─── Validation Schema ─────────────────────────────────────────────────────────
const onboardingSchema = z.object({
  name: z.string().min(2, 'ชื่อธุรกิจต้องมีอย่างน้อย 2 ตัวอักษร'),
  businessType: z.enum(['restaurant', 'clinic', 'salon', 'repair_shop', 'service_center'], {
    errorMap: () => ({ message: 'กรุณาเลือกประเภทธุรกิจ' }),
  }),
  phone: z
    .string()
    .min(9, 'เบอร์โทรศัพท์ต้องมี 9-10 หลัก')
    .max(10, 'เบอร์โทรศัพท์ต้องมี 9-10 หลัก')
    .regex(/^0[0-9]{8,9}$/, 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (เช่น 0812345678)'),
  timezone: z.string().min(1, 'กรุณาเลือกเขตเวลา'),
});

type OnboardingFields = z.infer<typeof onboardingSchema>;
type FieldErrors = Partial<Record<keyof OnboardingFields, string>>;

const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'ร้านอาหาร / คาเฟ่' },
  { value: 'clinic', label: 'คลินิก (การแพทย์ / เสริมความงาม)' },
  { value: 'salon', label: 'ร้านทำผม / เสริมสวย / สปา' },
  { value: 'repair_shop', label: 'ร้านซ่อมบำรุง / อู่ซ่อมรถ' },
  { value: 'service_center', label: 'ศูนย์บริการลูกค้า / เคาน์เตอร์ประชาสัมพันธ์' },
];

const TIMEZONES = [
  { value: 'Asia/Bangkok', label: 'กรุงเทพฯ (ICT - UTC+07:00)' },
  { value: 'Asia/Vientiane', label: 'เวียงจันทน์ (ICT - UTC+07:00)' },
  { value: 'Asia/Singapore', label: 'สิงคโปร์ (SGT - UTC+08:00)' },
  { value: 'Asia/Kuala_Lumpur', label: 'กัวลาลัมเปอร์ (MYT - UTC+08:00)' },
  { value: 'Asia/Jakarta', label: 'จาการ์ตา (WIB - UTC+07:00)' },
  { value: 'Asia/Manila', label: 'มะนิลา (PHT - UTC+08:00)' },
  { value: 'Asia/Tokyo', label: 'โตเกียว (JST - UTC+09:00)' },
  { value: 'UTC', label: 'เวลามาตรฐานสากล (UTC)' },
];

export const OnboardingForm: React.FC = () => {
  const { logout } = useAuth();
  const onboardingMutation = useOnboarding();

  const [fields, setFields] = useState<OnboardingFields>({
    name: '',
    businessType: 'restaurant',
    phone: '',
    timezone: 'Asia/Bangkok',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof OnboardingFields]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    setServerError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const parsed = onboardingSchema.safeParse(fields);
    if (!parsed.success) {
      const errors: FieldErrors = {};
      parsed.error.errors.forEach((err) => {
        const key = err.path[0] as keyof OnboardingFields;
        if (!errors[key]) errors[key] = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    try {
      const result = await onboardingMutation.mutateAsync(fields);
      if (result.error) {
        setServerError(result.error);
      }
    } catch (err) {
      setServerError('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const isPending = onboardingMutation.isPending;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Blurs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-brand-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-success/5 blur-[120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center px-4">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 mb-4 shadow-inner">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          ยินดีต้อนรับสู่ ServiceOS
        </h2>
        <p className="mt-2 text-sm text-slate-400 max-w-sm mx-auto">
          กรอกข้อมูลโปรไฟล์ธุรกิจของคุณ เพื่อเริ่มต้นสร้างระบบคิวและบอร์ดควบคุมสาขา
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="glass-panel py-8 px-6 sm:px-10 rounded-2xl">
          {serverError && (
            <div className="mb-6 p-3 rounded-lg bg-danger/10 border border-danger/20 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
              <p className="text-xs text-danger">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Business Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5"
              >
                ชื่อธุรกิจ / ชื่อร้านค้า
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
                  <Building2 className="w-4 h-4" />
                </span>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={fields.name}
                  onChange={handleChange}
                  placeholder="เช่น คลินิกรักดี, ร้านกาแฟสุขใจ"
                  className={`w-full bg-slate-900 border ${
                    fieldErrors.name
                      ? 'border-danger/50 focus:border-danger focus:ring-danger/30'
                      : 'border-slate-700 focus:border-brand-500 focus:ring-brand-500/30'
                  } text-white placeholder-slate-600 text-sm rounded-lg py-2.5 pl-9 pr-3 outline-none transition-all duration-200 focus:ring-1`}
                />
              </div>
              {fieldErrors.name && (
                <p className="mt-1.5 text-xs text-danger flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {fieldErrors.name}
                </p>
              )}
            </div>

            {/* Business Type */}
            <div>
              <label
                htmlFor="businessType"
                className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5"
              >
                ประเภทธุรกิจ
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
                  <Briefcase className="w-4 h-4" />
                </span>
                <select
                  id="businessType"
                  name="businessType"
                  value={fields.businessType}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-brand-500 focus:ring-brand-500/30 text-white text-sm rounded-lg py-2.5 pl-9 pr-3 outline-none transition-all duration-200 focus:ring-1 appearance-none cursor-pointer"
                >
                  {BUSINESS_TYPES.map((type) => (
                    <option key={type.value} value={type.value} className="bg-slate-950 text-white">
                      {type.label}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {fieldErrors.businessType && (
                <p className="mt-1.5 text-xs text-danger flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {fieldErrors.businessType}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label
                htmlFor="phone"
                className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5"
              >
                เบอร์โทรศัพท์ติดต่อ
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={fields.phone}
                  onChange={handleChange}
                  placeholder="เช่น 0812345678"
                  className={`w-full bg-slate-900 border ${
                    fieldErrors.phone
                      ? 'border-danger/50 focus:border-danger focus:ring-danger/30'
                      : 'border-slate-700 focus:border-brand-500 focus:ring-brand-500/30'
                  } text-white placeholder-slate-600 text-sm rounded-lg py-2.5 pl-9 pr-3 outline-none transition-all duration-200 focus:ring-1`}
                />
              </div>
              {fieldErrors.phone && (
                <p className="mt-1.5 text-xs text-danger flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {fieldErrors.phone}
                </p>
              )}
            </div>

            {/* Timezone */}
            <div>
              <label
                htmlFor="timezone"
                className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5"
              >
                เขตเวลาระบบ (Timezone)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
                  <Clock className="w-4 h-4" />
                </span>
                <select
                  id="timezone"
                  name="timezone"
                  value={fields.timezone}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-brand-500 focus:ring-brand-500/30 text-white text-sm rounded-lg py-2.5 pl-9 pr-3 outline-none transition-all duration-200 focus:ring-1 appearance-none cursor-pointer"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value} className="bg-slate-950 text-white">
                      {tz.label}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {fieldErrors.timezone && (
                <p className="mt-1.5 text-xs text-danger flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {fieldErrors.timezone}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-brand-600 hover:bg-brand-500 
              disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold 
              transition-all duration-200 shadow-lg shadow-brand-600/20 mt-4 cursor-pointer"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>กำลังบันทึกข้อมูล...</span>
                </>
              ) : (
                <span>สร้างพื้นที่ทำงานและถัดไป</span>
              )}
            </button>
          </form>

          {/* Footer Action to Switch Accounts */}
          <div className="mt-8 pt-5 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-500 mb-2">เข้าสู่ระบบด้วยบัญชีอื่น?</p>
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingForm;
