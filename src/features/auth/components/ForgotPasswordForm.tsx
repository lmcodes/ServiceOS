import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, AlertCircle, CheckCircle2, Send } from 'lucide-react';
import { z } from 'zod';
import { sendPasswordReset } from '@/features/auth/repository/authRepository';

const emailSchema = z.object({
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
});

export const ForgotPasswordForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setServerError(null);

    const parsed = emailSchema.safeParse({ email });
    if (!parsed.success) {
      setEmailError(parsed.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    const result = await sendPasswordReset(email);
    setIsLoading(false);

    if (result.error) {
      setServerError(result.error);
    } else {
      setIsSent(true);
    }
  };

  if (isSent) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-success" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">ส่งอีเมลแล้ว!</h3>
        <p className="text-sm text-slate-400 mb-1">
          เราส่งลิงก์รีเซ็ตรหัสผ่านไปที่
        </p>
        <p className="text-sm font-semibold text-white mb-6">{email}</p>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          กรุณาตรวจสอบกล่องจดหมาย (รวมถึงโฟลเดอร์ Spam)
          ลิงก์จะหมดอายุภายใน 1 ชั่วโมง
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-brand-500 hover:text-brand-400 font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xl font-bold text-white text-center mb-1">ลืมรหัสผ่าน?</h3>
      <p className="text-xs text-slate-500 text-center mb-6 leading-relaxed">
        ใส่อีเมลที่ลงทะเบียนไว้ เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้
      </p>

      {serverError && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-xs text-danger">{serverError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="reset-email" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            อีเมล
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
              <Mail className="w-4 h-4" />
            </span>
            <input
              id="reset-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(null); setServerError(null); }}
              autoComplete="email"
              placeholder="your@email.com"
              className={`w-full bg-slate-900 border ${emailError ? 'border-danger/50 focus:border-danger focus:ring-danger/30' : 'border-slate-700 focus:border-brand-500 focus:ring-brand-500/30'} text-white placeholder-slate-600 text-sm rounded-lg py-2.5 pl-9 pr-3 outline-none transition-all duration-200 focus:ring-1`}
            />
          </div>
          {emailError && (
            <p className="mt-1.5 text-xs text-danger flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{emailError}
            </p>
          )}
        </div>

        <button
          type="submit"
          id="forgot-password-submit-btn"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-brand-600 hover:bg-brand-500 
          disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold 
          transition-all duration-200 shadow-lg shadow-brand-600/20"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {isLoading ? 'กำลังส่ง...' : 'ส่งลิงก์รีเซ็ต'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;
