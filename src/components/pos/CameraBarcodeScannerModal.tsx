import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  X, 
  Camera, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  ShoppingBag, 
  Keyboard, 
  Scan,
  Smartphone
} from 'lucide-react';
import { playScanSuccessBeep, playScanErrorBeep, triggerHaptic } from '../../utils/audio';

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeScanned: (barcode: string) => { success: boolean; productName?: string; error?: string };
  storeName: string;
  cartCount: number;
}

export const CameraBarcodeScannerModal: React.FC<CameraBarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onBarcodeScanned,
  storeName,
  cartCount,
}) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isContinuous, setIsContinuous] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastScanResult, setLastScanResult] = useState<{
    barcode: string;
    productName?: string;
    success: boolean;
    error?: string;
    time: number;
  } | null>(null);
  const [manualCode, setManualCode] = useState('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'interactive-camera-barcode-viewfinder';
  const isProcessingScanRef = useRef(false);

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const handleScanSuccess = useCallback((decodedText: string) => {
    // Avoid double firing within 800ms for continuous scan
    if (isProcessingScanRef.current) return;
    isProcessingScanRef.current = true;

    const cleanCode = decodedText.trim();
    const result = onBarcodeScanned(cleanCode);

    if (result.success) {
      if (soundEnabled) playScanSuccessBeep();
      triggerHaptic(true);
      setLastScanResult({
        barcode: cleanCode,
        productName: result.productName,
        success: true,
        time: Date.now(),
      });

      if (!isContinuous) {
        setTimeout(() => {
          stopScanner();
          onClose();
        }, 300);
      }
    } else {
      if (soundEnabled) playScanErrorBeep();
      triggerHaptic(false);
      setLastScanResult({
        barcode: cleanCode,
        error: result.error || 'Code-barres introuvable',
        success: false,
        time: Date.now(),
      });
    }

    // Cooldown before scanning next item in continuous mode
    setTimeout(() => {
      isProcessingScanRef.current = false;
    }, 1200);
  }, [onBarcodeScanned, soundEnabled, isContinuous, stopScanner, onClose]);

  const startScanner = useCallback(async () => {
    setCameraError(null);
    try {
      // Clean previous instance if exists
      if (html5QrCodeRef.current) {
        await stopScanner();
      }

      const formatsToSupport = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.QR_CODE,
      ];

      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport,
        verbose: false,
      });
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 280, height: 180 },
        aspectRatio: 1.333333,
      };

      await html5QrCode.start(
        { facingMode: { exact: facingMode } },
        config,
        (decodedText) => handleScanSuccess(decodedText),
        () => {
          // ignore frame decode failures
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.warn(`Could not start camera with exact ${facingMode}, trying fallback:`, err);
      // Fallback without exact constraint (for desktop webcams or laptops)
      try {
        if (html5QrCodeRef.current) {
          await html5QrCodeRef.current.start(
            { facingMode: facingMode },
            {
              fps: 15,
              qrbox: { width: 280, height: 180 },
              aspectRatio: 1.333333,
            },
            (decodedText) => handleScanSuccess(decodedText),
            () => {}
          );
          setIsScanning(true);
        }
      } catch (fallbackErr: any) {
        setCameraError(
          fallbackErr?.message?.includes('Permission')
            ? 'Accès caméra refusé. Veuillez autoriser l\'accès caméra dans les paramètres de votre navigateur.'
            : 'Aucune caméra compatible détectée ou caméra déjà utilisée par une autre application.'
        );
        setIsScanning(false);
      }
    }
  }, [facingMode, handleScanSuccess, stopScanner]);

  useEffect(() => {
    if (isOpen) {
      // Delay slightly to ensure DOM element is mounted
      const timer = setTimeout(() => {
        startScanner();
      }, 100);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, startScanner, stopScanner]);

  const handleToggleCamera = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleScanSuccess(manualCode.trim());
    setManualCode('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 text-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100">Scanner Caméra</h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Mobile & PC
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {storeName} · <span className="text-emerald-400 font-semibold">{cartCount} article(s)</span> au panier
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-1.5 rounded-lg border transition-colors ${
                soundEnabled 
                  ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700' 
                  : 'bg-rose-950/60 text-rose-300 border-rose-800'
              }`}
              title={soundEnabled ? 'Bip sonore actif' : 'Bip sonore muet'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Switch Camera */}
            <button
              type="button"
              onClick={handleToggleCamera}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              title="Basculer vers caméra avant / arrière"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewfinder Section */}
        <div className="relative bg-black flex-1 flex flex-col items-center justify-center min-h-[300px] overflow-hidden">
          
          {/* Target Scanning Box Container */}
          <div 
            id={scannerContainerId} 
            className="w-full h-full min-h-[290px] flex items-center justify-center"
          />

          {/* Overlay Targeting Reticle & Laser */}
          {isScanning && !cameraError && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
              <div className="relative w-64 h-44 rounded-xl border-2 border-indigo-500/70 shadow-[0_0_20px_rgba(99,102,241,0.3)] flex items-center justify-center overflow-hidden">
                
                {/* 4 Corner Targeting brackets */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-indigo-400 rounded-tl" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-indigo-400 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-indigo-400 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-indigo-400 rounded-br" />

                {/* Animated Red Scanning Laser Line */}
                <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse" />

                <span className="absolute bottom-1.5 text-[10px] font-mono tracking-wider text-indigo-200/90 bg-slate-950/70 px-2 py-0.5 rounded">
                  Placez le code-barres ici
                </span>
              </div>
            </div>
          )}

          {/* Camera Error Message */}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900/95 space-y-3">
              <AlertTriangle className="w-10 h-10 text-amber-400" />
              <h4 className="text-sm font-bold text-slate-100">Accès Caméra Requis</h4>
              <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
                {cameraError}
              </p>
              <button
                type="button"
                onClick={startScanner}
                className="px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Réessayer la connexion caméra</span>
              </button>
            </div>
          )}

          {/* Instant Last Scan Overlay Badge */}
          {lastScanResult && (
            <div 
              key={lastScanResult.time} 
              className={`absolute top-3 left-3 right-3 p-3 rounded-xl shadow-xl flex items-center justify-between gap-2.5 animate-in slide-in-from-top-3 duration-200 ${
                lastScanResult.success 
                  ? 'bg-emerald-900/90 border border-emerald-500/80 text-white' 
                  : 'bg-rose-900/90 border border-rose-500/80 text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                {lastScanResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-300 shrink-0" />
                )}
                <div>
                  <div className="text-xs font-bold leading-tight">
                    {lastScanResult.success 
                      ? `${lastScanResult.productName || 'Article scanné'} (+1 au panier)` 
                      : lastScanResult.error}
                  </div>
                  <div className="text-[10px] opacity-80 font-mono mt-0.5">
                    Code: {lastScanResult.barcode}
                  </div>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-black/30 shrink-0">
                {lastScanResult.success ? 'Succès' : 'Échec'}
              </span>
            </div>
          )}

        </div>

        {/* Continuous vs Single Scan Mode Switcher */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2.5 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Mode de numérisation :</span>
            <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setIsContinuous(true)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                  isContinuous ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Scan en chaîne (continu)
              </button>
              <button
                type="button"
                onClick={() => setIsContinuous(false)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                  !isContinuous ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Scan unique
              </button>
            </div>
          </div>

          {/* Quick Manual Code Input (Backup) */}
          <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Keyboard className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Saisir code manuellement si illisible..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg border border-slate-700 transition-colors shrink-0"
            >
              Ajouter
            </button>
          </form>

          {/* Bottom Footer Details */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span className="flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
              Prend en charge EAN-13, EAN-8, UPC, Code 128
            </span>
            <button
              type="button"
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
            >
              Terminer & voir panier ➔
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
