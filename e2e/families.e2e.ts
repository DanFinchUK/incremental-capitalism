import { expect, test } from '@playwright/test'
import { PIXEL_10_PRO, newGame, withStore } from './phone'

test.use(PIXEL_10_PRO)

// Several families on the go: starting another and switching between them
// swaps the whole game, while achievements and settings stay the player's
test('a second family plays apart from the first, and switching back finds the first as it was', async ({ page }) => {
  await newGame(page)
  const first = await withStore<string>(page, `(s) => { s.money = 12345; s.dynastyMs = 60000; s.achievements = [...s.achievements, 'side-hustle']; s.toggleMute(); s.flushSave(); return s.familySurname }`)

  // Families → start another, on the ladder trial
  await withStore(page, `(s) => s.openMenu()`)
  await page.getByTestId('menu-families').click()
  await expect(page.getByTestId('save-main')).toContainText('In residence')
  await Promise.all([page.waitForEvent('load'), page.getByTestId('new-save-trial').click()])

  // Straight to the register: a fresh family, on the trial, with the first one's achievement and settings
  await expect(page.getByTestId('census-begin')).toBeVisible()
  const second = await withStore<{ money: number; achievements: string[]; muted: boolean }>(page, `(s) => ({ money: s.money, achievements: [...s.achievements], muted: s.muted })`)
  expect(second.money).toBe(0)
  expect(second.achievements).toContain('side-hustle')
  expect(second.muted).toBe(true)

  // Back to the first, as it was left, and straight into the game
  await withStore(page, `(s) => { s.closeCensus(); s.openMenu() }`)
  await expect(page.getByTestId('main-menu')).toContainText('Ladder trial')
  await page.getByTestId('menu-families').click()
  await expect(page.getByTestId('save-main')).toContainText(first.split('-')[0])
  await Promise.all([page.waitForEvent('load'), page.getByTestId('play-main').click()])
  await expect(page.getByTestId('main-menu')).toHaveCount(0)
  const back = await withStore<{ surname: string; money: number }>(page, `(s) => ({ surname: s.familySurname, money: s.money })`)
  expect(back.surname).toBe(first)
  expect(back.money).toBeGreaterThanOrEqual(12345)
})
