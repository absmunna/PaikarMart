import React, { useState } from 'react';
import {
  X,
  Newspaper,
  Package,
  Wrench,
  Car,
  Sparkles,
  Store,
  Cloud,
  ShoppingBag,
  ShieldCheck,
  ShieldAlert,
  Grid,
  Settings as SettingsIcon,
  BookOpen,
  MessageSquare,
  ChevronRight,
  LogOut,
  MapPin,
  Navigation,
  Shirt,
  Smartphone,
  Pill,
  Egg,
  ClipboardList,
  Layers,
  Boxes,
  Loader2,
  ChevronDown,
  User as UserIcon,
  Globe,
} from 'lucide-react';
import { PortalTab, SettingsSectionId, User } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocationSettings } from '@/contexts/LocationContext';
import { formatAdministrativeArea } from '@/utils/administrativeArea';
import { useAuth } from '@/features/auth';
import { DEFAULT_AVATAR_URL, safeMediaSrc } from '@/shared/utils';

export interface UnifiedSidebarProps {
  mode: 'desktop' | 'drawer';
  isOpen?: boolean;
  onClose?: () => void;
  currentTab?: PortalTab;
  onSelectTab: (tab: PortalTab) => void;
  currentUser: User;
  onOpenVendorModal: () => void;
  onOpenCloudGuide: () => void;
  onOpenSettingsPortal?: (section?: SettingsSectionId) => void;
  onOpenSuperAdminModal?: () => void;
  onOpenSellerInventory?: () => void;
  onOpenSellerOrders?: () => void;
  onOpenLocationModal?: () => void;
  onOpenAuthModal?: (tab?: 'login' | 'register') => void;
  onQuickFilter?: (query: string, targetTab?: PortalTab) => void;
}

export const UnifiedSidebar: React.FC<UnifiedSidebarProps> = ({
  mode,
  isOpen = true,
  onClose,
  currentTab = 'feed',
  onSelectTab,
  currentUser,
  onOpenVendorModal,
  onOpenCloudGuide,
  onOpenSettingsPortal,
  onOpenSuperAdminModal,
  onOpenSellerInventory,
  onOpenSellerOrders,
  onOpenLocationModal,
  onOpenAuthModal,
  onQuickFilter,
}) => {
  const { language, setLanguage } = useLanguage();
  const { themeMode, setThemeMode, presets } = useTheme();
  const { activeLocation, activeArea, detectLiveLocation, isLocating } = useLocationSettings();
  const { firebaseUser, signOut } = useAuth();
  const isBn = language === 'bn';
  const locationSummary =
    formatAdministrativeArea(activeArea, isBn) || activeLocation?.trim() || 'Dhaka, Bangladesh';

  // Collapsible category section states
  const [openSections, setOpenSections] = useState<{
    portals: boolean;
    mokams: boolean;
    account: boolean;
    business: boolean;
    appSettings: boolean;
    help: boolean;
  }>({
    portals: true,
    mokams: false,
    account: true,
    business: false,
    appSettings: false,
    help: false,
  });
  const [showAllPortals, setShowAllPortals] = useState(false);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Close on Escape key when drawer is open
  React.useEffect(() => {
    if (mode !== 'drawer' || !isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, isOpen, onClose]);

  if (mode === 'drawer' && !isOpen) return null;

  const navigateAndClose = (tab: PortalTab) => {
    onSelectTab(tab);
    onClose?.();
  };

  const handleQuickCategoryJump = (query: string, targetTab: PortalTab = 'commerce') => {
    if (onQuickFilter) {
      onQuickFilter(query, targetTab);
    } else {
      onSelectTab(targetTab);
    }
    onClose?.();
  };

  const openSettingsTarget = (section: SettingsSectionId = 'appearance') => {
    onClose?.();
    if (onOpenSettingsPortal) {
      onOpenSettingsPortal(section);
    } else {
      onSelectTab('settings');
    }
  };

  const openAccountTarget = (section: SettingsSectionId) => {
    if (!firebaseUser) {
      onClose?.();
      onOpenAuthModal?.('login');
      return;
    }
    openSettingsTarget(section);
  };

  const isSuperAdmin =
    currentUser.role === 'super_admin' ||
    currentUser.role === 'admin';

  const primaryPortals: {
    id: PortalTab;
    labelEn: string;
    labelBn: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'feed', labelEn: 'Social Feed', labelBn: 'সোশ্যাল ফিড', icon: Newspaper },
    { id: 'commerce', labelEn: 'Marketplace', labelBn: 'মার্কেটপ্লেস', icon: ShoppingBag },
    { id: 'explore', labelEn: 'Explore', labelBn: 'এক্সপ্লোর', icon: Grid },
    { id: 'services', labelEn: 'Services', labelBn: 'সার্ভিসেস', icon: Wrench },
    { id: 'rides', labelEn: 'Transit', labelBn: 'ট্রানজিট', icon: Car },
    { id: 'wholesale', labelEn: 'Wholesale', labelBn: 'পাইকারি বাজার', icon: Package },
    { id: 'community-hub', labelEn: 'Community', labelBn: 'কমিউনিটি', icon: Sparkles },
    { id: 'utility-hub', labelEn: 'Orders & Wallet', labelBn: 'অর্ডার ও ওয়ালেট', icon: Layers },
    { id: 'creator', labelEn: 'Creator Studio', labelBn: 'ক্রিয়েটর স্টুডিও', icon: Sparkles },
    { id: 'messages', labelEn: 'Messages', labelBn: 'মেসেজ', icon: MessageSquare },
  ];
  const compactPortalList = primaryPortals.filter((portal, index) => index < 5 || portal.id === currentTab);
  const visiblePortals = showAllPortals ? primaryPortals : compactPortalList;

  const commercialMokams: {
    id: string;
    titleEn: string;
    titleBn: string;
    subtitleEn: string;
    subtitleBn: string;
    query: string;
    targetTab: PortalTab;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
  }[] = [
    {
      id: 'chawkbazar',
      titleEn: 'Chawkbazar Bulk Wholesale',
      titleBn: 'চকবাজার পাইকারি আড়ত',
      subtitleEn: 'Factory lots, MOQ deals & bulk stock',
      subtitleBn: 'পাইকারি রেট ও মোকাম ডিল',
      query: 'Chawkbazar',
      targetTab: 'wholesale',
      icon: Boxes,
      accentColor: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    },
    {
      id: 'islampur',
      titleEn: 'Islampur Textile & Fashion',
      titleBn: 'ইসলামপুর ফ্যাশন ও পোশাক',
      subtitleEn: 'Fabrics, ethnic wear & garments',
      subtitleBn: 'পোশাক, শাড়ি ও টেক্সটাইল',
      query: 'Fashion',
      targetTab: 'commerce',
      icon: Shirt,
      accentColor: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
    },
    {
      id: 'gadgets',
      titleEn: 'Gadget & Tech Market',
      titleBn: 'মোবাইল ও গ্যাজেট মোকাম',
      subtitleEn: 'Phones, laptops & accessories',
      subtitleBn: 'ইলেকট্রনিক্স ও প্রযুক্তি পণ্য',
      query: 'Electronics',
      targetTab: 'commerce',
      icon: Smartphone,
      accentColor: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    },
    {
      id: 'pharmacy',
      titleEn: '24/7 Pharmacy & Medicine',
      titleBn: '২৪/৭ ফার্মেসি ও ওষুধ',
      subtitleEn: 'Instant Rx & health supplies',
      subtitleBn: 'জরুরি ওষুধ ও প্রেসক্রিপশন',
      query: 'Pharmacy',
      targetTab: 'commerce',
      icon: Pill,
      accentColor: 'text-teal-500 bg-teal-500/10 border-teal-500/20',
    },
    {
      id: 'grocery',
      titleEn: 'Daily Fresh Grocery & Bazar',
      titleBn: 'নিত্যপণ্য ও কাঁচা বাজার',
      subtitleEn: 'Fresh vegetables, milk & staples',
      subtitleBn: 'টাটকা সবজি, ডিম ও নিত্যপণ্য',
      query: 'Grocery',
      targetTab: 'commerce',
      icon: Egg,
      accentColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      id: 'demand',
      titleEn: 'Buyer Demand RFQ Board',
      titleBn: 'ডিমান্ড বোর্ড (RFQ বায়ার রিকুয়েস্ট)',
      subtitleEn: 'Post bulk needs, receive supplier bids',
      subtitleBn: 'পণ্য চেয়ে দরপত্র আহ্বান করুন',
      query: 'demand',
      targetTab: 'commerce',
      icon: ClipboardList,
      accentColor: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    },
  ];

  const innerContent = (
    <div className="flex flex-col h-full text-[var(--pm-text)] select-none">
      {/* 1. Header Bar (Drawer Mode) */}
      {mode === 'drawer' && (
        <div className="p-4 border-b border-[var(--pm-border)] bg-[var(--pm-surface)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] flex items-center justify-center font-black text-lg shadow-sm">
              P
            </div>
            <div>
              <h3 className="text-sm font-black text-[var(--pm-text)] leading-tight">
                {isBn ? 'পাইকারমার্ট সুপার অ্যাপ' : 'PaikarMart Super App'}
              </h3>
              <p className="text-[11px] text-[var(--pm-muted)]">
                {isBn ? 'অল-ইন-ওয়ান মার্কেটপ্লেস ও মোকাম' : 'All-in-One Super Marketplace'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="p-2 rounded-xl text-[var(--pm-muted)] hover:text-[var(--pm-text)] hover:bg-[var(--pm-card-hover)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 2. Scrollable Navigation Body */}
      <div className={`flex-1 overflow-y-auto no-scrollbar overscroll-contain space-y-4 ${mode === 'drawer' ? 'p-4' : 'pr-2'}`}>
        
        {/* User Profile / Guest State Card */}
        <div className="p-3.5 rounded-2xl bg-[var(--pm-card)] border border-[var(--pm-border)] shadow-xs space-y-3">
          {firebaseUser ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={safeMediaSrc(currentUser.avatar, DEFAULT_AVATAR_URL)}
                      alt={currentUser.name}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full object-cover ring-2 ring-[var(--pm-accent)]/30"
                    />
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[var(--pm-card)]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-[var(--pm-text)] truncate">
                        {currentUser.name}
                      </span>
                      {currentUser.isVendor && (
                        <ShieldCheck className="w-3.5 h-3.5 text-[var(--pm-accent)] shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-[var(--pm-muted)] block truncate">
                      {currentUser.isVendor
                        ? isBn
                          ? 'ভেরিফাইড মার্চেন্ট'
                          : 'Verified Merchant'
                        : isBn
                          ? 'রেগুলার মেম্বার'
                          : 'General Buyer'}
                    </span>
                    <span className="text-[11px] text-[var(--pm-accent)] font-mono font-bold block truncate">
                      ৳{currentUser.balance.toLocaleString()} {isBn ? 'ব্যালেন্স' : 'Balance'}
                    </span>
                  </div>
                </div>
              </div>

            </>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--pm-accent-soft)] text-[var(--pm-accent)] flex items-center justify-center font-bold shrink-0">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-[var(--pm-text)]">
                    {isBn ? 'স্বাগতম গেস্ট ইউজার!' : 'Welcome, Guest!'}
                  </h4>
                  <p className="text-[10px] text-[var(--pm-muted)]">
                    {isBn ? 'অর্ডার, ওয়ালেট ও মেসেজ অ্যাক্সেস করতে লগইন করুন' : 'Sign in to access orders, wallet & messaging'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 1: Core Super App Portals (সুপার অ্যাপ পোর্টাল) */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => toggleSection('portals')}
            aria-expanded={openSections.portals}
            className="w-full px-2 py-1.5 flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-[var(--pm-muted)] hover:text-[var(--pm-text)] transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[var(--pm-accent)]" />
              <span>{isBn ? 'সুপার অ্যাপ পোর্টালসমূহ' : 'Super App Portals'}</span>
            </span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openSections.portals ? 'rotate-180' : ''}`} />
          </button>

          {openSections.portals && (
            <div className="space-y-1 pt-0.5">
              {visiblePortals.map((portal) => {
                const Icon = portal.icon;
                const isActive = currentTab === portal.id;
                return (
                  <button
                    key={portal.id}
                    type="button"
                    onClick={() => navigateAndClose(portal.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold text-left transition-all cursor-pointer active:scale-[0.98] ${
                      isActive
                        ? 'bg-[var(--pm-accent-soft)] text-[var(--pm-accent)] border border-[var(--pm-accent)]/30 shadow-2xs'
                        : 'text-[var(--pm-text)] hover:bg-[var(--pm-card-hover)] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-1.5 rounded-xl transition-colors shrink-0 ${
                          isActive
                            ? 'bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] shadow-xs'
                            : 'bg-[var(--pm-surface)] border border-[var(--pm-border)] text-[var(--pm-muted)]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="truncate">{isBn ? portal.labelBn : portal.labelEn}</span>
                    </div>
                  </button>
                );
              })}
              {primaryPortals.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllPortals((expanded) => !expanded)}
                  aria-expanded={showAllPortals}
                  className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-xs font-bold text-[var(--pm-muted)] hover:bg-[var(--pm-card-hover)] hover:text-[var(--pm-text)]"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--pm-surface)]">
                    <ChevronDown className={`h-4 w-4 transition-transform ${showAllPortals ? 'rotate-180' : ''}`} />
                  </span>
                  {showAllPortals
                    ? isBn ? 'কম দেখান' : 'See less'
                    : isBn ? 'আরও দেখুন' : 'See more'}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-[var(--pm-border)]" />

        {/* SECTION 2: Popular BD Mokam & Categories (জনপ্রিয় মোকাম ও ক্যাটাগরি) */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => toggleSection('mokams')}
            aria-expanded={openSections.mokams}
            className="w-full px-2 py-1.5 flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-[var(--pm-muted)] hover:text-[var(--pm-text)] transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-amber-500" />
              <span>{isBn ? 'জনপ্রিয় মোকাম ও ক্যাটাগরি' : 'BD Trade Mokams & Markets'}</span>
            </span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openSections.mokams ? 'rotate-180' : ''}`} />
          </button>

          {openSections.mokams && (
            <div className="grid grid-cols-1 gap-1.5 pt-0.5">
              {commercialMokams.map((mokam) => {
                const Icon = mokam.icon;
                return (
                  <button
                    key={mokam.id}
                    type="button"
                    onClick={() => handleQuickCategoryJump(mokam.query, mokam.targetTab)}
                    className="w-full p-2 rounded-xl bg-[var(--pm-surface)] hover:bg-[var(--pm-card-hover)] border border-[var(--pm-border)] hover:border-[var(--pm-accent-border)] transition-all text-left flex items-center justify-between gap-2.5 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-lg border shrink-0 ${mokam.accentColor}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[var(--pm-text)] group-hover:text-[var(--pm-accent)] transition-colors block truncate">
                          {isBn ? mokam.titleBn : mokam.titleEn}
                        </span>
                        <span className="text-[10px] text-[var(--pm-muted)] block truncate">
                          {isBn ? mokam.subtitleBn : mokam.subtitleEn}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--pm-muted)] group-hover:text-[var(--pm-accent)] shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-[var(--pm-border)]" />

        <div className="space-y-1">
          <button
            type="button"
            onClick={() => toggleSection('account')}
            aria-expanded={openSections.account}
            className="w-full px-2 py-2 flex items-center justify-between text-sm font-bold text-[var(--pm-text)] hover:bg-[var(--pm-card-hover)] rounded-xl transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <UserIcon className="w-4 h-4 text-sky-500" />
              <span>{isBn ? 'আমার অ্যাকাউন্ট' : 'My Account'}</span>
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${openSections.account ? 'rotate-180' : ''}`} />
          </button>

          {openSections.account && (
            <div className="space-y-1 pl-2">
              {firebaseUser ? (
                <>
                  <button
                    type="button"
                    onClick={() => navigateAndClose('profile')}
                    aria-current={currentTab === 'profile' ? 'page' : undefined}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-[var(--pm-text)] hover:bg-[var(--pm-card-hover)] transition-colors cursor-pointer"
                  >
                    <span>{isBn ? 'প্রোফাইল দেখুন' : 'Profile overview'}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--pm-muted)]" />
                  </button>
                  {[
                    { id: 'account_profile' as const, label: isBn ? 'ব্যক্তিগত তথ্য' : 'Personal information' },
                    { id: 'account_security' as const, label: isBn ? 'লগইন ও নিরাপত্তা' : 'Login & security' },
                    { id: 'account_addresses' as const, label: isBn ? 'সংরক্ষিত ঠিকানা' : 'Saved addresses' },
                    { id: 'account_payments' as const, label: isBn ? 'পেমেন্ট মাধ্যম' : 'Payment methods' },
                    { id: 'account_notifications' as const, label: isBn ? 'নোটিফিকেশন পছন্দ' : 'Notification preferences' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openAccountTarget(item.id)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-[var(--pm-muted)] hover:bg-[var(--pm-card-hover)] hover:text-[var(--pm-text)] transition-colors cursor-pointer"
                    >
                      <span>{item.label}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={async () => {
                      await signOut();
                      onClose?.();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <span>{isBn ? 'সাইন আউট' : 'Sign out'}</span>
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <div className="rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] p-3 space-y-2">
                  <p className="text-xs text-[var(--pm-muted)]">
                    {isBn ? 'অ্যাকাউন্ট তৈরি বা সেটিংস দেখতে সাইন ইন করুন।' : 'Sign in or create an account to manage your details.'}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClose?.();
                        onOpenAuthModal?.('login');
                      }}
                      className="rounded-lg bg-[var(--pm-card)] border border-[var(--pm-border)] px-2 py-2 text-xs font-semibold text-[var(--pm-text)] hover:bg-[var(--pm-card-hover)]"
                    >
                      {isBn ? 'সাইন ইন' : 'Sign in'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClose?.();
                        onOpenAuthModal?.('register');
                      }}
                      className="rounded-lg bg-[var(--pm-accent)] px-2 py-2 text-xs font-semibold text-[var(--pm-accent-fg)] hover:bg-[var(--pm-accent-hover)]"
                    >
                      {isBn ? 'অ্যাকাউন্ট খুলুন' : 'Create account'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-[var(--pm-border)]" />

        <div className="space-y-1">
          <button
            type="button"
            onClick={() => toggleSection('business')}
            aria-expanded={openSections.business}
            className="w-full px-2 py-2 flex items-center justify-between text-sm font-bold text-[var(--pm-text)] hover:bg-[var(--pm-card-hover)] rounded-xl transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <Store className="w-4 h-4 text-emerald-500" />
              <span>{isBn ? 'আমার ব্যবসা' : 'My Business'}</span>
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${openSections.business ? 'rotate-180' : ''}`} />
          </button>

          {openSections.business && (
            <div className="space-y-1 pl-2">
              {firebaseUser ? (
                currentUser.isVendor ? (
                  <>
                    <button
                      type="button"
                      onClick={() => navigateAndClose('vendor-dash')}
                      aria-current={currentTab === 'vendor-dash' ? 'page' : undefined}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-[var(--pm-text)] hover:bg-[var(--pm-card-hover)] transition-colors cursor-pointer"
                    >
                      <span>{isBn ? 'সেলার সেন্ট্রাল' : 'Seller Central'}</span>
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        {currentUser.vendorProfile?.verified ? (isBn ? 'যাচাইকৃত' : 'Verified') : (isBn ? 'KYC বাকি' : 'KYC review')}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!onOpenSellerInventory) return;
                        onClose?.();
                        onOpenSellerInventory();
                      }}
                      disabled={!onOpenSellerInventory}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-[var(--pm-muted)] hover:bg-[var(--pm-card-hover)] hover:text-[var(--pm-text)] transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-[var(--pm-muted)]"
                    >
                      <span>{isBn ? 'পণ্য ও ইনভেন্টরি' : 'Products & inventory'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!onOpenSellerOrders) return;
                        onClose?.();
                        onOpenSellerOrders();
                      }}
                      disabled={!onOpenSellerOrders}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-[var(--pm-muted)] hover:bg-[var(--pm-card-hover)] hover:text-[var(--pm-text)] transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-[var(--pm-muted)]"
                    >
                      <span>{isBn ? 'বিক্রির অর্ডার' : 'Sales orders'}</span>
                      {onOpenSellerOrders
                        ? <ChevronRight className="w-3.5 h-3.5" />
                        : <span className="text-[10px]">{isBn ? 'শীঘ্রই' : 'Soon'}</span>}
                    </button>
                    {[
                      { id: 'vendor_store' as const, label: isBn ? 'দোকানের পরিচিতি' : 'Store profile' },
                      { id: 'vendor_kyc' as const, label: isBn ? 'ব্যবসা যাচাই (KYC)' : 'Business verification' },
                      { id: 'vendor_payout' as const, label: isBn ? 'পেআউট ও ব্যাংক' : 'Payout & bank' },
                      { id: 'vendor_fulfillment' as const, label: isBn ? 'ডেলিভারি সেটিংস' : 'Delivery settings' },
                      { id: 'vendor_hours' as const, label: isBn ? 'দোকানের সময়' : 'Store hours' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => openAccountTarget(item.id)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-[var(--pm-muted)] hover:bg-[var(--pm-card-hover)] hover:text-[var(--pm-text)] transition-colors cursor-pointer"
                      >
                        <span>{item.label}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ))}
                  </>
                ) : currentUser.vendorProfile ? (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-3">
                    <p className="text-xs font-semibold text-[var(--pm-text)]">
                      {isBn ? 'সেলার আবেদন জমা হয়েছে' : 'Seller application received'}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--pm-muted)]">
                      {currentUser.vendorProfile.status === 'pending'
                        ? (isBn ? 'KYC যাচাই শেষ হলে জানানো হবে।' : 'We’ll notify you when KYC review is complete.')
                        : (isBn ? 'আপনার সেলার অ্যাকাউন্ট বর্তমানে সক্রিয় নয়।' : 'Your seller account is not currently active.')}
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onClose?.();
                      onOpenVendorModal();
                    }}
                    className="w-full flex items-center justify-between gap-3 rounded-xl bg-[var(--pm-accent)] px-3 py-3 text-left text-xs font-bold text-[var(--pm-accent-fg)] hover:bg-[var(--pm-accent-hover)] transition-colors cursor-pointer"
                  >
                    <span>
                      <span className="block">{isBn ? 'সেলার অ্যাকাউন্ট তৈরি করুন' : 'Create seller account'}</span>
                      <span className="mt-0.5 block text-[10px] font-normal opacity-80">{isBn ? '৫ ধাপের ব্যবসা যাচাই' : '5-step business verification'}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  </button>
                )
              ) : (
                <p className="rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] px-3 py-3 text-xs text-[var(--pm-muted)]">
                  {isBn ? 'ব্যবসা পরিচালনার আগে আমার অ্যাকাউন্ট থেকে সাইন ইন করুন।' : 'Sign in from My Account before managing a business.'}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-[var(--pm-border)]" />

        <div className="space-y-1">
          <button
            type="button"
            onClick={() => toggleSection('appSettings')}
            aria-expanded={openSections.appSettings}
            className="w-full px-2 py-2 flex items-center justify-between text-sm font-bold text-[var(--pm-text)] hover:bg-[var(--pm-card-hover)] rounded-xl transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <SettingsIcon className="w-4 h-4 text-violet-500" />
              <span>{isBn ? 'অ্যাপ সেটিংস' : 'App Settings'}</span>
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${openSections.appSettings ? 'rotate-180' : ''}`} />
          </button>

          {openSections.appSettings && (
            <div className="space-y-3 pl-2 pt-1">
              <button
                type="button"
                onClick={() => openSettingsTarget('appearance')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold text-left transition-all cursor-pointer ${
                currentTab === 'settings'
                    ? 'bg-[var(--pm-accent-soft)] text-[var(--pm-accent)]'
                    : 'hover:bg-[var(--pm-card-hover)]'
                }`}
              >
                <div className="p-1.5 rounded-xl bg-violet-500/15 text-violet-500 shrink-0">
                <SettingsIcon className="w-4 h-4" />
                </div>
                <span className="truncate">{isBn ? 'সেটিংস সেন্টার' : 'Settings center'}</span>
              </button>

              <div className="rounded-xl border border-[var(--pm-border)] bg-[var(--pm-surface)] p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="block text-xs font-semibold text-[var(--pm-text)]">
                    {isBn ? 'আপনার অবস্থান' : 'Your location'}
                  </span>
                  <span className="block truncate text-[10px] text-[var(--pm-muted)]">
                    {locationSummary}
                  </span>
                </div>
                <MapPin className="h-4 w-4 shrink-0 text-[var(--pm-accent)]" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose?.();
                    onOpenLocationModal?.();
                  }}
                  className="min-h-11 rounded-lg border border-[var(--pm-border)] bg-[var(--pm-card)] px-2 py-2 text-[10px] font-semibold text-[var(--pm-text)] hover:bg-[var(--pm-card-hover)]"
                >
                  {isBn ? 'অবস্থান বদলান' : 'Change location'}
                </button>
                <button
                  type="button"
                  onClick={() => detectLiveLocation()}
                  disabled={isLocating}
                  className="flex min-h-11 items-center justify-center gap-1 rounded-lg border border-[var(--pm-border)] bg-[var(--pm-card)] px-2 py-2 text-[10px] font-semibold text-[var(--pm-text)] hover:bg-[var(--pm-card-hover)] disabled:opacity-50"
                >
                  {isLocating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Navigation className="h-3 w-3" />}
                  {isBn ? 'লাইভ লোকেশন' : 'Use live location'}
                </button>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--pm-border)] bg-[var(--pm-surface)] p-3 space-y-2">
                <span className="text-xs font-semibold text-[var(--pm-text)]">{isBn ? 'রঙের থিম' : 'Color theme'}</span>
                <div className="grid grid-cols-3 gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setThemeMode(preset.id)}
                    aria-label={isBn ? preset.nameBn : preset.nameEn}
                    aria-pressed={themeMode === preset.id}
                    title={isBn ? preset.nameBn : preset.nameEn}
                    className={`flex h-8 items-center justify-center rounded-lg border transition-colors ${
                      themeMode === preset.id
                        ? 'border-[var(--pm-accent)] ring-2 ring-[var(--pm-accent)]/30'
                        : 'border-[var(--pm-border)] hover:border-[var(--pm-accent)]'
                    }`}
                    style={{ backgroundColor: preset.bgHex }}
                  >
                    <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: preset.accentHex }} />
                  </button>
                ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
                className="w-full flex items-center justify-between rounded-xl border border-[var(--pm-border)] bg-[var(--pm-surface)] px-3 py-2.5 text-xs font-semibold text-[var(--pm-text)] hover:bg-[var(--pm-card-hover)]"
              >
                <span className="flex items-center gap-2"><Globe className="h-4 w-4 text-[var(--pm-accent)]" />{isBn ? 'অ্যাপের ভাষা' : 'App language'}</span>
                <span className="text-[var(--pm-muted)]">{isBn ? 'বাংলা' : 'English'}</span>
              </button>
              {isSuperAdmin && onOpenSuperAdminModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose?.();
                    onOpenSuperAdminModal();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-purple-600 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>{isBn ? 'সুপার অ্যাডমিন সেন্টার' : 'Super Admin Center'}</span>
                  </span>
                  <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold">Admin</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-[var(--pm-border)]" />

        <div className="space-y-1">
          <button
            type="button"
            onClick={() => toggleSection('help')}
            aria-expanded={openSections.help}
            className="w-full px-2 py-2 flex items-center justify-between text-sm font-bold text-[var(--pm-text)] hover:bg-[var(--pm-card-hover)] rounded-xl transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <BookOpen className="w-4 h-4 text-sky-500" />
              <span>{isBn ? 'সাহায্য ও গাইড' : 'Help & guides'}</span>
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${openSections.help ? 'rotate-180' : ''}`} />
          </button>
          {openSections.help && (
            <div className="space-y-1 pl-2">
              <button
                type="button"
                onClick={() => navigateAndClose('guide')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-colors cursor-pointer ${
                currentTab === 'guide' ? 'bg-[var(--pm-accent-soft)] text-[var(--pm-accent)]' : 'hover:bg-[var(--pm-card-hover)]'
                }`}
              >
                <BookOpen className="w-4 h-4 text-sky-500" />
                <span>{isBn ? 'ব্যবহারকারী ও সেলার গাইড' : 'User & seller guide'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                onClose?.();
                onOpenCloudGuide();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-left hover:bg-[var(--pm-card-hover)] transition-colors cursor-pointer"
              >
                <Cloud className="w-4 h-4 text-[var(--pm-accent)]" />
                <span>{isBn ? 'মাল্টি-ক্লাউড ডিপ্লয় গাইড' : 'Multi-cloud deploy guide'}</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {/* App version footer */}
      <div
        className={`shrink-0 border-t border-[var(--pm-border)] bg-[var(--pm-surface)] ${
          mode === 'drawer' ? 'p-4' : 'p-3 mt-3 rounded-2xl border'
        }`}
      >
        <div className="flex items-center justify-between text-[10px] text-[var(--pm-muted)]">
          <span>PaikarMart v2.6 · Bangladesh</span>
        </div>
      </div>
    </div>
  );

  if (mode === 'drawer') {
    return (
      <div className="fixed inset-0 z-50 flex justify-start bg-black/70 backdrop-blur-xs animate-fadeIn">
        <div
          className="relative w-full max-w-xs sm:max-w-sm h-full bg-[var(--pm-surface)] border-r border-[var(--pm-border)] shadow-2xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {innerContent}
        </div>
        <div className="flex-1" onClick={onClose} aria-hidden="true" />
      </div>
    );
  }

  return (
    <aside className="hidden lg:block w-64 xl:w-72 shrink-0 sticky top-18 h-[calc(100vh-5rem)] rounded-3xl transition-all duration-300">
      {innerContent}
    </aside>
  );
};
