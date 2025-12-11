// src/hooks/useEditableField.ts
// Reusable hook for inline editable text fields

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';

export interface UseEditableFieldOptions {
  /** Initial value */
  initialValue: string;
  /** Callback when value is saved */
  onSave: (value: string) => void;
  /** Whether to trim the value before saving */
  trim?: boolean;
  /** Whether to allow empty values */
  allowEmpty?: boolean;
}

export interface UseEditableFieldReturn {
  /** Current edited value */
  value: string;
  /** Whether field is being edited */
  isEditing: boolean;
  /** Ref for the input element */
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** Start editing */
  startEditing: () => void;
  /** Cancel editing and revert changes */
  cancelEditing: () => void;
  /** Save current value */
  save: () => void;
  /** Update value while editing */
  setValue: (value: string) => void;
  /** Handler for onChange event */
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Handler for onBlur event */
  handleBlur: () => void;
  /** Handler for onKeyDown event (Enter to save, Escape to cancel) */
  handleKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  /** Props to spread on input element */
  inputProps: {
    ref: React.RefObject<HTMLInputElement | null>;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur: () => void;
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  };
}

/**
 * Hook for managing inline editable text fields
 * Handles focus management, keyboard shortcuts, and save/cancel logic
 */
export function useEditableField({
  initialValue,
  onSave,
  trim = true,
  allowEmpty = false,
}: UseEditableFieldOptions): UseEditableFieldReturn {
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with external value changes when not editing
  useEffect(() => {
    if (!isEditing) {
      // Intentional: sync external prop changes when not in edit mode
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(initialValue);
    }
  }, [initialValue, isEditing]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const startEditing = useCallback(() => {
    setIsEditing(true);
  }, []);

  const cancelEditing = useCallback(() => {
    setValue(initialValue);
    setIsEditing(false);
  }, [initialValue]);

  const save = useCallback(() => {
    const finalValue = trim ? value.trim() : value;

    if (!allowEmpty && !finalValue) {
      // Revert to original if empty and not allowed
      setValue(initialValue);
    } else if (finalValue !== initialValue) {
      onSave(finalValue);
    }

    setIsEditing(false);
  }, [value, initialValue, onSave, trim, allowEmpty]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  }, []);

  const handleBlur = useCallback(() => {
    save();
  }, [save]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        save();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEditing();
      }
    },
    [save, cancelEditing]
  );

  return {
    value,
    isEditing,
    inputRef,
    startEditing,
    cancelEditing,
    save,
    setValue,
    handleChange,
    handleBlur,
    handleKeyDown,
    inputProps: {
      ref: inputRef,
      value,
      onChange: handleChange,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
    },
  };
}
