import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export const AuthLayout: React.FC = () => {
  const { user, loading } = useAuth();

  // If authenticated and has role → go to dashboard
  if (!loading && user && user.role) {
    return <Navigate to="/dashboard/queues" replace />;
  }

  // If authenticated but no role yet (new user, claims not injected) → go to onboarding
  if (!loading && user && !user.role) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative blurred background shapes */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-brand-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-success/5 blur-[120px] pointer-events-none" />

      {/* Main card box */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/25">
            <span className="font-extrabold text-white text-2xl tracking-wider">S</span>
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-white tracking-tight">
          ServiceOS
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          The operating system for modern service businesses
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="glass-panel py-8 px-6 sm:px-10 rounded-2xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-10 h-10 border-4 border-slate-800 border-t-brand-500 rounded-full animate-spin" />
              <p className="text-sm text-slate-400 font-medium">Validating credentials...</p>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </div>
  );
};
export default AuthLayout;
