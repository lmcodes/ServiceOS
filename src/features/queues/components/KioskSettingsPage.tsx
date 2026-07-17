import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Monitor, 
  Settings, 
  Copy, 
  Check, 
  ExternalLink, 
  Save, 
  RefreshCw, 
  Image, 
  Timer, 
  Palette, 
  ListTodo,
  GripVertical,
  LayoutGrid,
  Printer,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Bold,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Scissors,
  Sparkles,
  Lock,
  Calendar,
  Hash,
  User,
  Type
} from 'lucide-react';
import { useBranches } from '@/features/branches/hooks/useBranches';
import { useServices } from '@/features/services/hooks/useServices';
import { updateBranch } from '@/features/branches/repository/branchRepository';
import { QRCodeSVG } from 'qrcode.react';
import { useTenant } from '@/context/TenantContext';
import { TicketLayoutElement } from '@/types/firestore';

const DEFAULT_TICKET_LAYOUT: TicketLayoutElement[] = [
  { id: 'logo', type: 'logo', visible: true, fontSize: 'sm', align: 'center' },
  { id: 'branchName', type: 'branchName', visible: true, fontSize: 'sm', bold: true, align: 'center' },
  { id: 'serviceName', type: 'serviceName', visible: true, fontSize: 'xs', bold: true, align: 'center' },
  { id: 'queueNumber', type: 'queueNumber', visible: true, fontSize: 'xl', bold: true, align: 'center' },
  { id: 'customerName', type: 'customerName', text: 'Name: ', visible: true, fontSize: 'xs', align: 'center' },
  { id: 'dateTime', type: 'dateTime', visible: true, fontSize: 'xs', align: 'center' },
  { id: 'footerText', type: 'text', text: 'Thank you for your visit!', visible: true, fontSize: 'xs', align: 'center' },
];

const getFontSizeClass = (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => {
  switch (size) {
    case 'xs': return 'text-[10px]';
    case 'sm': return 'text-xs';
    case 'md': return 'text-sm font-semibold';
    case 'lg': return 'text-lg font-bold';
    case 'xl': return 'text-3xl font-extrabold';
    default: return 'text-xs';
  }
};

const getAlignClass = (align?: 'left' | 'center' | 'right') => {
  switch (align) {
    case 'left': return 'text-left';
    case 'right': return 'text-right';
    default: return 'text-center';
  }
};

export const KioskSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: branches = [], isLoading: isLoadingBranches } = useBranches();
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  const { subscription } = useTenant();
  const isFreePlan = !subscription || subscription.planId === 'starter';

  // Selected Branch Object
  const selectedBranch = branches.find((b) => b.id === selectedBranchId) || null;

  // Tabs
  const [activeTab, setActiveTab] = useState<'kiosk' | 'ticket'>('kiosk');

  // Form states
  const [showLogo, setShowLogo] = useState(true);
  const [idleTimeoutSeconds, setIdleTimeoutSeconds] = useState(30);
  const [themeColor, setThemeColor] = useState<'brand' | 'blue' | 'emerald' | 'violet' | 'amber'>('brand');
  const [allowedServiceIds, setAllowedServiceIds] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState<'58mm' | '80mm'>('80mm');
  const [ticketLayout, setTicketLayout] = useState<TicketLayoutElement[]>([]);
  
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedTicketIndex, setDraggedTicketIndex] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Drag and drop handlers for services
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    
    const newOrder = [...allowedServiceIds];
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, removed);
    
    setAllowedServiceIds(newOrder);
    setDraggedIndex(null);
  };

  // Drag and drop handlers for ticket elements
  const handleTicketDragStart = (e: React.DragEvent, index: number) => {
    setDraggedTicketIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleTicketDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleTicketDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedTicketIndex === null) return;
    
    const newLayout = [...ticketLayout];
    const [removed] = newLayout.splice(draggedTicketIndex, 1);
    newLayout.splice(index, 0, removed);
    
    setTicketLayout(newLayout);
    setDraggedTicketIndex(null);
  };

  // Update specific elements in layout
  const handleUpdateElement = (id: string, updates: Partial<TicketLayoutElement>) => {
    setTicketLayout((prev) =>
      prev.map((el) => (el.id === id ? { ...el, ...updates } : el))
    );
  };

  // Add custom text element to layout
  const handleAddTextElement = () => {
    const newEl: TicketLayoutElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      text: 'Custom Text Line',
      visible: true,
      fontSize: 'xs',
      align: 'center',
      bold: false,
    };
    setTicketLayout((prev) => [...prev, newEl]);
  };

  // Delete custom text element from layout
  const handleDeleteElement = (id: string) => {
    setTicketLayout((prev) => prev.filter((el) => el.id !== id));
  };

  // Load services for selected branch
  const { data: services = [], isLoading: isLoadingServices } = useServices(selectedBranchId);

  // Auto-select first branch
  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  // Load branch settings when selection changes
  useEffect(() => {
    if (selectedBranch) {
      const kSettings = selectedBranch.kioskSettings;
      setShowLogo(kSettings?.showLogo ?? true);
      setIdleTimeoutSeconds(kSettings?.idleTimeoutSeconds ?? 30);
      setThemeColor(kSettings?.themeColor ?? 'brand');
      setAllowedServiceIds(kSettings?.allowedServiceIds || []);
      setPageSize(kSettings?.pageSize ?? '80mm');
      setTicketLayout(kSettings?.ticketLayout || DEFAULT_TICKET_LAYOUT);
    } else {
      setShowLogo(true);
      setIdleTimeoutSeconds(30);
      setThemeColor('brand');
      setAllowedServiceIds([]);
      setPageSize('80mm');
      setTicketLayout(DEFAULT_TICKET_LAYOUT);
    }
  }, [selectedBranchId, selectedBranch]);

  // Copy Kiosk Link
  const kioskUrl = `${window.location.origin}/kiosk/${selectedBranchId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(kioskUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleServiceToggle = (serviceId: string) => {
    setAllowedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSelectAllServices = () => {
    if (allowedServiceIds.length === services.length) {
      setAllowedServiceIds([]);
    } else {
      setAllowedServiceIds(services.map((s) => s.id));
    }
  };

  const handleSave = async () => {
    if (!selectedBranchId) return;
    setSaving(true);
    setSuccess(false);

    try {
      await updateBranch(selectedBranchId, {
        kioskSettings: {
          showLogo,
          idleTimeoutSeconds,
          themeColor,
          allowedServiceIds,
          pageSize,
          ticketLayout,
        },
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update kiosk settings:', err);
    } finally {
      setSaving(false);
    }
  };

  // Curated theme color options description
  const themeOptions = [
    { value: 'brand', label: 'Brand Indigo', bg: 'bg-brand-600', text: 'text-brand-600' },
    { value: 'blue', label: 'Classic Blue', bg: 'bg-blue-600', text: 'text-blue-600' },
    { value: 'emerald', label: 'Emerald Green', bg: 'bg-emerald-600', text: 'text-emerald-600' },
    { value: 'violet', label: 'Violet Purple', bg: 'bg-violet-600', text: 'text-violet-600' },
    { value: 'amber', label: 'Amber Orange', bg: 'bg-amber-600', text: 'text-amber-600' },
  ] as const;

  if (isLoadingBranches) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-brand-600 animate-spin" />
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Loading branch settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Monitor className="w-6 h-6 text-brand-650 dark:text-brand-500" />
            {t('dashboard.menuKioskSettings', 'Kiosk Configuration')}
          </h2>
          <p className="text-sm text-slate-550 dark:text-slate-400">
            Set up and customize the public kiosk terminal for tablet check-ins.
          </p>
        </div>

        {/* Branch Selector */}
        <div className="w-full md:w-72">
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none cursor-pointer shadow-sm"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedBranchId ? (
        <div className="space-y-6">
          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('kiosk')}
              className={`px-6 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'kiosk'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Kiosk Page Settings
            </button>
            <button
              onClick={() => setActiveTab('ticket')}
              className={`px-6 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ticket'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Ticket Print Layout</span>
              {isFreePlan && <Lock className="w-3.5 h-3.5 text-amber-500 ml-0.5" />}
            </button>
          </div>

          {activeTab === 'kiosk' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Settings Panel */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl shadow-sm p-6 space-y-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-4">
                  <Settings className="w-5 h-5 text-brand-500" />
                  Kiosk Design & Rules
                </h3>

                {/* Success Alert */}
                {success && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-955/35 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-sm rounded-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Kiosk settings updated successfully!</span>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Logo Toggle */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-brand-50 dark:bg-brand-950/40 rounded-xl text-brand-655 dark:text-brand-400">
                        <Image className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Display Tenant Logo</h4>
                        <p className="text-xs text-slate-500">Show company logo at the top header of the kiosk screen.</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showLogo}
                        onChange={(e) => setShowLogo(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:height-4 after:w-4 after:h-4 after:transition-all dark:border-slate-600 peer-checked:bg-brand-655 cursor-pointer"></div>
                    </label>
                  </div>

                  {/* Idle Timeout */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                        <Timer className="w-4.5 h-4.5 text-slate-400" />
                        <span>Idle Inactivity Timeout</span>
                      </div>
                      <span className="text-sm font-mono font-bold text-brand-600 bg-brand-50 dark:bg-brand-950/40 px-2.5 py-0.5 rounded-lg">
                        {idleTimeoutSeconds}s
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Time in seconds before the screen auto-resets back to service selection if no input is detected.
                    </p>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="10"
                        max="120"
                        step="5"
                        value={idleTimeoutSeconds}
                        onChange={(e) => setIdleTimeoutSeconds(Number(e.target.value))}
                        className="flex-1 accent-brand-600 bg-slate-100 dark:bg-slate-800 h-2 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Theme Color */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                      <Palette className="w-4.5 h-4.5 text-slate-400" />
                      <span>Theme Color Palette</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Select a color profile for the kiosk screen layout and main action buttons.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {themeOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setThemeColor(opt.value)}
                          className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                            themeColor === opt.value
                              ? 'border-brand-500 bg-brand-50/20 dark:bg-brand-950/10'
                              : 'border-slate-150 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 bg-transparent'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full shadow-inner ${opt.bg}`} />
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {opt.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Active Services allowed */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                        <ListTodo className="w-4.5 h-4.5 text-slate-400" />
                        <span>Visible Services on Kiosk</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSelectAllServices}
                        className="text-xs text-brand-655 dark:text-brand-400 hover:underline font-semibold cursor-pointer"
                      >
                        {allowedServiceIds.length === services.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Choose which services are shown as direct ticketing buttons on the kiosk. Unchecked services will be hidden.
                    </p>

                    {isLoadingServices ? (
                      <div className="py-6 text-center text-slate-400">Loading services...</div>
                    ) : services.length === 0 ? (
                      <div className="py-6 text-center text-slate-400 italic">No services defined yet.</div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-2">
                        {services.map((service) => {
                          const isChecked = allowedServiceIds.includes(service.id);
                          return (
                            <div
                              key={service.id}
                              onClick={() => handleServiceToggle(service.id)}
                              className={`flex items-center space-x-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                                isChecked
                                  ? 'border-brand-500/40 bg-brand-50/10 dark:bg-brand-950/10 text-brand-600 dark:text-brand-400'
                                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // Click is handled by wrapper
                                className="w-4.5 h-4.5 text-brand-600 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 rounded-md focus:ring-brand-500 pointer-events-none"
                              />
                              <div className="flex-1 min-w-0">
                                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                  {service.nameEn ? `${service.name} / ${service.nameEn}` : service.name}
                                </h5>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                                  {service.category || 'Standard'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Drag and Drop Button Reordering Section */}
                  <div className="space-y-3 pt-5 border-t border-slate-100 dark:border-slate-850">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                      <LayoutGrid className="w-4.5 h-4.5 text-slate-400" />
                      <span>Kiosk Button Order (ลากวางจัดตำแหน่ง)</span>
                    </div>
                    <p className="text-xs text-slate-550 dark:text-slate-400">
                      Drag and drop the services below to customize the exact order they appear as buttons on the Kiosk screen.
                    </p>

                    {allowedServiceIds.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-850 rounded-2xl text-slate-450 text-xs italic">
                        Select visible services above first to customize their layout order.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                        {allowedServiceIds.map((serviceId, index) => {
                          const service = services.find((s) => s.id === serviceId);
                          if (!service) return null;

                          return (
                            <div
                              key={service.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, index)}
                              onDragOver={(e) => handleDragOver(e)}
                              onDrop={(e) => handleDrop(e, index)}
                              className={`flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl transition-all cursor-move select-none ${
                                draggedIndex === index
                                  ? 'opacity-40 border-dashed border-brand-500 bg-brand-50/10'
                                  : 'hover:border-slate-350 dark:hover:border-slate-750'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <GripVertical className="w-4.5 h-4.5 text-slate-450 cursor-grab active:cursor-grabbing" />
                                <div>
                                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    {service.nameEn ? `${service.name} / ${service.nameEn}` : service.name}
                                  </h5>
                                  <span className="text-[10px] text-slate-450 uppercase tracking-wider block">
                                    {service.category || 'Standard'}
                                  </span>
                                </div>
                              </div>
                              
                              <span className="text-[9px] font-extrabold text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg">
                                Position {index + 1}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-slate-100 dark:border-slate-850 pt-6 flex justify-end">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSave}
                    className="flex items-center gap-1.5 py-2.5 px-6 bg-brand-655 hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md shadow-brand-655/15 transition-all cursor-pointer"
                  >
                    {saving ? (
                      <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                    ) : (
                      <Save className="w-4.5 h-4.5" />
                    )}
                    <span>Save Kiosk Settings</span>
                  </button>
                </div>
              </div>

              {/* Preview / QR Panel */}
              <div className="lg:col-span-5 space-y-6">
                {/* Kiosk URL & QR Code */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 dark:bg-brand-950/40 px-3 py-1 rounded-full mb-3">
                      Terminal URL & QR
                    </span>
                    <p className="text-xs text-slate-550 dark:text-slate-400 max-w-xs mx-auto">
                      Scan this QR code with a tablet or TV display to open this branch's Kiosk terminal instantly.
                    </p>
                  </div>

                  {/* QR Container */}
                  <div className="w-44 h-44 bg-white p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner flex items-center justify-center mx-auto">
                    <QRCodeSVG
                      value={kioskUrl}
                      size={160}
                      level="M"
                      includeMargin={false}
                    />
                  </div>

                  {/* URL Input Copy */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 bg-slate-55/70 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800 text-left">
                      <input
                        type="text"
                        readOnly
                        value={kioskUrl}
                        className="flex-1 bg-transparent border-none text-[11px] text-slate-600 dark:text-slate-300 focus:outline-none font-mono select-all overflow-hidden truncate pl-1"
                      />
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="p-2 text-slate-455 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700/60 rounded-lg shadow-sm border border-slate-200/45 dark:border-slate-700/40 transition-all cursor-pointer"
                        title="Copy Link"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Launch Buttons */}
                  <div className="grid grid-cols-1 gap-2 pt-2">
                    <a
                      href={kioskUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-1.5 w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-white font-bold text-sm rounded-xl border border-slate-250 dark:border-slate-700 transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Launch Kiosk Screen</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Ticket Print Layout Designer Tab View */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Ticket Layout Editor Panel */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl shadow-sm p-6 space-y-6 relative overflow-hidden">
                {/* Premium Banner Gate Overlay */}
                {isFreePlan && (
                  <div className="absolute inset-0 bg-slate-950/20 dark:bg-slate-950/40 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-2xl max-w-sm space-y-4 animate-in zoom-in-95 duration-200">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-955/35 text-amber-550 flex items-center justify-center mx-auto">
                        <Sparkles className="w-6 h-6 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-extrabold text-slate-900 dark:text-white">Premium Feature</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Custom Ticket Layout Designer is only available on paid subscription plans.
                        </p>
                      </div>
                      <div className="pt-2">
                        <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-900/50">
                          Current Plan: Free Starter Tier
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Printer className="w-5 h-5 text-brand-500" />
                    Print Ticket Designer
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddTextElement}
                    className="flex items-center gap-1 py-1.5 px-3 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:hover:bg-brand-950/60 text-brand-655 dark:text-brand-400 font-bold text-xs rounded-lg transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Custom Text</span>
                  </button>
                </div>

                {/* Success Alert */}
                {success && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-955/35 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-sm rounded-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Ticket print layout saved successfully!</span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Paper Size setting */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/80 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-705 dark:text-slate-300 uppercase tracking-wider">
                      Thermal Paper Width Size
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPageSize('80mm')}
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                          pageSize === '80mm'
                            ? 'border-brand-500 bg-brand-50/20 dark:bg-brand-950/10 text-brand-600 dark:text-brand-400 font-bold'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-750 bg-white dark:bg-slate-900 text-slate-650 dark:text-slate-400'
                        }`}
                      >
                        <span className="text-xs font-bold">80mm Standard</span>
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${pageSize === '80mm' ? 'border-brand-500 after:content-[""] after:w-2 after:h-2 after:bg-brand-500 after:rounded-full' : 'border-slate-350'}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setPageSize('58mm')}
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                          pageSize === '58mm'
                            ? 'border-brand-500 bg-brand-50/20 dark:bg-brand-950/10 text-brand-600 dark:text-brand-400 font-bold'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-750 bg-white dark:bg-slate-900 text-slate-655 dark:text-slate-400'
                        }`}
                      >
                        <span className="text-xs font-bold">58mm Portable</span>
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${pageSize === '58mm' ? 'border-brand-500 after:content-[""] after:w-2 after:h-2 after:bg-brand-500 after:rounded-full' : 'border-slate-350'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Drag-and-drop vertical list of elements */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-705 dark:text-slate-300 uppercase tracking-wider px-1">
                      Drag to Reorder Ticket Elements
                    </h4>
                    <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                      {ticketLayout.map((el, index) => {
                        // Icon mapping based on type
                        const getElementIcon = () => {
                          switch (el.type) {
                            case 'logo': return <Image className="w-4 h-4" />;
                            case 'branchName': return <Monitor className="w-4 h-4" />;
                            case 'serviceName': return <ListTodo className="w-4 h-4" />;
                            case 'queueNumber': return <Hash className="w-4 h-4" />;
                            case 'customerName': return <User className="w-4 h-4" />;
                            case 'dateTime': return <Calendar className="w-4 h-4" />;
                            default: return <Type className="w-4 h-4" />;
                          }
                        };

                        const getElementLabel = () => {
                          switch (el.type) {
                            case 'logo': return 'Logo / Image';
                            case 'branchName': return 'Branch Name';
                            case 'serviceName': return 'Service Group';
                            case 'queueNumber': return 'Queue Number';
                            case 'customerName': return 'Customer Name';
                            case 'dateTime': return 'Date & Time';
                            default: return 'Custom Text Line';
                          }
                        };

                        return (
                          <div
                            key={el.id}
                            draggable
                            onDragStart={(e) => handleTicketDragStart(e, index)}
                            onDragOver={handleTicketDragOver}
                            onDrop={(e) => handleTicketDrop(e, index)}
                            className={`flex flex-col p-3 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-2xl transition-all cursor-move select-none ${
                              draggedTicketIndex === index
                                ? 'opacity-40 border-dashed border-brand-500 bg-brand-50/10'
                                : 'hover:border-slate-350 dark:hover:border-slate-750'
                            }`}
                          >
                            {/* Drag Header Line */}
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-150/50 dark:border-slate-800/50">
                              <div className="flex items-center gap-2">
                                <GripVertical className="w-4 h-4 text-slate-450 cursor-grab active:cursor-grabbing" />
                                <div className="p-1 bg-slate-200/50 dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400">
                                  {getElementIcon()}
                                </div>
                                <span className="text-xs font-bold text-slate-850 dark:text-slate-200">
                                  {getElementLabel()}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {/* Visibility Toggle */}
                                <button
                                  type="button"
                                  onClick={() => handleUpdateElement(el.id, { visible: !el.visible })}
                                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                    el.visible
                                      ? 'border-brand-500/20 bg-brand-50 dark:bg-brand-950/20 text-brand-655 dark:text-brand-400'
                                      : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                  }`}
                                  title={el.visible ? 'Show element' : 'Hide element'}
                                >
                                  {el.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                </button>

                                {/* Delete Custom Text Block */}
                                {el.type === 'text' && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteElement(el.id)}
                                    className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-955/20 transition-all cursor-pointer"
                                    title="Delete Element"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Settings Line (If visible) */}
                            {el.visible && (
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                                {/* Text Value/Prefix input */}
                                <div className="sm:col-span-6">
                                  {el.type === 'text' && (
                                    <input
                                      type="text"
                                      value={el.text || ''}
                                      onChange={(e) => handleUpdateElement(el.id, { text: e.target.value })}
                                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-white focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all outline-none"
                                      placeholder="Custom text..."
                                    />
                                  )}
                                  {el.type === 'customerName' && (
                                    <input
                                      type="text"
                                      value={el.text || ''}
                                      onChange={(e) => handleUpdateElement(el.id, { text: e.target.value })}
                                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-white focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all outline-none"
                                      placeholder="Prefix e.g. Name: "
                                    />
                                  )}
                                  {el.type !== 'text' && el.type !== 'customerName' && (
                                    <span className="text-[10px] text-slate-400 italic">
                                      Dynamic system block content
                                    </span>
                                  )}
                                </div>

                                {/* Align, Bold & FontSize controls */}
                                <div className="sm:col-span-6 flex items-center justify-end gap-2">
                                  {/* Font Size Select */}
                                  {el.type !== 'logo' && (
                                    <select
                                      value={el.fontSize}
                                      onChange={(e) => handleUpdateElement(el.id, { fontSize: e.target.value as any })}
                                      className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                                    >
                                      <option value="xs">xs</option>
                                      <option value="sm">sm</option>
                                      <option value="md">md</option>
                                      <option value="lg">lg</option>
                                      {el.type === 'queueNumber' && <option value="xl">xl</option>}
                                    </select>
                                  )}

                                  {/* Bold Toggle */}
                                  {el.type !== 'logo' && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateElement(el.id, { bold: !el.bold })}
                                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                        el.bold
                                          ? 'border-slate-350 bg-slate-250 dark:bg-slate-700 text-slate-900 dark:text-white'
                                          : 'border-slate-250 dark:border-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850'
                                      }`}
                                      title="Toggle Bold"
                                    >
                                      <Bold className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {/* Align Buttons */}
                                  <div className="flex rounded-lg border border-slate-200 dark:border-slate-850 overflow-hidden">
                                    {(['left', 'center', 'right'] as const).map((alignOpt) => {
                                      const isSelected = (el.align || 'center') === alignOpt;
                                      return (
                                        <button
                                          key={alignOpt}
                                          type="button"
                                          onClick={() => handleUpdateElement(el.id, { align: alignOpt })}
                                          className={`p-1.5 transition-all cursor-pointer border-r last:border-r-0 border-slate-200 dark:border-slate-850 ${
                                            isSelected
                                              ? 'bg-slate-255 dark:bg-slate-700 text-slate-900 dark:text-white'
                                              : 'bg-white dark:bg-slate-900 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                          }`}
                                        >
                                          {alignOpt === 'left' && <AlignLeft className="w-3 h-3" />}
                                          {alignOpt === 'center' && <AlignCenter className="w-3 h-3" />}
                                          {alignOpt === 'right' && <AlignRight className="w-3 h-3" />}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-slate-100 dark:border-slate-850 pt-6 flex justify-end">
                  <button
                    type="button"
                    disabled={saving || isFreePlan}
                    onClick={handleSave}
                    className="flex items-center gap-1.5 py-2.5 px-6 bg-brand-655 hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md shadow-brand-655/15 transition-all cursor-pointer"
                  >
                    {saving ? (
                      <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                    ) : (
                      <Save className="w-4.5 h-4.5" />
                    )}
                    <span>Save Ticket Layout</span>
                  </button>
                </div>
              </div>

              {/* LIVE TICKET PRINT PREVIEW COLUMN */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-inner text-center flex flex-col items-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-450 dark:text-slate-400 mb-4 block">
                    Real-time Print Preview
                  </span>

                  {/* Thermal Paper Container */}
                  <div 
                    className="bg-white text-slate-900 p-4 shadow-xl border-t-2 border-b-2 border-dashed border-slate-300 transition-all font-mono select-none"
                    style={{ 
                      width: pageSize === '58mm' ? '220px' : '290px', 
                      minHeight: '340px' 
                    }}
                  >
                    {/* Dashed line top */}
                    <div className="flex items-center justify-between text-slate-300 text-[10px] select-none pointer-events-none mb-4 uppercase tracking-widest">
                      <Scissors className="w-3.5 h-3.5 rotate-90" />
                      <span>Cut Line</span>
                      <div className="border-t border-dashed border-slate-300 flex-1 ml-2" />
                    </div>

                    {/* Dynamic rendered layout content */}
                    <div className="space-y-2 text-center text-xs">
                      {ticketLayout
                        .filter((el) => el.visible)
                        .map((el) => {
                          const alignClass = getAlignClass(el.align);
                          const sizeClass = getFontSizeClass(el.fontSize);
                          const boldClass = el.bold ? 'font-bold' : '';

                          switch (el.type) {
                            case 'logo':
                              return (
                                <div key={el.id} className={`flex ${el.align === 'left' ? 'justify-start' : el.align === 'right' ? 'justify-end' : 'justify-center'} my-1`}>
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-350/80 flex items-center justify-center text-slate-500 font-bold text-[9px] uppercase">
                                    Logo
                                  </div>
                                </div>
                              );
                            case 'branchName':
                              return (
                                <div key={el.id} className={`${alignClass} ${sizeClass} ${boldClass} break-words leading-tight`}>
                                  {selectedBranch?.name || 'My Shop Branch'}
                                </div>
                              );
                            case 'serviceName':
                              return (
                                <div key={el.id} className={`${alignClass} ${sizeClass} ${boldClass} break-words leading-tight text-slate-800`}>
                                  Mobile Top-up Service
                                </div>
                              );
                            case 'queueNumber':
                              return (
                                <div key={el.id} className={`${alignClass} ${sizeClass} ${boldClass} leading-none my-1 tracking-tight`}>
                                  A-101
                                </div>
                              );
                            case 'customerName':
                              return (
                                <div key={el.id} className={`${alignClass} ${sizeClass} ${boldClass} break-words leading-tight text-slate-700`}>
                                  {el.text || 'Name: '}John Doe
                                </div>
                              );
                            case 'dateTime':
                              return (
                                <div key={el.id} className={`${alignClass} ${sizeClass} ${boldClass} leading-tight text-slate-655`}>
                                  {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              );
                            case 'text':
                            default:
                              return (
                                <div key={el.id} className={`${alignClass} ${sizeClass} ${boldClass} break-words leading-normal text-slate-700`}>
                                  {el.text || 'Custom text line'}
                                </div>
                              );
                          }
                        })}
                    </div>

                    {/* Dashed line bottom */}
                    <div className="flex items-center justify-between text-slate-300 text-[10px] select-none pointer-events-none mt-6 uppercase tracking-widest">
                      <div className="border-t border-dashed border-slate-300 flex-1 mr-2" />
                      <span>Cut Line</span>
                      <Scissors className="w-3.5 h-3.5 -rotate-90" />
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-4 max-w-[240px]">
                    Note: Printing width is dynamically set to {pageSize}. Font styling and order will automatically map to thermal printer commands.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center text-slate-450 bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
          Please select a branch to configure the kiosk.
        </div>
      )}
    </div>
  );
};
export default KioskSettingsPage;
