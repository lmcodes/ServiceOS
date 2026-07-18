import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-slate-800 border-t-brand-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Authorizing access...</p>
      </div>
    );
  }

  // If not logged in, redirect to login page while preserving target path
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If logged in but user role/tenant is missing (means signup incomplete or claims desynced)
  if (!user.tenantId || !user.role) {
    // If we're already on login/signup, allow, otherwise redirect
    return <Navigate to="/login" replace />;
  }

  // Check if user's role satisfies page permissions (super_admin bypasses all role restrictions)
  if (allowedRoles && (!user.role || (!allowedRoles.includes(user.role) && user.role !== 'super_admin'))) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-danger/10 text-danger flex items-center justify-center mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Access Denied</h3>
        <p className="text-sm text-slate-400 max-w-sm mb-6">
          Your role ({user.role}) does not have permission to view this panel.
        </p>
        <button
          onClick={() => window.history.back()}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-all"
        >
          Go Back
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
