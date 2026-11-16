// Every sound in the game, synthesised with Web Audio: no files to load.
// Each cue is built from a few voices (tones, glides, bells, noise bursts)
// through one master bus with a compressor, so stacked cues never clip.

export type SfxKind =
  // Money
  | 'click'
  | 'buyJob'
  | 'buyBusiness'
  | 'milestone'
  // The Market Wire
  | 'eventSpawn'
  | 'scandal'
  | 'golden'
  | 'shadyWin'
  | 'shadyFreeze'
  | 'scandalPay'
  // Bosses
  | 'gateOpen'
  | 'bossStart'
  | 'bossTick'
  | 'bossWin'
  | 'bossLose'
  // The family
  | 'hire'
  | 'pass'
  | 'perk'
  | 'retire'
  | 'heir'
  | 'abdicate'
  | 'elevate'
  | 'achievement'
  | 'welcomeBack'

export interface SfxOptions {
  // 0 to 1: how hard things are going (Hustle for taps, size for buys)
  intensity?: number
  // How many were bought at once
  count?: number
}

// The shortest gap between two of the same cue, so a burst of automation or
// a fast tapper never turns into noise
const MIN_GAP_MS: Partial<Record<SfxKind, number>> = {
  click: 35,
  buyJob: 60,
  buyBusiness: 60,
  eventSpawn: 1500,
  bossTick: 400,
  achievement: 300
}

let sharedContext: AudioContext | null = null
let master: GainNode | null = null
const lastPlayed = new Map<SfxKind, number>()

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null
  }
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) {
    return null
  }
  if (!sharedContext) {
    sharedContext = new Ctx()
    const compressor = sharedContext.createDynamicsCompressor()
    compressor.threshold.value = -18
    compressor.ratio.value = 6
    master = sharedContext.createGain()
    master.gain.value = 0.9
    master.connect(compressor)
    compressor.connect(sharedContext.destination)
  }
  if (sharedContext.state === 'suspended') {
    void sharedContext.resume().catch(() => {})
  }
  return sharedContext
}

interface Voice {
  ctx: BaseAudioContext
  out: AudioNode
}

// One note: attack, decay to silence, optional glide to another pitch and a
// lowpass to soften bright waves
function tone(
  v: Voice,
  freq: number,
  at: number,
  dur: number,
  type: OscillatorType,
  peak: number,
  opts: { glideTo?: number; lowpass?: number; attack?: number; vibrato?: number } = {}
): void {
  const { ctx, out } = v
  const t = ctx.currentTime + at
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (opts.glideTo) osc.frequency.exponentialRampToValueAtTime(opts.glideTo, t + dur)
  if (opts.vibrato) {
    const lfo = ctx.createOscillator()
    const depth = ctx.createGain()
    lfo.frequency.value = 6
    depth.gain.value = opts.vibrato
    lfo.connect(depth)
    depth.connect(osc.frequency)
    lfo.start(t)
    lfo.stop(t + dur + 0.05)
  }
  const attack = opts.attack ?? 0.008
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(peak, t + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  let node: AudioNode = osc
  if (opts.lowpass) {
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = opts.lowpass
    osc.connect(filter)
    node = filter
  }
  node.connect(gain)
  gain.connect(out)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

// A struck bell or coin: a few inharmonic partials that ring and fade
function bell(v: Voice, freq: number, at: number, dur: number, peak: number): void {
  const partials: Array<[number, number]> = [
    [1, 1],
    [2.76, 0.45],
    [5.4, 0.22],
    [8.93, 0.1]
  ]
  for (const [ratio, level] of partials) {
    tone(v, freq * ratio, at, dur / ratio ** 0.35, 'sine', peak * level, { attack: 0.002 })
  }
}

// A burst of filtered noise: thuds, snaps, cork pops, camera flashes
function noise(
  v: Voice,
  at: number,
  dur: number,
  peak: number,
  filter: { type: BiquadFilterType; freq: number; q?: number; sweepTo?: number }
): void {
  const { ctx, out } = v
  const t = ctx.currentTime + at
  const length = Math.max(1, Math.floor(ctx.sampleRate * dur))
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const biquad = ctx.createBiquadFilter()
  biquad.type = filter.type
  biquad.frequency.setValueAtTime(filter.freq, t)
  if (filter.sweepTo) biquad.frequency.exponentialRampToValueAtTime(filter.sweepTo, t + dur)
  biquad.Q.value = filter.q ?? 1
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(peak, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(biquad)
  biquad.connect(gain)
  gain.connect(out)
  src.start(t)
  src.stop(t + dur + 0.02)
}

// Notes by name, for the tunes
const NOTE: Readonly<Record<string, number>> = {
  C3: 130.81, G3: 196, A3: 220, Bb3: 233.08, C4: 261.63, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23,
  G4: 392, A4: 440, Bb4: 466.16, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99,
  A5: 880, B5: 987.77, C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98, C7: 2093
}

// A short brass-like chord: sawtooths through a lowpass that opens up
function brass(v: Voice, notes: ReadonlyArray<number>, at: number, dur: number, peak: number): void {
  for (const n of notes) {
    tone(v, n, at, dur, 'sawtooth', peak, { lowpass: 1800, attack: 0.03 })
    tone(v, n * 1.003, at, dur, 'sawtooth', peak * 0.6, { lowpass: 1400, attack: 0.04 })
  }
}

// The tap's endless climb (a Shepard scale). Each tap sounds the same note in
// nine octaves at once and moves up a nineteenth of an octave, a step that
// fits no familiar scale, so there is no tune to recognise. Loudness peaks
// mid-range and fades to nothing at both ends, so the top voice slips away as
// a new one rises in at the bottom: it always sounds as if it is going up,
// yet never leaves the same range. Taps ring long enough to overlap.
export const SHEPARD_STEPS = 19
// The loudness curve spans nine octaves, but the ninth always sits above
// 20 kHz where nobody hears it, so only eight voices are ever played
const SHEPARD_OCTAVES = 9
const SHEPARD_VOICES = 8
const SHEPARD_LOWEST = 80
let shepardStep = 0

export function shepardVoices(step: number): Array<{ freq: number; weight: number; x: number }> {
  const n = SHEPARD_STEPS
  const pos = (((step % n) + n) % n) / n
  const voices: Array<{ freq: number; weight: number; x: number }> = []
  for (let octave = 0; octave < SHEPARD_VOICES; octave++) {
    // Where this voice sits in the range, 0 at the bottom to 1 at the top
    const x = (octave + pos) / SHEPARD_OCTAVES
    // Raised cosine: across equally spaced octaves these sum to half the
    // octave count, so taps are equally loud (to within the unheard ninth)
    const weight = (0.5 - 0.5 * Math.cos(2 * Math.PI * x)) / (SHEPARD_OCTAVES / 2)
    voices.push({ freq: SHEPARD_LOWEST * 2 ** (octave + pos), weight, x })
  }
  return voices
}

const CUES: Readonly<Record<SfxKind, (v: Voice, o: Required<SfxOptions>) => void>> = {
  // A coin chink that climbs forever, one step a tap, with a glint at full Hustle
  click: (v, { intensity }) => {
    const voices = shepardVoices(shepardStep++)
    // Small differences on every tap, so no two rounds of the climb sound the
    // same: a few cents of tuning (all voices together, keeping the octaves
    // true), a slightly longer or shorter ring, each voice a touch louder or
    // softer
    const tune = 2 ** ((Math.random() - 0.5) * (6 / 1200))
    const ring = 0.5 * (1 + (Math.random() - 0.5) * 0.09)
    for (const { freq, weight, x } of voices) {
      if (weight <= 0.01) continue
      const level = 0.26 * weight * (1 + (Math.random() - 0.5) * 0.09)
      // Higher voices ring a little shorter, like a struck glass
      tone(v, freq * tune, 0, Math.max(0.04, ring * (1 - 0.35 * x)), 'sine', level, { attack: 0.003 })
    }
    if (intensity >= 0.99 && Math.random() < 0.35) tone(v, 3200, 0.03, 0.07, 'sine', 0.04)
  },
  // Clocking in: a stamp and a short chirp of the time card
  buyJob: (v, { count }) => {
    noise(v, 0, 0.05, 0.25, { type: 'bandpass', freq: 1800, q: 2 })
    tone(v, NOTE.G5, 0.02, 0.08, 'square', 0.035, { lowpass: 3000 })
    tone(v, NOTE.C6, 0.07, 0.1, 'square', 0.03, { lowpass: 3000 })
    if (count > 1) tone(v, NOTE.E6, 0.12, 0.12, 'square', 0.025, { lowpass: 3000 })
  },
  // The till: a drawer thud, then the bell, then coins for a bulk buy
  buyBusiness: (v, { count }) => {
    noise(v, 0, 0.07, 0.3, { type: 'lowpass', freq: 600 })
    bell(v, NOTE.C7, 0.05, 0.45, 0.06)
    bell(v, NOTE.G6, 0.09, 0.4, 0.05)
    const coins = Math.min(6, count - 1)
    for (let i = 0; i < coins; i++) bell(v, 2400 + Math.random() * 1600, 0.18 + i * 0.05, 0.15, 0.025)
  },
  // A rising run, longer and brighter the bigger the milestone
  milestone: (v, { intensity }) => {
    const run = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6, NOTE.G6]
    const notes = run.slice(0, 4 + Math.round(intensity * 2))
    notes.forEach((n, i) => tone(v, n, i * 0.055, 0.22, 'triangle', 0.07))
    bell(v, notes[notes.length - 1] * 2, notes.length * 0.055, 0.5, 0.03)
  },
  // A telegraph tapping out the news
  eventSpawn: (v) => {
    const pattern = [0, 0.07, 0.14, 0.3]
    pattern.forEach((at, i) => tone(v, 1180, at, i === 3 ? 0.12 : 0.045, 'square', 0.03, { lowpass: 2500 }))
  },
  // Flashbulbs and the thud of the morning papers
  scandal: (v) => {
    noise(v, 0, 0.22, 0.4, { type: 'lowpass', freq: 220 })
    for (let i = 0; i < 4; i++) noise(v, 0.18 + i * 0.09 + Math.random() * 0.03, 0.05, 0.18, { type: 'highpass', freq: 4000 })
    tone(v, NOTE.Bb3, 0.1, 0.5, 'sawtooth', 0.03, { lowpass: 900, glideTo: NOTE.A3 })
  },
  // A shower of coins
  golden: (v) => {
    for (let i = 0; i < 12; i++) bell(v, 2200 + Math.random() * 2200, i * 0.045 + Math.random() * 0.02, 0.25, 0.03)
    tone(v, NOTE.C6, 0, 0.3, 'sine', 0.04)
    tone(v, NOTE.G6, 0.12, 0.35, 'sine', 0.035)
  },
  // Something not quite above board, which paid off: a sly creep, then the bell
  shadyWin: (v) => {
    tone(v, NOTE.A3, 0, 0.14, 'triangle', 0.06, { lowpass: 1200 })
    tone(v, NOTE.C4, 0.14, 0.14, 'triangle', 0.06, { lowpass: 1200 })
    tone(v, NOTE.Eb4, 0.28, 0.14, 'triangle', 0.06, { lowpass: 1200 })
    bell(v, NOTE.E6, 0.44, 0.5, 0.05)
  },
  // The sad trombone
  shadyFreeze: (v) => {
    const notes = [NOTE.D4, NOTE.C4 * 1.06, NOTE.C4, NOTE.Bb3]
    notes.forEach((n, i) =>
      tone(v, n, i * 0.28, i === 3 ? 0.9 : 0.26, 'sawtooth', 0.05, { lowpass: 1100, glideTo: i === 3 ? n * 0.94 : undefined, vibrato: i === 3 ? 6 : 0 })
    )
  },
  // Settling out of court: coins counted out, reluctantly
  scandalPay: (v) => {
    for (let i = 0; i < 4; i++) bell(v, 1900 - i * 160, i * 0.09, 0.18, 0.03)
    tone(v, NOTE.G3, 0.36, 0.25, 'triangle', 0.04, { lowpass: 700 })
  },
  // The servants' bell: someone is waiting to see you
  gateOpen: (v) => {
    for (let i = 0; i < 3; i++) bell(v, NOTE.E6 * (1 + (Math.random() - 0.5) * 0.01), i * 0.11, 0.5, 0.05)
    tone(v, NOTE.B4, 0.02, 0.45, 'triangle', 0.03)
  },
  // A timpani roll building to a horn
  bossStart: (v) => {
    for (let i = 0; i < 10; i++) noise(v, i * 0.045, 0.08, 0.05 + i * 0.025, { type: 'lowpass', freq: 160 })
    brass(v, [NOTE.C4, NOTE.Eb4, NOTE.G4], 0.48, 0.6, 0.025)
  },
  // The clock, in the last seconds of a fight
  bossTick: (v) => {
    noise(v, 0, 0.04, 0.6, { type: 'bandpass', freq: 3000, q: 6 })
    tone(v, 1800, 0, 0.035, 'square', 0.05, { lowpass: 4000 })
  },
  // A brass fanfare and a ringing bell
  bossWin: (v) => {
    brass(v, [NOTE.C4, NOTE.E4, NOTE.G4], 0, 0.18, 0.022)
    brass(v, [NOTE.C4, NOTE.E4, NOTE.G4], 0.2, 0.12, 0.022)
    brass(v, [NOTE.F4, NOTE.A4, NOTE.C5], 0.34, 0.2, 0.022)
    brass(v, [NOTE.G4, NOTE.B4, NOTE.D5], 0.56, 0.2, 0.022)
    brass(v, [NOTE.C5, NOTE.E5, NOTE.G5], 0.78, 0.8, 0.026)
    bell(v, NOTE.C6, 0.78, 1.2, 0.04)
  },
  // A funeral bell, three tolls
  bossLose: (v) => {
    for (let i = 0; i < 3; i++) bell(v, 146.83, i * 0.9, 1.6, 0.12)
    tone(v, NOTE.C3, 0, 2.6, 'sine', 0.05, { attack: 0.3 })
  },
  // The doorbell: ding-dong
  hire: (v) => {
    bell(v, NOTE.E5, 0, 0.7, 0.07)
    bell(v, NOTE.C5, 0.32, 0.9, 0.07)
  },
  // A short harrumph
  pass: (v) => {
    tone(v, 180, 0, 0.2, 'sawtooth', 0.16, { lowpass: 500, glideTo: 120 })
    tone(v, 90, 0, 0.2, 'sine', 0.08, { glideTo: 60 })
  },
  // Two glasses clinking at the club
  perk: (v) => {
    bell(v, 2637, 0, 0.6, 0.05)
    bell(v, 2794, 0.05, 0.55, 0.04)
    tone(v, NOTE.G5, 0.12, 0.3, 'triangle', 0.03)
  },
  // The grandfather clock's quarter chime, then a cork
  retire: (v) => {
    const quarter = [NOTE.E5, NOTE.C5, NOTE.D5, NOTE.G4]
    quarter.forEach((n, i) => bell(v, n, i * 0.38, 1.1, 0.06))
    noise(v, 1.7, 0.05, 0.5, { type: 'bandpass', freq: 900, q: 1.5 })
    tone(v, 900, 1.7, 0.12, 'sine', 0.05, { glideTo: 420 })
    for (let i = 0; i < 6; i++) tone(v, 3000 + Math.random() * 3000, 1.85 + i * 0.05, 0.03, 'sine', 0.01)
  },
  // A harpsichord flourish for the new head of the family
  heir: (v) => {
    const run = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.G5, NOTE.E5, NOTE.C6]
    run.forEach((n, i) => {
      tone(v, n, i * 0.07, 0.25, 'square', 0.025, { lowpass: 3500, attack: 0.002 })
      tone(v, n * 2, i * 0.07, 0.12, 'square', 0.01, { lowpass: 5000, attack: 0.002 })
    })
  },
  // A slammed door and footsteps fading down the drive
  abdicate: (v) => {
    noise(v, 0, 0.18, 0.6, { type: 'lowpass', freq: 180 })
    tone(v, 70, 0, 0.25, 'sine', 0.12, { glideTo: 45 })
    for (let i = 0; i < 4; i++) noise(v, 0.45 + i * 0.22, 0.05, 0.12 - i * 0.025, { type: 'bandpass', freq: 700, q: 2 })
  },
  // The royal fanfare, with timpani
  elevate: (v) => {
    for (let i = 0; i < 6; i++) noise(v, i * 0.05, 0.08, 0.1 + i * 0.03, { type: 'lowpass', freq: 150 })
    brass(v, [NOTE.G4, NOTE.B4, NOTE.D5], 0.35, 0.16, 0.022)
    brass(v, [NOTE.G4, NOTE.B4, NOTE.D5], 0.53, 0.16, 0.022)
    brass(v, [NOTE.G4, NOTE.B4, NOTE.D5], 0.71, 0.16, 0.022)
    brass(v, [NOTE.C5, NOTE.E5, NOTE.G5], 0.9, 0.5, 0.024)
    brass(v, [NOTE.A4, NOTE.C5, NOTE.F5], 1.42, 0.3, 0.022)
    brass(v, [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6], 1.74, 1.1, 0.026)
    for (let i = 0; i < 3; i++) bell(v, NOTE.C6 * (i + 1) * 0.5, 1.74 + i * 0.12, 1.4, 0.03)
  },
  // A quick sparkle
  achievement: (v) => {
    const notes = [NOTE.C6, NOTE.D6, NOTE.E6, NOTE.G6, NOTE.C7]
    notes.forEach((n, i) => tone(v, n, i * 0.045, 0.3, 'sine', 0.035, { attack: 0.003 }))
  },
  // The cash counter riffling through what came in while you were away
  welcomeBack: (v) => {
    for (let i = 0; i < 18; i++) {
      const at = 0.6 * (1 - Math.pow(1 - i / 18, 1.6))
      noise(v, at, 0.02, 0.12, { type: 'bandpass', freq: 2500 + i * 60, q: 4 })
    }
    bell(v, NOTE.C7, 0.68, 0.5, 0.05)
  }
}

export function playSfx(kind: SfxKind, muted: boolean, options: SfxOptions = {}): void {
  if (muted) {
    return
  }
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const gap = MIN_GAP_MS[kind]
  if (gap !== undefined && now - (lastPlayed.get(kind) ?? -Infinity) < gap) {
    return
  }
  lastPlayed.set(kind, now)
  try {
    const ctx = getAudioContext()
    if (!ctx || !master) {
      return
    }
    CUES[kind]({ ctx, out: master }, { intensity: Math.max(0, Math.min(1, options.intensity ?? 0)), count: Math.max(1, options.count ?? 1) })
  } catch {
    // Ignore audio errors in headless or restricted environments
  }
}

// Renders one cue offline and measures it: for checking every cue makes a
// sound, ends in good time and stays below clipping
export async function renderSfx(kind: SfxKind, options: SfxOptions = {}): Promise<{ peak: number; seconds: number }> {
  const sampleRate = 22050
  const ctx = new OfflineAudioContext(1, sampleRate * 4, sampleRate)
  const compressor = ctx.createDynamicsCompressor()
  compressor.threshold.value = -18
  compressor.ratio.value = 6
  const bus = ctx.createGain()
  bus.gain.value = 0.9
  bus.connect(compressor)
  compressor.connect(ctx.destination)
  CUES[kind]({ ctx, out: bus }, { intensity: Math.max(0, Math.min(1, options.intensity ?? 0)), count: Math.max(1, options.count ?? 1) })
  const data = (await ctx.startRendering()).getChannelData(0)
  let peak = 0
  let last = 0
  for (let i = 0; i < data.length; i++) {
    const a = Math.abs(data[i])
    if (a > peak) peak = a
    if (a > 0.001) last = i
  }
  return { peak, seconds: last / sampleRate }
}

export const SFX_KINDS = Object.keys(CUES) as SfxKind[]
