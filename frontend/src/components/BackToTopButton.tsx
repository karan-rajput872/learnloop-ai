import React from 'react';
import { ChevronUp } from 'lucide-react';
import { useSmoothScroll } from '../context/SmoothScrollContext';

export const BackToTopButton: React.FC = () => {
  const { showBackToTop, scrollToTop } = useSmoothScroll();

  return (
    <button
      onClick={() => scrollToTop(1.2)}
      className={`back-to-top-btn ${showBackToTop ? 'visible' : ''}`}
      aria-label="Back to top of page"
      title="Scroll smoothly back to top"
      type="button"
    >
      <ChevronUp className="w-5 h-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
    </button>
  );
};

