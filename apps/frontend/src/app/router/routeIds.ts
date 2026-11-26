import type { PortalTab } from '@/types';
import { ROUTE_PATHS } from '@/shared/constants/routes';

export { ROUTE_PATHS };

export const PORTAL_TAB_ROUTES: Record<PortalTab, string> = {
  feed: ROUTE_PATHS.SOCIAL,
  explore: ROUTE_PATHS.EXPLORE,
  hub: ROUTE_PATHS.EXPLORE,
  commerce: ROUTE_PATHS.MARKETPLACE_HUB,
  wholesale: ROUTE_PATHS.WHOLESALE,
  services: ROUTE_PATHS.SERVICES_HUB,
  rides: ROUTE_PATHS.TRANSIT,
  creator: ROUTE_PATHS.CREATOR,
  'community-hub': ROUTE_PATHS.COMMUNITY_HUB,
  'utility-hub': ROUTE_PATHS.UTILITY_HUB,
  'vendor-dash': ROUTE_PATHS.SELLER,
  profile: ROUTE_PATHS.PROFILE,
  notifications: ROUTE_PATHS.NOTIFICATIONS,
  settings: ROUTE_PATHS.SETTINGS,
  orders: ROUTE_PATHS.ORDERS,
  wallet: ROUTE_PATHS.WALLET,
  messages: ROUTE_PATHS.MESSAGES,
  guide: ROUTE_PATHS.GUIDE,
  demand: ROUTE_PATHS.DEMAND,
  nearby: ROUTE_PATHS.NEARBY,
  wishlist: ROUTE_PATHS.WISHLIST,
};

export function resolveTabFromPath(pathname: string): PortalTab {
  if (pathname === '/' || pathname.startsWith('/portal/social')) return 'feed';
  if (pathname.startsWith('/hub/community')) return 'community-hub';
  if (pathname.startsWith('/hub/utility')) return 'utility-hub';
  if (pathname.startsWith('/portal/explore')) return 'explore';
  if (pathname.startsWith('/portal/marketplace') || pathname.startsWith('/hub/marketplace')) return 'commerce';
  if (pathname.startsWith('/portal/wholesale')) return 'wholesale';
  if (pathname.startsWith('/portal/services') || pathname.startsWith('/hub/services')) return 'services';
  if (pathname.startsWith('/portal/transit')) return 'rides';
  if (pathname.startsWith('/portal/creator')) return 'creator';
  if (pathname.startsWith('/portal/seller')) return 'vendor-dash';
  if (pathname.startsWith('/portal/demand')) return 'demand';
  if (pathname.startsWith('/portal/nearby')) return 'nearby';
  if (pathname.startsWith('/portal/wishlist')) return 'wishlist';
  if (pathname.startsWith('/portal/profile')) return 'profile';
  if (pathname.startsWith('/portal/notifications')) return 'notifications';
  if (pathname.startsWith('/portal/orders')) return 'orders';
  if (pathname.startsWith('/portal/wallet')) return 'wallet';
  if (pathname.startsWith('/portal/messages')) return 'messages';
  if (pathname.startsWith('/portal/guide')) return 'guide';
  if (pathname.startsWith('/settings')) return 'settings';
  return 'feed';
}
