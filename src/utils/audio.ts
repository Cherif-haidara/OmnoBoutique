// Web Audio API POS scanner sound synthesizer - zero external sound files required

let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

/**
 * Plays a realistic, crisp POS barcode scanner beep (similar to Datalogic / Honeywell / Zebra scanners)
 */
export const playScanSuccessBeep = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Classic POS scanner pitch: 1850Hz
    osc.frequency.setValueAtTime(1850, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1920, ctx.currentTime + 0.07);

    // Fast attack and short decay for a clean click-free beep
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.075);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  } catch (err) {
    // Ignore audio errors on un-interacted browsers
  }
};

/**
 * Plays a low-frequency double-beep error sound when a barcode is unknown or product is out of stock
 */
export const playScanErrorBeep = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Beep 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(320, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.09);

    // Beep 2
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(240, now + 0.11);
    gain2.gain.setValueAtTime(0.18, now + 0.11);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.11);
    osc2.stop(now + 0.23);
  } catch (err) {
    // Ignore audio errors
  }
};

/**
 * Triggers device haptic vibration on mobile devices
 */
export const triggerHaptic = (success = true) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (success) {
        navigator.vibrate([60]); // Quick sharp tap
      } else {
        navigator.vibrate([100, 50, 100]); // Warning buzz
      }
    } catch {
      // Haptic not supported or denied
    }
  }
};
