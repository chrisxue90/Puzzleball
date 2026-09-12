let audioContext = null;

const NOTES = {
  tap: [420],
  select: [570, 720],
  move: [360, 470],
  clear: [520, 660, 820, 1040],
  spawn: [260, 310, 360],
  bad: [150, 115],
  over: [430, 330, 230]
};

function play(kind, enabled) {
  if (!enabled || !NOTES[kind] || typeof wx.createWebAudioContext !== 'function') return;

  try {
    if (!audioContext) audioContext = wx.createWebAudioContext();
    if (audioContext.state === 'suspended') audioContext.resume();

    NOTES[kind].forEach((frequency, index) => {
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
  } catch (error) {
    // Audio is enhancement-only; unsupported devices continue silently.
  }
}

module.exports = { play };
