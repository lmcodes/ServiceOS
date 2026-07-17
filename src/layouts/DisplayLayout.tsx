import React from 'react';
import { Outlet } from 'react-router-dom';
import { SettingsSwitcher } from '@/shared/components/SettingsSwitcher';
import { useTenant } from '@/context/TenantContext';

export const DisplayLayout: React.FC = () => {
  const { tenant, subscription } = useTenant();
  const isNotFree = subscription?.planId && subscription.planId !== 'starter';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#060813] text-slate-900 dark:text-white flex flex-col overflow-hidden select-none relative w-full h-screen font-sans transition-colors duration-200">
      {/* Settings Switcher */}
      <SettingsSwitcher />

      {/* Subtle top header gradient */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-600 via-brand-400 to-brand-600" />
      
      {/* Floating Centered Logo */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div className="h-10 px-4 bg-white rounded-xl flex items-center justify-center shadow-md border border-slate-200/60 dark:border-slate-800/80 overflow-hidden">
          <img 
            src={isNotFree && tenant?.logo ? tenant.logo : '/logo_full_hor_2.png'} 
            alt="Logo" 
            className="h-6 object-contain" 
          />
        </div>
      </div>

      {/* Fullscreen TV Canvas */}
      <div className="flex-1 flex flex-col p-6 w-full h-full">
        <Outlet />
      </div>
    </div>
  );
};
export default DisplayLayout;
