import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, Printer, Copy, Check } from 'lucide-react';
import { Branch } from '@/types/firestore';

interface QRPosterModalProps {
  branch: Branch | null;
  onClose: () => void;
}

export const QRPosterModal: React.FC<QRPosterModalProps> = ({ branch, onClose }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = React.useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!branch) return null;

  const joinUrl = `${window.location.origin}/join/${branch.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleDownloadQR = () => {
    const svgElement = document.getElementById(`qr-svg-${branch.id}`);
    if (!svgElement) return;

    // Convert SVG to XML string
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    // Create a temporary image element
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 4; // High resolution
      canvas.width = 300 * scale;
      canvas.height = 300 * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Trigger download
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `QR-${branch.code}-${branch.name}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handlePrint = () => {
    const printContent = printAreaRef.current?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${branch.name} - QR Code Poster</title>
          <style>
            body {
              font-family: 'Outfit', 'Inter', sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              background-color: #ffffff;
              color: #0f172a;
              text-align: center;
            }
            .poster-card {
              border: 3px solid #3b82f6;
              border-radius: 24px;
              padding: 40px;
              max-width: 500px;
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
            }
            .logo-placeholder {
              width: 60px;
              height: 60px;
              border-radius: 16px;
              background-color: #3b82f6;
              color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 32px;
              font-weight: 800;
              margin: 0 auto 20px;
            }
            .title {
              font-size: 28px;
              font-weight: 800;
              margin: 0 0 10px;
              letter-spacing: -0.025em;
            }
            .subtitle {
              font-size: 16px;
              color: #64748b;
              margin: 0 0 30px;
            }
            .qr-container {
              padding: 20px;
              background: #f8fafc;
              border: 1px dashed #cbd5e1;
              border-radius: 16px;
              display: inline-block;
              margin-bottom: 30px;
            }
            .instructions {
              font-size: 18px;
              font-weight: 700;
              margin: 0 0 10px;
            }
            .instructions-sub {
              font-size: 14px;
              color: #64748b;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="poster-card">
            <div class="logo-placeholder">S</div>
            <div class="title">ServiceOS</div>
            <div class="subtitle">${branch.name} (${branch.code})</div>
            <div class="qr-container">
              ${svgElementOuterHTML()}
            </div>
            <div class="instructions">${t('pages.branches.scanToJoin')}</div>
            <div class="instructions-sub">${t('pages.branches.scanInstructions')}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const svgElementOuterHTML = () => {
    const svg = document.getElementById(`qr-svg-${branch.id}`);
    return svg ? svg.outerHTML : '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/80">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('pages.branches.qrPosterTitle')}
            </h3>
            <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">
              {branch.name} ({branch.code})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Poster Content (Printable area definition) */}
        <div className="p-8 flex flex-col items-center text-center" ref={printAreaRef}>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl shadow-inner mb-6">
            <QRCodeSVG
              id={`qr-svg-${branch.id}`}
              value={joinUrl}
              size={220}
              level="H"
              includeMargin={true}
              className="bg-white p-2 rounded-lg"
            />
          </div>

          <h4 className="text-base font-bold text-slate-800 dark:text-white">
            {t('pages.branches.scanToJoin')}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
            {t('pages.branches.scanInstructions')}
          </p>

          {/* Target URL */}
          <div className="w-full mt-6 flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-850 rounded-xl">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate max-w-[260px] text-left">
              {joinUrl}
            </span>
            <button
              onClick={handleCopyLink}
              className="p-1.5 text-slate-400 hover:text-brand-500 dark:hover:text-brand-400 rounded-lg hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-250 dark:hover:border-slate-700 shadow-sm transition-all duration-205 cursor-pointer"
              title="Copy URL"
            >
              {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-3">
          <button
            onClick={handleDownloadQR}
            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-250 font-semibold text-sm rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{t('pages.branches.downloadQR')}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm rounded-xl shadow-md shadow-brand-600/15 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{t('pages.branches.printQR')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRPosterModal;
