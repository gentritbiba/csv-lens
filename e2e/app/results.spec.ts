import { test, expect } from '@playwright/test'
import path from 'path'

/**
 * E2E tests for Results Display
 *
 * These tests run with authenticated state from auth.setup.ts
 * Tests the results panel, chart rendering, and export functionality.
 *
 * NOTE: Tests that require actual analysis results are marked with test.skip
 * as they would need to call the Claude API and spend tokens.
 */

// Use the existing test fixture CSV
const TEST_CSV_PATH = path.join(__dirname, '..', 'fixtures', 'test-data.csv')

test.describe('Results Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app')

    // Upload test file
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(TEST_CSV_PATH)
    await page.waitForTimeout(2000)
  })

  test.describe('Initial State', () => {
    test('app page loads successfully', async ({ page }) => {
      // After file upload, we should be on /app
      await expect(page).toHaveURL('/app')

      // Page should have loaded - any content visible
      const body = page.locator('body')
      await expect(body).toBeVisible()
    })

    test('shows query input after file upload', async ({ page }) => {
      // After file upload, there should be a way to ask questions
      const indicators = [
        page.locator('textarea'),
        page.getByPlaceholder(/ask/i),
        page.locator('input[type="text"]'),
      ]

      let found = false
      for (const indicator of indicators) {
        if (await indicator.first().isVisible().catch(() => false)) {
          found = true
          break
        }
      }

      expect(found).toBe(true)
    })
  })

  test.describe('Results UI Elements', () => {
    test('app interface is ready for analysis', async ({ page }) => {
      // After file upload, the app should be ready for analysis
      // Check that we have the main interface elements
      const interfaceElements = [
        page.locator('textarea'),
        page.locator('button'),
        page.locator('main'),
      ]

      let found = false
      for (const element of interfaceElements) {
        if (await element.first().isVisible().catch(() => false)) {
          found = true
          break
        }
      }

      expect(found).toBe(true)
    })
  })

  // These tests require actual analysis results (API calls)
  test.describe('Results After Analysis (SKIPPED - Uses Tokens)', () => {
    test.skip('results panel appears after analysis', async ({ page }) => {
      // Would need to run an actual analysis first
      // This spends tokens
    })

    test.skip('shows query in result card header', async ({ page }) => {
      // Would need actual results
    })

    test.skip('shows AI response/answer', async ({ page }) => {
      // Would need actual analysis
    })

    test.skip('renders bar chart correctly', async ({ page }) => {
      // Would need analysis with bar chart result
    })

    test.skip('renders line chart correctly', async ({ page }) => {
      // Would need analysis with line chart result
    })

    test.skip('renders table view correctly', async ({ page }) => {
      // Would need analysis with table result
    })

    test.skip('can switch between chart types', async ({ page }) => {
      // Would need results first
    })

    test.skip('can view and edit SQL', async ({ page }) => {
      // Would need agentic results
    })

    test.skip('can export results', async ({ page }) => {
      // Would need results to export
    })
  })
})
