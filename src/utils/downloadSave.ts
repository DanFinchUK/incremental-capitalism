import type { DynastyRecord } from '../engine/hall'
import type { useGameStore } from '../stores/game'

// Downloads a family's save JSON, play log included, as a file for sharing or
// backup: the family in play, or another of the save slots
export function downloadSave(store: ReturnType<typeof useGameStore>, slotId?: string): void {
  // Saving first gives a family that has just begun its seat
  store.flushSave()
  const id = slotId ?? store.activeSlotId
  // No family in residence: nothing to download
  if (id === null) return
  const save = store.exportSlot(id, Date.now())
  if (!save) return
  const name = (save.surname || 'new-family').toLowerCase().replace(/[^a-z0-9]+/g, '-')
  saveJson(save.json, `incremental-capitalism-${name}-gen${save.generation}`)
}

// A Hall of Dynasties entry, as a file: what's kept of a family once its
// seat has gone (everyone in it, their traits, staff and times)
export function downloadHallEntry(d: DynastyRecord): void {
  const name = d.surname.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  saveJson(JSON.stringify({ hallOfDynasties: d }), `incremental-capitalism-hall-${name}`)
}

function saveJson(json: string, base: string): void {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
  link.href = url
  link.download = `${base}-${stamp}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
