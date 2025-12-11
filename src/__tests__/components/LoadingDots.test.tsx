import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { LoadingDots } from '@/components/LoadingDots'

describe('LoadingDots', () => {
  it('should render three dots', () => {
    const { container } = render(<LoadingDots />)

    const dots = container.querySelectorAll('.w-2.h-2')

    expect(dots).toHaveLength(3)
  })

  it('should have animation classes', () => {
    render(<LoadingDots />)

    const container = document.querySelector('.flex.items-center.gap-1')
    expect(container).toBeTruthy()

    const dots = container?.querySelectorAll('.animate-bounce')
    expect(dots).toHaveLength(3)
  })

  it('should have different animation delays', () => {
    render(<LoadingDots />)

    const dots = document.querySelectorAll('.animate-bounce')

    // First dot has -0.3s delay
    expect(dots[0].className).toContain('[animation-delay:-0.3s]')
    // Second dot has -0.15s delay
    expect(dots[1].className).toContain('[animation-delay:-0.15s]')
    // Third dot has no delay (default)
    expect(dots[2].className).not.toContain('[animation-delay:')
  })

  it('should use primary color', () => {
    render(<LoadingDots />)

    const dots = document.querySelectorAll('.w-2.h-2')
    dots.forEach((dot) => {
      expect(dot.className).toContain('bg-[var(--primary)]')
    })
  })
})
