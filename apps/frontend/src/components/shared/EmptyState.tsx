import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) => (
  <div
    className={`px-6 py-10 text-center rounded-3xl bg-[var(--pm-card)] border border-[var(--pm-border)] space-y-3 ${className}`}
  >
    <div className="w-12 h-12 rounded-2xl bg-[var(--pm-surface)] text-[var(--pm-muted)] flex items-center justify-center mx-auto">
      <Icon aria-hidden="true" className="w-6 h-6" />
    </div>
    <h4 className="text-sm font-bold text-[var(--pm-text)]">{title}</h4>
    {description && (
      <p className="text-xs text-[var(--pm-muted)] max-w-sm mx-auto">{description}</p>
    )}
    {action}
  </div>
);
