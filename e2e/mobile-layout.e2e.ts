// Phone layout problems found by playing to the first gate by hand at
// 412x915. Each test pins one of them.
import { expect, test } from '@playwright/test'
import { PIXEL_10_PRO, newGame, withStore } from './phone'

test.use(PIXEL_10_PRO)

const pay = (page: import('@playwright/test').Page) => page.getByRole('button', { name: 'Get paid' })

test('a Buy button stays put after its first purchase, so the next tap lands', async ({ page }) => {
  await newGame(page)
  await pay(page).tap()
  const buy = page.locator('[data-item-key="jobs-1"] .scn-Actions button')
  const before = await buy.boundingBox()
  await buy.tap()
  await expect(page.locator('[data-item-key="jobs-1"] .scn-CardTitle')).toContainText('(1)')
  const after = await buy.boundingBox()
  expect(after!.y).toBe(before!.y)
})

test('opportunities and scandals appear in the dock, not over the Buy buttons', async ({ page }) => {
  await newGame(page)
  await withStore(page, `(s) => s.spawnSpecificEvent('internToThePress')`)
  const event = page.locator('.scn-MarketEvent')
  await expect(event).toBeVisible()
  const eventBox = (await event.boundingBox())!
  const dockBox = (await page.getByTestId('mobile-dock').boundingBox())!
  expect(eventBox.y).toBeGreaterThanOrEqual(dockBox.y)
  // and Get paid is still there to tap underneath it
  await expect(pay(page)).toBeInViewport()
})

test('the boss rules are one tap from the dock', async ({ page }) => {
  await newGame(page)
  await withStore(page, `(s) => s.addDebugMoney(1e12, Date.now())`)
  await page.getByTestId('dock-boss-rules').tap()
  await expect(page.getByTestId('boss-card')).toBeInViewport()
  await expect(page.getByTestId('boss-card')).toContainText('To win:')
})

test('switching tabs keeps each list alive instead of reloading its images', async ({ page }) => {
  await newGame(page)
  await page.evaluate(() => document.querySelector('[data-item-key="jobs-1"] img')!.setAttribute('data-marked', 'yes'))
  await page.getByTestId('tab-businesses').tap()
  await page.getByTestId('tab-jobs').tap()
  await expect(page.locator('[data-item-key="jobs-1"] img[data-marked="yes"]')).toHaveCount(1)
})

test('running buffs and penalties show in the dock', async ({ page }) => {
  await newGame(page)
  await withStore(page, `(s) => { s.spawnSpecificEvent('shadyDeal', Date.now()); s.claimMarketEvent(Date.now(), () => 0.9) }`)
  await expect(page.getByTestId('mobile-dock')).toContainText('x0.5')
})
