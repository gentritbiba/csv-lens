import { test, expect } from '@playwright/test'
import path from 'path'

/**
 * E2E tests for File Upload functionality
 *
 * These tests run with authenticated state from auth.setup.ts
 * They test the file upload flow including dropzone and file information display.
 */

// Use the existing test fixture CSV
const TEST_CSV_PATH = path.join(__dirname, '..', 'fixtures', 'test-data.csv')

test.describe('File Upload', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app')
  })

  test.describe('Dropzone UI', () => {
    test('dropzone is visible when no file is loaded', async ({ page }) => {
      // Check for dropzone text - various possible messages
      const dropzoneTexts = [
        page.getByText(/Drop your CSV/i),
        page.getByText(/drag.*drop/i),
        page.getByText(/click to browse/i),
        page.getByText(/upload/i),
      ]

      // At least one dropzone indicator should be visible
      let found = false
      for (const locator of dropzoneTexts) {
        if (await locator.first().isVisible().catch(() => false)) {
          found = true
          break
        }
      }
      expect(found).toBe(true)
    })

    test('shows file input for CSV upload', async ({ page }) => {
      // There should be a file input that accepts CSV
      const fileInput = page.locator('input[type="file"]')
      await expect(fileInput.first()).toBeAttached()
    })
  })

  test.describe('File Input', () => {
    test('can upload CSV via file input', async ({ page }) => {
      // Find the file input
      const fileInput = page.locator('input[type="file"]').first()

      // Upload the test CSV
      await fileInput.setInputFiles(TEST_CSV_PATH)

      // Wait for file to be processed
      await page.waitForTimeout(2000)

      // After upload, we should see file info or schema
      // Check for column names from test-data.csv
      const indicators = [
        page.getByText(/product_id/i),
        page.getByText(/product_name/i),
        page.getByText(/test-data/i),
        page.getByText(/rows/i),
      ]

      let found = false
      for (const locator of indicators) {
        if (await locator.first().isVisible().catch(() => false)) {
          found = true
          break
        }
      }
      expect(found).toBe(true)
    })
  })

  test.describe('File Information Display', () => {
    test('shows file loaded indicator after upload', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first()
      await fileInput.setInputFiles(TEST_CSV_PATH)

      // Wait for processing
      await page.waitForTimeout(2000)

      // After upload, the UI should change somehow - check various indicators
      // Could be file name, schema, columns, or just different UI state
      const hasFileIndicator = await page.getByText(/test-data/i).first().isVisible().catch(() => false)
      const hasDataIndicator = await page.locator('.schema, .file-info, .dataset').first().isVisible().catch(() => false)
      const textareaVisible = await page.locator('textarea').first().isVisible().catch(() => false)

      // Something should indicate the file was processed
      expect(hasFileIndicator || hasDataIndicator || textareaVisible).toBe(true)
    })

    test('query interface available after upload', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first()
      await fileInput.setInputFiles(TEST_CSV_PATH)

      await page.waitForTimeout(2000)

      // After upload, there should be a way to query the data
      const hasTextarea = await page.locator('textarea').first().isVisible().catch(() => false)
      const hasInput = await page.locator('input[type="text"]').first().isVisible().catch(() => false)

      expect(hasTextarea || hasInput).toBe(true)
    })
  })

  test.describe('Query Input After Upload', () => {
    test('query input is available after file upload', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]').first()
      await fileInput.setInputFiles(TEST_CSV_PATH)

      await page.waitForTimeout(2000)

      // Query input should be available
      const queryInputs = [
        page.getByPlaceholder(/ask.*question/i),
        page.getByPlaceholder(/what.*want/i),
        page.locator('textarea'),
        page.locator('input[type="text"]').filter({ hasText: /ask/i }),
      ]

      let found = false
      for (const locator of queryInputs) {
        if (await locator.first().isVisible().catch(() => false)) {
          found = true
          break
        }
      }

      // Query functionality should be available
      expect(found).toBe(true)
    })
  })
})
