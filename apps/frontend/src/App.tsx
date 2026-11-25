import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, ArrowDown } from 'lucide-react';
import { 
  PortalTab, 
  User, 
  SocialPost, 
  CommerceItem, 
  CartItem, 
  Order, 
  ServiceBooking, 
  ReactionType, 
  TaggedProduct, 
  VendorProfile,
  PostType,
  CitizenPostCategory,
  AppNotification
} from '@/types';
import { 
  CURRENT_USER, 
  INITIAL_POSTS, 
  INITIAL_COMMERCE_ITEMS, 
  INITIAL_STORIES,
  INITIAL_NOTIFICATIONS,
  INITIAL_ORDERS
} from '@/data/mockData';
import { loadStoredData, saveStoredData } from '@/lib/supabase';

import { useLocation, useNavigate } from 'react-router-dom';

// Layout & Shared Chrome via Design System
import {
  TopNavbar,
  BottomNav,
  DesktopLeftNav,
  DesktopRightSidebar,
  SuperAppHubModal,
  SidebarDrawer,
} from '@/design-system/layouts';
import {
  DeploymentGuideModal,
  LocationPickerModal,
  ScrollToTop,
} from '@/design-system/components';
import { AuthPortalModal } from '@/features/auth';

import {
  CartCheckoutDrawer,
  CategoryBar,
  CompareTrayBar,
  ProductComparisonModal,
  ProductComparisonProvider,
  WishlistProvider,
  fetchCatalogResult,
  type PortalFilterType
} from '@/features/marketplace';
import { fetchSocialFeedResult } from '@/features/social';
import { WalletModal } from '@/portals/utilities/wallet/components/WalletModal';
import { NotificationsModal } from '@/portals/utilities/notifications-center/components/NotificationsModal';
import { MessagingCenterModal } from '@/features/messaging';
import { SuperAdminControlModal } from '@/features/governance';
import { MultiRoleOnboardingModal } from '@/features/vendors';
import { PwaInstallBanner } from '@/features/pwa/PwaInstallBanner';
import { VoiceSearchModal } from '@/features/ai-voice/VoiceSearchModal';
import { RfqAndForecastingModal } from '@/components/shared/RfqAndForecastingModal';
import {
  clearUserNotificationsApi,
  createUserNotificationApi,
  fetchUserNotificationsApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from '@/features/notifications/notificationApiClient';

// Application Bootstrap, Routing, Contexts & Shared Hooks
import { AppProviders } from '@/app/providers/AppProviders';
import { PORTAL_TAB_ROUTES, resolveTabFromPath, ROUTE_PATHS } from '@/app/router/routeIds';
import { AppRouteManifest } from '@/app/router/routeManifest';
import { useTheme, useLanguage, useLocationSettings, useAuth } from '@/contexts';
import type { SettingsSectionId } from '@/types';
import { SettingsModal } from '@/portals/utilities/settings-center/components/SettingsModal';
import { useGlobalOverlayScrollLock } from '@/shared/hooks/useBodyScrollLock';
import {
  loadPersistedCart,
  savePersistedCart,
  loadPersistedNavState,
  savePersistedNavState,
  resolveRestorableGuestPath,
  useGuestCartTabSync,
  type PersistedNavigationState,
} from '@/shared/hooks/useGuestSessionPersistence';
import { useEngagementAnalytics } from '@/shared/hooks/useEngagementAnalytics';

function AppInner() {
  useGlobalOverlayScrollLock();
  const { isDark, toggleTheme } = useTheme();
  const { activeLocation, setManualLocation } = useLocationSettings();
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const { firebaseUser, currentUser, setCurrentUser } = useAuth();
  const isGuestUser = !firebaseUser;

  const location = useLocation();
  const navigate = useNavigate();

  // Navigation & Modal States derived from Route
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);

  const currentTab = React.useMemo(() => resolveTabFromPath(location.pathname), [location.pathname]);

  const setCurrentTab = (tab: PortalTab) => {
    if (tab === 'commerce') {
      setActiveCommerceChildPortalId('all');
      setActivePortalFilter('all');
      setSelectedSubCategory('all');
    } else if (tab === 'services') {
      setActiveServicePortalId('all');
      setSelectedSubCategory('all');
    }
    navigate(PORTAL_TAB_ROUTES[tab] || ROUTE_PATHS.SOCIAL);
  };

  const initialNavRef = React.useRef<PersistedNavigationState | null>(null);
  if (!initialNavRef.current) {
    initialNavRef.current = loadPersistedNavState();
  }
  const restoredRootRoute = React.useMemo(
    () => resolveRestorableGuestPath(initialNavRef.current),
    []
  );

  const [initialSettingsSection, setInitialSettingsSection] = useState<SettingsSectionId>(
    () => initialNavRef.current!.initialSettingsSection
  );
  const [isHubOpen, setIsHubOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [isCloudGuideOpen, setIsCloudGuideOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isVoiceSearchOpen, setIsVoiceSearchOpen] = useState(false);
  const [isRfqModalOpen, setIsRfqModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isSuperAdminModalOpen, setIsSuperAdminModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [searchQuery, setSearchQuery] = useState(() => initialNavRef.current!.searchQuery);
  const [appliedPromoCode, setAppliedPromoCode] = useState(() => initialNavRef.current!.appliedPromoCode);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(() => initialNavRef.current!.selectedSubCategory);
  const [activePortalFilter, setActivePortalFilter] = useState<PortalFilterType>(() => initialNavRef.current!.activePortalFilter);
  const [activeLogisticsSubPortal, setActiveLogisticsSubPortal] = useState<'ride' | 'courier' | 'cargo' | 'fleet'>(
    () => initialNavRef.current!.activeLogisticsSubPortal
  );
  const [activeServicePortalId, setActiveServicePortalId] = useState(() => initialNavRef.current!.activeServicePortalId);
  const [activeCommerceChildPortalId, setActiveCommerceChildPortalId] = useState(
    () => initialNavRef.current!.activeCommerceChildPortalId
  );

  const { trackCartAdd, trackBuyNow, trackSearchQuery } = useEngagementAnalytics({
    userId: currentUser.id,
  });

  useEffect(() => {
    trackSearchQuery(searchQuery, { portal: currentTab });
  }, [searchQuery, currentTab, trackSearchQuery]);

  const handleCategoryBarPortalSwitch = (portal: PortalFilterType) => {
    const hubQuery =
      currentTab === 'commerce' || currentTab === 'wholesale'
        ? '?hub=marketplace'
        : currentTab === 'services'
        ? '?hub=services'
        : currentTab === 'rides'
        ? '?hub=logistics'
        : '';

    if (portal === 'demand') {
      navigate(`${ROUTE_PATHS.DEMAND}${hubQuery}`);
    } else if (portal === 'nearby') {
      navigate(`${ROUTE_PATHS.NEARBY}${hubQuery}`);
    } else if (portal === 'wholesale') {
      if (currentTab !== 'commerce' && currentTab !== 'wholesale') {
        setCurrentTab('wholesale');
      }
    } else if (portal === 'retail' || portal === 'used' || portal === 'all') {
      if (currentTab !== 'commerce') {
        setCurrentTab('commerce');
      }
    } else if (portal === 'services') {
      if (currentTab !== 'services') {
        setCurrentTab('services');
      }
    }
    setActivePortalFilter(portal);
  };

  const handleOpenAuthModal = (tab: 'login' | 'register' = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const handleOpenSettingsPortal = (section: SettingsSectionId = 'account_profile') => {
    setInitialSettingsSection(section);
    navigate('/settings');
  };

  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // Core Data States (hydrated from localStorage or mock defaults)
  const [posts, setPosts] = useState<SocialPost[]>(() => 
    loadStoredData('POSTS', INITIAL_POSTS)
  );

  const [commerceItems, setCommerceItems] = useState<CommerceItem[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState<boolean>(true);
  const [isFeedLoading, setIsFeedLoading] = useState<boolean>(true);
  const [pullDistance, setPullDistance] = useState<number>(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState<boolean>(false);
  const pullStartYRef = useRef<number | null>(null);
  const PULL_THRESHOLD = 72;

  const refreshPrimaryViewportData = useCallback(async (signal?: AbortSignal) => {
    setIsCatalogLoading(true);
    setIsFeedLoading(true);
    try {
      const [catalogResult, feedResult] = await Promise.all([
        fetchCatalogResult(signal),
        fetchSocialFeedResult(signal),
      ]);
      if (signal?.aborted) return;

      if (catalogResult.source === 'unconfigured') {
        setCommerceItems(loadStoredData('COMMERCE', INITIAL_COMMERCE_ITEMS));
      } else {
        if (catalogResult.products.length === 0) {
          try {
            localStorage.removeItem('nexsphere_commerce_v1');
          } catch {
            // Ignore storage access errors
          }
        }
        setCommerceItems(catalogResult.products);
      }

      if (feedResult.posts.length > 0) {
        setPosts((prev) => {
          const seenIds = new Set<string>();
          const merged: SocialPost[] = [];
          for (const post of [...feedResult.posts, ...prev]) {
            if (!seenIds.has(post.id)) {
              seenIds.add(post.id);
              merged.push(post);
            }
          }
          return merged;
        });
      }
    } finally {
      if (!signal?.aborted) {
        setIsCatalogLoading(false);
        setIsFeedLoading(false);
      }
    }
  }, []);

  // Supabase is the authoritative product catalog & live feed source.
  useEffect(() => {
    const controller = new AbortController();
    void refreshPrimaryViewportData(controller.signal);
    return () => controller.abort();
  }, [refreshPrimaryViewportData]);

  const triggerPullRefresh = useCallback(async () => {
    if (isPullRefreshing) return;
    setIsPullRefreshing(true);
    setPullDistance(56);
    try {
      await Promise.all([
        refreshPrimaryViewportData(),
        new Promise((resolve) => setTimeout(resolve, 500)),
      ]);
    } finally {
      setIsPullRefreshing(false);
      setPullDistance(0);
    }
  }, [isPullRefreshing, refreshPrimaryViewportData]);

  const handleViewportTouchStart = useCallback((e: React.TouchEvent<HTMLElement>) => {
    if (window.scrollY <= 2 && !isPullRefreshing && e.touches.length === 1) {
      pullStartYRef.current = e.touches[0].clientY;
    } else {
      pullStartYRef.current = null;
    }
  }, [isPullRefreshing]);

  const handleViewportTouchMove = useCallback((e: React.TouchEvent<HTMLElement>) => {
    if (pullStartYRef.current === null || isPullRefreshing) return;
    const delta = e.touches[0].clientY - pullStartYRef.current;
    if (delta > 0 && window.scrollY <= 2) {
      const damped = Math.min(110, Math.round(delta * 0.5));
      setPullDistance(damped);
    } else if (delta <= 0) {
      setPullDistance(0);
    }
  }, [isPullRefreshing]);

  const handleViewportTouchEnd = useCallback(() => {
    if (pullStartYRef.current === null) return;
    pullStartYRef.current = null;
    if (pullDistance >= PULL_THRESHOLD) {
      void triggerPullRefresh();
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, triggerPullRefresh]);

  const [cartItems, setCartItems] = useState<CartItem[]>(() => loadPersistedCart());
  
  const [orders, setOrders] = useState<Order[]>(() => 
    loadStoredData('ORDERS', INITIAL_ORDERS)
  );

  const [bookings, setBookings] = useState<ServiceBooking[]>(() => 
    loadStoredData('BOOKINGS', [])
  );

  const [notifications, setNotifications] = useState<AppNotification[]>(() => 
    loadStoredData('NOTIFICATIONS', INITIAL_NOTIFICATIONS)
  );

  // Sync to local storage
  useEffect(() => {
    saveStoredData('POSTS', posts);
  }, [posts]);

  useEffect(() => {
    if (commerceItems.length > 0) {
      saveStoredData('COMMERCE', commerceItems);
    }
  }, [commerceItems]);

  useEffect(() => {
    saveStoredData('ORDERS', orders);
  }, [orders]);

  useEffect(() => {
    saveStoredData('BOOKINGS', bookings);
  }, [bookings]);

  useEffect(() => {
    saveStoredData('USER', currentUser);
  }, [currentUser]);

  useEffect(() => {
    saveStoredData('NOTIFICATIONS', notifications);
  }, [notifications]);

  // Persist guest & session cart contents across page reloads
  useEffect(() => {
    savePersistedCart(cartItems);
  }, [cartItems]);

  // Sync cart changes across open browser tabs
  useGuestCartTabSync(setCartItems);

  // Persist local navigation path, active portal filters, and search/promo state
  useEffect(() => {
    const currentPath = `${location.pathname}${location.search}`;
    savePersistedNavState({
      lastPath: currentPath,
      searchQuery,
      appliedPromoCode,
      selectedSubCategory,
      activePortalFilter,
      activeLogisticsSubPortal,
      activeServicePortalId,
      activeCommerceChildPortalId,
      initialSettingsSection,
    });
  }, [
    location.pathname,
    location.search,
    searchQuery,
    appliedPromoCode,
    selectedSubCategory,
    activePortalFilter,
    activeLogisticsSubPortal,
    activeServicePortalId,
    activeCommerceChildPortalId,
    initialSettingsSection,
  ]);

  // Sync persistent notifications from backend PostgreSQL when authenticated
  useEffect(() => {
    if (!firebaseUser) return;
    let active = true;
    fetchUserNotificationsApi().then((serverNotifs) => {
      if (!active || !serverNotifs || serverNotifs.length === 0) return;
      setNotifications(serverNotifs);
    });
    return () => {
      active = false;
    };
  }, [firebaseUser]);

  // Scope visible notifications: guests are limited to up to 3 public system notices
  const visibleNotifications = React.useMemo(() => {
    if (!isGuestUser) return notifications;
    return notifications.filter((n) => n.type === 'system').slice(0, 3);
  }, [notifications, isGuestUser]);

  const unreadNotificationsCount = React.useMemo(
    () => visibleNotifications.filter((n) => !n.read).length,
    [visibleNotifications]
  );

  // Notification Handlers & Helpers
  const addNotification = (
    type: AppNotification['type'],
    title: string,
    message: string,
    actionTab?: PortalTab,
    avatar?: string
  ) => {
    // Guests cannot receive or accumulate private order, booking, wallet, or social notifications
    if (isGuestUser && type !== 'system') {
      return;
    }
    const optimisticId = `notif_${Date.now()}`;
    const newNotif: AppNotification = {
      id: optimisticId,
      type,
      title,
      message,
      timestamp: 'Just now',
      read: false,
      actionTab,
      avatar
    };
    setNotifications(prev => [newNotif, ...prev]);

    if (!isGuestUser) {
      void createUserNotificationApi({ type, title, message, actionTab, avatar }).then((saved) => {
        if (saved && saved.id) {
          setNotifications((prev) =>
            prev.map((item) => (item.id === optimisticId ? saved : item))
          );
        }
      });
    }
  };

  const handleMarkNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (!isGuestUser) {
      void markNotificationReadApi(id);
    }
  };

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (!isGuestUser) {
      void markAllNotificationsReadApi();
    }
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
    if (!isGuestUser) {
      void clearUserNotificationsApi();
    }
  };

  // Handlers for Social Feed
  const handleCreatePost = (
    content: string,
    taggedProduct?: TaggedProduct,
    mediaUrl?: string,
    postType: PostType = 'regular',
    citizenCategory: CitizenPostCategory = 'general',
    aiSafetyVerified: boolean = true,
    aiRiskAssessment: 'safe' | 'low_risk' | 'high_risk_flagged' = 'safe'
  ) => {
    const newPost: SocialPost = {
      id: `post_${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorHandle: currentUser.handle,
      authorAvatar: currentUser.avatar,
      authorVerified: currentUser.isVendor || currentUser.personalVerification?.status === 'verified',
      timestamp: 'Just now',
      content,
      mediaUrl,
      postType,
      citizenCategory,
      aiSafetyVerified,
      aiRiskAssessment,
      taggedProduct,
      reactionsCount: { like: 0, love: 0, care: 0 },
      sharesCount: 0,
      comments: []
    };

    setPosts([newPost, ...posts]);
    addNotification(
      'social',
      'Post Published 💬',
      'Your update was shared with the PaikarMart community feed.',
      'feed',
      currentUser.avatar
    );
  };

  const handleReactToPost = (postId: string, reaction: ReactionType) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;

      const currentRx = p.userReaction;
      const isSame = currentRx === reaction;
      const nextRx = isSame ? undefined : reaction;

      const counts = { ...p.reactionsCount };
      if (currentRx && counts[currentRx as keyof typeof counts] !== undefined) {
        counts[currentRx as keyof typeof counts] = Math.max(0, counts[currentRx as keyof typeof counts] - 1);
      }
      if (nextRx && counts[nextRx as keyof typeof counts] !== undefined) {
        counts[nextRx as keyof typeof counts] = counts[nextRx as keyof typeof counts] + 1;
      }

      return {
        ...p,
        userReaction: nextRx,
        reactionsCount: counts
      };
    }));
  };

  const handleAddComment = (postId: string, commentText: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;

      const newComment = {
        id: `c_${Date.now()}`,
        authorName: currentUser.name,
        authorAvatar: currentUser.avatar,
        content: commentText,
        timestamp: 'Just now',
        likes: 0
      };

      return {
        ...p,
        comments: [...p.comments, newComment]
      };
    }));
  };

  // Cart & Commerce Handlers
  const handleAddToCart = (
    product: CommerceItem, 
    quantity = 1, 
    isWholesale = false, 
    specialInstructions?: string
  ) => {
    trackCartAdd(product, quantity, isWholesale);
    setCartItems(prev => {
      const existing = prev.find(i => i.product.id === product.id && i.isWholesale === isWholesale);
      if (existing) {
        return prev.map(i => 
          i.product.id === product.id && i.isWholesale === isWholesale
            ? { ...i, quantity: i.quantity + quantity, specialInstructions: specialInstructions || i.specialInstructions }
            : i
        );
      }
      return [...prev, { product, quantity, isWholesale, specialInstructions }];
    });
  };

  const handleBuyNow = (
    product: CommerceItem,
    quantity = 1,
    isWholesale = false,
    specialInstructions?: string
  ) => {
    trackBuyNow(product, quantity, isWholesale);
    handleAddToCart(product, quantity, isWholesale, specialInstructions);
    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    setCartItems(prev => {
      const item = prev.find(i => i.product.id === productId);
      if (!item) return prev;

      if (quantity <= 0) {
        return prev.filter(i => i.product.id !== productId);
      }

      // Respect MOQ for wholesale
      if (item.isWholesale) {
        const moq = item.product.minWholesaleQty || 20;
        if (quantity < moq) {
          // If trying to go below MOQ via decrement, we remove it? 
          // Or just snap to MOQ. Let's snap to MOQ for now, 
          // and let the user use the trash icon to remove.
          quantity = moq;
        }
      }

      return prev.map(i => 
        i.product.id === productId ? { ...i, quantity } : i
      );
    });
  };

  const handleRemoveCartItem = (productId: string) => {
    setCartItems(prev => prev.filter(i => i.product.id !== productId));
  };

  const handleClearCart = () => {
    setCartItems([]);
    setAppliedPromoCode('');
  };

  const handleOrderPlaced = (newOrder: Order) => {
    setOrders([newOrder, ...orders]);
    addNotification(
      'order',
      'Order Confirmed! 📦',
      `Order #${newOrder.id} (৳${newOrder.total.toLocaleString()}) has been processed with Courier Tracking.`,
      'orders'
    );
    navigate('/portal/orders');
  };

  const handleUpdateOrder = (updatedOrder: Order) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
  };

  // Booking Handler for Services
  const handleBookService = (bookingData: Omit<ServiceBooking, 'id' | 'status'>) => {
    const newBooking: ServiceBooking = {
      id: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'scheduled',
      ...bookingData
    };
    setBookings([newBooking, ...bookings]);
    addNotification(
      'booking',
      'Service Booked! 🔧',
      `Booked ${bookingData.serviceTitle} with ${bookingData.providerName} for ${bookingData.date}.`,
      'services'
    );
  };

  // Vendor Onboarding & Management Handlers
  const handleCompleteVendorOnboarding = (profile: VendorProfile) => {
    const isApproved = profile.kycStatus ? profile.kycStatus === 'approved' : profile.verified;
    setCurrentUser(prev => ({
      ...prev,
      role: isApproved && prev.role === 'consumer' ? 'vendor' : prev.role,
      isVendor: isApproved,
      kycStatus: profile.kycStatus || (isApproved ? 'approved' : 'submitted'),
      trustLevel: profile.trustLevel || (isApproved ? 5 : 4),
      vendorProfile: profile
    }));
    addNotification(
      'system',
      isApproved ? 'Seller Central Activated' : 'Merchant KYC Submitted',
      isApproved
        ? `${profile.storeName} is verified and ready for listings & payouts.`
        : `${profile.storeName} application is queued for governance verification.`,
      'vendor-dash'
    );
    setCurrentTab('vendor-dash');
  };

  const handleAddNewProduct = (newProductData: Omit<CommerceItem, 'id' | 'rating' | 'reviewsCount'>) => {
    const newItem: CommerceItem = {
      id: `prod_${Date.now()}`,
      rating: 5.0,
      reviewsCount: 1,
      ...newProductData
    };
    setCommerceItems([newItem, ...commerceItems]);
  };

  const handleCreatePromoPost = (product: CommerceItem) => {
    const promoContent = `Special merchant announcement from ${product.storeName}! Check out our featured ${product.title} now available in our store portal. Tap below to buy or reserve:`;
    
    handleCreatePost(promoContent, {
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.imageUrl,
      category: product.category,
      storeName: product.storeName,
      type: product.type
    }, product.imageUrl);

    setCurrentTab('feed');
  };

  // Balance deduction for Creator Hub tips/unlocks
  const handleDeductBalance = (amount: number): boolean => {
    void amount;
    addNotification(
      'system',
      'Payments unavailable',
      'Wallet payments are paused until the secure payment service is configured.',
      'feed'
    );
    return false;
  };

  // Filtered posts based on top search bar
  const filteredPosts = posts.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.content.toLowerCase().includes(q) ||
      p.authorName.toLowerCase().includes(q) ||
      p.taggedProduct?.title.toLowerCase().includes(q) ||
      p.taggedProduct?.category.toLowerCase().includes(q)
    );
  });

  return (
    <WishlistProvider catalogItems={commerceItems}>
      <ProductComparisonProvider catalogItems={commerceItems}>
      <div className="min-h-screen max-w-full overflow-x-clip bg-[var(--pm-bg)] text-[var(--pm-text)] flex flex-col selection:bg-[var(--pm-accent)] selection:text-[var(--pm-accent-fg)] transition-colors">
      
      {/* Google Maps Quota Exhaustion Warning Banner */}
      {quotaExceeded && (
        <div className="bg-[var(--pm-warning-soft)] border-b border-[var(--pm-warning)]/30 text-[var(--pm-text)] px-4 py-2.5 text-xs md:text-sm text-center relative z-30 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-[var(--pm-accent)] hover:opacity-80"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* 1. Facebook-Style Sticky Top Navigation Bar */}
      <TopNavbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenHub={() => setCurrentTab('explore')}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenWallet={() => setIsWalletOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenLocationModal={() => setIsLocationModalOpen(true)}
        onUpdateLocation={(newLocation, coords) => {
          setCurrentUser(prev => ({
            ...prev,
            location: newLocation,
            coordinates: coords
          }));
          addNotification(
            'system',
            'Live Location Updated 📍',
            `Radar and delivery location set to: ${newLocation}`,
            'feed'
          );
        }}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onOpenVendorModal={() => setIsVendorModalOpen(true)}
        onOpenCloudGuide={() => setIsCloudGuideOpen(true)}
        cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
        currentUser={currentUser}
        isDarkMode={isDark}
        onToggleDarkMode={toggleTheme}
        onOpenSettings={() => handleOpenSettingsPortal('account_profile')}
        onOpenSuperAdminModal={() => setIsSuperAdminModalOpen(true)}
        onOpenAuthModal={handleOpenAuthModal}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenVoiceSearch={() => setIsVoiceSearchOpen(true)}
        onOpenRfqModal={() => setIsRfqModalOpen(true)}
        commerceItems={commerceItems}
        posts={posts}
      />

      {/* 2. Main Viewport: 3-Column Facebook Layout (Routing managed inside Center Column) */}
      <div className="max-w-7xl mx-auto w-full max-w-full px-3 sm:px-4 lg:px-6 pt-3 pb-24 md:pb-8 flex-1 flex justify-center gap-4 lg:gap-6 overflow-x-clip">
          <ScrollToTop />
          
          {/* Left Column (Desktop Shortcuts & Portal Switcher) */}
          <DesktopLeftNav
            currentTab={currentTab}
            onSelectTab={setCurrentTab}
            currentUser={currentUser}
            onOpenVendorModal={() => setIsVendorModalOpen(true)}
            onOpenCloudGuide={() => setIsCloudGuideOpen(true)}
            onOpenHub={() => setCurrentTab('explore')}
            onOpenWallet={() => setIsWalletOpen(true)}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            onOpenSettings={() => handleOpenSettingsPortal('account_profile')}
            onOpenSettingsPortal={handleOpenSettingsPortal}
            onOpenSuperAdminModal={() => setIsSuperAdminModalOpen(true)}
            onOpenCart={() => setIsCartOpen(true)}
            cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
            unreadNotificationsCount={unreadNotificationsCount}
            onOpenLocationModal={() => setIsLocationModalOpen(true)}
            onOpenAuthModal={handleOpenAuthModal}
            onQuickFilter={(query, targetTab) => {
              if (targetTab) setCurrentTab(targetTab);
              if (query) setSearchQuery(query);
            }}
          />

          {/* Center Primary Feed / Portal Viewport with Pull-to-Refresh */}
          <main
            onTouchStart={handleViewportTouchStart}
            onTouchMove={handleViewportTouchMove}
            onTouchEnd={handleViewportTouchEnd}
            className="w-full max-w-2xl flex-1 space-y-6 pb-12 relative"
          >
            {/* Pull-to-Refresh Visual Indicator */}
            <div
              aria-live="polite"
              style={{
                height: pullDistance > 0 || isPullRefreshing ? `${Math.max(44, pullDistance)}px` : '0px',
                opacity: pullDistance > 8 || isPullRefreshing ? 1 : 0,
              }}
              className="overflow-hidden transition-all duration-200 ease-out flex items-center justify-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--pm-card)] border border-[var(--pm-border)] shadow-sm text-xs font-semibold text-[var(--pm-text)]">
                {isPullRefreshing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-[var(--pm-accent)] animate-spin" />
                    <span>{isBn ? 'নতুন ডেটা আপডেট হচ্ছে...' : 'Refreshing live feed & catalog...'}</span>
                  </>
                ) : (
                  <>
                    <ArrowDown
                      className={`w-3.5 h-3.5 text-[var(--pm-accent)] transition-transform duration-150 ${
                        pullDistance >= PULL_THRESHOLD ? 'rotate-180' : ''
                      }`}
                    />
                    <span>
                      {pullDistance >= PULL_THRESHOLD
                        ? isBn
                          ? 'রিফ্রেশ করতে ছেড়ে দিন'
                          : 'Release to refresh'
                        : isBn
                        ? 'রিফ্রেশ করতে নিচে টানুন'
                        : 'Pull down to refresh'}
                    </span>
                  </>
                )}
              </div>
            </div>
            
            {/* Master 3-Tier Category Bar available across core portals (never on Social Feed) */}
            {['explore', 'commerce', 'wholesale', 'services', 'rides', 'demand', 'nearby'].includes(currentTab) && !location.pathname.includes('/product/') && (
              <CategoryBar
                isBn={isBn}
                activePortal={activePortalFilter}
                selectedSubCategory={selectedSubCategory}
                searchQuery={searchQuery}
                initialPillar={
                  currentTab === 'commerce'
                    ? 'commerce-hub'
                    : currentTab === 'wholesale'
                    ? 'wholesale-hub'
                    : currentTab === 'rides'
                    ? 'services-logistics-hub'
                    : currentTab === 'services'
                    ? 'services-hub'
                    : 'all'
                }
                activeChildPortalId={
                  currentTab === 'commerce'
                    ? activeCommerceChildPortalId
                    : currentTab === 'services'
                    ? activeServicePortalId
                    : undefined
                }
                onPortalSwitch={handleCategoryBarPortalSwitch}
                onSubCategorySelect={setSelectedSubCategory}
                onSearchFilter={(kw) => setSearchQuery(kw)}
                onSelectTab={setCurrentTab}
                onMainTileSelect={(tile) => {
                  if (tile.id === 'c-all-home') {
                    setActiveCommerceChildPortalId('all');
                  } else if (tile.id.startsWith('c-')) {
                    setActiveCommerceChildPortalId(tile.id);
                  }
                  if (currentTab === 'services') {
                    if (tile.id === 'service-all-home') {
                      setActiveServicePortalId('all');
                    } else if (tile.id.startsWith('service-')) {
                      setActiveServicePortalId(tile.id.replace(/^service-/, '').replace(/-home$/, ''));
                    }
                  }
                  if (
                    tile.id === 's-ride-home' ||
                    tile.id === 's-emergency-home' ||
                    tile.id === 'service-ride-home' ||
                    tile.id === 'service-emergency-home'
                  ) {
                    setActiveLogisticsSubPortal('ride');
                  } else if (
                    tile.id === 'service-logistics-home' ||
                    tile.id === 's-transport-home' ||
                    tile.id === 'service-transport-home'
                  ) {
                    setActiveLogisticsSubPortal('courier');
                  } else if (tile.id === 's-rent-home' || tile.id === 'service-rent-home') {
                    setActiveLogisticsSubPortal('cargo');
                  }
                }}
              />
            )}

          <AppRouteManifest
            currentTab={currentTab}
            defaultRootRoute={restoredRootRoute}
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            posts={posts}
            filteredPosts={filteredPosts}
            commerceItems={commerceItems}
            isCatalogLoading={isCatalogLoading}
            isFeedLoading={isFeedLoading}
            orders={orders}
            bookings={bookings}
            notifications={notifications}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            appliedPromoCode={appliedPromoCode}
            activePortalFilter={activePortalFilter}
            selectedSubCategory={selectedSubCategory}
            activeCommerceChildPortalId={activeCommerceChildPortalId}
            activeServicePortalId={activeServicePortalId}
            activeLogisticsSubPortal={activeLogisticsSubPortal}
            initialSettingsSection={initialSettingsSection}
            setCurrentTab={setCurrentTab}
            navigate={navigate}
            onOpenVendorModal={() => setIsVendorModalOpen(true)}
            onOpenCloudGuide={() => setIsCloudGuideOpen(true)}
            onOpenWallet={() => setIsWalletOpen(true)}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            onOpenAuthModal={handleOpenAuthModal}
            onOpenSettingsPortal={handleOpenSettingsPortal}
            onOpenSuperAdminModal={() => setIsSuperAdminModalOpen(true)}
            onCreatePost={handleCreatePost}
            onReactToPost={handleReactToPost}
            onAddComment={handleAddComment}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            onSelectVoucher={(code) => {
              setAppliedPromoCode(code);
              if (cartItems.length > 0) {
                setIsCartOpen(true);
              } else {
                addNotification(
                  'system',
                  'Voucher Applied to Checkout',
                  `Promo code ${code} copied and saved for your next bag checkout.`,
                  'commerce'
                );
              }
            }}
            onOrderPlaced={handleOrderPlaced}
            onUpdateOrder={handleUpdateOrder}
            onReorderOrder={(newOrder) => {
              setOrders((prev) => [newOrder, ...prev]);
              addNotification(
                'order',
                'Reorder Placed! 📦',
                `Order #${newOrder.id} (৳${newOrder.total.toLocaleString()}) queued for dispatch.`,
                'orders'
              );
            }}
            onBookService={handleBookService}
            onDeductBalance={handleDeductBalance}
            onAddNewProduct={handleAddNewProduct}
            onCreatePromoPost={handleCreatePromoPost}
            onMarkNotificationAsRead={handleMarkNotificationAsRead}
            onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
            onClearAllNotifications={handleClearAllNotifications}
          />

        </main>

        {/* Right Column (Desktop Sponsored, Cart Widget, Verified Sellers, AI Trending Topics) */}
        <DesktopRightSidebar
          activeOrders={orders}
          onOpenCart={() => setIsCartOpen(true)}
          featuredProducts={commerceItems}
          onAddToCart={(item) => handleAddToCart(item, 1, item.type === 'wholesale')}
          onOpenStorePortal={(type) => setCurrentTab(type)}
          posts={posts}
          onSelectTopic={(topic) => setSearchQuery(topic)}
        />

      </div>

      {/* 3. Mobile Bottom App Bar (Thumb-zone navigation) */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenHub={() => setCurrentTab('explore')}
        onOpenCart={() => setIsCartOpen(true)}
        cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
        currentUser={currentUser}
      />

      {/* 4. Full-Screen Super App Portal Hub Modal */}
      <SuperAppHubModal
        isOpen={isHubOpen}
        onClose={() => setIsHubOpen(false)}
        onSelectTab={setCurrentTab}
        onOpenVendorModal={() => setIsVendorModalOpen(true)}
        onOpenCloudGuide={() => setIsCloudGuideOpen(true)}
        isVendor={currentUser.isVendor}
      />

      {/* 5. Multi-Role Multi-Capability 5-Step KYC Onboarding Modal */}
      <MultiRoleOnboardingModal
        isOpen={isVendorModalOpen}
        onClose={() => setIsVendorModalOpen(false)}
        applicantId={currentUser.id}
        onCompleteOnboarding={handleCompleteVendorOnboarding}
      />

      {/* 6. Unified Cart & Checkout Slide-Over Drawer */}
      <CartCheckoutDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onOrderPlaced={handleOrderPlaced}
        currentUser={currentUser}
        initialPromoCode={appliedPromoCode}
      />

      {/* 7. Multi-Cloud Deployment Guide (Render + Vercel + Supabase + Firebase) */}
      <DeploymentGuideModal
        isOpen={isCloudGuideOpen}
        onClose={() => setIsCloudGuideOpen(false)}
      />

      {/* 8. Facebook-Style Advanced Menu Sidebar Drawer */}
      <SidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentUser={currentUser}
        onSelectTab={setCurrentTab}
        onOpenVendorModal={() => setIsVendorModalOpen(true)}
        onOpenCloudGuide={() => setIsCloudGuideOpen(true)}
        onOpenWallet={() => setIsWalletOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenSettings={() => handleOpenSettingsPortal('account_profile')}
        onOpenSettingsPortal={handleOpenSettingsPortal}
        onOpenSuperAdminModal={() => setIsSuperAdminModalOpen(true)}
        onOpenCart={() => setIsCartOpen(true)}
        cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenLocationModal={() => setIsLocationModalOpen(true)}
        onOpenAuthModal={handleOpenAuthModal}
        onQuickFilter={(query, targetTab) => {
          if (targetTab) setCurrentTab(targetTab);
          if (query) setSearchQuery(query);
        }}
        isDarkMode={isDark}
        onToggleDarkMode={toggleTheme}
      />

      {/* 10. Real-Time Notifications Center */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={visibleNotifications}
        onMarkAsRead={handleMarkNotificationAsRead}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        onClearAll={handleClearAllNotifications}
        onSelectTab={setCurrentTab}
        isGuest={isGuestUser}
        onOpenAuthModal={handleOpenAuthModal}
      />

      {/* 11. Google Maps Location Picker Modal */}
      <LocationPickerModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={activeLocation || currentUser.location}
        onSelectLocation={(newLoc, coords) => {
          setManualLocation(newLoc, coords);
          setCurrentUser(prev => ({ ...prev, location: newLoc, coordinates: coords }));
        }}
      />

      {/* 12. Centralized Modular Settings Modal (Theme, Language, Location Radar) */}
      <SettingsModal
        onOpenLocationModal={() => setIsLocationModalOpen(true)}
      />

      {/* 13. Global Messaging Center Modal */}
      <MessagingCenterModal
        isOpen={isMessagingOpen}
        onClose={() => setIsMessagingOpen(false)}
      />

      {/* 14. Developer Restricted Super Admin Control Center Modal */}
      <SuperAdminControlModal
        isOpen={isSuperAdminModalOpen}
        onClose={() => setIsSuperAdminModalOpen(false)}
        onUpdateUserRole={(targetUserId, newRole) => {
          setCurrentUser(prev => prev.id === targetUserId ? { ...prev, role: newRole } : prev);
        }}
      />

      {/* 15. Real Auth Portal Modal (Email/Password & Google Sign In) */}
      <AuthPortalModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialTab={authModalTab}
      />

      {/* 16. Quick Wallet & Escrow Modal */}
      <WalletModal
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
        currentUser={currentUser}
        onUpdateUser={setCurrentUser}
      />

      {/* 17. Side-by-Side Product Comparison Floating Tray & Modal */}
      <CompareTrayBar />
      <ProductComparisonModal onAddToCart={handleAddToCart} />

      {/* PWA Device Installation Prompt & Offline Service Worker */}
      <PwaInstallBanner />

      {/* AI Voice Search & Assistant Modal */}
      <VoiceSearchModal
        isOpen={isVoiceSearchOpen}
        onClose={() => setIsVoiceSearchOpen(false)}
        onSearchApplied={(q) => setSearchQuery(q)}
      />

      {/* Option 4: AI Demand Forecasting & Bulk RFQ Modal */}
      <RfqAndForecastingModal
        isOpen={isRfqModalOpen}
        onClose={() => setIsRfqModalOpen(false)}
        currentUser={currentUser}
      />
    </div>
      </ProductComparisonProvider>
    </WishlistProvider>
  );
}

export default function App() {
  return (
    <AppProviders>
      <AppInner />
    </AppProviders>
  );
}
