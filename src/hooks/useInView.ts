// src/hooks/useInView.ts
// Reusable intersection observer hook for scroll animations

import { useEffect, useRef, useState, useCallback, RefObject } from 'react';

interface UseInViewOptions {
  /** Threshold for intersection (0-1). Default: 0.2 */
  threshold?: number;
  /** Root margin for intersection. Default: '0px' */
  rootMargin?: string;
  /** Whether to only trigger once. Default: true */
  triggerOnce?: boolean;
}

interface UseInViewReturn<T extends HTMLElement> {
  /** Callback ref to attach to element */
  ref: (node: T | null) => void;
  isInView: boolean;
}

/**
 * Hook for detecting when an element enters the viewport
 * Useful for scroll-driven animations and lazy loading
 */
export function useInView<T extends HTMLElement = HTMLElement>(
  options: UseInViewOptions = {}
): UseInViewReturn<T> {
  const { threshold = 0.2, rootMargin = '0px', triggerOnce = true } = options;
  const elementRef = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // If already in view and triggerOnce, don't re-observe
    if (isInView && triggerOnce) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (triggerOnce) {
            observer.disconnect();
          }
        } else if (!triggerOnce) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce, isInView]);

  // Callback ref that can be merged with other refs
  const setRef = useCallback((node: T | null) => {
    elementRef.current = node;
  }, []);

  return { ref: setRef, isInView };
}

/**
 * Hook for tracking scroll position
 * Useful for parallax effects and scroll-dependent styling
 */
export function useScrollPosition(): number {
  // Initialize with current scroll position (0 on server, actual value on client)
  const [scrollY, setScrollY] = useState(() =>
    typeof window !== 'undefined' ? window.scrollY : 0
  );

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return scrollY;
}

interface UseActiveSectionOptions {
  /** Refs to section elements */
  sectionRefs: RefObject<(HTMLElement | null)[]>;
  /** Offset from center of viewport (0-1). Default: 0.5 */
  offset?: number;
}

/**
 * Hook for tracking which section is currently active based on scroll
 * Useful for navigation indicators and section highlighting
 */
export function useActiveSection(options: UseActiveSectionOptions): number {
  const { sectionRefs, offset = 0.5 } = options;
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const sections = sectionRefs.current;

      sections?.forEach((section, index) => {
        if (section) {
          const rect = section.getBoundingClientRect();
          if (rect.top < windowHeight * offset && rect.bottom > windowHeight * offset) {
            setActiveSection(index);
          }
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sectionRefs, offset]);

  return activeSection;
}
