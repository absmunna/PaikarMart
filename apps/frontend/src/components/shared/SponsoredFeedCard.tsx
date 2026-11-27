import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { ContentCard } from '@/components/shared/CardPrimitives';

interface SponsoredFeedCardProps {
  label: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
}

export const SponsoredFeedCard: React.FC<SponsoredFeedCardProps> = ({
  label,
  children,
  onDismiss,
  dismissLabel = 'Dismiss sponsored post',
  className = '',
}) => (
  <ContentCard
    aria-label={`Sponsored by PaikarMart: ${label}`}
    className={`p-4 sm:p-6 space-y-3 sm:space-y-4 transition-shadow duration-300 hover:shadow-md premium-shadow ${className}`}
  >
    <header className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--pm-accent-soft)] text-[var(--pm-accent)] ring-2 ring-[var(--pm-border)]">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[var(--pm-text)]">PaikarMart</p>
          <p className="truncate text-[11px] font-medium text-[var(--pm-muted)]">
            {label}
          </p>
        </div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--pm-muted)] transition-colors hover:bg-[var(--pm-surface)] hover:text-[var(--pm-text)] cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </header>
    <div className="space-y-3 sm:space-y-4">{children}</div>
  </ContentCard>
);
