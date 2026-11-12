export interface SocialClassDef {
  level: number
  threshold: number
  label: string
  description: string
  perkSummary: string
}

export const SOCIAL_CLASSES: ReadonlyArray<SocialClassDef> = [
  {
    level: 0,
    threshold: Math.pow(5000, 0) - 1,
    label: 'Precarious proletariat',
    description: 'The poorest, most deprived class, scoring low for social and cultural capital.',
    perkSummary: 'Base rates (no connections yet)'
  },
  {
    level: 1,
    threshold: Math.pow(5000, 1) - 1,
    label: 'Emergent service worker',
    description: 'A new, young, urban group which is relatively poor but has high social and cultural capital.',
    perkSummary: '+15% income, -2% purchase costs'
  },
  {
    level: 2,
    threshold: Math.pow(5000, 1.5) - 1,
    label: 'Traditional working class',
    description: 'Scores low on all forms of capital, but is not completely deprived. Reasonably high house values from an older average age.',
    perkSummary: '+30% income, -4% purchase costs'
  },
  {
    level: 3,
    threshold: Math.pow(5000, 2) - 1,
    label: 'New affluent workers',
    description: 'A young class group which is socially and culturally active, with middling levels of economic capital.',
    perkSummary: '+45% income, -6% purchase costs'
  },
  {
    level: 4,
    threshold: Math.pow(5000, 2.5) - 1,
    label: 'Technical middle class',
    description: 'A small, distinctive prosperous group scoring low for social and cultural capital.',
    perkSummary: '+60% income, -8% purchase costs'
  },
  {
    level: 5,
    threshold: Math.pow(5000, 3) - 1,
    label: 'Established middle class',
    description: 'The second wealthiest, scoring highly on all three capitals. The largest and most gregarious group.',
    perkSummary: '+75% income, -10% purchase costs'
  },
  {
    level: 6,
    threshold: Math.pow(5000, 3.5) - 1,
    label: 'Elite',
    description: 'The most privileged group in the UK, distinct from the other six classes through its wealth and highest levels of all three capitals.',
    perkSummary: '+90% income, -12% purchase costs ("Mates\' Rates")'
  }
]
