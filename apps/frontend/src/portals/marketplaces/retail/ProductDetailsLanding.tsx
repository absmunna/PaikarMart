import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  BadgeCheck,
  Banknote,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Heart,
  Info,
  ListChecks,
  MessageCircle,
  Scale,
  ShoppingBag,
  Star,
  Store,
  Truck,
} from 'lucide-react';
import { CommerceItem, ProductVariantOption, User, SellerListing } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProductDetailsSkeleton } from '@/design-system/components';
import { useEngagementAnalytics } from '@/shared/hooks/useEngagementAnalytics';
import { ProductEngagementSection } from '@/features/marketplace/components/ProductEngagementSection';
import {
  OtherSellersModal,
  fetchSellerListingsByPmin,
  fetchSellerListingsForMaster,
  getSellerListingsForMasterProduct,
  useProductComparison,
  useWishlist,
} from '@/features/marketplace';

interface ProductDetailsLandingProps {
  currentUser: User;
  commerceItems: CommerceItem[];
  onAddToCart: (
    product: CommerceItem,
    quantity?: number,
    isWholesale?: boolean,
    specialInstructions?: string,
    selectedVariant?: string
  ) => void;
  onBuyNow: (
    product: CommerceItem,
    quantity?: number,
    isWholesale?: boolean,
    specialInstructions?: string,
    selectedVariant?: string
  ) => void;
  isLoading?: boolean;
}

function getVariantLabel(
  options: ProductVariantOption[],
  selections: Record<string, string>
): string {
  return options.map((option) => selections[option.id]).filter(Boolean).join(' · ');
}

function getVariantOffer(product: CommerceItem, variantLabel: string) {
  if (!variantLabel) return undefined;
  return product.variantOffers?.find(
    (offer) => offer.key === variantLabel || offer.label === variantLabel
  );
}

function getInitialVariantSelections(product?: CommerceItem): Record<string, string> {
  const options = product?.variantOptions || [];
  if (!product || options.length === 0) return {};

  const preferredOffer = product.variantOffers?.find(
    (offer) => offer.price === product.price && (offer.stockQuantity ?? 0) > 0
  ) || product.variantOffers?.find((offer) => (offer.stockQuantity ?? 0) > 0);
  const preferredValues = (preferredOffer?.key || preferredOffer?.label || '').split(' · ');

  return Object.fromEntries(options.map((option) => [
    option.id,
    preferredValues.find((value) => option.values.includes(value)) || option.values[0] || '',
  ]));
}

function isValidSwatch(value?: string): value is string {
  return Boolean(value && /^#[\da-f]{6}$/i.test(value));
}

function getColorSwatch(value: string, configuredSwatch?: string): string {
  if (isValidSwatch(configuredSwatch)) return configuredSwatch;

  const normalized = value.toLowerCase();
  if (normalized.includes('blue')) return '#7189a6';
  if (normalized.includes('black')) return '#303238';
  if (normalized.includes('natural') || normalized.includes('silver') || normalized.includes('gray') || normalized.includes('grey')) {
    return '#b8b2a7';
  }
  if (normalized.includes('white')) return '#f8fafc';
  if (normalized.includes('red')) return '#dc2626';
  if (normalized.includes('green')) return '#16a34a';
  if (normalized.includes('gold')) return '#d6b35a';
  if (normalized.includes('purple') || normalized.includes('violet')) return '#827c8e';
  if (normalized.includes('pink')) return '#ec4899';
  return '#94a3b8';
}

function getCompactColorLabel(value: string): string {
  return value.replace(/\s+titanium$/i, '').replace(/^titanium\s+/i, '') || value;
}

export const ProductDetailsLanding: React.FC<ProductDetailsLandingProps> = ({
  currentUser,
  commerceItems,
  onAddToCart,
  onBuyNow,
  isLoading = false,
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const { trackProductView } = useEngagementAnalytics({ userId: currentUser.id });
  const { isCompared, toggleCompare } = useProductComparison();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const product = id ? commerceItems.find((item) => item.id === id) : undefined;
  const [sellerOffers, setSellerOffers] = useState<SellerListing[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<SellerListing | null>(null);
  const [isCompareSellersOpen, setIsCompareSellersOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeImageFailed, setActiveImageFailed] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'specifications' | 'feedback'>('overview');
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  useEffect(() => {
    setSelectedOffer(null);
    if (!product) {
      setSellerOffers([]);
      return;
    }

    const fallbackOffers = product.masterProductId
      ? getSellerListingsForMasterProduct(product.masterProductId)
      : [];
    setSellerOffers(fallbackOffers);

    if (!product.pmin && !product.masterProductId) return;
    let active = true;
    const controller = new AbortController();

    const loadOffers = async () => {
      if (product.pmin) {
        const res = await fetchSellerListingsByPmin(product.pmin, controller.signal);
        if (active && res.listings.length > 0) {
          setSellerOffers(res.listings);
          return;
        }
      }
      if (product.masterProductId) {
        const res = await fetchSellerListingsForMaster(product.masterProductId, controller.signal);
        if (active && res.listings.length > 0) {
          setSellerOffers(res.listings);
        }
      }
    };

    void loadOffers();
    return () => {
      active = false;
      controller.abort();
    };
  }, [product]);

  React.useEffect(() => {
    if (product?.id) {
      trackProductView(product, 'product_details_page');
    }
  }, [product, trackProductView]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [product?.id, selectedOffer?.id]);

  useEffect(() => {
    setActiveTab('overview');
  }, [product?.id]);

  useEffect(() => {
    if (product && window.location.hash === '#feedback') {
      setActiveTab('feedback');
      document.getElementById('product-information-panel')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [product?.id]);

  useEffect(() => {
    setSelectedVariants(getInitialVariantSelections(product));
  }, [product]);

  useEffect(() => {
    setActiveImageFailed(false);
  }, [product?.id, selectedOffer?.id, activeImageIndex]);

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
      image: [product.imageUrl, ...(product.galleryImages || [])].filter(Boolean),
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
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="hidden md:inline-flex min-h-11 items-center text-[var(--pm-accent)] font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-accent)]"
        >
          Go Back
        </button>
      </div>
    );
  }

  const variantOptions = product.variantOptions || [];
  const hasColorVariant = variantOptions.some((option) =>
    option.id.toLowerCase().includes('color') || option.label.toLowerCase().includes('color')
  );
  const selectedVariantLabel = getVariantLabel(variantOptions, selectedVariants);
  const selectedVariantOffer = getVariantOffer(product, selectedVariantLabel);
  const hasVariantOffers = Boolean(product.variantOffers?.length);
  const variantUnavailable = hasVariantOffers && !selectedVariantOffer;
  const variantOutOfStock = selectedVariantOffer?.stockQuantity === 0;
  const activePrice = selectedOffer
    ? selectedOffer.price
    : selectedVariantOffer?.price ?? product.price;
  const activeShippingFee = selectedOffer
    ? Number(selectedOffer.shippingFee ?? 0)
    : Number(product.shippingFee ?? 60);
  const activeStoreId = selectedOffer ? selectedOffer.sellerId : product.storeId;
  const activeStoreName = selectedOffer ? selectedOffer.sellerName : product.storeName;
  const activeEta = selectedOffer ? selectedOffer.deliveryEta : product.deliveryEta;
  const productImages = Array.from(new Set([
    product.imageUrl,
    ...(product.galleryImages || []),
    ...(selectedOffer?.sellerRealPhotos?.length
      ? selectedOffer.sellerRealPhotos
      : product.sellerRealPhotos || []),
  ].filter((image): image is string => Boolean(image))));
  const activeImage = productImages[activeImageIndex] || product.imageUrl;
  const isWholesalePurchase = (selectedOffer?.tradeMode || product.tradeMode) === 'wholesale';
  const purchaseQuantity = isWholesalePurchase
    ? Math.max(1, selectedOffer?.minWholesaleQty || product.minWholesaleQty || 1)
    : 1;
  const canUseCashCheckout =
    product.type !== 'service' &&
    product.type !== 'rides' &&
    !/digital|software|download/i.test(product.subCategory || '');
  const offerCount = sellerOffers.length || product.masterOfferCount || 0;
  const isOutOfStock = !product.inStock ||
    (selectedOffer
      ? selectedOffer.stockQuantity <= 0
      : variantUnavailable || variantOutOfStock);
  const purchaseProduct: CommerceItem = {
    ...product,
    ...(selectedOffer
      ? {
          id: selectedOffer.id,
          originalPrice: selectedOffer.originalPrice ?? product.originalPrice,
          shippingFee: activeShippingFee,
          storeId: activeStoreId,
          storeName: activeStoreName,
          deliveryEta: activeEta,
          tradeMode: selectedOffer.tradeMode,
          minWholesaleQty: selectedOffer.minWholesaleQty,
        }
      : {}),
    price: activePrice,
  };
  const isOptionAvailable = (option: ProductVariantOption, value: string) => {
    if (!hasVariantOffers) return true;
    const candidateSelections = { ...selectedVariants, [option.id]: value };
    const candidateOffer = getVariantOffer(product, getVariantLabel(variantOptions, candidateSelections));
    return Boolean(candidateOffer && (candidateOffer.stockQuantity ?? 0) > 0);
  };

  return (
    <div className="w-full space-y-2 sm:space-y-5 pb-28 pt-0 sm:pt-2 animate-fadeIn">
      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-2.5 sm:gap-5 xl:gap-8">
        <div className="space-y-2">
          <div className="relative aspect-[16/10] sm:aspect-[4/3] max-h-[460px] 2xl:aspect-square 2xl:max-h-[620px] overflow-hidden rounded-2xl sm:rounded-3xl border border-[var(--pm-border)] bg-[var(--pm-card)]">
            {activeImageFailed ? (
              <div role="status" className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-xs text-[var(--pm-muted)]">
                <AlertCircle className="h-6 w-6" />
                {isBn ? 'এই ছবিটি এখন লোড করা যাচ্ছে না।' : 'This product photo could not be loaded.'}
              </div>
            ) : (
              <img
                key={activeImage}
                src={activeImage}
                alt={`${product.title} — ${activeImageIndex + 1} of ${productImages.length}`}
                referrerPolicy="no-referrer"
                onError={() => setActiveImageFailed(true)}
                className="w-full h-full object-contain p-2.5 sm:p-5"
              />
            )}
            {productImages.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label={isBn ? 'আগের ছবি' : 'Previous product photo'}
                  onClick={() => setActiveImageIndex((index) => (index - 1 + productImages.length) % productImages.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[var(--pm-card)]/90 border border-[var(--pm-border)] text-[var(--pm-text)] flex items-center justify-center shadow-md focus-visible:outline-2 focus-visible:outline-[var(--pm-accent)]"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  aria-label={isBn ? 'পরের ছবি' : 'Next product photo'}
                  onClick={() => setActiveImageIndex((index) => (index + 1) % productImages.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[var(--pm-card)]/90 border border-[var(--pm-border)] text-[var(--pm-text)] flex items-center justify-center shadow-md focus-visible:outline-2 focus-visible:outline-[var(--pm-accent)]"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <span aria-live="polite" className="absolute bottom-3 right-3 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white">
                  {activeImageIndex + 1} / {productImages.length}
                </span>
              </>
            )}
          </div>
          {productImages.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1" aria-label={isBn ? 'পণ্যের ছবির তালিকা' : 'Product photo thumbnails'}>
              {productImages.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  aria-label={isBn ? `ছবি ${index + 1} দেখুন` : `View photo ${index + 1}`}
                  aria-pressed={activeImageIndex === index}
                  onClick={() => setActiveImageIndex(index)}
                  className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 bg-[var(--pm-card)] ${
                    activeImageIndex === index ? 'border-[var(--pm-accent)]' : 'border-[var(--pm-border)]'
                  }`}
                >
                  <img src={image} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
          {product.masterProductId === 'master_samsung_s24_ultra' && (
            <p className="text-[10px] leading-4 text-[var(--pm-muted)]">
              Photos by{' '}
              <a className="underline underline-offset-2" href="https://commons.wikimedia.org/wiki/File:Samsung_Galaxy_S24_Ultra_with_retail_box,_front.jpg" target="_blank" rel="noreferrer">Benlisquare</a>
              {' and '}
              <a className="underline underline-offset-2" href="https://commons.wikimedia.org/wiki/File:Samsung_Galaxy_S24_Ultra_Backside.jpg" target="_blank" rel="noreferrer">SimonWaldherr</a>
              {' · '}
              <a className="underline underline-offset-2" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="space-y-2.5 sm:space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  aria-label={isBn ? 'পণ্যের তালিকায় ফিরে যান' : 'Back to products'}
                  className="hidden md:inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-[var(--pm-border)] bg-[var(--pm-surface)] px-2.5 text-xs font-bold text-[var(--pm-text)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-accent)]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>{isBn ? 'ফিরে যান' : 'Back'}</span>
                </button>
                <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-xs font-semibold text-[var(--pm-muted)]">
                  <Store className="h-3.5 w-3.5 shrink-0 text-[var(--pm-accent)]" />
                  <span className="truncate">{activeStoreName}</span>
                </span>
              </div>
              {product.badge && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--pm-accent-soft)] px-2 py-1 text-[10px] font-bold text-[var(--pm-accent)]">
                  <BadgeCheck className="h-3 w-3" />
                  {product.badge}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-3xl font-black leading-tight text-[var(--pm-text)]">{product.title}</h1>
            {product.pmin && (
              <p className="font-mono text-[11px] text-[var(--pm-muted)]">{product.pmin}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1 font-bold text-amber-500">
                <Star className="w-3.5 h-3.5 fill-current" />
                {product.rating.toFixed(1)}
                <span className="font-medium text-[var(--pm-muted)]">({product.reviewsCount.toLocaleString()} {isBn ? 'রিভিউ' : 'reviews'})</span>
              </span>
              <span className={`inline-flex items-center gap-1 font-semibold ${product.inStock ? 'text-[var(--pm-success)]' : 'text-[var(--pm-danger)]'}`}>
                {product.inStock ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                {product.inStock ? (isBn ? 'স্টকে আছে' : 'In stock') : (isBn ? 'স্টক নেই' : 'Out of stock')}
              </span>
              <span className="ml-auto inline-flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => toggleWishlist(product)}
                  aria-pressed={isWishlisted(product.id)}
                  aria-label={isWishlisted(product.id) ? (isBn ? 'সেভ করা হয়েছে' : 'Remove from wishlist') : (isBn ? 'উইশলিস্টে রাখুন' : 'Add to wishlist')}
                  title={isWishlisted(product.id) ? (isBn ? 'সেভ করা হয়েছে' : 'Saved') : (isBn ? 'উইশলিস্টে রাখুন' : 'Save')}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-accent)] ${
                    isWishlisted(product.id)
                      ? 'border-rose-500 bg-rose-500 text-white'
                      : 'border-[var(--pm-border)] bg-[var(--pm-surface)] text-[var(--pm-text)] hover:border-rose-500 hover:text-rose-500'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isWishlisted(product.id) ? 'fill-white' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => toggleCompare(product)}
                  aria-pressed={isCompared(product.id)}
                  aria-label={isCompared(product.id) ? (isBn ? 'তুলনা থেকে সরান' : 'Remove from compare') : (isBn ? 'তুলনা করুন' : 'Compare product')}
                  title={isCompared(product.id) ? (isBn ? 'তুলনায় যুক্ত' : 'In compare') : (isBn ? 'তুলনা করুন' : 'Compare')}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-accent)] ${
                    isCompared(product.id)
                      ? 'border-transparent bg-[var(--pm-accent)] text-[var(--pm-accent-fg)]'
                      : 'border-[var(--pm-border)] bg-[var(--pm-surface)] text-[var(--pm-accent)] hover:border-[var(--pm-accent)]'
                  }`}
                >
                  {isCompared(product.id) ? <Check className="h-4 w-4" /> : <Scale className="h-4 w-4" />}
                </button>
              </span>
            </div>

            {variantOptions.length > 0 && (
              <div className={hasColorVariant && variantOptions.length > 1
                ? 'grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2'
                : 'space-y-2.5'}
              >
                {variantOptions.map((option) => {
                  const isColorOption = option.id.toLowerCase().includes('color') ||
                    option.label.toLowerCase().includes('color');
                  const selectedValue = selectedVariants[option.id];

                  return (
                    <fieldset key={option.id} className="min-w-0">
                      <legend className="mb-1 flex w-full flex-wrap items-baseline justify-between gap-x-2 gap-y-1 text-xs">
                        <span className="font-bold text-[var(--pm-text)]">{option.label}</span>
                        <span className="text-[var(--pm-muted)]">{selectedValue}</span>
                      </legend>
                      <div className="flex flex-wrap gap-1.5">
                        {option.values.map((value) => {
                          const isSelected = selectedValue === value;
                          const swatch = option.swatches?.[value];
                          const canSelect = isOptionAvailable(option, value);

                          return (
                            <button
                              key={value}
                              type="button"
                              disabled={!canSelect}
                              aria-label={isColorOption ? value : undefined}
                              aria-pressed={isSelected}
                              onClick={() => setSelectedVariants((current) => ({ ...current, [option.id]: value }))}
                              className={`inline-flex items-center gap-1.5 border font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pm-accent)] disabled:cursor-not-allowed disabled:opacity-40 ${
                                isColorOption
                                  ? 'min-h-[40px] rounded-full px-2.5 py-1 text-[11px]'
                                  : 'min-h-11 rounded-xl px-2.5 py-1.5 text-xs'
                              } ${
                                isSelected
                                  ? 'border-[var(--pm-accent)] bg-[var(--pm-accent-soft)] text-[var(--pm-accent)]'
                                  : 'border-[var(--pm-border)] bg-[var(--pm-surface)] text-[var(--pm-text)] hover:border-[var(--pm-accent)]'
                              }`}
                              title={!canSelect ? `${value} — ${isBn ? 'স্টকে নেই' : 'Unavailable'}` : value}
                            >
                              {isColorOption && (
                                <span
                                  aria-hidden="true"
                                  className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/20"
                                  style={{ backgroundColor: getColorSwatch(value, swatch) }}
                                />
                              )}
                              <span>{isColorOption ? getCompactColorLabel(value) : value}</span>
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                  );
                })}
                {selectedVariantOffer?.sku && (
                  <p className={`${hasColorVariant && variantOptions.length > 1 ? 'sm:col-span-2 ' : ''}text-[10px] text-[var(--pm-muted)]`}>
                    SKU: <span className="font-medium text-[var(--pm-text)]">{selectedVariantOffer.sku}</span>
                  </p>
                )}
              </div>
            )}

            <div className="rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-surface)] p-3 sm:p-3.5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium text-[var(--pm-muted)]">{isBn ? 'পণ্যের দাম' : 'Price'}</p>
                  <p className="text-2xl sm:text-3xl font-black tabular-nums text-[var(--pm-accent)]">৳{activePrice.toLocaleString()}</p>
                </div>
                <p className="text-right text-[11px] text-[var(--pm-muted)]">
                  {activeShippingFee === 0
                    ? (isBn ? 'ডেলিভারি ফ্রি' : 'Free delivery')
                    : (isBn ? `ডেলিভারি ৳${activeShippingFee.toLocaleString()}` : `Delivery ৳${activeShippingFee.toLocaleString()}`)}
                </p>
              </div>
              <div className="mt-2 flex items-center gap-1.5 border-t border-[var(--pm-border)] pt-2 text-[11px] text-[var(--pm-muted)]">
                <Truck className="w-3.5 h-3.5 text-[var(--pm-accent)]" />
                <span>{isBn ? 'পৌঁছাবে' : 'Arrives'} {activeEta}</span>
              </div>
            </div>

            {(sellerOffers.length > 0 || product.pmin || product.masterProductId) && (
              <div className="rounded-2xl border border-[var(--pm-border)] p-2.5">
                <button
                  type="button"
                  onClick={() => setIsCompareSellersOpen(true)}
                  aria-label={offerCount > 0
                    ? (isBn ? `সেলারদের অফার তুলনা করুন, ${offerCount}টি অফার` : `Compare seller offers, ${offerCount} offers`)
                    : (isBn ? 'সেলারদের অফার দেখুন' : 'View seller offers')}
                  className="w-full inline-flex min-h-[44px] items-center justify-between gap-2 text-left text-xs font-bold text-[var(--pm-text)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-accent)]"
                >
                  <span className="inline-flex items-center gap-2">
                    <Scale className="w-4 h-4 text-[var(--pm-accent)]" />
                    {isBn ? 'সেলারদের অফার তুলনা করুন' : 'Compare seller offers'}
                  </span>
                  <span className="inline-flex shrink-0 items-center text-[var(--pm-accent)]">
                    {offerCount > 0
                      ? (isBn ? `${offerCount}টি অফার` : `${offerCount} offers`)
                      : (isBn ? 'অফার দেখুন' : 'View offers')}
                    <ChevronRight className="ml-0.5 h-4 w-4" />
                  </span>
                </button>
                {selectedOffer && (
                  <p className="mt-2 text-[11px] text-[var(--pm-muted)]">
                    {isBn ? 'নির্বাচিত বিক্রেতা:' : 'Selected seller:'} <span className="font-semibold text-[var(--pm-text)]">{selectedOffer.sellerName}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {canUseCashCheckout ? (
            <div className="mt-auto grid grid-cols-[3rem_minmax(0,1fr)] gap-2 border-t border-[var(--pm-border)] pt-3">
              <button
                type="button"
                disabled={isOutOfStock}
                onClick={() => onAddToCart(purchaseProduct, purchaseQuantity, isWholesalePurchase, undefined, selectedVariantLabel || undefined)}
                aria-label={isBn ? 'ব্যাগে যোগ করুন' : 'Add to bag'}
                title={isBn ? 'ব্যাগে যোগ করুন' : 'Add to bag'}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--pm-border-strong)] bg-[var(--pm-surface)] text-[var(--pm-text)] hover:border-[var(--pm-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-accent)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShoppingBag className="w-5 h-5" />
              </button>
              <button
                type="button"
                disabled={isOutOfStock}
                onClick={() => onBuyNow(purchaseProduct, purchaseQuantity, isWholesalePurchase, undefined, selectedVariantLabel || undefined)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--pm-accent)] px-3 py-2 text-[var(--pm-accent-fg)] shadow-sm hover:bg-[var(--pm-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="text-sm font-bold">{isBn ? 'এখনই কিনুন' : 'Buy now'}</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium opacity-90">
                  <Banknote className="h-3.5 w-3.5" />
                  {isBn ? 'ক্যাশ অন ডেলিভারি' : 'Cash on Delivery'}
                </span>
              </button>
            </div>
          ) : (
            <p role="status" className="mt-auto rounded-xl border border-[var(--pm-border)] bg-[var(--pm-surface)] p-3 text-xs text-[var(--pm-muted)]">
              {isBn
                ? 'এই তালিকাটি সাধারণ COD পণ্য অর্ডারের জন্য নয়। সংশ্লিষ্ট সার্ভিস বা ডিজিটাল পণ্য বিভাগ ব্যবহার করুন।'
                : 'This listing is not eligible for standard COD checkout. Use its service or digital-goods flow instead.'}
            </p>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-[var(--pm-border)] bg-[var(--pm-card)]">
        <div role="tablist" aria-label={isBn ? 'পণ্যের তথ্য' : 'Product information'} className="flex overflow-x-auto border-b border-[var(--pm-border)]">
          {([
            { id: 'overview', label: isBn ? 'সংক্ষিপ্ত বিবরণ' : 'Overview', icon: Info },
            { id: 'specifications', label: isBn ? 'বিস্তারিত' : 'Specifications', icon: ListChecks },
            { id: 'feedback', label: isBn ? 'রিভিউ ও প্রশ্ন' : 'Reviews & Q&A', icon: MessageCircle },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls="product-information-panel"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 px-3 sm:px-4 py-2.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-[var(--pm-accent)] ${
                activeTab === tab.id
                  ? 'border-[var(--pm-accent)] text-[var(--pm-accent)]'
                  : 'border-transparent text-[var(--pm-muted)] hover:text-[var(--pm-text)]'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
        <div id="product-information-panel" role="tabpanel" tabIndex={0} className="p-4 sm:p-6">
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-sm font-bold text-[var(--pm-text)]">{isBn ? 'পণ্য সম্পর্কে' : 'About this product'}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--pm-muted)]">
                  {product.description || (isBn ? 'বিক্রেতা এখনো পণ্যের বিবরণ যোগ করেননি।' : 'The seller has not added a product description yet.')}
                </p>
              </div>
              {product.highlights && product.highlights.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-[var(--pm-text)]">{isBn ? 'মূল বৈশিষ্ট্য' : 'Highlights'}</h3>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {product.highlights.map((highlight) => (
                      <li key={highlight} className="flex items-start gap-2 text-xs text-[var(--pm-muted)]">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--pm-success)]" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {activeTab === 'specifications' && (
            <div className="space-y-4">
              {product.brand && (
                <div className="flex justify-between gap-4 border-b border-[var(--pm-border)] py-2 text-xs">
                  <span className="text-[var(--pm-muted)]">{isBn ? 'ব্র্যান্ড' : 'Brand'}</span>
                  <span className="font-semibold text-[var(--pm-text)]">{product.brand}</span>
                </div>
              )}
              {product.warrantyLabel && (
                <div className="flex justify-between gap-4 border-b border-[var(--pm-border)] py-2 text-xs">
                  <span className="text-[var(--pm-muted)]">{isBn ? 'ওয়ারেন্টি' : 'Warranty'}</span>
                  <span className="text-right font-semibold text-[var(--pm-text)]">{product.warrantyLabel}</span>
                </div>
              )}
              {Object.entries(product.specifications || {}).length > 0 ? (
                <dl className="divide-y divide-[var(--pm-border)]">
                  {Object.entries(product.specifications || {}).map(([label, value]) => (
                    <div key={label} className="grid grid-cols-2 gap-4 py-2.5 text-xs">
                      <dt className="text-[var(--pm-muted)]">{label}</dt>
                      <dd className="text-right font-medium text-[var(--pm-text)]">{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="py-4 text-center text-xs text-[var(--pm-muted)]">
                  {isBn ? 'বিক্রেতা এখনো বিস্তারিত যোগ করেননি।' : 'The seller has not added specifications yet.'}
                </p>
              )}
            </div>
          )}
          {activeTab === 'feedback' && (
            <ProductEngagementSection
              productId={product.id}
              currentUser={currentUser}
              isBn={isBn}
              fallbackRating={product.rating}
              fallbackReviewsCount={product.reviewsCount}
            />
          )}
        </div>
      </section>

      <OtherSellersModal
        isOpen={isCompareSellersOpen}
        onClose={() => setIsCompareSellersOpen(false)}
        productTitle={product.title}
        pmin={product.pmin}
        masterProductId={product.masterProductId}
        sellerListings={sellerOffers}
        currentSellerId={selectedOffer?.id || activeStoreId}
        onSelectSellerListing={(listing) => setSelectedOffer(listing)}
      />
    </div>
  );
};
