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
  ListTodo
} from 'lucide-react';
import { useBranches } from '@/features/branches/hooks/useBranches';
import { useServices } from '@/features/services/hooks/useServices';
import { updateBranch } from '@/features/branches/repository/branchRepository';
import { QRCodeSVG } from 'qrcode.react';

export const KioskSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: branches = [], isLoading: isLoadingBranches } = useBranches();
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  // Selected Branch Object
  const selectedBranch = branches.find((b) => b.id === selectedBranchId) || null;

  // Form states
  const [showLogo, setShowLogo] = useState(true);
  const [idleTimeoutSeconds, setIdleTimeoutSeconds] = useState(30);
  const [themeColor, setThemeColor] = useState<'brand' | 'blue' | 'emerald' | 'violet' | 'amber'>('brand');
  const [allowedServiceIds, setAllowedServiceIds] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

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
    } else {
      setShowLogo(true);
      setIdleTimeoutSeconds(30);
      setThemeColor('brand');
      setAllowedServiceIds([]);
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
                              {service.name}
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
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
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
                    className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700/60 rounded-lg shadow-sm border border-slate-200/40 dark:border-slate-700/40 transition-all cursor-pointer"
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
        <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
          Please select a branch to configure the kiosk.
        </div>
      )}
    </div>
  );
};
export default KioskSettingsPage;
