import React from 'react';
import { Lock, ShieldCheck, Clock, Store } from 'lucide-react';
import { User, UserRole } from '@/types';
import { canAccessSellerCentral, isGovernanceRole } from '@paikarmart/shared';
import { useLanguage } from '@/contexts/LanguageContext';

interface RoleGuardProps {
  currentUser: User;
  requiredMode: 'seller' | 'governance';
  allowedRoles?: UserRole[];
  onOpenVendorModal?: () => void;
  onNavigateHome?: () => void;
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  currentUser,
  requiredMode,
  onOpenVendorModal,
  onNavigateHome,
  children
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const isAuthorized =
    requiredMode === 'governance'
      ? isGovernanceRole(currentUser.role)
      : canAccessSellerCentral({
          role: currentUser.role,
          isVendor: currentUser.isVendor,
          kycStatus: currentUser.kycStatus || currentUser.vendorProfile?.kycStatus,
          vendorProfile: currentUser.vendorProfile || null
        });

  if (isAuthorized) {
    return <>{children}</>;
  }

  const kycStatus = currentUser.kycStatus || currentUser.vendorProfile?.kycStatus || 'none';
  const isPendingReview =
    requiredMode === 'seller' &&
    (kycStatus === 'submitted' || kycStatus === 'under_review');

  const storeName = currentUser.vendorProfile?.storeName || (isBn ? 'অপেক্ষমাণ স্টোর' : 'Pending Store');

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-[var(--pm-card)] text-[var(--pm-text)] border border-[var(--pm-border)] text-center space-y-5 my-4 max-w-lg mx-auto shadow-sm">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--pm-accent-soft)] border border-[var(--pm-accent-border)] flex items-center justify-center text-[var(--pm-accent)]">
        {isPendingReview ? <Clock className="w-6 h-6 text-[var(--pm-warning)]" /> : <Lock className="w-6 h-6" />}
      </div>

      <div className="max-w-md mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[var(--pm-surface)] border border-[var(--pm-border)] text-[10px] font-bold uppercase tracking-wider text-[var(--pm-muted)]">
          <span>{isBn ? 'বর্তমান ভূমিকা:' : 'Current Role:'}</span>
          <span className="text-[var(--pm-accent)]">{currentUser.role || 'consumer'}</span>
        </div>

        <h2 className="text-lg font-bold text-[var(--pm-text)]">
          {requiredMode === 'governance'
            ? (isBn ? 'অ্যাডমিন বা মডারেটর অ্যাক্সেস প্রয়োজন' : 'Governance Authorization Required')
            : isPendingReview
            ? (isBn ? 'মার্চেন্ট KYC যাচাই প্রক্রিয়াধীন' : 'Merchant KYC Under Verification')
            : (isBn ? 'ভেরিফাইড মার্চেন্ট অ্যাকাউন্ট প্রয়োজন' : 'Verified Merchant Account Required')}
        </h2>

        <p className="text-xs text-[var(--pm-muted)] leading-relaxed">
          {requiredMode === 'governance'
            ? (isBn
                ? 'প্ল্যাটফর্ম ক্যাটালগ অডিট এবং KYC অনুমোদন শুধুমাত্র অনুমোদিত মডারেটর, অ্যাডমিন এবং সুপার অ্যাডমিন অ্যাকাউন্টের জন্য সংরক্ষিত।'
                : 'Platform Catalog Audit and KYC Approvals are restricted exclusively to authorized Moderator, Admin, and Super Admin accounts.')
            : isPendingReview
            ? (isBn
                ? `আপনার স্টোর আবেদন (${storeName}) বর্তমানে KYC যাচাই তালিকায় রয়েছে। অনুমোদন সম্পন্ন হলে Seller Central স্বয়ংক্রিয়ভাবে চালু হবে।`
                : `Your store application (${storeName}) is currently in the KYC verification queue. Seller Central activates automatically once approved.`)
            : (isBn
                ? 'Seller Central, B2B পাইকারি রেট এবং ইনভেন্টরি ম্যানেজমেন্ট চালু করতে আপনার ৫-ধাপের মার্চেন্ট KYC (NID, ট্রেড লাইসেন্স, e-TIN, পে-আউট) সম্পন্ন করুন।'
                : 'Complete your 5-step Merchant KYC onboarding (NID, Trade License, e-TIN, Payout Account) to unlock Seller Central, B2B Wholesale tiers, and inventory management.')}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {requiredMode === 'seller' && !isPendingReview && onOpenVendorModal && (
          <button
            type="button"
            onClick={onOpenVendorModal}
            className="px-5 py-2.5 rounded-xl bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] text-[var(--pm-accent-fg)] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer active-scale"
          >
            <Store className="w-4 h-4" />
            <span>{isBn ? '৫-ধাপের মার্চেন্ট KYC শুরু করুন' : 'Start 5-Step Merchant KYC'}</span>
          </button>
        )}

        {onNavigateHome && (
          <button
            type="button"
            onClick={onNavigateHome}
            className="px-5 py-2.5 rounded-xl bg-[var(--pm-surface)] hover:bg-[var(--pm-card-hover)] border border-[var(--pm-border)] text-[var(--pm-text)] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isBn ? 'হোম ফিডে ফিরে যান' : 'Return to Feed'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

