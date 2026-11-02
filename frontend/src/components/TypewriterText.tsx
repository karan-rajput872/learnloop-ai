import React, { useState, useEffect } from 'react';

interface TypewriterTextProps {
  phrases: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
  className?: string;
  cursorClassName?: string;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  phrases,
  typingSpeed = 70,
  deletingSpeed = 40,
  pauseDuration = 2200,
  className = '',
  cursorClassName = ''
}) => {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
    }
  }, []);

  const currentPhrase = phrases[phraseIndex] || '';

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayText(currentPhrase);
      return;
    }

    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting) {
      if (displayText.length < currentPhrase.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentPhrase.substring(0, displayText.length + 1));
        }, typingSpeed);
      } else {
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, pauseDuration);
      }
    } else {
      if (displayText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayText(currentPhrase.substring(0, displayText.length - 1));
        }, deletingSpeed);
      } else {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, currentPhrase, phraseIndex, phrases.length, typingSpeed, deletingSpeed, pauseDuration, prefersReducedMotion]);

  if (prefersReducedMotion) {
    return <span className={className}>{currentPhrase}</span>;
  }

  return (
    <span className={className}>
      <span className="sr-only">{currentPhrase}</span>
      <span aria-hidden="true">
        {displayText}
        <span className={`typewriter-cursor ${cursorClassName}`} />
      </span>
    </span>
  );
};
