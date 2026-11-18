import { expect, test } from '@playwright/test'
import { PIXEL_10_PRO, newGame, withStore } from './phone'

test.use(PIXEL_10_PRO)

// Several families on the go: each in a seat of its own, only once begun,
// sharing achievements and settings and nothing else
test('a second family plays apart from the first, and switching back finds the first as it was', async ({ page }) => {
  await newGame(page)
  const first = await withStore<string>(
    page,
    `(s) => { s.money = 12345; s.dynastyMs = 60000; s.achievements = [...s.achievements, 'side-hustle']; s.toggleMute(); s.flushSave(); return s.familySurname }`
  )

  await withStore(page, `(s) => s.openMenu()`)
  await page.getByTestId('menu-families').click()
  await expect(page.getByTestId('save-main')).toContainText('In residence')
  // Abandon asks first, and Back returns here
  await page.getByTestId('families-abandon').click()
  await expect(page.getByTestId('menu-confirm-abandon')).toBeVisible()
  await page.getByTestId('menu-back').click()
  // No trial ladder without playtest options
  await expect(page.getByTestId('menu-families-page')).not.toContainText('ladder')

  // Begin another: the first keeps its seat, the new one goes to the register
  await Promise.all([page.waitForEvent('load'), page.getByTestId('families-begin').click()])
  await expect(page.getByTestId('census-begin')).toBeVisible()
  const second = await withStore<{ money: number; achievements: string[]; muted: boolean; seats: number }>(
    page,
    `(s) => ({ money: s.money, achievements: [...s.achievements], muted: s.muted, seats: s.saveIndex.slots.length })`
  )
  expect(second.money).toBe(0)
  expect(second.achievements).toContain('side-hustle')
  expect(second.muted).toBe(true)
  expect(second.seats).toBe(1)

  // Written in, it takes the second seat
  await withStore(page, `(s) => { s.closeCensus(); s.openMenu() }`)
  await page.getByTestId('menu-families').click()
  await expect(page.locator('.ttl-Save')).toHaveCount(2)
  await Promise.all([page.waitForEvent('load'), page.getByTestId('play-main').click()])
  await expect(page.getByTestId('main-menu')).toHaveCount(0)
  const back = await withStore<{ surname: string; money: number }>(page, `(s) => ({ surname: s.familySurname, money: s.money })`)
  expect(back.surname).toBe(first)
  expect(back.money).toBeGreaterThanOrEqual(12345)
})

test('a new player has no families, and playtest options offer the trial ladder', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/?playtest')
  await expect(page.getByTestId('menu-families')).toContainText('0 of 5')
  await page.getByTestId('menu-continue').click()
  await page.getByTestId('playtest-trial').click()
  await Promise.all([page.waitForEvent('load'), page.getByTestId('menu-confirm-new-dynasty').click()])
  await expect(page.getByTestId('census-begin')).toBeVisible()
  expect(await withStore<string>(page, `(s) => s.familyTuning`)).toBe('trial')
})
