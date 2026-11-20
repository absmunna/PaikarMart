import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  ShoppingCart, 
  Store, 
  Grid, 
  Cloud, 
  Sun, 
  Moon, 
  UtensilsCrossed, 
  Car, 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert,
  CheckCircle2,
  ShoppingBag,
  Menu,
  Wallet,
  Bell,
  MessageSquare,
  MapPin,
  History,
  X,
  Trash2,
  TrendingUp,
  ArrowUpRight,
  Tag,
  Layers,
  ArrowRight,
  Bot,
  LogIn,
  Settings as SettingsIcon,
  Command,
  Heart
} from 'lucide-react';
import { PortalTab, User, CommerceItem, SocialPost } from '@/types';
import { TopNavLocationMenu } from '@/components/layout/TopNavLocationMenu';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/features/auth';
import { useWishlist } from '@/features/marketplace/hooks/useWishlist';
import { AiAssistantDrawer } from '@/features/ai';
import { MegaSearch, SearchScope } from '@/components/shared/MegaSearch';

const SEARCH_HISTORY_STORAGE_KEY = 'paikarmart_search_history_v1';
const DEFAULT_TRENDING_SEARCHES = [
  'Organic Vegetables',
  'Samsung Galaxy',
  'AC Maintenance',
  'Rent-a-Car Transit',
  'Fashion Wholesale'
];

interface TopNavbarProps {
  currentTab: PortalTab;
  onSelectTab: (tab: PortalTab) => void;
  onOpenHub: () => void;
  onOpenCart: () => void;
  onOpenWallet: () => void;
  onOpenNotifications: () => void;
  onOpenLocationModal?: () => void;
  onOpenSettings?: () => void;
  onOpenSuperAdminModal?: () => void;
  onOpenAuthModal?: (tab?: 'login' | 'register') => void;
  onUpdateLocation?: (newLocation: string, coordinates?: { lat: number; lng: number }) => void;
  unreadNotificationsCount: number;
  onOpenSidebar: () => void;
  onOpenVendorModal: () => void;
  onOpenCloudGuide: () => void;
  cartCount: number;
  currentUser: User;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  commerceItems?: CommerceItem[];
  posts?: SocialPost[];
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenHub,
  onOpenCart,
  onOpenWallet,
  onOpenNotifications,
  onOpenLocationModal,
  onUpdateLocation,
  onOpenSettings,
  onOpenSuperAdminModal,
  onOpenAuthModal,
  unreadNotificationsCount,
  onOpenSidebar,
  onOpenVendorModal,
  onOpenCloudGuide,
  cartCount,
  currentUser,
  isDarkMode,
  onToggleDarkMode,
  searchQuery,
  onSearchChange,
  commerceItems = [],
  posts = [],
}) => {
  const { t, language } = useLanguage();
  const isBn = language === 'bn';
  const navigate = useNavigate();
  const { openSettings } = useSettings();
  const { firebaseUser } = useAuth();
  const { wishlistCount } = useWishlist();

  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isMegaSearchOpen, setIsMegaSearchOpen] = useState(false);
  const [searchScope, setSearchScope] = useState<SearchScope>('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeOptionIndex, setActiveOptionIndex] = useState(-1);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback if parsing fails
    }
    return ['Smartphones', 'Bike Rider', 'Fresh Milk', 'Laptop Repair'];
  });

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Global Cmd+K / Ctrl+K listener to launch MegaSearch
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchFocused(false);
        setIsMegaSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const saveSearchTerm = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...searchHistory.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
    setSearchHistory(updated);
    try {
      localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // localStorage quota safeguard
    }
  };

  const removeSearchTerm = (termToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = searchHistory.filter((item) => item !== termToRemove);
    setSearchHistory(updated);
    try {
      localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // localStorage quota safeguard
    }
  };

  const clearAllHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchHistory([]);
    try {
      localStorage.removeItem(SEARCH_HISTORY_STORAGE_KEY);
    } catch {
      // Safeguard
    }
  };

  const navigateSearchTargetIfNeeded = () => {
    if (!['feed', 'commerce', 'wholesale', 'services', 'explore'].includes(currentTab)) {
      onSelectTab('commerce');
    }
  };

  const handleSelectSearch = (term: string) => {
    onSearchChange(term);
    saveSearchTerm(term);
    setIsSearchFocused(false);
    navigateSearchTargetIfNeeded();
  };

  // Real-time product and category suggestion computation from commerceItems
  const trimmedQuery = searchQuery.trim().toLowerCase();

  const popularCatalogCategories = useMemo(() => {
    if (!commerceItems || commerceItems.length === 0) return [];
    const counts = new Map<string, { name: string; count: number; type: string }>();
    for (const item of commerceItems) {
      if (searchScope === 'b2c' && item.tradeMode !== 'retail' && item.type !== 'retail') continue;
      if (searchScope === 'b2b' && item.tradeMode !== 'wholesale' && item.type !== 'wholesale') continue;
      if (!item.category) continue;
      const existing = counts.get(item.category);
      if (existing) existing.count += 1;
      else counts.set(item.category, { name: item.category, count: 1, type: item.type });
    }
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [commerceItems, searchScope]);

  const { matchingCategories, matchingProducts } = useMemo(() => {
    if (!trimmedQuery || !commerceItems || commerceItems.length === 0) {
      return { matchingCategories: [], matchingProducts: [] };
    }

    const scopedItems = commerceItems.filter((item) => {
      if (searchScope === 'b2c') return item.tradeMode === 'retail' || item.type === 'retail';
      if (searchScope === 'b2b') return item.tradeMode === 'wholesale' || item.type === 'wholesale';
      return true;
    });

    // 1. Matching categories & subcategories ranked by prefix match + item count
    const categoryMap = new Map<string, { name: string; count: number; type: string; score: number }>();

    scopedItems.forEach((item) => {
      if (item.category && item.category.toLowerCase().includes(trimmedQuery)) {
        const catKey = item.category;
        const prefixBonus = catKey.toLowerCase().startsWith(trimmedQuery) ? 10 : 0;
        const existing = categoryMap.get(catKey);
        if (existing) {
          existing.count += 1;
        } else {
          categoryMap.set(catKey, { name: catKey, count: 1, type: item.type, score: prefixBonus });
        }
      }
      if (
        item.subCategory &&
        item.subCategory.toLowerCase().includes(trimmedQuery) &&
        item.subCategory.toLowerCase() !== item.category.toLowerCase()
      ) {
        const subKey = item.subCategory;
        const prefixBonus = subKey.toLowerCase().startsWith(trimmedQuery) ? 8 : 0;
        const existing = categoryMap.get(subKey);
        if (existing) {
          existing.count += 1;
        } else {
          categoryMap.set(subKey, { name: subKey, count: 1, type: item.type, score: prefixBonus });
        }
      }
    });

    const matchingCategories = Array.from(categoryMap.values())
      .sort((a, b) => b.score + b.count - (a.score + a.count))
      .slice(0, 5);

    // 2. Matching products / items ranked by title prefix > title match > category/brand > description
    const scoredProducts: Array<{ item: CommerceItem; score: number }> = [];
    for (const item of scopedItems) {
      const titleLower = item.title.toLowerCase();
      const catLower = (item.category || '').toLowerCase();
      const subLower = (item.subCategory || '').toLowerCase();
      const brandLower = (item.brand || '').toLowerCase();
      const storeLower = (item.storeName || '').toLowerCase();
      const descLower = (item.description || '').toLowerCase();

      let score = 0;
      if (titleLower.startsWith(trimmedQuery)) score = 100;
      else if (titleLower.includes(trimmedQuery)) score = 75;
      else if (brandLower.includes(trimmedQuery)) score = 60;
      else if (catLower.startsWith(trimmedQuery) || subLower.startsWith(trimmedQuery)) score = 50;
      else if (catLower.includes(trimmedQuery) || subLower.includes(trimmedQuery)) score = 40;
      else if (storeLower.includes(trimmedQuery)) score = 30;
      else if (descLower.includes(trimmedQuery)) score = 15;

      if (score > 0) {
        scoredProducts.push({ item, score });
      }
    }

    const matchingProducts = scoredProducts
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.item)
      .slice(0, 6);

    return { matchingCategories, matchingProducts };
  }, [trimmedQuery, commerceItems, searchScope]);

  // Reset keyboard highlight when query or scope updates
  useEffect(() => {
    setActiveOptionIndex(-1);
  }, [trimmedQuery, searchScope]);

  const totalAutocompleteOptions = matchingCategories.length + matchingProducts.length;

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

  const handleSelectProduct = (product: CommerceItem) => {
    onSearchChange(product.title);
    saveSearchTerm(product.title);
    setIsSearchFocused(false);
    setActiveOptionIndex(-1);

    if (product.type === 'service') {
      onSelectTab('services');
    } else if (product.type === 'rides') {
      onSelectTab('rides');
    } else {
      navigate(`/hub/marketplace/product/${product.id}`);
    }
  };

  const handleSelectCategory = (categoryName: string, type?: string) => {
    onSearchChange(categoryName);
    saveSearchTerm(categoryName);
    setIsSearchFocused(false);
    setActiveOptionIndex(-1);

    if (searchScope === 'b2b' || type === 'wholesale') {
      onSelectTab('wholesale');
    } else if (type === 'service') {
      onSelectTab('services');
    } else if (type === 'rides') {
      onSelectTab('rides');
    } else {
      onSelectTab('commerce');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && trimmedQuery.length > 0 && totalAutocompleteOptions > 0) {
      e.preventDefault();
      setIsSearchFocused(true);
      setActiveOptionIndex((prev) => (prev + 1) % totalAutocompleteOptions);
      return;
    }

    if (e.key === 'ArrowUp' && trimmedQuery.length > 0 && totalAutocompleteOptions > 0) {
      e.preventDefault();
      setIsSearchFocused(true);
      setActiveOptionIndex((prev) => (prev <= 0 ? totalAutocompleteOptions - 1 : prev - 1));
      return;
    }

    if (e.key === 'Enter') {
      if (trimmedQuery.length > 0 && activeOptionIndex >= 0 && activeOptionIndex < totalAutocompleteOptions) {
        e.preventDefault();
        if (activeOptionIndex < matchingCategories.length) {
          const cat = matchingCategories[activeOptionIndex];
          handleSelectCategory(cat.name, cat.type);
        } else {
          const prod = matchingProducts[activeOptionIndex - matchingCategories.length];
          if (prod) handleSelectProduct(prod);
        }
        return;
      }

      if (searchQuery.trim()) {
        saveSearchTerm(searchQuery);
        navigateSearchTargetIfNeeded();
      }
      setIsSearchFocused(false);
      setActiveOptionIndex(-1);
    } else if (e.key === 'Escape') {
      setIsSearchFocused(false);
      setActiveOptionIndex(-1);
    }
  };

  return (
    <>
    <header className="sticky top-0 z-[45] w-full transition-all duration-300">
      {/* Separate glass layer so backdrop-filter does not trap position:fixed popovers inside header */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 pm-glass border-b border-[var(--pm-border)] shadow-sm" />
      <div className="max-w-7xl mx-auto px-2.5 sm:px-4 h-16 flex items-center justify-between gap-2 sm:gap-3">
        
        {/* Left Zone: Sidebar Menu Toggle, Brand Logo, Search */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-1 min-w-0">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] text-[var(--pm-text)] hover:text-[var(--pm-accent)] active-scale transition-all cursor-pointer shrink-0"
            title="Menu"
            aria-label={isBn ? 'মেনু খুলুন' : 'Open menu'}
          >
            <Menu className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('feed')}
            className="hidden sm:flex items-center gap-2.5 group active-scale cursor-pointer shrink-0"
            aria-label="PaikarMart Home"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--pm-accent)] flex items-center justify-center text-[var(--pm-accent-fg)] font-black text-xl shadow-md group-hover:scale-105 transition-transform">
              P
            </div>
            <span className="hidden lg:inline font-black text-xl tracking-tight text-[var(--pm-text)]">
              PaikarMart
            </span>
          </button>

          {/* Hybrid Search Bar Container with Scope Filter & Cmd+K MegaSearch Trigger */}
          <div ref={searchContainerRef} className="relative flex-1 min-w-0 max-w-full sm:max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg">
            <Search className={`w-4 h-4 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none transition-colors ${isSearchFocused ? 'text-[var(--pm-accent)]' : 'text-[var(--pm-muted)]'}`} />
            <input
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={isSearchFocused}
              aria-controls="top-navbar-autocomplete"
              aria-activedescendant={
                activeOptionIndex >= 0 ? `top-nav-option-${activeOptionIndex}` : undefined
              }
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={handleKeyDown}
              onChange={(e) => {
                onSearchChange(e.target.value);
                if (!isSearchFocused) setIsSearchFocused(true);
              }}
              placeholder={isBn ? 'পণ্য, ক্যাটাগরি বা সেবা খুঁজুন...' : t.nav.searchPlaceholder || 'Search PaikarMart...'}
              className="w-full min-w-0 h-9 sm:h-10 pl-8 sm:pl-9 pr-8 sm:pr-16 rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] focus:bg-[var(--pm-card)] focus:border-[var(--pm-accent)] focus:ring-2 focus:ring-[var(--pm-accent)]/20 text-xs sm:text-sm text-[var(--pm-text)] placeholder:text-[var(--pm-muted)] transition-all outline-none"
            />
            <div className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="text-[var(--pm-muted)] hover:text-[var(--pm-text)] p-1 rounded-full hover:bg-[var(--pm-card-hover)] transition-colors cursor-pointer"
                  title="Clear input"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsSearchFocused(false);
                  setIsMegaSearchOpen(true);
                }}
                title={isBn ? 'মেগা সার্চ খুলুন (Ctrl/⌘ + K)' : 'Open MegaSearch (⌘K)'}
                className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-[var(--pm-card)] border border-[var(--pm-border)] text-[10px] font-mono font-bold text-[var(--pm-muted)] hover:text-[var(--pm-accent)] hover:border-[var(--pm-accent)] transition-colors cursor-pointer"
              >
                <Command className="w-2.5 h-2.5" />
                <span>K</span>
              </button>
            </div>

            {/* Search History & Real-Time Suggestions Dropdown */}
            {isSearchFocused && (
              <>
                {/* Mobile Backdrop for Search Dropdown */}
                <div 
                  className="fixed inset-0 bg-black/40 z-40 sm:hidden animate-fadeIn"
                  onClick={() => setIsSearchFocused(false)} 
                />
                <div className="fixed left-3 right-3 top-16 w-auto max-w-[calc(100vw-1.5rem)] sm:max-w-none mx-auto sm:mx-0 sm:absolute sm:inset-auto sm:left-0 sm:top-full sm:mt-2 sm:w-[400px] bg-[var(--pm-card)] text-[var(--pm-text)] border border-[var(--pm-border)] rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn">
                  {/* Inline Scope Filter Bar: All | B2C | B2B + MegaSearch Launch */}
                  <div className="px-3 py-2 bg-[var(--pm-surface)] border-b border-[var(--pm-border)] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {([
                        { id: 'all', labelEn: 'All', labelBn: 'সব' },
                        { id: 'b2c', labelEn: 'B2C', labelBn: 'খুচরা' },
                        { id: 'b2b', labelEn: 'B2B', labelBn: 'পাইকারি' },
                      ] as const).map((sc) => (
                        <button
                          key={sc.id}
                          type="button"
                          onClick={() => setSearchScope(sc.id)}
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
                      onClick={() => {
                        setIsSearchFocused(false);
                        setIsMegaSearchOpen(true);
                      }}
                      className="text-[10px] font-bold text-[var(--pm-accent)] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isBn ? 'মেগা সার্চ ⌘K' : 'Full MegaSearch ⌘K'}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                
                {/* STATE A: User is typing -> Show Real-Time Product & Category Suggestions */}
                {trimmedQuery.length > 0 ? (
                  <div id="top-navbar-autocomplete" role="listbox" aria-label="Product and category suggestions">
                    {/* Suggestions Header */}
                    <div className="px-4 py-2.5 bg-[var(--pm-surface)] border-b border-[var(--pm-border)] flex items-center justify-between">
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

                    {/* Category Suggestions */}
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
                                onMouseEnter={() => setActiveOptionIndex(idx)}
                                onClick={() => handleSelectCategory(cat.name, cat.type)}
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

                    {/* Product / Service / Ride Suggestions */}
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
                              onMouseEnter={() => setActiveOptionIndex(optionIdx)}
                              onClick={() => handleSelectProduct(prod)}
                              className={`w-full px-3 py-2 flex items-center gap-3 text-left group cursor-pointer transition-colors ${
                                isActive ? 'bg-[var(--pm-card-hover)]' : 'hover:bg-[var(--pm-card-hover)]'
                              }`}
                            >
                              <img
                                src={prod.imageUrl}
                                alt={prod.title}
                                loading="lazy"
                                decoding="async"
                                className="w-10 h-10 rounded-xl object-cover shrink-0 bg-[var(--pm-surface)] border border-[var(--pm-border)] group-hover:scale-105 transition-transform"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                                    prod.type === 'wholesale' 
                                      ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/25' 
                                      : prod.type === 'service'
                                      ? 'bg-amber-500/15 text-amber-500 border border-amber-500/25'
                                      : prod.type === 'rides'
                                      ? 'bg-sky-500/15 text-sky-500 border border-sky-500/25'
                                      : 'bg-[var(--pm-accent-soft)] text-[var(--pm-accent)] border border-[var(--pm-accent-border)]'
                                  }`}>
                                    {prod.type === 'wholesale' ? 'B2B' : prod.type}
                                  </span>
                                  <span className="text-[10px] text-[var(--pm-muted)] truncate">
                                    {renderHighlightedMatch(prod.category, searchQuery)}
                                  </span>
                                </div>
                                <p className={`text-xs font-semibold truncate transition-colors ${
                                  isActive ? 'text-[var(--pm-accent)]' : 'text-[var(--pm-text)] group-hover:text-[var(--pm-accent)]'
                                }`}>
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
                          {isBn ? `"${searchQuery}" এর জন্য সরাসরি পণ্য পাওয়া যায়নি` : `No direct suggestions for "${searchQuery}"`}
                        </p>
                        <p className="text-[11px] text-[var(--pm-muted)]">
                          {isBn ? 'পুরো অ্যাপে খুঁজতে Enter চাপুন' : (
                            <>Press <kbd className="px-1.5 py-0.5 rounded-md bg-[var(--pm-surface)] text-[var(--pm-text)] font-mono text-[10px] border border-[var(--pm-border)]">Enter</kbd> to search across the app</>
                          )}
                        </p>
                      </div>
                    ) : null}

                    {/* Bottom Action Bar */}
                    <div className="px-3 py-2 bg-[var(--pm-surface)] border-t border-[var(--pm-border)] flex items-center justify-between text-[11px] text-[var(--pm-muted)]">
                      <span>{isBn ? 'Enter বা ↑↓ দিয়ে নির্বাচন করুন' : 'Use ↑↓ & Enter to select'}</span>
                      <button
                        type="button"
                        onClick={() => handleSelectSearch(searchQuery)}
                        className="font-semibold text-[var(--pm-accent)] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {isBn ? 'সব ফলাফল দেখুন' : 'Search all'} <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* STATE B: Search Query is Empty -> Show Recent Searches & Popular Topics */
                  <div>
                    {/* Recent Searches Header */}
                    <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-[var(--pm-border)]">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--pm-muted)] uppercase tracking-wider">
                        <History className="w-3.5 h-3.5 text-[var(--pm-accent)]" />
                        <span>Recent Searches</span>
                      </div>
                      {searchHistory.length > 0 && (
                        <button
                          type="button"
                          onClick={clearAllHistory}
                          className="text-[11px] font-semibold text-[var(--pm-muted)] hover:text-[var(--pm-danger)] transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          Clear all
                        </button>
                      )}
                    </div>

                    {/* Search History List */}
                    {searchHistory.length > 0 ? (
                      <div className="py-1 max-h-56 overflow-y-auto overscroll-contain divide-y divide-[var(--pm-border)]">
                        {searchHistory.map((item, idx) => (
                          <div
                            key={`${item}-${idx}`}
                            className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-[var(--pm-card-hover)] group transition-colors"
                          >
                            <button
                              type="button"
                              onClick={() => handleSelectSearch(item)}
                              className="flex-1 flex items-center gap-2.5 min-w-0 pr-2 py-0.5 text-left cursor-pointer"
                            >
                              <History className="w-3.5 h-3.5 text-[var(--pm-muted)] shrink-0 group-hover:text-[var(--pm-accent)] transition-colors" />
                              <span className="text-xs sm:text-sm font-medium text-[var(--pm-text)] truncate group-hover:text-[var(--pm-accent)]">
                                {item}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => removeSearchTerm(item, e)}
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
                        No recent search history
                      </div>
                    )}

                    {/* Popular Catalog Categories (from live commerceItems) */}
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
                              onClick={() => handleSelectCategory(cat.name, cat.type)}
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

                    {/* Popular / Trending Searches */}
                    <div className="bg-[var(--pm-surface)] p-3 border-t border-[var(--pm-border)] space-y-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--pm-muted)] uppercase tracking-wider">
                        <TrendingUp className="w-3 h-3 text-[var(--pm-success)]" />
                        <span>{isBn ? 'জনপ্রিয় সার্চ' : 'Popular Topics'}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {DEFAULT_TRENDING_SEARCHES.map((topic) => (
                          <button
                            key={topic}
                            type="button"
                            onClick={() => handleSelectSearch(topic)}
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
            )}
          </div>
        </div>

        {/* Right Zone: Location, Messages, Notifications, Cart, Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

          {/* Location Chip - Responsive on Tablet & Desktop */}
          <div className="hidden md:block shrink-0">
            <TopNavLocationMenu
              currentUser={currentUser}
              onUpdateLocation={onUpdateLocation}
              onOpenLocationModal={onOpenLocationModal}
            />
          </div>

          {/* Super Admin Control Center Button (Authenticated Admins Only) */}
          {Boolean(firebaseUser) && onOpenSuperAdminModal && (currentUser.role === 'super_admin' || currentUser.role === 'admin') && (
            <button
              type="button"
              onClick={onOpenSuperAdminModal}
              className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 active-scale transition-all border border-purple-500/25 cursor-pointer shrink-0"
              title="Super Admin Center"
              aria-label="Super Admin Center"
            >
              <ShieldAlert className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-purple-500 ring-2 ring-[var(--pm-card)] animate-pulse" />
            </button>
          )}

          {/* Messages & Quotes Button (Authenticated Users Only) */}
          {Boolean(firebaseUser) && (
            <button
              type="button"
              onClick={() => onSelectTab('messages')}
              className={`relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl active-scale transition-all cursor-pointer shrink-0 ${
                currentTab === 'messages'
                  ? 'bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] shadow-md'
                  : 'bg-[var(--pm-surface)] text-[var(--pm-text)] border border-[var(--pm-border)] hover:border-[var(--pm-accent)] hover:text-[var(--pm-accent)]'
              }`}
              title={isBn ? 'মেসেজ ও কোটেশন' : 'Messages & Quotes'}
              aria-label={isBn ? 'মেসেজ ও কোটেশন' : 'Messages & Quotes'}
            >
              <MessageSquare className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--pm-success)] ring-2 ring-[var(--pm-card)]" />
            </button>
          )}

          {/* Notifications Bell Button (Guest users see limited system-only notices) */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-[var(--pm-surface)] text-[var(--pm-text)] border border-[var(--pm-border)] hover:border-[var(--pm-accent)] hover:text-[var(--pm-accent)] active-scale transition-all cursor-pointer shrink-0"
            title={
              !firebaseUser
                ? isBn ? 'নোটিফিকেশন (গেস্ট সীমিত)' : 'Notifications (Guest Limited)'
                : isBn ? 'নোটিফিকেশন' : 'Notifications'
            }
            aria-label={
              !firebaseUser
                ? isBn ? 'নোটিফিকেশন (গেস্ট সীমিত)' : 'Notifications (Guest Limited)'
                : isBn ? 'নোটিফিকেশন' : 'Notifications'
            }
          >
            <Bell className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
            {unreadNotificationsCount > 0 && (
              <span
                className={`absolute -top-1 -right-1 min-w-[16px] h-4 sm:min-w-[18px] sm:h-[18px] px-1 rounded-full bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] text-[9px] sm:text-[10px] font-black flex items-center justify-center ring-2 ring-[var(--pm-card)] ${
                  firebaseUser ? 'animate-bounce' : ''
                }`}
              >
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Wishlist Tab Button with Real-Time Counter */}
          <button
            type="button"
            onClick={() => onSelectTab('wishlist')}
            className={`relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl active-scale transition-all cursor-pointer shrink-0 ${
              currentTab === 'wishlist'
                ? 'bg-rose-500 text-white shadow-md'
                : 'bg-[var(--pm-surface)] text-[var(--pm-text)] border border-[var(--pm-border)] hover:border-rose-500 hover:text-rose-500'
            }`}
            title={
              isBn
                ? `উইশলিস্ট (${wishlistCount}টি সংরক্ষিত)`
                : `Wishlist (${wishlistCount} saved)`
            }
            aria-label={
              isBn
                ? `উইশলিস্ট, ${wishlistCount}টি পণ্য সংরক্ষিত`
                : `Wishlist, ${wishlistCount} saved items`
            }
          >
            <Heart className={`w-[18px] h-[18px] sm:w-5 sm:h-5 ${currentTab === 'wishlist' ? 'fill-white' : wishlistCount > 0 ? 'text-rose-500' : ''}`} />
            <span
              data-testid="wishlist-nav-counter"
              aria-live="polite"
              className={`absolute -top-1 -right-1 min-w-[16px] h-4 sm:min-w-[18px] sm:h-[18px] px-1 rounded-full text-[9px] sm:text-[10px] font-mono font-black tabular-nums flex items-center justify-center ring-2 ring-[var(--pm-card)] transition-transform duration-200 ${
                currentTab === 'wishlist'
                  ? 'bg-white text-rose-500'
                  : wishlistCount > 0
                  ? 'bg-rose-500 text-white'
                  : 'bg-[var(--pm-surface)] text-[var(--pm-muted)] border border-[var(--pm-border)]'
              }`}
            >
              {wishlistCount > 99 ? '99+' : wishlistCount}
            </span>
          </button>

          {/* Shopping Cart Button */}
          <button
            type="button"
            onClick={onOpenCart}
            className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-[var(--pm-surface)] text-[var(--pm-text)] border border-[var(--pm-border)] hover:border-[var(--pm-accent)] hover:text-[var(--pm-accent)] active-scale transition-all cursor-pointer shrink-0"
            title={isBn ? 'শপিং কার্ট' : 'Shopping Cart'}
            aria-label={isBn ? 'শপিং কার্ট' : 'Shopping Cart'}
          >
            <ShoppingCart className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 sm:min-w-[18px] sm:h-[18px] px-1 rounded-full bg-[var(--pm-danger)] text-white text-[9px] sm:text-[10px] font-black flex items-center justify-center ring-2 ring-[var(--pm-card)]">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>

          {/* Login / Auth Button for Guests; Profile Avatar for Signed-in Users */}
          {!firebaseUser && onOpenAuthModal ? (
            <button
              type="button"
              onClick={() => onOpenAuthModal('login')}
              className="h-9 sm:h-10 px-2.5 sm:px-3.5 flex items-center justify-center gap-1.5 rounded-xl bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] text-[var(--pm-accent-fg)] font-bold text-xs sm:text-sm shadow-md active-scale transition-all cursor-pointer shrink-0 whitespace-nowrap"
              title={isBn ? 'লগইন বা রেজিস্টার করুন' : 'Sign In or Register'}
              aria-label={isBn ? 'লগইন' : 'Login'}
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span className="hidden min-[380px]:inline">{isBn ? 'লগইন' : 'Login'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSelectTab('profile')}
              className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl active-scale group cursor-pointer shrink-0"
              title={isBn ? 'প্রোফাইল' : 'Profile'}
              aria-label={isBn ? 'প্রোফাইল' : 'Profile'}
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                referrerPolicy="no-referrer"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover ring-2 ring-[var(--pm-border)] group-hover:ring-[var(--pm-accent)] transition-all shadow-md"
              />
              {firebaseUser && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-[var(--pm-success)] border-2 border-[var(--pm-card)] rounded-full" />
              )}
            </button>
          )}

        </div>

      </div>
    </header>

      {/* Global AI Assistant Chatbot Drawer */}
      <AiAssistantDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        initialRole={currentTab === 'wholesale' ? 'wholesale' : currentTab === 'services' ? 'services' : 'general'}
      />

      {/* Global Cmd+K MegaSearch Spotlight Modal */}
      <MegaSearch
        isOpen={isMegaSearchOpen}
        onClose={() => setIsMegaSearchOpen(false)}
        query={searchQuery}
        onQueryChange={onSearchChange}
        scope={searchScope}
        onScopeChange={setSearchScope}
        commerceItems={commerceItems}
        posts={posts}
        onSelectTab={onSelectTab}
        searchHistory={searchHistory}
        onSaveSearch={saveSearchTerm}
      />
    </>
  );
};
