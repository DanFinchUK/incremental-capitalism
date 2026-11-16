import type { useGameStore } from '../src/stores/game'

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
