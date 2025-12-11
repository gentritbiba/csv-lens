/**
 * Authentication helpers for E2E tests
 *
 * Uses the test-only /api/auth/test-login endpoint to authenticate
 * without going through OAuth providers.
 */

import { Page, BrowserContext } from '@playwright/test'

// Test credentials - must match the API route
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'e2e-test@csvlens.test'
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'e2e-test-password-2024'

export interface TestUser {
  id: string
  email: string
  name: string
  tier: 'free' | 'pro'
}

/**
 * Login as the test user via the test-only API endpoint
 * This sets up an authenticated session for E2E tests
 */
export async function loginAsTestUser(page: Page): Promise<TestUser> {
  // Call the test login API
  const response = await page.request.post('/api/auth/test-login', {
    data: {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    },
  })

  if (!response.ok()) {
    const error = await response.text()
    throw new Error(`Test login failed: ${response.status()} - ${error}`)
  }

  const data = await response.json()

  if (!data.success) {
    throw new Error(`Test login failed: ${data.error}`)
  }

  return data.user as TestUser
}

/**
 * Login and navigate to the app
 * Convenience function that logs in and goes to /app
 */
export async function loginAndNavigateToApp(page: Page): Promise<TestUser> {
  const user = await loginAsTestUser(page)
  await page.goto('/app')
  return user
}

/**
 * Check if the current page is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const response = await page.request.get('/api/auth/me')
  if (!response.ok()) return false

  const data = await response.json()
  return data.isLoggedIn === true
}

/**
 * Logout the current user
 */
export async function logout(page: Page): Promise<void> {
  await page.request.get('/api/auth/logout')
}

/**
 * Setup authentication state that can be reused across tests
 * This creates a storage state file that Playwright can use
 */
export async function setupAuthState(
  context: BrowserContext,
  storageStatePath: string
): Promise<void> {
  const page = await context.newPage()

  try {
    await loginAsTestUser(page)
    await context.storageState({ path: storageStatePath })
  } finally {
    await page.close()
  }
}

/**
 * Get test credentials for manual use
 */
export function getTestCredentials() {
  return {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  }
}
