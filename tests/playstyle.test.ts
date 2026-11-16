import { describe, expect, it } from 'vitest'
import { ADVISORS } from '../src/data/advisors'
import { BOSSES } from '../src/data/bosses'
import { MARKET_EVENTS } from '../src/data/events'
import { HEIR_TRAITS, INHERITED_TRAITS } from '../src/data/heirs'
import { LEGACY_PERKS } from '../src/data/perks'
import { describeModifiers } from '../src/engine/family'
import { NEUTRAL_MODIFIERS } from '../src/engine/modifiers'
import { forPlaystyle } from '../src/utils/playstyle'

// Everything the game shows about pay, playing without tapping
function allGameText(): string[] {
  const texts: string[] = []
  for (const a of ADVISORS) texts.push(a.effectText, a.costText)
  for (const b of BOSSES) texts.push(b.twistText, b.conditionText, b.blurb)
  for (const t of [...HEIR_TRAITS, ...INHERITED_TRAITS]) texts.push(t.description)
  for (const p of LEGACY_PERKS) texts.push(p.label, p.description, p.effectSummary(0), p.effectSummary(2))
  for (const e of MARKET_EVENTS) {
    texts.push(e.title, e.subtitle)
    if (e.effect.type === 'scandal') for (const o of e.effect.options) texts.push(o.label, o.detail)
  }
  texts.push(...describeModifiers({ ...NEUTRAL_MODIFIERS, clickMult: 0.75 }).map((p) => p.label))
  return texts
}

describe('playstyle wording', () => {
  it('leaves text alone for tapping', () => {
    expect(forPlaystyle('Clicks pay 25% more.', false)).toBe('Clicks pay 25% more.')
  })

  it('talks about the allowance instead of clicks and taps', () => {
    expect(forPlaystyle('Clicks pay double. Wakes at 4am.', true)).toBe('Your allowance pays double. Wakes at 4am.')
    expect(forPlaystyle('Businesses earn 20% more, but clicks pay 10% less.', true)).toBe(
      'Businesses earn 20% more, but your allowance pays 10% less.'
    )
    expect(forPlaystyle('2x Click income for 20s', true)).toBe('2x Allowance for 20s')
    expect(forPlaystyle('Clicks x0.75', true)).toBe('Allowance x0.75')
  })

  it('leaves no click or tap in any game text, playing without tapping', () => {
    const leftovers = allGameText()
      .map((t) => forPlaystyle(t, true))
      .filter((t) => /\b(click|clicks|clicking|clicker|tap|taps|tapping)\b/i.test(t))
    expect(leftovers).toEqual([])
  })
})
