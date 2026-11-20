import type { CueStyle } from '../types/schemas';

let audioCtx: AudioContext | null = null;

function playBeep(frequency: number, durationMs: number): void {
  if (typeof window === 'undefined') return;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;

  try {
    if (!audioCtx) {
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + durationMs / 1000);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + durationMs / 1000);
  } catch {
    // Ignore audio context restrictions if user hasn't interacted yet
  }
}

export function triggerRestCue(cueStyle: CueStyle, kind: 'warning_3s' | 'complete'): void {
  if (cueStyle === 'silent_visual') return;

  if (cueStyle === 'audio_and_vibrate') {
    if (kind === 'warning_3s') {
      playBeep(660, 110);
    } else {
      playBeep(880, 260);
    }
  }

  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    if (kind === 'warning_3s') {
      navigator.vibrate(90);
    } else {
      navigator.vibrate([180, 80, 240]);
    }
  }
}

export function playPhaseTick(cueStyle: CueStyle, isUpPhase: boolean): void {
  if (cueStyle === 'silent_visual') return;
  if (cueStyle === 'audio_and_vibrate') {
    playBeep(isUpPhase ? 740 : 520, 60);
  }
}
