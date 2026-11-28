import React from 'react';

export const PortalSkeleton = () => (
  <div className="space-y-6 animate-pulse p-4">
    <div className="h-48 bg-[var(--pm-surface)] border border-[var(--pm-border)] rounded-3xl w-full" />
    <div className="flex gap-2 overflow-x-auto pb-2">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-10 bg-[var(--pm-surface)] border border-[var(--pm-border)] rounded-2xl w-24 shrink-0" />
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="space-y-3">
          <div className="aspect-4/3 bg-[var(--pm-surface)] border border-[var(--pm-border)] rounded-3xl w-full" />
          <div className="h-4 bg-[var(--pm-surface)] rounded-lg w-3/4" />
          <div className="h-4 bg-[var(--pm-surface)] rounded-lg w-1/2" />
        </div>
      ))}
    </div>
  </div>
);

export const FeedSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="flex gap-3 overflow-x-auto pb-2">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="w-28 sm:w-32 h-44 sm:h-48 bg-[var(--pm-surface)] border border-[var(--pm-border)] rounded-3xl shrink-0" />
      ))}
    </div>
    <div className="h-32 bg-[var(--pm-surface)] border border-[var(--pm-border)] rounded-3xl w-full" />
    {[1, 2].map(i => (
      <div key={i} className="bg-[var(--pm-card)] rounded-3xl p-5 space-y-4 border border-[var(--pm-border)]">
        <div className="flex gap-3">
          <div className="w-10 h-10 bg-[var(--pm-surface)] rounded-full" />
          <div className="space-y-2 flex-1">
            <div className="h-3 bg-[var(--pm-surface)] rounded-lg w-1/4" />
            <div className="h-3 bg-[var(--pm-surface)] rounded-lg w-1/6" />
          </div>
        </div>
        <div className="h-20 bg-[var(--pm-surface)] rounded-2xl w-full" />
      </div>
    ))}
  </div>
);

export const ProductDetailsSkeleton = () => (
  <div className="max-w-5xl mx-auto space-y-6 pb-28 animate-pulse px-2 sm:px-4 mt-4">
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-[var(--pm-surface)] rounded-full" />
        <div className="space-y-2">
          <div className="h-4 bg-[var(--pm-surface)] rounded-lg w-32" />
          <div className="h-3 bg-[var(--pm-surface)] rounded-lg w-16" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="w-8 h-8 bg-[var(--pm-surface)] rounded-xl" />
        <div className="w-8 h-8 bg-[var(--pm-surface)] rounded-xl" />
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      <div className="lg:col-span-7 space-y-5">
        <div className="aspect-[4/3] sm:aspect-square bg-[var(--pm-surface)] border border-[var(--pm-border)] rounded-[2rem] w-full" />
        <div className="flex gap-3 overflow-x-auto pb-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-14 h-14 bg-[var(--pm-surface)] rounded-xl shrink-0" />
          ))}
        </div>
        <div className="flex gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 bg-[var(--pm-surface)] rounded-full w-24" />
          ))}
        </div>
        <div className="bg-[var(--pm-card)] border border-[var(--pm-border)] rounded-[2rem] h-64 w-full" />
      </div>
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-[var(--pm-card)] border border-[var(--pm-border)] rounded-[2rem] p-6 space-y-4 shadow-sm">
          <div className="h-8 bg-[var(--pm-surface)] rounded-lg w-1/2" />
          <div className="h-4 bg-[var(--pm-surface)] rounded-lg w-full" />
          <div className="space-y-2 pt-4">
            <div className="h-10 bg-[var(--pm-surface)] rounded-xl w-full" />
            <div className="h-10 bg-[var(--pm-surface)] rounded-xl w-full" />
          </div>
          <div className="h-14 bg-[var(--pm-surface)] rounded-2xl w-full mt-6" />
        </div>
      </div>
    </div>
  </div>
);

interface MarketplaceCardSkeletonProps {
  variant?: 'retail' | 'wholesale';
}

export const MarketplaceCardSkeleton: React.FC<MarketplaceCardSkeletonProps> = ({
  variant = 'retail',
}) => {
  if (variant === 'wholesale') {
    return (
      <div
        aria-hidden="true"
        className="bg-[var(--pm-card)] rounded-2xl border border-[var(--pm-border)] overflow-hidden flex flex-col animate-pulse shadow-xs"
      >
        <div className="relative aspect-4/3 bg-[var(--pm-surface)]">
          <div className="absolute top-2.5 left-2.5 h-6 w-28 rounded-lg bg-[var(--pm-card)]/70 border border-[var(--pm-border)]" />
          <div className="absolute top-2.5 right-2.5 h-6 w-20 rounded-lg bg-[var(--pm-card)]/70 border border-[var(--pm-border)]" />
          <div className="absolute bottom-2.5 right-2.5 h-6 w-24 rounded-lg bg-[var(--pm-card)]/70 border border-[var(--pm-border)]" />
        </div>
        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="h-3 w-2/3 rounded-md bg-[var(--pm-surface)]" />
            <div className="h-4 w-5/6 rounded-md bg-[var(--pm-surface)]" />
            <div className="h-3 w-full rounded-md bg-[var(--pm-surface)]" />
            <div className="h-3 w-4/5 rounded-md bg-[var(--pm-surface)]" />
          </div>
          <div className="pt-2 border-t border-[var(--pm-border)] space-y-3">
            <div className="flex items-end justify-between">
              <div className="space-y-1.5">
                <div className="h-2.5 w-20 rounded bg-[var(--pm-surface)]" />
                <div className="h-5 w-24 rounded-md bg-[var(--pm-surface)]" />
              </div>
              <div className="h-4 w-20 rounded-md bg-[var(--pm-surface)]" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="h-9 rounded-xl bg-[var(--pm-surface)]" />
              <div className="h-9 rounded-xl bg-[var(--pm-surface)]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="p-2.5 rounded-[2rem] bg-[var(--pm-card)] border border-[var(--pm-border)] flex flex-col justify-between space-y-2.5 animate-pulse"
    >
      <div className="space-y-2.5">
        <div className="relative aspect-[4/3] rounded-[1.5rem] bg-[var(--pm-surface)] overflow-hidden">
          <div className="absolute top-2 left-2 h-4 w-14 rounded-full bg-[var(--pm-card)]/80 border border-[var(--pm-border)]" />
          <div className="absolute bottom-2 right-2 h-4 w-10 rounded-full bg-[var(--pm-card)]/80 border border-[var(--pm-border)]" />
        </div>
        <div className="space-y-2 px-0.5">
          <div className="flex items-center justify-between gap-2">
            <div className="h-3 w-28 rounded-md bg-[var(--pm-surface)]" />
            <div className="h-2.5 w-12 rounded-md bg-[var(--pm-surface)]" />
          </div>
          <div className="h-4 w-5/6 rounded-md bg-[var(--pm-surface)]" />
          <div className="space-y-1.5">
            <div className="h-2.5 w-full rounded bg-[var(--pm-surface)]" />
            <div className="h-2.5 w-3/4 rounded bg-[var(--pm-surface)]" />
          </div>
          <div className="flex items-center justify-between pt-0.5">
            <div className="h-2.5 w-16 rounded bg-[var(--pm-surface)]" />
            <div className="h-2.5 w-14 rounded bg-[var(--pm-surface)]" />
          </div>
        </div>
      </div>

      <div className="space-y-2.5 pt-2.5 border-t border-[var(--pm-border)] px-0.5">
        <div className="flex items-end justify-between">
          <div className="space-y-1.5">
            <div className="h-2 w-10 rounded bg-[var(--pm-surface)]" />
            <div className="h-5 w-20 rounded-md bg-[var(--pm-surface)]" />
          </div>
          <div className="h-7 w-20 rounded-xl bg-[var(--pm-surface)]" />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="h-8 rounded-xl bg-[var(--pm-surface)]" />
          <div className="h-8 rounded-xl bg-[var(--pm-surface)]" />
        </div>
      </div>
    </div>
  );
};

interface MarketplaceGridSkeletonProps {
  count?: number;
  variant?: 'retail' | 'wholesale';
}

export const MarketplaceGridSkeleton: React.FC<MarketplaceGridSkeletonProps> = ({
  count = 6,
  variant = 'retail',
}) => (
  <div
    role="status"
    aria-busy="true"
    aria-label="Loading marketplace catalog"
    className={
      variant === 'wholesale'
        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'
        : 'grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4'
    }
  >
    <span className="sr-only">Loading marketplace catalog...</span>
    {Array.from({ length: count }).map((_, index) => (
      <MarketplaceCardSkeleton key={index} variant={variant} />
    ))}
  </div>
);

interface SocialPostSkeletonProps {
  showMedia?: boolean;
}

export const SocialPostSkeleton: React.FC<SocialPostSkeletonProps> = ({
  showMedia = true,
}) => (
  <article
    aria-hidden="true"
    className="bg-[var(--pm-card)] border border-[var(--pm-border)] rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-6 shadow-sm space-y-4 animate-pulse"
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-11 h-11 rounded-full bg-[var(--pm-surface)] shrink-0" />
        <div className="space-y-2 flex-1 max-w-[220px]">
          <div className="h-3.5 w-3/4 rounded-md bg-[var(--pm-surface)]" />
          <div className="h-2.5 w-1/2 rounded-md bg-[var(--pm-surface)]" />
        </div>
      </div>
      <div className="h-7 w-16 rounded-full bg-[var(--pm-surface)] shrink-0" />
    </div>

    <div className="space-y-2 px-1">
      <div className="h-3.5 w-full rounded-md bg-[var(--pm-surface)]" />
      <div className="h-3.5 w-11/12 rounded-md bg-[var(--pm-surface)]" />
      <div className="h-3.5 w-2/3 rounded-md bg-[var(--pm-surface)]" />
    </div>

    {showMedia && (
      <div className="aspect-[16/9] rounded-2xl sm:rounded-[1.5rem] bg-[var(--pm-surface)] border border-[var(--pm-border)]" />
    )}

    <div className="flex items-center justify-between pt-1">
      <div className="h-3 w-24 rounded bg-[var(--pm-surface)]" />
      <div className="h-3 w-28 rounded bg-[var(--pm-surface)]" />
    </div>

    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--pm-border)]">
      <div className="h-9 rounded-xl bg-[var(--pm-surface)]" />
      <div className="h-9 rounded-xl bg-[var(--pm-surface)]" />
      <div className="h-9 rounded-xl bg-[var(--pm-surface)]" />
    </div>
  </article>
);

interface SocialFeedListSkeletonProps {
  count?: number;
}

export const SocialFeedListSkeleton: React.FC<SocialFeedListSkeletonProps> = ({
  count = 3,
}) => (
  <div
    role="status"
    aria-busy="true"
    aria-label="Loading community feed posts"
    className="space-y-4 sm:space-y-6"
  >
    <span className="sr-only">Loading community feed posts...</span>
    {Array.from({ length: count }).map((_, index) => (
      <SocialPostSkeleton key={index} showMedia={index % 2 === 0} />
    ))}
  </div>
);

export const HubDirectorySkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse p-4 max-w-7xl mx-auto">
    <div className="h-36 bg-[var(--pm-surface)] rounded-3xl w-full border border-[var(--pm-border)]" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="h-44 bg-[var(--pm-surface)] rounded-3xl border border-[var(--pm-border)]" />
      ))}
    </div>
  </div>
);

export const NotificationsListSkeleton: React.FC = () => (
  <div className="space-y-3 animate-pulse p-4 max-w-3xl mx-auto">
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="h-20 bg-[var(--pm-surface)] rounded-2xl border border-[var(--pm-border)] w-full" />
    ))}
  </div>
);

export const OrdersListSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse p-4 max-w-4xl mx-auto">
    {[1, 2, 3].map(i => (
      <div key={i} className="h-32 bg-[var(--pm-surface)] rounded-3xl border border-[var(--pm-border)] w-full" />
    ))}
  </div>
);

export const ProfileViewSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse p-4 max-w-4xl mx-auto">
    <div className="h-48 bg-[var(--pm-surface)] rounded-3xl w-full border border-[var(--pm-border)]" />
    <div className="h-64 bg-[var(--pm-surface)] rounded-3xl w-full border border-[var(--pm-border)]" />
  </div>
);

export const RouteCenterSkeleton: React.FC<{ pathname?: string; currentTab?: string }> = () => (
  <div className="space-y-6 animate-pulse p-6 max-w-7xl mx-auto">
    <div className="h-20 bg-[var(--pm-surface)] rounded-2xl w-full border border-[var(--pm-border)]" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="h-64 bg-[var(--pm-surface)] rounded-3xl border border-[var(--pm-border)] md:col-span-2" />
      <div className="h-64 bg-[var(--pm-surface)] rounded-3xl border border-[var(--pm-border)]" />
    </div>
  </div>
);

export const WalletViewSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse p-4 max-w-3xl mx-auto">
    <div className="h-44 bg-[var(--pm-surface)] rounded-3xl w-full border border-[var(--pm-border)]" />
    <div className="h-56 bg-[var(--pm-surface)] rounded-3xl w-full border border-[var(--pm-border)]" />
  </div>
);


