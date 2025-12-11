import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TokenLimitBanner, TokenLimitModal } from '@/components/TokenLimitBanner'
import type { TokenUsage } from '@/hooks/useUser'

// Mock the useUser hooks
vi.mock('@/hooks/useUser', () => ({
  formatTokens: (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`
    return tokens.toString()
  },
  getUsagePercentage: (usage: { tokensUsed: number; tokenLimit: number } | null) => {
    if (!usage || usage.tokenLimit === 0) return 0
    return (usage.tokensUsed / usage.tokenLimit) * 100
  },
}))

describe('TokenLimitBanner', () => {
  const createUsage = (used: number, limit: number): TokenUsage => ({
    tokensUsed: used,
    tokenLimit: limit,
    periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  })

  describe('visibility', () => {
    it('should not render when usage is null', () => {
      render(<TokenLimitBanner usage={null} />)
      expect(screen.queryByText(/Token Limit/)).not.toBeInTheDocument()
    })

    it('should not render when usage is below 80%', () => {
      const usage = createUsage(50000, 150000) // ~33%
      render(<TokenLimitBanner usage={usage} />)
      expect(screen.queryByText(/Token Limit/)).not.toBeInTheDocument()
    })

    it('should render warning when usage is between 80% and 100%', () => {
      const usage = createUsage(130000, 150000) // ~87%
      render(<TokenLimitBanner usage={usage} />)
      expect(screen.getByText('Approaching Token Limit')).toBeInTheDocument()
    })

    it('should render error when usage is at 100%', () => {
      const usage = createUsage(150000, 150000) // 100%
      render(<TokenLimitBanner usage={usage} />)
      expect(screen.getByText('Token Limit Reached')).toBeInTheDocument()
    })

    it('should render error when usage exceeds limit', () => {
      const usage = createUsage(160000, 150000) // >100%
      render(<TokenLimitBanner usage={usage} />)
      expect(screen.getByText('Token Limit Reached')).toBeInTheDocument()
    })
  })

  describe('dismiss functionality', () => {
    it('should dismiss when clicking dismiss button', () => {
      const usage = createUsage(130000, 150000)
      render(<TokenLimitBanner usage={usage} />)

      expect(screen.getByText('Approaching Token Limit')).toBeInTheDocument()

      fireEvent.click(screen.getByText('Dismiss'))

      expect(screen.queryByText('Approaching Token Limit')).not.toBeInTheDocument()
    })

    it('should dismiss when clicking X button', () => {
      const usage = createUsage(130000, 150000)
      render(<TokenLimitBanner usage={usage} />)

      // Find the X button by its icon container
      const buttons = screen.getAllByRole('button')
      const closeButton = buttons.find(
        (btn) => btn.querySelector('svg.lucide-x') !== null
      )

      if (closeButton) {
        fireEvent.click(closeButton)
      }

      expect(screen.queryByText('Approaching Token Limit')).not.toBeInTheDocument()
    })
  })

  describe('upgrade button', () => {
    it('should call onUpgrade when upgrade button is clicked', () => {
      const onUpgrade = vi.fn()
      const usage = createUsage(130000, 150000)

      render(<TokenLimitBanner usage={usage} onUpgrade={onUpgrade} />)

      fireEvent.click(screen.getByText('Upgrade to Pro'))
      expect(onUpgrade).toHaveBeenCalled()
    })

    it('should not show upgrade button when onUpgrade is not provided', () => {
      const usage = createUsage(130000, 150000)
      render(<TokenLimitBanner usage={usage} />)

      expect(screen.queryByText('Upgrade to Pro')).not.toBeInTheDocument()
    })
  })

  describe('usage display', () => {
    it('should show percentage for near-limit warning', () => {
      const usage = createUsage(120000, 150000) // 80%
      render(<TokenLimitBanner usage={usage} />)

      // The component shows the percentage in the message
      expect(screen.getByText(/80/)).toBeInTheDocument()
    })

    it('should show token counts for near-limit warning', () => {
      const usage = createUsage(120000, 150000)
      render(<TokenLimitBanner usage={usage} />)

      // Check for formatted token display (K suffix)
      expect(screen.getByText(/120/)).toBeInTheDocument()
      expect(screen.getByText(/150/)).toBeInTheDocument()
    })
  })
})

describe('TokenLimitModal', () => {
  const createUsage = (used: number, limit: number): TokenUsage => ({
    tokensUsed: used,
    tokenLimit: limit,
    periodEnd: new Date('2025-02-15').toISOString(),
  })

  it('should not render when isOpen is false', () => {
    render(
      <TokenLimitModal
        isOpen={false}
        onClose={vi.fn()}
        usage={createUsage(150000, 150000)}
      />
    )

    expect(screen.queryByText('Token Limit Reached')).not.toBeInTheDocument()
  })

  it('should render when isOpen is true', () => {
    render(
      <TokenLimitModal
        isOpen={true}
        onClose={vi.fn()}
        usage={createUsage(150000, 150000)}
      />
    )

    expect(screen.getByText('Token Limit Reached')).toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn()

    render(
      <TokenLimitModal
        isOpen={true}
        onClose={onClose}
        usage={createUsage(150000, 150000)}
      />
    )

    fireEvent.click(screen.getByText('Close'))
    expect(onClose).toHaveBeenCalled()
  })

  it('should call onClose when backdrop is clicked', () => {
    const onClose = vi.fn()

    render(
      <TokenLimitModal
        isOpen={true}
        onClose={onClose}
        usage={createUsage(150000, 150000)}
      />
    )

    // Click the backdrop (the first element with bg-black class)
    const backdrop = document.querySelector('.bg-black\\/60')
    if (backdrop) {
      fireEvent.click(backdrop)
    }

    expect(onClose).toHaveBeenCalled()
  })

  it('should call onUpgrade when upgrade button is clicked', () => {
    const onUpgrade = vi.fn()

    render(
      <TokenLimitModal
        isOpen={true}
        onClose={vi.fn()}
        onUpgrade={onUpgrade}
        usage={createUsage(150000, 150000)}
      />
    )

    fireEvent.click(screen.getByText('Upgrade to Pro'))
    expect(onUpgrade).toHaveBeenCalled()
  })

  it('should display usage information', () => {
    render(
      <TokenLimitModal
        isOpen={true}
        onClose={vi.fn()}
        usage={createUsage(150000, 150000)}
      />
    )

    expect(screen.getByText('Tokens Used')).toBeInTheDocument()
    expect(screen.getByText(/150K/)).toBeInTheDocument()
  })

  it('should display period end date', () => {
    render(
      <TokenLimitModal
        isOpen={true}
        onClose={vi.fn()}
        usage={createUsage(150000, 150000)}
      />
    )

    expect(screen.getByText(/Resets on/)).toBeInTheDocument()
  })
})
