// Synthesized WebAudio for Neon Bay: no audio files, no network. A tiny engine
// hum, a two-tone police siren, gunshots, punches, crashes, pickups and a short
// neon bass loop, all built from oscillators and noise buffers at run time.
export function createAudio() {
  let ctx = null; let muted = false; let musicTimer = null; let sirenOsc = null; let sirenGain = null;
  function ensure() {
    if (ctx) return ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
    return ctx;
  }
  function tone(freq, dur, type, vol, slideTo) {
    if (muted || !ensure()) return;
    const t = ctx.currentTime; const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur);
  }
  function noise(dur, vol, filterFreq) {
    if (muted || !ensure()) return;
    const t = ctx.currentTime; const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate); const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq || 1200;
    const g = ctx.createGain(); g.gain.value = vol || 0.2;
    src.connect(f); f.connect(g); g.connect(ctx.destination); src.start(t);
  }
  const NOTES = [55, 65.41, 82.41, 98, 110, 130.81, 164.81]; // A minor walk, looped.
  let noteIndex = 0;
  function startMusic() {
    if (!ensure() || musicTimer) return;
    musicTimer = window.setInterval(() => {
      if (muted) return;
      tone(NOTES[noteIndex % NOTES.length], 0.5, 'sawtooth', 0.05);
      tone(NOTES[(noteIndex + 2) % NOTES.length] * 2, 0.2, 'square', 0.03);
      noteIndex += 1;
    }, 320);
  }
  function siren(on) {
    if (!ensure()) return;
    if (on && !sirenOsc) {
      sirenOsc = ctx.createOscillator(); sirenGain = ctx.createGain();
      sirenOsc.type = 'sine'; sirenOsc.frequency.value = 700; sirenGain.gain.value = 0.03;
      sirenOsc.connect(sirenGain); sirenGain.connect(ctx.destination); sirenOsc.start();
      sirenOsc.frequency.setValueAtTime(700, ctx.currentTime);
      sirenOsc.frequency.linearRampToValueAtTime(950, ctx.currentTime + 0.5);
    } else if (!on && sirenOsc) { try { sirenOsc.stop(); } catch { /* already stopped */ } sirenOsc = null; sirenGain = null; }
    else if (on && sirenOsc) { sirenOsc.frequency.linearRampToValueAtTime(sirenOsc.frequency.value > 800 ? 700 : 950, ctx.currentTime + 0.5); }
  }
  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); startMusic(); },
    setMuted(value) { muted = value; if (muted) siren(false); },
    isMuted() { return muted; },
    shot() { noise(0.12, 0.25, 3000); tone(180, 0.08, 'square', 0.1, 60); },
    punch() { noise(0.08, 0.2, 800); },
    crash() { noise(0.3, 0.3, 500); tone(70, 0.25, 'sawtooth', 0.15, 40); },
    pickup() { tone(660, 0.12, 'sine', 0.14); tone(880, 0.18, 'sine', 0.14); },
    mission() { tone(523, 0.15, 'square', 0.12); tone(659, 0.15, 'square', 0.12); tone(784, 0.3, 'square', 0.12); },
    busted() { tone(392, 0.3, 'sawtooth', 0.12, 196); tone(196, 0.5, 'sawtooth', 0.12, 98); },
    steal() { tone(300, 0.1, 'square', 0.1, 500); },
    siren,
  };
}
