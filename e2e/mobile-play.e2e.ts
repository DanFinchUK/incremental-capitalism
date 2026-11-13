// Plays the opening of a new game on a phone held upright, by touch, the way
// a person would: tap Get paid, buy the first jobs, then buy the first
// business. Each step also checks the page is usable at that size.
import { expect, test, type Locator, type Page } from '@playwright/test'

// Pixel 10 Pro, portrait
test.use({
  viewport: { width: 412, height: 915 },
  deviceScaleFactor: 3.5,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 16; Pixel 10 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'
})

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

  // Tapping and buying are the whole loop, so the first job should be within
  // one screen of Get paid, not past the office and the trading desk
  const firstJob = page.locator('[data-item-key="jobs-1"]')
  const gap = await page.evaluate(() => {
    const top = (el: Element | null) => (el ? el.getBoundingClientRect().top + window.scrollY : NaN)
    const pay = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Get paid') ?? null
    return top(document.querySelector('[data-item-key="jobs-1"]')) - top(pay)
  })
  await expect(firstJob).toBeAttached()
  expect.soft(gap, 'scroll from Get paid down to the first job (px)').toBeLessThanOrEqual(915)

  const buyButtons = page.locator('[data-item-key] button.scn-Action:not(:disabled)', { hasText: /^(Get hired|Get Businessed)/ })
  const deadline = Date.now() + 200_000
  while ((await owned(page)).businesses === 0) {
    expect(Date.now(), 'first business bought within the time limit').toBeLessThan(deadline)
    await pay.scrollIntoViewIfNeeded()
    for (let i = 0; i < 10; i++) await pay.tap()
    // Buy whatever is affordable, cheapest first as listed, like a new player
    const affordable = await buyButtons.count()
    for (let i = 0; i < affordable; i++) {
      const button = buyButtons.first()
      if (!(await button.isVisible())) break
      await button.scrollIntoViewIfNeeded()
      await expectTappable(button, 'Buy button')
      await button.tap()
    }
    await expectNoSidewaysScroll(page)
  }

  expect((await owned(page)).jobs).toBeGreaterThan(0)
  await page.screenshot({ path: 'test-results/mobile-first-business.png', fullPage: true })
})
