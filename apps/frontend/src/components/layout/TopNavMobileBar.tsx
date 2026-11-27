import React from 'react';
import {
  Search,
  ShoppingCart,
  Menu,
  Bell,
  X,
  ArrowLeft,
  LogIn,
  Heart,
  Mic,
} from 'lucide-react';
import { PortalTab, User } from '@/types';
import { TopNavLocationMenu } from '@/components/layout/TopNavLocationMenu';
import { Button, IconButton } from '@/components/shared/Button';

export type MobileHeaderConfig =
  | { mode: 'feed' }
  | { mode: 'commerce'; placeholder: string; showBack?: boolean }
  | {
      mode: 'detail';
      title: string;
      subtitle: string;
      action: 'cart' | 'notifications' | 'close' | 'location' | 'none';
      showBack?: boolean;
    };

interface TopNavMobileBarProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isBn: boolean;
  mobileConfig: MobileHeaderConfig;
  searchQuery: string;
  isMobileSearchOpen: boolean;
  wishlistCount: number;
  cartCount: number;
  unreadNotificationsCount: number;
  currentUser: User;
  hasFirebaseUser: boolean;
  onOpenSidebar: () => void;
  onSelectTab: (tab: PortalTab) => void;
  onOpenCart: () => void;
  onOpenNotifications: () => void;
  onOpenAuthModal?: (tab?: 'login' | 'register') => void;
  onOpenLocationModal?: () => void;
  onUpdateLocation?: (newLocation: string, coordinates?: { lat: number; lng: number }) => void;
  onOpenVoiceSearch?: () => void;
  onSearchChange: (q: string) => void;
  onToggleMobileSearch: () => void;
  onCloseMobileSearch: () => void;
  onFocusSearch: () => void;
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onMobileBack: () => void;
  renderDropdown: (customTopClass?: string) => React.ReactNode;
}

export const TopNavMobileBar: React.FC<TopNavMobileBarProps> = ({
  containerRef,
  isBn,
  mobileConfig,
  searchQuery,
  isMobileSearchOpen,
  wishlistCount,
  cartCount,
  unreadNotificationsCount,
  currentUser,
  hasFirebaseUser,
  onOpenSidebar,
  onSelectTab,
  onOpenCart,
  onOpenNotifications,
  onOpenAuthModal,
  onOpenLocationModal,
  onUpdateLocation,
  onOpenVoiceSearch,
  onSearchChange,
  onToggleMobileSearch,
  onCloseMobileSearch,
  onFocusSearch,
  onSearchKeyDown,
  onMobileBack,
  renderDropdown,
}) => {
  const showBackButton = mobileConfig.mode !== 'feed' && mobileConfig.showBack !== false;

  return (
    <div ref={containerRef} className="flex md:hidden flex-col w-full relative">
      {/* MODE 1: FEED / HOME */}
      {mobileConfig.mode === 'feed' && (
        <>
          <div className="h-14 px-3 flex items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-2 min-w-0">
              <IconButton
                label={isBn ? 'মেনু খুলুন' : 'Open menu'}
                size="icon"
                variant="secondary"
                onClick={onOpenSidebar}
                className="active:scale-95"
              >
                <Menu className="w-5 h-5" />
              </IconButton>
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

            <div className="flex items-center gap-1.5 shrink-0">
              <IconButton
                label="Search"
                title={isBn ? 'সার্চ করুন' : 'Search'}
                size="icon-sm"
                variant={isMobileSearchOpen || searchQuery ? 'primary' : 'secondary'}
                onClick={onToggleMobileSearch}
                className="active:scale-95"
              >
                <Search className="w-4 h-4" />
              </IconButton>

              <IconButton
                label="Wishlist"
                title={isBn ? 'উইশলিস্ট' : 'Wishlist'}
                size="icon-sm"
                variant="secondary"
                onClick={() => onSelectTab('wishlist')}
                className="relative active:scale-95"
              >
                <Heart className={`w-4 h-4 ${wishlistCount > 0 ? 'text-rose-500 fill-rose-500' : ''}`} />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-[var(--pm-card)]">
                    {wishlistCount > 99 ? '99+' : wishlistCount}
                  </span>
                )}
              </IconButton>

              <IconButton
                label="Cart"
                title={isBn ? 'কার্ট' : 'Cart'}
                size="icon-sm"
                variant="secondary"
                onClick={onOpenCart}
                className="relative active:scale-95"
              >
                <ShoppingCart className="w-4 h-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[var(--pm-danger)] text-white text-[9px] font-black flex items-center justify-center ring-2 ring-[var(--pm-card)]">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </IconButton>

              {!hasFirebaseUser && onOpenAuthModal ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => onOpenAuthModal('login')}
                  className="gap-1 font-bold shadow-xs active:scale-95"
                  title={isBn ? 'লগইন' : 'Login'}
                  aria-label="Login"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{isBn ? 'লগইন' : 'Login'}</span>
                </Button>
              ) : null}
            </div>
          </div>

          {(isMobileSearchOpen || Boolean(searchQuery)) && (
            <div className="px-3 pb-2.5 pt-0.5 animate-fadeIn">
              <div className="relative flex items-center w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--pm-accent)] pointer-events-none" />
                <input
                  type="text"
                  autoFocus={isMobileSearchOpen && !searchQuery}
                  value={searchQuery}
                  onFocus={onFocusSearch}
                  onKeyDown={onSearchKeyDown}
                  onChange={(e) => {
                    onSearchChange(e.target.value);
                    onFocusSearch();
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
                    onClick={onCloseMobileSearch}
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
          {showBackButton ? (
            <IconButton
              label={isBn ? 'আগের পৃষ্ঠায় ফিরুন' : 'Back to previous page'}
              title={isBn ? 'আগের পৃষ্ঠায় ফিরুন' : 'Back to previous page'}
              size="icon"
              variant="secondary"
              onClick={onMobileBack}
              className="min-w-11 shrink-0 active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </IconButton>
          ) : (
            <IconButton
              label={isBn ? 'মেনু খুলুন' : 'Open menu'}
              title={isBn ? 'মেনু খুলুন' : 'Open menu'}
              size="icon"
              variant="secondary"
              onClick={onOpenSidebar}
              className="min-w-11 shrink-0 active:scale-95"
            >
              <Menu className="w-5 h-5" />
            </IconButton>
          )}

          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--pm-muted)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onFocus={onFocusSearch}
              onKeyDown={onSearchKeyDown}
              onChange={(e) => {
                onSearchChange(e.target.value);
                onFocusSearch();
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

          <div className="flex items-center gap-1.5 shrink-0">
            <IconButton
              label="Wishlist"
              title={isBn ? 'উইশলিস্ট' : 'Wishlist'}
              size="icon-sm"
              variant="secondary"
              onClick={() => onSelectTab('wishlist')}
              className="relative active:scale-95"
            >
              <Heart className={`w-4 h-4 ${wishlistCount > 0 ? 'text-rose-500 fill-rose-500' : ''}`} />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-[var(--pm-card)]">
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </span>
              )}
            </IconButton>

            <IconButton
              label="Cart"
              title={isBn ? 'কার্ট' : 'Cart'}
              size="icon-sm"
              variant="secondary"
              onClick={onOpenCart}
              className="relative active:scale-95"
            >
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[var(--pm-danger)] text-white text-[9px] font-black flex items-center justify-center ring-2 ring-[var(--pm-card)]">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </IconButton>
          </div>
        </div>
      )}

      {/* MODE 3: DETAIL, SUB-PAGE & UTILITY PORTALS */}
      {mobileConfig.mode === 'detail' && (
        <div className="h-14 px-3 flex items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {showBackButton && (
              <IconButton
                label={isBn ? 'আগের পৃষ্ঠায় ফিরুন' : 'Back to previous page'}
                title={isBn ? 'আগের পৃষ্ঠায় ফিরুন' : 'Back to previous page'}
                size="icon"
                variant="secondary"
                onClick={onMobileBack}
                className="min-w-11 shrink-0 active:scale-95"
              >
                <ArrowLeft className="w-5 h-5" />
              </IconButton>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-[var(--pm-text)] leading-tight truncate">
                {mobileConfig.title}
              </h1>
              <p className="text-xs sm:text-[13px] text-[var(--pm-muted)] leading-4 truncate">
                {mobileConfig.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {mobileConfig.action === 'cart' && (
              <IconButton
                label="Cart"
                title={isBn ? 'কার্ট' : 'Cart'}
                size="icon-sm"
                variant="secondary"
                onClick={onOpenCart}
                className="relative active:scale-95"
              >
                <ShoppingCart className="w-4 h-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[var(--pm-danger)] text-white text-[9px] font-black flex items-center justify-center ring-2 ring-[var(--pm-card)]">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </IconButton>
            )}

            {mobileConfig.action === 'notifications' && (
              <IconButton
                label="Notifications"
                title={isBn ? 'নোটিফিকেশন' : 'Notifications'}
                size="icon-sm"
                variant="secondary"
                onClick={onOpenNotifications}
                className="relative active:scale-95"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] text-[9px] font-black flex items-center justify-center ring-2 ring-[var(--pm-card)]">
                    {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                  </span>
                )}
              </IconButton>
            )}

            {mobileConfig.action === 'close' && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onMobileBack}
                className="h-9 px-3 text-xs font-bold active:scale-95"
                aria-label="Close"
              >
                <X className="w-4 h-4 mr-1" />
                <span>{isBn ? 'বন্ধ' : 'Close'}</span>
              </Button>
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
      {renderDropdown(mobileConfig.mode === 'feed' && isMobileSearchOpen ? 'top-28' : 'top-16')}
    </div>
  );
};
