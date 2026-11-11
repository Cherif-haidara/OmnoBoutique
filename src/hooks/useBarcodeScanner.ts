import { useEffect, useRef, useState, useCallback } from 'react';

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  isEnabled?: boolean;
  minChars?: number;
  maxIntervalMs?: number; // Max average time between keystrokes for hardware scanner (usually 20-50ms)
}

export const useBarcodeScanner = ({
  onScan,
  isEnabled = true,
  minChars = 3,
  maxIntervalMs = 70,
}: UseBarcodeScannerOptions) => {
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [lastScanTimestamp, setLastScanTimestamp] = useState<number | null>(null);
  const [isScannerReady, setIsScannerReady] = useState(true);

  // Keep a timestamped buffer of keystrokes
  const bufferRef = useRef<{ char: string; time: number }[]>([]);
  const timeoutIdRef = useRef<any>(null);

  const clearBuffer = useCallback(() => {
    bufferRef.current = [];
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  }, []);

  const triggerManualScan = useCallback((barcode: string) => {
    const cleanCode = barcode.trim();
    if (cleanCode.length >= minChars) {
      setLastScannedCode(cleanCode);
      setLastScanTimestamp(Date.now());
      onScan(cleanCode);
    }
  }, [minChars, onScan]);

  useEffect(() => {
    if (!isEnabled) {
      clearBuffer();
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore functional modifier keys
      if (e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      const activeEl = document.activeElement as HTMLElement | null;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.isContentEditable
      );

      // Check if active input is a designated barcode field
      const isBarcodeSpecificInput = activeEl?.getAttribute('data-barcode-input') === 'true';

      const now = Date.now();

      if (e.key === 'Enter') {
        const buffer = bufferRef.current;
        
        // If buffered characters exist
        if (buffer.length >= minChars) {
          // Calculate average interval between characters
          const firstTime = buffer[0].time;
          const totalDuration = now - firstTime;
          const avgInterval = totalDuration / buffer.length;

          // If fast enough (scanner signature) or explicitly typed in barcode input
          const isHardwareScannerSpeed = avgInterval <= maxIntervalMs || totalDuration < 450;
          
          if (isHardwareScannerSpeed || isBarcodeSpecificInput || !isInput) {
            const scannedBarcode = buffer.map(b => b.char).join('').trim();
            if (scannedBarcode.length >= minChars) {
              e.preventDefault();
              e.stopPropagation();
              setLastScannedCode(scannedBarcode);
              setLastScanTimestamp(now);
              onScan(scannedBarcode);
              clearBuffer();
              return;
            }
          }
        }
        
        clearBuffer();
        return;
      }

      // Collect printable characters (letters, numbers, hyphens)
      if (e.key.length === 1) {
        // Reset if interval since last char is very large (e.g. > 500ms of inactivity)
        if (bufferRef.current.length > 0) {
          const lastCharTime = bufferRef.current[bufferRef.current.length - 1].time;
          if (now - lastCharTime > 400) {
            bufferRef.current = [];
          }
        }

        bufferRef.current.push({ char: e.key, time: now });

        // Auto-clear buffer after 600ms of silence
        if (timeoutIdRef.current) {
          clearTimeout(timeoutIdRef.current);
        }
        timeoutIdRef.current = setTimeout(() => {
          bufferRef.current = [];
        }, 600);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      clearBuffer();
    };
  }, [isEnabled, minChars, maxIntervalMs, onScan, clearBuffer]);

  return {
    isScannerReady,
    lastScannedCode,
    lastScanTimestamp,
    triggerManualScan,
    clearBuffer,
  };
};
