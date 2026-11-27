import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Cloud, Search, Wallet, X } from 'lucide-react';
import type { PortalTab, User } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { HUB_PILLARS, SUPER_PORTALS, type HubPillarId, type SuperPortalEntry } from '@/data/portalsData';
import { fetchWalletStateApi } from '@/features/wallet';

interface ExplorePortalProps {
  currentUser: User;
  onSelectTab: (tab: PortalTab) => void;
  onOpenWallet: () => void;
  onOpenCloudGuide: () => void;
  onQuickSearch?: (keyword: string) => void;
}

const PILLAR_LABELS: Record<HubPillarId, { en: string; bn: string }> = {
  'commerce-hub': { en: 'Shopping', bn: 'কেনাকাটা' },
  'services-logistics-hub': { en: 'Services', bn: 'সার্ভিস' },
  'community-content-hub': { en: 'Community', bn: 'কমিউনিটি' },
  'utility-pro-hub': { en: 'Tools', bn: 'টুলস' },
};

export const ExplorePortal: React.FC<ExplorePortalProps> = ({
  currentUser,
  onSelectTab,
  onOpenWallet,
  onOpenCloudGuide,
  onQuickSearch,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPillar, setSelectedPillar] = useState<HubPillarId>('commerce-hub');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletBalanceUnavailable, setWalletBalanceUnavailable] = useState(false);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const isSearching = normalizedQuery.length > 0;

  useEffect(() => {
    let active = true;
    setWalletBalance(null);
    setWalletBalanceUnavailable(false);

    void fetchWalletStateApi(currentUser.id || 'user_me')
      .then((data) => {
        if (!active) return;
        if (!data.persistenceReady || data.source !== 'supabase' || !Number.isFinite(data.wallet.balance)) {
          setWalletBalanceUnavailable(true);
          return;
        }
        setWalletBalance(data.wallet.balance);
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error('Failed to load Explore wallet balance.', error);
        setWalletBalanceUnavailable(true);
      });

    return () => {
      active = false;
    };
  }, [currentUser.id]);

  const filteredPortals = useMemo(
    () =>
      SUPER_PORTALS.filter((portal) => {
        if (!isSearching && portal.hubId !== selectedPillar) return false;
        if (!isSearching) return true;

        const searchableText = `${portal.nameEn} ${portal.nameBn} ${portal.realWorldModel}`.toLowerCase();
        return searchableText.includes(normalizedQuery);
      }),
    [isSearching, normalizedQuery, selectedPillar]
  );

  const selectedPillarMeta = HUB_PILLARS.find((pillar) => pillar.id === selectedPillar) ?? HUB_PILLARS[0];
  const selectedPillarLabel = PILLAR_LABELS[selectedPillar];

  const handleLaunchPortal = (portal: SuperPortalEntry) => {
    if (portal.searchHint && onQuickSearch) {
      onQuickSearch(portal.searchHint);
    }
    onSelectTab(portal.targetTab);
  };

  return (
    <div className="px-1 pb-20 text-[var(--pm-text)] sm:px-2">
      <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {isBn ? 'এক্সপ্লোর' : 'Explore'}
          </h1>
          <p className="text-sm text-[var(--pm-muted)]">
            {isBn
              ? 'দোকান, সার্ভিস ও দরকারি টুল এক জায়গায় খুঁজে নিন।'
              : 'Find shops, services and useful tools across PaikarMart.'}
          </p>
        </header>

        <section
          aria-label={isBn ? 'ওয়ালেট ব্যালেন্স' : 'Wallet balance'}
          className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-card)] p-4"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--pm-brand-gold-soft)] text-[var(--pm-brand-gold)]">
              <Wallet className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--pm-muted)]">
                {isBn ? 'ওয়ালেট ব্যালেন্স' : 'Wallet balance'}
              </p>
              <p
                aria-live="polite"
                className={`font-bold tracking-tight ${
                  walletBalanceUnavailable || walletBalance === null
                    ? 'text-xs text-[var(--pm-muted)]'
                    : 'truncate text-2xl'
                }`}
              >
                {walletBalanceUnavailable
                  ? isBn ? 'পাওয়া যাচ্ছে না' : 'Unavailable'
                  : walletBalance === null
                    ? isBn ? 'লোড হচ্ছে…' : 'Loading…'
                    : `৳${walletBalance.toLocaleString(isBn ? 'bn-BD' : 'en-BD')}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenWallet}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-[var(--pm-accent-soft)] px-3 text-xs font-bold text-[var(--pm-accent)] transition-colors hover:bg-[var(--pm-accent)] hover:text-[var(--pm-accent-fg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pm-accent)]"
          >
            <span>{isBn ? 'ওয়ালেট খুলুন' : 'Open wallet'}</span>
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </section>

        <div className="flex min-h-12 items-center gap-2 rounded-xl border border-[var(--pm-border)] bg-[var(--pm-card)] px-3">
          <Search className="h-4 w-4 shrink-0 text-[var(--pm-muted)]" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            aria-label={isBn ? 'সব পোর্টাল খুঁজুন' : 'Search all portals'}
            placeholder={isBn ? 'দোকান বা পোর্টাল খুঁজুন' : 'Search shops and portals'}
            className="min-w-0 flex-1 bg-transparent py-2 text-sm text-[var(--pm-text)] outline-none placeholder:text-[var(--pm-muted)]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label={isBn ? 'সার্চ মুছুন' : 'Clear search'}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--pm-muted)] hover:bg-[var(--pm-surface)] hover:text-[var(--pm-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pm-accent)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <section aria-label={isBn ? 'ক্যাটাগরি' : 'Categories'} className="space-y-2">
          <h2 className="text-sm font-bold">
            {isBn ? 'ক্যাটাগরি অনুযায়ী দেখুন' : 'Browse by category'}
          </h2>
          <div className="grid grid-cols-4 gap-1.5">
            {HUB_PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              const isSelected = !isSearching && selectedPillar === pillar.id;
              const label = PILLAR_LABELS[pillar.id];

              return (
                <button
                  key={pillar.id}
                  type="button"
                  onClick={() => {
                    setSelectedPillar(pillar.id);
                    setSearchQuery('');
                  }}
                  aria-pressed={isSelected}
                  className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-1 text-[10px] font-semibold leading-tight transition-colors ${
                    isSelected
                      ? 'border-[var(--pm-accent-border)] bg-[var(--pm-accent-soft)] text-[var(--pm-accent)]'
                      : 'border-[var(--pm-border)] bg-[var(--pm-card)] text-[var(--pm-muted)] hover:text-[var(--pm-text)]'
                  } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pm-accent)]`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="max-w-full truncate">{isBn ? label.bn : label.en}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="explore-portals-title" className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="explore-portals-title" className="text-lg font-bold tracking-tight">
                {isSearching
                  ? isBn ? 'সার্চ ফলাফল' : 'Search results'
                  : isBn ? selectedPillarLabel.bn : selectedPillarLabel.en}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--pm-muted)]">
                {isSearching
                  ? isBn ? 'সব ক্যাটাগরির মিল পাওয়া পোর্টাল' : 'Matches across all categories'
                  : isBn
                    ? selectedPillarMeta.descriptionBn
                    : selectedPillarMeta.descriptionEn}
              </p>
            </div>
            <span
              aria-live="polite"
              className="shrink-0 rounded-lg bg-[var(--pm-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--pm-muted)]"
            >
              {filteredPortals.length}
            </span>
          </div>

          {filteredPortals.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
              {filteredPortals.map((portal) => {
                const Icon = portal.icon;
                return (
                  <button
                    key={portal.id}
                    type="button"
                    onClick={() => handleLaunchPortal(portal)}
                    className="group flex min-h-32 flex-col items-start rounded-xl border border-[var(--pm-border)] bg-[var(--pm-card)] p-3 text-left transition-colors hover:border-[var(--pm-accent-border)] hover:bg-[var(--pm-card-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pm-accent)]"
                  >
                    <span className="flex w-full items-start justify-between">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${portal.color} text-white`}>
                        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-[var(--pm-muted)] transition-colors group-hover:text-[var(--pm-accent)]" aria-hidden="true" />
                    </span>
                    <span className="mt-3 line-clamp-2 text-sm font-bold leading-snug">
                      {isBn ? portal.nameBn : portal.nameEn}
                    </span>
                    <span className="mt-1 line-clamp-1 text-[11px] text-[var(--pm-muted)]">
                      {portal.realWorldModel}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--pm-border)] bg-[var(--pm-card)] px-4 py-8 text-center">
              <p className="text-sm font-semibold">
                {isBn ? 'কোনো পোর্টাল পাওয়া যায়নি' : 'No portals found'}
              </p>
              <p className="mt-1 text-xs text-[var(--pm-muted)]">
                {isBn ? 'অন্য শব্দ দিয়ে খুঁজে দেখুন।' : 'Try a different search.'}
              </p>
            </div>
          )}

          {!isSearching && selectedPillar === 'utility-pro-hub' && (
            <button
              type="button"
              onClick={onOpenCloudGuide}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-[var(--pm-border)] bg-[var(--pm-card)] px-3 text-left transition-colors hover:border-[var(--pm-accent-border)] hover:bg-[var(--pm-card-hover)]"
            >
              <Cloud className="h-5 w-5 text-[var(--pm-accent)]" aria-hidden="true" />
              <span className="flex-1">
                <span className="block text-sm font-semibold">
                  {isBn ? 'ক্লাউড আর্কিটেকচার গাইড' : 'Cloud architecture guide'}
                </span>
                <span className="block text-xs text-[var(--pm-muted)]">
                  {isBn ? 'সার্ভার ও ডেটাবেস সেটআপ' : 'Server and database setup'}
                </span>
              </span>
              <ArrowUpRight className="h-4 w-4 text-[var(--pm-muted)]" aria-hidden="true" />
            </button>
          )}
        </section>
      </div>
    </div>
  );
};
