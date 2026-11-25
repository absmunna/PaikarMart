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
  ArrowLeft,
  Bot,
  LogIn,
  Settings as SettingsIcon,
  Command,
  Heart,
  Mic
} from 'lucide-react';
import { PortalTab, User, CommerceItem, SocialPost } from '@/types';
import { TopNavLocationMenu } from '@/components/layout/TopNavLocationMenu';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/features/auth';
import { useWishlist } from '@/features/marketplace/hooks/useWishlist';
import { AiAssistantDrawer } from '@/features/ai';
import { MegaSearch, SearchScope } from '@/components/shared/MegaSearch';
import { DEFAULT_AVATAR_URL, DEFAULT_PRODUCT_IMAGE_URL, safeMediaSrc } from '@/shared/utils';

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
  onOpenVoiceSearch,
  onOpenRfqModal,
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

  const handleMobileBack = () => {
    if (currentTab === 'feed') {
      onOpenSidebar();
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      onSelectTab('feed');
    }
  };

  const mobileConfig = useMemo(() => {
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
          action: 'settings' as const
        };
      case 'settings':
        return {
          mode: 'detail' as const,
          title: isBn ? 'অ্যাপ সেটিংস' : 'Settings',
          subtitle: isBn ? 'প্রোফাইল ও প্রিফারেন্স' : 'Profile & preferences',
          action: 'close' as const
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
          action: 'settings' as const
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
          action: 'location' as const
        };
      case 'rides':
        return {
          mode: 'detail' as const,
          title: isBn ? 'ট্রানজিট ও রাইড' : 'Transit & Logistics',
          subtitle: isBn ? 'সিটি রাইড ও কার্গো' : 'Rides & freight delivery',
          action: 'location' as const
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
  }, [currentTab, isBn, currentUser.name, wishlistCount]);

  const renderSearchDropdown = (customTopClass?: string) => {
    if (!isSearchFocused) return null;

    return (
      <>
        {/* Mobile Backdrop for Search Dropdown */}
        <div 
          className="fixed inset-0 bg-black/40 z-40 sm:hidden animate-fadeIn"
          onClick={() => setIsSearchFocused(false)} 
        />
        <div className={`fixed left-3 right-3 ${customTopClass || 'top-16'} w-auto max-w-[calc(100vw-1.5rem)] sm:max-w-none mx-auto sm:mx-0 sm:absolute sm:inset-auto sm:left-0 sm:top-full sm:mt-2 sm:w-[420px] bg-[var(--pm-card)] text-[var(--pm-text)] border border-[var(--pm-border)] rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn`}>
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
                          src={safeMediaSrc(prod.imageUrl, DEFAULT_PRODUCT_IMAGE_URL)}
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
              <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-[var(--pm-border)]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--pm-muted)] uppercase tracking-wider">
                  <History className="w-3.5 h-3.5 text-[var(--pm-accent)]" />
                  <span>{isBn ? 'সাম্প্রতিক সার্চ' : 'Recent Searches'}</span>
                </div>
                {searchHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllHistory}
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
    );
  };

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

            {/* My Business / আমার ব্যবসা Entry Point */}
            <button
              type="button"
              onClick={() => {
                if (currentUser.isVendor) {
                  onSelectTab('vendor-dash');
                } else {
                  onOpenVendorModal();
                }
              }}
              className={`hidden lg:flex items-center gap-1.5 h-10 px-3 rounded-xl border text-xs font-bold transition-all active-scale cursor-pointer shrink-0 ${
                currentTab === 'vendor-dash'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25 hover:bg-amber-500/20'
              }`}
              title={isBn ? 'আমার ব্যবসা ও স্টোর পরিচালনা' : 'My Business & Store Management'}
              aria-label={isBn ? 'আমার ব্যবসা' : 'My Business'}
            >
              <Store className="w-4 h-4 shrink-0 text-amber-500" />
              <span>{isBn ? 'আমার ব্যবসা' : 'My Business'}</span>
            </button>

            {/* Super Admin Control Center Button */}
            {Boolean(firebaseUser) && onOpenSuperAdminModal && (currentUser.role === 'super_admin' || currentUser.role === 'admin') && (
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

            {/* Login / Auth Button for Guests; Profile Avatar for Signed-in Users */}
            {!firebaseUser && onOpenAuthModal ? (
              <button
                type="button"
                onClick={() => onOpenAuthModal('login')}
                className="h-10 px-3.5 flex items-center justify-center gap-1.5 rounded-xl bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] text-[var(--pm-accent-fg)] font-bold text-sm shadow-md active-scale transition-all cursor-pointer shrink-0 whitespace-nowrap"
                title={isBn ? 'লগইন বা রেজিস্টার করুন' : 'Sign In or Register'}
                aria-label={isBn ? 'লগইন' : 'Login'}
              >
                <LogIn className="w-4 h-4 shrink-0" />
                <span>{isBn ? 'লগইন' : 'Login'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSelectTab('profile')}
                className="relative w-10 h-10 flex items-center justify-center rounded-xl active-scale group cursor-pointer shrink-0"
                title={isBn ? 'প্রোফাইল' : 'Profile'}
                aria-label={isBn ? 'প্রোফাইল' : 'Profile'}
              >
                <img
                  src={safeMediaSrc(currentUser.avatar, DEFAULT_AVATAR_URL)}
                  alt={currentUser.name}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-[var(--pm-border)] group-hover:ring-[var(--pm-accent)] transition-all shadow-md"
                />
                {firebaseUser && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[var(--pm-success)] border-2 border-[var(--pm-card)] rounded-full" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. MOBILE SCREEN ADAPTIVE HEADER (flex md:hidden) */}
        {/* ============================================================ */}
        <div ref={mobileSearchContainerRef} className="flex md:hidden flex-col w-full relative">
          {/* MODE 1: FEED / HOME */}
          {mobileConfig.mode === 'feed' && (
            <>
              <div className="h-14 px-3 flex items-center justify-between gap-2 w-full">
                {/* Left: Menu & Brand */}
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={onOpenSidebar}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] text-[var(--pm-text)] active:scale-95 transition-all shrink-0 cursor-pointer"
                    aria-label={isBn ? 'মেনু খুলুন' : 'Open menu'}
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTab('feed')}
                    className="flex items-center gap-2 active:scale-95 transition-transform"
                    aria-label="PaikarMart Home"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[var(--pm-accent)] flex items-center justify-center text-[var(--pm-accent-fg)] font-black text-base shadow-sm">
                      P
                    </div>
                    <span className="font-black text-lg tracking-tight text-[var(--pm-text)]">
                      PaikarMart
                    </span>
                  </button>
                </div>

                {/* Right: Search Toggle, Wishlist, Cart, Profile/Login */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileSearchOpen((prev) => !prev);
                      if (!isMobileSearchOpen) {
                        setIsSearchFocused(true);
                      }
                    }}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all active:scale-95 cursor-pointer ${
                      isMobileSearchOpen || searchQuery
                        ? 'bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] border-[var(--pm-accent)]'
                        : 'bg-[var(--pm-surface)] text-[var(--pm-text)] border-[var(--pm-border)]'
                    }`}
                    title={isBn ? 'সার্চ করুন' : 'Search'}
                    aria-label="Search"
                  >
                    <Search className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectTab('wishlist')}
                    className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--pm-surface)] text-[var(--pm-text)] border border-[var(--pm-border)] active:scale-95 transition-all cursor-pointer"
                    title={isBn ? 'উইশলিস্ট' : 'Wishlist'}
                    aria-label="Wishlist"
                  >
                    <Heart className={`w-4 h-4 ${wishlistCount > 0 ? 'text-rose-500 fill-rose-500' : ''}`} />
                    {wishlistCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-[var(--pm-card)]">
                        {wishlistCount > 99 ? '99+' : wishlistCount}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={onOpenCart}
                    className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--pm-surface)] text-[var(--pm-text)] border border-[var(--pm-border)] active:scale-95 transition-all cursor-pointer"
                    title={isBn ? 'কার্ট' : 'Cart'}
                    aria-label="Cart"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[var(--pm-danger)] text-white text-[9px] font-black flex items-center justify-center ring-2 ring-[var(--pm-card)]">
                        {cartCount > 99 ? '99+' : cartCount}
                      </span>
                    )}
                  </button>

                  {!firebaseUser && onOpenAuthModal ? (
                    <button
                      type="button"
                      onClick={() => onOpenAuthModal('login')}
                      className="h-9 px-2.5 flex items-center justify-center gap-1 rounded-xl bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
                      title={isBn ? 'লগইন' : 'Login'}
                      aria-label="Login"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>{isBn ? 'লগইন' : 'Login'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectTab('profile')}
                      className="relative w-9 h-9 flex items-center justify-center rounded-xl active:scale-95 group cursor-pointer shrink-0"
                      title={isBn ? 'প্রোফাইল' : 'Profile'}
                      aria-label="Profile"
                    >
                      <img
                        src={safeMediaSrc(currentUser.avatar, DEFAULT_AVATAR_URL)}
                        alt={currentUser.name}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-xl object-cover ring-2 ring-[var(--pm-border)] shadow-xs"
                      />
                      {firebaseUser && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[var(--pm-success)] border-2 border-[var(--pm-card)] rounded-full" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Expandable Search Input for Feed Mode */}
              {(isMobileSearchOpen || Boolean(searchQuery)) && (
                <div className="px-3 pb-2.5 pt-0.5 animate-fadeIn">
                  <div className="relative flex items-center w-full">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--pm-accent)] pointer-events-none" />
                    <input
                      type="text"
                      autoFocus={isMobileSearchOpen && !searchQuery}
                      value={searchQuery}
                      onFocus={() => setIsSearchFocused(true)}
                      onKeyDown={handleKeyDown}
                      onChange={(e) => {
                        onSearchChange(e.target.value);
                        if (!isSearchFocused) setIsSearchFocused(true);
                      }}
                      placeholder={isBn ? 'পণ্য, ক্যাটাগরি বা সেবা খুঁজুন...' : 'Search PaikarMart...'}
                      className="w-full h-10 pl-9 pr-20 rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] focus:border-[var(--pm-accent)] focus:bg-[var(--pm-card)] text-xs text-[var(--pm-text)] placeholder:text-[var(--pm-muted)] outline-none"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => onSearchChange('')}
                          className="p-1 text-[var(--pm-muted)] hover:text-[var(--pm-text)]"
                          aria-label="Clear search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onOpenVoiceSearch && (
                        <button
                          type="button"
                          onClick={onOpenVoiceSearch}
                          className="p-1.5 text-[var(--pm-accent)]"
                          title="Voice Search"
                          aria-label="Voice Search"
                        >
                          <Mic className="w-4 h-4 animate-pulse" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileSearchOpen(false);
                          setIsSearchFocused(false);
                          if (!searchQuery) setActiveOptionIndex(-1);
                        }}
                        className="text-[11px] font-bold text-[var(--pm-muted)] hover:text-[var(--pm-text)] px-1 cursor-pointer"
                      >
                        {isBn ? 'বাতিল' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* MODE 2: MARKETPLACES & COMMERCE */}
          {mobileConfig.mode === 'commerce' && (
            <div className="h-14 px-3 flex items-center justify-between gap-2 w-full">
              {/* Back Button */}
              <button
                type="button"
                onClick={handleMobileBack}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] text-[var(--pm-text)] active:scale-95 transition-all shrink-0 cursor-pointer"
                aria-label={isBn ? 'ফিরে যান' : 'Go back'}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Full-width Search Input */}
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--pm-muted)] pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setIsSearchFocused(true)}
                  onKeyDown={handleKeyDown}
                  onChange={(e) => {
                    onSearchChange(e.target.value);
                    if (!isSearchFocused) setIsSearchFocused(true);
                  }}
                  placeholder={mobileConfig.placeholder}
                  className="w-full h-10 pl-9 pr-14 rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] focus:border-[var(--pm-accent)] focus:bg-[var(--pm-card)] text-xs text-[var(--pm-text)] placeholder:text-[var(--pm-muted)] outline-none"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => onSearchChange('')}
                      className="p-1 text-[var(--pm-muted)] hover:text-[var(--pm-text)]"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onOpenVoiceSearch && (
                    <button
                      type="button"
                      onClick={onOpenVoiceSearch}
                      className="p-1 text-[var(--pm-accent)]"
                      title="Voice Search"
                      aria-label="Voice Search"
                    >
                      <Mic className="w-4 h-4 animate-pulse" />
                    </button>
                  )}
                </div>
              </div>

              {/* Wishlist & Cart */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onSelectTab('wishlist')}
                  className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--pm-surface)] text-[var(--pm-text)] border border-[var(--pm-border)] active:scale-95 transition-all cursor-pointer"
                  title={isBn ? 'উইশলিস্ট' : 'Wishlist'}
                  aria-label="Wishlist"
                >
                  <Heart className={`w-4 h-4 ${wishlistCount > 0 ? 'text-rose-500 fill-rose-500' : ''}`} />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-[var(--pm-card)]">
                      {wishlistCount > 99 ? '99+' : wishlistCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onOpenCart}
                  className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--pm-surface)] text-[var(--pm-text)] border border-[var(--pm-border)] active:scale-95 transition-all cursor-pointer"
                  title={isBn ? 'কার্ট' : 'Cart'}
                  aria-label="Cart"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[var(--pm-danger)] text-white text-[9px] font-black flex items-center justify-center ring-2 ring-[var(--pm-card)]">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* MODE 3: DETAIL, SUB-PAGE & UTILITY PORTALS */}
          {mobileConfig.mode === 'detail' && (
            <div className="h-14 px-3 flex items-center justify-between gap-2 w-full">
              {/* Back Button + Title & Subtitle */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={handleMobileBack}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] text-[var(--pm-text)] active:scale-95 transition-all shrink-0 cursor-pointer"
                  aria-label={isBn ? 'ফিরে যান' : 'Go back'}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0 flex-1">
                  <h1 className="text-sm font-black text-[var(--pm-text)] leading-tight truncate">
                    {mobileConfig.title}
                  </h1>
                  <p className="text-[11px] text-[var(--pm-muted)] leading-tight truncate">
                    {mobileConfig.subtitle}
                  </p>
                </div>
              </div>

              {/* Tailored Contextual Right Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {mobileConfig.action === 'cart' && (
                  <button
                    type="button"
                    onClick={onOpenCart}
                    className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--pm-surface)] text-[var(--pm-text)] border border-[var(--pm-border)] active:scale-95 transition-all cursor-pointer"
                    title={isBn ? 'কার্ট' : 'Cart'}
                    aria-label="Cart"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[var(--pm-danger)] text-white text-[9px] font-black flex items-center justify-center ring-2 ring-[var(--pm-card)]">
                        {cartCount > 99 ? '99+' : cartCount}
                      </span>
                    )}
                  </button>
                )}

                {mobileConfig.action === 'notifications' && (
                  <button
                    type="button"
                    onClick={onOpenNotifications}
                    className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--pm-surface)] text-[var(--pm-text)] border border-[var(--pm-border)] active:scale-95 transition-all cursor-pointer"
                    title={isBn ? 'নোটিফিকেশন' : 'Notifications'}
                    aria-label="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadNotificationsCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] text-[9px] font-black flex items-center justify-center ring-2 ring-[var(--pm-card)]">
                        {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                      </span>
                    )}
                  </button>
                )}

                {mobileConfig.action === 'settings' && (
                  <button
                    type="button"
                    onClick={onOpenSettings || (() => onSelectTab('settings'))}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--pm-surface)] text-[var(--pm-text)] border border-[var(--pm-border)] active:scale-95 transition-all cursor-pointer"
                    title={isBn ? 'সেটিংস' : 'Settings'}
                    aria-label="Settings"
                  >
                    <SettingsIcon className="w-4 h-4" />
                  </button>
                )}

                {mobileConfig.action === 'close' && (
                  <button
                    type="button"
                    onClick={handleMobileBack}
                    className="h-9 px-3 flex items-center justify-center rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] text-xs font-bold text-[var(--pm-text)] active:scale-95 transition-all cursor-pointer"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4 mr-1" />
                    <span>{isBn ? 'বন্ধ' : 'Close'}</span>
                  </button>
                )}

                {mobileConfig.action === 'location' && (
                  <TopNavLocationMenu
                    currentUser={currentUser}
                    onUpdateLocation={onUpdateLocation}
                    onOpenLocationModal={onOpenLocationModal}
                  />
                )}
              </div>
            </div>
          )}

          {/* Mobile Autocomplete Dropdown */}
          {renderSearchDropdown(mobileConfig.mode === 'feed' && isMobileSearchOpen ? 'top-28' : 'top-16')}
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
