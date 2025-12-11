// src/lib/style-utils.ts
// Utility functions for common styling patterns

import { CSSProperties, MouseEvent } from 'react';
import { COLORS, TRANSITIONS } from './design-tokens';

// ============================================================================
// HOVER STATE UTILITIES
// ============================================================================

interface HoverStyleConfig {
  defaultBg: string;
  hoverBg: string;
  condition?: boolean;
}

/**
 * Creates onMouseEnter/onMouseLeave handlers for hover effects
 * Reduces repetitive inline hover state management
 */
export function createHoverHandlers(config: HoverStyleConfig) {
  const { defaultBg, hoverBg, condition = true } = config;

  return {
    onMouseEnter: (e: MouseEvent<HTMLElement>) => {
      if (condition) {
        e.currentTarget.style.backgroundColor = hoverBg;
      }
    },
    onMouseLeave: (e: MouseEvent<HTMLElement>) => {
      if (condition) {
        e.currentTarget.style.backgroundColor = defaultBg;
      }
    },
  };
}

/**
 * Common hover configurations using design tokens
 */
export const hoverConfigs = {
  primary: {
    defaultBg: COLORS.primarySubtle,
    hoverBg: COLORS.primaryHover,
  },
  primaryMuted: {
    defaultBg: COLORS.primaryMuted,
    hoverBg: COLORS.primaryHover,
  },
  subtle: {
    defaultBg: 'transparent',
    hoverBg: COLORS.border,
  },
  elevated: {
    defaultBg: COLORS.bgElevated,
    hoverBg: COLORS.bgSubtle,
  },
} as const;

// ============================================================================
// GRADIENT TEXT UTILITY
// ============================================================================

/**
 * Creates inline styles for gradient text
 * Common pattern used across landing pages
 */
export function gradientTextStyle(gradient: string): CSSProperties {
  return {
    background: gradient,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  };
}

// ============================================================================
// CONDITIONAL STYLES
// ============================================================================

/**
 * Utility to conditionally apply styles
 */
export function conditionalStyle(
  condition: boolean,
  trueStyle: CSSProperties,
  falseStyle: CSSProperties = {}
): CSSProperties {
  return condition ? trueStyle : falseStyle;
}

// ============================================================================
// NAV STYLES
// ============================================================================

/**
 * Creates styles for sticky navigation based on scroll position
 */
export function stickyNavStyle(scrollY: number, threshold = 100): CSSProperties {
  return {
    backgroundColor: scrollY > threshold ? 'rgba(10, 13, 18, 0.9)' : 'transparent',
    backdropFilter: scrollY > threshold ? 'blur(20px)' : 'none',
    borderBottom: scrollY > threshold ? `1px solid ${COLORS.border}` : 'none',
    transition: TRANSITIONS.slow,
  };
}

// ============================================================================
// ANIMATION UTILITIES
// ============================================================================

/**
 * Creates fade-in animation style based on visibility
 */
export function fadeInStyle(
  isVisible: boolean,
  delay = 0,
  translateY = 60
): CSSProperties {
  return {
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'translateY(0)' : `translateY(${translateY}px)`,
    transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
  };
}

/**
 * Creates staggered animation delay for list items
 */
export function staggerDelay(index: number, baseDelay = 0, increment = 100): number {
  return baseDelay + index * increment;
}

// ============================================================================
// FORMAT UTILITIES (commonly used in components)
// ============================================================================

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Format large numbers with K/M suffix
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
}

// ============================================================================
// CLASSNAME UTILITIES
// ============================================================================

/**
 * Combines class names, filtering out falsy values
 */
export function cx(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
