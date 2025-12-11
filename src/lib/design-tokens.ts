// src/lib/design-tokens.ts
// Centralized design tokens for consistent styling across the application

// ============================================================================
// COLOR PALETTE
// ============================================================================
export const COLORS = {
  // Background colors
  bg: '#0a0d12',
  bgElevated: '#161b22',
  bgSubtle: '#21262d',
  bgMuted: '#30363d',

  // Border colors
  border: 'rgba(240, 243, 246, 0.08)',
  borderStrong: 'rgba(240, 243, 246, 0.15)',
  borderMuted: 'rgba(240, 243, 246, 0.04)',

  // Foreground colors
  foreground: '#f0f3f6',
  foregroundMuted: '#9198a1',
  foregroundSubtle: '#656d76',

  // Brand colors
  primary: '#f0b429',
  primaryMuted: 'rgba(240, 180, 41, 0.15)',
  primarySubtle: 'rgba(240, 180, 41, 0.08)',
  primaryHover: 'rgba(240, 180, 41, 0.20)',

  // Accent colors
  accent: '#58a6ff',
  accentMuted: 'rgba(88, 166, 255, 0.15)',
  accentSubtle: 'rgba(88, 166, 255, 0.08)',

  // Semantic colors
  success: '#3fb950',
  successMuted: 'rgba(63, 185, 80, 0.15)',

  warning: '#d29922',
  warningMuted: 'rgba(210, 153, 34, 0.15)',

  error: '#f85149',
  errorMuted: 'rgba(248, 81, 73, 0.15)',

  // Additional accent colors
  purple: '#a371f7',
  purpleMuted: 'rgba(163, 113, 247, 0.15)',
} as const;

// ============================================================================
// STEP/STATUS COLORS (for analysis cards, progress indicators)
// ============================================================================
export const STEP_COLORS = {
  idle: { main: COLORS.foregroundSubtle, bg: 'rgba(101, 109, 118, 0.15)' },
  thinking: { main: COLORS.primary, bg: COLORS.primaryMuted },
  executing: { main: COLORS.accent, bg: COLORS.accentMuted },
  retrying: { main: COLORS.warning, bg: COLORS.warningMuted },
  complete: { main: COLORS.success, bg: COLORS.successMuted },
  error: { main: COLORS.error, bg: COLORS.errorMuted },
} as const;

// ============================================================================
// GRADIENTS
// ============================================================================
export const GRADIENTS = {
  primary: 'linear-gradient(135deg, #f0b429 0%, #e09f1f 100%)',
  primaryText: 'linear-gradient(135deg, #f0b429 0%, #ffce54 50%, #f0b429 100%)',
  heroOrb1: 'radial-gradient(circle, rgba(240, 180, 41, 0.4) 0%, transparent 70%)',
  heroOrb2: 'radial-gradient(circle, rgba(88, 166, 255, 0.3) 0%, transparent 70%)',
  glow: 'radial-gradient(ellipse at center, rgba(240, 180, 41, 0.15) 0%, transparent 70%)',
} as const;

// ============================================================================
// SPACING
// ============================================================================
export const SPACING = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================
export const RADIUS = {
  sm: '0.375rem',  // 6px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  '2xl': '1.5rem', // 24px
  full: '9999px',
} as const;

// ============================================================================
// SHADOWS
// ============================================================================
export const SHADOWS = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
  glow: '0 0 20px rgba(240, 180, 41, 0.3)',
  glowStrong: '0 0 40px rgba(240, 180, 41, 0.5)',
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================
export const TYPOGRAPHY = {
  fontFamily: {
    sans: 'var(--font-geist-sans), system-ui, -apple-system, sans-serif',
    mono: 'var(--font-geist-mono), ui-monospace, monospace',
  },
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
  },
} as const;

// ============================================================================
// TRANSITIONS
// ============================================================================
export const TRANSITIONS = {
  fast: 'all 0.15s ease',
  normal: 'all 0.2s ease',
  slow: 'all 0.3s ease',
  smooth: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
  bounce: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

// ============================================================================
// Z-INDEX SCALE
// ============================================================================
export const Z_INDEX = {
  dropdown: 50,
  sticky: 100,
  modal: 200,
  popover: 300,
  tooltip: 400,
  toast: 500,
} as const;

// ============================================================================
// ANIMATION KEYFRAMES (for CSS-in-JS)
// ============================================================================
export const ANIMATIONS = {
  fadeIn: {
    from: { opacity: 0, transform: 'translateY(10px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
  },
  fadeInUp: {
    from: { opacity: 0, transform: 'translateY(20px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
  },
  pulse: {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0.5 },
  },
  spin: {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
} as const;

// Type exports
export type ColorKey = keyof typeof COLORS;
export type StepColorKey = keyof typeof STEP_COLORS;
