import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTenant } from '@/context/TenantContext';
import { 
  Upload, 
  Link2, 
  Trash2, 
  Eye, 
  Video, 
  Image as ImageIcon, 
  Youtube, 
  AlertCircle, 
  CheckCircle, 
  X,
  Clock
} from 'lucide-react';
import { MediaItem } from '@/types/firestore';
import { db } from '@/config/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { 
  subscribeMediaItems, 
  addMediaItem, 
  deleteMediaItem, 
  uploadMediaFile 
} from '../repository/displayRepository';

export const MediaLibraryPage: React.FC = () => {
  const { t } = useTranslation();
  const { tenant, subscription } = useTenant();
  const isFreePlan = subscription?.planId === 'starter' || !subscription?.planId;

  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'url'>('all');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Link Form State
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [urlName, setUrlName] = useState('');
  const [urlPath, setUrlPath] = useState('');
  const [urlDuration, setUrlDuration] = useState(10);
  const [urlFormLoading, setUrlFormLoading] = useState(false);

  // Preview Modal State
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  useEffect(() => {
    if (!tenant?.id) return;

    setLoading(true);
    
    if (isFreePlan) {
      // Free plan: Read global system media library
      const q = collection(db, 'systemMedia');
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items: MediaItem[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() } as MediaItem);
        });
        setMediaItems(items);
        setLoading(false);
      }, (err) => {
        console.error('Error fetching global system media:', err);
        setError('Failed to load system media items');
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // Paid plan: Read tenant-specific media
      const unsubscribe = subscribeMediaItems(
        tenant.id,
        (items) => {
          setMediaItems(items);
          setLoading(false);
        },
        (err) => {
          console.error('Error subscribing to media library:', err);
          setError('Failed to load media items');
          setLoading(false);
        }
      );
      return () => unsubscribe();
    }
  }, [tenant?.id, isFreePlan]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !tenant?.id) return;
    await processFile(files[0]);
  };

  const processFile = async (file: File) => {
    if (!tenant?.id) return;
    setError(null);
    setIsUploading(true);
    setUploadProgress(10); // Mock progress

    try {
      const type: 'image' | 'video' = file.type.startsWith('video/') ? 'video' : 'image';
      
      // Upload file to Firebase Storage
      setUploadProgress(40);
      const downloadUrl = await uploadMediaFile(tenant.id, file);
      setUploadProgress(80);

      // Create document in Firestore
      const defaultDuration = type === 'video' ? 15 : 10;
      await addMediaItem(tenant.id, file.name, type, downloadUrl, defaultDuration);
      setUploadProgress(100);

      showSuccess('Media file uploaded successfully');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to upload media file');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !urlPath || !urlName) return;

    setUrlFormLoading(true);
    setError(null);

    try {
      await addMediaItem(tenant.id, urlName, 'url', urlPath, urlDuration);
      showSuccess('External media link added successfully');
      setIsUrlModalOpen(false);
      setUrlName('');
      setUrlPath('');
      setUrlDuration(10);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to save URL stream');
    } finally {
      setUrlFormLoading(false);
    }
  };

  const handleDelete = async (item: MediaItem) => {
    if (!window.confirm('Are you sure you want to delete this media item? It will be removed from all display playlists.')) return;
    try {
      await deleteMediaItem(item.id, item.storageUrl);
      showSuccess('Media item deleted');
    } catch (err: any) {
      console.error(err);
      setError('Failed to delete media item');
    }
  };

  // Helper to extract YouTube Video ID
  const getYoutubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\/\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const filteredItems = mediaItems.filter(item => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('pages.media.title', 'Media Library')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('pages.media.subtitle', 'Upload assets and external media streams for TV Displays')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsUrlModalOpen(true)}
            disabled={isFreePlan}
            className="flex items-center gap-1.5 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-semibold text-sm rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Link2 className="w-4.5 h-4.5" />
            <span>{t('pages.media.addUrlBtn', 'Add URL / YouTube')}</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isFreePlan}
            className="flex items-center gap-1.5 py-2.5 px-4 bg-brand-655 hover:bg-brand-600 text-white font-semibold text-sm rounded-xl shadow-md shadow-brand-655/10 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4.5 h-4.5" />
            <span>{isUploading ? t('pages.media.uploading', 'Uploading...') : t('pages.media.uploadBtn', 'Upload File')}</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*,video/*"
            className="hidden"
          />
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

      {/* Drag & Drop Zone vs Plan Alert Notice */}
      {isFreePlan ? (
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 p-4 rounded-2xl text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-brand-500 animate-pulse" />
          <div>
            <span className="font-bold block mb-1">Starter (Free Plan) Restrictions</span>
            <span>
              Your current subscription plan only permits selecting from the System-Wide Curated Media Library. To upload custom images, videos, or external streaming URLs, please upgrade to a paid plan tier in the Subscription portal.
            </span>
          </div>
        </div>
      ) : (
        <div 
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={async (e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              await processFile(e.dataTransfer.files[0]);
            }
          }}
          className="border-2 border-dashed border-slate-350 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 rounded-3xl p-8 text-center cursor-pointer bg-white dark:bg-slate-900 transition-all group shadow-sm"
        >
          <Upload className="w-10 h-10 text-slate-400 group-hover:text-brand-500 mx-auto mb-3 transition-colors" />
          <span className="font-semibold text-slate-805 dark:text-white text-sm block">
            {t('pages.media.dragDropText', 'Drag and drop media files here, or click to upload')}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">Supports JPG, PNG, WEBP, MP4, MOV up to 50MB</span>
          {isUploading && (
            <div className="mt-4 max-w-xs mx-auto">
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand-500 transition-all duration-300" 
                  style={{ width: `${uploadProgress || 10}%` }}
                ></div>
              </div>
              <span className="text-[10px] text-slate-450 mt-1 block">Uploading... {uploadProgress || 10}%</span>
            </div>
          )}
        </div>
      )}

      {/* Filters & Grid */}
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
          {(['all', 'image', 'video', 'url'] as const).map((tFilter) => (
            <button
              key={tFilter}
              onClick={() => setFilter(tFilter)}
              className={`px-4 py-2 text-sm font-semibold rounded-xl capitalize transition-all cursor-pointer ${
                filter === tFilter 
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tFilter === 'url' ? 'YouTube / External' : tFilter}
            </button>
          ))}
        </div>

        {/* Media Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
            <Clock className="w-8 h-8 text-brand-655 animate-spin" />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">{t('common.loading')}</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-3xl">
            <ImageIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">{t('pages.media.noMedia', 'No media items found')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Add some images, videos, or external URLs above to populate your media library.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredItems.map((item) => {
              const ytId = item.type === 'url' ? getYoutubeId(item.storageUrl) : null;
              const thumbnail = ytId 
                ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`
                : item.type === 'image' ? item.storageUrl : null;

              return (
                <div 
                  key={item.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col h-full relative"
                >
                  {/* Thumbnail / Media Container */}
                  <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                    {thumbnail ? (
                      <img 
                        src={thumbnail} 
                        alt={item.name} 
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : item.type === 'video' ? (
                      <video 
                        src={item.storageUrl} 
                        className="object-cover w-full h-full"
                        muted 
                        preload="metadata"
                      />
                    ) : (
                      <Link2 className="w-8 h-8 text-slate-655" />
                    )}

                    {/* YouTube Logo overlay */}
                    {ytId && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                        <Youtube className="w-10 h-10 text-red-600 fill-white" />
                      </div>
                    )}

                    {/* Action Overlay */}
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-all duration-200">
                      <button
                        onClick={() => setPreviewItem(item)}
                        className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl cursor-pointer backdrop-blur-md transition-colors"
                        title="Preview"
                      >
                        <Eye className="w-4.5 h-4.5" />
                      </button>
                      {!isFreePlan && (
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-2 bg-red-600/80 hover:bg-red-655 text-white rounded-xl cursor-pointer backdrop-blur-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="p-3.5 flex flex-col justify-between flex-grow">
                    <span className="font-bold text-slate-800 dark:text-white text-xs line-clamp-1 block mb-1">
                      {item.name}
                    </span>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold uppercase">
                        {item.type === 'image' && <ImageIcon className="w-3 h-3 text-emerald-500" />}
                        {item.type === 'video' && <Video className="w-3 h-3 text-blue-500" />}
                        {item.type === 'url' && <Youtube className="w-3 h-3 text-red-500" />}
                        {item.type === 'url' ? 'YouTube' : item.type}
                      </span>
                      <span className="text-[10px] bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-450 px-1.5 py-0.5 rounded-md font-mono font-semibold">
                        {item.duration}s
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* External URL Modal */}
      {isUrlModalOpen && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                {t('pages.media.addUrlBtn', 'Add URL / YouTube Stream')}
              </h3>
              <button 
                onClick={() => setIsUrlModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleLinkSubmit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  {t('pages.media.mediaName', 'Media Name')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Promotional Feed, YouTube Live Stream"
                  value={urlName}
                  onChange={(e) => setUrlName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/85 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  {t('pages.media.urlPlaceholder', 'Paste Stream URL')}
                </label>
                <input
                  type="url"
                  required
                  placeholder="e.g. https://www.youtube.com/watch?v=..."
                  value={urlPath}
                  onChange={(e) => setUrlPath(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/85 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  {t('pages.media.durationLabel', 'Default Duration (seconds)')}
                </label>
                <input
                  type="number"
                  required
                  min={5}
                  max={3600}
                  value={urlDuration}
                  onChange={(e) => setUrlDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/85 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsUrlModalOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800 dark:hover:text-white font-semibold text-sm cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={urlFormLoading}
                  className="px-4 py-2 bg-brand-655 hover:bg-brand-600 text-white font-semibold text-sm rounded-xl cursor-pointer transition-all shadow-md shadow-brand-655/10 disabled:opacity-50"
                >
                  {urlFormLoading ? t('common.sending') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Large Preview Overlay */}
      {previewItem && (
        <div className="fixed inset-0 bg-slate-950/90 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <button 
            onClick={() => setPreviewItem(null)}
            className="absolute top-4 right-4 text-white hover:text-slate-350 p-2 cursor-pointer bg-slate-900/50 rounded-xl"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="w-full max-w-4xl max-h-[80vh] flex flex-col items-center justify-center">
            {previewItem.type === 'image' && (
              <img 
                src={previewItem.storageUrl} 
                alt={previewItem.name} 
                className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl border border-slate-800"
              />
            )}
            
            {previewItem.type === 'video' && (
              <video 
                src={previewItem.storageUrl} 
                controls 
                autoPlay 
                className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl border border-slate-800"
              />
            )}

            {previewItem.type === 'url' && (
              (() => {
                const ytId = getYoutubeId(previewItem.storageUrl);
                if (ytId) {
                  return (
                    <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
                      <iframe 
                        width="100%" 
                        height="100%" 
                        src={`https://www.youtube.com/embed/${ytId}?autoplay=1`} 
                        title="YouTube video player" 
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                      ></iframe>
                    </div>
                  );
                }
                return (
                  <div className="bg-slate-900 p-8 rounded-2xl text-center max-w-md w-full border border-slate-800">
                    <Link2 className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                    <span className="text-white font-bold block mb-1">External Web URL</span>
                    <a href={previewItem.storageUrl} target="_blank" rel="noreferrer" className="text-brand-400 break-all hover:underline text-xs">
                      {previewItem.storageUrl}
                    </a>
                  </div>
                );
              })()
            )}

            <div className="mt-4 text-center">
              <h4 className="text-white font-black text-sm">{previewItem.name}</h4>
              <span className="text-xs text-slate-400 mt-1 capitalize font-mono block">
                {previewItem.type} • default duration: {previewItem.duration}s
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaLibraryPage;
