import { useEffect, useCallback } from 'react';

/**
 * useScrollReveal Hook
 * 
 * Attaches a high-performance IntersectionObserver to elements bearing the `.reveal` class.
 * Automatically unobserves elements once revealed, conserving CPU/GPU cycles.
 * Includes viewport fail-safe checks to guarantee learning content is never hidden.
 */
export function useScrollReveal(dependencies: any[] = []) {
  const triggerRevealScan = useCallback(() => {
    if (typeof window === 'undefined') return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealElements = document.querySelectorAll('.reveal:not(.revealed)');

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      revealElements.forEach((el) => el.classList.add('revealed'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            obs.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.05,
        rootMargin: '0px 0px 40px 0px',
      }
    );

    revealElements.forEach((el) => observer.observe(el));

    // Fail-safe immediate check for elements currently visible in viewport
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    revealElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < viewportHeight + 80 && rect.bottom > -80) {
        el.classList.add('revealed');
        observer.unobserve(el);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const cleanup = triggerRevealScan();
    // Subsequent checks after animations or dynamic data rendering settle
    const t1 = setTimeout(triggerRevealScan, 150);
    const t2 = setTimeout(triggerRevealScan, 600);

    return () => {
      if (cleanup) cleanup();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [triggerRevealScan, ...dependencies]);

  return { triggerRevealScan };
}

