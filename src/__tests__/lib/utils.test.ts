import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('utils', () => {
  describe('cn (className merger)', () => {
    it('should merge class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('should handle conditional classes', () => {
      expect(cn('base', true && 'active', false && 'inactive')).toBe('base active')
    })

    it('should merge Tailwind classes properly', () => {
      expect(cn('px-2', 'px-4')).toBe('px-4')
    })

    it('should handle arrays', () => {
      expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz')
    })

    it('should handle objects', () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
    })

    it('should handle undefined and null', () => {
      expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
    })

    it('should handle empty input', () => {
      expect(cn()).toBe('')
    })

    it('should merge conflicting Tailwind utilities', () => {
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
      expect(cn('mt-2', 'mt-4')).toBe('mt-4')
      expect(cn('bg-white', 'bg-black')).toBe('bg-black')
    })
  })
})
