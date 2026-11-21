import type { useGameStore } from '../src/stores/game'
import { UI_PARTS } from '../src/engine/uiParts'

// Automation only runs once someone brings it. Seat an Estate Manager
// without paying the hiring fee, so tests keep the cash they set up.
export function hireEstateManager(store: ReturnType<typeof useGameStore>): void {
  const cash = store.money
  store.headhunterOffer = ['estate-manager']
  store.hireAdvisor(0)
  store.money = cash
}

// Seat any advisor without paying the hiring fee
export function hireFree(store: ReturnType<typeof useGameStore>, advisorId: string): void {
  const cash = store.money
  store.headhunterOffer = [advisorId]
  store.hireAdvisor(0)
  store.money = cash
}

// A player past their first family: every part of the screen already shown
export function showEveryPart(store: ReturnType<typeof useGameStore>): void {
  store.uiShown = [...UI_PARTS]
}
