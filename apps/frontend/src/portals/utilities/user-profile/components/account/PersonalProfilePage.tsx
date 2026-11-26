import React, { useState } from 'react';
import { User, Camera, Mail, Phone, MapPin, AtSign, Check, Sparkles, GraduationCap, Briefcase, Award, ShieldCheck, Store, Video, Wrench, Loader2 } from 'lucide-react';
import { User as UserType } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { CURRENT_USER } from '@/data/mockData';
import { promoteToCreatorApi, promoteToSellerApi, syncAuthenticatedProfile, updateFirebaseIdentityProfile, useAuth } from '@/features/auth';
import { DEFAULT_AVATAR_URL, safeMediaSrc } from '@/shared/utils';
import { PersonalVerificationModal } from '../PersonalVerificationModal';

interface PersonalProfilePageProps {
  currentUser?: UserType;
  onUpdateUser?: (updatedUser: UserType) => void;
}

export const PersonalProfilePage: React.FC<PersonalProfilePageProps> = ({
  currentUser = CURRENT_USER,
  onUpdateUser = () => {},
}) => {
  const { language } = useLanguage();
  const { 
    firebaseUser, 
    refetchProfile, 
    activeProfileMode, 
    hasPaikarMartAccess, 
    switchProfileMode, 
    personalUser 
  } = useAuth();
  const [name, setName] = useState(currentUser.name);
  const [handle, setHandle] = useState(currentUser.handle || '@alexrivera');
  const [email] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [bio, setBio] = useState(currentUser.bio || 'Product enthusiast, wholesale sourcer, and passionate creator on PaikarMart.');
  const [location, setLocation] = useState(currentUser.location || 'Dhaka, Bangladesh');
  const [profession, setProfession] = useState(currentUser.profession || '');
  const [education, setEducation] = useState(currentUser.education || '');
  const [skillsInput, setSkillsInput] = useState((currentUser.skills || []).join(', '));
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSellerSetup, setShowSellerSetup] = useState(false);
  const [sellerShopName, setSellerShopName] = useState(currentUser.vendorProfile?.storeName || `${currentUser.name} Store`);
  const [sellerShopType, setSellerShopType] = useState<'retail' | 'wholesale' | 'service'>('retail');
  const [promotingRole, setPromotingRole] = useState<'seller' | 'creator' | null>(null);
  const [roleFeedback, setRoleFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  React.useEffect(() => {
    if (!isSaving) {
      setName(currentUser.name);
      setHandle(currentUser.handle || '@alexrivera');
      setPhone(currentUser.phone || '');
      setLocation(currentUser.location || 'Dhaka, Bangladesh');
      setProfession(currentUser.profession || '');
      setEducation(currentUser.education || '');
      setSkillsInput((currentUser.skills || []).join(', '));
    }
  }, [currentUser.id, currentUser.name, currentUser.handle, currentUser.phone, currentUser.location, currentUser.profession, currentUser.education, currentUser.skills, isSaving]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    try {
      await syncAuthenticatedProfile({ name, handle, location, phone });
      if (firebaseUser) {
        await updateFirebaseIdentityProfile({
          name,
          handle,
          role: currentUser.role,
          avatar: currentUser.avatar,
          location,
        });
        await refetchProfile().catch(() => {});
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Profile sync failed.');
      setIsSaving(false);
      return;
    }
    const parsedSkills = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    onUpdateUser({
      ...currentUser,
      name,
      handle,
      location,
      phone,
      bio,
      profession: profession.trim() || undefined,
      education: education.trim() || undefined,
      skills: parsedSkills,
    });
    setSavedSuccess(true);
    setIsSaving(false);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const isBn = language === 'bn';

  const activeCaps = Array.isArray((currentUser as any).activeCapabilities)
    ? ((currentUser as any).activeCapabilities as string[])
    : [];
  const isPrivileged = currentUser.role === 'admin' || currentUser.role === 'super_admin';
  const hasSellerAccess = Boolean(
    currentUser.isVendor ||
      currentUser.role === 'vendor' ||
      isPrivileged ||
      activeCaps.includes('vendor') ||
      activeCaps.includes('seller')
  );
  const hasCreatorAccess = Boolean(
    isPrivileged ||
      activeCaps.includes('creator')
  );

  const handleActivateSeller = async () => {
    if (!firebaseUser) {
      setRoleFeedback({
        type: 'error',
        message: isBn ? 'সেলার অ্যাকাউন্ট চালু করতে আগে সাইন-ইন করুন।' : 'Please sign in first to activate a Seller account.',
      });
      return;
    }
    const cleanShopName = sellerShopName.trim();
    if (cleanShopName.length < 2) {
      setRoleFeedback({
        type: 'error',
        message: isBn ? 'সঠিক শপ বা সার্ভিসের নাম লিখুন।' : 'Please enter a valid shop or store name.',
      });
      return;
    }
    setPromotingRole('seller');
    setRoleFeedback(null);
    try {
      const res = await promoteToSellerApi({
        shopName: cleanShopName,
        type: sellerShopType,
        address: location,
      });
      const promotedCaps = Array.from(new Set([...activeCaps, ...(res.activeRoles || []), 'vendor']));
      const nextVendorCategory = sellerShopType === 'service' ? 'services' : sellerShopType;
      onUpdateUser({
        ...currentUser,
        role: isPrivileged ? currentUser.role : 'vendor',
        isVendor: true,
        vendorProfile: {
          id: currentUser.vendorProfile?.id || `store_${currentUser.id}`,
          storeName: cleanShopName,
          legalEntityName: currentUser.vendorProfile?.legalEntityName || cleanShopName,
          businessRegNumber: currentUser.vendorProfile?.businessRegNumber || '',
          taxIdentificationNumber: currentUser.vendorProfile?.taxIdentificationNumber || '',
          category: nextVendorCategory,
          verified: currentUser.vendorProfile?.verified ?? false,
          status: currentUser.vendorProfile?.status || 'active',
          commissionTier: currentUser.vendorProfile?.commissionTier || 'Standard 8%',
          rating: currentUser.vendorProfile?.rating ?? 5,
          totalSales: currentUser.vendorProfile?.totalSales ?? 0,
          location,
          createdAt: currentUser.vendorProfile?.createdAt || new Date().toISOString(),
        },
        ...(promotedCaps.length ? { activeCapabilities: promotedCaps } : {}),
      } as UserType);
      await refetchProfile().catch(() => {});
      setShowSellerSetup(false);
      setRoleFeedback({
        type: 'success',
        message: isBn
          ? `সেলার সুবিধা সক্রিয় হয়েছে! "${cleanShopName}" এখন সক্রিয়।`
          : `Seller capability activated for "${cleanShopName}".`,
      });
    } catch (error) {
      setRoleFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to activate seller capability.',
      });
    } finally {
      setPromotingRole(null);
    }
  };

  const handleActivateCreator = async () => {
    if (!firebaseUser) {
      setRoleFeedback({
        type: 'error',
        message: isBn ? 'ক্রিয়েটর স্টুডিও চালু করতে আগে সাইন-ইন করুন।' : 'Please sign in first to activate Creator Studio.',
      });
      return;
    }
    setPromotingRole('creator');
    setRoleFeedback(null);
    try {
      const res = await promoteToCreatorApi({ channelName: name });
      const promotedCaps = Array.from(new Set([...activeCaps, ...(res.activeRoles || []), 'creator']));
      onUpdateUser({
        ...currentUser,
        activeCapabilities: promotedCaps,
      } as UserType);
      await refetchProfile().catch(() => {});
      setRoleFeedback({
        type: 'success',
        message: isBn ? 'ক্রিয়েটর স্টুডিও সফলভাবে সক্রিয় হয়েছে!' : 'Creator Studio capability activated!',
      });
    } catch (error) {
      setRoleFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to activate Creator Studio.',
      });
    } finally {
      setPromotingRole(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h3 className="text-lg font-black text-[var(--pm-text)]">
          {isBn ? 'ব্যক্তিগত তথ্য ও প্রোফাইল' : 'Personal Information & Profile'}
        </h3>
        <p className="text-xs text-[var(--pm-muted)]">
          {isBn 
            ? 'আপনার নাম, ইউজারনেম, যোগাযোগের তথ্য এবং পাবলিক প্রোফাইল পরিচালনা করুন' 
            : 'Manage your public name, username handle, contact email, and bio'}
        </p>
      </div>

      {/* Facebook Page-style Context Switching Banner */}
      {hasPaikarMartAccess && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-600/10 via-indigo-600/15 to-blue-600/10 border border-purple-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white font-black flex items-center justify-center shrink-0 shadow-md">
              🏢
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-black text-[var(--pm-text)]">
                  {isBn ? 'পাইকারমার্ট সুপার অ্যাডমিন অর্গানাইজেশন প্রোফাইল' : 'PaikarMart Organization & Super Admin Profile'}
                </p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-300">
                  {activeProfileMode === 'paikarmart' ? (isBn ? 'সক্রিয় মোড' : 'Active Mode') : (isBn ? 'অ্যাডমিন অ্যাক্সেস উপলব্ধ' : 'Access Available')}
                </span>
              </div>
              <p className="text-[11px] text-[var(--pm-muted)] mt-0.5">
                {isBn 
                  ? 'ফেসবুক পেজ সুইচিং সিস্টেমের মতো আপনার ব্যক্তিগত অ্যাকাউন্ট থেকে পাইকারমার্ট সুপার অ্যাডমিন মোডে সুইচ করুন।'
                  : 'Just like Facebook Page switching, seamlessly toggle between your personal profile and the PaikarMart organization profile.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const nextMode = activeProfileMode === 'personal' ? 'paikarmart' : 'personal';
              switchProfileMode(nextMode);
            }}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shrink-0 transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center gap-1.5"
          >
            <span>{activeProfileMode === 'paikarmart' ? `👤 Switch to ${personalUser.name.split(' ')[0]} (Personal)` : '🏢 Switch to PaikarMart (Admin)'}</span>
          </button>
        </div>
      )}

      {savedSuccess && (
        <div className="p-3.5 rounded-2xl bg-[var(--pm-success-soft)] border border-[var(--pm-success)]/30 text-[var(--pm-success)] text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 shrink-0" />
          <span>{isBn ? 'প্রোফাইলের তথ্য সফলভাবে সংরক্ষিত হয়েছে!' : 'Personal profile updated successfully!'}</span>
        </div>
      )}
      {saveError && <div role="alert" className="p-3.5 rounded-2xl bg-[var(--pm-danger-soft)] border border-[var(--pm-danger)]/30 text-[var(--pm-danger)] text-xs font-bold">{saveError}</div>}

      {/* Avatar & Cover Photo Preview */}
      <div className="p-5 rounded-3xl bg-[var(--pm-surface)] border border-[var(--pm-border)] flex flex-col sm:flex-row items-center gap-5">
        <div className="relative group">
          <img
            src={safeMediaSrc(currentUser.avatar, DEFAULT_AVATAR_URL)}
            alt={currentUser.name}
            className="w-20 h-20 rounded-full object-cover ring-4 ring-[var(--pm-card)] shadow-md"
          />
          <button
            type="button"
            className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] shadow-md hover:bg-[var(--pm-accent-hover)] transition-transform active:scale-90 cursor-pointer"
            title={isBn ? 'ছবি পরিবর্তন করুন' : 'Change Avatar'}
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="text-center sm:text-left space-y-1">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h4 className="text-base font-bold text-[var(--pm-text)]">{name}</h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--pm-accent-soft)] text-[var(--pm-accent)]">
              {currentUser.isVendor ? (isBn ? 'ভেন্ডর' : 'Verified Vendor') : (isBn ? 'সদস্য' : 'Member')}
            </span>
          </div>
          <p className="text-xs text-[var(--pm-muted)] font-mono">{handle}</p>
          <p className="text-[11px] text-[var(--pm-muted)]">
            {isBn ? 'JPG, PNG বা WEBP সমর্থনযোগ্য। সর্বোচ্চ ৫ মেগাবাইট।' : 'JPG, PNG or WEBP recommended. Max size 5MB.'}
          </p>
        </div>
      </div>

      {/* Main Profile Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--pm-text)] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[var(--pm-accent)]" />
              <span>{isBn ? 'পূর্ণ নাম' : 'Full Name'}</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs font-semibold text-[var(--pm-text)] focus:outline-hidden focus:border-[var(--pm-accent)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--pm-text)] flex items-center gap-1.5">
              <AtSign className="w-3.5 h-3.5 text-purple-500" />
              <span>{isBn ? 'ইউজারনেম (@হ্যান্ডেল)' : 'Username Handle'}</span>
            </label>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs font-semibold text-[var(--pm-text)] focus:outline-hidden focus:border-[var(--pm-accent)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--pm-text)] flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[var(--pm-warning)]" />
              <span>{isBn ? 'ইমেইল ঠিকানা' : 'Email Address'}</span>
            </label>
            <input
              type="email"
              value={email}
              readOnly
              title={isBn ? 'নিরাপত্তার জন্য Firebase account email পরিবর্তন করা যায় না' : 'Account email is managed by Firebase Authentication'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs font-semibold text-[var(--pm-text)] focus:outline-hidden focus:border-[var(--pm-accent)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--pm-text)] flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[var(--pm-success)]" />
              <span>{isBn ? 'মোবাইল নম্বর' : 'Phone Number'}</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs font-semibold text-[var(--pm-text)] focus:outline-hidden focus:border-[var(--pm-accent)]"
            />
          </div>
        </div>

        {/* Profession, Education & Skills (Public Unified Profile) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--pm-text)] flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-blue-500" />
              <span>{isBn ? 'পেশা / ব্যবসা' : 'Profession / Work'}</span>
            </label>
            <input
              type="text"
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              placeholder={isBn ? 'যেমন: শিক্ষক, শপ ওনার, ফ্রিল্যান্সার' : 'e.g. Teacher, Shop Owner, Creator'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs font-semibold text-[var(--pm-text)] focus:outline-hidden focus:border-[var(--pm-accent)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--pm-text)] flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isBn ? 'শিক্ষাগত যোগ্যতা' : 'Education'}</span>
            </label>
            <input
              type="text"
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              placeholder={isBn ? 'যেমন: ঢাকা বিশ্ববিদ্যালয়' : 'e.g. University of Dhaka'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs font-semibold text-[var(--pm-text)] focus:outline-hidden focus:border-[var(--pm-accent)]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--pm-text)] flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>{isBn ? 'দক্ষতা (কমা দিয়ে লিখুন)' : 'Skills (comma separated)'}</span>
          </label>
          <input
            type="text"
            value={skillsInput}
            onChange={(e) => setSkillsInput(e.target.value)}
            placeholder="Retail Sourcing, Teaching, Digital Marketing"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs font-semibold text-[var(--pm-text)] focus:outline-hidden focus:border-[var(--pm-accent)]"
          />
        </div>

        {/* Dynamic Capabilities Showcase & Self-Service Role Promotion */}
        <div className="p-4 rounded-2xl bg-[var(--pm-surface)] border border-[var(--pm-border)] space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-[var(--pm-text)] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--pm-accent)]" />
              {isBn ? 'প্রোফাইলের তথ্যের ভিত্তিতে সক্রিয় সুবিধাসমূহ (Dynamic Access)' : 'Dynamically Unlocked Capabilities'}
            </h4>
            <span className="text-[11px] font-bold text-[var(--pm-success)]">
              {isBn ? '১টি অ্যাকাউন্টে সব সুবিধা' : 'Single Unified Identity'}
            </span>
          </div>

          {roleFeedback && (
            <div
              role={roleFeedback.type === 'error' ? 'alert' : 'status'}
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                roleFeedback.type === 'error'
                  ? 'bg-[var(--pm-danger-soft)] border-[var(--pm-danger)]/30 text-[var(--pm-danger)]'
                  : 'bg-[var(--pm-success-soft)] border-[var(--pm-success)]/30 text-[var(--pm-success)]'
              }`}
            >
              {roleFeedback.type === 'success' && <Check className="w-4 h-4 shrink-0" />}
              <span>{roleFeedback.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-[var(--pm-card)] border border-[var(--pm-border)] flex flex-col justify-between gap-2.5">
              <div className="flex items-start gap-2.5">
                <Store className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-[var(--pm-text)]">{isBn ? 'শপ ও মার্কেটপ্লেস' : 'Shop & Commerce'}</p>
                  <p className="text-[10px] text-[var(--pm-muted)]">{isBn ? 'রিটেইল/হোলসেল শপ পরিচালনা' : 'Manage store & listings'}</p>
                </div>
              </div>
              {hasSellerAccess ? (
                <span className="text-[11px] font-bold text-[var(--pm-success)] flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {isBn ? 'সক্রিয়' : 'Active'}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSellerSetup((prev) => !prev)}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] text-[var(--pm-accent-fg)] text-[11px] font-bold transition-colors cursor-pointer"
                >
                  {showSellerSetup
                    ? (isBn ? 'বন্ধ করুন' : 'Close Setup')
                    : (isBn ? 'সেলার চালু করুন' : 'Activate Seller')}
                </button>
              )}
            </div>

            <div className="p-3 rounded-xl bg-[var(--pm-card)] border border-[var(--pm-border)] flex flex-col justify-between gap-2.5">
              <div className="flex items-start gap-2.5">
                <Wrench className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-[var(--pm-text)]">{isBn ? 'সার্ভিস ও টিউশন হাব' : 'Services & Tutoring'}</p>
                  <p className="text-[10px] text-[var(--pm-muted)]">{isBn ? 'ক্লাস ও সেবা প্রদান' : 'Tutoring & Consultations'}</p>
                </div>
              </div>
              {hasSellerAccess ? (
                <span className="text-[11px] font-bold text-[var(--pm-success)] flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {isBn ? 'সক্রিয়' : 'Ready'}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSellerShopType('service');
                    setShowSellerSetup(true);
                  }}
                  className="w-full py-1.5 px-2.5 rounded-lg border border-[var(--pm-border-strong)] hover:border-[var(--pm-accent)] text-[var(--pm-text)] text-[11px] font-bold transition-colors cursor-pointer"
                >
                  {isBn ? 'সার্ভিস প্রোফাইল চালু করুন' : 'Offer Services'}
                </button>
              )}
            </div>

            <div className="p-3 rounded-xl bg-[var(--pm-card)] border border-[var(--pm-border)] flex flex-col justify-between gap-2.5">
              <div className="flex items-start gap-2.5">
                <Video className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-[var(--pm-text)]">{isBn ? 'ক্রিয়েটর স্টুডিও' : 'Creator Studio'}</p>
                  <p className="text-[10px] text-[var(--pm-muted)]">{isBn ? 'রেকর্ডেড ক্লাস ও ভিডিও' : 'Video & Course Content'}</p>
                </div>
              </div>
              {hasCreatorAccess ? (
                <span className="text-[11px] font-bold text-[var(--pm-success)] flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {isBn ? 'সক্রিয়' : 'Active'}
                </span>
              ) : (
                <button
                  type="button"
                  disabled={promotingRole === 'creator'}
                  onClick={handleActivateCreator}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {promotingRole === 'creator' && <Loader2 className="w-3 h-3 animate-spin" />}
                  {isBn ? 'ক্রিয়েটর চালু করুন' : 'Activate Creator'}
                </button>
              )}
            </div>
          </div>

          {showSellerSetup && !hasSellerAccess && (
            <div className="p-3.5 rounded-xl bg-[var(--pm-card)] border border-[var(--pm-border-strong)] space-y-3 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[var(--pm-text)]">
                    {isBn ? 'শপ বা সার্ভিসের নাম' : 'Store / Service Name'}
                  </label>
                  <input
                    type="text"
                    value={sellerShopName}
                    onChange={(e) => setSellerShopName(e.target.value)}
                    placeholder={isBn ? 'যেমন: ঢাকা ট্রেডার্স' : 'e.g. Dhaka Fresh Mart'}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs font-semibold text-[var(--pm-text)] focus:outline-hidden focus:border-[var(--pm-accent)]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[var(--pm-text)]">
                    {isBn ? 'ব্যবসার ধরন' : 'Account Type'}
                  </label>
                  <select
                    value={sellerShopType}
                    onChange={(e) => setSellerShopType(e.target.value as 'retail' | 'wholesale' | 'service')}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs font-semibold text-[var(--pm-text)] focus:outline-hidden focus:border-[var(--pm-accent)]"
                  >
                    <option value="retail">{isBn ? 'রিটেইল শপ' : 'Retail Store'}</option>
                    <option value="wholesale">{isBn ? 'হোলসেল ও B2B' : 'Wholesale & B2B'}</option>
                    <option value="service">{isBn ? 'সার্ভিস ও টিউশন' : 'Services & Tutoring'}</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSellerSetup(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-[var(--pm-muted)] hover:text-[var(--pm-text)] cursor-pointer"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={promotingRole === 'seller'}
                  onClick={handleActivateSeller}
                  className="px-4 py-1.5 rounded-lg bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] disabled:opacity-60 text-[var(--pm-accent-fg)] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {promotingRole === 'seller' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isBn ? 'নিশ্চিত করুন ও চালু করুন' : 'Confirm & Activate Seller'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Citizen Verification Trigger Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-[var(--pm-text)]">
                {isBn ? 'ব্যক্তিগত নাগরিক ভেরিফিকেশন (NID, পাসপোর্ট, জন্মনিবন্ধন, স্টুডেন্ট কার্ড)' : 'Personal Citizen Verification (NID, Passport, Student ID)'}
              </p>
              <p className="text-[11px] text-[var(--pm-muted)]">
                {currentUser.personalVerification?.status === 'verified'
                  ? (isBn ? 'আপনার প্রোফাইল ভেরিফাইড! হোমমেড খাবার বিক্রি, নিলাম, ফ্ল্যাট ভাড়া ও রাইড অ্যাক্সেস উন্মুক্ত।' : 'Verified Citizen! You can buy, sell homemade goods, bid, & book rides.')
                  : (isBn ? 'সার্ভিস নেওয়া, রাইড শেয়ার এবং হোমমেড/ব্যবহৃত পণ্য বিক্রির জন্য ভেরিফাই করুন।' : 'Verify to unlock services, ride sharing & personal selling.')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsVerificationModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            {currentUser.personalVerification?.status === 'verified' ? (isBn ? 'ভেরিফিকেশন দেখুন' : 'View Verification') : (isBn ? 'ভেরিফাই করুন' : 'Verify Now')}
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--pm-text)] flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[var(--pm-danger)]" />
            <span>{isBn ? 'বর্তমান শহর / এলাকা' : 'Current City / Area'}</span>
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs font-semibold text-[var(--pm-text)] focus:outline-hidden focus:border-[var(--pm-accent)]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--pm-text)] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[var(--pm-accent)]" />
            <span>{isBn ? 'বায়ো ও বিবরণ' : 'About / Bio'}</span>
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs font-medium text-[var(--pm-text)] focus:outline-hidden focus:border-[var(--pm-accent)]"
          />
        </div>

        <div className="pt-2 flex justify-end">
            <button
            type="submit"
              disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] text-[var(--pm-accent-fg)] font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
          >
            {isSaving ? (isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBn ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Profile Changes')}
          </button>
        </div>
      </form>

      {/* Citizen Personal Verification Modal */}
      <PersonalVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        currentUser={currentUser}
        onVerificationSubmitted={(docType, docNumber) => {
          onUpdateUser({
            ...currentUser,
            personalVerification: {
              status: 'verified',
              documentType: docType,
              documentNumber: docNumber,
              verifiedAt: new Date().toISOString().split('T')[0],
              verificationBadge: 'Verified Citizen (স্মার্ট নাগরিক)',
            },
            canPostHomemade: true,
            canParticipateBids: true,
            canPostRental: true,
            canPostUsedGoods: true,
          });
        }}
      />
    </div>
  );
};
