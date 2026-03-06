/**
 * sounds.ts — Web Audio API sound synthesis for the chaos demo
 * ─────────────────────────────────────────────────────────────
 * Designed to be clearly audible at a conference booth.
 * Every function routes through a DynamicsCompressor so volumes can be
 * pushed high without clipping.  All frequencies are in the 200-2 kHz
 * range that laptop speakers actually reproduce.
 *
 * Safe to import in SSR modules; API access is gated on typeof window.
 */

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!_ctx) {
    try {
      _ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  return _ctx;
}

/** Call on user interaction to unblock the AudioContext. */
export function resumeAudio(): void {
  const ctx = getCtx();
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

export function isAudioReady(): boolean {
  return _ctx !== null && _ctx.state === "running";
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

/** Creates a compressor → destination chain. Allows hot gains without clipping. */
function masterOut(ctx: AudioContext): AudioNode {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -4;
  comp.knee.value      = 6;
  comp.ratio.value     = 8;
  comp.attack.value    = 0.003;
  comp.release.value   = 0.15;
  comp.connect(ctx.destination);
  return comp;
}

/** Schedule a single oscillator burst with a simple attack/sustain/release envelope. */
function tone(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  type: OscillatorType,
  startAt: number,
  duration: number,
  gain: number,
  freqEnd?: number,
  attack = 0.008,
): void {
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(dest);
    o.type = type;
    o.frequency.setValueAtTime(freq, startAt);
    if (freqEnd !== undefined)
      o.frequency.linearRampToValueAtTime(freqEnd, startAt + duration);
    const hold = Math.max(attack + 0.005, duration - 0.025);
    g.gain.setValueAtTime(0, startAt);
    g.gain.linearRampToValueAtTime(gain, startAt + attack);
    g.gain.setValueAtTime(gain, startAt + hold);
    g.gain.linearRampToValueAtTime(0, startAt + duration);
    o.start(startAt);
    o.stop(startAt + duration + 0.05);
  } catch { /* fail silently */ }
}

/** Short burst of white noise — electrical crack/pop. */
function crack(
  ctx: AudioContext,
  dest: AudioNode,
  startAt: number,
  duration: number,
  gain: number,
): void {
  try {
    const len = Math.ceil(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    const g   = ctx.createGain();
    src.buffer = buf;
    src.connect(g);
    g.connect(dest);
    g.gain.setValueAtTime(gain, startAt);
    g.gain.linearRampToValueAtTime(0, startAt + duration);
    src.start(startAt);
  } catch { /* ignore */ }
}

/* ── Public sound effects ─────────────────────────────────────────────── */

/**
 * RED ALERT — adversary identified.
 * Two descending siren sweeps (classic "danger" shape: high → low)
 * with a heavy square-wave backing pulse.
 */
export function playRedAlert(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const out = masterOut(ctx);
  // Siren sweep 1: 900 → 280 Hz
  tone(ctx, out, 900, "sawtooth", now,       0.55, 0.55, 280);
  // Siren sweep 2: repeat
  tone(ctx, out, 900, "sawtooth", now + 0.6, 0.55, 0.55, 280);
  // Heavy low square-wave pulse underneath (gives it weight on laptop speakers)
  tone(ctx, out, 220, "square",   now,       1.15, 0.22);
}

/**
 * ALARM — chaos experiment active.
 * Three sharp buzzer blasts — unmistakable "something is wrong right now".
 */
export function playAlarm(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const out = masterOut(ctx);
  // Electrical crack intro
  crack(ctx, out, now, 0.06, 0.65);
  // Three short square-wave alarm blasts
  tone(ctx, out, 880, "square", now + 0.04, 0.14, 0.60);
  tone(ctx, out, 880, "square", now + 0.23, 0.14, 0.60);
  tone(ctx, out, 880, "square", now + 0.42, 0.14, 0.60);
  // Low backing thump on each blast
  tone(ctx, out, 260, "sine",   now + 0.04, 0.55, 0.38);
}

/**
 * SECTOR OFFLINE — hard fault, loss of supply.
 * Crack + heavy descending tone ("the system just died").
 */
export function playSectorOffline(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const out = masterOut(ctx);
  // Sharp electrical crack
  crack(ctx, out, now, 0.08, 0.70);
  // Descending "dying system" tone: 500 → 100 Hz
  tone(ctx, out, 500, "sawtooth", now + 0.04, 0.45, 0.55, 100);
  // Backing impact thud
  tone(ctx, out, 240, "sine",     now + 0.04, 0.40, 0.45);
}

/**
 * SECTOR DEGRADED — under-frequency / data stale warning.
 * Repeating warble tone (think submarine/nuclear plant warning klaxon).
 */
export function playSectorDegraded(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const out = masterOut(ctx);
  // Warble 1: 700 → 500 Hz
  tone(ctx, out, 700, "sine", now,        0.22, 0.50, 500);
  // Warble 2: repeat
  tone(ctx, out, 700, "sine", now + 0.25, 0.22, 0.50, 500);
  // Square backing gives it "klaxon" texture
  tone(ctx, out, 350, "square", now, 0.44, 0.18);
}

/**
 * BLUE AGENT ACTIVATES — detection confirmed, response deploying.
 * Sharp ascending 3-tone computer acknowledgement ("I see it, responding").
 */
export function playBlueActivate(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const out = masterOut(ctx);
  // C5 → E5 → G5  (clear major chord arpeggio = confident, positive)
  tone(ctx, out, 523, "sine", now,        0.10, 0.55); // C5
  tone(ctx, out, 659, "sine", now + 0.11, 0.10, 0.55); // E5
  tone(ctx, out, 784, "sine", now + 0.22, 0.15, 0.60); // G5
}

/**
 * RECOVERY — grid restored, all sectors nominal.
 * Rising sweep followed by a bright resolution chord.
 */
export function playRecovery(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const out = masterOut(ctx);
  // Rising sweep: 200 → 700 Hz
  tone(ctx, out, 200, "sine", now, 0.65, 0.45, 700);
  // Resolution chord: C5-E5-G5 together (triumphant)
  tone(ctx, out, 523, "sine", now + 0.60, 0.22, 0.50);
  tone(ctx, out, 659, "sine", now + 0.60, 0.22, 0.45);
  tone(ctx, out, 784, "sine", now + 0.60, 0.26, 0.50);
}

/**
 * LOOP START — war room initialising.
 * Dramatic power-up sweep + punchy double-beep confirm.
 */
export function playLoopStart(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const out = masterOut(ctx);
  // Sawtooth sweep rises — systems coming online
  tone(ctx, out, 150, "sawtooth", now, 0.55, 0.50, 600);
  tone(ctx, out, 150, "sine",     now, 0.55, 0.40, 600);
  // Double confirm beep at peak
  tone(ctx, out, 880,  "sine", now + 0.52, 0.11, 0.60);
  tone(ctx, out, 1100, "sine", now + 0.66, 0.14, 0.60);
}

/**
 * TARGET SELECT — student chose a sector to attack.
 * Ominous descending minor chord + locking click.
 */
export function playTargetSelect(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const out = masterOut(ctx);
  // Descending minor triad — locks in target
  tone(ctx, out, 440,  "sawtooth", now,       0.12, 0.45);
  tone(ctx, out, 349,  "sawtooth", now + 0.08, 0.12, 0.45);
  tone(ctx, out, 261,  "sawtooth", now + 0.16, 0.20, 0.50);
  // Low lock pulse
  tone(ctx, out, 110,  "sine",     now + 0.28, 0.15, 0.55);
}

/**
 * COUNTDOWN TICK — 3-2-1 countdown before attack begins.
 * Short percussive tick.
 */
export function playCountdownTick(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const out = masterOut(ctx);
  tone(ctx, out, 1200, "square", now, 0.04, 0.40);
  tone(ctx, out, 600,  "sine",   now, 0.06, 0.35);
}

/**
 * FIX ACTION — student executed a remediation step.
 * Mechanical click + confirmation beep.
 */
export function playFixAction(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const out = masterOut(ctx);
  tone(ctx, out, 800, "square", now, 0.03, 0.35);
  tone(ctx, out, 400, "sine",   now + 0.04, 0.08, 0.40);
  tone(ctx, out, 600, "sine",   now + 0.10, 0.12, 0.45);
}

/**
 * ALL FIXED — all remediation steps complete, sector restored.
 * Rising triumph chord (C major).
 */
export function playAllFixed(): void {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const out = masterOut(ctx);
  tone(ctx, out, 261, "sine", now,       0.15, 0.40);
  tone(ctx, out, 329, "sine", now + 0.10, 0.15, 0.45);
  tone(ctx, out, 392, "sine", now + 0.20, 0.20, 0.50);
  tone(ctx, out, 523, "sine", now + 0.30, 0.30, 0.55);
  // Warm sustain
  tone(ctx, out, 261, "triangle", now + 0.35, 0.50, 0.30);
  tone(ctx, out, 329, "triangle", now + 0.35, 0.50, 0.30);
  tone(ctx, out, 392, "triangle", now + 0.35, 0.50, 0.30);
}
