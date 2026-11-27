import { ROUTE_PATHS } from '@/app/router/routeIds';

const COMING_SOON_ROUTES: Array<{ path: string; featureName: string }> = [
  { path: ROUTE_PATHS.SELLER_INVENTORY, featureName: 'Seller inventory' },
  { path: ROUTE_PATHS.SERVICES_HUB, featureName: 'Local services' },
  { path: ROUTE_PATHS.SERVICES_LEGACY, featureName: 'Local services' },
  { path: ROUTE_PATHS.COMMUNITY_HUB, featureName: 'Community hub' },
  { path: ROUTE_PATHS.UTILITY_HUB, featureName: 'Business tools' },
  { path: ROUTE_PATHS.WHOLESALE, featureName: 'Wholesale and B2B' },
  { path: ROUTE_PATHS.TRANSIT, featureName: 'Rides and logistics' },
  { path: ROUTE_PATHS.CREATOR, featureName: 'Creator studio' },
  { path: ROUTE_PATHS.SOCIAL, featureName: 'Social feed' },
  { path: ROUTE_PATHS.SELLER, featureName: 'Seller Central' },
  { path: ROUTE_PATHS.WALLET, featureName: 'Wallet and online payments' },
  { path: ROUTE_PATHS.MESSAGES, featureName: 'Messaging' },
  { path: ROUTE_PATHS.DEMAND, featureName: 'Demand board' },
  { path: ROUTE_PATHS.NEARBY, featureName: 'Nearby services' },
  { path: ROUTE_PATHS.WISHLIST, featureName: 'Wishlist' },
  { path: '/u', featureName: 'Public profiles' },
  { path: '/store', featureName: 'Public storefronts' },
];

export function getComingSoonFeature(pathname: string): string | null {
  const normalizedPath = pathname.replace(/\/+$/, '') || ROUTE_PATHS.ROOT;
  const match = COMING_SOON_ROUTES.find(({ path }) => (
    normalizedPath === path || normalizedPath.startsWith(`${path}/`)
  ));
  return match?.featureName || null;
}
