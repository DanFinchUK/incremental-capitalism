import { describe, expect, it } from 'vitest'
import { ROOMS, roomForClass, type RoomPalette } from '../src/data/rooms'
import { SOCIAL_CLASSES } from '../src/data/classes'

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// Text and the surface it sits on: WCAG AA for normal text
const TEXT_PAIRS: ReadonlyArray<[keyof RoomPalette, keyof RoomPalette]> = [
  ['body', 'bg'],
  ['body', 'card'],
  ['bodySecondary', 'card'],
  ['muted', 'card'],
  ['muted', 'bg'],
  ['btnFg', 'btnBg'],
  ['btnFg', 'btnHover'],
  ['btnOutlineFg', 'btnOutlineBg'],
  ['accent', 'card'],
  ['accentFg', 'accent'],
  ['accentFg', 'accentHover'],
  ['accentPillFg', 'accentPillBg'],
  ['synergy', 'card'],
  ['pipFg', 'pipBg'],
  ['goldFg', 'goldBg']
]

describe('rooms', () => {
  it('gives every social class exactly one room', () => {
    for (const c of SOCIAL_CLASSES) {
      expect(ROOMS.filter((r) => r.classLevels.includes(c.level)), c.label).toHaveLength(1)
    }
    expect(roomForClass(0).id).toBe('bedsit')
    expect(roomForClass(9).id).toBe('vault')
  })

  for (const room of ROOMS) {
    for (const scheme of ['light', 'dark'] as const) {
      it(`${room.name} (${scheme}) keeps text readable`, () => {
        const p = room[scheme]
        for (const [fg, bg] of TEXT_PAIRS) {
          expect(contrast(p[fg], p[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5)
        }
      })
    }
  }
})
