import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Volume2,
  Save,
  Play,
  Settings,
  HelpCircle,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Lock
} from 'lucide-react';
import { useBranches } from '@/features/branches/hooks/useBranches';
import { useAuth } from '@/context/AuthContext';
import { updateBranch } from '@/features/branches/repository/branchRepository';
import { speakQueue } from '@/utils/tts';
import { VoiceSettings } from '@/types/firestore';

export const VoiceSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const { data: branches = [], isLoading: isLoadingBranches } = useBranches();
  
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  // Selected Branch Object
  const selectedBranch = branches.find((b) => b.id === selectedBranchId) || null;

  // Form states
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsEngine, setTtsEngine] = useState<'browser' | 'google-cloud' | 'openai' | 'custom-api'>('browser');
  const [ttsLanguage, setTtsLanguage] = useState('th-TH');
  const [ttsVoice, setTtsVoice] = useState('');
  const [ttsApiKey, setTtsApiKey] = useState('');
  const [ttsCustomUrl, setTtsCustomUrl] = useState('');
  const [ttsTemplate, setTtsTemplate] = useState('หมายเลข {{number}} เชิญที่ช่องบริการ {{counter}}');
  const [ttsVolume, setTtsVolume] = useState(1.0);
  const [repeatCount, setRepeatCount] = useState(1);

  // UI States
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Load branch settings on branch select
  useEffect(() => {
    if (selectedBranch) {
      const vSettings = selectedBranch.voiceSettings;
      if (vSettings) {
        setTtsEnabled(vSettings.ttsEnabled ?? false);
        setTtsEngine(vSettings.ttsEngine ?? 'browser');
        setTtsLanguage(vSettings.ttsLanguage ?? 'th-TH');
        setTtsVoice(vSettings.ttsVoice ?? '');
        setTtsApiKey(vSettings.ttsApiKey ?? '');
        setTtsCustomUrl(vSettings.ttsCustomUrl ?? '');
        setTtsTemplate(vSettings.ttsTemplate ?? 'หมายเลข {{number}} เชิญที่ช่องบริการ {{counter}}');
        setTtsVolume(vSettings.ttsVolume ?? 1.0);
        setRepeatCount(vSettings.repeatCount ?? 1);
      } else {
        // Defaults
        setTtsEnabled(false);
        setTtsEngine('browser');
        setTtsLanguage('th-TH');
        setTtsVoice('');
        setTtsApiKey('');
        setTtsCustomUrl('');
        setTtsTemplate('หมายเลข {{number}} เชิญที่ช่องบริการ {{counter}}');
        setTtsVolume(1.0);
        setRepeatCount(1);
      }
    } else {
      setSelectedBranchId('');
    }
  }, [selectedBranch]);

  if (isLoadingBranches) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) return;

    setSaving(true);
    setSuccess(false);
    setErrorMsg('');

    try {
      const voiceSettingsPayload: VoiceSettings = {
        ttsEnabled,
        ttsEngine,
        ttsLanguage,
        ttsVoice,
        ttsTemplate,
        ttsVolume,
        repeatCount,
        ...(ttsApiKey && { ttsApiKey }),
        ...(ttsCustomUrl && { ttsCustomUrl })
      };

      await updateBranch(selectedBranchId, {
        voiceSettings: voiceSettingsPayload
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('[VoiceSettings] Save error:', err);
      setErrorMsg(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Handle Test Announcement
  const handleTestVoice = () => {
    // Construct local VoiceSettings for testing (unpersisted UI state)
    const testSettings: VoiceSettings = {
      ttsEnabled: true, // Force enabled for test
      ttsEngine,
      ttsLanguage,
      ttsVoice,
      ttsTemplate,
      ttsVolume,
      repeatCount,
      ttsApiKey,
      ttsCustomUrl
    };

    const testTicket = 'A101';
    const testCounter = ttsLanguage.toLowerCase().startsWith('th') ? 'ช่องบริการ 1' : 'Counter 1';

    speakQueue(testTicket, testCounter, testSettings);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Volume2 className="text-brand-500 w-7 h-7" />
            {t('voiceSettings.title', 'Voice Announcement Settings')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Configure Text-to-Speech voices and announcement templates when tickets are called.
          </p>
        </div>
      </div>

      {/* Select Branch */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-8 shadow-sm">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {t('voiceSettings.selectBranch', 'Select Branch')}
        </label>
        <select
          value={selectedBranchId}
          onChange={(e) => setSelectedBranchId(e.target.value)}
          className="w-full max-w-md px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">-- {t('voiceSettings.selectBranch', 'Select Branch')} --</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.code})
            </option>
          ))}
        </select>
      </div>

      {/* Settings Form */}
      {selectedBranchId ? (
        <form onSubmit={handleSave} className="space-y-8">
          {/* Main Toggle */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {t('voiceSettings.enableTts', 'Enable Voice Announcement')}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Play text-to-speech audio when a ticket status switches to CALLED on the display screen.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={ttsEnabled}
                  onChange={(e) => setTtsEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-650 peer-checked:bg-brand-600"></div>
              </label>
            </div>
          </div>

          {/* Engine Parameters */}
          <div className={`transition-all duration-300 ${ttsEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
                <Settings className="w-5 h-5 text-slate-500" />
                TTS Engine Config
              </h3>

              {!isSuperAdmin && (
                <div className="flex items-start gap-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-500 mb-4">
                  <Lock className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                  <span>
                    Premium TTS Engine select and API Keys configuration are restricted to System Super Administrators. You can configure voice names, templates, and volume.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Engine Select */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t('voiceSettings.ttsEngine', 'TTS Engine')}
                  </label>
                  <select
                    value={ttsEngine}
                    disabled={!isSuperAdmin}
                    onChange={(e) => setTtsEngine(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="browser">Browser Synthesis (Free / Native)</option>
                    <option value="google-cloud">Google Cloud TTS (Premium)</option>
                    <option value="openai">OpenAI TTS (Natural AI)</option>
                    <option value="custom-api">Custom URL API</option>
                  </select>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t('voiceSettings.ttsLanguage', 'Language')}
                  </label>
                  <select
                    value={ttsLanguage}
                    onChange={(e) => setTtsLanguage(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="th-TH">Thai (th-TH)</option>
                    <option value="en-US">English (en-US)</option>
                    <option value="en-GB">English (en-GB)</option>
                  </select>
                </div>

                {/* Voice Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                    {t('voiceSettings.ttsVoice', 'Voice Name / Model')}
                    <span className="group relative">
                      <HelpCircle className="w-4 h-4 text-slate-400 cursor-pointer" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-slate-950 text-white text-xs rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">
                        Browser: Keep blank for default, or voice name. Cloud Google: e.g. th-TH-Standard-A. OpenAI: alloy, echo, fable, onyx, nova, shimmer.
                      </span>
                    </span>
                  </label>
                  <input
                    type="text"
                    value={ttsVoice}
                    onChange={(e) => setTtsVoice(e.target.value)}
                    placeholder={
                      ttsEngine === 'openai' 
                        ? 'alloy, echo, nova, etc.' 
                        : ttsEngine === 'google-cloud' 
                        ? 'th-TH-Standard-A' 
                        : 'Default browser voice'
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                {/* API Key for Cloud/OpenAI */}
                {(ttsEngine === 'google-cloud' || ttsEngine === 'openai' || ttsEngine === 'custom-api') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {ttsEngine === 'custom-api' 
                        ? t('voiceSettings.ttsApiKey', 'API Key / Auth Header (Optional)') 
                        : t('voiceSettings.ttsApiKey', 'API Key')}
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        disabled={!isSuperAdmin}
                        value={ttsApiKey}
                        onChange={(e) => setTtsApiKey(e.target.value)}
                        placeholder={isSuperAdmin ? "Enter API credentials key" : "••••••••••••••••"}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 pr-10 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      >
                        {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Custom API Endpoint URL */}
                {ttsEngine === 'custom-api' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {t('voiceSettings.ttsCustomUrl', 'Custom Endpoint URL')}
                    </label>
                    <input
                      type="url"
                      disabled={!isSuperAdmin}
                      value={ttsCustomUrl}
                      onChange={(e) => setTtsCustomUrl(e.target.value)}
                      placeholder="https://your-custom-tts.api/synthesize"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60 disabled:cursor-not-allowed"
                      required={ttsEngine === 'custom-api'}
                    />
                  </div>
                )}
              </div>

              {/* Template & Repeat & Volume */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t('voiceSettings.ttsTemplate', 'Announcement Template')}
                  </label>
                  <input
                    type="text"
                    value={ttsTemplate}
                    onChange={(e) => setTtsTemplate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {t('voiceSettings.ttsTemplateHelp', 'Use {{number}} for ticket number and {{counter}} for counter name.')}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Volume Slider */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex justify-between">
                      <span>{t('voiceSettings.ttsVolume', 'Volume')}</span>
                      <span className="font-semibold text-brand-600 dark:text-brand-400">{Math.round(ttsVolume * 100)}%</span>
                    </label>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.1"
                      value={ttsVolume}
                      onChange={(e) => setTtsVolume(parseFloat(e.target.value))}
                      className="w-full accent-brand-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Repeat Count */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {t('voiceSettings.repeatCount', 'Repeat Count')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={repeatCount}
                      onChange={(e) => setRepeatCount(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          {success && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-250 dark:border-emerald-800 rounded-lg p-4 text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span>{t('voiceSettings.successMsg', 'Voice settings saved successfully!')}</span>
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg p-4 text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleTestVoice}
              disabled={ttsEnabled && !ttsTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-semibold transition-all"
            >
              <Play className="w-4 h-4" />
              {t('voiceSettings.testBtn', 'Test Sound')}
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-semibold transition-all shadow-md shadow-brand-600/10 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : t('voiceSettings.saveBtn', 'Save Settings')}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-500 dark:text-slate-400 shadow-sm">
          Please select a branch above to configure voice announcements.
        </div>
      )}
    </div>
  );
};
