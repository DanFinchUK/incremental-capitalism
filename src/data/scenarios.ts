// Scenarios: a dynasty played under a changed rule. They open once a family
// has made Duke, and each keeps its own best time in the Hall of Dynasties.
import type { PerkId } from './perks'

export type ScenarioId = 'standard' | 'hands-on' | 'absent-landlord' | 'austerity'

export interface ScenarioDef {
  id: ScenarioId
  name: string
  // Story: who the family is, in the game's voice
  blurb: string
  // The rule change, stated plainly
  rules: string
  // Play without tapping, held on or off for the whole dynasty
  noTap?: boolean
  // No Interns and no buyers
  noAutomation?: boolean
  // No advisors and no PAs: the headhunter never calls
  noOffice?: boolean
  // Legacy perks with nothing to do here, kept off the shelf
  blockedPerks: ReadonlyArray<PerkId>
}

export const SCENARIOS: ReadonlyArray<ScenarioDef> = [
  {
    id: 'standard',
    name: 'The usual way',
    blurb: 'The family climbs by every means available, which is the traditional method.',
    rules: 'The game as you know it.',
    blockedPerks: []
  },
  {
    id: 'hands-on',
    name: 'Hands-On',
    blurb: 'Great-grandfather never trusted staff, and wrote it into the will. The family presses its own buttons.',
    rules: 'No Interns, no buyers and no allowance: you tap "Get paid" and press every "Buy" yourself.',
    noTap: false,
    noAutomation: true,
    blockedPerks: ['autoClicker', 'signingAuthority']
  },
  {
    id: 'absent-landlord',
    name: 'Absent Landlord',
    blurb: 'The family has never set foot in its own businesses and has no plans to start.',
    rules: 'No tapping: "Play without tapping" stays on for the whole dynasty.',
    noTap: true,
    blockedPerks: []
  },
  {
    id: 'austerity',
    name: 'Austerity',
    blurb: 'Belts are tightened, in public at least. The family office is let go and the drawing room is let to tourists.',
    rules: 'No family office: no advisors and no Personal Assistants.',
    noOffice: true,
    blockedPerks: ['officeSeats']
  }
]

export const SCENARIOS_BY_ID: Readonly<Record<ScenarioId, ScenarioDef>> = Object.fromEntries(
  SCENARIOS.map((s) => [s.id, s])
) as Record<ScenarioId, ScenarioDef>

export function readScenarioId(raw: unknown): ScenarioId {
  return typeof raw === 'string' && raw in SCENARIOS_BY_ID ? (raw as ScenarioId) : 'standard'
}
