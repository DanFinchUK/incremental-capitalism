export interface SocialClassDef {
  level: number
  threshold: number
  label: string
  description: string
  perkSummary: string
  initiationNote: string
}

// Net worth that unlocks each class gate's boss (index = class level). Each
// sits at the price of a Job rung (see data/items.ts): gate 1 at rung 2.4,
// then every 2.3 rungs to gate 9 at 20.8. Even spacing keeps every gate the
// same step harder than the last (docs/pacing.md). A gate also caps what you
// can buy before you beat it. Checked by the pacing simulator (npm run sim).
export const GATE_NET_WORTH: ReadonlyArray<number> = [0, 2.4e08, 2.6e14, 2.8e20, 3.1e26, 3.6e32, 4.1e38, 5e44, 6.1e50, 7.6e56]

export const SOCIAL_CLASSES: ReadonlyArray<SocialClassDef> = [
  {
    level: 0,
    threshold: GATE_NET_WORTH[0],
    label: 'Precarious proletariat',
    description: 'The poorest, most deprived class, scoring low for social and cultural capital.',
    perkSummary: 'Base rates (no connections yet)',
    initiationNote: 'Welcome pack: Hi-vis vest, zero-hours rota app, and character-building horizontal drizzle.'
  },
  {
    level: 1,
    threshold: GATE_NET_WORTH[1],
    label: 'Emergent service worker',
    description: 'A new, young, urban group which is relatively poor but has high social and cultural capital.',
    perkSummary: '+15% income, -2% purchase costs',
    initiationNote: 'Welcome pack: Zone 4 box-room the letting agent calls a "double", a deposit you will never see again, and an oat-milk stamp card.'
  },
  {
    level: 2,
    threshold: GATE_NET_WORTH[2],
    label: 'Traditional working class',
    description: 'Scores low on all forms of capital, but is not completely deprived. Reasonably high house values from an older average age.',
    perkSummary: '+30% income, -4% purchase costs',
    initiationNote: 'Welcome pack: Paid-off 1978 semi-detached deeds and a fiercely guarded street parking cone.'
  },
  {
    level: 3,
    threshold: GATE_NET_WORTH[3],
    label: 'New affluent workers',
    description: 'A young class group which is socially and culturally active, with middling levels of economic capital.',
    perkSummary: '+45% income, -6% purchase costs',
    initiationNote: 'Welcome pack: Quartz kitchen island, velvet sofa on 0% finance, and street WhatsApp admin rights.'
  },
  {
    level: 4,
    threshold: GATE_NET_WORTH[4],
    label: 'Technical middle class',
    description: 'A small, distinctive prosperous group scoring low for social and cultural capital.',
    perkSummary: '+60% income, -8% purchase costs',
    initiationNote: 'Welcome pack: £4,200 carbon road bike, standing desk converter, and tax-wrapper spreadsheet.'
  },
  {
    level: 5,
    threshold: GATE_NET_WORTH[5],
    label: 'Established middle class',
    description: 'The second wealthiest, scoring highly on all three capitals. The largest and most gregarious group.',
    perkSummary: '+75% income, -10% purchase costs',
    initiationNote: 'Welcome pack: Cotswolds weekend bolthole, National Trust family pass, and school catchment map.'
  },
  {
    level: 6,
    threshold: GATE_NET_WORTH[6],
    label: 'Elite',
    description: 'The most privileged group in the UK, distinct from the other six classes through its wealth and highest levels of all three capitals.',
    perkSummary: '+90% income, -12% purchase costs ("Mates\' Rates")',
    initiationNote: 'Welcome pack: Hereditary peerage nod, Cayman family office, and Kensington helipad clearance.'
  },
  {
    level: 7,
    threshold: GATE_NET_WORTH[7],
    label: 'Davos Regular',
    description: 'Beyond the official ONS survey: private alpine airstrips, bilateral tax treaties, and first-name terms with central bankers.',
    perkSummary: '+105% income, -14% purchase costs',
    initiationNote: 'Welcome pack: Monogrammed cashmere gilet, G650 flight transponder, and diplomatic pouch.'
  },
  {
    level: 8,
    threshold: GATE_NET_WORTH[8],
    label: 'Shadow Cabinet',
    description: 'You no longer lobby governments; prospective prime ministers audition at your Oxfordshire orangery before manifesto launch.',
    perkSummary: '+120% income, -16% purchase costs',
    initiationNote: 'Welcome pack: Unlisted Whitehall pass, three newspaper editors, and sovereign debt veto.'
  },
  {
    level: 9,
    threshold: GATE_NET_WORTH[9],
    label: 'Reptilian Dynasty',
    description: 'Old money predating the Magna Carta, quietly compounding from a heated subterranean vault beneath Threadneedle Street.',
    perkSummary: '+135% income, -18% purchase costs ("Royal Charter")',
    initiationNote: 'Welcome pack: Heated basking rock, Crown Estate ground-rent ledger, and eternal non-dom status.'
  }
]
