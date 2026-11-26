import React from 'react';
import {
  Search,
  ShoppingCart,
  Menu,
  Bell,
  X,
  ArrowLeft,
  LogIn,
  Settings as SettingsIcon,
  Heart,
  Mic,
} from 'lucide-react';
import { PortalTab, User } from '@/types';
import { TopNavLocationMenu } from '@/components/layout/TopNavLocationMenu';
import { DEFAULT_AVATAR_URL, safeMediaSrc } from '@/shared/utils';

export type MobileHeaderConfig =
  | { mode: 'feed' }
  | { mode: 'commerce'; placeholder: string }
  | {
      mode: 'detail';
      title: string;
      subtitle: string;
      action: 'cart' | 'notifications' | 'settings' | 'close' | 'location';
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
  onOpenSettings?: () => void;
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
  onOpenSettings,
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
  return (
    <div ref={containerRef} className="flex md:hidden flex-col w-full relative">
      {/* MODE 1: FEED / HOME */}
      {mobileConfig.mode === 'feed' && (
        <>
          <div className="h-14 px-3 flex items-center justify-between gap-2 w-full">
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

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onToggleMobileSearch}
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

              {!hasFirebaseUser && onOpenAuthModal ? (
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
                  {hasFirebaseUser && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[var(--pm-success)] border-2 border-[var(--pm-card)] rounded-full" />
                  )}
                </button>
              )}
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
          <button
            type="button"
            onClick={onMobileBack}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] text-[var(--pm-text)] active:scale-95 transition-all shrink-0 cursor-pointer"
            aria-label={isBn ? 'ফিরে যান' : 'Go back'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

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
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={onMobileBack}
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
                onClick={onMobileBack}
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
      {renderDropdown(mobileConfig.mode === 'feed' && isMobileSearchOpen ? 'top-28' : 'top-16')}
    </div>
  );
};
