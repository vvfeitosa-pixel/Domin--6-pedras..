let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

export function playDominoClack(): void {
  try {
    const ctx = getCtx();
    const duration = 0.12;
    const sampleRate = ctx.sampleRate;
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 55);
      const noise = (Math.random() * 2 - 1);
      const knock = Math.sin(2 * Math.PI * 600 * t) * 0.4;
      data[i] = (noise + knock) * envelope;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 200;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 900;
    bp.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.value = 0.55;
    source.connect(hp);
    hp.connect(bp);
    bp.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  } catch {
    // Ignore AudioContext errors
  }
}

export function playPass(): void {
  try {
    const ctx = getCtx();
    const sampleRate = ctx.sampleRate;
    const duration = 0.18;
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 30);
      // Low dull thud — knocking on table
      const thud = Math.sin(2 * Math.PI * 180 * t) * 0.6;
      const noise = (Math.random() * 2 - 1) * 0.15;
      data[i] = (thud + noise) * envelope;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.45;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  } catch {
    // Ignore
  }
}

export function playWin(): void {
  try {
    const ctx = getCtx();
    // Short ascending arpeggio: C5 E5 G5 C6
    const notes = [523.25, 659.25, 783.99, 1046.5];
    let startTime = ctx.currentTime + 0.05;
    for (const freq of notes) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      env.gain.setValueAtTime(0, startTime);
      env.gain.linearRampToValueAtTime(0.28, startTime + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);
      osc.connect(env);
      env.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.25);
      startTime += 0.12;
    }
  } catch {
    // Ignore
  }
}

export function playGameOver(): void {
  try {
    const ctx = getCtx();
    // Descending minor chord — sad ending
    const notes = [523.25, 466.16, 392.0, 311.13];
    let startTime = ctx.currentTime + 0.05;
    for (const freq of notes) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      env.gain.setValueAtTime(0, startTime);
      env.gain.linearRampToValueAtTime(0.22, startTime + 0.03);
      env.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
      osc.connect(env);
      env.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.38);
      startTime += 0.14;
    }
  } catch {
    // Ignore
  }
}

// ── Game-end sounds (jogoFinalizado) — more impactful than round sounds ──────

export function playGameWin(): void {
  try {
    const ctx = getCtx();
    const t0 = ctx.currentTime + 0.04;

    // Fanfare: rapid bright arpeggio G4→C5→E5→G5 then a held chord C5+E5+G5
    const arpeggioNotes = [392.0, 523.25, 659.25, 783.99];
    arpeggioNotes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      const start = t0 + i * 0.08;
      env.gain.setValueAtTime(0, start);
      env.gain.linearRampToValueAtTime(0.18, start + 0.015);
      env.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
      osc.connect(env);
      env.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.2);
    });

    // Final held chord: C5 + E5 + G5 (major triad, warm triangle)
    const chordStart = t0 + 0.38;
    [523.25, 659.25, 783.99].forEach(freq => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      env.gain.setValueAtTime(0, chordStart);
      env.gain.linearRampToValueAtTime(0.22, chordStart + 0.04);
      env.gain.setValueAtTime(0.22, chordStart + 0.25);
      env.gain.exponentialRampToValueAtTime(0.001, chordStart + 0.55);
      osc.connect(env);
      env.connect(ctx.destination);
      osc.start(chordStart);
      osc.stop(chordStart + 0.6);
    });

    // Sparkle: high shimmer over the chord
    [1567.98, 2093.0].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = chordStart + i * 0.06;
      env.gain.setValueAtTime(0, start);
      env.gain.linearRampToValueAtTime(0.08, start + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
      osc.connect(env);
      env.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.28);
    });
  } catch {
    // Ignore AudioContext errors
  }
}

export function playGameLoss(): void {
  try {
    const ctx = getCtx();
    const t0 = ctx.currentTime + 0.04;

    // Slow descending "wah-wah" trombone: Bb4 → G4 → Eb4 → Bb3
    const notes = [
      { freq: 466.16, dur: 0.28 },
      { freq: 392.0,  dur: 0.28 },
      { freq: 311.13, dur: 0.28 },
      { freq: 233.08, dur: 0.55 },
    ];
    let start = t0;
    notes.forEach(({ freq, dur }) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      env.gain.setValueAtTime(0, start);
      env.gain.linearRampToValueAtTime(0.24, start + 0.04);
      env.gain.setValueAtTime(0.24, start + dur - 0.06);
      env.gain.linearRampToValueAtTime(0, start + dur);

      // Low-pass filter for a muffled, muted trombone feel
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 700;
      lp.Q.value = 1.5;

      osc.connect(lp);
      lp.connect(env);
      env.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.05);
      start += dur - 0.04;
    });
  } catch {
    // Ignore AudioContext errors
  }
}

export function playShuffle(): void {
  try {
    const ctx = getCtx();
    const sampleRate = ctx.sampleRate;
    const duration = 0.4;
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate;
      // Rustling noise with attack and decay
      const env = t < 0.1
        ? t / 0.1
        : Math.exp(-(t - 0.1) * 8);
      // Rapid noise bursts simulating sliding tiles
      const burst = Math.sin(t * 120) > 0.3 ? 1 : 0.2;
      data[i] = (Math.random() * 2 - 1) * env * burst * 0.3;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 800;
    const gain = ctx.createGain();
    gain.gain.value = 0.6;
    source.connect(hp);
    hp.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  } catch {
    // Ignore
  }
}
