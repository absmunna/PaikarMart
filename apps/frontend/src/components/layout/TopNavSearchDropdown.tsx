import React from 'react';
import {
  Search,
  ShoppingBag,
  History,
  X,
  Trash2,
  TrendingUp,
  ArrowUpRight,
  Tag,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { CommerceItem } from '@/types';
import { SearchScope } from '@/components/shared/MegaSearch';
import { DEFAULT_PRODUCT_IMAGE_URL, safeMediaSrc } from '@/shared/utils';

export interface MatchingCategorySuggestion {
  name: string;
  count: number;
  type: string;
  score?: number;
}

interface TopNavSearchDropdownProps {
  isOpen: boolean;
  isBn: boolean;
  searchQuery: string;
  trimmedQuery: string;
  searchScope: SearchScope;
  activeOptionIndex: number;
  searchHistory: string[];
  popularCatalogCategories: MatchingCategorySuggestion[];
  matchingCategories: MatchingCategorySuggestion[];
  matchingProducts: CommerceItem[];
  trendingSearches: string[];
  customTopClass?: string;
  onClose: () => void;
  onChangeScope: (scope: SearchScope) => void;
  onOpenMegaSearch: () => void;
  onSetActiveOptionIndex: (index: number) => void;
  onSelectCategory: (categoryName: string, type?: string) => void;
  onSelectProduct: (product: CommerceItem) => void;
  onSelectSearch: (term: string) => void;
  onRemoveSearchTerm: (term: string, e: React.MouseEvent) => void;
  onClearAllHistory: (e: React.MouseEvent) => void;
}

const renderHighlightedMatch = (text: string, query: string) => {
  const cleanQuery = query.trim();
  if (!cleanQuery) return text;
  const lowerText = text.toLowerCase();
  const lowerQuery = cleanQuery.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);
  if (matchIndex === -1) return text;

  const before = text.slice(0, matchIndex);
  const matched = text.slice(matchIndex, matchIndex + cleanQuery.length);
  const after = text.slice(matchIndex + cleanQuery.length);
  return (
    <>
      {before}
      <mark className="bg-[var(--pm-accent-soft)] text-[var(--pm-accent)] font-black rounded px-0.5">
        {matched}
      </mark>
      {after}
    </>
  );
};

export const TopNavSearchDropdown: React.FC<TopNavSearchDropdownProps> = ({
  isOpen,
  isBn,
  searchQuery,
  trimmedQuery,
  searchScope,
  activeOptionIndex,
  searchHistory,
  popularCatalogCategories,
  matchingCategories,
  matchingProducts,
  trendingSearches,
  customTopClass,
  onClose,
  onChangeScope,
  onOpenMegaSearch,
  onSetActiveOptionIndex,
  onSelectCategory,
  onSelectProduct,
  onSelectSearch,
  onRemoveSearchTerm,
  onClearAllHistory,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Backdrop for Search Dropdown */}
      <div
        className="fixed inset-0 bg-black/40 z-40 sm:hidden animate-fadeIn"
        onClick={onClose}
      />
      <div
        className={`fixed left-3 right-3 ${customTopClass || 'top-16'} w-auto max-w-[calc(100vw-1.5rem)] sm:max-w-none mx-auto sm:mx-0 sm:absolute sm:inset-auto sm:left-0 sm:top-full sm:mt-2 sm:w-[420px] bg-[var(--pm-card)] text-[var(--pm-text)] border border-[var(--pm-border)] rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn`}
      >
        {/* Inline Scope Filter Bar: All | B2C | B2B + MegaSearch Launch */}
        <div className="px-3 py-2 bg-[var(--pm-surface)] border-b border-[var(--pm-border)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {(
              [
                { id: 'all', labelEn: 'All', labelBn: 'সব' },
                { id: 'b2c', labelEn: 'B2C', labelBn: 'খুচরা' },
                { id: 'b2b', labelEn: 'B2B', labelBn: 'পাইকারি' },
              ] as const
            ).map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => onChangeScope(sc.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  searchScope === sc.id
                    ? 'bg-[var(--pm-accent)] text-[var(--pm-accent-fg)]'
                    : 'bg-[var(--pm-card)] text-[var(--pm-muted)] hover:text-[var(--pm-text)] border border-[var(--pm-border)]'
                }`}
              >
                {isBn ? sc.labelBn : sc.labelEn}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onOpenMegaSearch}
            className="text-[10px] font-bold text-[var(--pm-accent)] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{isBn ? 'মেগা সার্চ ⌘K' : 'Full MegaSearch ⌘K'}</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {/* STATE A: User is typing -> Show Real-Time Product & Category Suggestions */}
        {trimmedQuery.length > 0 ? (
          <div id="top-navbar-autocomplete" role="listbox" aria-label="Product and category suggestions">
            <div className="px-4 py-2 bg-[var(--pm-surface)] border-b border-[var(--pm-border)] flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <Search className="w-3.5 h-3.5 text-[var(--pm-accent)] shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--pm-muted)] truncate">
                  {isBn ? `"${searchQuery}" এর জন্য সাজেশন` : `Suggestions for "${searchQuery}"`}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-[var(--pm-accent)] shrink-0">
                {matchingProducts.length + matchingCategories.length} {isBn ? 'টি' : 'found'}
              </span>
            </div>

            {matchingCategories.length > 0 && (
              <div className="p-3 border-b border-[var(--pm-border)]">
                <div className="px-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--pm-muted)] flex items-center gap-1.5">
                  <Tag className="w-3 h-3 text-[var(--pm-accent)]" />
                  <span>{isBn ? 'মিল থাকা ক্যাটাগরি' : 'Matching Categories'}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {matchingCategories.map((cat, idx) => {
                    const isActive = activeOptionIndex === idx;
                    return (
                      <button
                        key={cat.name}
                        id={`top-nav-option-${idx}`}
                        role="option"
                        aria-selected={isActive}
                        type="button"
                        onMouseEnter={() => onSetActiveOptionIndex(idx)}
                        onClick={() => onSelectCategory(cat.name, cat.type)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 border cursor-pointer ${
                          isActive
                            ? 'bg-[var(--pm-accent-soft)] text-[var(--pm-accent)] border-[var(--pm-accent)]'
                            : 'bg-[var(--pm-surface)] hover:bg-[var(--pm-accent-soft)] text-[var(--pm-text)] hover:text-[var(--pm-accent)] border-[var(--pm-border)]'
                        }`}
                      >
                        <span>{renderHighlightedMatch(cat.name, searchQuery)}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--pm-card)] text-[var(--pm-muted)] font-bold border border-[var(--pm-border)]">
                          {cat.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {matchingProducts.length > 0 ? (
              <div className="py-1 max-h-64 overflow-y-auto overscroll-contain divide-y divide-[var(--pm-border)]">
                <div className="px-3 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--pm-muted)] flex items-center gap-1.5">
                  <ShoppingBag className="w-3 h-3 text-[var(--pm-accent)]" />
                  <span>{isBn ? 'পণ্য ও সেবা' : 'Matching Products'}</span>
                </div>
                {matchingProducts.map((prod, idx) => {
                  const optionIdx = matchingCategories.length + idx;
                  const isActive = activeOptionIndex === optionIdx;
                  return (
                    <button
                      key={prod.id}
                      id={`top-nav-option-${optionIdx}`}
                      role="option"
                      aria-selected={isActive}
                      type="button"
                      onMouseEnter={() => onSetActiveOptionIndex(optionIdx)}
                      onClick={() => onSelectProduct(prod)}
                      className={`w-full px-3 py-2 flex items-center gap-3 text-left group cursor-pointer transition-colors ${
                        isActive ? 'bg-[var(--pm-card-hover)]' : 'hover:bg-[var(--pm-card-hover)]'
                      }`}
                    >
                      <img
                        src={safeMediaSrc(prod.imageUrl, DEFAULT_PRODUCT_IMAGE_URL)}
                        alt={prod.title}
                        loading="lazy"
                        decoding="async"
                        className="w-10 h-10 rounded-xl object-cover shrink-0 bg-[var(--pm-surface)] border border-[var(--pm-border)] group-hover:scale-105 transition-transform"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span
                            className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                              prod.type === 'wholesale'
                                ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/25'
                                : prod.type === 'service'
                                ? 'bg-amber-500/15 text-amber-500 border border-amber-500/25'
                                : prod.type === 'rides'
                                ? 'bg-sky-500/15 text-sky-500 border border-sky-500/25'
                                : 'bg-[var(--pm-accent-soft)] text-[var(--pm-accent)] border border-[var(--pm-accent-border)]'
                            }`}
                          >
                            {prod.type === 'wholesale' ? 'B2B' : prod.type}
                          </span>
                          <span className="text-[10px] text-[var(--pm-muted)] truncate">
                            {renderHighlightedMatch(prod.category, searchQuery)}
                          </span>
                        </div>
                        <p
                          className={`text-xs font-semibold truncate transition-colors ${
                            isActive
                              ? 'text-[var(--pm-accent)]'
                              : 'text-[var(--pm-text)] group-hover:text-[var(--pm-accent)]'
                          }`}
                        >
                          {renderHighlightedMatch(prod.title, searchQuery)}
                        </p>
                      </div>
                      <div className="text-right shrink-0 pl-1">
                        <span className="text-xs font-mono font-bold text-[var(--pm-text)]">
                          ৳{prod.price.toLocaleString()}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : matchingCategories.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <Search className="w-7 h-7 text-[var(--pm-muted)] mx-auto opacity-50" />
                <p className="text-xs font-semibold text-[var(--pm-text)]">
                  {isBn
                    ? `"${searchQuery}" এর জন্য সরাসরি পণ্য পাওয়া যায়নি`
                    : `No direct suggestions for "${searchQuery}"`}
                </p>
                <p className="text-[11px] text-[var(--pm-muted)]">
                  {isBn ? (
                    'পুরো অ্যাপে খুঁজতে Enter চাপুন'
                  ) : (
                    <>
                      Press{' '}
                      <kbd className="px-1.5 py-0.5 rounded-md bg-[var(--pm-surface)] text-[var(--pm-text)] font-mono text-[10px] border border-[var(--pm-border)]">
                        Enter
                      </kbd>{' '}
                      to search across the app
                    </>
                  )}
                </p>
              </div>
            ) : null}

            {/* Bottom Action Bar */}
            <div className="px-3 py-2 bg-[var(--pm-surface)] border-t border-[var(--pm-border)] flex items-center justify-between text-[11px] text-[var(--pm-muted)]">
              <span>{isBn ? 'Enter বা ↑↓ দিয়ে নির্বাচন করুন' : 'Use ↑↓ & Enter to select'}</span>
              <button
                type="button"
                onClick={() => onSelectSearch(searchQuery)}
                className="font-semibold text-[var(--pm-accent)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                {isBn ? 'সব ফলাফল দেখুন' : 'Search all'} <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          /* STATE B: Search Query is Empty -> Show Recent Searches & Popular Topics */
          <div>
            <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-[var(--pm-border)]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--pm-muted)] uppercase tracking-wider">
                <History className="w-3.5 h-3.5 text-[var(--pm-accent)]" />
                <span>{isBn ? 'সাম্প্রতিক সার্চ' : 'Recent Searches'}</span>
              </div>
              {searchHistory.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAllHistory}
                  className="text-[11px] font-semibold text-[var(--pm-muted)] hover:text-[var(--pm-danger)] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  {isBn ? 'মুছে ফেলুন' : 'Clear all'}
                </button>
              )}
            </div>

            {searchHistory.length > 0 ? (
              <div className="py-1 max-h-56 overflow-y-auto overscroll-contain divide-y divide-[var(--pm-border)]">
                {searchHistory.map((item, idx) => (
                  <div
                    key={`${item}-${idx}`}
                    className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-[var(--pm-card-hover)] group transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectSearch(item)}
                      className="flex-1 flex items-center gap-2.5 min-w-0 pr-2 py-0.5 text-left cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5 text-[var(--pm-muted)] shrink-0 group-hover:text-[var(--pm-accent)] transition-colors" />
                      <span className="text-xs sm:text-sm font-medium text-[var(--pm-text)] truncate group-hover:text-[var(--pm-accent)]">
                        {item}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => onRemoveSearchTerm(item, e)}
                      title="Remove from history"
                      aria-label={`Remove ${item} from search history`}
                      className="p-1.5 rounded-full text-[var(--pm-muted)] opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 hover:text-[var(--pm-text)] hover:bg-[var(--pm-surface)] transition-all cursor-pointer shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-[var(--pm-muted)] italic">
                {isBn ? 'কোনো সাম্প্রতিক সার্চ নেই' : 'No recent search history'}
              </div>
            )}

            {popularCatalogCategories.length > 0 && (
              <div className="p-3 border-t border-[var(--pm-border)] space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--pm-muted)] uppercase tracking-wider">
                  <Layers className="w-3 h-3 text-[var(--pm-accent)]" />
                  <span>{isBn ? 'ক্যাটালগ ক্যাটাগরি' : 'Browse Catalog Categories'}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {popularCatalogCategories.map((cat) => (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => onSelectCategory(cat.name, cat.type)}
                      className="px-2.5 py-1 rounded-full bg-[var(--pm-surface)] border border-[var(--pm-border)] text-[11px] font-medium text-[var(--pm-text)] hover:border-[var(--pm-accent)] hover:text-[var(--pm-accent)] flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>{cat.name}</span>
                      <span className="text-[10px] text-[var(--pm-muted)] font-mono">
                        {cat.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-[var(--pm-surface)] p-3 border-t border-[var(--pm-border)] space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--pm-muted)] uppercase tracking-wider">
                <TrendingUp className="w-3 h-3 text-[var(--pm-success)]" />
                <span>{isBn ? 'জনপ্রিয় সার্চ' : 'Popular Topics'}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {trendingSearches.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => onSelectSearch(topic)}
                    className="px-2.5 py-1 rounded-full bg-[var(--pm-card)] border border-[var(--pm-border)] text-[11px] font-medium text-[var(--pm-text)] hover:border-[var(--pm-accent)] hover:text-[var(--pm-accent)] flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                  >
                    <span>{topic}</span>
                    <ArrowUpRight className="w-2.5 h-2.5 opacity-60" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
