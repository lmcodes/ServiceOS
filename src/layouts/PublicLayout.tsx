import React from 'react';
import { Outlet } from 'react-router-dom';

export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-start p-4 sm:p-6 relative overflow-x-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-64 rounded-full bg-brand-500/5 blur-[80px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md flex flex-col flex-1 py-4 sm:py-8 z-10">
        {/* Simple Brand Header */}
        <div className="flex items-center space-x-2.5 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shadow-md">
            <span className="font-extrabold text-white text-base">S</span>
          </div>
          <span className="font-bold text-slate-200 tracking-wide text-sm uppercase">ServiceOS</span>
        </div>

        {/* Content Outlet */}
        <div className="flex-1 flex flex-col justify-start">
          <Outlet />
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-[10px] text-slate-600 font-medium tracking-wide">
          Powered by ServiceOS &copy; {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
};
export default PublicLayout;
