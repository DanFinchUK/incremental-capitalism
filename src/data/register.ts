// The General Register Office: where every family is written in, and where
// a finished dynasty's chapter is closed

// Where a family's founder was born: picked by the surname, so it never
// changes between the entry and the closing of the chapter
const BIRTHPLACES = [
  'A box room in Swindon',
  'Above a chip shop, Margate',
  'A new-build in Milton Keynes',
  'A caravan outside Skegness',
  'A house share in Croydon',
  'Basingstoke, regrettably',
  'A maisonette in Slough'
]

export function birthplaceFor(surname: string): string {
  let h = 0
  for (const c of surname) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return BIRTHPLACES[h % BIRTHPLACES.length]
}

export function registerDate(at = new Date()): string {
  return at.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
