import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import ProtectedRoute from '@/routes/ProtectedRoute';
import { useTranslation } from '@/context/LanguageContext';

// Layouts
import DashboardLayout from '@/layouts/DashboardLayout';
import AuthLayout from '@/layouts/AuthLayout';
import PublicLayout from '@/layouts/PublicLayout';
import DisplayLayout from '@/layouts/DisplayLayout';

// Auth Feature
import LoginForm from '@/features/auth/components/LoginForm';
import SignupForm from '@/features/auth/components/SignupForm';
import ForgotPasswordForm from '@/features/auth/components/ForgotPasswordForm';
import OnboardingForm from '@/features/auth/components/OnboardingForm';

// Mock Skeleton Pages (Not implementing business logic)
const MockLanding: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="text-center py-12">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4">{t('landingTitle')}</h1>
      <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
        {t('landingSubtitle')}
      </p>
      <div className="flex justify-center space-x-4">
        <Link to="/login" className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-semibold transition-all shadow-md shadow-brand-600/10">
          {t('landingLoginBtn')}
        </Link>
        <Link to="/join/branch-abc" className="px-5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold transition-all shadow-sm">
          {t('landingTryQRBtn')}
        </Link>
      </div>
    </div>
  );
};

const MockQRJoin: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="glass-panel p-6 rounded-2xl">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('qrJoinTitle')}</h3>
      <p className="text-xs text-slate-550 dark:text-slate-400 mb-6">{t('qrJoinSubtitle')}</p>
      <div className="space-y-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl">
          <span className="text-[10px] uppercase font-bold text-slate-450 dark:text-slate-500 tracking-wider">{t('activeBranchLabel')}</span>
          <h4 className="font-bold text-slate-800 dark:text-white text-sm mt-0.5">{t('mockBranchName')}</h4>
        </div>
        <Link
          to="/status/ticket-123"
          className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-semibold transition-all text-center block shadow-md shadow-brand-600/10"
        >
          {t('mockJoinTicketBtn')}
        </Link>
      </div>
    </div>
  );
};

const MockTicketStatus: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="glass-panel p-6 rounded-2xl text-center">
      <span className="text-[10px] uppercase font-bold text-slate-450 dark:text-slate-500 tracking-widest">{t('ticketStatusLabel')}</span>
      <h3 className="text-5xl font-extrabold text-brand-600 dark:text-brand-500 my-4">A-042</h3>
      <div className="p-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-500/20 rounded-xl mb-6">
        <p className="text-xs text-brand-600 dark:text-brand-400 font-medium">
          {t('peopleAheadLabel').replace('{count}', '1').replace('{mins}', '5')}
        </p>
      </div>
      <div className="flex justify-center space-x-2.5">
        <button 
          onClick={() => alert(t('ticketCancelledAlert'))}
          className="flex-1 py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-danger/10 hover:text-danger hover:border-danger/20 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-all cursor-pointer"
        >
          {t('cancelTicketBtn')}
        </button>
      </div>
    </div>
  );
};

const MockTVDisplay: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-300">{t('mockBranchName')} ({t('tvDisplayTitle')})</h2>
        <span className="text-2xl font-extrabold text-brand-600 dark:text-brand-500">ServiceOS</span>
      </div>

      {/* TV Screen Grid */}
      <div className="grid grid-cols-2 gap-8 my-8 flex-1">
        {/* Called Box */}
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex flex-col justify-between items-center text-center shadow-sm">
          <span className="text-sm font-bold text-warning uppercase tracking-widest">{t('nowCallingLabel')}</span>
          <h1 className="text-[120px] font-black text-warning leading-none animate-pulse">A-041</h1>
          <span className="text-xl text-slate-700 dark:text-slate-400 font-semibold">{t('proceedToCounterLabel').replace('{counter}', '3')}</span>
        </div>

        {/* Waiting list */}
        <div className="bg-white/50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800/50 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-widest text-center">{t('waitingListLabel')}</h3>
          <div className="grid grid-cols-2 gap-3 text-center">
            {['A-042', 'A-043', 'A-044', 'B-012', 'A-045'].map((num, i) => (
              <div key={num} className={`p-4 rounded-xl font-bold text-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 ${i === 0 ? 'text-slate-900 dark:text-white border-brand-500/30' : 'text-slate-450 dark:text-slate-500'}`}>
                {num}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer ticker */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex items-center justify-between text-slate-550 dark:text-slate-500 text-sm font-medium">
        <span>{t('haveTicketReadyLabel')}</span>
        <span>{new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
};

// Staff Panels
const MockQueuesConsole: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('queueControlBoardTitle')}</h2>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">{t('queueControlBoardSubtitle')}</p>
        </div>
        <button 
          onClick={() => alert(t('callNextActionTriggeredAlert'))}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-semibold transition-all shadow-md shadow-brand-600/10 cursor-pointer"
        >
          {t('callNextTicketBtn')}
        </button>
      </div>

      {/* Cards overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('waitingCustomersLabel')}</h4>
          <p className="text-3xl font-black text-slate-900 dark:text-white">12</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('activeServingLabel')}</h4>
          <p className="text-3xl font-black text-success">2</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('avgWaitTimeLabel')}</h4>
          <p className="text-3xl font-black text-brand-600 dark:text-brand-500">14m</p>
        </div>
      </div>
    </div>
  );
};

const MockAppointments: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('appointmentScheduleTitle')}</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{t('appointmentScheduleSubtitle')}</p>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center text-slate-500 shadow-sm">
        {t('appointmentPlaceholder')}
      </div>
    </div>
  );
};

const MockBranches: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('branchesTitle')}</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{t('branchesSubtitle')}</p>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center text-slate-500 shadow-sm">
        {t('branchesPlaceholder')}
      </div>
    </div>
  );
};

const MockServices: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('servicesTitle')}</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{t('servicesSubtitle')}</p>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center text-slate-500 shadow-sm">
        {t('servicesPlaceholder')}
      </div>
    </div>
  );
};

const MockStaff: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('staffTitle')}</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{t('staffSubtitle')}</p>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center text-slate-500 shadow-sm">
        {t('staffPlaceholder')}
      </div>
    </div>
  );
};

const MockSettings: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('tenantSettingsTitle')}</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{t('tenantSettingsSubtitle')}</p>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center text-slate-500 shadow-sm">
        {t('settingsPlaceholder')}
      </div>
    </div>
  );
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<MockLanding />} />
        <Route path="/join/:branchId" element={<MockQRJoin />} />
        <Route path="/status/:ticketId" element={<MockTicketStatus />} />
      </Route>

      {/* Auth Pages */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/signup" element={<SignupForm />} />
        <Route path="/forgot-password" element={<ForgotPasswordForm />} />
      </Route>

      {/* Onboarding (new user — no role/claims yet) */}
      <Route path="/onboarding" element={<OnboardingForm />} />

      {/* Public TV Display Screen */}
      <Route element={<DisplayLayout />}>
        <Route path="/display/:branchId" element={<MockTVDisplay />} />
      </Route>


      {/* Protected Dashboard Pages */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard/queues" replace />} />
        <Route path="queues" element={<MockQueuesConsole />} />
        <Route path="appointments" element={<MockAppointments />} />
        
        {/* Branch settings (Manager, Admin, Owner) */}
        <Route 
          path="branches" 
          element={
            <ProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
              <MockBranches />
            </ProtectedRoute>
          } 
        />
        
        {/* Core settings (Admin, Owner) */}
        <Route 
          path="services" 
          element={
            <ProtectedRoute allowedRoles={['owner', 'admin']}>
              <MockServices />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="staff" 
          element={
            <ProtectedRoute allowedRoles={['owner', 'admin']}>
              <MockStaff />
            </ProtectedRoute>
          } 
        />

        {/* Global settings (Owner only) */}
        <Route 
          path="settings" 
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <MockSettings />
            </ProtectedRoute>
          } 
        />
      </Route>

      {/* Fallback Catch-All */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
