const GENERAL_HEADLINES: ReadonlyArray<string> = [
  'Chancellor confirms trickle-down economics "due to arrive any Tuesday now".',
  'Rail replacement bus service floated on FTSE 100 at £14B valuation.',
  'Landlord heroically raises rent by 18% to "help tenants stay motivated".',
  'Think-tank funded by billionaires recommends abolishing weekends.',
  'Artisanal sourdough bakery overtakes North Sea oil giant after introducing £9.80 loaf.',
  'Offshore retail REIT subdivides former department store into 47 phone-case kiosks.',
  'Buy-now-pay-later firm offers 3-instalment plan on cod and chips, calls it "financial empowerment".',
  'HMRC helpline hold music nominated for Mercury Prize after 9-hour set.'
]

const CLASS_HEADLINES: Readonly<Record<number, ReadonlyArray<string>>> = {
  0: [
    'Jobcentre coach suggests "simply inheriting a small commercial bakery".',
    'Zero-hours contract hailed as "ultimate lifestyle flexibility" by people on salaries.'
  ],
  1: [
    'Shared Zone 4 flat advertised as "cosy live-work mezzanine cupboard".',
    'Columnist with three houses blames sourdough toast for a generation missing the property ladder.'
  ],
  2: [
    'Man who bought 4-bed semi for £11,000 in 1978 urges youth to "just graft".',
    'High street betting shop and vape store announce historic merger.'
  ],
  3: [
    'Supermarket launches "Promotion Humous": 40p dearer, identical recipe, gold lid.',
    'Kitchen island installation unlocks automatic invitation to neighbourhood WhatsApp.'
  ],
  4: [
    'Senior contractor optimises tax wrapper while eating meal deal alone in server room.',
    'Man spends £4,200 on carbon road bike to save 45 seconds on commute.'
  ],
  5: [
    'Cotswolds village runs critically low on Farrow & Ball "Elephant\'s Breath".',
    'Dinner party enters fourth hour of discussing catchment areas.'
  ],
  6: [
    'Peerage approved after entirely coincidental donation to heritage wallpaper trust.',
    'Private helicopters asked to idle quietly over Kensington before 10am.',
    'Multi-national conglomerate pays £42.50 corporation tax "as a gesture of goodwill".'
  ],
  7: [
    'Davos panel on wealth inequality delayed by 40-jet traffic jam at Zurich airport.',
    'Central bank governor asks your family office for a quick Vibes Check before rate call.'
  ],
  8: [
    'Both major parties submit draft Budgets to your Oxfordshire orangery for red-penning.',
    'Treasury quietly renames gilts auction "whatever suits your Cayman trust".'
  ],
  9: [
    'Threadneedle Street vault thermostat raised to 34°C for your afternoon basking session.',
    'Historians discover Magna Carta Clause 64 granting your bloodline 2% of all chippy sales.'
  ]
}

const BUFF_HEADLINES: Readonly<Record<string, string>> = {
  businessBuff: 'BREAKING: Threadneedle Street turns money printer up to "Brisk". Valuations soaring!',
  clickBuff: 'BREAKING: HR replaces chairs with motivational posters. Click output through the roof!'
}

export function pickHeadline(classLevel: number, activeBuffKind: string | null, rng: () => number = Math.random): string {
  if (activeBuffKind && BUFF_HEADLINES[activeBuffKind] && rng() < 0.45) {
    return BUFF_HEADLINES[activeBuffKind]
  }
  const pool = [...GENERAL_HEADLINES, ...(CLASS_HEADLINES[classLevel] ?? [])]
  const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length))
  return pool[index]
}
