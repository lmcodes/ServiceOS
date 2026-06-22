import React from 'react';
import { Outlet } from 'react-router-dom';

export const DisplayLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#060813] text-white flex flex-col overflow-hidden select-none relative w-full h-screen font-sans">
      {/* Subtle top header gradient */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-600 via-brand-400 to-brand-600" />
      
      {/* Fullscreen TV Canvas */}
      <div className="flex-1 flex flex-col p-6 w-full h-full">
        <Outlet />
      </div>
    </div>
  );
};
export default DisplayLayout;
