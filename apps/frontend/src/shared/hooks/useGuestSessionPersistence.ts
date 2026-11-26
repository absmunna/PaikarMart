import { useEffect } from 'react';
import type { CartItem, SettingsSectionId } from '@/types';
import type { PortalFilterType } from '@/features/marketplace';
import { PUBLIC_RESTORABLE_PREFIXES, ROUTE_PATHS } from '@/shared/constants/routes';

export const GUEST_CART_STORAGE_KEY = 'paikarmart_guest_cart_v1';
export const GUEST_NAV_STORAGE_KEY = 'paikarmart_guest_nav_v1';
export const GUEST_CHECKOUT_DRAFT_KEY = 'paikarmart_guest_checkout_draft_v1';

const NAV_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const VALID_PORTAL_FILTERS: ReadonlySet<PortalFilterType> = new Set([
  'all',
  'retail',
  'wholesale',
  'used',
  'services',
  'demand',
  'nearby',
]);

const VALID_LOGISTICS_PORTALS: ReadonlySet<'ride' | 'courier' | 'cargo' | 'fleet'> = new Set([
  'ride',
  'courier',
  'cargo',
  'fleet',
]);

const VALID_SETTINGS_SECTIONS: ReadonlySet<SettingsSectionId> = new Set([
  'appearance',
  'language',
  'location',
  'about',
  'account_profile',
  'account_security',
  'account_addresses',
  'account_payments',
  'account_notifications',
  'vendor_store',
  'vendor_kyc',
  'vendor_payout',
  'vendor_fulfillment',
  'vendor_hours',
]);

// PUBLIC_RESTORABLE_PREFIXES imported from @/shared/constants/routes

export interface PersistedNavigationState {
  lastPath: string;
  searchQuery: string;
  appliedPromoCode: string;
  selectedSubCategory: string;
  activePortalFilter: PortalFilterType;
  activeLogisticsSubPortal: 'ride' | 'courier' | 'cargo' | 'fleet';
  activeServicePortalId: string;
  activeCommerceChildPortalId: string;
  initialSettingsSection: SettingsSectionId;
  updatedAt: number;
}

export interface GuestCheckoutDraft {
  name: string;
  phone: string;
  email: string;
  address: string;
  courier: string;
  paymentMethod: string;
}

export const DEFAULT_NAVIGATION_STATE: PersistedNavigationState = {
  lastPath: ROUTE_PATHS.SOCIAL,
  searchQuery: '',
  appliedPromoCode: '',
  selectedSubCategory: 'all',
  activePortalFilter: 'all',
  activeLogisticsSubPortal: 'ride',
  activeServicePortalId: 'all',
  activeCommerceChildPortalId: 'all',
  initialSettingsSection: 'account_profile',
  updatedAt: 0,
};

export function isGuestRestorablePath(pathWithSearch: string): boolean {
  if (!pathWithSearch || typeof pathWithSearch !== 'string') return false;
  const pathname = pathWithSearch.split('?')[0].split('#')[0];
  if (!pathname || pathname === ROUTE_PATHS.ROOT) return false;
  return PUBLIC_RESTORABLE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix)
  );
}

export function resolveRestorableGuestPath(
  navState?: PersistedNavigationState | null
): string {
  if (!navState || !navState.lastPath) return ROUTE_PATHS.SOCIAL;
  const isExpired =
    navState.updatedAt > 0 && Date.now() - navState.updatedAt > NAV_TTL_MS;
  if (isExpired) return ROUTE_PATHS.SOCIAL;
  return isGuestRestorablePath(navState.lastPath)
    ? navState.lastPath
    : ROUTE_PATHS.SOCIAL;
}

function isValidCartItem(candidate: unknown): candidate is CartItem {
  if (!candidate || typeof candidate !== 'object') return false;
  const item = candidate as Partial<CartItem>;
  if (!item.product || typeof item.product !== 'object') return false;
  if (typeof item.product.id !== 'string' || !item.product.id) return false;
  if (typeof item.product.title !== 'string') return false;
  if (typeof item.product.price !== 'number' || Number.isNaN(item.product.price)) return false;
  if (typeof item.quantity !== 'number' || !Number.isFinite(item.quantity) || item.quantity <= 0) {
    return false;
  }
  return true;
}

export function loadPersistedCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(GUEST_CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidCartItem);
  } catch (err) {
    console.warn('[GuestSession] Failed to load persisted cart from localStorage:', err);
    return [];
  }
}

export function savePersistedCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    const sanitized = items.filter(isValidCartItem);
    window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.warn('[GuestSession] Failed to persist cart to localStorage:', err);
  }
}

export function loadPersistedNavState(): PersistedNavigationState {
  if (typeof window === 'undefined') return { ...DEFAULT_NAVIGATION_STATE };
  try {
    const raw = window.localStorage.getItem(GUEST_NAV_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_NAVIGATION_STATE };
    const parsed = JSON.parse(raw) as Partial<PersistedNavigationState>;
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_NAVIGATION_STATE };
    }

    return {
      lastPath:
        typeof parsed.lastPath === 'string' && isGuestRestorablePath(parsed.lastPath)
          ? parsed.lastPath
          : DEFAULT_NAVIGATION_STATE.lastPath,
      searchQuery:
        typeof parsed.searchQuery === 'string'
          ? parsed.searchQuery.slice(0, 120)
          : '',
      appliedPromoCode:
        typeof parsed.appliedPromoCode === 'string'
          ? parsed.appliedPromoCode.slice(0, 40)
          : '',
      selectedSubCategory:
        typeof parsed.selectedSubCategory === 'string' && parsed.selectedSubCategory
          ? parsed.selectedSubCategory.slice(0, 64)
          : 'all',
      activePortalFilter:
        parsed.activePortalFilter && VALID_PORTAL_FILTERS.has(parsed.activePortalFilter)
          ? parsed.activePortalFilter
          : 'all',
      activeLogisticsSubPortal:
        parsed.activeLogisticsSubPortal &&
        VALID_LOGISTICS_PORTALS.has(parsed.activeLogisticsSubPortal)
          ? parsed.activeLogisticsSubPortal
          : 'ride',
      activeServicePortalId:
        typeof parsed.activeServicePortalId === 'string' && parsed.activeServicePortalId
          ? parsed.activeServicePortalId.slice(0, 64)
          : 'all',
      activeCommerceChildPortalId:
        typeof parsed.activeCommerceChildPortalId === 'string' &&
        parsed.activeCommerceChildPortalId
          ? parsed.activeCommerceChildPortalId.slice(0, 64)
          : 'all',
      initialSettingsSection:
        parsed.initialSettingsSection &&
        VALID_SETTINGS_SECTIONS.has(parsed.initialSettingsSection)
          ? parsed.initialSettingsSection
          : 'account_profile',
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
    };
  } catch (err) {
    console.warn('[GuestSession] Failed to load persisted navigation state:', err);
    return { ...DEFAULT_NAVIGATION_STATE };
  }
}

export function savePersistedNavState(
  partial: Partial<PersistedNavigationState>
): void {
  if (typeof window === 'undefined') return;
  try {
    const current = loadPersistedNavState();
    const nextPath =
      typeof partial.lastPath === 'string' && isGuestRestorablePath(partial.lastPath)
        ? partial.lastPath
        : current.lastPath;

    const merged: PersistedNavigationState = {
      ...current,
      ...partial,
      lastPath: nextPath,
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(GUEST_NAV_STORAGE_KEY, JSON.stringify(merged));
  } catch (err) {
    console.warn('[GuestSession] Failed to persist navigation state:', err);
  }
}

export function loadGuestCheckoutDraft(): GuestCheckoutDraft {
  const defaults: GuestCheckoutDraft = {
    name: '',
    phone: '',
    email: '',
    address: '',
    courier: 'Pathao Express',
    paymentMethod: 'Cash on Delivery',
  };
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(GUEST_CHECKOUT_DRAFT_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<GuestCheckoutDraft>;
    if (!parsed || typeof parsed !== 'object') return defaults;
    return {
      name: typeof parsed.name === 'string' ? parsed.name.slice(0, 100) : '',
      phone: typeof parsed.phone === 'string' ? parsed.phone.slice(0, 32) : '',
      email: typeof parsed.email === 'string' ? parsed.email.slice(0, 160) : '',
      address: typeof parsed.address === 'string' ? parsed.address.slice(0, 300) : '',
      courier: typeof parsed.courier === 'string' && parsed.courier ? parsed.courier : 'Pathao Express',
      paymentMethod:
        typeof parsed.paymentMethod === 'string' && parsed.paymentMethod
          ? parsed.paymentMethod
          : 'Cash on Delivery',
    };
  } catch {
    return defaults;
  }
}

export function saveGuestCheckoutDraft(draft: GuestCheckoutDraft): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GUEST_CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
  } catch (err) {
    console.warn('[GuestSession] Failed to save guest checkout draft:', err);
  }
}

export function clearGuestCheckoutDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(GUEST_CHECKOUT_DRAFT_KEY);
  } catch {
    // Ignore storage removal failure
  }
}

/**
 * Syncs cart state across open browser tabs via the window 'storage' event.
 */
export function useGuestCartTabSync(onExternalCartUpdate: (items: CartItem[]) => void): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== GUEST_CART_STORAGE_KEY) return;
      onExternalCartUpdate(loadPersistedCart());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [onExternalCartUpdate]);
}
