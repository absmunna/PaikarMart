import React, { useState } from 'react';
import { User, Camera, Mail, Phone, MapPin, AtSign, Check, Sparkles, GraduationCap, Briefcase, Award, ShieldCheck, Store, Video, Wrench } from 'lucide-react';
import { User as UserType, PersonalDocumentType } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { CURRENT_USER } from '@/data/mockData';
import { syncAuthenticatedProfile, useAuth } from '@/features/auth';
import { updateUserProfileToFirestore, updateProfile as updateFirebaseProfile } from '@/lib/firebase';
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
  const { firebaseUser, refetchProfile } = useAuth();
  const [name, setName] = useState(currentUser.name);
  const [handle, setHandle] = useState(currentUser.handle || '@alexrivera');
  const [email] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [profession, setProfession] = useState(currentUser.profession || 'শিক্ষক ও কনটেন্ট ক্রিয়েটর');
  const [education, setEducation] = useState(currentUser.education || 'ঢাকা বিশ্ববিদ্যালয়');
  const [skillsText, setSkillsText] = useState((currentUser.skills || ['Teaching', 'Retail Shop', 'Video Classes']).join(', '));
  const [bio, setBio] = useState(currentUser.bio || 'Product enthusiast, wholesale sourcer, and passionate creator on PaikarMart.');
  const [location, setLocation] = useState(currentUser.location || 'Dhaka, Bangladesh');
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (!isSaving) {
      setName(currentUser.name);
      setHandle(currentUser.handle || '@alexrivera');
      setPhone(currentUser.phone || '');
      setProfession(currentUser.profession || 'শিক্ষক ও কনটেন্ট ক্রিয়েটর');
      setEducation(currentUser.education || 'ঢাকা বিশ্ববিদ্যালয়');
      setSkillsText((currentUser.skills || ['Teaching', 'Retail Shop', 'Video Classes']).join(', '));
      setLocation(currentUser.location || 'Dhaka, Bangladesh');
    }
  }, [currentUser.id, currentUser.name, currentUser.handle, currentUser.phone, currentUser.location, currentUser.profession, currentUser.education, currentUser.skills, isSaving]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    const parsedSkills = skillsText.split(',').map(s => s.trim()).filter(Boolean);
    try {
      await syncAuthenticatedProfile({ name, handle, location, phone });
      if (firebaseUser) {
        await updateFirebaseProfile(firebaseUser, { displayName: name }).catch(() => {});
        await updateUserProfileToFirestore({
          id: firebaseUser.uid,
          email: firebaseUser.email || email,
          name,
          handle,
          role: currentUser.role,
          avatar: currentUser.avatar,
          location,
          emailVerified: firebaseUser.emailVerified,
        }).catch((err) => console.warn('Firestore user profile sync warning:', err));
        await refetchProfile().catch(() => {});
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Profile sync failed.');
      setIsSaving(false);
      return;
    }
    onUpdateUser({
      ...currentUser,
      name,
      handle,
      location,
      phone,
      bio,
      profession,
      education,
      skills: parsedSkills,
      activeCapabilities: ['shop', 'service', 'creator'],
    });
    setSavedSuccess(true);
    setIsSaving(false);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const isBn = language === 'bn';

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
            src={currentUser.avatar}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--pm-text)] flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-blue-500" />
              <span>{isBn ? 'পেশা ও পদবি (Profession)' : 'Profession / Career'}</span>
            </label>
            <input
              type="text"
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              placeholder={isBn ? 'যেমন: শিক্ষক, রিটেইল শপ ওনার' : 'e.g. Teacher & Retail Store Owner'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs font-semibold text-[var(--pm-text)] focus:outline-hidden focus:border-[var(--pm-accent)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--pm-text)] flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isBn ? 'শিক্ষা ও প্রতিষ্ঠান (Education)' : 'Education & Institute'}</span>
            </label>
            <input
              type="text"
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              placeholder={isBn ? 'যেমন: ঢাকা বিশ্ববিদ্যালয়, গণিত বিভাগ' : 'e.g. University of Dhaka'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs font-semibold text-[var(--pm-text)] focus:outline-hidden focus:border-[var(--pm-accent)]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--pm-text)] flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>{isBn ? 'দক্ষতা ও বিশেষ পারদর্শিতা (Skills - কমা দিয়ে লিখুন)' : 'Skills & Capabilities (comma-separated)'}</span>
          </label>
          <input
            type="text"
            value={skillsText}
            onChange={(e) => setSkillsText(e.target.value)}
            placeholder={isBn ? 'যেমন: গণিত পাঠদান, গার্মেন্টস রিটেলিং, ইউটিউব ক্লাস রেকর্ডিং' : 'e.g. Teaching, Retail Fashion, Video Editing'}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs font-semibold text-[var(--pm-text)] focus:outline-hidden focus:border-[var(--pm-accent)]"
          />
        </div>

        {/* Dynamic Unlocked Hubs Matrix Card */}
        <div className="p-4 rounded-2xl bg-[var(--pm-surface)] border border-[var(--pm-border)] space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-[var(--pm-text)] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--pm-accent)]" />
              {isBn ? 'প্রোফাইলের তথ্যের ভিত্তিতে সক্রিয় সুবিধাসমূহ (Dynamic Access)' : 'Dynamically Unlocked Capabilities'}
            </h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--pm-success-soft)] text-[var(--pm-success)]">
              {isBn ? '১টি অ্যাকাউন্টে সব সুবিধা' : 'Single Unified Identity'}
            </span>
          </div>
          <p className="text-[11px] text-[var(--pm-muted)]">
            {isBn 
              ? 'আপনার উল্লেখিত পেশা, শিক্ষা ও দক্ষতার কারণে আপনার একক অ্যাকাউন্টে নিচের হাবগুলোর অ্যাক্সেস সক্রিয় হয়েছে:'
              : 'Based on your profession, skills and profile, your single account has access to:'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-[var(--pm-card)] border border-[var(--pm-border)] flex items-start gap-2.5">
              <Store className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[var(--pm-text)]">{isBn ? 'শপ ও মার্কেটপ্লেস' : 'Shop & Commerce'}</p>
                <p className="text-[10px] text-[var(--pm-muted)]">{isBn ? 'রিটেইল/হোলসেল শপ পরিচালনা' : 'Manage your clothing store'}</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[var(--pm-card)] border border-[var(--pm-border)] flex items-start gap-2.5">
              <Wrench className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[var(--pm-text)]">{isBn ? 'সার্ভিস ও টিউশন হাব' : 'Services & Tutoring'}</p>
                <p className="text-[10px] text-[var(--pm-muted)]">{isBn ? 'ক্লাস ও সেবা প্রদান' : 'Tutoring & Consultations'}</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[var(--pm-card)] border border-[var(--pm-border)] flex items-start gap-2.5">
              <Video className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[var(--pm-text)]">{isBn ? 'ক্রিয়েটর স্টুডিও' : 'Creator Studio'}</p>
                <p className="text-[10px] text-[var(--pm-muted)]">{isBn ? 'রেকর্ডেড ক্লাস ও ভিডিও' : 'YouTube & Course Content'}</p>
              </div>
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
