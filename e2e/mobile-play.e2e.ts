// Plays the opening of a new game on a phone held upright, by touch, the way
// a person would: tap Get paid, buy the first jobs, then buy the first
// business. Each step also checks the page is usable at that size.
import { expect, test, type Locator, type Page } from '@playwright/test'
import { PIXEL_10_PRO } from './phone'

test.use(PIXEL_10_PRO)

// Usability checks are soft: one run lists every problem, and the test still
// fails if any were found.
// Comfortable touch target, from the Android and WCAG guidance
const MIN_TAP_PX = 44

async function expectNoSidewaysScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect.soft(overflow, 'page scrolls sideways').toBeLessThanOrEqual(0)
}

async function expectTappable(target: Locator, name: string): Promise<void> {
  const box = await target.boundingBox()
  expect(box, `${name} is on the page`).not.toBeNull()
  expect.soft(box!.height, `${name} is tall enough to tap`).toBeGreaterThanOrEqual(MIN_TAP_PX)
  expect.soft(box!.width, `${name} is wide enough to tap`).toBeGreaterThanOrEqual(MIN_TAP_PX)
}

function owned(page: Page) {
  return page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('state') ?? '{}').scene ?? {}
    const sum = (m: Record<string, number> = {}) => Object.values(m).reduce((a, b) => a + b, 0)
    return { jobs: sum(save.jobsPurchased), businesses: sum(save.businessesOwned) }
  })
}

test('a new player can reach their first business by touch', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  // The intro explains the game; skipping it must be easy
  const skip = page.getByTestId('intro-skip')
  await expectTappable(skip, 'Intro skip')
  await skip.tap()
  await expect(page.getByTestId('intro-modal')).toBeHidden()
  await expectNoSidewaysScroll(page)

  // Get paid is the whole opening: it must be on screen and easy to hit
  const pay = page.getByRole('button', { name: 'Get paid' })
  await expect(pay).toBeInViewport()
  await expectTappable(pay, 'Get paid')

  // Tapping and buying are the whole loop, so the first job and Get paid
  // must be on screen together
  await expect(page.locator('[data-item-key="jobs-1"]')).toBeInViewport()

  // Shop each list in turn by its tab. Get paid should never leave the
  // screen, and scrolling should be rare.
  // Only the list on the open tab is visible; the other stays in the page
  const buyButtons = page
    .locator('[data-item-key] button.scn-Action:not(:disabled)', { hasText: /^(Get hired|Get Businessed)/ })
    .filter({ visible: true })
  const tabs = [page.getByTestId('tab-jobs'), page.getByTestId('tab-businesses')]
  for (const tab of tabs) await expectTappable(tab, 'Section tab')
  let scrolled = 0
  let round = 0
  const deadline = Date.now() + 200_000
  while ((await owned(page)).businesses === 0) {
    expect(Date.now(), 'first business bought within the time limit').toBeLessThan(deadline)
    await expect(pay, 'Get paid stays on screen').toBeInViewport()
    for (let i = 0; i < 10; i++) await pay.tap()
    await tabs[round++ % 2].tap()
    // Buy whatever is affordable, cheapest first as listed, like a new player
    const affordable = await buyButtons.count()
    for (let i = 0; i < affordable; i++) {
      const button = buyButtons.first()
      if (!(await button.isVisible())) break
      const before = await page.evaluate(() => window.scrollY)
      await button.scrollIntoViewIfNeeded()
      scrolled += Math.abs((await page.evaluate(() => window.scrollY)) - before)
      await expectTappable(button, 'Buy button')
      await button.tap()
    }
    await expectNoSidewaysScroll(page)
  }
  expect.soft(scrolled, 'pixels scrolled to reach the first business').toBeLessThanOrEqual(915)

  expect((await owned(page)).jobs).toBeGreaterThan(0)
  await page.screenshot({ path: 'test-results/mobile-first-business.png', fullPage: true })
})
