import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { z } from 'zod';
import { useSignup } from '@/features/auth/hooks/useSignup';

// ─── Validation Schema ─────────────────────────────────────────────────────────
const signupSchema = z
  .object({
    name: z.string().min(2, 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร'),
    email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
    password: z.string().min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'รหัสผ่านไม่ตรงกัน',
    path: ['confirmPassword'],
  });

type SignupFields = z.infer<typeof signupSchema>;
type FieldErrors = Partial<Record<keyof SignupFields, string>>;

// ─── Password Strength Indicator ───────────────────────────────────────────────
const getPasswordStrength = (password: string): { level: number; label: string; color: string } => {
  if (password.length === 0) return { level: 0, label: '', color: '' };
  if (password.length < 6) return { level: 1, label: 'อ่อน', color: 'bg-danger' };
  if (password.length < 8 && !/\d/.test(password)) return { level: 2, label: 'ปานกลาง', color: 'bg-warning' };
  if (password.length >= 8 && /\d/.test(password) && /[A-Z]/.test(password))
    return { level: 4, label: 'แข็งแกร่ง', color: 'bg-success' };
  return { level: 3, label: 'ดี', color: 'bg-brand-500' };
};

// ─── Google Icon SVG ───────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

// ─── SignupForm ────────────────────────────────────────────────────────────────
export const SignupForm: React.FC = () => {
  const { emailMutation, googleMutation } = useSignup();

  const [fields, setFields] = useState<SignupFields>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const passwordStrength = getPasswordStrength(fields.password);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof SignupFields]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    setServerError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const parsed = signupSchema.safeParse(fields);
    if (!parsed.success) {
      const errors: FieldErrors = {};
      parsed.error.errors.forEach((err) => {
        const key = err.path[0] as keyof SignupFields;
        if (!errors[key]) errors[key] = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    try {
      const result = await emailMutation.mutateAsync({
        name: fields.name,
        email: fields.email,
        password: fields.password,
      });
      if (result.error) setServerError(result.error);
    } catch {
      setServerError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleGoogle = async () => {
    setServerError(null);
    try {
      const result = await googleMutation.mutateAsync();
      if (result.error) setServerError(result.error);
    } catch {
      setServerError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    }
  };

  const isLoading = emailMutation.isPending || googleMutation.isPending;

  return (
    <div>
      <h3 className="text-xl font-bold text-white text-center mb-1">สร้างบัญชีใหม่</h3>
      <p className="text-xs text-slate-500 text-center mb-6">เริ่มต้นใช้ ServiceOS ฟรี ไม่ต้องใส่บัตรเครดิต</p>

      {/* Server Error Banner */}
      {serverError && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-xs text-danger">{serverError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Full Name */}
        <div>
          <label htmlFor="name" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            ชื่อ-นามสกุล
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
              <User className="w-4 h-4" />
            </span>
            <input
              id="name"
              name="name"
              type="text"
              value={fields.name}
              onChange={handleChange}
              autoComplete="name"
              placeholder="ชื่อของคุณ"
              className={`w-full bg-slate-900 border ${fieldErrors.name ? 'border-danger/50 focus:border-danger focus:ring-danger/30' : 'border-slate-700 focus:border-brand-500 focus:ring-brand-500/30'} text-white placeholder-slate-600 text-sm rounded-lg py-2.5 pl-9 pr-3 outline-none transition-all duration-200 focus:ring-1`}
            />
          </div>
          {fieldErrors.name && (
            <p className="mt-1.5 text-xs text-danger flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{fieldErrors.name}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="signup-email" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            อีเมล
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
              <Mail className="w-4 h-4" />
            </span>
            <input
              id="signup-email"
              name="email"
              type="email"
              value={fields.email}
              onChange={handleChange}
              autoComplete="email"
              placeholder="your@email.com"
              className={`w-full bg-slate-900 border ${fieldErrors.email ? 'border-danger/50 focus:border-danger focus:ring-danger/30' : 'border-slate-700 focus:border-brand-500 focus:ring-brand-500/30'} text-white placeholder-slate-600 text-sm rounded-lg py-2.5 pl-9 pr-3 outline-none transition-all duration-200 focus:ring-1`}
            />
          </div>
          {fieldErrors.email && (
            <p className="mt-1.5 text-xs text-danger flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{fieldErrors.email}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="signup-password" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            รหัสผ่าน
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
              <Lock className="w-4 h-4" />
            </span>
            <input
              id="signup-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={fields.password}
              onChange={handleChange}
              autoComplete="new-password"
              placeholder="อย่างน้อย 6 ตัวอักษร"
              className={`w-full bg-slate-900 border ${fieldErrors.password ? 'border-danger/50 focus:border-danger focus:ring-danger/30' : 'border-slate-700 focus:border-brand-500 focus:ring-brand-500/30'} text-white placeholder-slate-600 text-sm rounded-lg py-2.5 pl-9 pr-10 outline-none transition-all duration-200 focus:ring-1`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
              aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {/* Password Strength Bar */}
          {fields.password.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      level <= passwordStrength.level ? passwordStrength.color : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
              <p className={`text-xs ${passwordStrength.level <= 1 ? 'text-danger' : passwordStrength.level === 2 ? 'text-warning' : passwordStrength.level === 3 ? 'text-brand-500' : 'text-success'}`}>
                ความปลอดภัย: {passwordStrength.label}
              </p>
            </div>
          )}
          {fieldErrors.password && (
            <p className="mt-1.5 text-xs text-danger flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{fieldErrors.password}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            ยืนยันรหัสผ่าน
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
              <Lock className="w-4 h-4" />
            </span>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              value={fields.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              placeholder="พิมพ์รหัสผ่านอีกครั้ง"
              className={`w-full bg-slate-900 border ${fieldErrors.confirmPassword ? 'border-danger/50 focus:border-danger focus:ring-danger/30' : fields.confirmPassword && fields.confirmPassword === fields.password ? 'border-success/50 focus:border-success focus:ring-success/30' : 'border-slate-700 focus:border-brand-500 focus:ring-brand-500/30'} text-white placeholder-slate-600 text-sm rounded-lg py-2.5 pl-9 pr-10 outline-none transition-all duration-200 focus:ring-1`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
            >
              {fields.confirmPassword && fields.confirmPassword === fields.password ? (
                <CheckCircle2 className="w-4 h-4 text-success" />
              ) : showConfirm ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {fieldErrors.confirmPassword && (
            <p className="mt-1.5 text-xs text-danger flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{fieldErrors.confirmPassword}
            </p>
          )}
        </div>

        <button
          type="submit"
          id="signup-submit-btn"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-brand-600 hover:bg-brand-500 
          disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold 
          transition-all duration-200 shadow-lg shadow-brand-600/20 mt-2"
        >
          {emailMutation.isPending ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          {emailMutation.isPending ? 'กำลังสร้างบัญชี...' : 'สร้างบัญชี'}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-800" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 bg-slate-800/70 text-xs text-slate-500 rounded">หรือ</span>
        </div>
      </div>

      {/* Google Sign Up */}
      <button
        type="button"
        id="signup-google-btn"
        onClick={handleGoogle}
        disabled={isLoading}
        className="w-full flex items-center justify-center py-2.5 px-4 bg-slate-800 hover:bg-slate-700 
        disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 text-slate-200 rounded-lg 
        text-sm font-medium transition-all duration-200"
      >
        {googleMutation.isPending ? (
          <div className="w-4 h-4 border-2 border-slate-500 border-t-slate-200 rounded-full animate-spin mr-2" />
        ) : (
          <GoogleIcon />
        )}
        {googleMutation.isPending ? 'กำลังเชื่อมต่อ...' : 'สมัครด้วย Google'}
      </button>

      <p className="mt-6 text-center text-xs text-slate-500">
        มีบัญชีอยู่แล้ว?{' '}
        <Link to="/login" className="text-brand-500 hover:text-brand-400 font-semibold transition-colors">
          เข้าสู่ระบบ
        </Link>
      </p>
    </div>
  );
};

export default SignupForm;
