import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEditableField } from '@/hooks/useEditableField'

describe('useEditableField', () => {
  const defaultOptions = {
    initialValue: 'Initial Value',
    onSave: vi.fn(),
  }

  describe('initial state', () => {
    it('should initialize with correct values', () => {
      const { result } = renderHook(() => useEditableField(defaultOptions))

      expect(result.current.value).toBe('Initial Value')
      expect(result.current.isEditing).toBe(false)
      expect(result.current.inputRef.current).toBeNull()
    })

    it('should provide inputProps object', () => {
      const { result } = renderHook(() => useEditableField(defaultOptions))

      expect(result.current.inputProps).toHaveProperty('ref')
      expect(result.current.inputProps).toHaveProperty('value')
      expect(result.current.inputProps).toHaveProperty('onChange')
      expect(result.current.inputProps).toHaveProperty('onBlur')
      expect(result.current.inputProps).toHaveProperty('onKeyDown')
    })
  })

  describe('editing lifecycle', () => {
    it('should start editing when startEditing is called', () => {
      const { result } = renderHook(() => useEditableField(defaultOptions))

      act(() => {
        result.current.startEditing()
      })

      expect(result.current.isEditing).toBe(true)
    })

    it('should cancel editing and revert value', () => {
      const { result } = renderHook(() => useEditableField(defaultOptions))

      act(() => {
        result.current.startEditing()
      })

      act(() => {
        result.current.setValue('Changed Value')
      })

      expect(result.current.value).toBe('Changed Value')

      act(() => {
        result.current.cancelEditing()
      })

      expect(result.current.value).toBe('Initial Value')
      expect(result.current.isEditing).toBe(false)
    })
  })

  describe('saving', () => {
    it('should call onSave with new value when save is called', () => {
      const onSave = vi.fn()
      const { result } = renderHook(() =>
        useEditableField({ ...defaultOptions, onSave })
      )

      act(() => {
        result.current.startEditing()
      })

      act(() => {
        result.current.setValue('New Value')
      })

      act(() => {
        result.current.save()
      })

      expect(onSave).toHaveBeenCalledWith('New Value')
      expect(result.current.isEditing).toBe(false)
    })

    it('should not call onSave if value unchanged', () => {
      const onSave = vi.fn()
      const { result } = renderHook(() =>
        useEditableField({ ...defaultOptions, onSave })
      )

      act(() => {
        result.current.startEditing()
      })

      // Value stays the same
      act(() => {
        result.current.save()
      })

      expect(onSave).not.toHaveBeenCalled()
    })

    it('should trim value by default', () => {
      const onSave = vi.fn()
      const { result } = renderHook(() =>
        useEditableField({ ...defaultOptions, onSave })
      )

      act(() => {
        result.current.startEditing()
      })

      act(() => {
        result.current.setValue('  Trimmed Value  ')
      })

      act(() => {
        result.current.save()
      })

      expect(onSave).toHaveBeenCalledWith('Trimmed Value')
    })

    it('should not trim when trim=false', () => {
      const onSave = vi.fn()
      const { result } = renderHook(() =>
        useEditableField({ ...defaultOptions, onSave, trim: false })
      )

      act(() => {
        result.current.startEditing()
      })

      act(() => {
        result.current.setValue('  Untrimmed  ')
      })

      act(() => {
        result.current.save()
      })

      expect(onSave).toHaveBeenCalledWith('  Untrimmed  ')
    })

    it('should revert to initial if empty and allowEmpty=false', () => {
      const onSave = vi.fn()
      const { result } = renderHook(() =>
        useEditableField({ ...defaultOptions, onSave, allowEmpty: false })
      )

      act(() => {
        result.current.startEditing()
      })

      act(() => {
        result.current.setValue('')
      })

      act(() => {
        result.current.save()
      })

      expect(onSave).not.toHaveBeenCalled()
      expect(result.current.value).toBe('Initial Value')
    })

    it('should allow empty when allowEmpty=true', () => {
      const onSave = vi.fn()
      const { result } = renderHook(() =>
        useEditableField({ ...defaultOptions, onSave, allowEmpty: true })
      )

      act(() => {
        result.current.startEditing()
      })

      act(() => {
        result.current.setValue('')
      })

      act(() => {
        result.current.save()
      })

      expect(onSave).toHaveBeenCalledWith('')
    })
  })

  describe('keyboard shortcuts', () => {
    it('should save on Enter key', () => {
      const onSave = vi.fn()
      const { result } = renderHook(() =>
        useEditableField({ ...defaultOptions, onSave })
      )

      act(() => {
        result.current.startEditing()
      })

      act(() => {
        result.current.setValue('New Value')
      })

      act(() => {
        const event = {
          key: 'Enter',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent<HTMLInputElement>
        result.current.handleKeyDown(event)
      })

      expect(onSave).toHaveBeenCalledWith('New Value')
      expect(result.current.isEditing).toBe(false)
    })

    it('should cancel on Escape key', () => {
      const { result } = renderHook(() => useEditableField(defaultOptions))

      act(() => {
        result.current.startEditing()
      })

      act(() => {
        result.current.setValue('Changed')
      })

      act(() => {
        const event = {
          key: 'Escape',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent<HTMLInputElement>
        result.current.handleKeyDown(event)
      })

      expect(result.current.value).toBe('Initial Value')
      expect(result.current.isEditing).toBe(false)
    })

    it('should ignore other keys', () => {
      const onSave = vi.fn()
      const { result } = renderHook(() =>
        useEditableField({ ...defaultOptions, onSave })
      )

      act(() => {
        result.current.startEditing()
      })

      act(() => {
        result.current.setValue('New Value')
      })

      act(() => {
        const event = {
          key: 'Tab',
          preventDefault: vi.fn(),
        } as unknown as React.KeyboardEvent<HTMLInputElement>
        result.current.handleKeyDown(event)
      })

      expect(onSave).not.toHaveBeenCalled()
      expect(result.current.isEditing).toBe(true)
    })
  })

  describe('handleChange', () => {
    it('should update value on change', () => {
      const { result } = renderHook(() => useEditableField(defaultOptions))

      act(() => {
        result.current.startEditing()
      })

      act(() => {
        const event = {
          target: { value: 'Changed via event' },
        } as React.ChangeEvent<HTMLInputElement>
        result.current.handleChange(event)
      })

      expect(result.current.value).toBe('Changed via event')
    })
  })

  describe('handleBlur', () => {
    it('should save on blur', () => {
      const onSave = vi.fn()
      const { result } = renderHook(() =>
        useEditableField({ ...defaultOptions, onSave })
      )

      act(() => {
        result.current.startEditing()
      })

      act(() => {
        result.current.setValue('Blurred Value')
      })

      act(() => {
        result.current.handleBlur()
      })

      expect(onSave).toHaveBeenCalledWith('Blurred Value')
      expect(result.current.isEditing).toBe(false)
    })
  })

  describe('external value sync', () => {
    it('should sync with initialValue changes when not editing', () => {
      const { result, rerender } = renderHook(
        ({ initialValue }) =>
          useEditableField({ ...defaultOptions, initialValue }),
        { initialProps: { initialValue: 'First' } }
      )

      expect(result.current.value).toBe('First')

      rerender({ initialValue: 'Second' })

      expect(result.current.value).toBe('Second')
    })

    it('should not sync with initialValue changes while editing', () => {
      const { result, rerender } = renderHook(
        ({ initialValue }) =>
          useEditableField({ ...defaultOptions, initialValue }),
        { initialProps: { initialValue: 'First' } }
      )

      act(() => {
        result.current.startEditing()
      })

      act(() => {
        result.current.setValue('Edited')
      })

      rerender({ initialValue: 'External Change' })

      // Should keep the edited value
      expect(result.current.value).toBe('Edited')
    })
  })
})
