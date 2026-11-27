import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Languages, 
  MapPin, 
  Info, 
  User as UserIcon, 
  ShieldCheck, 
  Home, 
  CreditCard, 
  Bell, 
  Store, 
  FileCheck2, 
  Landmark, 
  Truck, 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  Search, 
  X, 
  ArrowLeft,
  Sparkles,
  Sun,
  Moon,
  Laptop,
  Check,
  Building2,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { PortalTab, SettingsSectionId, User } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { LocationPreferences } from '@/portals/utilities/settings-center/components/LocationPreferences';
import { DEFAULT_AVATAR_URL, safeMediaSrc } from '@/shared/utils';

// User Account Pages
import {
  PersonalProfilePage,
  SecuritySettingsPage,
  SavedAddressesPage,
  PaymentMethodsPage,
  NotificationPreferencesPage
} from '@/portals/utilities/user-profile/components/account';

// Vendor Merchant Pages
import {
  StorefrontSettingsPage,
  BusinessKYCSettingsPage,
  PayoutSettingsPage,
  FulfillmentSettingsPage,
  StoreHoursSettingsPage
} from '@/portals/utilities/seller-central/components/settings';

export type { SettingsSectionId };

interface SettingsPortalProps {
  initialSection?: SettingsSectionId;
  currentUser?: User;
  onSelectTab?: (tab: PortalTab) => void;
  onUpdateUser?: (updated: User) => void;
  onClose?: () => void;
}

export const SettingsPortal: React.FC<SettingsPortalProps> = ({
  initialSection = 'account_profile',
  currentUser,
  onSelectTab,
  onUpdateUser,
  onClose
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { themeMode, setThemeMode, accentColor, setAccentColor, presets } = useTheme();
  const isBn = language === 'bn';

  const [activeSection, setActiveSection] = useState<SettingsSectionId>(initialSection);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileDetailView, setMobileDetailView] = useState(false);

  // Sync if initialSection changes from outside (e.g. from Sidebar drawer link click)
  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
      setMobileDetailView(true);
    }
  }, [initialSection]);

  const navGroups: {
    id: 'common' | 'account' | 'vendor';
    title: string;
    description: string;
    items: {
      id: SettingsSectionId;
      label: string;
      desc: string;
      icon: React.ComponentType<{ className?: string }>;
      badge?: string;
      accentColor: string;
    }[];
  }[] = [
    {
      id: 'common',
      title: isBn ? 'সাধারণ সেটিংস ও সিস্টেম' : 'General & System Preferences',
      description: isBn ? 'থিম, ভাষা, ঠিকানার এলাকা ও অ্যাপ তথ্য' : 'Theme, language, address area & system configuration',
      items: [
        {
          id: 'appearance',
          label: isBn ? 'থিম ও ডিসপ্লে মোড' : 'Theme & Display',
          desc: isBn ? 'ডার্ক মোড, ওলেড নাইট, লাইট মোড ও সিস্টেম অটো' : 'Dark, light, and system display theme',
          icon: Palette,
          accentColor: 'text-violet-500 bg-violet-500/10 dark:bg-violet-500/20',
        },
        {
          id: 'language',
          label: isBn ? 'ভাষা ও আঞ্চলিক রূপ' : 'Language & Region',
          desc: isBn ? 'বাংলা ও ইংরেজি ভাষা নির্বাচন, মুদ্রা ও সংখ্যা' : 'Switch Bengali and English localization',
          icon: Languages,
          accentColor: 'text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20',
        },
        {
          id: 'location',
          label: isBn ? 'ঠিকানার এলাকা ও GPS' : 'Address Area & GPS',
          desc: isBn ? 'বিভাগ, জেলা, উপজেলা/থানা ও GPS কোঅর্ডিনেট' : 'Division, district, upazila/thana & GPS coordinates',
          icon: MapPin,
          badge: isBn ? 'সক্রিয়' : 'LIVE',
          accentColor: 'text-blue-500 bg-blue-500/10 dark:bg-blue-500/20',
        },
        {
          id: 'about',
          label: isBn ? 'অ্যাপ সম্পর্কিত তথ্য' : 'About Platform & Policies',
          desc: isBn ? 'অ্যাপের তথ্য ও নীতিমালার অবস্থা' : 'App information and policy availability',
          icon: Info,
          accentColor: 'text-amber-500 bg-amber-500/10 dark:bg-amber-500/20',
        },
      ],
    },
    {
      id: 'account',
      title: isBn ? 'ব্যবহারকারী অ্যাকাউন্ট' : 'User Account & Security',
      description: isBn ? 'প্রোফাইল তথ্য, ঠিকানা, পেমেন্ট কার্ড এবং নোটিফিকেশন' : 'Personal information, security, addresses & payments',
      items: [
        {
          id: 'account_profile',
          label: isBn ? 'ব্যক্তিগত তথ্য ও প্রোফাইল' : 'Personal Profile',
          desc: isBn ? 'নাম, ইউজারনেম, ইমেল ও যোগাযোগের তথ্য' : 'Name, username and contact details',
          icon: UserIcon,
          accentColor: 'text-sky-500 bg-sky-500/10 dark:bg-sky-500/20',
        },
        {
          id: 'account_security',
          label: isBn ? 'পাসওয়ার্ড ও ২-ফ্যাক্টর নিরাপত্তা' : 'Login & Security',
          desc: isBn ? 'পাসওয়ার্ড, যাচাইকরণ ও ডিভাইস অ্যাক্সেস' : 'Password, verification & device access',
          icon: ShieldCheck,
          accentColor: 'text-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/20',
        },
        {
          id: 'account_addresses',
          label: isBn ? 'সংরক্ষিত ডেলিভারি ঠিকানা' : 'Saved Addresses',
          desc: isBn ? 'হোম ও অফিস ঠিকানা, ডেলিভারি রোডম্যাপ ও নোট' : 'Home, office, and default delivery destinations',
          icon: Home,
          accentColor: 'text-rose-500 bg-rose-500/10 dark:bg-rose-500/20',
        },
        {
          id: 'account_payments',
          label: isBn ? 'পেমেন্ট মাধ্যম ও ওয়ালেট' : 'Payment Methods',
          desc: isBn ? 'ভিসা/মাস্টারকার্ড এবং বিকাশ/নগদ ওয়ালেট' : 'Credit/debit cards and mobile banking wallets',
          icon: CreditCard,
          accentColor: 'text-teal-500 bg-teal-500/10 dark:bg-teal-500/20',
        },
        {
          id: 'account_notifications',
          label: isBn ? 'নোটিফিকেশন ও অ্যালার্ট' : 'Notification Preferences',
          desc: isBn ? 'অর্ডার ট্র্যাকিং এসএমএস, রাইডার আপডেট ও প্রোমো' : 'Order tracking SMS, email alerts & deals',
          icon: Bell,
          accentColor: 'text-amber-500 bg-amber-500/10 dark:bg-amber-500/20',
        },
      ],
    },
    {
      id: 'vendor',
      title: isBn ? 'মার্চেন্ট ও বিক্রেতা হাব' : 'Vendor & Merchant Business',
      description: isBn ? 'দোকানের ব্র্যান্ডিং, ট্রেড লাইসেন্স, পেআউট এবং কুরিয়ার' : 'Storefront profile, business KYC, payouts & delivery',
      items: [
        {
          id: 'vendor_store',
          label: isBn ? 'দোকানের ব্র্যান্ডিং ও পরিচিতি' : 'Storefront & Branding',
          desc: isBn ? 'দোকানের লোগো, ব্যানার, স্লোগান ও কাস্টমার হেল্পলাইন' : 'Store trade name, banner, logo & public helpline',
          icon: Store,
          accentColor: 'text-purple-500 bg-purple-500/10 dark:bg-purple-500/20',
        },
        {
          id: 'vendor_kyc',
          label: isBn ? 'ট্রেড লাইসেন্স ও ট্যাক্স (KYC)' : 'Business KYC & Tax',
          desc: isBn ? 'ট্রেড লাইসেন্স নম্বর, ই-টিন ও ভ্যাট বিআইএন রেজিস্ট্রেশন' : 'Trade license, e-TIN, BIN VAT certificate verification',
          icon: FileCheck2,
          badge: currentUser?.vendorProfile?.verified ? (isBn ? 'ভেরিফাইড' : 'VERIFIED') : undefined,
          accentColor: 'text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20',
        },
        {
          id: 'vendor_payout',
          label: isBn ? 'পেআউট ও ব্যাংক অ্যাকাউন্ট' : 'Payout & Settlements',
          desc: isBn ? 'ব্যাংক ট্রান্সফার, বিকাশ মার্চেন্ট ও উইথড্র শিডিউল' : 'Bank settlement, MFS merchant wallet & auto-payout',
          icon: Landmark,
          accentColor: 'text-green-500 bg-green-500/10 dark:bg-green-500/20',
        },
        {
          id: 'vendor_fulfillment',
          label: isBn ? 'ডেলিভারি চার্জ ও কুরিয়ার' : 'Delivery & Fulfillment',
          desc: isBn ? 'শিপিং রেট, ফ্রি ডেলিভারি অফার ও কুরিয়ার পার্টনার' : 'Shipping charges, courier APIs & delivery radius',
          icon: Truck,
          accentColor: 'text-cyan-500 bg-cyan-500/10 dark:bg-cyan-500/20',
        },
        {
          id: 'vendor_hours',
          label: isBn ? 'কর্মঘণ্টা ও ছুটি মোড' : 'Store Hours & Vacation',
          desc: isBn ? 'সাপ্তাহিক খোলার সময় ও জরুরি ভ্যাকেশন পজ নোটিশ' : 'Daily timetable, off-days & emergency store pause',
          icon: Clock,
          accentColor: 'text-orange-500 bg-orange-500/10 dark:bg-orange-500/20',
        },
      ],
    },
  ];

  const activeGroup = navGroups.find((group) => group.items.some((item) => item.id === activeSection));
  const visibleGroups = activeGroup ? [activeGroup] : [navGroups[0]];
  const allItems = visibleGroups.flatMap((group) =>
    group.items.map((item) => ({ ...item, group: group.title }))
  );
  const filteredItems = searchQuery.trim()
    ? allItems.filter(item => 
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.group.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  const handleSelectSection = (id: SettingsSectionId) => {
    setActiveSection(id);
    setMobileDetailView(true);
  };

  const currentItem = allItems.find((item) => item.id === activeSection) || visibleGroups[0].items[0];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[var(--pm-bg)] text-[var(--pm-text)] pb-24 md:pb-16">
      <div className="hidden md:block bg-[var(--pm-surface)] border-b border-[var(--pm-border)] sticky top-16 z-20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="hidden md:inline-flex min-w-11 min-h-11 p-2 -ml-2 rounded-xl text-[var(--pm-muted)] hover:text-[var(--pm-text)] hover:bg-[var(--pm-card-hover)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-accent)]"
                title={isBn ? 'ফিরে যান' : 'Go back'}
                aria-label={isBn ? 'ফিরে যান' : 'Go back'}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : onSelectTab ? (
              <button
                type="button"
                onClick={() => onSelectTab('feed')}
                className="hidden md:inline-flex min-w-11 min-h-11 p-2 -ml-2 rounded-xl text-[var(--pm-muted)] hover:text-[var(--pm-text)] hover:bg-[var(--pm-card-hover)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-accent)]"
                title={isBn ? 'হোমে ফিরে যান' : 'Back to Home'}
                aria-label={isBn ? 'হোমে ফিরে যান' : 'Back to Home'}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : null}

            <div>
              <h1 className="text-lg sm:text-xl font-bold text-[var(--pm-text)] tracking-tight">
                {isBn ? 'সেটিংস' : 'Settings'}
              </h1>
            </div>
          </div>

        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-start">
          
          {/* =======================
              LEFT SIDEBAR NAVIGATION
              (Desktop always, Mobile hidden if detailView)
             ======================= */}
          <aside className={`md:col-span-4 lg:col-span-4 space-y-4 ${mobileDetailView ? 'hidden md:block' : 'block'}`}>
            {/* User Quick Info Tile */}
            {currentUser && (
              <div className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-[var(--pm-card)] border border-[var(--pm-border)] shadow-xs flex items-center gap-3.5">
                <img
                  src={safeMediaSrc(currentUser.avatar, DEFAULT_AVATAR_URL)}
                  alt={currentUser.name}
                  className="w-12 h-12 rounded-2xl object-cover ring-2 ring-[var(--pm-accent-border)]"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-black text-[var(--pm-text)] truncate">
                    {currentUser.name}
                  </h4>
                  <p className="text-xs text-[var(--pm-muted)] font-mono truncate">
                    @{currentUser.handle?.replace(/^@+/, '')}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--pm-accent-soft)] text-[var(--pm-accent)] capitalize">
                      {currentUser.role}
                    </span>
                    {currentUser.isVendor && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--pm-success-soft)] text-[var(--pm-success)]">
                        {isBn ? 'মার্চেন্ট' : 'Vendor'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* In-Settings Fast Search Filter */}
            <div className="relative">
              <Search className="w-4 h-4 text-[var(--pm-muted)] absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isBn ? 'সেটিংস খুঁজুন (যেমন: পাসওয়ার্ড, বিকাশ, থিম)...' : 'Filter settings (e.g. password, bank, theme)...'}
                className="w-full pl-9 pr-9 py-2.5 rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-input)] text-xs text-[var(--pm-text)] focus:border-[var(--pm-accent)] focus:outline-hidden shadow-xs placeholder:text-[var(--pm-muted)]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-[var(--pm-muted)] hover:text-[var(--pm-text)]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filtered Search Results or Categorized Groups */}
            {filteredItems ? (
              <div className="p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl bg-[var(--pm-card)] border border-[var(--pm-border)] shadow-xs space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-[var(--pm-muted)] px-3 py-1">
                  {isBn ? `খোঁজের ফলাফল (${filteredItems.length})` : `Matching Sections (${filteredItems.length})`}
                </p>
                {filteredItems.length === 0 ? (
                  <p className="text-xs text-[var(--pm-muted)] p-4 text-center">
                    {isBn ? 'কোনো সেটিংস পাওয়া যায়নি' : 'No settings matching your search'}
                  </p>
                ) : (
                  filteredItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectSection(item.id)}
                        className={`w-full p-2.5 rounded-2xl text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] shadow-md'
                            : 'hover:bg-[var(--pm-card-hover)] text-[var(--pm-text)]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-xl shrink-0 ${isActive ? 'bg-black/15 text-[var(--pm-accent-fg)]' : item.accentColor}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{item.label}</p>
                            <p className={`text-[10px] truncate ${isActive ? 'opacity-80' : 'text-[var(--pm-muted)]'}`}>
                              {item.group}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 shrink-0 ${isActive ? 'text-[var(--pm-accent-fg)]' : 'text-[var(--pm-muted)]'}`} />
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              /* Grouped List */
              <div className="space-y-4">
                {visibleGroups.map((group) => (
                  <div
                    key={group.id}
                    className="p-3 sm:p-4 rounded-3xl bg-[var(--pm-card)] border border-[var(--pm-border)] shadow-xs space-y-1"
                  >
                    <div className="px-3 py-1 mb-1">
                      <h3 className="text-sm font-bold text-[var(--pm-text)]">
                        {group.title}
                      </h3>
                      <p className="text-xs text-[var(--pm-muted)]">
                        {group.description}
                      </p>
                    </div>

                    <div className="space-y-1">
                      {group.items.map(item => {
                        const Icon = item.icon;
                        const isActive = activeSection === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectSection(item.id)}
                            className={`w-full p-2.5 sm:p-3 rounded-2xl text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                              isActive
                                ? 'bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] shadow-md'
                                : 'hover:bg-[var(--pm-card-hover)] text-[var(--pm-text)]'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`p-2 rounded-xl shrink-0 ${isActive ? 'bg-black/15 text-[var(--pm-accent-fg)]' : item.accentColor}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold truncate">{item.label}</span>
                                  {item.badge && (
                                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase ${
                                      isActive 
                                        ? 'bg-black/20 text-[var(--pm-accent-fg)]' 
                                        : 'bg-[var(--pm-success-soft)] text-[var(--pm-success)]'
                                    }`}>
                                      {item.badge}
                                    </span>
                                  )}
                                </div>
                                <p className={`text-[11px] leading-4 line-clamp-2 ${isActive ? 'opacity-80' : 'text-[var(--pm-muted)]'}`}>
                                  {item.desc}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'text-[var(--pm-accent-fg)] translate-x-0.5' : 'text-[var(--pm-muted)]'}`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>

          {/* =======================
              RIGHT DETAIL CONTENT PANEL
              (Desktop always, Mobile hidden if !detailView)
             ======================= */}
          <main className={`md:col-span-8 lg:col-span-8 ${mobileDetailView ? 'block' : 'hidden md:block'}`}>
            {/* Mobile Drill-Down Back Header */}
            <div className="md:hidden mb-4 flex items-center justify-between p-3 rounded-2xl bg-[var(--pm-card)] border border-[var(--pm-border)] shadow-xs">
              <button
                type="button"
                onClick={() => setMobileDetailView(false)}
                className="flex items-center gap-2 text-xs font-black text-[var(--pm-accent)] cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{isBn ? 'সেটিংস মেন্যুতে ফিরে যান' : 'Back to Settings Menu'}</span>
              </button>

              <span className="text-xs font-bold text-[var(--pm-muted)]">
                {currentItem.label}
              </span>
            </div>

            {/* Desktop Breadcrumbs Bar */}
            <div className="hidden md:flex items-center justify-between pb-4 mb-4 border-b border-[var(--pm-border)]">
              <div className="flex items-center gap-2 text-xs text-[var(--pm-muted)]">
                <span>{isBn ? 'সেটিংস' : 'Settings'}</span>
                <ChevronRight className="w-3.5 h-3.5 text-[var(--pm-muted)]" />
                <span className="font-bold text-[var(--pm-text)]">{currentItem.label}</span>
              </div>

            </div>

            {/* Dynamic Content View based on activeSection */}
            <div className="transition-all">
              {/* COMMON: Theme & Appearance */}
              {activeSection === 'appearance' && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h3 className="text-lg font-black text-[var(--pm-text)]">
                      {isBn ? 'ডিসপ্লে থিম ও ভিজ্যুয়াল স্টাইল' : 'Appearance & Visual Theme'}
                    </h3>
                    <p className="text-xs text-[var(--pm-muted)]">
                      {isBn ? 'PaikarMart-এর চেহারা বেছে নিন। পরে যেকোনো সময় বদলাতে পারবেন।' : 'Choose how PaikarMart looks. You can change it anytime.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {presets.map((preset) => {
                      const Icon =
                        preset.id === 'light'
                          ? Sun
                          : preset.id === 'system'
                            ? Laptop
                            : preset.id === 'nakshiLight' || preset.id === 'greenField'
                              ? Sparkles
                              : Moon;
                      const isSelected = themeMode === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setThemeMode(preset.id)}
                          aria-pressed={isSelected}
                          className={`p-4 rounded-3xl border text-left transition-all cursor-pointer relative ${
                            isSelected
                              ? 'border-[var(--pm-accent)] bg-[var(--pm-accent-soft)] ring-2 ring-[var(--pm-accent-border)] shadow-md'
                              : 'border-[var(--pm-border)] bg-[var(--pm-card)] hover:bg-[var(--pm-card-hover)] text-[var(--pm-text)]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div
                              className="p-2.5 rounded-2xl w-fit border border-black/10 shadow-xs"
                              style={{ backgroundColor: preset.bgHex, color: preset.accentHex }}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                            <span
                              className="w-4 h-4 rounded-full border border-white/50 shadow-xs"
                              style={{ backgroundColor: preset.accentHex }}
                            />
                          </div>
                          <p className="text-sm font-black text-[var(--pm-text)]">
                            {isBn ? preset.nameBn : preset.nameEn}
                          </p>
                          <p className="text-xs text-[var(--pm-muted)] mt-1">
                            {isBn ? preset.descBn : preset.descEn}
                          </p>
                          {isSelected && (
                            <div
                              className="absolute top-3 right-3 p-1 rounded-full text-white"
                              style={{ backgroundColor: preset.accentHex }}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-5 rounded-3xl bg-[var(--pm-card)] border border-[var(--pm-border)] shadow-xs space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-[var(--pm-text)]">
                      {isBn ? 'অ্যাকসেন্ট রং' : 'Accent color'}
                    </h4>
                    <p className="text-xs text-[var(--pm-muted)]">
                      {isBn ? 'বাটন ও হাইলাইটের জন্য সবুজ বা সোনালি রং বেছে নিন।' : 'Choose a green or mango-gold accent for buttons and highlights.'}
                    </p>
                    <div className="flex items-center gap-3 pt-1">
                      {['#4dbb80', '#087a55', '#54c98b', '#f2c14e', '#885700'].map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setAccentColor(col)}
                          aria-label={`Select accent ${col}`}
                          style={{ backgroundColor: col }}
                          className={`w-8 h-8 rounded-full cursor-pointer transition-all ${
                            accentColor.toLowerCase() === col.toLowerCase()
                              ? 'ring-2 ring-offset-2 ring-[var(--pm-accent)] scale-110'
                              : 'opacity-80 hover:opacity-100'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* COMMON: Language & Region */}
              {activeSection === 'language' && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h3 className="text-lg font-black text-[var(--pm-text)]">
                      {isBn ? 'ভাষা ও আঞ্চলিক সেটিংস' : 'Language & Regional Localization'}
                    </h3>
                    <p className="text-xs text-[var(--pm-muted)]">
                      {isBn ? 'আপনার পছন্দের ইন্টারফেস ভাষা নির্বাচন করুন' : 'Select your preferred language and regional formatting'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setLanguage('bn')}
                      className={`p-5 rounded-3xl border text-left transition-all cursor-pointer relative ${
                        language === 'bn'
                          ? 'border-[var(--pm-accent)] bg-[var(--pm-accent-soft)] text-[var(--pm-text)] ring-2 ring-[var(--pm-accent-border)] shadow-md'
                          : 'border-[var(--pm-border)] bg-[var(--pm-card)] hover:bg-[var(--pm-card-hover)] text-[var(--pm-text)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-black">বাংলা</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--pm-success-soft)] text-[var(--pm-success)]">
                          Bangladesh
                        </span>
                      </div>
                      <p className="text-xs text-[var(--pm-muted)]">
                        সম্পূর্ণ ইন্টারফেস, পণ্য ক্যাটাগরি, তারিখ ও টাকা (৳) ফরম্যাট বাংলায় প্রদর্শিত হবে।
                      </p>
                      {language === 'bn' && (
                        <div className="mt-4 flex items-center gap-1.5 text-xs font-black text-[var(--pm-accent)]">
                          <Check className="w-4 h-4" />
                          <span>বর্তমান নির্বাচিত ভাষা</span>
                        </div>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setLanguage('en')}
                      className={`p-5 rounded-3xl border text-left transition-all cursor-pointer relative ${
                        language === 'en'
                          ? 'border-[var(--pm-accent)] bg-[var(--pm-accent-soft)] text-[var(--pm-text)] ring-2 ring-[var(--pm-accent-border)] shadow-md'
                          : 'border-[var(--pm-border)] bg-[var(--pm-card)] hover:bg-[var(--pm-card-hover)] text-[var(--pm-text)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-black">English</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--pm-accent-soft)] text-[var(--pm-accent)]">
                          Global
                        </span>
                      </div>
                      <p className="text-xs text-[var(--pm-muted)]">
                        Universal English interface with international number formatting and currency previews.
                      </p>
                      {language === 'en' && (
                        <div className="mt-4 flex items-center gap-1.5 text-xs font-black text-[var(--pm-accent)]">
                          <Check className="w-4 h-4" />
                          <span>Active Language</span>
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* COMMON: Live GPS Radar & Preferences */}
              {activeSection === 'location' && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h3 className="text-lg font-black text-[var(--pm-text)]">
                      {isBn ? 'ঠিকানার এলাকা ও GPS লোকেশন' : 'Address Area & GPS Location'}
                    </h3>
                    <p className="text-xs text-[var(--pm-muted)]">
                      {isBn ? 'বিভাগ, জেলা, উপজেলা/থানা অনুযায়ী দোকান ও সেবা খুঁজুন' : 'Find shops and services by division, district, upazila or thana'}
                    </p>
                  </div>

                  <LocationPreferences />
                </div>
              )}

              {/* COMMON: About App & Policies */}
              {activeSection === 'about' && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h3 className="text-lg font-black text-[var(--pm-text)]">
                      {isBn ? 'PaikarMart সম্পর্কে' : 'About PaikarMart'}
                    </h3>
                    <p className="text-xs text-[var(--pm-muted)]">
                      {isBn ? 'অ্যাপের তথ্য ও নীতিমালার অবস্থা' : 'App information and policy availability'}
                    </p>
                  </div>

                  <div className="p-6 rounded-3xl bg-[var(--pm-card)] border border-[var(--pm-border)] shadow-xs space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[var(--pm-accent)] flex items-center justify-center text-[var(--pm-accent-fg)] font-black text-xl shadow-md">
                        P
                      </div>
                      <div>
                        <h4 className="text-base font-black text-[var(--pm-text)]">
                          PaikarMart
                        </h4>
                      </div>
                    </div>

                    <p className="text-xs text-[var(--pm-muted)] leading-relaxed">
                      {isBn
                        ? 'স্থানীয় কেনাকাটা, কমিউনিটি, সেবা ও সেলার টুলস PaikarMart-এ এক জায়গায় পাওয়া যায়।'
                        : 'PaikarMart brings local shopping, community, services and seller tools into one place.'}
                    </p>

                    <div className="space-y-2 border-t border-[var(--pm-border)] pt-3">
                      <h5 className="text-sm font-bold text-[var(--pm-text)]">
                        {isBn ? 'নীতিমালা' : 'Policies'}
                      </h5>
                      <p className="text-xs leading-relaxed text-[var(--pm-muted)]">
                        {isBn
                          ? 'গোপনীয়তা ও ব্যবহারের নীতিমালা এই প্রিভিউতে এখনো প্রকাশিত হয়নি।'
                          : 'Privacy and usage policies are not published in this preview yet.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* USER ACCOUNT PAGES */}
              {activeSection === 'account_profile' && (
                <PersonalProfilePage
                  currentUser={currentUser}
                  onUpdateUser={onUpdateUser}
                />
              )}

              {activeSection === 'account_security' && (
                <SecuritySettingsPage />
              )}

              {activeSection === 'account_addresses' && (
                <SavedAddressesPage />
              )}

              {activeSection === 'account_payments' && (
                <PaymentMethodsPage />
              )}

              {activeSection === 'account_notifications' && (
                <NotificationPreferencesPage />
              )}

              {/* VENDOR MERCHANT PAGES */}
              {activeSection === 'vendor_store' && (
                <StorefrontSettingsPage />
              )}

              {activeSection === 'vendor_kyc' && (
                <BusinessKYCSettingsPage />
              )}

              {activeSection === 'vendor_payout' && (
                <PayoutSettingsPage />
              )}

              {activeSection === 'vendor_fulfillment' && (
                <FulfillmentSettingsPage />
              )}

              {activeSection === 'vendor_hours' && (
                <StoreHoursSettingsPage />
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
