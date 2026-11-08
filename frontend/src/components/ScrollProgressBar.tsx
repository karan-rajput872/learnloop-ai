import React from 'react';
import { useSmoothScroll } from '../context/SmoothScrollContext';

export const ScrollProgressBar: React.FC = () => {
  const { scrollProgress, isReducedMotion } = useSmoothScroll();

  if (isReducedMotion) return null;

  return (
    <div
      className="scroll-progress-bar"
      style={{ width: `${scrollProgress}%` }}
      role="progressbar"
      aria-valuenow={Math.round(scrollProgress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Reading progress"
    />
  );
};

