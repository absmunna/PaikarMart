import React from 'react';
import { MarketplaceMixedFeed } from '@/hubs/marketplace-hub/MarketplaceMixedFeed';

type MarketplaceHubProps = React.ComponentProps<typeof MarketplaceMixedFeed> & {
  catalogNotice?: string | null;
};

/**
 * Canonical Marketplace Hub shell.
 * Hosts the hub-level mixed feed inside `hubs/marketplace-hub/` and delegates
 * grouped child portals (`retail`, `wholesale`, `grocery`, `pharmacy`, `brand-shops`, `digital`)
 * from `portals/marketplaces/`.
 */
export const MarketplaceHub: React.FC<MarketplaceHubProps> = ({ catalogNotice, ...props }) => (
  <div data-hub-id="marketplace" data-feed-mode="mixed">
    {catalogNotice && (
      <div
        role="status"
        className="mx-auto my-3 max-w-5xl rounded-xl bg-[var(--pm-surface)] px-4 py-3 text-sm text-[var(--pm-muted)]"
      >
        {catalogNotice}
      </div>
    )}
    <MarketplaceMixedFeed {...props} />
  </div>
);
