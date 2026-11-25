import React, { useState } from 'react';
import { Clock, Search, TrendingUp, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const RECENT_SEARCH_STORAGE_KEY = 'pm_explore_recent_searches_v1';

const DEFAULT_RECENT_SEARCHES = [
  'Wholesale Electronics',
  'Dhaka to Chattogram Freight',
  'Organic Grocery Dhaka',
  'AC Servicing Technician',
];

const TRENDING_KEYWORDS = [
  { labelEn: 'Factory Direct Wholesale', labelBn: 'ফ্যাক্টরি ডাইরেক্ট পাইকারি', query: 'Wholesale' },
  { labelEn: 'Official Brand Warranty', labelBn: 'ব্র্যান্ড ওয়ারেন্টি শপ', query: 'Brand' },
  { labelEn: 'Rx Pharmacy Delivery', labelBn: 'ফার্মেসি ও ঔষধ', query: 'Pharmacy' },
  { labelEn: 'Buy-Box Best Deals', labelBn: 'সেরা ডিল ও অফার', query: 'iPhone' },
];

interface MegaSearchPanelProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onQuickSearch?: (keyword: string) => void;
  placeholder: string;
}

export const MegaSearchPanel: React.FC<MegaSearchPanelProps> = ({
  searchQuery,
  onSearchChange,
  onQuickSearch,
  placeholder,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_SEARCH_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_RECENT_SEARCHES;
    } catch {
      return DEFAULT_RECENT_SEARCHES;
    }
  });

  const recordSearchTerm = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    const next = [clean, ...recentSearches.filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
    setRecentSearches(next);
    try {
      localStorage.setItem(RECENT_SEARCH_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage warnings
    }
  };

  const applyKeyword = (term: string) => {
    onSearchChange(term);
    recordSearchTerm(term);
    onQuickSearch?.(term);
    setIsFocused(false);
  };

  const clearRecent = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCH_STORAGE_KEY);
    } catch {
      // Ignore storage warnings
    }
  };

  return (
    <div className="space-y-2.5 flex-1">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--pm-muted)]" />
        <input
          type="text"
          value={searchQuery}
          onFocus={() => setIsFocused(true)}
          onBlur={() => window.setTimeout(() => setIsFocused(false), 180)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && searchQuery.trim()) {
              recordSearchTerm(searchQuery);
              onQuickSearch?.(searchQuery.trim());
            }
          }}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-9 py-2.5 bg-[var(--pm-card)] border border-[var(--pm-border)] rounded-xl text-sm text-[var(--pm-text)] placeholder:text-[var(--pm-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pm-accent)]/50 shadow-xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--pm-muted)] hover:text-[var(--pm-text)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {isFocused && recentSearches.length > 0 && (
          <div className="absolute z-30 left-0 right-0 mt-1.5 rounded-2xl bg-[var(--pm-card)] border border-[var(--pm-border)] shadow-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-[var(--pm-muted)] px-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {isBn ? 'সাম্প্রতিক সার্চ' : 'Recent Searches'}
              </span>
              <button type="button" onClick={clearRecent} className="hover:text-[var(--pm-text)] cursor-pointer">
                {isBn ? 'মুছুন' : 'Clear'}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {recentSearches.map((term) => (
                <button
                  key={term}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyKeyword(term);
                  }}
                  className="text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--pm-surface)] text-xs font-semibold text-[var(--pm-text)] truncate cursor-pointer"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--pm-muted)] shrink-0">
          <TrendingUp className="w-3.5 h-3.5 text-[var(--pm-accent)]" />
          {isBn ? 'ট্রেন্ডিং:' : 'Trending:'}
        </span>
        {TRENDING_KEYWORDS.map((item) => (
          <button
            key={item.query}
            type="button"
            onClick={() => applyKeyword(item.query)}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-[var(--pm-surface)] border border-[var(--pm-border)] hover:border-[var(--pm-accent)] text-[11px] font-semibold text-[var(--pm-text)] transition-colors cursor-pointer"
          >
            {isBn ? item.labelBn : item.labelEn}
          </button>
        ))}
      </div>
    </div>
  );
};
