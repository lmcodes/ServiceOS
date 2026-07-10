import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { useLogin } from '@/features/auth/hooks/useLogin';
import { useTranslation } from 'react-i18next';

// ─── Validation Schema ─────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type LoginFields = z.infer<typeof loginSchema>;
type FieldErrors = Partial<Record<keyof LoginFields, string>>;

// ─── Google Icon SVG ───────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

// ─── Input Field Component ─────────────────────────────────────────────────────
interface InputFieldProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  icon: React.ReactNode;
  placeholder?: string;
  rightElement?: React.ReactNode;
  autoComplete?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  id, label, type, value, onChange, error, icon, placeholder, rightElement, autoComplete,
}) => (
  <div>
    <label htmlFor={id} className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
      {label}
    </label>
    <div className="relative">
      <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 dark:text-slate-500">
        {icon}
      </span>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={`w-full bg-white dark:bg-slate-900 border ${
          error ? 'border-danger/50 focus:border-danger' : 'border-slate-200 dark:border-slate-700 focus:border-brand-500'
        } text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 text-sm rounded-lg py-2.5 pl-9 pr-${rightElement ? '10' : '3'} 
        outline-none transition-all duration-200 focus:ring-1 ${
          error ? 'focus:ring-danger/30' : 'focus:ring-brand-500/30'
        }`}
      />
      {rightElement && (
        <span className="absolute inset-y-0 right-3 flex items-center">{rightElement}</span>
      )}
    </div>
    {error && (
      <p className="mt-1.5 text-xs text-danger flex items-center gap-1">
        <AlertCircle className="w-3 h-3 flex-shrink-0" />
        {error}
      </p>
    )}
  </div>
);

// ─── LoginForm ─────────────────────────────────────────────────────────────────
export const LoginForm: React.FC = () => {
  const { emailMutation, googleMutation } = useLogin();
  const { t } = useTranslation();

  const [fields, setFields] = useState<LoginFields>({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    // Clear individual field error on change
    if (fieldErrors[name as keyof LoginFields]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    setServerError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const parsed = loginSchema.safeParse(fields);
    if (!parsed.success) {
      const errors: FieldErrors = {};
      parsed.error.errors.forEach((err) => {
        const key = err.path[0] as keyof LoginFields;
        if (key === 'email') {
          errors.email = t('validation.emailInvalid');
        } else if (key === 'password') {
          errors.password = t('validation.passwordMin');
        }
      });
      setFieldErrors(errors);
      return;
    }

    try {
      const result = await emailMutation.mutateAsync(fields);
      if (result.error) setServerError(result.error);
    } catch {
      setServerError(t('common.errorConnection'));
    }
  };

  const handleGoogle = async () => {
    setServerError(null);
    try {
      const result = await googleMutation.mutateAsync();
      if (result.error) setServerError(result.error);
    } catch {
      setServerError(t('common.errorConnection'));
    }
  };

  const isLoading = emailMutation.isPending || googleMutation.isPending;

  return (
    <div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-white text-center mb-1">{t('login.title')}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6">
        {t('login.subtitle')}
      </p>

      {/* Server Error Banner */}
      {serverError && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-xs text-danger">{serverError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <InputField
          id="email"
          label={t('login.emailLabel')}
          type="email"
          value={fields.email}
          onChange={handleChange}
          error={fieldErrors.email}
          icon={<Mail className="w-4 h-4" />}
          placeholder="your@email.com"
          autoComplete="email"
        />

        <InputField
          id="password"
          label={t('login.passwordLabel')}
          type={showPassword ? 'text' : 'password'}
          value={fields.password}
          onChange={handleChange}
          error={fieldErrors.password}
          icon={<Lock className="w-4 h-4" />}
          placeholder="••••••••"
          autoComplete="current-password"
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 transition-colors"
              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-xs text-brand-600 dark:text-brand-500 hover:text-brand-500 dark:hover:text-brand-400 font-medium transition-colors"
          >
            {t('login.forgotPasswordLink')}
          </Link>
        </div>

        <button
          type="submit"
          id="login-submit-btn"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-brand-600 hover:bg-brand-500 
          disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold 
          transition-all duration-200 shadow-lg shadow-brand-600/20"
        >
          {emailMutation.isPending ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <LogIn className="w-4 h-4" />
          )}
          {emailMutation.isPending ? t('common.loading') : t('login.loginButton')}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-slate-800" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-xs text-slate-500 rounded">
            {t('common.or')}
          </span>
        </div>
      </div>

      {/* Google Sign In */}
      <button
        type="button"
        id="login-google-btn"
        onClick={handleGoogle}
        disabled={isLoading}
        className="w-full flex items-center justify-center py-2.5 px-4 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 
        disabled:opacity-50 disabled:cursor-not-allowed border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg 
        text-sm font-medium transition-all duration-200"
      >
        {googleMutation.isPending ? (
          <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mr-2" />
        ) : (
          <GoogleIcon />
        )}
        {googleMutation.isPending ? t('common.loading') : t('login.googleSignIn')}
      </button>

      {/* Sign Up Link */}
      <p className="mt-6 text-center text-xs text-slate-500">
        {t('login.noAccount')}{' '}
        <Link to="/signup" className="text-brand-600 dark:text-brand-500 hover:text-brand-500 dark:hover:text-brand-400 font-semibold transition-colors">
          {t('login.signUpLink')}
        </Link>
      </p>
    </div>
  );
};

export default LoginForm;
