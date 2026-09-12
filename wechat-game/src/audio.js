import { AUDIO_CUES } from '../shared/audio-cues.js';

let audioContext = null;

export function playSound(kind, enabled) {
  if (!enabled || !AUDIO_CUES[kind] || typeof wx.createWebAudioContext !== 'function') return;

  try {
    if (!audioContext) audioContext = wx.createWebAudioContext();
    if (audioContext.state === 'suspended') audioContext.resume();

    AUDIO_CUES[kind].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const start = audioContext.currentTime + index * 0.055;
      const duration = kind === 'clear' ? 0.24 : 0.12;

      oscillator.type = kind === 'bad' ? 'square' : 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(kind === 'tap' ? 0.035 : 0.075, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    });
  } catch {
    // Audio is enhancement-only. Unsupported devices continue silently.
  }
}
