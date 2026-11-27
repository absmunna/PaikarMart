import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface ContentCardProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export const ContentCard: React.FC<ContentCardProps> = ({
  children,
  className = '',
  ...props
}) => (
  <article
    {...props}
    className={`overflow-hidden rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-card)] text-[var(--pm-text)] shadow-xs ${className}`}
  >
    {children}
  </article>
);

interface ContentCardMediaProps {
  children: React.ReactNode;
  className?: string;
}

export const ContentCardMedia: React.FC<ContentCardMediaProps> = ({
  children,
  className = '',
}) => (
  <div className={`relative overflow-hidden bg-[var(--pm-surface)] ${className}`}>
    {children}
  </div>
);

interface CardActionBarProps {
  children: React.ReactNode;
  label: string;
  className?: string;
}

export const CardActionBar: React.FC<CardActionBarProps> = ({
  children,
  label,
  className = '',
}) => (
  <div
    role="group"
    aria-label={label}
    className={`relative flex items-center gap-1 border-t border-[var(--pm-border)] px-2 py-1 ${className}`}
  >
    {children}
  </div>
);

interface CardActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  onMouseEnter?: React.MouseEventHandler<HTMLButtonElement>;
  active?: boolean;
  activeTone?: 'accent' | 'danger';
  count?: number;
  className?: string;
}

export const CardActionButton: React.FC<CardActionButtonProps> = ({
  icon: Icon,
  label,
  onClick,
  onMouseEnter,
  active,
  activeTone = 'accent',
  count,
  className = '',
}) => {
  const activeClasses = active
    ? activeTone === 'danger'
      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
      : 'bg-[var(--pm-accent-soft)] text-[var(--pm-accent)]'
    : 'text-[var(--pm-muted)] hover:bg-[var(--pm-surface)] hover:text-[var(--pm-text)]';

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      aria-label={label}
      title={label}
      {...(active === undefined ? {} : { 'aria-pressed': active })}
      className={`flex min-h-11 min-w-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pm-accent)] ${activeClasses} ${className}`}
    >
      <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
      {typeof count === 'number' && (
        <span className="text-[11px] font-semibold tabular-nums">{count.toLocaleString()}</span>
      )}
    </button>
  );
};
