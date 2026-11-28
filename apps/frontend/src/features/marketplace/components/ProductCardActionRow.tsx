import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Share2, ShoppingCart } from 'lucide-react';
import type { CommerceItem } from '@/types';
import { useWishlist } from '@/features/marketplace/hooks/useWishlist';
import { CardActionBar, CardActionButton } from '@/components/shared/CardPrimitives';

interface ProductCardActionRowProps {
  item: CommerceItem;
  isBn: boolean;
  onAddToCart: (item: CommerceItem, isWholesale: boolean) => void;
  className?: string;
}

export const ProductCardActionRow: React.FC<ProductCardActionRowProps> = ({
  item,
  isBn,
  onAddToCart,
  className
}) => {
  const navigate = useNavigate();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const isWholesale = item.tradeMode === 'wholesale' || item.type === 'wholesale';
  const isDemand = item.isDemandRequest || item.badge?.includes('Demand');
  const isUsed = item.isUsedItem || item.badge?.includes('Used');
  const supportsProductActions = !isDemand && !isUsed && item.type !== 'service' && item.type !== 'rides';
  const wishlisted = isWishlisted(item.id);

  const handleShare = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const url = new URL(`/hub/marketplace/product/${encodeURIComponent(item.id)}`, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, url });
        setShareStatus(isBn ? 'শেয়ার করা হয়েছে' : 'Shared');
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setShareStatus(isBn ? 'লিংক কপি হয়েছে' : 'Link copied');
      } else {
        setShareStatus(isBn ? 'শেয়ার করা যাচ্ছে না' : 'Sharing is unavailable');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Product sharing failed:', error);
      setShareStatus(isBn ? 'শেয়ার করা যায়নি' : 'Could not share');
    }
  };

  return (
    <>
      <CardActionBar
        label={isBn ? 'পণ্যের কাজ' : 'Product actions'}
        className={className}
      >
        <CardActionButton
          icon={Heart}
          label={wishlisted ? (isBn ? 'উইশলিস্ট থেকে সরান' : 'Remove from wishlist') : (isBn ? 'উইশলিস্টে যোগ করুন' : 'Add to wishlist')}
          active={wishlisted}
          activeTone="danger"
          onClick={(event) => {
            event.stopPropagation();
            toggleWishlist(item);
          }}
        />
        {supportsProductActions && (
          <CardActionButton
            icon={MessageCircle}
            label={isBn ? 'রিভিউ ও প্রশ্ন দেখুন' : 'Reviews & Q&A'}
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/hub/marketplace/product/${encodeURIComponent(item.id)}#feedback`);
            }}
          />
        )}
        {supportsProductActions && (
          <CardActionButton
            icon={ShoppingCart}
            label={isBn ? 'কার্টে যোগ করুন' : 'Add to cart'}
            onClick={(event) => {
              event.stopPropagation();
              onAddToCart(item, isWholesale);
            }}
          />
        )}
        {supportsProductActions && (
          <CardActionButton
            icon={Share2}
            label={isBn ? 'পণ্য শেয়ার করুন' : 'Share product'}
            onClick={handleShare}
          />
        )}
      </CardActionBar>
      {shareStatus && (
        <p role="status" className="text-center text-[11px] text-[var(--pm-muted)]">
          {shareStatus}
        </p>
      )}
    </>
  );
};
