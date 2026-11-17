// Synthesized sound: every effect and the music loop are built with WebAudio.
// One job: make noise without any audio file.

export function createAudio() {
  const audio = {
    ctx: null,
    muted: false,
    musicTimer: null,
    musicStep: 0,
    engineOsc: null,
    engineGain: null,
  };

  audio.ensure = () => {
    if (!audio.ctx) {
      try {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        audio.ctx = new Ctor();
      } catch {
        audio.ctx = null;
      }
    }
    if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
    return audio.ctx;
  };

  function tone(freq, dur, type, vol, slideTo) {
    if (audio.muted) return;
    const ctx = audio.ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + dur);
    gain.gain.setValueAtTime(vol || 0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  function noiseBurst(dur, vol, lowpass) {
    if (audio.muted) return;
    const ctx = audio.ensure();
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass || 1200;
    const gain = ctx.createGain();
    gain.gain.value = vol || 0.2;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }

  audio.sfx = (name) => {
    if (audio.muted) return;
    switch (name) {
      case 'punch': noiseBurst(0.09, 0.25, 900); tone(140, 0.08, 'square', 0.1, 70); break;
      case 'pickup': tone(660, 0.09, 'sine', 0.14); setTimeout(() => tone(990, 0.12, 'sine', 0.14), 70); break;
      case 'cash': tone(880, 0.08, 'triangle', 0.14); setTimeout(() => tone(1174, 0.1, 'triangle', 0.14), 80); setTimeout(() => tone(1568, 0.16, 'triangle', 0.12), 160); break;
      case 'crash': noiseBurst(0.25, 0.35, 700); tone(90, 0.2, 'sawtooth', 0.12, 45); break;
      case 'siren': tone(720, 0.32, 'sine', 0.05, 980); break;
      case 'horn': tone(370, 0.16, 'sawtooth', 0.1); tone(466, 0.16, 'sawtooth', 0.08); break;
      case 'door': tone(220, 0.07, 'square', 0.1, 160); break;
      case 'busted': tone(392, 0.3, 'sawtooth', 0.12, 196); setTimeout(() => tone(311, 0.5, 'sawtooth', 0.12), 280); break;
      case 'mission': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.14, 'triangle', 0.14), i * 90)); break;
      case 'click': tone(1200, 0.04, 'sine', 0.08); break;
      case 'wasted': [330, 262, 196, 131].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sawtooth', 0.1), i * 180)); break;
      default: tone(440, 0.08, 'sine', 0.1); break;
    }
  };

  // A lazy two-bar bass + sparkle loop: A minor, beach-cruise tempo.
  const BASS = [55, 0, 55, 0, 65.4, 0, 55, 0, 49, 0, 49, 0, 58.3, 0, 65.4, 0];
  const LEAD = [220, 0, 261.6, 329.6, 0, 261.6, 220, 0, 196, 0, 220, 246.9, 0, 293.7, 261.6, 0];
  audio.startMusic = () => {
    if (audio.musicTimer) return;
    audio.musicTimer = setInterval(() => {
      if (audio.muted) return;
      const i = audio.musicStep % 16;
      const bass = BASS[i];
      const lead = LEAD[i];
      if (bass) tone(bass, 0.22, 'triangle', 0.1);
      if (lead && audio.musicStep % 2 === 0) tone(lead, 0.18, 'sine', 0.045);
      if (i === 0 || i === 8) noiseBurst(0.03, 0.05, 6000);
      audio.musicStep++;
    }, 190);
  };

  audio.stopMusic = () => {
    if (audio.musicTimer) { clearInterval(audio.musicTimer); audio.musicTimer = null; }
  };

  audio.setEngine = (speed01) => {
    if (audio.muted || speed01 <= 0.02) {
      if (audio.engineGain) audio.engineGain.gain.value = 0;
      return;
    }
    const ctx = audio.ensure();
    if (!ctx) return;
    if (!audio.engineOsc) {
      audio.engineOsc = ctx.createOscillator();
      audio.engineOsc.type = 'sawtooth';
      audio.engineGain = ctx.createGain();
      audio.engineGain.gain.value = 0;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500;
      audio.engineOsc.connect(filter);
      filter.connect(audio.engineGain);
      audio.engineGain.connect(ctx.destination);
      audio.engineOsc.start();
    }
    audio.engineOsc.frequency.value = 55 + speed01 * 130;
    audio.engineGain.gain.value = 0.03 + speed01 * 0.03;
  };

  audio.toggleMute = () => {
    audio.muted = !audio.muted;
    if (audio.muted) audio.setEngine(0);
    return audio.muted;
  };

  return audio;
}
