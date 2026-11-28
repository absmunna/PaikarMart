import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, ArrowDown } from 'lucide-react';
import { 
  PortalTab, 
  CommerceItem, 
  Order, 
  ServiceBooking, 
  VendorProfile,
} from '@/types';
import { saveStoredData } from '@/lib/supabase';

import { matchPath, useLocation, useNavigate } from 'react-router-dom';

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
  useCartStore,
  useCatalogStore,
  type PortalFilterType
} from '@/features/marketplace';
import { useSocialFeedStore } from '@/features/social';
import { NotificationsModal } from '@/portals/utilities/notifications-center/components/NotificationsModal';
import { MessagingCenterModal } from '@/features/messaging';
import { SuperAdminControlModal } from '@/features/governance';
import { PwaInstallBanner } from '@/features/pwa/PwaInstallBanner';
import { VoiceSearchModal } from '@/features/ai-voice/VoiceSearchModal';
import { useNotificationsStore } from '@/features/notifications/useNotificationsStore';
import { useOrdersStore } from '@/features/orders';
import { useBookingsStore } from '@/features/services';
import { MultiRoleOnboardingModal } from '@/features/vendors';

// Application Bootstrap, Routing, Contexts & Shared Hooks
import { AppProviders } from '@/app/providers/AppProviders';
import { PORTAL_TAB_ROUTES, resolveTabFromPath, ROUTE_PATHS } from '@/app/router/routeIds';
import { getComingSoonFeature } from '@/app/router/featureAvailability';
import { AppRouteManifest } from '@/app/router/routeManifest';
import { usePrimaryViewportRefresh } from '@/app/hooks/usePrimaryViewportRefresh';
import { useTheme, useLanguage, useLocationSettings, useAuth } from '@/contexts';
import type { SettingsSectionId } from '@/types';
import { SettingsModal } from '@/portals/utilities/settings-center/components/SettingsModal';
import { useGlobalOverlayScrollLock } from '@/shared/hooks/useBodyScrollLock';
import {
  loadPersistedNavState,
  savePersistedNavState,
  resolveRestorableGuestPath,
  type PersistedNavigationState,
} from '@/shared/hooks/useGuestSessionPersistence';
import { useEngagementAnalytics } from '@/shared/hooks/useEngagementAnalytics';

function AppInner() {
  useGlobalOverlayScrollLock();
  const { isDark, toggleTheme } = useTheme();
  const { activeLocation, activeArea, setManualLocation } = useLocationSettings();
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const { firebaseUser, currentUser, setCurrentUser, loading: isAuthLoading } = useAuth();
  const isGuestUser = !firebaseUser;

  const location = useLocation();
  const navigate = useNavigate();
  const isProductDetailsRoute = Boolean(
    matchPath(ROUTE_PATHS.PRODUCT_DETAILS, location.pathname) ||
    matchPath(ROUTE_PATHS.PRODUCT_DETAILS_LEGACY, location.pathname)
  );

  // Navigation & Modal States derived from Route
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);

  const currentTab = React.useMemo(() => resolveTabFromPath(location.pathname), [location.pathname]);
  const shouldShowMarketplaceCategoryBar =
    location.pathname.replace(/\/+$/, '') === ROUTE_PATHS.MARKETPLACE_HUB;

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
    () => {
      const restoredPath = resolveRestorableGuestPath(initialNavRef.current);
      return getComingSoonFeature(restoredPath) ? ROUTE_PATHS.MARKETPLACE_HUB : restoredPath;
    },
    []
  );

  const [initialSettingsSection, setInitialSettingsSection] = useState<SettingsSectionId>(
    () => initialNavRef.current!.initialSettingsSection
  );
  const [isHubOpen, setIsHubOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCloudGuideOpen, setIsCloudGuideOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isVoiceSearchOpen, setIsVoiceSearchOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isSuperAdminModalOpen, setIsSuperAdminModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isVendorOnboardingOpen, setIsVendorOnboardingOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [searchQuery, setSearchQuery] = useState(() => initialNavRef.current!.searchQuery);
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

  const {
    cartItems,
    cartCount,
    appliedPromoCode,
    setAppliedPromoCode,
    handleAddToCart,
    handleBuyNow,
    handleUpdateCartQuantity,
    handleRemoveCartItem,
    handleClearCart,
  } = useCartStore({
    initialPromoCode: initialNavRef.current!.appliedPromoCode,
    onTrackCartAdd: trackCartAdd,
    onTrackBuyNow: trackBuyNow,
    onOpenCart: () => setIsCartOpen(true),
  });

  const {
    notifications,
    visibleNotifications,
    unreadNotificationsCount,
    isNotificationsLoading,
    addNotification,
    handleMarkNotificationAsRead,
    handleMarkAllNotificationsAsRead,
    handleClearAllNotifications,
  } = useNotificationsStore(Boolean(firebaseUser));

  const { orders, addOrder, updateOrder } = useOrdersStore();

  const {
    posts,
    savedPostIds,
    isFeedLoading,
    refreshServerPosts,
    handleCreatePost,
    handleReactToPost,
    handleAddComment,
    handleToggleSavedPost,
  } = useSocialFeedStore({
    currentUser,
    onPostCreated: () => {
      addNotification(
        'social',
        'Post Published 💬',
        'Your update was shared with the PaikarMart community feed.',
        'feed',
        currentUser.avatar
      );
    },
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

  const handleOpenVendorOnboarding = () => {
    if (!firebaseUser) {
      handleOpenAuthModal('login');
      return;
    }
    setIsVendorOnboardingOpen(true);
  };

  const handleCompleteVendorOnboarding = (vendorProfile: VendorProfile) => {
    const isApproved = vendorProfile.kycStatus
      ? vendorProfile.kycStatus === 'approved'
      : vendorProfile.verified;
    setCurrentUser((user) => {
      const vendorProfiles = [
        ...(user.vendorProfiles || []).filter((profile) => profile.id !== vendorProfile.id),
        vendorProfile,
      ];
      return {
        ...user,
        role: isApproved && user.role === 'consumer' ? 'vendor' : user.role,
        kycStatus: vendorProfile.kycStatus || (isApproved ? 'approved' : 'submitted'),
        trustLevel: vendorProfile.trustLevel || (isApproved ? 5 : 4),
        vendorProfile,
        vendorProfiles,
        activeVendorId: vendorProfile.id,
        isVendor: isApproved,
      };
    });
  };

  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  const {
    commerceItems,
    isCatalogLoading,
    catalogNotice,
    refreshCatalog,
    addCommerceItem,
  } = useCatalogStore();
  const {
    pullDistance,
    isPullRefreshing,
    pullThreshold,
    handleViewportTouchStart,
    handleViewportTouchMove,
    handleViewportTouchEnd,
  } = usePrimaryViewportRefresh({ refreshCatalog, refreshServerPosts });

  const { bookings, addBooking } = useBookingsStore();

  useEffect(() => {
    saveStoredData('USER', currentUser);
  }, [currentUser]);

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

  const handleOrderPlaced = (newOrder: Order) => {
    addOrder(newOrder);
    addNotification(
      'order',
      'Order Confirmed! 📦',
      `Order #${newOrder.id} (৳${newOrder.total.toLocaleString()}) has been processed with Courier Tracking.`,
      'orders'
    );
    navigate('/portal/orders');
  };

  const handleUpdateOrder = (updatedOrder: Order) => {
    updateOrder(updatedOrder);
  };

  // Booking Handler for Services
  const handleBookService = (bookingData: Omit<ServiceBooking, 'id' | 'status'>) => {
    const newBooking: ServiceBooking = {
      id: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'scheduled',
      ...bookingData
    };
    addBooking(newBooking);
    addNotification(
      'booking',
      'Service Booked! 🔧',
      `Booked ${bookingData.serviceTitle} with ${bookingData.providerName} for ${bookingData.date}.`,
      'services'
    );
  };

  const handleAddNewProduct = (newProductData: Omit<CommerceItem, 'id' | 'rating' | 'reviewsCount'>) => {
    const newItem: CommerceItem = {
      id: `prod_${Date.now()}`,
      rating: 5.0,
      reviewsCount: 1,
      ...newProductData
    };
    addCommerceItem(newItem);
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

  // Wallet deductions must be verified by server escrow/gateway webhooks rather than optimistic client subtraction.
  const handleDeductBalance = (amount: number): boolean => {
    if (isGuestUser) {
      addNotification(
        'system',
        'Sign in required',
        `Please sign in to pay ৳${amount.toLocaleString()} via Wallet or Escrow.`,
        'wallet'
      );
      handleOpenAuthModal('login');
      return false;
    }
    navigate(ROUTE_PATHS.WALLET);
    addNotification(
      'system',
      'Use Verified Wallet & Escrow',
      `Instant wallet deductions require verified Escrow/Gateway checkout (৳${amount.toLocaleString()}).`,
      'wallet'
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
        onOpenWallet={() => navigate(ROUTE_PATHS.WALLET)}
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
        onOpenCloudGuide={() => setIsCloudGuideOpen(true)}
        cartCount={cartCount}
        currentUser={currentUser}
        isDarkMode={isDark}
        onToggleDarkMode={toggleTheme}
        onOpenSuperAdminModal={() => setIsSuperAdminModalOpen(true)}
        onOpenAuthModal={handleOpenAuthModal}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenVoiceSearch={() => setIsVoiceSearchOpen(true)}
        onOpenRfqModal={() => navigate(ROUTE_PATHS.DEMAND)}
        commerceItems={commerceItems}
        posts={posts}
      />

      {/* 2. Main Viewport: 3-Column Facebook Layout (Routing managed inside Center Column) */}
      <div className={`${isProductDetailsRoute ? 'max-w-none' : 'max-w-7xl'} mx-auto w-full px-3 sm:px-4 lg:px-6 pt-4 sm:pt-5 md:pt-6 pb-24 md:pb-8 flex-1 flex justify-center gap-4 lg:gap-6 overflow-x-clip relative z-10`}>
          <ScrollToTop />
          
          {/* Left Column (Desktop Shortcuts & Portal Switcher) */}
          <DesktopLeftNav
            currentTab={currentTab}
            onSelectTab={setCurrentTab}
            currentUser={currentUser}
            onOpenVendorModal={handleOpenVendorOnboarding}
            onOpenSellerInventory={() => navigate(ROUTE_PATHS.SELLER_INVENTORY)}
            onOpenCloudGuide={() => setIsCloudGuideOpen(true)}
            onOpenSettingsPortal={handleOpenSettingsPortal}
            onOpenSuperAdminModal={() => setIsSuperAdminModalOpen(true)}
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
            className={`w-full ${isProductDetailsRoute ? 'max-w-none' : 'max-w-2xl space-y-4 md:space-y-6'} flex-1 pb-12 relative z-10`}
          >
            {/* Pull-to-Refresh Visual Indicator */}
            {(pullDistance > 0 || isPullRefreshing) && (
              <div
                aria-live="polite"
                style={{
                  height: `${Math.max(44, pullDistance)}px`,
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
                          pullDistance >= pullThreshold ? 'rotate-180' : ''
                        }`}
                      />
                      <span>
                        {pullDistance >= pullThreshold
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
            )}
            
            {/* Marketplace browsing owns this shared category rail; other portals provide their own filters. */}
            {shouldShowMarketplaceCategoryBar && (
              <CategoryBar
                isBn={isBn}
                activePortal={activePortalFilter}
                selectedSubCategory={selectedSubCategory}
                searchQuery={searchQuery}
                initialPillar="commerce-hub"
                activeChildPortalId={activeCommerceChildPortalId}
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
                }}
              />
            )}

          <AppRouteManifest
            currentTab={currentTab}
            defaultRootRoute={restoredRootRoute}
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            posts={posts}
            savedPostIds={savedPostIds}
            filteredPosts={filteredPosts}
            commerceItems={commerceItems}
            isCatalogLoading={isCatalogLoading}
            catalogNotice={catalogNotice}
            isFeedLoading={isFeedLoading}
            isNotificationsLoading={isNotificationsLoading}
            isAuthLoading={isAuthLoading}
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
            onOpenCloudGuide={() => setIsCloudGuideOpen(true)}
            onOpenWallet={() => navigate(ROUTE_PATHS.WALLET)}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            onOpenAuthModal={handleOpenAuthModal}
            onOpenSuperAdminModal={() => setIsSuperAdminModalOpen(true)}
            onOpenVendorModal={handleOpenVendorOnboarding}
            onOpenSettingsPortal={handleOpenSettingsPortal}
            onCreatePost={handleCreatePost}
            onReactToPost={handleReactToPost}
            onAddComment={handleAddComment}
            onToggleSavedPost={handleToggleSavedPost}
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
              addOrder(newOrder);
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
        {!isProductDetailsRoute && (
          <DesktopRightSidebar
            activeOrders={orders}
            onOpenCart={() => setIsCartOpen(true)}
            featuredProducts={commerceItems}
            onAddToCart={(item) => handleAddToCart(item, 1, item.type === 'wholesale')}
            onOpenStorePortal={(type) => setCurrentTab(type)}
            posts={posts}
            onSelectTopic={(topic) => setSearchQuery(topic)}
          />
        )}

      </div>

      {/* 3. Mobile Bottom App Bar (Thumb-zone navigation) */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenHub={() => setCurrentTab('explore')}
        onOpenCart={() => setIsCartOpen(true)}
        cartCount={cartCount}
        currentUser={currentUser}
      />

      {/* 4. Full-Screen Super App Portal Hub Modal */}
      <SuperAppHubModal
        isOpen={isHubOpen}
        onClose={() => setIsHubOpen(false)}
        onSelectTab={setCurrentTab}
        onOpenCloudGuide={() => setIsCloudGuideOpen(true)}
        isVendor={currentUser.isVendor}
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
        onOpenVendorModal={handleOpenVendorOnboarding}
        onOpenSellerInventory={() => navigate(ROUTE_PATHS.SELLER_INVENTORY)}
        onOpenCloudGuide={() => setIsCloudGuideOpen(true)}
        onOpenSettingsPortal={handleOpenSettingsPortal}
        onOpenSuperAdminModal={() => setIsSuperAdminModalOpen(true)}
        onOpenLocationModal={() => setIsLocationModalOpen(true)}
        onOpenAuthModal={handleOpenAuthModal}
        onQuickFilter={(query, targetTab) => {
          if (targetTab) setCurrentTab(targetTab);
          if (query) setSearchQuery(query);
        }}
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
        currentArea={activeArea}
        onSelectLocation={(newLoc, coords, area) => {
          setManualLocation(newLoc, coords, area);
          setCurrentUser(prev => ({ ...prev, location: newLoc, coordinates: coords }));
        }}
      />

      {/* 12. Centralized Modular Settings Modal (Appearance, Language, Location, Team Access) */}
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

      <MultiRoleOnboardingModal
        isOpen={isVendorOnboardingOpen}
        onClose={() => setIsVendorOnboardingOpen(false)}
        applicantId={firebaseUser?.uid}
        onCompleteOnboarding={handleCompleteVendorOnboarding}
      />

      {/* Side-by-side product comparison */}
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
