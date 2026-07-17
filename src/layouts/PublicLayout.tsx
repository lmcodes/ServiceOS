import React from 'react';
import { Outlet } from 'react-router-dom';
import { SettingsSwitcher } from '@/shared/components/SettingsSwitcher';

export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-start p-4 sm:p-6 relative overflow-x-hidden transition-colors duration-200">
      {/* Settings Switcher */}
      <SettingsSwitcher />

      {/* Subtle background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-64 rounded-full bg-brand-500/10 dark:bg-brand-500/5 blur-[80px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md flex flex-col flex-1 py-2 sm:py-2 z-10">
        {/* Simple Brand Header */}
        <div className="flex justify-center mb-8">
          <div className="h-16 px-4 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200/60 dark:border-slate-800/80 overflow-hidden">
            <img src="/logo_full_hor_2.png" alt="ServiceOS Logo" className="h-10 object-contain" />
          </div>
        </div>

        {/* Content Outlet */}
        <div className="flex-1 flex flex-col justify-start">
          <Outlet />
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-[10px] text-slate-500 dark:text-slate-650 font-medium tracking-wide">
          Powered by ServiceOS &copy; {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
};
export default PublicLayout;
