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
  const [ttsLanguageEn, setTtsLanguageEn] = useState('en-US');
  const [ttsVoiceEn, setTtsVoiceEn] = useState('');
  const [ttsTemplateEn, setTtsTemplateEn] = useState('Number {{number}}, please proceed to counter {{counter}}');

  // Multi-language styles management
  const [styles, setStyles] = useState<Record<string, any>>({});
  const [activeStyleId, setActiveStyleId] = useState<string>('');
  const [editingStyleId, setEditingStyleId] = useState<string | null>(null);
  const [styleName, setStyleName] = useState('');
  const [styleThLang, setStyleThLang] = useState('th-TH');
  const [styleThVoice, setStyleThVoice] = useState('');
  const [styleThTemplate, setStyleThTemplate] = useState('หมายเลข {{number}} ที่ช่องบริการ {{counter}} ค่ะ');
  const [styleEnLang, setStyleEnLang] = useState('en-US');
  const [styleEnVoice, setStyleEnVoice] = useState('');
  const [styleEnTemplate, setStyleEnTemplate] = useState('Number {{number}} at {{counter}}');

  const handleCreateNewStyleClick = () => {
    setEditingStyleId('new');
    setStyleName('');
    setStyleThLang('th-TH');
    setStyleThVoice('');
    setStyleThTemplate('หมายเลข {{number}} ที่ช่องบริการ {{counter}} ค่ะ');
    setStyleEnLang('en-US');
    setStyleEnVoice('');
    setStyleEnTemplate('Number {{number}} at {{counter}}');
  };

  const handleEditStyle = (id: string, s: any) => {
    setEditingStyleId(id);
    setStyleName(s.name || '');
    setStyleThLang(s.languages?.th?.ttsLanguage || 'th-TH');
    setStyleThVoice(s.languages?.th?.ttsVoice || '');
    setStyleThTemplate(s.languages?.th?.ttsTemplate || '');
    setStyleEnLang(s.languages?.en?.ttsLanguage || 'en-US');
    setStyleEnVoice(s.languages?.en?.ttsVoice || '');
    setStyleEnTemplate(s.languages?.en?.ttsTemplate || '');
  };

  const handleDeleteStyle = (id: string) => {
    const updated = { ...styles };
    delete updated[id];
    setStyles(updated);
    if (activeStyleId === id) {
      setActiveStyleId('');
    }
  };

  const handleCancelStyleEdit = () => {
    setEditingStyleId(null);
  };

  const handleSaveStyleItem = () => {
    if (!styleName.trim()) return alert('Style Name is required');
    let targetKey = editingStyleId;
    if (editingStyleId === 'new') {
      const keyInput = (document.getElementById('temp-style-key') as HTMLInputElement)?.value?.trim();
      if (!keyInput) return alert('Style Key is required');
      if (styles[keyInput]) return alert('Style Key already exists');
      targetKey = keyInput;
    }
    if (!targetKey) return;

    const newStyle = {
      name: styleName.trim(),
      languages: {
        th: {
          ttsLanguage: styleThLang.trim(),
          ttsVoice: styleThVoice.trim(),
          ttsTemplate: styleThTemplate.trim()
        },
        en: {
          ttsLanguage: styleEnLang.trim(),
          ttsVoice: styleEnVoice.trim(),
          ttsTemplate: styleEnTemplate.trim()
        }
      }
    };

    setStyles({
      ...styles,
      [targetKey]: newStyle
    });
    setEditingStyleId(null);
  };

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
        setTtsTemplateEn(vSettings.ttsTemplateEn ?? 'Number {{number}}, please proceed to counter {{counter}}');
        setTtsLanguageEn(vSettings.ttsLanguageEn ?? 'en-US');
        setTtsVoiceEn(vSettings.ttsVoiceEn ?? '');
        setStyles(vSettings.styles || {});
        setActiveStyleId(vSettings.activeStyleId || '');
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
        setTtsTemplateEn('Number {{number}}, please proceed to counter {{counter}}');
        setTtsLanguageEn('en-US');
        setTtsVoiceEn('');
        setStyles({});
        setActiveStyleId('');
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
        ttsTemplateEn,
        ttsLanguageEn,
        ttsVoiceEn,
        styles,
        activeStyleId,
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
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-955 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
              </div>

              {/* English Dynamic Playback Section */}
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-4">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-brand-600" />
                  {t('voiceSettings.englishSectionTitle', 'Dynamic English Playback Settings')}
                </h4>
                <p className="text-xs text-slate-550 dark:text-slate-400">
                  {t('voiceSettings.englishSectionDesc', 'Configure parameters for playing queue announcements in English when selected at the kiosk.')}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* English Language Code */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      English Language Code
                    </label>
                    <select
                      value={ttsLanguageEn}
                      onChange={(e) => setTtsLanguageEn(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm cursor-pointer"
                    >
                      <option value="en-US">English (en-US)</option>
                      <option value="en-GB">English (en-GB)</option>
                    </select>
                  </div>

                  {/* English Voice Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      English Voice Name / Model
                    </label>
                    <input
                      type="text"
                      value={ttsVoiceEn}
                      onChange={(e) => setTtsVoiceEn(e.target.value)}
                      placeholder={
                        ttsEngine === 'openai' 
                          ? 'alloy, echo, nova, etc.' 
                          : ttsEngine === 'google-cloud' 
                          ? 'en-US-Standard-A' 
                          : 'Default browser voice'
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                    />
                  </div>
                </div>

                {/* English Template */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-355 mb-1">
                    English Announcement Template
                  </label>
                  <input
                    type="text"
                    value={ttsTemplateEn}
                    onChange={(e) => setTtsTemplateEn(e.target.value)}
                    placeholder="Number {{number}}, please proceed to counter {{counter}}"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-955 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-mono"
                  />
                  <p className="text-xs text-slate-550 mt-1">
                    {t('voiceSettings.ttsTemplateHelp', 'Use {{number}} for ticket number and {{counter}} for counter name.')}
                  </p>
                </div>
              </div>

              {/* Announcement Styles Section */}
              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-2">
                  <Volume2 className="w-5 h-5 text-brand-600" />
                  Voice Announcement Styles
                </h3>
                <p className="text-xs text-slate-550 dark:text-slate-400 mb-4">
                  Define styles (e.g., style1: Standard Counter, style2: Examination Room) that can be selected on individual counters and services.
                </p>

                <div className="space-y-4">
                  {/* Active default style selector */}
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-150 dark:border-slate-750">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Default Announcement Style:
                    </label>
                    <select
                      value={activeStyleId}
                      onChange={(e) => setActiveStyleId(e.target.value)}
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
                    >
                      <option value="">Default Settings (No Style)</option>
                      {Object.entries(styles).map(([id, s]: [string, any]) => (
                        <option key={id} value={id}>{s.name} ({id})</option>
                      ))}
                    </select>
                  </div>

                  {/* Styles Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(styles).map(([id, s]: [string, any]) => (
                      <div key={id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between shadow-sm">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-sm text-slate-955 dark:text-white">{s.name}</span>
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-805 px-2 py-0.5 rounded font-mono text-slate-500">{id}</span>
                          </div>
                          <div className="text-xs text-slate-555 space-y-1.5">
                            <div>
                              <strong className="text-slate-700 dark:text-slate-405 font-bold">Thai (th):</strong> {s.languages?.th?.ttsTemplate || 'None'}
                            </div>
                            <div>
                              <strong className="text-slate-700 dark:text-slate-405 font-bold">English (en):</strong> {s.languages?.en?.ttsTemplate || 'None'}
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                          <button
                            type="button"
                            onClick={() => handleEditStyle(id, s)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStyle(id)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-955/20 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-405 rounded text-xs font-semibold cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Editor Form */}
                  {editingStyleId !== null ? (
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                      <h4 className="text-xs font-extrabold uppercase text-slate-500 dark:text-slate-405">
                        {editingStyleId === 'new' ? 'Create New Style' : `Edit Style (${editingStyleId})`}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {editingStyleId === 'new' && (
                          <div>
                            <label className="block text-xs font-semibold mb-1 text-slate-655 dark:text-slate-350">Style Key (e.g. style1)</label>
                            <input
                              type="text"
                              placeholder="style1"
                              id="temp-style-key"
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white outline-none"
                            />
                          </div>
                        )}
                        <div>
                          <label className="block text-xs font-semibold mb-1 text-slate-655 dark:text-slate-355">Style Name</label>
                          <input
                            type="text"
                            value={styleName}
                            onChange={(e) => setStyleName(e.target.value)}
                            placeholder="Standard Counter"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {/* Thai Config */}
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-805 space-y-3">
                          <span className="text-xs font-bold text-slate-400 block border-b pb-1">Thai (th) Settings</span>
                          <div>
                            <label className="block text-[10px] font-bold mb-1 text-slate-555">Language Code</label>
                            <input
                              type="text"
                              value={styleThLang}
                              onChange={(e) => setStyleThLang(e.target.value)}
                              className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded text-xs text-slate-800 dark:text-white outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold mb-1 text-slate-555">Voice Name</label>
                            <input
                              type="text"
                              value={styleThVoice}
                              onChange={(e) => setStyleThVoice(e.target.value)}
                              className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded text-xs text-slate-800 dark:text-white outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold mb-1 text-slate-555">Template</label>
                            <input
                              type="text"
                              value={styleThTemplate}
                              onChange={(e) => setStyleThTemplate(e.target.value)}
                              className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded text-xs text-slate-800 dark:text-white outline-none"
                            />
                          </div>
                        </div>

                        {/* English Config */}
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-3">
                          <span className="text-xs font-bold text-slate-400 block border-b pb-1">English (en) Settings</span>
                          <div>
                            <label className="block text-[10px] font-bold mb-1 text-slate-555">Language Code</label>
                            <input
                              type="text"
                              value={styleEnLang}
                              onChange={(e) => setStyleEnLang(e.target.value)}
                              className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded text-xs text-slate-800 dark:text-white outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold mb-1 text-slate-555">Voice Name</label>
                            <input
                              type="text"
                              value={styleEnVoice}
                              onChange={(e) => setStyleEnVoice(e.target.value)}
                              className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded text-xs text-slate-800 dark:text-white outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold mb-1 text-slate-555">Template</label>
                            <input
                              type="text"
                              value={styleEnTemplate}
                              onChange={(e) => setStyleEnTemplate(e.target.value)}
                              className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-805 border dark:border-slate-700 rounded text-xs text-slate-800 dark:text-white outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={handleCancelStyleEdit}
                          className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 dark:text-slate-355 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveStyleItem}
                          className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Apply Style Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCreateNewStyleClick}
                      className="px-4 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-950/20 dark:hover:bg-brand-900/20 text-xs font-bold rounded-lg transition-all cursor-pointer"
                    >
                      + Add Custom Announcement Style
                    </button>
                  )}
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
