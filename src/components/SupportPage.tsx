import React, { useState } from 'react';
import { Download, ChevronDown, ChevronUp, ArrowLeft, Heart, Check, Sparkles, AlertCircle } from 'lucide-react';

interface SupportPageProps {
  onReturn: () => void;
  appName?: string;
}

const QR_IMAGE_URL = 'https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/Bank%20QR/QR%20RYT%20for%20Sumbangan.jpg';

export function SupportPage({ onReturn, appName = 'One Tap Timer' }: SupportPageProps) {
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const handleSaveQR = async () => {
    setDownloadStatus('saving');
    try {
      // Fetch as blob for standard browser download
      const response = await fetch(QR_IMAGE_URL, { mode: 'cors' });
      if (!response.ok) {
        throw new Error('Failed to fetch image directly');
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'QR_Syncrozz_Sumbangan.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      setDownloadStatus('success');
      setTimeout(() => setDownloadStatus('idle'), 3000);
    } catch (err) {
      console.warn('Direct blob download failed, trying canvas fallback:', err);
      // Fallback via Image -> Canvas -> Blob
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              canvas.toBlob((blob) => {
                if (blob) {
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'QR_Syncrozz_Sumbangan.jpg';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  setDownloadStatus('success');
                  setTimeout(() => setDownloadStatus('idle'), 3000);
                  return;
                }
                throw new Error('Blob creation failed');
              }, 'image/jpeg', 0.95);
            }
          } catch (canvasErr) {
            console.error('Canvas export failed:', canvasErr);
            // Final fallback: open image in new tab
            window.open(QR_IMAGE_URL, '_blank');
            setDownloadStatus('error');
            setTimeout(() => setDownloadStatus('idle'), 4000);
          }
        };
        img.onerror = () => {
          // Open direct URL in new tab for manual saving
          window.open(QR_IMAGE_URL, '_blank');
          setDownloadStatus('error');
          setTimeout(() => setDownloadStatus('idle'), 4000);
        };
        img.src = QR_IMAGE_URL;
      } catch {
        window.open(QR_IMAGE_URL, '_blank');
        setDownloadStatus('error');
        setTimeout(() => setDownloadStatus('idle'), 4000);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col justify-between relative overflow-x-hidden font-sans">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[55%] h-[55%] bg-rose-600/20 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-[30%] right-[10%] w-[35%] h-[35%] bg-purple-500/15 rounded-full blur-[110px] pointer-events-none" />

      {/* Header Bar with Back Button */}
      <header className="w-full max-w-lg mx-auto px-5 pt-6 pb-2 flex items-center justify-between z-10">
        <button
          onClick={onReturn}
          id="support-return-header-btn"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-white/80 hover:text-white border border-white/10 backdrop-blur-md transition-all text-xs font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
          <Heart className="w-3.5 h-3.5 fill-rose-500/60 text-rose-400" />
          <span>Sokongan Komuniti</span>
        </div>
      </header>

      {/* Main Support Experience Content */}
      <main className="w-full max-w-lg mx-auto flex-1 flex flex-col items-center justify-center px-5 py-4 z-10">
        <div className="w-full bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col items-center text-center">
          
          {/* Support Title */}
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500/20 to-indigo-500/20 border border-white/15 mb-3 shadow-inner">
            <Heart className="w-6 h-6 text-rose-400 fill-rose-500/40" />
          </div>

          <h1 id="support-main-title" className="text-2xl font-bold tracking-tight text-white mb-2 flex items-center justify-center gap-2">
            <span>Sokong Inovasi Ini</span>
            <span className="text-rose-400">❤️</span>
          </h1>

          {/* Short Friendly Description */}
          <p className="text-sm text-slate-300/90 leading-relaxed max-w-sm mb-6">
            Jika platform ini memberi manfaat dan memudahkan urusan harian anda, sokongan ikhlas anda amat bermakna untuk menampung kos pelayan serta menyokong inovasi pembangunan berterusan.
          </p>

          {/* Real Donation QR Code Container */}
          <div className="w-full max-w-[260px] sm:max-w-[280px] bg-white rounded-2xl p-3 shadow-2xl border border-white/30 flex flex-col items-center mb-4 transition-transform duration-300 hover:scale-[1.02]">
            <img
              src={QR_IMAGE_URL}
              alt="DuitNow Bank QR Code Sumbangan Syncrozz"
              className="w-full h-auto object-contain rounded-xl aspect-square"
              loading="eager"
              referrerPolicy="no-referrer"
            />
            <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-gray-700 tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-rose-500" />
              <span>DuitNow QR / Semua Bank &amp; eWallet</span>
            </div>
          </div>

          {/* Save QR Code Button */}
          <button
            onClick={handleSaveQR}
            id="save-qr-btn"
            disabled={downloadStatus === 'saving'}
            className="w-full max-w-[280px] flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-white text-gray-900 hover:bg-slate-100 active:scale-98 font-semibold text-sm shadow-lg shadow-white/10 transition-all cursor-pointer mb-5 disabled:opacity-75"
          >
            {downloadStatus === 'saving' ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                <span>Menyimpan QR Code...</span>
              </>
            ) : downloadStatus === 'success' ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">QR Berjaya Disimpan!</span>
              </>
            ) : downloadStatus === 'error' ? (
              <>
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>QR Dibuka (Tekan &amp; Simpan)</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-indigo-600" />
                <span>Save QR Code</span>
              </>
            )}
          </button>

          {/* How To Pay Accordion */}
          <div className="w-full text-left mb-5">
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden transition-colors hover:border-white/20">
              <button
                type="button"
                onClick={() => setIsAccordionOpen(!isAccordionOpen)}
                id="how-to-pay-accordion-toggle"
                className="w-full flex items-center justify-between p-4 text-left text-sm font-medium text-white/90 hover:text-white transition-colors"
                aria-expanded={isAccordionOpen}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">📱</span>
                  <span className="font-semibold text-xs sm:text-sm">Cara Bayar Guna Galeri (How To Pay)</span>
                </div>
                {isAccordionOpen ? (
                  <ChevronUp className="w-4 h-4 text-white/60" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-white/60" />
                )}
              </button>

              {isAccordionOpen && (
                <div className="px-4 pb-4 pt-1 text-xs text-slate-300 border-t border-white/5 space-y-2.5 leading-relaxed animate-in fade-in duration-200">
                  <ol className="list-decimal list-inside space-y-2 text-slate-300/90 pl-1">
                    <li>
                      <strong className="text-white">Simpan QR:</strong> Tekan butang <span className="text-indigo-300 font-medium">"Save QR Code"</span> di atas ke dalam galeri foto peranti anda.
                    </li>
                    <li>
                      <strong className="text-white">Buka Aplikasi:</strong> Buka aplikasi perbankan (cth: Maybank MAE, CIMB, Bank Islam) atau e-Dompet pilihan anda (TNG eWallet, ShopeePay, dsb).
                    </li>
                    <li>
                      <strong className="text-white">Pilih Imbas Galeri:</strong> Tekan menu <strong>DuitNow QR / Scan</strong> dan pilih ikon <strong>"Scan from Gallery / Album"</strong>.
                    </li>
                    <li>
                      <strong className="text-white">Pilih Gambar QR:</strong> Pilih gambar kod QR yang telah disimpan tadi dari galeri anda.
                    </li>
                    <li>
                      <strong className="text-white">Sahkan Bayaran:</strong> Masukkan sebarang amaun ikhlas dan selesaikan pengesahan keselamatan bank.
                    </li>
                  </ol>
                </div>
              )}
            </div>
          </div>

          {/* Appreciation Message */}
          <div className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-500/10 via-purple-500/10 to-indigo-500/10 border border-rose-500/20 text-center mb-6">
            <p className="text-xs sm:text-sm font-semibold text-rose-200 flex items-center justify-center gap-1.5">
              <span>RM1 pun amat dihargai 👏</span>
            </p>
          </div>

          {/* Return Button */}
          <button
            onClick={onReturn}
            id="return-to-platform-btn"
            className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-98 text-white font-medium text-sm border border-white/15 shadow-md transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-white/70" />
            <span>Kembali ke {appName}</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-lg mx-auto px-6 py-4 text-center z-10">
        <p className="text-xs text-white/40">
          Develop By{' '}
          <a
            href="https://wasap.my/60145313756"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/70 hover:text-indigo-300 font-medium underline underline-offset-2 transition-colors"
          >
            Syncrozz
          </a>
        </p>
      </footer>
    </div>
  );
}
