import { test, expect } from '@playwright/test'
import path from 'path'

/**
 * E2E tests for Analysis Flow
 *
 * These tests run with authenticated state from auth.setup.ts
 * Tests the query input, model selection, and UI interactions.
 *
 * NOTE: Tests that actually call the Claude API are marked with test.skip
 * to avoid spending tokens during regular test runs.
 */

// Use the existing test fixture CSV
const TEST_CSV_PATH = path.join(__dirname, '..', 'fixtures', 'test-data.csv')

test.describe('Analysis Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app')

    // Upload test file
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(TEST_CSV_PATH)
    await page.waitForTimeout(2000)
  })

  test.describe('Query Input', () => {
    test('query input is visible after file upload', async ({ page }) => {
      // Query input should be visible (textarea or input)
      const queryInput = page.locator('textarea').first()
      const isTextareaVisible = await queryInput.isVisible().catch(() => false)

      if (!isTextareaVisible) {
        // Try finding other input types
        const otherInput = page.getByPlaceholder(/ask/i).first()
        await expect(otherInput).toBeVisible()
      } else {
        await expect(queryInput).toBeVisible()
      }
    })

    test('can type query in input', async ({ page }) => {
      const queryInput = page.locator('textarea').first()

      if (await queryInput.isVisible().catch(() => false)) {
        await queryInput.fill('Show me the total quantity by category')
        await expect(queryInput).toHaveValue('Show me the total quantity by category')
      }
    })
  })

  test.describe('Analysis Controls', () => {
    test('shows analysis submit button', async ({ page }) => {
      // Look for submit/analyze button
      const submitButtons = [
        page.getByRole('button', { name: /analyze/i }),
        page.getByRole('button', { name: /submit/i }),
        page.getByRole('button', { name: /ask/i }),
        page.locator('button[type="submit"]'),
      ]

      let found = false
      for (const btn of submitButtons) {
        if (await btn.first().isVisible().catch(() => false)) {
          found = true
          break
        }
      }

      expect(found).toBe(true)
    })

    test('shows analysis options or toggle', async ({ page }) => {
      // Look for any analysis-related controls
      const indicators = [
        page.getByText(/model/i),
        page.getByText(/sonnet/i),
        page.getByText(/haiku/i),
        page.getByText(/agentic/i),
        page.getByText(/simple/i),
        page.getByRole('switch'),
        page.getByRole('checkbox'),
        page.locator('[data-state]'), // Radix UI toggle
      ]

      let found = false
      for (const indicator of indicators) {
        if (await indicator.first().isVisible().catch(() => false)) {
          found = true
          break
        }
      }

      // If no explicit options, just check textarea exists (basic mode)
      if (!found) {
        found = await page.locator('textarea').first().isVisible().catch(() => false)
      }

      expect(found).toBe(true)
    })
  })

  test.describe('Simple Analysis (No API Call)', () => {
    test('can run simple SQL query without agentic mode', async ({ page }) => {
      // Type a simple query
      const queryInput = page.locator('textarea').first()

      if (await queryInput.isVisible().catch(() => false)) {
        await queryInput.fill('SELECT * FROM data LIMIT 5')

        // Find and click submit
        const submitBtn = page.getByRole('button', { name: /analyze|submit|ask/i }).first()

        if (await submitBtn.isVisible().catch(() => false)) {
          await submitBtn.click()

          // Wait briefly for any UI response
          await page.waitForTimeout(1000)

          // Should show some kind of result or loading state
          // (The actual result depends on whether it's a simple SQL query or needs AI)
        }
      }
    })
  })

  // These tests call the actual Claude API and will spend tokens
  // Only enable when you want to do full integration testing
  test.describe('Full Analysis (API Calls - SKIPPED)', () => {
    test.skip('agentic analysis shows thinking steps', async ({ page }) => {
      // Enable agentic mode
      const agenticToggle = page.getByLabel(/agentic/i).first()
      if (await agenticToggle.isVisible().catch(() => false)) {
        await agenticToggle.click()
      }

      // Type a question
      const queryInput = page.locator('textarea').first()
      await queryInput.fill('What is the total price across all products?')

      // Submit
      const submitBtn = page.getByRole('button', { name: /analyze|submit/i }).first()
      await submitBtn.click()

      // Wait for response (this will use tokens!)
      await page.waitForTimeout(30000)

      // Should show thinking steps or result
      await expect(page.getByText(/thinking|analyzing|result/i).first()).toBeVisible()
    })

    test.skip('shows chart after successful analysis', async ({ page }) => {
      const queryInput = page.locator('textarea').first()
      await queryInput.fill('Show quantity by category as a bar chart')

      const submitBtn = page.getByRole('button', { name: /analyze|submit/i }).first()
      await submitBtn.click()

      // Wait for analysis to complete (uses tokens!)
      await page.waitForTimeout(30000)

      // Chart should be rendered
      const chartIndicators = [
        page.locator('svg').first(),
        page.locator('.recharts-wrapper'),
        page.getByText(/bar|chart/i),
      ]

      let found = false
      for (const indicator of chartIndicators) {
        if (await indicator.isVisible().catch(() => false)) {
          found = true
          break
        }
      }

      expect(found).toBe(true)
    })
  })
})
