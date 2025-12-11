/**
 * Playwright Auth Setup
 *
 * This file runs before tests to set up authentication state.
 * It logs in once and saves the session for reuse across tests.
 */

import { test as setup, expect } from '@playwright/test'
import { loginAsTestUser } from './helpers/auth'

const authFile = 'e2e/.auth/user.json'

setup('authenticate', async ({ page }) => {
  // Login using test credentials
  const user = await loginAsTestUser(page)

  // Verify login worked
  expect(user.email).toBe('e2e-test@csvlens.test')

  // Navigate to app to verify auth works
  await page.goto('/app')

  // Should not be redirected to login
  await expect(page).toHaveURL('/app')

  // Save auth state for reuse
  await page.context().storageState({ path: authFile })
})
