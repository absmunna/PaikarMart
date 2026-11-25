import React, { useEffect, useState } from 'react';
import { Tag, Check, Copy, FileText } from 'lucide-react';
import { retailApiClient, RetailVoucher } from '@/features/marketplace/services/retailApiClient';
import { SponsoredFeedCard } from '@/components/shared/SponsoredFeedCard';

interface VoucherDealsStripProps {
  isBn: boolean;
  appliedVoucherCode?: string;
  onSelectVoucher: (code: string) => void;
  onOpenPrescriptionModal: () => void;
  className?: string;
}

export const VoucherDealsStrip: React.FC<VoucherDealsStripProps> = ({
  isBn,
  appliedVoucherCode,
  onSelectVoucher,
  onOpenPrescriptionModal,
  className = '',
}) => {
  const [vouchers, setVouchers] = useState<RetailVoucher[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let active = true;
    retailApiClient.fetchDeals().then((list) => {
      if (active && list.length > 0) {
        setVouchers(list.slice(0, 3));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  if (dismissed) return null;

  const handleApplyCode = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopiedCode(code);
    onSelectVoucher(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <SponsoredFeedCard
      label={isBn ? 'মার্কেটপ্লেস অফার' : 'Marketplace offers'}
      onDismiss={() => setDismissed(true)}
      dismissLabel={isBn ? 'অফারটি বন্ধ করুন' : 'Dismiss offers'}
      className={className}
    >
      <section aria-label="Retail promotions and prescription shortcuts" className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-[15px] font-black text-[var(--pm-text)]">
            {isBn ? 'ভাউচার ও দ্রুত সেবা' : 'Vouchers and quick services'}
          </h3>
          <p className="text-sm leading-relaxed text-[var(--pm-muted)]">
            {isBn ? 'কুপন ব্যবহার করুন অথবা প্রেসক্রিপশন ও বাজারের তালিকা দিন।' : 'Apply a voucher or add a prescription and shopping list.'}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3 overflow-x-auto no-scrollbar">
            <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-[var(--pm-text)]">
              <Tag className="h-3.5 w-3.5 text-[var(--pm-accent)]" />
              <span>{isBn ? 'ভেরিফাইড ভাউচার:' : 'Verified vouchers:'}</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {vouchers.length > 0 ? (
                vouchers.map((voucher) => {
                  const isSelected = appliedVoucherCode === voucher.code || copiedCode === voucher.code;
                  return (
                    <button
                      key={voucher.code}
                      type="button"
                      onClick={() => handleApplyCode(voucher.code)}
                      title={isBn ? voucher.descriptionBn : voucher.descriptionEn}
                      aria-pressed={isSelected}
                      className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-mono font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] border-transparent'
                          : 'bg-[var(--pm-surface)] text-[var(--pm-text)] border-[var(--pm-border)] hover:border-[var(--pm-accent)]'
                      }`}
                    >
                      <span>{voucher.code}</span>
                      {isSelected ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5 text-[var(--pm-muted)]" />}
                    </button>
                  );
                })
              ) : (
                <button
                  type="button"
                  onClick={() => handleApplyCode('SUPER10')}
                  aria-pressed={appliedVoucherCode === 'SUPER10' || copiedCode === 'SUPER10'}
                  className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--pm-border)] bg-[var(--pm-surface)] px-3 text-xs font-mono font-bold whitespace-nowrap text-[var(--pm-text)] transition-colors hover:border-[var(--pm-accent)] cursor-pointer"
                >
                  <span>SUPER10</span>
                  <Copy className="h-3.5 w-3.5 text-[var(--pm-muted)]" />
                </button>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenPrescriptionModal}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[var(--pm-accent)] px-3.5 text-xs font-semibold text-[var(--pm-accent-fg)] whitespace-nowrap transition-colors hover:bg-[var(--pm-accent-hover)] cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>{isBn ? 'প্রেসক্রিপশন / বাজার লিস্ট' : 'Upload Rx / Bazar List'}</span>
          </button>
        </div>
      </section>
    </SponsoredFeedCard>
  );
};
