// Two fingers at once: tapping Get paid with two fingers, and holding Get
// paid with one finger while buying with another. Uses real touch events
// through the Chrome DevTools Protocol, as a phone would send them.
import { expect, test, type Page } from '@playwright/test'
import { PIXEL_10_PRO, newGame, withStore } from './phone'

test.use(PIXEL_10_PRO)

type Point = { x: number; y: number; id: number }

async function centre(page: Page, selector: string, id: number): Promise<Point> {
  const box = (await page.locator(selector).first().boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, id }
}

// Put fingers down one after another, then lift them all, in one gesture.
// The protocol sends every finger still down with each start.
async function fingers(page: Page, points: Point[]): Promise<void> {
  const cdp = await page.context().newCDPSession(page)
  for (let i = 1; i <= points.length; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points.slice(0, i) })
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
}

const taps = (page: Page) => withStore<number>(page, `(s) => s.playLog.minutes.reduce((n, m) => n + m[2], 0)`)

test('two fingers tapping Get paid together both count', async ({ page }) => {
  await newGame(page)
  const a = await centre(page, '.mob-Pay', 1)
  const b = { ...a, x: a.x + 60, id: 2 }
  const before = await taps(page)
  for (let i = 0; i < 5; i++) await fingers(page, [a, b])
  expect((await taps(page)) - before).toBe(10)
})

test('holding Get paid with one finger, a second finger can still buy', async ({ page }) => {
  await newGame(page)
  await withStore(page, `(s) => s.addDebugMoney(1000, Date.now())`)
  const pay = await centre(page, '.mob-Pay', 1)
  const buy = await centre(page, '[data-item-key="jobs-1"] .scn-Actions button', 2)
  await fingers(page, [pay, buy])
  await expect(page.locator('[data-item-key="jobs-1"] .scn-CardTitle')).toContainText('(1)')
})

test('one tap is still exactly one tap, and one buy is one buy', async ({ page }) => {
  await newGame(page)
  const before = await taps(page)
  await page.locator('.mob-Pay').tap()
  expect((await taps(page)) - before).toBe(1)
  // The first job takes a few dozen taps; pay for it up front
  await withStore(page, `(s) => s.addDebugMoney(1000, Date.now())`)
  await page.locator('[data-item-key="jobs-1"] .scn-Actions button').tap()
  await expect(page.locator('[data-item-key="jobs-1"] .scn-CardTitle')).toContainText('(1)')
})

test.describe('with a mouse', () => {
  test.use({ viewport: { width: 1280, height: 900 }, hasTouch: false, isMobile: false })

  test('a click on Get paid counts once, and Enter works from the keyboard', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.getByTestId('intro-skip').click()
    const pay = page.getByRole('button', { name: 'Get paid' })
    const before = await taps(page)
    await pay.click()
    expect((await taps(page)) - before).toBe(1)
    await pay.focus()
    await page.keyboard.press('Enter')
    expect((await taps(page)) - before).toBe(2)
  })
})

test('one finger on Get paid while another scrolls the list', async ({ page }) => {
  await newGame(page)
  // Own one of each early job past gate 3, so the Jobs list is long enough to scroll
  await withStore(page, `(s) => { s.gatesBeaten = 3; for (const id of ['1', '19', '2', '3', '4', '5', '6']) s.jobsPurchased[id] = 1; s.tick(Date.now()) }`)
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 400)).toBe(true)
  const pay = await centre(page, '.mob-Pay', 1)
  const cdp = await page.context().newCDPSession(page)
  const start = { x: 200, y: 600, id: 2 }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pay] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pay, start] })
  for (let step = 1; step <= 10; step++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [pay, { ...start, y: 600 - step * 40 }] })
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100)
})
