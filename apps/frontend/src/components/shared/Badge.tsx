import React from 'react';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
export type BadgeSize = 'xs' | 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: BadgeSize;
}

const toneClasses: Record<BadgeTone, string> = {
  neutral:
    'border-[var(--pm-border)] bg-[var(--pm-surface)] text-[var(--pm-muted)]',
  accent:
    'border-[var(--pm-accent-border)] bg-[var(--pm-accent-soft)] text-[var(--pm-accent)]',
  success:
    'border-[var(--pm-success)]/20 bg-[var(--pm-success-soft)] text-[var(--pm-success)]',
  warning: 'border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400',
  danger: 'border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

const sizeClasses: Record<BadgeSize, string> = {
  xs: 'px-2 py-0.5 text-[9px]',
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-3 py-1 text-[10px]',
};

export const Badge: React.FC<BadgeProps> = ({
  tone = 'neutral',
  size = 'sm',
  className = '',
  ...props
}) => (
  <span
    {...props}
    className={`inline-flex items-center gap-1 rounded-full border font-semibold leading-none ${toneClasses[tone]} ${sizeClasses[size]} ${className}`}
  />
);
