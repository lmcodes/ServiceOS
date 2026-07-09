import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
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

// Mock Skeleton Pages (Not implementing business logic)
const MockLanding: React.FC = () => (
  <div className="text-center py-12">
    <h1 className="text-3xl font-extrabold text-white mb-4">Welcome to ServiceOS</h1>
    <p className="text-slate-400 mb-8 max-w-md mx-auto">
      Scaffolding and project structure verification.
    </p>
    <div className="flex justify-center space-x-4">
      <Link to="/login" className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-semibold transition-all">
        Go to Login
      </Link>
      <Link to="/join/branch-abc" className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-semibold transition-all">
        Try QR Check-in
      </Link>
    </div>
  </div>
);



const MockQRJoin: React.FC = () => (
  <div className="glass-panel p-6 rounded-2xl">
    <h3 className="text-lg font-bold text-white mb-2">QR Self Check-In</h3>
    <p className="text-xs text-slate-400 mb-6">Scan location entrance code to secure your queue ticket.</p>
    <div className="space-y-4">
      <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active Branch</span>
        <h4 className="font-bold text-white text-sm mt-0.5">Bangkok Main Office</h4>
      </div>
      <Link
        to="/status/ticket-123"
        className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-semibold transition-all text-center block"
      >
        Mock Join Ticket
      </Link>
    </div>
  </div>
);

const MockTicketStatus: React.FC = () => (
  <div className="glass-panel p-6 rounded-2xl text-center">
    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Queue Status</span>
    <h3 className="text-5xl font-extrabold text-brand-500 my-4">A-042</h3>
    <div className="p-3 bg-brand-900/20 border border-brand-500/20 rounded-xl mb-6">
      <p className="text-xs text-brand-400 font-medium">1 person ahead of you • Est: 5 mins</p>
    </div>
    <div className="flex justify-center space-x-2.5">
      <button 
        onClick={() => alert('Ticket cancelled')}
        className="flex-1 py-2 px-3 bg-slate-800 hover:bg-danger/10 hover:text-danger hover:border-danger/20 border border-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-all"
      >
        Cancel Ticket
      </button>
    </div>
  </div>
);

const MockTVDisplay: React.FC = () => (
  <div className="flex-1 flex flex-col justify-between h-full">
    {/* Header */}
    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
      <h2 className="text-2xl font-bold text-slate-300">Bangkok Main Office Queue</h2>
      <span className="text-2xl font-extrabold text-brand-500">ServiceOS</span>
    </div>

    {/* TV Screen Grid */}
    <div className="grid grid-cols-2 gap-8 my-8 flex-1">
      {/* Called Box */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 flex flex-col justify-between items-center text-center">
        <span className="text-sm font-bold text-warning uppercase tracking-widest">Now Calling</span>
        <h1 className="text-[120px] font-black text-warning leading-none animate-pulse">A-041</h1>
        <span className="text-xl text-slate-400 font-semibold">Proceed to Counter 3</span>
      </div>

      {/* Waiting list */}
      <div className="bg-slate-900/20 border border-slate-800/50 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-slate-400 mb-4 uppercase tracking-widest text-center">Waiting List</h3>
        <div className="grid grid-cols-2 gap-3 text-center">
          {['A-042', 'A-043', 'A-044', 'B-012', 'A-045'].map((num, i) => (
            <div key={num} className={`p-4 rounded-xl font-bold text-2xl bg-slate-900/40 border border-slate-800/80 ${i === 0 ? 'text-white border-brand-500/20' : 'text-slate-500'}`}>
              {num}
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Footer ticker */}
    <div className="border-t border-slate-800 pt-4 flex items-center justify-between text-slate-500 text-sm font-medium">
      <span>Please have your ticket ready</span>
      <span>{new Date().toLocaleTimeString()}</span>
    </div>
  </div>
);

// Staff Panels
const MockQueuesConsole: React.FC = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-white">Queue Control Board</h2>
        <p className="text-xs text-slate-400 mt-1">Summon customers, progress workflows, and track daily metrics.</p>
      </div>
      <button 
        onClick={() => alert('Call Next action triggered')}
        className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-semibold transition-all shadow-md shadow-brand-600/10"
      >
        Call Next Ticket
      </button>
    </div>

    {/* Cards overview */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Waiting Customers</h4>
        <p className="text-3xl font-black text-white">12</p>
      </div>
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Active Serving</h4>
        <p className="text-3xl font-black text-success">2</p>
      </div>
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Avg Wait Time</h4>
        <p className="text-3xl font-black text-brand-500">14m</p>
      </div>
    </div>
  </div>
);

const MockAppointments: React.FC = () => (
  <div>
    <h2 className="text-2xl font-bold text-white mb-2">Appointment Schedule</h2>
    <p className="text-sm text-slate-400 mb-6">Manage scheduled customers and check them into priority queues on arrival.</p>
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-500">
      Calendar slot reservations placeholder.
    </div>
  </div>
);

const MockBranches: React.FC = () => (
  <div>
    <h2 className="text-2xl font-bold text-white mb-2">Branch Locations</h2>
    <p className="text-sm text-slate-400 mb-6">Configure operating hours, timezones, and display screens per physical location.</p>
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-500">
      Branch CRUD control panel placeholder.
    </div>
  </div>
);

const MockServices: React.FC = () => (
  <div>
    <h2 className="text-2xl font-bold text-white mb-2">Branch Services</h2>
    <p className="text-sm text-slate-400 mb-6">Configure service prefixes, custom fields, and link workflow pipelines.</p>
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-500">
      Services settings placeholder.
    </div>
  </div>
);

const MockStaff: React.FC = () => (
  <div>
    <h2 className="text-2xl font-bold text-white mb-2">Staff Directory</h2>
    <p className="text-sm text-slate-400 mb-6">Invite team members and assign branch and role configurations.</p>
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-500">
      Staff directory table placeholder.
    </div>
  </div>
);

const MockSettings: React.FC = () => (
  <div>
    <h2 className="text-2xl font-bold text-white mb-2">Tenant Profile</h2>
    <p className="text-sm text-slate-400 mb-6">Manage tenant settings, brand colors, and Stripe subscriptions.</p>
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-500">
      Subscription and billing details placeholder.
    </div>
  </div>
);

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
      <Route
        path="/onboarding"
        element={
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
            <div className="glass-panel p-8 rounded-2xl max-w-md w-full text-center">
              <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-500/25">
                <span className="font-extrabold text-white text-xl">S</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">ยินดีต้อนรับ! 🎉</h2>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                บัญชีของคุณถูกสร้างเรียบร้อยแล้ว<br />
                <span className="text-brand-400 font-semibold">Step TS-01b</span> — หน้า Onboarding Form จะถูกสร้างใน Step ถัดไป
              </p>
              <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                <p className="text-xs text-success font-medium">✅ Firebase Auth สร้างสำเร็จ</p>
                <p className="text-xs text-slate-400 mt-1">Tenant doc กำลังถูก sync ใน Firestore</p>
              </div>
            </div>
          </div>
        }
      />

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
