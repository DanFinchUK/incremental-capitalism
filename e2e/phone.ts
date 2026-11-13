import type { Page } from '@playwright/test'

// Pixel 10 Pro, portrait
export const PIXEL_10_PRO = {
  viewport: { width: 412, height: 915 },
  deviceScaleFactor: 3.5,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 16; Pixel 10 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'
}

// A fresh game with the intro skipped
export async function newGame(page: Page): Promise<void> {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.getByTestId('intro-skip').tap()
}

// Runs a function against the game store inside the page, for test setup only
export function withStore<T>(page: Page, fn: string): Promise<T> {
  return page.evaluate(`(() => {
    const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('game')
    return (${fn})(store)
  })()`) as Promise<T>
}
