// Rooms: the look of the game as the family climbs. Each room covers one or
// more social classes and sets the colour tokens from styles/base.css, in a
// light and a dark version. Green (next buy, milestones), danger red and the
// shady orange stay the same in every room so their meaning never changes.
// Contrast is checked in tests/rooms.test.ts.

export type RoomId = 'bedsit' | 'saloon' | 'counties' | 'lounge' | 'chalet' | 'state' | 'vault'

// Decoration drawn on top of the colours (styles in the preview and, later, the game)
export type RoomOrnament = 'none' | 'brass' | 'ruled' | 'stitched' | 'clean' | 'gilt' | 'scaled'

export interface RoomPalette {
  bg: string
  surface: string
  card: string
  cardSubtle: string
  body: string
  bodySecondary: string
  muted: string
  border: string
  borderSubtle: string
  strongLine: string
  btnBg: string
  btnFg: string
  btnHover: string
  btnOutlineBg: string
  btnOutlineFg: string
  btnOutlineHover: string
  accent: string
  accentHover: string
  accentFg: string
  // Accent used as text (class name); can differ from the fill when the fill is too deep to read
  accentText: string
  accentPillBg: string
  accentPillFg: string
  synergy: string
  track: string
  pipBg: string
  pipFg: string
  gold: string
  goldBg: string
  goldFg: string
}

export interface RoomDef {
  id: RoomId
  name: string
  classLevels: ReadonlyArray<number>
  blurb: string
  materials: string
  ornament: RoomOrnament
  displayFont: 'mono' | 'serif'
  radius: number
  light: RoomPalette
  dark: RoomPalette
}

export const ROOMS: ReadonlyArray<RoomDef> = [
  {
    id: 'bedsit',
    name: 'Bedsit',
    classLevels: [0, 1],
    blurb: 'One radiator, two settings, and a landlord who calls the damp "character".',
    materials: 'Strip-light grey, Formica beige, council-door teal',
    ornament: 'none',
    displayFont: 'mono',
    radius: 3,
    light: {
      bg: '#e9e7e1', surface: '#f1efea', card: '#fbfaf7', cardSubtle: '#f0eee8',
      body: '#1d1d1b', bodySecondary: '#2c2c29', muted: '#5f5d57',
      border: '#c9c6bd', borderSubtle: '#dedbd3', strongLine: '#1d1d1b',
      btnBg: '#1d1d1b', btnFg: '#ffffff', btnHover: '#3a3a37',
      btnOutlineBg: '#fbfaf7', btnOutlineFg: '#1d1d1b', btnOutlineHover: '#e6e3db',
      accent: '#2b6e72', accentHover: '#1f5559', accentFg: '#ffffff', accentText: '#2b6e72', accentPillBg: '#dcecec', accentPillFg: '#1a4a4d',
      synergy: '#1a4a4d', track: '#d6d3ca', pipBg: '#e4e1d9', pipFg: '#55534d',
      gold: '#c48a00', goldBg: '#fbf0cf', goldFg: '#6b4c00'
    },
    dark: {
      bg: '#121416', surface: '#191c1f', card: '#202428', cardSubtle: '#171a1d',
      body: '#e6e4df', bodySecondary: '#c9c6bf', muted: '#9a978f',
      border: '#33383d', borderSubtle: '#2a2e33', strongLine: '#55595e',
      btnBg: '#e6e4df', btnFg: '#121416', btnHover: '#ffffff',
      btnOutlineBg: '#202428', btnOutlineFg: '#e6e4df', btnOutlineHover: '#2b3035',
      accent: '#5aaeb3', accentHover: '#74c2c6', accentFg: '#121416', accentText: '#5aaeb3', accentPillBg: '#163536', accentPillFg: '#b5e0e2',
      synergy: '#8fd0d4', track: '#2c3136', pipBg: '#282d32', pipFg: '#a3a098',
      gold: '#e0a526', goldBg: '#33280c', goldFg: '#f6dd9b'
    }
  },
  {
    id: 'saloon',
    name: 'Saloon bar',
    classLevels: [2, 3],
    blurb: 'Horse brasses, a carpet that has seen things, and a regular who has been about to buy a boat since 1987.',
    materials: 'Oxblood, polished brass, bottle green',
    ornament: 'brass',
    displayFont: 'mono',
    radius: 4,
    light: {
      bg: '#efe6da', surface: '#f5eee4', card: '#fffaf2', cardSubtle: '#f3eadd',
      body: '#2a1712', bodySecondary: '#3b231b', muted: '#6a5145',
      border: '#d4c1ab', borderSubtle: '#e5d7c5', strongLine: '#5a1e1a',
      btnBg: '#6b1d1d', btnFg: '#fff7ea', btnHover: '#561616',
      btnOutlineBg: '#fffaf2', btnOutlineFg: '#4a1512', btnOutlineHover: '#f0e2cf',
      accent: '#1f5b3f', accentHover: '#174a33', accentFg: '#ffffff', accentText: '#1f5b3f', accentPillBg: '#dcebdf', accentPillFg: '#17452f',
      synergy: '#1f5b3f', track: '#e0d0bb', pipBg: '#ecdfcd', pipFg: '#64493d',
      gold: '#a87a1f', goldBg: '#f7ebcc', goldFg: '#5e4310'
    },
    dark: {
      bg: '#1a0f0d', surface: '#22140f', card: '#2c1a15', cardSubtle: '#1f120e',
      body: '#f1e4d3', bodySecondary: '#d9c6b0', muted: '#b09884',
      border: '#4a2e25', borderSubtle: '#3a231c', strongLine: '#8a5a3a',
      btnBg: '#c9a24a', btnFg: '#1a0f0d', btnHover: '#dcb75f',
      btnOutlineBg: '#2c1a15', btnOutlineFg: '#f1e4d3', btnOutlineHover: '#3a2219',
      accent: '#7a2e26', accentHover: '#8a3a30', accentFg: '#f1e4d3', accentText: '#d8968a', accentPillBg: '#183526', accentPillFg: '#bfe5cd',
      synergy: '#8fd1aa', track: '#3d261e', pipBg: '#36211a', pipFg: '#b09884',
      gold: '#d4a645', goldBg: '#3a2a0e', goldFg: '#f3dc9e'
    }
  },
  {
    id: 'counties',
    name: 'Home Counties',
    classLevels: [4, 5],
    blurb: "Paint colours named after small animals, and a village group chat at war over a bin.",
    materials: 'Sage, stone, putty, waxed oak',
    ornament: 'ruled',
    displayFont: 'serif',
    radius: 4,
    light: {
      bg: '#ebe9e1', surface: '#f2f0e9', card: '#fbfaf5', cardSubtle: '#f0eee6',
      body: '#22261f', bodySecondary: '#32372e', muted: '#5c6456',
      border: '#cdcbbd', borderSubtle: '#e0ded2', strongLine: '#3e4a38',
      btnBg: '#3e4a38', btnFg: '#f7f6ef', btnHover: '#2f392a',
      btnOutlineBg: '#fbfaf5', btnOutlineFg: '#2c3527', btnOutlineHover: '#e7e6dc',
      accent: '#4d6545', accentHover: '#3e5338', accentFg: '#ffffff', accentText: '#4d6545', accentPillBg: '#e1e9da', accentPillFg: '#384b31',
      synergy: '#435a3b', track: '#dcdacd', pipBg: '#e6e4da', pipFg: '#585f52',
      gold: '#a07a2c', goldBg: '#f5ecd3', goldFg: '#5c4413'
    },
    dark: {
      bg: '#151813', surface: '#1b1f19', card: '#232820', cardSubtle: '#181c16',
      body: '#e9e8df', bodySecondary: '#cfcfc3', muted: '#a2a698',
      border: '#363d31', borderSubtle: '#2b3127', strongLine: '#5f6d55',
      btnBg: '#c9d5bd', btnFg: '#151813', btnHover: '#dde6d3',
      btnOutlineBg: '#232820', btnOutlineFg: '#e9e8df', btnOutlineHover: '#2e3429',
      accent: '#93ad87', accentHover: '#a9c19d', accentFg: '#151813', accentText: '#93ad87', accentPillBg: '#26331f', accentPillFg: '#d2e3c8',
      synergy: '#b3cca6', track: '#30362b', pipBg: '#2b3127', pipFg: '#a2a698',
      gold: '#cfa555', goldBg: '#352a12', goldFg: '#f0dca8'
    }
  },
  {
    id: 'lounge',
    name: 'Smoking lounge',
    classLevels: [6],
    blurb: 'Chesterfields, a decanter nobody remembers filling, and a club rule against discussing money that everyone breaks by nine.',
    materials: 'Chesterfield brown, cognac, antique brass, banker\'s-lamp green',
    ornament: 'stitched',
    displayFont: 'serif',
    radius: 5,
    light: {
      bg: '#ece2d0', surface: '#f3eadb', card: '#fbf5ea', cardSubtle: '#f1e6d3',
      body: '#2b1a10', bodySecondary: '#3d2717', muted: '#6a5039',
      border: '#cdb595', borderSubtle: '#e2d2b8', strongLine: '#4a2c18',
      btnBg: '#5a3420', btnFg: '#fbf3e4', btnHover: '#47281a',
      btnOutlineBg: '#fbf5ea', btnOutlineFg: '#4a2c18', btnOutlineHover: '#efe0c8',
      accent: '#1e5a45', accentHover: '#174a39', accentFg: '#ffffff', accentText: '#1e5a45', accentPillBg: '#d9eadf', accentPillFg: '#164333',
      synergy: '#1e5a45', track: '#ddc9aa', pipBg: '#eadcc4', pipFg: '#634a35',
      gold: '#9c7426', goldBg: '#f5e8c8', goldFg: '#573f0f'
    },
    dark: {
      bg: '#170f0a', surface: '#1f150e', card: '#2b1c12', cardSubtle: '#1c120c',
      body: '#f0e2cc', bodySecondary: '#d8c3a6', muted: '#b09577',
      border: '#4d3220', borderSubtle: '#3a2618', strongLine: '#8c6237',
      btnBg: '#b8873f', btnFg: '#170f0a', btnHover: '#cc9c55',
      btnOutlineBg: '#2b1c12', btnOutlineFg: '#f0e2cc', btnOutlineHover: '#3a2617',
      accent: '#5aa887', accentHover: '#72bc9d', accentFg: '#170f0a', accentText: '#5aa887', accentPillBg: '#173527', accentPillFg: '#bfe3d1',
      synergy: '#8fcfb2', track: '#3b281a', pipBg: '#352416', pipFg: '#b09577',
      gold: '#cf9f4a', goldBg: '#3a2a10', goldFg: '#f2d9a0'
    }
  },
  {
    id: 'chalet',
    name: 'Alpine chalet',
    classLevels: [7],
    blurb: 'Bare larch, pale cashmere, and a helipad the planning office somehow never saw.',
    materials: 'Ivory, slate, platinum, glacier blue',
    ornament: 'clean',
    displayFont: 'mono',
    radius: 8,
    light: {
      bg: '#f4f5f6', surface: '#f9fafa', card: '#ffffff', cardSubtle: '#f1f3f5',
      body: '#1b2228', bodySecondary: '#2a333b', muted: '#5a6670',
      border: '#d5dbe0', borderSubtle: '#e6eaee', strongLine: '#2a333b',
      btnBg: '#2a333b', btnFg: '#ffffff', btnHover: '#3c4852',
      btnOutlineBg: '#ffffff', btnOutlineFg: '#1b2228', btnOutlineHover: '#eef1f4',
      accent: '#2f6f95', accentHover: '#255a7a', accentFg: '#ffffff', accentText: '#2f6f95', accentPillBg: '#e1edf5', accentPillFg: '#1d4c69',
      synergy: '#255a7a', track: '#e0e5ea', pipBg: '#eceff2', pipFg: '#56616b',
      gold: '#7f8a94', goldBg: '#eceff1', goldFg: '#3c464f'
    },
    dark: {
      bg: '#0f1418', surface: '#151b20', card: '#1c242b', cardSubtle: '#141a1f',
      body: '#eef2f5', bodySecondary: '#cdd6dd', muted: '#97a5b0',
      border: '#2d3943', borderSubtle: '#232d35', strongLine: '#52616d',
      btnBg: '#eef2f5', btnFg: '#0f1418', btnHover: '#ffffff',
      btnOutlineBg: '#1c242b', btnOutlineFg: '#eef2f5', btnOutlineHover: '#26313a',
      accent: '#7fb6d8', accentHover: '#9cc8e4', accentFg: '#0f1418', accentText: '#7fb6d8', accentPillBg: '#173041', accentPillFg: '#cfe6f4',
      synergy: '#a6d0ea', track: '#27323b', pipBg: '#232d35', pipFg: '#97a5b0',
      gold: '#c3ccd3', goldBg: '#2a3138', goldFg: '#e8edf1'
    }
  },
  {
    id: 'state',
    name: 'State rooms',
    classLevels: [8],
    blurb: "Gilt to the ceiling, a portrait of somebody's great-great-uncle, and a footman whose only job is the door.",
    materials: 'Claret damask, ivory, gold leaf',
    ornament: 'gilt',
    displayFont: 'serif',
    radius: 2,
    light: {
      bg: '#f3ede1', surface: '#f8f3e8', card: '#fffcf5', cardSubtle: '#f5eee0',
      body: '#2a1216', bodySecondary: '#3c1c21', muted: '#6a4b4e',
      border: '#d9c49a', borderSubtle: '#e9dcc0', strongLine: '#6d1a28',
      btnBg: '#6d1a28', btnFg: '#fff8ea', btnHover: '#571421',
      btnOutlineBg: '#fffcf5', btnOutlineFg: '#5a1522', btnOutlineHover: '#f3e6cc',
      accent: '#7a1f30', accentHover: '#63182a', accentFg: '#ffffff', accentText: '#7a1f30', accentPillBg: '#f4dfe2', accentPillFg: '#5e1624',
      synergy: '#7a1f30', track: '#e8dbbd', pipBg: '#efe4cd', pipFg: '#644548',
      gold: '#b08a2e', goldBg: '#f6ebc9', goldFg: '#5c4511'
    },
    dark: {
      bg: '#1a0b0f', surface: '#220f14', card: '#2d141a', cardSubtle: '#1e0c11',
      body: '#f6ead5', bodySecondary: '#e0cfb2', muted: '#b89c87',
      border: '#5a3a26', borderSubtle: '#3e1e22', strongLine: '#b08a3e',
      btnBg: '#f6ead5', btnFg: '#1a0b0f', btnHover: '#ffffff',
      btnOutlineBg: '#2d141a', btnOutlineFg: '#f6ead5', btnOutlineHover: '#3c1a21',
      accent: '#d9b45e', accentHover: '#e6c676', accentFg: '#1a0b0f', accentText: '#d9b45e', accentPillBg: '#5a1a28', accentPillFg: '#f6dccb',
      synergy: '#e8c98a', track: '#3d1d22', pipBg: '#371a1f', pipFg: '#b89c87',
      gold: '#d9b45e', goldBg: '#3c2c0f', goldFg: '#f5e0a6'
    }
  },
  {
    id: 'vault',
    name: 'The Vault',
    classLevels: [9],
    blurb: 'Below the bank, below the ledger, where the family keeps whatever it is the family keeps.',
    materials: 'Obsidian, emerald, old gold',
    ornament: 'scaled',
    displayFont: 'serif',
    radius: 3,
    light: {
      bg: '#e7ece8', surface: '#eef2ef', card: '#f9fbf9', cardSubtle: '#edf1ee',
      body: '#0f1a16', bodySecondary: '#1c2a24', muted: '#4b5e56',
      border: '#bfccc5', borderSubtle: '#d8e1dc', strongLine: '#0f3b2c',
      btnBg: '#0f3b2c', btnFg: '#f1f6f3', btnHover: '#0a2e22',
      btnOutlineBg: '#f9fbf9', btnOutlineFg: '#0f3b2c', btnOutlineHover: '#e1e9e4',
      accent: '#0e6b4a', accentHover: '#0a573c', accentFg: '#ffffff', accentText: '#0e6b4a', accentPillBg: '#d6ece2', accentPillFg: '#0b4a33',
      synergy: '#0e6b4a', track: '#d3ddd7', pipBg: '#e0e7e3', pipFg: '#4b5e56',
      gold: '#9a7b2a', goldBg: '#f1e9cd', goldFg: '#54420f'
    },
    dark: {
      bg: '#070a09', surface: '#0c110f', card: '#111916', cardSubtle: '#0a0f0d',
      body: '#e6efe9', bodySecondary: '#c4d3ca', muted: '#8aa196',
      border: '#1f3a2f', borderSubtle: '#172a22', strongLine: '#3f7a5f',
      btnBg: '#c8a654', btnFg: '#070a09', btnHover: '#dbbb6b',
      btnOutlineBg: '#111916', btnOutlineFg: '#e6efe9', btnOutlineHover: '#18241f',
      accent: '#3fbf8a', accentHover: '#5fd3a1', accentFg: '#070a09', accentText: '#3fbf8a', accentPillBg: '#0f3326', accentPillFg: '#b6ecd4',
      synergy: '#7fdcb2', track: '#172820', pipBg: '#15221c', pipFg: '#8aa196',
      gold: '#cfae5c', goldBg: '#2e260f', goldFg: '#f0dea8'
    }
  }
]

// The room a family lives in at a given class level
export function roomForClass(level: number): RoomDef {
  return ROOMS.find((r) => r.classLevels.includes(level)) ?? ROOMS[ROOMS.length - 1]
}

// CSS custom properties for a palette, named as in styles/base.css. The
// accent keeps the old --color-purple names until the game switches over.
export function roomStyle(room: RoomDef, scheme: 'light' | 'dark'): Record<string, string> {
  const p = room[scheme]
  return {
    '--color-bg': p.bg,
    '--color-surface': p.surface,
    '--color-card': p.card,
    '--color-card-subtle': p.cardSubtle,
    '--color-body': p.body,
    '--color-body-secondary': p.bodySecondary,
    '--color-muted': p.muted,
    '--color-border': p.border,
    '--color-border-subtle': p.borderSubtle,
    '--color-strong-line': p.strongLine,
    '--color-btn-bg': p.btnBg,
    '--color-btn-fg': p.btnFg,
    '--color-btn-hover': p.btnHover,
    '--color-btn-outline-bg': p.btnOutlineBg,
    '--color-btn-outline-fg': p.btnOutlineFg,
    '--color-btn-outline-hover': p.btnOutlineHover,
    '--color-accent': p.accent,
    '--color-accent-hover': p.accentHover,
    '--color-accent-fg': p.accentFg,
    '--color-accent-text': p.accentText,
    '--color-purple': p.accent,
    '--color-purple-hover': p.accentHover,
    '--color-perk-pill-bg': p.accentPillBg,
    '--color-perk-pill-fg': p.accentPillFg,
    '--color-synergy': p.synergy,
    '--color-track': p.track,
    '--color-pip-bg': p.pipBg,
    '--color-pip-fg': p.pipFg,
    '--color-gold': p.gold,
    '--color-gold-bg': p.goldBg,
    '--color-gold-fg': p.goldFg,
    '--radius': `${room.radius}px`,
    '--font-display': room.displayFont === 'serif' ? "'Cormorant Garamond', Georgia, serif" : 'var(--font-mono)'
  }
}
