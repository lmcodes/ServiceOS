import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  MapPin, 
  ConciergeBell, 
  Calendar, 
  LogOut, 
  Menu, 
  X, 
  User as UserIcon,
  ShieldCheck
} from 'lucide-react';

interface SidebarItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ to, icon, label, active, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      active 
        ? 'bg-brand-600 text-white shadow-md' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    {icon}
    <span className="font-medium text-sm">{label}</span>
  </Link>
);

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { tenant } = useTenant();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { to: '/dashboard/queues', icon: <ConciergeBell size={18} />, label: 'Queues', roles: ['owner', 'admin', 'manager', 'staff'] },
    { to: '/dashboard/appointments', icon: <Calendar size={18} />, label: 'Appointments', roles: ['owner', 'admin', 'manager', 'staff'] },
    { to: '/dashboard/branches', icon: <MapPin size={18} />, label: 'Branches', roles: ['owner', 'admin', 'manager'] },
    { to: '/dashboard/services', icon: <Settings size={18} />, label: 'Services', roles: ['owner', 'admin'] },
    { to: '/dashboard/staff', icon: <Users size={18} />, label: 'Staff Users', roles: ['owner', 'admin'] },
    { to: '/dashboard/settings', icon: <LayoutDashboard size={18} />, label: 'Tenant Settings', roles: ['owner'] },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const activePath = location.pathname;

  // Filter menu items by user role
  const allowedMenuItems = menuItems.filter(item => 
    !item.roles || (user?.role && item.roles.includes(user.role))
  );

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-300 md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto px-4 py-6">
          {/* Logo & Header */}
          <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
                <span className="font-extrabold text-white text-lg tracking-wider">S</span>
              </div>
              <div>
                <h1 className="font-bold text-base text-white tracking-tight leading-none">ServiceOS</h1>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-1 block">
                  {tenant?.name || 'Platform'}
                </span>
              </div>
            </div>
            <button 
              className="md:hidden text-slate-400 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 flex-1">
            {allowedMenuItems.map((item) => (
              <SidebarItem
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                active={activePath === item.to || activePath.startsWith(item.to + '/')}
                onClick={() => setSidebarOpen(false)}
              />
            ))}
          </nav>
        </div>

        {/* User profile footer & logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-brand-500 shadow-inner">
              <UserIcon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user?.displayName || user?.email?.split('@')[0] || 'User'}
              </p>
              <div className="flex items-center space-x-1 mt-0.5">
                <ShieldCheck size={12} className="text-brand-500" />
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider truncate">
                  {user?.role || 'Staff'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center space-x-2 w-full py-2.5 px-4 rounded-lg bg-slate-800/50 text-slate-400 hover:bg-danger/10 hover:text-danger border border-slate-700/50 hover:border-danger/25 transition-all duration-200"
          >
            <LogOut size={16} />
            <span className="text-sm font-medium">Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Bar */}
        <header className="h-16 bg-slate-900/50 border-b border-slate-800/80 px-6 flex items-center justify-between md:justify-end backdrop-blur-md sticky top-0 z-30">
          <button 
            className="md:hidden text-slate-400 hover:text-white p-1"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>

          {/* Additional controls or status elements can be placed here */}
          <div className="flex items-center space-x-4">
            <span className="text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700/50 font-medium">
              Timezone: {tenant?.settings?.timezone || 'GMT'}
            </span>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
export default DashboardLayout;
