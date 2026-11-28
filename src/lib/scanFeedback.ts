// Non-visual scan confirmation: couriers scan without looking at the screen.
// Tones are synthesised with WebAudio (no audio files to cache). Vibration is a
// no-op on iOS, where the sound carries the signal.

type AudioCtor = typeof AudioContext;
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (!ctx) {
    const Ctor: AudioCtor | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, duration: number) {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.3, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Some browsers throw when vibration isn't allowed; feedback is best effort.
  }
}

/** Call from a tap (e.g. "Scan with camera") so iOS lets later tones play. */
export function primeScanFeedback() {
  audio();
}

export function scanSuccess() {
  tone(1320, 0, 0.12);
  vibrate(60);
}

/** Recorded before, or queued offline: worth a glance but not an error. */
export function scanNotice() {
  tone(880, 0, 0.08);
  tone(880, 0.13, 0.08);
  vibrate([60, 60, 60]);
}

export function scanError() {
  tone(300, 0, 0.2);
  tone(300, 0.28, 0.2);
  vibrate([200, 100, 200]);
}
