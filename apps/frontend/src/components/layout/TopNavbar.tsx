import React, { useState, useEffect, useRef, useMemo } from 'react';
import { matchPath, useLocation, useNavigate } from 'react-router-dom';
import { 
  Search, 
  ShoppingCart, 
  Sparkles, 
  ShieldAlert,
  Menu,
  Bell,
  MessageSquare,
  X,
  LogIn,
  Command,
  Heart,
  Mic
} from 'lucide-react';
import { PortalTab, User, CommerceItem, SocialPost } from '@/types';
import { TopNavLocationMenu } from '@/components/layout/TopNavLocationMenu';
import { TopNavSearchDropdown } from '@/components/layout/TopNavSearchDropdown';
import { TopNavMobileBar } from '@/components/layout/TopNavMobileBar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/features/auth';
import { useWishlist } from '@/features/marketplace/hooks/useWishlist';
import { AiAssistantDrawer } from '@/features/ai';
import { MegaSearch, SearchScope } from '@/components/shared/MegaSearch';
import { Button } from '@/components/shared/Button';
import { ROUTE_PATHS } from '@/shared/constants/routes';

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
  onOpenSuperAdminModal?: () => void;
  onOpenAuthModal?: (tab?: 'login' | 'register') => void;
  onUpdateLocation?: (newLocation: string, coordinates?: { lat: number; lng: number }) => void;
  unreadNotificationsCount: number;
  onOpenSidebar: () => void;
  onOpenCloudGuide: () => void;
  cartCount: number;
  currentUser: User;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  commerceItems?: CommerceItem[];
  posts?: SocialPost[];
  onOpenVoiceSearch?: () => void;
  onOpenRfqModal?: () => void;
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
  onOpenSuperAdminModal,
  onOpenAuthModal,
  unreadNotificationsCount,
  onOpenSidebar,
  onOpenCloudGuide,
  cartCount,
  currentUser,
  isDarkMode,
  onToggleDarkMode,
  searchQuery,
  onSearchChange,
  commerceItems = [],
  posts = [],
  onOpenVoiceSearch,
  onOpenRfqModal,
}) => {
  const { t, language } = useLanguage();
  const isBn = language === 'bn';
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { 
    firebaseUser, 
    activeProfileMode, 
    hasPaikarMartAccess, 
    switchProfileMode, 
    personalUser 
  } = useAuth();
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

  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchContainerRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown on click outside (works for both desktop and mobile containers)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const insideDesktop = searchContainerRef.current && searchContainerRef.current.contains(target);
      const insideMobile = mobileSearchContainerRef.current && mobileSearchContainerRef.current.contains(target);
      if (!insideDesktop && !insideMobile) {
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

  const isProductDetailsRoute = Boolean(
    matchPath({ path: ROUTE_PATHS.PRODUCT_DETAILS, end: true }, pathname)
  );

  const handleMobileBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    if (isProductDetailsRoute) {
      navigate(ROUTE_PATHS.MARKETPLACE_HUB);
      return;
    }

    onSelectTab('feed');
  };

  const mobileConfig = useMemo(() => {
    const productDetailsMatch = matchPath(
      { path: ROUTE_PATHS.PRODUCT_DETAILS, end: true },
      pathname
    );
    if (productDetailsMatch) {
      const product = commerceItems.find((item) => item.id === productDetailsMatch.params.id);
      return {
        mode: 'detail' as const,
        title: product?.title || (isBn ? 'পণ্যের বিবরণ' : 'Product details'),
        subtitle: product?.category || (isBn ? 'পণ্যের তথ্য' : 'Product information'),
        action: 'cart' as const,
      };
    }

    if (matchPath({ path: ROUTE_PATHS.SETTINGS, end: true }, pathname)) {
      return {
        mode: 'detail' as const,
        title: isBn ? 'অ্যাপ সেটিংস' : 'Settings',
        subtitle: isBn ? 'প্রোফাইল ও প্রিফারেন্স' : 'Profile & preferences',
        action: 'none' as const,
      };
    }

    const publicHandleMatch = matchPath({ path: ROUTE_PATHS.PUBLIC_HANDLE, end: true }, pathname);
    const isPublicStoreRoute = Boolean(
      matchPath({ path: ROUTE_PATHS.PUBLIC_STORE, end: true }, pathname)
    );
    if (publicHandleMatch || isPublicStoreRoute) {
      const handle = publicHandleMatch?.params.handle;
      return {
        mode: 'detail' as const,
        title: handle ? `@${handle}` : (isBn ? 'স্টোরফ্রন্ট' : 'Storefront'),
        subtitle: isBn ? 'পাবলিক প্রোফাইল' : 'Public profile',
        action: 'cart' as const,
      };
    }

    switch (currentTab) {
      case 'feed':
        return { mode: 'feed' as const };
      case 'commerce':
      case 'wholesale':
      case 'explore':
      case 'demand':
      case 'nearby':
        return {
          mode: 'commerce' as const,
          showBack: currentTab !== 'explore' && pathname !== ROUTE_PATHS.MARKETPLACE_HUB,
          placeholder:
            currentTab === 'wholesale'
              ? isBn ? 'পাইকারি লট বা ফ্যাক্টরি খুঁজুন...' : 'Search wholesale lots & factories...'
              : currentTab === 'demand'
              ? isBn ? 'চাহিদা পোস্ট ও আরএফকিউ খুঁজুন...' : 'Search buyer demands & RFQs...'
              : currentTab === 'nearby'
              ? isBn ? 'আশেপাশের দোকান খুঁজুন...' : 'Search nearby shops & products...'
              : isBn ? 'পণ্য, ব্র্যান্ড বা ক্যাটাগরি খুঁজুন...' : 'Search products, brands...'
        };
      case 'orders':
        return {
          mode: 'detail' as const,
          title: isBn ? 'আমার অর্ডার' : 'My Orders',
          subtitle: isBn ? 'অর্ডার ট্র্যাকিং ও ইতিহাস' : 'Track orders & history',
          action: 'cart' as const
        };
      case 'wallet':
        return {
          mode: 'detail' as const,
          title: isBn ? 'ডিজিটাল ওয়ালেট' : 'Wallet & Escrow',
          subtitle: isBn ? 'ব্যালেন্স ও নিরাপদ লেনদেন' : 'Balance & escrow payments',
          action: 'notifications' as const
        };
      case 'notifications':
        return {
          mode: 'detail' as const,
          title: isBn ? 'নোটিফিকেশন' : 'Notifications',
          subtitle: isBn ? 'অর্ডার ও সিস্টেম নোটিশ' : 'Order & system alerts',
          action: 'none' as const
        };
      case 'settings':
        return {
          mode: 'detail' as const,
          title: isBn ? 'অ্যাপ সেটিংস' : 'Settings',
          subtitle: isBn ? 'প্রোফাইল ও প্রিফারেন্স' : 'Profile & preferences',
          action: 'none' as const
        };
      case 'messages':
        return {
          mode: 'detail' as const,
          title: isBn ? 'মেসেজ ও কোটেশন' : 'Messages & Quotes',
          subtitle: isBn ? 'সেলার ও বায়ার ইনবক্স' : 'Buyer & seller chats',
          action: 'cart' as const
        };
      case 'profile':
        return {
          mode: 'detail' as const,
          title: isBn ? 'আমার প্রোফাইল' : 'My Profile',
          subtitle: currentUser.name || (isBn ? 'ব্যবহারকারী অ্যাকাউন্ট' : 'User account'),
          action: 'none' as const
        };
      case 'vendor-dash':
        return {
          mode: 'detail' as const,
          title: isBn ? 'মার্চেন্ট হাব' : 'Seller Central',
          subtitle: isBn ? 'দোকান ও ব্যবসা ড্যাশবোর্ড' : 'Storefront & inventory',
          action: 'notifications' as const
        };
      case 'creator':
        return {
          mode: 'detail' as const,
          title: isBn ? 'ক্রিয়েটর স্টুডিও' : 'Creator Studio',
          subtitle: isBn ? 'শপেবল ভিডিও ও লাইভ' : 'Shoppable reels & media',
          action: 'cart' as const
        };
      case 'services':
        return {
          mode: 'detail' as const,
          title: isBn ? 'সার্ভিস মার্কেট' : 'Local Services',
          subtitle: isBn ? 'হোম সার্ভিস ও টেকনিশিয়ান' : 'On-demand repairs & experts',
          action: 'location' as const,
          showBack: false,
        };
      case 'rides':
        return {
          mode: 'detail' as const,
          title: isBn ? 'ট্রানজিট ও রাইড' : 'Transit & Logistics',
          subtitle: isBn ? 'সিটি রাইড ও কার্গো' : 'Rides & freight delivery',
          action: 'location' as const,
          showBack: false,
        };
      case 'wishlist':
        return {
          mode: 'detail' as const,
          title: isBn ? 'আমার উইশলিস্ট' : 'My Wishlist',
          subtitle: isBn ? `${wishlistCount}টি পণ্য সংরক্ষিত` : `${wishlistCount} saved items`,
          action: 'cart' as const
        };
      case 'guide':
        return {
          mode: 'detail' as const,
          title: isBn ? 'ব্যবহার নির্দেশিকা' : 'User Guide',
          subtitle: isBn ? 'অ্যাপের নিয়মাবলী ও সাহায্য' : 'Help & tutorials',
          action: 'cart' as const
        };
      case 'community-hub':
        return {
          mode: 'detail' as const,
          title: isBn ? 'কমিউনিটি হাব' : 'Community Hub',
          subtitle: isBn ? 'সোশ্যাল পোস্ট ও গ্রুপ' : 'Social feed & clubs',
          action: 'cart' as const
        };
      case 'utility-hub':
        return {
          mode: 'detail' as const,
          title: isBn ? 'ইউটিলিটি হাব' : 'Utility Hub',
          subtitle: isBn ? 'প্রয়োজনীয় টুলস ও সেবা' : 'Tools & essential utilities',
          action: 'cart' as const
        };
      default:
        return { mode: 'feed' as const };
    }
  }, [
    currentTab,
    isBn,
    currentUser.name,
    wishlistCount,
    pathname,
    commerceItems,
  ]);

  const renderSearchDropdown = (customTopClass?: string) => (
    <TopNavSearchDropdown
      isOpen={isSearchFocused}
      isBn={isBn}
      searchQuery={searchQuery}
      trimmedQuery={trimmedQuery}
      searchScope={searchScope}
      activeOptionIndex={activeOptionIndex}
      searchHistory={searchHistory}
      popularCatalogCategories={popularCatalogCategories}
      matchingCategories={matchingCategories}
      matchingProducts={matchingProducts}
      trendingSearches={DEFAULT_TRENDING_SEARCHES}
      customTopClass={customTopClass}
      onClose={() => setIsSearchFocused(false)}
      onChangeScope={setSearchScope}
      onOpenMegaSearch={() => {
        setIsSearchFocused(false);
        setIsMegaSearchOpen(true);
      }}
      onSetActiveOptionIndex={setActiveOptionIndex}
      onSelectCategory={handleSelectCategory}
      onSelectProduct={handleSelectProduct}
      onSelectSearch={handleSelectSearch}
      onRemoveSearchTerm={removeSearchTerm}
      onClearAllHistory={clearAllHistory}
    />
  );

  return (
    <>
    <header className="sticky top-0 z-[45] w-full transition-all duration-300">
      {/* Separate glass layer so backdrop-filter does not trap position:fixed popovers inside header */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 pm-glass border-b border-[var(--pm-border)] shadow-sm" />
        {/* ============================================================ */}
        {/* 1. DESKTOP NAVBAR (hidden md:flex) */}
        {/* ============================================================ */}
        <div className="hidden md:flex max-w-7xl mx-auto px-4 h-16 items-center justify-between gap-3 w-full">
          {/* Left Zone: Sidebar Menu Toggle, Brand Logo, Search */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <button
              type="button"
              onClick={onOpenSidebar}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] text-[var(--pm-text)] hover:text-[var(--pm-accent)] active-scale transition-all cursor-pointer shrink-0"
              title="Menu"
              aria-label={isBn ? 'মেনু খুলুন' : 'Open menu'}
            >
              <Menu className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('feed')}
              className="flex items-center gap-2.5 group active-scale cursor-pointer shrink-0"
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
            <div ref={searchContainerRef} className="relative flex-1 min-w-0 max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg">
              <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none transition-colors ${isSearchFocused ? 'text-[var(--pm-accent)]' : 'text-[var(--pm-muted)]'}`} />
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
                className="w-full min-w-0 h-10 pl-9 pr-24 rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] focus:bg-[var(--pm-card)] focus:border-[var(--pm-accent)] focus:ring-2 focus:ring-[var(--pm-accent)]/20 text-xs sm:text-sm text-[var(--pm-text)] placeholder:text-[var(--pm-muted)] transition-all outline-none"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1">
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
                {onOpenVoiceSearch && (
                  <button
                    type="button"
                    onClick={onOpenVoiceSearch}
                    title={isBn ? 'ভয়েস সার্চ করুন' : 'AI Voice Search'}
                    aria-label="AI Voice Search"
                    className="p-1.5 rounded-lg text-[var(--pm-muted)] hover:text-[var(--pm-accent)] hover:bg-[var(--pm-card-hover)] transition-colors cursor-pointer"
                  >
                    <Mic className="w-4 h-4 text-[var(--pm-accent)] animate-pulse" />
                  </button>
                )}
                {onOpenRfqModal && (
                  <button
                    type="button"
                    onClick={onOpenRfqModal}
                    title={isBn ? 'এআই আরএফকিউ ও চাহিদা পূর্বাভাস' : 'AI RFQ & Demand Forecasting'}
                    aria-label="Option 4 RFQ & Demand Forecasting"
                    className="hidden xl:flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>RFQ</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchFocused(false);
                    setIsMegaSearchOpen(true);
                  }}
                  title={isBn ? 'মেগা সার্চ খুলুন (Ctrl/⌘ + K)' : 'Open MegaSearch (⌘K)'}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-[var(--pm-card)] border border-[var(--pm-border)] text-[10px] font-mono font-bold text-[var(--pm-muted)] hover:text-[var(--pm-accent)] hover:border-[var(--pm-accent)] transition-colors cursor-pointer"
                >
                  <Command className="w-2.5 h-2.5" />
                  <span>K</span>
                </button>
              </div>

              {/* Desktop Autocomplete Dropdown */}
              {renderSearchDropdown('top-16 sm:top-full')}
            </div>
          </div>

          {/* Right Zone: Location, Messages, Notifications, Cart, Profile */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Location Chip */}
            <div className="shrink-0">
              <TopNavLocationMenu
                currentUser={currentUser}
                onUpdateLocation={onUpdateLocation}
                onOpenLocationModal={onOpenLocationModal}
              />
            </div>

            {/* Super Admin Control Center Button */}
            {onOpenSuperAdminModal && (currentUser.role === 'super_admin' || currentUser.role === 'admin') && (
              <button
                type="button"
                onClick={onOpenSuperAdminModal}
                className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 active-scale transition-all border border-purple-500/25 cursor-pointer shrink-0"
                title="Super Admin Center"
                aria-label="Super Admin Center"
              >
                <ShieldAlert className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-purple-500 ring-2 ring-[var(--pm-card)] animate-pulse" />
              </button>
            )}

            {/* Messages & Quotes Button */}
            {Boolean(firebaseUser) && (
              <button
                type="button"
                onClick={() => onSelectTab('messages')}
                className={`relative w-10 h-10 flex items-center justify-center rounded-xl active-scale transition-all cursor-pointer shrink-0 ${
                  currentTab === 'messages'
                    ? 'bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] shadow-md'
                    : 'bg-[var(--pm-surface)] text-[var(--pm-text)] border border-[var(--pm-border)] hover:border-[var(--pm-accent)] hover:text-[var(--pm-accent)]'
                }`}
                title={isBn ? 'মেসেজ ও কোটেশন' : 'Messages & Quotes'}
                aria-label={isBn ? 'মেসেজ ও কোটেশন' : 'Messages & Quotes'}
              >
                <MessageSquare className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--pm-success)] ring-2 ring-[var(--pm-card)]" />
              </button>
            )}

            {/* Notifications Bell Button */}
            <button
              type="button"
              onClick={onOpenNotifications}
              className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--pm-surface)] text-[var(--pm-text)] border border-[var(--pm-border)] hover:border-[var(--pm-accent)] hover:text-[var(--pm-accent)] active-scale transition-all cursor-pointer shrink-0"
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
              <Bell className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span
                  className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] text-[10px] font-black flex items-center justify-center ring-2 ring-[var(--pm-card)] ${
                    firebaseUser ? 'animate-bounce' : ''
                  }`}
                >
                  {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Wishlist Tab Button */}
            <button
              type="button"
              onClick={() => onSelectTab('wishlist')}
              className={`relative w-10 h-10 flex items-center justify-center rounded-xl active-scale transition-all cursor-pointer shrink-0 ${
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
              <Heart className={`w-5 h-5 ${currentTab === 'wishlist' ? 'fill-white' : wishlistCount > 0 ? 'text-rose-500' : ''}`} />
              <span
                data-testid="wishlist-nav-counter"
                aria-live="polite"
                className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-mono font-black tabular-nums flex items-center justify-center ring-2 ring-[var(--pm-card)] transition-transform duration-200 ${
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
              className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--pm-surface)] text-[var(--pm-text)] border border-[var(--pm-border)] hover:border-[var(--pm-accent)] hover:text-[var(--pm-accent)] active-scale transition-all cursor-pointer shrink-0"
              title={isBn ? 'শপিং কার্ট' : 'Shopping Cart'}
              aria-label={isBn ? 'শপিং কার্ট' : 'Shopping Cart'}
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--pm-danger)] text-white text-[10px] font-black flex items-center justify-center ring-2 ring-[var(--pm-card)]">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>

            {/* Facebook Page-style Profile Switcher (Personal <-> PaikarMart Super Admin) */}
            {hasPaikarMartAccess && (
              <button
                type="button"
                onClick={() => {
                  const nextMode = activeProfileMode === 'personal' ? 'paikarmart' : 'personal';
                  switchProfileMode(nextMode);
                }}
                className={`hidden xl:flex items-center gap-1.5 h-10 px-3 rounded-xl border text-xs font-bold transition-all active-scale cursor-pointer shrink-0 ${
                  activeProfileMode === 'paikarmart'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                    : 'bg-[var(--pm-surface)] text-[var(--pm-text)] border-[var(--pm-border)] hover:border-purple-500 hover:text-purple-600'
                }`}
                title={isBn ? 'ব্যক্তিগত প্রোফাইল ও পাইকারমার্ট সুপার অ্যাডমিন প্রোফাইল সুইচ করুন' : 'Switch between Personal Profile and PaikarMart Organization'}
                aria-label="Switch Active Profile Mode"
              >
                <span className="truncate max-w-[120px]">
                  {activeProfileMode === 'paikarmart' ? '🏢 PaikarMart (Super Admin)' : `👤 ${personalUser.name.split(' ')[0]} (Personal)`}
                </span>
                <span className="text-[10px] opacity-80 underline">Switch</span>
              </button>
            )}

            {/* Login / Auth Button for Guests; Profile Avatar for Signed-in Users */}
            {!firebaseUser && onOpenAuthModal && (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => onOpenAuthModal('login')}
                className="gap-1.5 shadow-md active-scale whitespace-nowrap"
                title={isBn ? 'লগইন বা রেজিস্টার করুন' : 'Sign In or Register'}
                aria-label={isBn ? 'লগইন' : 'Login'}
              >
                <LogIn className="w-4 h-4 shrink-0" />
                <span>{isBn ? 'লগইন' : 'Login'}</span>
              </Button>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. MOBILE SCREEN ADAPTIVE HEADER (flex md:hidden) */}
        {/* ============================================================ */}
        <TopNavMobileBar
          containerRef={mobileSearchContainerRef}
          isBn={isBn}
          mobileConfig={mobileConfig}
          searchQuery={searchQuery}
          isMobileSearchOpen={isMobileSearchOpen}
          wishlistCount={wishlistCount}
          cartCount={cartCount}
          unreadNotificationsCount={unreadNotificationsCount}
          currentUser={currentUser}
          hasFirebaseUser={Boolean(firebaseUser)}
          onOpenSidebar={onOpenSidebar}
          onSelectTab={onSelectTab}
          onOpenCart={onOpenCart}
          onOpenNotifications={onOpenNotifications}
          onOpenAuthModal={onOpenAuthModal}
          onOpenLocationModal={onOpenLocationModal}
          onUpdateLocation={onUpdateLocation}
          onOpenVoiceSearch={onOpenVoiceSearch}
          onSearchChange={onSearchChange}
          onToggleMobileSearch={() => {
            setIsMobileSearchOpen((prev) => !prev);
            if (!isMobileSearchOpen) {
              setIsSearchFocused(true);
            }
          }}
          onCloseMobileSearch={() => {
            setIsMobileSearchOpen(false);
            setIsSearchFocused(false);
            if (!searchQuery) setActiveOptionIndex(-1);
          }}
          onFocusSearch={() => setIsSearchFocused(true)}
          onSearchKeyDown={handleKeyDown}
          onMobileBack={handleMobileBack}
          renderDropdown={renderSearchDropdown}
        />
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
