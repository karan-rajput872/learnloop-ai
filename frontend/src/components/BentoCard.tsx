import React from 'react';

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'standard' | 'wide' | 'tall' | 'hero' | 'compact';
  glowBorder?: 'none' | 'teal' | 'indigo' | 'purple' | 'amber';
  interactive?: boolean;
  onClick?: () => void;
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}

export const BentoCard: React.FC<BentoCardProps> = ({
  children,
  className = '',
  variant = 'standard',
  glowBorder = 'none',
  interactive = false,
  onClick,
  title,
  subtitle,
  badge,
  action
}) => {
  const variantClasses = {
    standard: 'col-span-1',
    wide: 'col-span-1 md:col-span-2',
    tall: 'col-span-1 md:row-span-2',
    hero: 'col-span-1 md:col-span-2 lg:col-span-2',
    compact: 'col-span-1'
  }[variant];

  const glowBorderClasses = {
    none: 'border-[#E6E9EF] dark:border-white/10',
    teal: 'border-[#38B7A5]/50 dark:border-[#38B7A5]/60 hover:shadow-glowTeal',
    indigo: 'border-[#5B5CE2]/40 dark:border-[#5B5CE2]/50 hover:shadow-glowIndigo',
    purple: 'border-purple-300 dark:border-purple-500/40',
    amber: 'border-amber-300 dark:border-amber-500/40'
  }[glowBorder];

  const interactiveClasses = interactive
    ? 'cursor-pointer bento-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B5CE2]'
    : '';

  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
      className={`bento-card p-5 sm:p-6 flex flex-col justify-between overflow-hidden ${variantClasses} ${glowBorderClasses} ${interactiveClasses} ${className}`}
    >
      {(title || badge || action) && (
        <div className="flex items-start justify-between gap-3 mb-4 shrink-0">
          <div className="space-y-1 min-w-0">
            {badge && <div className="mb-2">{badge}</div>}
            {title && (
              <h3 className="text-sm sm:text-base font-bold font-heading text-[#172033] dark:text-white truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-[#667085] dark:text-slate-400 font-sans line-clamp-1">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
};

