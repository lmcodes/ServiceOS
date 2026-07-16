import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ProtectedRoute from '@/routes/ProtectedRoute';

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

// Real Feature Components
import BranchListPage from '@/features/branches/components/BranchListPage';
import ServiceListPage from '@/features/services/components/ServiceListPage';
import JoinPage from '@/features/queues/components/JoinPage';
import TicketStatusPage from '@/features/queues/components/TicketStatusPage';
import QueueConsolePage from '@/features/queues/components/QueueConsolePage';
import { DisplayPage } from '@/features/queues/components/DisplayPage';
import { KioskPage } from '@/features/queues/components/KioskPage';
import { KioskSettingsPage } from '@/features/queues/components/KioskSettingsPage';
import { StaticQRPage } from '@/features/queues/components/StaticQRPage';
import StaffListPage from '@/features/staff/components/StaffListPage';
import QueueRangePage from '@/features/queueRanges/components/QueueRangePage';
import { SubServicePage } from '@/features/workflows/components/SubServicePage';


import { SettingsPage } from '@/features/settings/components/SettingsPage';
import CounterManagePage from '@/features/counters/components/CounterManagePage';
import CustomerGroupPage from '@/features/customerGroups/components/CustomerGroupPage';

// Appointments Feature
import BookingPage from '@/features/appointments/components/BookingPage';
import AppointmentsPage from '@/features/appointments/components/AppointmentsPage';

// Analytics & Billing Feature
import { AnalyticsPage } from '@/features/analytics/components/AnalyticsPage';
import { SubscriptionPage } from '@/features/billing/components/SubscriptionPage';

// Developer Portal Feature
import { DeveloperPage } from '@/features/developer/components/DeveloperPage';


// Mock Landing Page
const MockLanding: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="text-center py-12">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4">{t('pages.landing.title')}</h1>
      <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
        {t('pages.landing.subtitle')}
      </p>
      <div className="flex justify-center space-x-4">
        <Link to="/login" className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-semibold transition-all shadow-md shadow-brand-600/10">
          {t('pages.landing.loginBtn')}
        </Link>
        <Link to="/join/branch-abc" className="px-5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold transition-all shadow-sm">
          {t('pages.landing.tryQRBtn')}
        </Link>
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
        <Route path="/join/:branchId" element={<JoinPage />} />
        <Route path="/booking/:branchId" element={<BookingPage />} />
        <Route path="/status/:ticketId" element={<TicketStatusPage />} />
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
        <Route path="/display/:branchId" element={<DisplayPage />} />
        <Route path="/kiosk/:branchId" element={<KioskPage />} />
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
        <Route path="queues" element={<QueueConsolePage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        
        {/* Branch settings (Manager, Admin, Owner) */}
        <Route 
          path="branches" 
          element={
            <ProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
              <BranchListPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Core settings (Admin, Owner) */}
        <Route 
          path="services" 
          element={
            <ProtectedRoute allowedRoles={['owner', 'admin']}>
              <ServiceListPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="queue-ranges" 
          element={
            <ProtectedRoute allowedRoles={['owner', 'admin']}>
              <QueueRangePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="sub-services" 
          element={
            <ProtectedRoute allowedRoles={['owner', 'admin']}>
              <SubServicePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="counters" 
          element={
            <ProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
              <CounterManagePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="kiosk-settings" 
          element={
            <ProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
              <KioskSettingsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="static-qr" 
          element={
            <ProtectedRoute allowedRoles={['owner', 'admin', 'manager']}>
              <StaticQRPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="customer-groups" 
          element={
            <ProtectedRoute allowedRoles={['owner', 'admin']}>
              <CustomerGroupPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="staff" 
          element={
            <ProtectedRoute allowedRoles={['owner', 'admin']}>
              <StaffListPage />
            </ProtectedRoute>
          } 
        />

        {/* Global settings (Owner only) */}
        <Route 
          path="settings" 
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <SettingsPage />
            </ProtectedRoute>
          } 
        />

        {/* Analytics (Owner, Admin) */}
        <Route 
          path="analytics" 
          element={
            <ProtectedRoute allowedRoles={['owner', 'admin']}>
              <AnalyticsPage />
            </ProtectedRoute>
          } 
        />

        {/* Subscription & Billing (Owner only) */}
        <Route 
          path="subscription" 
          element={
            <ProtectedRoute allowedRoles={['owner']}>
              <SubscriptionPage />
            </ProtectedRoute>
          } 
        />

        {/* Developer Portal (Owner, Admin) */}
        <Route 
          path="developer" 
          element={
            <ProtectedRoute allowedRoles={['owner', 'admin']}>
              <DeveloperPage />
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

