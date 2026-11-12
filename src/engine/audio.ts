export type SfxKind = 'click' | 'buy' | 'milestone' | 'golden' | 'shadyWin' | 'shadyFreeze'

let sharedContext: AudioContext | null = null

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
  }
  if (sharedContext.state === 'suspended') {
    void sharedContext.resume().catch(() => {})
  }
  return sharedContext
}

function scheduleTone(
  ctx: AudioContext,
  freq: number,
  startOffsetSec: number,
  durationSec: number,
  type: OscillatorType,
  peakGain: number
): void {
  const now = ctx.currentTime + startOffsetSec
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, now)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + durationSec + 0.02)
}

export function playSfx(kind: SfxKind, muted: boolean): void {
  if (muted) {
    return
  }
  try {
    const ctx = getAudioContext()
    if (!ctx) {
      return
    }
    if (kind === 'click') {
      const jitter = 290 + Math.random() * 55
      scheduleTone(ctx, jitter, 0, 0.045, 'triangle', 0.05)
      return
    }
    if (kind === 'buy') {
      scheduleTone(ctx, 440, 0, 0.06, 'triangle', 0.07)
      scheduleTone(ctx, 660, 0.045, 0.08, 'triangle', 0.07)
      return
    }
    if (kind === 'milestone') {
      const notes = [523.25, 659.25, 783.99, 1046.5]
      notes.forEach((n, idx) => scheduleTone(ctx, n, idx * 0.06, 0.14, 'triangle', 0.08))
      return
    }
    if (kind === 'golden' || kind === 'shadyWin') {
      const notes = [659.25, 880, 1318.5]
      notes.forEach((n, idx) => scheduleTone(ctx, n, idx * 0.07, 0.18, 'sine', 0.09))
      return
    }
    if (kind === 'shadyFreeze') {
      scheduleTone(ctx, 220, 0, 0.14, 'sawtooth', 0.05)
      scheduleTone(ctx, 146.83, 0.11, 0.2, 'sawtooth', 0.05)
    }
  } catch {
    // Ignore audio errors in headless or restricted environments
  }
}
