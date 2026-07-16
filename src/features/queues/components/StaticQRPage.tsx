import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  Printer, 
  Download, 
  Settings, 
  RefreshCw, 
  Maximize2,
  FileText,
  Bookmark,
  Hash
} from 'lucide-react';
import { useBranches } from '@/features/branches/hooks/useBranches';
import { useServices } from '@/features/services/hooks/useServices';
import { QRCodeSVG } from 'qrcode.react';

export const StaticQRPage: React.FC = () => {
  const { data: branches = [], isLoading: isLoadingBranches } = useBranches();
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');

  // Selected details
  const selectedBranch = branches.find((b) => b.id === selectedBranchId) || null;
  const { data: services = [], isLoading: isLoadingServices } = useServices(selectedBranchId);
  const selectedService = services.find((s) => s.id === selectedServiceId) || null;

  // Custom text options
  const [posterTitle, setPosterTitle] = useState('Scan to Join Queue');
  const [posterSubtitle, setPosterSubtitle] = useState('สแกนเพื่อรับคิวออนไลน์ได้ทันที');
  const [templateType, setTemplateType] = useState<'a4' | 'sticker_medium' | 'sticker_small'>('a4');

  // Auto-select defaults
  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  useEffect(() => {
    if (services.length > 0) {
      setSelectedServiceId(services[0].id);
    } else {
      setSelectedServiceId('');
    }
  }, [services]);

  // Update default text based on selected service
  useEffect(() => {
    if (selectedService) {
      setPosterTitle(`Scan to Queue: ${selectedService.name}`);
      setPosterSubtitle(`Please scan to book a queue ticket for ${selectedService.name}.`);
    } else {
      setPosterTitle('Scan to Join Queue');
      setPosterSubtitle('สแกนเพื่อรับคิวออนไลน์ได้ทันที');
    }
  }, [selectedService]);

  const joinUrl = `${window.location.origin}/join/${selectedBranchId}?service=${selectedServiceId}&autoJoin=true`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPNG = () => {
    // Generate SVG element to canvas conversion
    const svgElement = document.getElementById('poster-qr-svg');
    if (!svgElement) return;

    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);
    
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 500;
      canvas.height = 500;
      const context = canvas.getContext('2d');
      if (context) {
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, 500, 500);
        context.drawImage(image, 50, 50, 400, 400);
        
        const png = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = png;
        downloadLink.download = `static-qr-${selectedBranch?.code || 'branch'}-${selectedService?.name.replace(/\s+/g, '_') || 'service'}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };
    image.src = blobURL;
  };

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
            <QrCode className="w-6 h-6 text-brand-650 dark:text-brand-500" />
            Static QR Labels
          </h2>
          <p className="text-sm text-slate-550 dark:text-slate-400">
            Generate and print scan-to-join queue labels or A4 counter sheets.
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Settings Panel */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl shadow-sm p-6 space-y-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-3">
            <Settings className="w-4.5 h-4.5 text-brand-500" />
            QR Generator Configuration
          </h3>

          {/* Service Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
              Target Service
            </label>
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none cursor-pointer"
            >
              {isLoadingServices ? (
                <option>Loading services...</option>
              ) : services.length === 0 ? (
                <option>No services found</option>
              ) : (
                services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category || 'Service'})
                  </option>
                ))
              )}
            </select>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
              Scanning this QR will instantly add customers to this specific service.
            </p>
          </div>

          {/* Poster Customization */}
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                Instruction Title (English / Secondary)
              </label>
              <input
                type="text"
                value={posterTitle}
                onChange={(e) => setPosterTitle(e.target.value)}
                placeholder="Scan to Join Queue"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
                Instruction Subtitle (Thai / Primary)
              </label>
              <input
                type="text"
                value={posterSubtitle}
                onChange={(e) => setPosterSubtitle(e.target.value)}
                placeholder="สแกนเพื่อรับคิวออนไลน์ได้ทันที"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
              />
            </div>
          </div>

          {/* Templates selection */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-350 mb-1.5">
              Poster / Sticker Size Template
            </label>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setTemplateType('a4')}
                className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  templateType === 'a4'
                    ? 'border-brand-500 bg-brand-50/10 dark:bg-brand-950/10 text-brand-655 dark:text-brand-400'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                }`}
              >
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold">A4 Desk Sheet</h4>
                  <p className="text-[10px] text-slate-400">Great for lobby tables, desks, or notice boards.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('sticker_medium')}
                className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  templateType === 'sticker_medium'
                    ? 'border-brand-500 bg-brand-50/10 dark:bg-brand-950/10 text-brand-655 dark:text-brand-400'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                }`}
              >
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                  <Bookmark className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold">Medium Tent Card (80mm)</h4>
                  <p className="text-[10px] text-slate-400">Perfect size for queue counters or plexiglass stands.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('sticker_small')}
                className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  templateType === 'sticker_small'
                    ? 'border-brand-500 bg-brand-50/10 dark:bg-brand-950/10 text-brand-655 dark:text-brand-400'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                }`}
              >
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                  <Hash className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold">Small minimal label (50mm)</h4>
                  <p className="text-[10px] text-slate-400">Compact label for thermal printing or counter plaques.</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Preview Panel */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleDownloadPNG}
              disabled={!selectedServiceId}
              className="flex items-center gap-1.5 py-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-white border border-slate-250 dark:border-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download QR PNG</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={!selectedServiceId}
              className="flex items-center gap-1.5 py-2 px-4 bg-brand-655 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-655/10 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Poster (PDF)</span>
            </button>
          </div>

          {/* Interactive Live Preview Box */}
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-250 dark:border-slate-800/80 rounded-3xl p-6 flex justify-center items-center overflow-hidden min-h-[500px] shadow-inner relative">
            <div className="absolute top-4 left-4 flex items-center gap-1.5 text-xs text-slate-400 font-semibold select-none">
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Real-time Printed Preview</span>
            </div>

            {selectedServiceId ? (
              /* Printable Sheet Frame (Simulates Paper) */
              <div 
                id="print-area" 
                className={`bg-white text-slate-900 shadow-xl border border-slate-200 mx-auto flex flex-col items-center justify-between text-center select-none font-sans overflow-hidden transition-all duration-300 ${
                  templateType === 'a4' 
                    ? 'w-[360px] h-[509px] p-8 rounded-lg' 
                    : templateType === 'sticker_medium' 
                      ? 'w-[280px] h-[280px] p-6 rounded-2xl' 
                      : 'w-[200px] h-[200px] p-4 rounded-xl'
                }`}
              >
                {/* Header Content */}
                {templateType !== 'sticker_small' && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-600">
                      {selectedBranch?.name || 'SERVICE BRANCH'}
                    </span>
                    <h3 className="text-sm font-black text-slate-950 truncate max-w-[280px] leading-tight">
                      {selectedService?.name || 'Service Booking'}
                    </h3>
                  </div>
                )}

                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center flex-1 my-2">
                  <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                    {/* Hidden canvas element for SVG download */}
                    <div className="hidden">
                      <QRCodeSVG
                        id="poster-qr-svg"
                        value={joinUrl}
                        size={400}
                        level="Q"
                      />
                    </div>
                    {/* Display SVG */}
                    <QRCodeSVG
                      value={joinUrl}
                      size={
                        templateType === 'a4' 
                          ? 180 
                          : templateType === 'sticker_medium' 
                            ? 120 
                            : 100
                      }
                      level="Q"
                      includeMargin={false}
                    />
                  </div>
                </div>

                {/* Footer Content */}
                <div className="space-y-1">
                  <h4 className={`font-bold text-slate-900 leading-tight ${
                    templateType === 'sticker_small' ? 'text-[11px]' : 'text-xs'
                  }`}>
                    {posterTitle}
                  </h4>
                  {templateType === 'a4' && (
                    <p className="text-[10px] text-slate-500 leading-normal max-w-[260px] mx-auto">
                      {posterSubtitle}
                    </p>
                  )}
                  {templateType !== 'sticker_small' && (
                    <div className="text-[9px] font-mono text-slate-400 uppercase tracking-widest mt-2 border-t border-slate-100 pt-2 w-full">
                      ServiceOS Smart Check-In
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-slate-400 italic">Select a service to display preview.</div>
            )}
          </div>
        </div>
      </div>

      {/* Styled Printable Sheet (Hidden by default, displayed in media print) */}
      {selectedServiceId && (
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            /* Hide the normal dashboard elements */
            body * {
              visibility: hidden !important;
            }
            /* Show ONLY our print area */
            #print-area, #print-area * {
              visibility: visible !important;
            }
            #print-area {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              height: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: center !important;
              align-items: center !important;
              background-color: white !important;
              color: black !important;
            }
            ${templateType === 'a4' ? `
              #print-area {
                width: 210mm !important;
                height: 297mm !important;
                padding: 30mm 20mm !important;
              }
              #print-area h3 { font-size: 26pt !important; }
              #print-area h4 { font-size: 20pt !important; }
              #print-area p { font-size: 14pt !important; }
              #print-area svg { width: 120mm !important; height: 120mm !important; }
            ` : templateType === 'sticker_medium' ? `
              #print-area {
                width: 80mm !important;
                height: 80mm !important;
                padding: 8mm !important;
              }
              #print-area h3 { font-size: 11pt !important; }
              #print-area h4 { font-size: 10pt !important; }
              #print-area svg { width: 42mm !important; height: 42mm !important; }
            ` : `
              #print-area {
                width: 50mm !important;
                height: 50mm !important;
                padding: 4mm !important;
              }
              #print-area h4 { font-size: 8pt !important; }
              #print-area svg { width: 30mm !important; height: 30mm !important; }
            `}
          }
        `}} />
      )}
    </div>
  );
};
export default StaticQRPage;
