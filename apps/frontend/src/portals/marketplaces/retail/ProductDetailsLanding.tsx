import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Heart, Share2, AlertCircle, Scale, Check } from 'lucide-react';
import { CommerceItem, User, Order } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProductDetailsSkeleton } from '@/design-system/components';
import { useEngagementAnalytics } from '@/shared/hooks/useEngagementAnalytics';
import { useProductComparison, useWishlist } from '@/features/marketplace';

interface ProductDetailsLandingProps {
  currentUser: User;
  onUpdateUser: (user: User) => void;
  onOrderPlaced: (order: Order) => void;
  commerceItems: CommerceItem[];
  isLoading?: boolean;
  onOpenAuthModal?: (tab?: 'login' | 'register') => void;
}

export const ProductDetailsLanding: React.FC<ProductDetailsLandingProps> = ({
  currentUser,
  onUpdateUser,
  onOrderPlaced,
  commerceItems,
  isLoading = false,
  onOpenAuthModal,
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const { trackProductView } = useEngagementAnalytics({ userId: currentUser.id });
  const { isCompared, toggleCompare } = useProductComparison();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const matchedProduct = id
    ? commerceItems.find((item) => item.id === id)
    : commerceItems[0];
  const product = matchedProduct || (!isLoading ? commerceItems[0] : undefined);

  React.useEffect(() => {
    if (product?.id) {
      trackProductView(product, 'product_details_page');
    }
  }, [product, trackProductView]);

  React.useEffect(() => {
    if (!product || typeof document === 'undefined') return;

    const prevTitle = document.title;
    const canonicalEl = document.querySelector('link[rel="canonical"]');
    const prevCanonical = canonicalEl?.getAttribute('href') || '';
    const productUrl = `${window.location.origin}/hub/marketplace/product/${encodeURIComponent(product.id)}`;

    document.title = `${product.title} — PaikarMart`;
    if (canonicalEl) {
      canonicalEl.setAttribute('href', productUrl);
    }

    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', productUrl);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', `${product.title} — PaikarMart`);

    const scriptId = 'paikarmart-product-jsonld';
    let scriptEl = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = scriptId;
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }

    scriptEl.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      description: product.description || `${product.title} from ${product.storeName} on PaikarMart.`,
      image: product.imageUrl ? [product.imageUrl] : undefined,
      category: product.category,
      sku: product.id,
      brand: {
        '@type': 'Brand',
        name: product.storeName || 'PaikarMart Verified Seller',
      },
      offers: {
        '@type': 'Offer',
        url: productUrl,
        priceCurrency: 'BDT',
        price: String(product.price),
        availability: 'https://schema.org/InStock',
      },
      ...(typeof product.rating === 'number' && typeof product.reviewsCount === 'number'
        ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: String(product.rating),
              reviewCount: String(Math.max(1, product.reviewsCount)),
            },
          }
        : {}),
    });

    return () => {
      document.title = prevTitle;
      if (canonicalEl && prevCanonical) {
        canonicalEl.setAttribute('href', prevCanonical);
      }
      document.getElementById(scriptId)?.remove();
    };
  }, [product]);

  if (!product && isLoading) {
    return <ProductDetailsSkeleton />;
  }

  if (!product) {
    return (
      <div className="p-12 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-[var(--pm-muted)] mx-auto" />
        <h2 className="text-xl font-bold text-[var(--pm-text)]">Product Not Found</h2>
        <button onClick={() => navigate(-1)} className="text-[var(--pm-accent)] font-bold cursor-pointer">Go Back</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-28 px-4 pt-6 animate-fadeIn">
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--pm-card)] border border-[var(--pm-border)] text-xs font-bold cursor-pointer">
          <ArrowLeft className="w-4 h-4" />
          <span>{isBn ? 'ফিরে যান' : 'Back'}</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleWishlist(product)}
            aria-pressed={isWishlisted(product.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
              isWishlisted(product.id)
                ? 'bg-rose-500 text-white border-rose-500'
                : 'bg-[var(--pm-card)] border-[var(--pm-border)] text-[var(--pm-text)] hover:border-rose-500 hover:text-rose-500'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isWishlisted(product.id) ? 'fill-white' : ''}`} />
            <span>{isWishlisted(product.id) ? (isBn ? 'সংরক্ষিত' : 'Saved') : isBn ? 'সেভ করুন' : 'Wishlist'}</span>
          </button>
          <button
            type="button"
            onClick={() => toggleCompare(product)}
            aria-pressed={isCompared(product.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
              isCompared(product.id)
                ? 'bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] border-transparent'
                : 'bg-[var(--pm-card)] border-[var(--pm-border)] text-[var(--pm-text)] hover:border-[var(--pm-accent)]'
            }`}
          >
            {isCompared(product.id) ? <Check className="w-3.5 h-3.5" /> : <Scale className="w-3.5 h-3.5 text-[var(--pm-accent)]" />}
            <span>{isCompared(product.id) ? (isBn ? 'তুলনায় যুক্ত' : 'In Compare') : isBn ? 'তুলনা করুন' : 'Compare'}</span>
          </button>
          <span className="text-xs font-black uppercase text-[var(--pm-accent)]">{product.category}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[var(--pm-card)] p-6 rounded-3xl border border-[var(--pm-border)] shadow-md">
        <div className="aspect-square rounded-2xl overflow-hidden bg-[var(--pm-surface)]">
          <img src={product.imageUrl} alt={product.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
        </div>
        <div className="space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <h1 className="text-xl font-black text-[var(--pm-text)]">{product.title}</h1>
            <p className="text-2xl font-mono font-black text-[var(--pm-accent)]">৳{product.price.toLocaleString()}</p>
            <p className="text-xs text-[var(--pm-muted)] leading-relaxed">{product.description}</p>
          </div>
          <div className="pt-4 border-t border-[var(--pm-border)] flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onOrderPlaced({
                  id: `ORD-${Date.now()}`,
                  createdAt: new Date().toISOString(),
                  items: [{ product, quantity: 1, isWholesale: false }],
                  subtotal: product.price,
                  deliveryFee: 60,
                  tax: Math.round(product.price * 0.05),
                  total: product.price + 60 + Math.round(product.price * 0.05),
                  status: 'confirmed',
                  deliveryAddress: currentUser.location || 'Dhaka',
                  paymentMethod: 'Cash on Delivery',
                  estimatedArrival: 'Same Day',
                  trackingStep: 1,
                  buyerName: currentUser.name,
                  buyerPhone: currentUser.phone || '',
                  storeId: product.storeId,
                  storeName: product.storeName,
                });
                navigate('/portal/orders');
              }}
              className="flex-1 py-3 rounded-xl bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] font-black text-xs uppercase tracking-wider cursor-pointer shadow-md"
            >
              {isBn ? 'এখনই অর্ডার করুন (COD)' : 'Buy Now (COD)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
