import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, ShoppingBag } from 'lucide-react';
import { CommerceItem } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface ShoppableProductOverlayProps {
  product: CommerceItem;
  onAddToCart?: (item: CommerceItem) => void;
}

export const ShoppableProductOverlay: React.FC<ShoppableProductOverlayProps> = ({
  product,
  onAddToCart,
}) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [added, setAdded] = useState(false);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(product);
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1800);
    } else {
      navigate(`/hub/marketplace/product/${product.id}`);
    }
  };

  return (
    <div
      onClick={() => navigate(`/hub/marketplace/product/${product.id}`)}
      className="p-3 rounded-2xl bg-[var(--pm-surface)] border border-[var(--pm-border)] hover:border-[var(--pm-accent)] transition-all flex items-center justify-between gap-3 cursor-pointer"
    >
      <div className="flex items-center gap-3 min-w-0">
        <img
          src={product.imageUrl || '/src/assets/images/paikarmart_fresh_grocery_1794489814176.jpg'}
          alt={product.title}
          className="w-11 h-11 rounded-xl object-cover shrink-0 border border-[var(--pm-border)] bg-[var(--pm-card)]"
        />
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--pm-accent)] truncate">
            {isBn ? 'ভিডিওতে ট্যাগকৃত পণ্য' : 'Featured in Video'} · {product.storeName}
          </p>
          <h4 className="text-xs font-bold text-[var(--pm-text)] truncate">{product.title}</h4>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xs font-mono tabular-nums font-black text-[var(--pm-text)]">
              ৳{product.price.toLocaleString()}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-[10px] font-mono tabular-nums line-through text-[var(--pm-muted)]">
                ৳{product.originalPrice.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleQuickAdd}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
            added
              ? 'bg-[var(--pm-success)] text-white'
              : 'bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] text-[var(--pm-accent-fg)]'
          }`}
        >
          {added ? <Check className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
          <span>{added ? (isBn ? 'যুক্ত হয়েছে' : 'Added') : onAddToCart ? (isBn ? 'কার্টে নিন' : 'Add') : (isBn ? 'দেখুন' : 'View')}</span>
        </button>
        <ChevronRight className="w-4 h-4 text-[var(--pm-muted)] hidden sm:block" />
      </div>
    </div>
  );
};
