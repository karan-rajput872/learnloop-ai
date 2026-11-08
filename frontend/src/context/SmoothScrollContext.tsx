import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import Lenis from 'lenis';

interface ScrollToOptions {
  offset?: number;
  duration?: number;
  immediate?: boolean;
  lock?: boolean;
  easing?: (t: number) => number;
}

interface SmoothScrollContextType {
  lenis: Lenis | null;
  scrollTo: (target: string | HTMLElement | number, options?: ScrollToOptions) => void;
  scrollToTop: (duration?: number) => void;
  scrollProgress: number;
  showBackToTop: boolean;
  isReducedMotion: boolean;
}

const SmoothScrollContext = createContext<SmoothScrollContextType>({
  lenis: null,
  scrollTo: () => {},
  scrollToTop: () => {},
  scrollProgress: 0,
  showBackToTop: false,
  isReducedMotion: false,
});

export const useSmoothScroll = () => useContext(SmoothScrollContext);

// Exponential ease-out formula ported from portfolio: (1.001 - 2^(-10t))
const defaultEasing = (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t));

export const SmoothScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lenisInstance, setLenisInstance] = useState<Lenis | null>(null);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [showBackToTop, setShowBackToTop] = useState<boolean>(false);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  const lenisRef = useRef<Lenis | null>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleMediaChange);

    // If reduced motion is requested, do not initialize smooth scroll hijacking
    if (mediaQuery.matches) {
      document.documentElement.classList.remove('lenis');
      return () => mediaQuery.removeEventListener('change', handleMediaChange);
    }

    try {
      const lenis = new Lenis({
        lerp: 0.075, // Silky linear interpolation factor
        wheelMultiplier: 0.82, // Fluid natural wheel glide
        touchMultiplier: 1.0, // 100% native gesture response
        syncTouch: false, // Maintain native mobile touch momentum
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        infinite: false,
        respectReducedMotion: true,
      });

      lenisRef.current = lenis;
      setLenisInstance(lenis);

      // Attach global reference for debugging & parity
      (window as any).lenis = lenis;
      document.documentElement.classList.add('lenis');

      // Sync scroll metrics
      lenis.on('scroll', (e: { scroll: number }) => {
        const scrollY = e.scroll;
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = totalHeight > 0 ? (scrollY / totalHeight) * 100 : 0;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
        setShowBackToTop(scrollY > 350);
      });

      // RAF loop
      const raf = (time: number) => {
        lenis.raf(time);
        rafIdRef.current = requestAnimationFrame(raf);
      };
      rafIdRef.current = requestAnimationFrame(raf);
    } catch (err) {
      console.warn('[SMOOTH SCROLL] Lenis initialization fallback to native:', err);
    }

    // Passive native scroll listener as safety fallback
    const handleNativeScroll = () => {
      if (!lenisRef.current) {
        const scrollY = window.scrollY;
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = totalHeight > 0 ? (scrollY / totalHeight) * 100 : 0;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
        setShowBackToTop(scrollY > 350);
      }
    };
    window.addEventListener('scroll', handleNativeScroll, { passive: true });

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
      window.removeEventListener('scroll', handleNativeScroll);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (lenisRef.current) {
        lenisRef.current.destroy();
        lenisRef.current = null;
      }
      document.documentElement.classList.remove('lenis');
      delete (window as any).lenis;
    };
  }, [isReducedMotion]);

  const scrollTo = useCallback((target: string | HTMLElement | number, options?: ScrollToOptions) => {
    if (lenisRef.current && !isReducedMotion) {
      lenisRef.current.scrollTo(target, {
        offset: options?.offset ?? -80,
        duration: options?.duration ?? 1.25,
        immediate: options?.immediate ?? false,
        lock: options?.lock ?? false,
        easing: options?.easing || defaultEasing,
      });
    } else {
      let targetTop = 0;
      if (typeof target === 'number') {
        targetTop = target;
      } else if (typeof target === 'string') {
        const el = document.querySelector(target);
        if (el) {
          targetTop = el.getBoundingClientRect().top + window.scrollY + (options?.offset ?? -80);
        }
      } else if (target instanceof HTMLElement) {
        targetTop = target.getBoundingClientRect().top + window.scrollY + (options?.offset ?? -80);
      }
      window.scrollTo({
        top: targetTop,
        behavior: isReducedMotion || options?.immediate ? 'auto' : 'smooth',
      });
    }
  }, [isReducedMotion]);

  const scrollToTop = useCallback((duration: number = 1.25) => {
    scrollTo(0, { duration, offset: 0 });
  }, [scrollTo]);

  return (
    <SmoothScrollContext.Provider
      value={{
        lenis: lenisInstance,
        scrollTo,
        scrollToTop,
        scrollProgress,
        showBackToTop,
        isReducedMotion,
      }}
    >
      {children}
    </SmoothScrollContext.Provider>
  );
};
