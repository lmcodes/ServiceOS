import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTenant } from '@/context/TenantContext';
import { useBranches } from '@/features/branches/hooks/useBranches';
import { 
  Tv, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  ArrowUp, 
  ArrowDown, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  X,
  FileVideo,
  FileImage,
  Link,
  Sliders
} from 'lucide-react';
import { DisplayTemplate, MediaItem, PlaylistMediaItem } from '@/types/firestore';
import { 
  subscribeDisplayTemplates, 
  addDisplayTemplate, 
  updateDisplayTemplate, 
  deleteDisplayTemplate, 
  setActiveTemplate,
  subscribeMediaItems
} from '../repository/displayRepository';

export const DisplayTemplatePage: React.FC = () => {
  const { t } = useTranslation();
  const { tenant } = useTenant();
  const { data: branches = [], isLoading: isLoadingBranches } = useBranches();
  
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [templates, setTemplates] = useState<DisplayTemplate[]>([]);
  const [mediaLibrary, setMediaLibrary] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DisplayTemplate | null>(null);
  const [formName, setFormName] = useState('');
  const [formLayout, setFormLayout] = useState<'queue-only' | 'split-media' | 'fullscreen-media-with-ticker'>('queue-only');
  const [formPlaylist, setFormPlaylist] = useState<PlaylistMediaItem[]>([]);
  const [formQueuePosition, setFormQueuePosition] = useState<'left' | 'right' | 'none'>('right');
  const [formTransitionSeconds, setFormTransitionSeconds] = useState(10);
  const [formIsActive, setFormIsActive] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Add Media Modal inside Form
  const [isAddMediaOpen, setIsAddMediaOpen] = useState(false);

  // Set default branch
  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  // Subscribe to templates for selected branch
  useEffect(() => {
    if (!selectedBranchId) return;

    setLoading(true);
    const unsubscribe = subscribeDisplayTemplates(
      selectedBranchId,
      (data) => {
        setTemplates(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error loading templates:', err);
        setError('Failed to load display templates');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedBranchId]);

  // Subscribe to media library (to choose from)
  useEffect(() => {
    if (!tenant?.id) return;

    const unsubscribe = subscribeMediaItems(
      tenant.id,
      (items) => {
        setMediaLibrary(items);
      },
      (err) => {
        console.error('Error loading media library:', err);
      }
    );

    return () => unsubscribe();
  }, [tenant?.id]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleOpenCreate = () => {
    setSelectedTemplate(null);
    setFormName('');
    setFormLayout('split-media');
    setFormPlaylist([]);
    setFormQueuePosition('right');
    setFormTransitionSeconds(10);
    setFormIsActive(templates.length === 0); // Active by default if it's the first template
    setIsFormOpen(true);
  };

  const handleOpenEdit = (template: DisplayTemplate) => {
    setSelectedTemplate(template);
    setFormName(template.name);
    setFormLayout(template.layout);
    setFormPlaylist(template.mediaPlaylist || []);
    setFormQueuePosition(template.queuePosition || 'right');
    setFormTransitionSeconds(template.transitionSeconds || 10);
    setFormIsActive(template.isActive);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) return;

    setFormLoading(true);
    setError(null);

    const templateData = {
      name: formName,
      layout: formLayout,
      mediaPlaylist: formPlaylist,
      queuePosition: formQueuePosition,
      transitionSeconds: formTransitionSeconds,
      isActive: formIsActive
    };

    try {
      if (!tenant?.id) throw new Error('Tenant ID is missing');
      if (selectedTemplate) {
        // Update existing template
        await updateDisplayTemplate(selectedTemplate.id, templateData);
        if (formIsActive) {
          // Deactivate others
          await setActiveTemplate(tenant.id, selectedBranchId, selectedTemplate.id);
        }
        showSuccess('Template updated successfully');
      } else {
        // Create new template
        const newId = await addDisplayTemplate(tenant.id, selectedBranchId, templateData);
        if (formIsActive) {
          await setActiveTemplate(tenant.id, selectedBranchId, newId);
        }
        showSuccess('Template created successfully');
      }
      setIsFormOpen(false);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to save template');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await deleteDisplayTemplate(id);
      showSuccess('Template deleted');
    } catch (err) {
      console.error(err);
      setError('Failed to delete template');
    }
  };

  const handleToggleActive = async (template: DisplayTemplate) => {
    if (!tenant?.id) {
      setError('Tenant ID is missing');
      return;
    }
    try {
      const nextState = !template.isActive;
      await setActiveTemplate(tenant.id, selectedBranchId, nextState ? template.id : null);
      showSuccess(nextState ? 'Template activated' : 'Template deactivated');
    } catch (err) {
      console.error(err);
      setError('Failed to change active template');
    }
  };

  // Playlist builders
  const addMediaToPlaylist = (mediaItem: MediaItem) => {
    const newItem: PlaylistMediaItem = {
      mediaId: mediaItem.id,
      duration: mediaItem.duration || formTransitionSeconds
    };
    setFormPlaylist([...formPlaylist, newItem]);
    setIsAddMediaOpen(false);
  };

  const removePlaylistItem = (index: number) => {
    const nextPlaylist = [...formPlaylist];
    nextPlaylist.splice(index, 1);
    setFormPlaylist(nextPlaylist);
  };

  const movePlaylistItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === formPlaylist.length - 1) return;

    const nextPlaylist = [...formPlaylist];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = nextPlaylist[index];
    nextPlaylist[index] = nextPlaylist[targetIndex];
    nextPlaylist[targetIndex] = temp;
    setFormPlaylist(nextPlaylist);
  };

  const updatePlaylistDuration = (index: number, duration: number) => {
    const nextPlaylist = [...formPlaylist];
    nextPlaylist[index].duration = duration;
    setFormPlaylist(nextPlaylist);
  };

  if (isLoadingBranches) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <Clock className="w-8 h-8 text-brand-655 animate-spin" />
        <p className="mt-2 text-sm text-slate-550 dark:text-slate-400">Loading branches...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-905 dark:text-white flex items-center gap-2">
            <Tv className="w-6 h-6 text-brand-655 dark:text-brand-400" />
            {t('displaySettings.title', 'Display Settings')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('displaySettings.subtitle', 'Configure TV screen layouts and playlist templates')}
          </p>
        </div>

        {/* Branch Selector */}
        <div className="flex items-center gap-3">
          <div className="w-64">
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none cursor-pointer shadow-sm"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 py-2.5 px-4 bg-brand-655 hover:bg-brand-600 text-white font-semibold text-sm rounded-xl shadow-md shadow-brand-655/10 transition-all cursor-pointer w-fit"
          >
            <Plus className="w-4 h-4" />
            <span>{t('displaySettings.addBtn', 'Create Template')}</span>
          </button>
        </div>
      </div>

      {/* Alert Notices */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-900 text-red-750 dark:text-red-300 text-xs rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-955/20 border border-emerald-200 dark:border-emerald-900 text-emerald-750 dark:text-emerald-300 text-xs rounded-2xl flex items-center gap-2">
          <CheckCircle className="w-4.5 h-4.5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Templates List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
          <Clock className="w-8 h-8 text-brand-655 animate-spin" />
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">{t('common.loading')}</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border-2 border-dashed border-slate-350 dark:border-slate-800 rounded-3xl">
          <Tv className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <h3 className="font-bold text-slate-900 dark:text-white text-base">{t('displaySettings.noTemplates', 'No templates defined for this branch')}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            TV screens for this branch will default to the standard full-screen Queue Board layout. Create a template to add playlists, images, videos, and custom split screens.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div 
              key={template.id}
              className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all relative ${
                template.isActive 
                  ? 'border-brand-500 dark:border-brand-500/80 ring-2 ring-brand-500/10' 
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Active Badge */}
              {template.isActive && (
                <span className="absolute top-4 right-4 bg-brand-500 text-white font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                  Active
                </span>
              )}

              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">{template.name}</h3>
                <span className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider block mt-0.5">
                  Layout: {template.layout === 'queue-only' ? 'Queue Only' : template.layout === 'split-media' ? 'Split Screen (60/40)' : 'Fullscreen Video + Ticker'}
                </span>
              </div>

              {/* Stats/Overview of template */}
              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span>Playlist Items:</span>
                  <span className="font-bold">{template.mediaPlaylist?.length || 0} items</span>
                </div>
                <div className="flex justify-between">
                  <span>Queue Panel Pos:</span>
                  <span className="font-bold capitalize">{template.queuePosition || 'right'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Default Slide Time:</span>
                  <span className="font-bold">{template.transitionSeconds || 10}s</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-850">
                <button
                  onClick={() => handleToggleActive(template)}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    template.isActive 
                      ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white' 
                      : 'bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 text-brand-655 dark:text-brand-400'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{template.isActive ? 'Deactivate' : 'Activate'}</span>
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(template)}
                    className="p-1.5 text-slate-400 hover:text-slate-905 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                    title="Edit"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-955/20 rounded-lg cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                {selectedTemplate ? 'Edit Display Template' : 'Create Display Template'}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-655 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-5 space-y-6 flex-grow">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Template Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Morning Lobby Display, Showroom Playlist"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/85 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
              </div>

              {/* Layout Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  {t('displaySettings.layoutLabel', 'Display Layout')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Option 1: Queue Only */}
                  <div 
                    onClick={() => setFormLayout('queue-only')}
                    className={`border rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between ${
                      formLayout === 'queue-only'
                        ? 'border-brand-500 bg-brand-50/10 dark:bg-brand-950/10 ring-2 ring-brand-500/10'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 bg-transparent'
                    }`}
                  >
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                        {t('displaySettings.queueOnly', 'Queue Only')}
                      </h4>
                      <p className="text-[10px] text-slate-450 mt-1">Classic full-screen queue dashboard calling board.</p>
                    </div>
                    {/* Mock Layout Graphic */}
                    <div className="mt-3 aspect-video bg-slate-100 dark:bg-slate-850 rounded-lg p-1.5 flex gap-1 border border-slate-200 dark:border-slate-800">
                      <div className="flex-1 bg-brand-500/10 rounded border border-brand-500/20 flex items-center justify-center text-[8px] font-bold text-brand-655">Queues</div>
                      <div className="flex-1 bg-brand-500/10 rounded border border-brand-500/20 flex items-center justify-center text-[8px] font-bold text-brand-655">Waiting</div>
                    </div>
                  </div>

                  {/* Option 2: Split Media */}
                  <div 
                    onClick={() => setFormLayout('split-media')}
                    className={`border rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between ${
                      formLayout === 'split-media'
                        ? 'border-brand-500 bg-brand-50/10 dark:bg-brand-950/10 ring-2 ring-brand-500/10'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 bg-transparent'
                    }`}
                  >
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                        {t('displaySettings.splitMedia', 'Split Screen (60/40)')}
                      </h4>
                      <p className="text-[10px] text-slate-455 mt-1">Playlist runs on the left side, calling list displays on the right.</p>
                    </div>
                    {/* Mock Layout Graphic */}
                    <div className="mt-3 aspect-video bg-slate-100 dark:bg-slate-850 rounded-lg p-1.5 flex gap-1 border border-slate-200 dark:border-slate-800">
                      <div className="w-[60%] bg-emerald-500/15 rounded border border-emerald-500/25 flex items-center justify-center text-[8px] font-bold text-emerald-600">Media</div>
                      <div className="w-[40%] bg-brand-500/10 rounded border border-brand-500/25 flex items-center justify-center text-[8px] font-bold text-brand-600">Queues</div>
                    </div>
                  </div>

                  {/* Option 3: Fullscreen Media with Ticker */}
                  <div 
                    onClick={() => setFormLayout('fullscreen-media-with-ticker')}
                    className={`border rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between ${
                      formLayout === 'fullscreen-media-with-ticker'
                        ? 'border-brand-500 bg-brand-50/10 dark:bg-brand-950/10 ring-2 ring-brand-500/10'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 bg-transparent'
                    }`}
                  >
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                        {t('displaySettings.fullscreenMedia', 'Fullscreen Media + Ticker')}
                      </h4>
                      <p className="text-[10px] text-slate-455 mt-1">Media plays full-page with a scrolling queue ticker at the bottom.</p>
                    </div>
                    {/* Mock Layout Graphic */}
                    <div className="mt-3 aspect-video bg-slate-100 dark:bg-slate-850 rounded-lg p-1 flex flex-col gap-1 border border-slate-200 dark:border-slate-800">
                      <div className="flex-1 bg-emerald-500/15 rounded border border-emerald-500/25 flex items-center justify-center text-[8px] font-bold text-emerald-600">Media (Full)</div>
                      <div className="h-2.5 bg-brand-500/10 rounded border border-brand-500/25 flex items-center justify-center text-[6px] font-bold text-brand-600">Ticker marquee</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Layout Extras (Positioning & Default Fallback Timing) */}
              {formLayout !== 'queue-only' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {/* Position of Queues in Split layout */}
                  {formLayout === 'split-media' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                        Queue Panel Position
                      </label>
                      <div className="flex gap-2">
                        {(['left', 'right'] as const).map((pos) => (
                          <button
                            key={pos}
                            type="button"
                            onClick={() => setFormQueuePosition(pos)}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize border cursor-pointer ${
                              formQueuePosition === pos 
                                ? 'border-brand-500 bg-white dark:bg-slate-900 text-brand-655 font-bold shadow-sm'
                                : 'border-slate-200 dark:border-slate-800 text-slate-500'
                            }`}
                          >
                            {pos === 'left' ? 'Queues Left / Media Right' : 'Media Left / Queues Right'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fallback timing */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      {t('displaySettings.transitionTime', 'Default Slide Time')}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={3}
                        max={120}
                        value={formTransitionSeconds}
                        onChange={(e) => setFormTransitionSeconds(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-brand-500"
                      />
                      <span className="text-xs text-slate-400 font-semibold">seconds</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Playlist Builder (Only for Media Layouts) */}
              {formLayout !== 'queue-only' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('displaySettings.playlistBuilder', 'Playlist Manager')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddMediaOpen(true)}
                      className="flex items-center gap-1 py-1.5 px-3 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 text-brand-655 dark:text-brand-400 font-bold text-xs rounded-lg cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('displaySettings.addMediaBtn', 'Add Media')}</span>
                    </button>
                  </div>

                  {/* Playlist Loop Elements */}
                  {formPlaylist.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-450 text-xs italic">
                      Your playlist is empty. Click "Add Media" to select items from your Media Library.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                      {formPlaylist.map((playItem, index) => {
                        const media = mediaLibrary.find((m) => m.id === playItem.mediaId);
                        if (!media) return null;

                        return (
                          <div 
                            key={`${playItem.mediaId}-${index}`}
                            className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs gap-3 hover:border-slate-300 dark:hover:border-slate-750 transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 bg-slate-200/50 dark:bg-slate-800 rounded flex items-center justify-center text-[10px] font-extrabold text-slate-550 dark:text-slate-400">
                                {index + 1}
                              </span>
                              <div className="p-1 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded">
                                {media.type === 'image' && <FileImage className="w-3.5 h-3.5 text-emerald-500" />}
                                {media.type === 'video' && <FileVideo className="w-3.5 h-3.5 text-blue-500" />}
                                {media.type === 'url' && <Link className="w-3.5 h-3.5 text-red-500" />}
                              </div>
                              <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]" title={media.name}>
                                {media.name}
                              </span>
                            </div>

                            {/* Duration settings & ordering controls */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {/* Duration Input */}
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-400 font-semibold">Time:</span>
                                <input
                                  type="number"
                                  min={3}
                                  max={3600}
                                  value={playItem.duration}
                                  onChange={(e) => updatePlaylistDuration(index, Number(e.target.value))}
                                  className="w-14 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center font-mono font-semibold"
                                />
                                <span className="text-[10px] text-slate-400">s</span>
                              </div>

                              {/* Ordering */}
                              <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 overflow-hidden">
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => movePlaylistItem(index, 'up')}
                                  className="p-1 text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={index === formPlaylist.length - 1}
                                  onClick={() => movePlaylistItem(index, 'down')}
                                  className="p-1 text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 border-l border-slate-200 dark:border-slate-800 cursor-pointer"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => removePlaylistItem(index)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-955/20 rounded-lg cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-brand-50 dark:bg-brand-950/40 rounded-xl text-brand-655 dark:text-brand-400">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Set as Active Template</h4>
                    <p className="text-[10px] text-slate-450">Instantly applies this layout configuration on the TV display.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:height-4 after:w-4 after:h-4 after:transition-all dark:border-slate-600 peer-checked:bg-brand-655 cursor-pointer"></div>
                </label>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800 dark:hover:text-white font-semibold text-sm cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-brand-655 hover:bg-brand-600 text-white font-semibold text-sm rounded-xl cursor-pointer transition-all shadow-md shadow-brand-655/10 disabled:opacity-50"
                >
                  {formLoading ? t('common.sending') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Select Media Sub-Modal */}
      {isAddMediaOpen && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <h3 className="font-black text-slate-900 dark:text-white text-sm">
                Select Media Item
              </h3>
              <button 
                onClick={() => setIsAddMediaOpen(false)}
                className="text-slate-400 hover:text-slate-655 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-96 space-y-2">
              {mediaLibrary.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs italic">
                  No media items available. Please upload files to your Media Library first.
                </div>
              ) : (
                mediaLibrary.map((media) => (
                  <div
                    key={media.id}
                    onClick={() => addMediaToPlaylist(media)}
                    className="flex items-center gap-3 p-3 border border-slate-150 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 transition-all"
                  >
                    <div className="w-12 aspect-video bg-slate-950 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {media.type === 'image' ? (
                        <img src={media.storageUrl} alt={media.name} className="object-cover w-full h-full" />
                      ) : media.type === 'video' ? (
                        <FileVideo className="w-5 h-5 text-blue-500" />
                      ) : (
                        <Link className="w-5 h-5 text-red-505" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block truncate">
                        {media.name}
                      </span>
                      <span className="text-[10px] text-slate-400 capitalize block">
                        {media.type} • duration: {media.duration}s
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisplayTemplatePage;
