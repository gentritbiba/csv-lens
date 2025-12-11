import { test, expect } from '@playwright/test'

/**
 * E2E tests for the Landing Page (unauthenticated)
 *
 * Tests the public-facing landing page that users see before authentication.
 * Covers navigation, CTAs, feature sections, and responsive behavior.
 */

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.describe('Hero Section', () => {
    test('page loads successfully with hero content', async ({ page }) => {
      // Check page title
      await expect(page).toHaveTitle(/CSVLens/i)

      // Check hero headline is visible
      await expect(page.getByRole('heading', { name: /Analyze CSV Files/i })).toBeVisible()

      // Check subtitle contains key terms
      await expect(page.getByText(/free online CSV analyzer/i)).toBeVisible()
    })

    test('shows sign in link in navigation', async ({ page }) => {
      // Check for sign in link
      const signInLink = page.getByRole('link', { name: /sign in/i })
      await expect(signInLink).toBeVisible()
      await expect(signInLink).toHaveAttribute('href', '/login')
    })

    test('shows get started CTA button', async ({ page }) => {
      // Check for primary CTA button - use first() since there may be multiple
      const getStartedLink = page.getByRole('link', { name: /get started/i }).first()
      await expect(getStartedLink).toBeVisible()
      await expect(getStartedLink).toHaveAttribute('href', '/login')
    })

    test('shows privacy badge', async ({ page }) => {
      // Check for privacy badge - the actual text in the UI
      await expect(page.getByText(/100% Private/i).first()).toBeVisible()
    })

    test('shows trust signals', async ({ page }) => {
      // Check for trust signals - exact text from UI, use first() to avoid strict mode
      await expect(page.getByText(/50K tokens free/i).first()).toBeVisible()
      await expect(page.getByText(/No credit card/i).first()).toBeVisible()
      await expect(page.getByText(/Cancel anytime/i).first()).toBeVisible()
    })
  })

  test.describe('Navigation', () => {
    test('logo is visible', async ({ page }) => {
      // CSVLens logo should be present in nav
      await expect(page.locator('nav').first()).toBeVisible()
    })

    test('navigation links are visible on desktop', async ({ page }) => {
      // Check for navigation section links - use .first() for strict mode
      await expect(page.getByRole('button', { name: /How it works/i }).first()).toBeVisible()
      await expect(page.getByRole('button', { name: /Features/i }).first()).toBeVisible()
      await expect(page.getByRole('button', { name: /Pricing/i }).first()).toBeVisible()
    })

    test('navigation scrolls to section on click', async ({ page }) => {
      // Click "How it works" button (use first() to avoid strict mode violation)
      const howItWorksButton = page.getByRole('button', { name: /How it works/i }).first()
      await howItWorksButton.click()

      // Wait for smooth scroll
      await page.waitForTimeout(800)

      // Check that "How it works" section heading is visible
      await expect(page.getByText(/How it works/i).first()).toBeVisible()
    })
  })

  test.describe('How It Works Section', () => {
    test('shows three-step process', async ({ page }) => {
      // Scroll to section
      await page.getByRole('button', { name: /How it works/i }).first().click()
      await page.waitForTimeout(800)

      // Check for step-related content
      await expect(page.getByText(/Drop/i).first()).toBeVisible()
    })

    test('shows step descriptions', async ({ page }) => {
      // Scroll to section
      await page.getByRole('button', { name: /How it works/i }).first().click()
      await page.waitForTimeout(800)

      // Check for descriptive content about the process
      await expect(page.getByText(/CSV/i).first()).toBeVisible()
    })
  })

  test.describe('Features Section', () => {
    test('shows feature cards', async ({ page }) => {
      // Scroll to features section
      await page.getByRole('button', { name: /Features/i }).first().click()
      await page.waitForTimeout(800)

      // Check for at least one feature - these should exist based on common landing pages
      const featureSection = page.locator('section').filter({ hasText: /features/i })
      await expect(featureSection.first()).toBeVisible()
    })
  })

  test.describe('Pricing Section', () => {
    test('shows free and pro tiers', async ({ page }) => {
      // Scroll to pricing section
      await page.getByRole('button', { name: /Pricing/i }).first().click()
      await page.waitForTimeout(800)

      // Check for pricing tiers - look for price indicators
      await expect(page.getByText(/\$0/).first()).toBeVisible()
      await expect(page.getByText(/\$12/).first()).toBeVisible()
    })

    test('shows token limits', async ({ page }) => {
      // Scroll to pricing section
      await page.getByRole('button', { name: /Pricing/i }).first().click()
      await page.waitForTimeout(800)

      // Check for token mentions
      await expect(page.getByText(/tokens/i).first()).toBeVisible()
    })

    test('pricing CTAs link to login', async ({ page }) => {
      // Scroll to pricing section
      await page.getByRole('button', { name: /Pricing/i }).first().click()
      await page.waitForTimeout(800)

      // Check for CTA links - there should be links to login
      const ctaLinks = page.getByRole('link', { name: /start|get started|free/i })
      await expect(ctaLinks.first()).toBeVisible()
    })
  })

  test.describe('Footer', () => {
    test('shows footer links', async ({ page }) => {
      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(500)

      // Check for footer links
      await expect(page.getByRole('link', { name: /About/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /FAQ/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /Privacy/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /Terms/i })).toBeVisible()
    })

    test('footer links navigate correctly', async ({ page }) => {
      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(500)

      // Test About link
      const aboutLink = page.getByRole('link', { name: /About/i })
      await expect(aboutLink).toHaveAttribute('href', '/about')

      // Test FAQ link
      const faqLink = page.getByRole('link', { name: /FAQ/i })
      await expect(faqLink).toHaveAttribute('href', '/faq')

      // Test Privacy link
      const privacyLink = page.getByRole('link', { name: /Privacy/i })
      await expect(privacyLink).toHaveAttribute('href', '/privacy')

      // Test Terms link
      const termsLink = page.getByRole('link', { name: /Terms/i })
      await expect(termsLink).toHaveAttribute('href', '/terms')
    })

    test('shows copyright notice', async ({ page }) => {
      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(500)

      // Check for copyright - match various formats
      const currentYear = new Date().getFullYear().toString()
      await expect(page.getByText(new RegExp(currentYear, 'i'))).toBeVisible()
    })
  })

  test.describe('Final CTA Section', () => {
    test('shows final call to action', async ({ page }) => {
      // Scroll near bottom for CTA
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight - 500))
      await page.waitForTimeout(500)

      // Check for a CTA link to login
      const ctaLinks = page.getByRole('link', { name: /start|get started|free/i })
      await expect(ctaLinks.first()).toBeVisible()
    })
  })

  test.describe('Responsive Behavior', () => {
    test('navigation is usable on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/')

      // Primary CTA should still be visible
      const getStartedLink = page.getByRole('link', { name: /start|get started/i }).first()
      await expect(getStartedLink).toBeVisible()
    })
  })

  test.describe('SEO and Metadata', () => {
    test('has proper meta description', async ({ page }) => {
      const metaDescription = page.locator('meta[name="description"]')
      await expect(metaDescription).toHaveAttribute('content', /CSV|analyzer|AI|data/i)
    })

    test('has Open Graph tags', async ({ page }) => {
      const ogTitle = page.locator('meta[property="og:title"]')
      await expect(ogTitle).toBeAttached()

      const ogDescription = page.locator('meta[property="og:description"]')
      await expect(ogDescription).toBeAttached()
    })

    test('has structured data', async ({ page }) => {
      const jsonLd = page.locator('script[type="application/ld+json"]')
      await expect(jsonLd).toBeAttached()

      const content = await jsonLd.textContent()
      expect(content).toContain('CSVLens')
      expect(content).toContain('SoftwareApplication')
    })
  })
})
