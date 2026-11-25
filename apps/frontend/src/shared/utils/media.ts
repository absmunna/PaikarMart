export const DEFAULT_AVATAR_URL =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80';

export const DEFAULT_PRODUCT_IMAGE_URL =
  '/src/assets/images/paikarmart_fresh_grocery_1794489814176.jpg';

/**
 * Ensures an empty string ("") is never passed to a DOM `src` attribute
 * (which causes React 19 warnings and spurious full-page network fetches).
 */
export function safeMediaSrc(
  value?: string | null,
  fallback: string = DEFAULT_PRODUCT_IMAGE_URL
): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return fallback;
}
