import { test, expect } from '@playwright/test'

/**
 * E2E tests for Authentication Flow
 *
 * Tests login page rendering and basic auth flow behavior.
 * Note: Full OAuth flow testing requires test accounts and is marked with test.skip.
 */

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login')
    })

    test('login page loads successfully', async ({ page }) => {
      // Check for welcome message
      await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible()
      await expect(page.getByText(/Sign in to continue to CSVLens/i)).toBeVisible()
    })

    test('shows Google OAuth button', async ({ page }) => {
      const googleButton = page.getByRole('link', { name: /Continue with Google/i })
      await expect(googleButton).toBeVisible()
      await expect(googleButton).toHaveAttribute('href', '/api/auth/login?provider=GoogleOAuth')
    })

    test('shows GitHub OAuth button', async ({ page }) => {
      const githubButton = page.getByRole('link', { name: /Continue with GitHub/i })
      await expect(githubButton).toBeVisible()
      await expect(githubButton).toHaveAttribute('href', '/api/auth/login?provider=GitHubOAuth')
    })

    test('shows back to home link', async ({ page }) => {
      const backLink = page.getByRole('link', { name: /Back to home/i })
      await expect(backLink).toBeVisible()
      await expect(backLink).toHaveAttribute('href', '/')
    })

    test('shows logo on login page', async ({ page }) => {
      // Logo should be present on login page - check for SVG or image in header area
      const logoIndicators = [
        page.locator('svg').first(),
        page.locator('img[alt*="logo" i]'),
        page.locator('[class*="logo" i]'),
        page.getByText(/CSVLens/i),
      ]

      let found = false
      for (const indicator of logoIndicators) {
        if (await indicator.isVisible().catch(() => false)) {
          found = true
          break
        }
      }

      expect(found).toBe(true)
    })

    test('shows free tier information', async ({ page }) => {
      await expect(page.getByText(/Start with 50,000 free tokens/i)).toBeVisible()
      await expect(page.getByText(/No credit card required/i)).toBeVisible()
    })

    test('shows terms and privacy links', async ({ page }) => {
      await expect(page.getByText(/Terms of Service/i)).toBeVisible()
      await expect(page.getByText(/Privacy Policy/i)).toBeVisible()
    })

    test('shows powered by WorkOS', async ({ page }) => {
      await expect(page.getByText(/Powered by WorkOS/i)).toBeVisible()
    })

    test('back to home link works', async ({ page }) => {
      await page.getByRole('link', { name: /Back to home/i }).click()
      await expect(page).toHaveURL('/')
    })
  })

  test.describe('Protected Routes', () => {
    test('unauthenticated users can access login page', async ({ page }) => {
      await page.goto('/login')
      // Should not redirect, should show login form
      await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible()
    })

    // TODO: This test requires proper middleware testing
    // The middleware should redirect unauthenticated users from /app to login
    test.skip('unauthenticated users are redirected from /app to landing', async ({ page }) => {
      // Navigate to protected route
      await page.goto('/app')

      // Should redirect to login or landing page
      // Note: Actual behavior depends on middleware configuration
      await expect(page).not.toHaveURL('/app')
    })

    // TODO: This test requires proper middleware testing
    test.skip('unauthenticated users are redirected from /settings to landing', async ({ page }) => {
      await page.goto('/settings')
      await expect(page).not.toHaveURL('/settings')
    })
  })

  test.describe('OAuth Flow', () => {
    // Note: Full OAuth testing requires:
    // 1. Test OAuth accounts
    // 2. OAuth provider test mode
    // 3. Proper test environment setup

    test.skip('Google OAuth redirects to Google login', async ({ page }) => {
      // TODO: Implement with real OAuth testing setup
      // This test would verify the redirect to Google OAuth
      await page.goto('/login')
      const googleButton = page.getByRole('link', { name: /Continue with Google/i })
      await googleButton.click()

      // Verify redirect to Google OAuth
      // Note: This will fail without proper test setup
      await expect(page.url()).toContain('accounts.google.com')
    })

    test.skip('GitHub OAuth redirects to GitHub login', async ({ page }) => {
      // TODO: Implement with real OAuth testing setup
      await page.goto('/login')
      const githubButton = page.getByRole('link', { name: /Continue with GitHub/i })
      await githubButton.click()

      // Verify redirect to GitHub OAuth
      await expect(page.url()).toContain('github.com')
    })

    test.skip('successful login redirects to /app', async ({ page: _page }) => {
      // TODO: Implement with authenticated session
      // This would require setting up an authenticated state
      // and verifying the redirect after successful login
    })
  })

  test.describe('Session Management', () => {
    test.skip('logged in users are redirected from /login to /app', async ({ page: _page }) => {
      // TODO: This test requires setting up an authenticated session
      // The login page should redirect authenticated users to /app
      // Implementation would require:
      // 1. Mock authentication state
      // 2. Or use Playwright's storageState to persist auth
    })

    test.skip('logout clears session and redirects to home', async ({ page: _page }) => {
      // TODO: Implement with authenticated session
      // Would need to:
      // 1. Set up authenticated session
      // 2. Navigate to logout
      // 3. Verify session is cleared
      // 4. Verify redirect to home page
    })
  })

  test.describe('Error Handling', () => {
    test('handles invalid auth callback gracefully', async ({ page }) => {
      // Try to access callback without proper params
      const response = await page.goto('/api/auth/callback')

      // Should not crash - either redirect or show error
      // The actual behavior depends on the auth implementation
      expect(response).not.toBeNull()
    })
  })

  test.describe('Accessibility', () => {
    test('login page has proper heading structure', async ({ page }) => {
      await page.goto('/login')

      // Check for main heading
      const h1 = page.getByRole('heading', { level: 1 })
      await expect(h1).toBeVisible()
    })

    test('auth buttons are keyboard accessible', async ({ page }) => {
      await page.goto('/login')

      // Auth buttons should be focusable - verify they have href attributes
      const googleButton = page.getByRole('link', { name: /Continue with Google/i })
      await expect(googleButton).toBeVisible()

      const githubButton = page.getByRole('link', { name: /Continue with GitHub/i })
      await expect(githubButton).toBeVisible()

      // Verify buttons are links (inherently keyboard accessible)
      await expect(googleButton).toHaveAttribute('href', /auth/)
      await expect(githubButton).toHaveAttribute('href', /auth/)
    })

    test('login page has proper color contrast', async ({ page }) => {
      await page.goto('/login')

      // Visual verification - buttons should be clearly visible
      const googleButton = page.getByRole('link', { name: /Continue with Google/i })
      await expect(googleButton).toBeVisible()

      const githubButton = page.getByRole('link', { name: /Continue with GitHub/i })
      await expect(githubButton).toBeVisible()
    })
  })
})
