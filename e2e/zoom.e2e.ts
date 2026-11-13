import { expect, test } from '@playwright/test'

test('pinch zoom is turned off', async ({ page }) => {
  await page.goto('/')
  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content')
  expect(viewport).toContain('user-scalable=no')
  expect(viewport).toContain('maximum-scale=1')
})
