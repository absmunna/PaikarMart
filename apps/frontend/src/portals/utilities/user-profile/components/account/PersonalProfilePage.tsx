import React, { useState } from 'react';
import { User, Mail, Phone, MapPin, AtSign, Check, Sparkles, GraduationCap, Briefcase, Award, ShieldCheck, Store, Video, Wrench, Loader2 } from 'lucide-react';
import { User as UserType } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { CURRENT_USER } from '@/data/mockData';
import { promoteToCreatorApi, syncAuthenticatedProfile, updateFirebaseIdentityProfile, useAuth } from '@/features/auth';
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
  const [promotingRole, setPromotingRole] = useState<'creator' | null>(null);
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
        <div className="p-3 rounded-xl bg-[var(--pm-card)] border border-[var(--pm-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ShieldCheck className="w-5 h-5 text-[var(--pm-accent)] shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--pm-text)] truncate">
                {isBn ? 'পাইকারমার্ট অর্গানাইজেশন' : 'PaikarMart organization'}
              </p>
              <p className="text-xs text-[var(--pm-muted)]">
                {activeProfileMode === 'paikarmart'
                  ? (isBn ? 'অর্গানাইজেশন প্রোফাইল সক্রিয়' : 'Organization profile active')
                  : (isBn ? 'অ্যাডমিন প্রোফাইলে যেতে পারেন' : 'Admin profile available')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const nextMode = activeProfileMode === 'personal' ? 'paikarmart' : 'personal';
              switchProfileMode(nextMode);
            }}
            className="min-h-11 px-4 py-2 rounded-xl bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] text-[var(--pm-accent-fg)] font-semibold text-xs shrink-0 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>{activeProfileMode === 'paikarmart'
              ? (isBn ? `${personalUser.name.split(' ')[0]}-এর প্রোফাইলে ফিরুন` : `Switch to ${personalUser.name.split(' ')[0]}`)
              : (isBn ? 'অ্যাডমিন প্রোফাইলে যান' : 'Switch to admin')}</span>
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
      <div className="p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-[var(--pm-surface)] border border-[var(--pm-border)] flex items-center gap-3 sm:gap-5">
        <div className="relative group">
          <img
            src={safeMediaSrc(currentUser.avatar, DEFAULT_AVATAR_URL)}
            alt={currentUser.name}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-2 sm:ring-4 ring-[var(--pm-card)]"
          />
        </div>

        <div className="min-w-0 text-left space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-base font-bold text-[var(--pm-text)] truncate">{name}</h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--pm-accent-soft)] text-[var(--pm-accent)]">
              {currentUser.isVendor ? (isBn ? 'ভেন্ডর' : 'Verified Vendor') : (isBn ? 'সদস্য' : 'Member')}
            </span>
          </div>
          <p className="text-xs text-[var(--pm-muted)] truncate">{handle}</p>
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
              className="w-full min-h-11 px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-sm font-semibold text-[var(--pm-text)] focus:outline-hidden focus:border-[var(--pm-accent)] focus-visible:ring-2 focus-visible:ring-[var(--pm-accent)]/30"
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
              className="w-full min-h-11 px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-sm font-semibold text-[var(--pm-text)] focus:outline-hidden focus:border-[var(--pm-accent)] focus-visible:ring-2 focus-visible:ring-[var(--pm-accent)]/30"
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
              className="w-full min-h-11 px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-sm font-semibold text-[var(--pm-text)] focus:outline-hidden focus:border-[var(--pm-accent)] focus-visible:ring-2 focus-visible:ring-[var(--pm-accent)]/30"
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
              className="w-full min-h-11 px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-sm font-semibold text-[var(--pm-text)] focus:outline-hidden focus:border-[var(--pm-accent)] focus-visible:ring-2 focus-visible:ring-[var(--pm-accent)]/30"
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
              className="w-full min-h-11 px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-sm font-semibold text-[var(--pm-text)] focus:outline-hidden focus:border-[var(--pm-accent)] focus-visible:ring-2 focus-visible:ring-[var(--pm-accent)]/30"
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
              className="w-full min-h-11 px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-sm font-semibold text-[var(--pm-text)] focus:outline-hidden focus:border-[var(--pm-accent)] focus-visible:ring-2 focus-visible:ring-[var(--pm-accent)]/30"
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
            className="w-full min-h-11 px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-sm font-semibold text-[var(--pm-text)] focus:outline-hidden focus:border-[var(--pm-accent)] focus-visible:ring-2 focus-visible:ring-[var(--pm-accent)]/30"
          />
        </div>

        {/* Dynamic Capabilities Showcase */}
        <div className="p-4 rounded-2xl bg-[var(--pm-surface)] border border-[var(--pm-border)] space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-[var(--pm-text)] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--pm-accent)]" />
              {isBn ? 'সক্রিয় অ্যাপ সুবিধাসমূহ' : 'Active app capabilities'}
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
                <span className="text-[10px] font-semibold text-[var(--pm-muted)]">
                  {isBn ? 'আমার ব্যবসা থেকে নিবন্ধন করুন' : 'Register in My Business'}
                </span>
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
                <span className="text-[10px] font-semibold text-[var(--pm-muted)]">
                  {isBn ? 'ব্যবসা সেটআপ আমার ব্যবসায়' : 'Setup in My Business'}
                </span>
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
            className="w-full min-h-11 px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-sm font-semibold text-[var(--pm-text)] focus:outline-hidden focus:border-[var(--pm-accent)] focus-visible:ring-2 focus-visible:ring-[var(--pm-accent)]/30"
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
            className="w-full min-h-24 px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-sm font-medium text-[var(--pm-text)] focus:outline-hidden focus:border-[var(--pm-accent)] focus-visible:ring-2 focus-visible:ring-[var(--pm-accent)]/30"
          />
        </div>

        <div className="pt-2 flex justify-end">
            <button
            type="submit"
              disabled={isSaving}
            className="w-full sm:w-auto min-h-11 px-6 py-2.5 rounded-xl bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] text-[var(--pm-accent-fg)] font-semibold text-sm transition-colors disabled:opacity-60 cursor-pointer"
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
