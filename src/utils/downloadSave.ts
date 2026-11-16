import type { useGameStore } from '../stores/game'

// Downloads the save JSON, play log included, as a file for sharing or backup
export function downloadSave(store: ReturnType<typeof useGameStore>): void {
  const blob = new Blob([store.exportSave(Date.now())], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
  link.href = url
  link.download = `incremental-capitalism-${store.familySurname.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-gen${store.generation}-${stamp}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
