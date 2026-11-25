import React, { useState } from 'react';
import {
  ShieldCheck,
  Smartphone,
  Mail,
  KeyRound,
  LogOut,
  Loader2,
  Link2,
  Unlink,
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatPhoneForDisplay, getPasswordStrength, isValidBdPhone } from '@/features/auth/services/userVerification';

interface AccountSecurityPanelProps {
  onStatusChange?: (message: string, isError?: boolean) => void;
}

export const AccountSecurityPanel: React.FC<AccountSecurityPanelProps> = ({ onStatusChange }) => {
  const {
    firebaseUser,
    currentUser,
    sendLinkPhoneOtp,
    verifyLinkPhoneOtp,
    clearPhoneOtpSession,
    pendingPhoneNumber,
    linkGoogleProvider,
    unlinkProvider,
    changePassword,
    revokeAllSessions,
    loading,
  } = useAuth();
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [showPhoneLinkForm, setShowPhoneLinkForm] = useState(false);
  const [phoneStep, setPhoneStep] = useState<'phone' | 'otp'>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassChars, setShowPassChars] = useState(false);

  const [busyAction, setBusyAction] = useState<string | null>(null);

  if (!firebaseUser) return null;

  const providerIds = new Set((firebaseUser.providerData || []).map((p) => p.providerId));
  const hasPassword = providerIds.has('password');
  const hasGoogle = providerIds.has('google.com');
  const hasPhone = providerIds.has('phone') || Boolean(firebaseUser.phoneNumber);
  const linkedCount = (hasPassword ? 1 : 0) + (hasGoogle ? 1 : 0) + (hasPhone ? 1 : 0);

  const passwordStrength = newPassword ? getPasswordStrength(newPassword) : null;

  const notify = (msg: string, isError = false) => {
    onStatusChange?.(msg, isError);
  };

  const handleLinkGoogle = async () => {
    try {
      setBusyAction('google');
      await linkGoogleProvider();
      notify(isBn ? 'Google অ্যাকাউন্ট সফলভাবে লিঙ্ক হয়েছে।' : 'Google account linked successfully.');
    } catch (err: any) {
      const msg =
        err?.code === 'auth/credential-already-in-use'
          ? (isBn ? 'এই Google অ্যাকাউন্টটি অন্য প্রোফাইলে যুক্ত আছে।' : 'This Google account is already linked to another user.')
          : err?.message || (isBn ? 'Google লিঙ্ক করা যায়নি।' : 'Unable to link Google account.');
      notify(msg, true);
    } finally {
      setBusyAction(null);
    }
  };

  const handleUnlink = async (providerId: string, label: string) => {
    if (linkedCount <= 1) {
      notify(isBn ? 'অন্তত একটি লগইন মাধ্যম চালু থাকতে হবে।' : 'Keep at least one active sign-in method.', true);
      return;
    }
    try {
      setBusyAction(`unlink:${providerId}`);
      await unlinkProvider(providerId);
      notify(isBn ? `${label} আনলিঙ্ক করা হয়েছে।` : `${label} unlinked cleanly.`);
    } catch (err: any) {
      notify(err?.message || (isBn ? 'আনলিঙ্ক করা যায়নি।' : 'Unable to unlink provider.'), true);
    } finally {
      setBusyAction(null);
    }
  };

  const handleSendPhoneLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidBdPhone(phoneInput)) {
      notify(isBn ? 'সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন (01XXXXXXXXX)।' : 'Enter a valid 11-digit mobile number (01XXXXXXXXX).', true);
      return;
    }
    try {
      setBusyAction('send-phone');
      await sendLinkPhoneOtp(phoneInput, 'pm-link-recaptcha-container');
      setPhoneStep('otp');
      setOtpInput('');
      notify(isBn ? 'ভেরিফিকেশন কোড পাঠানো হয়েছে।' : 'Verification OTP sent to your mobile.');
    } catch (err: any) {
      const msg =
        err?.code === 'auth/credential-already-in-use'
          ? (isBn ? 'এই নম্বরটি ইতোমধ্যে অন্য অ্যাকাউন্টে ব্যবহৃত হয়েছে।' : 'This phone number is already linked to another account.')
          : err?.code === 'auth/billing-not-enabled' || err?.code === 'auth/quota-exceeded'
          ? (isBn
              ? 'Firebase Spark ফ্রি প্ল্যানে লাইভ SMS সীমিত। Firebase Test Phone Number অথবা Email/Google ব্যবহার করুন।'
              : 'Live SMS OTP requires Blaze billing or exceeded Spark quota. Use Firebase Test Phone Numbers or Email/Google.')
          : err?.code === 'auth/operation-not-allowed'
          ? (isBn ? 'Firebase Console-এ Phone Auth এখনো সক্রিয় করা হয়নি।' : 'Phone Auth is not enabled in Firebase Console yet.')
          : err?.message || (isBn ? 'OTP পাঠানো যায়নি।' : 'Failed to send verification OTP.');
      notify(msg, true);
    } finally {
      setBusyAction(null);
    }
  };

  const handleVerifyPhoneLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpInput.replace(/\D/g, '');
    if (code.length !== 6) {
      notify(isBn ? '৬ সংখ্যার OTP কোড দিন।' : 'Enter the 6-digit OTP code.', true);
      return;
    }
    try {
      setBusyAction('verify-phone');
      await verifyLinkPhoneOtp(code);
      setShowPhoneLinkForm(false);
      setPhoneStep('phone');
      setPhoneInput('');
      setOtpInput('');
      notify(isBn ? 'মোবাইল নম্বর সফলভাবে ভেরিফাই ও লিঙ্ক হয়েছে!' : 'Mobile number verified & linked cleanly!');
    } catch (err: any) {
      notify(err?.message || (isBn ? 'OTP যাচাই করা যায়নি।' : 'Invalid or expired OTP code.'), true);
    } finally {
      setBusyAction(null);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || newPassword.length < 6) {
      notify(isBn ? 'বর্তমান পাসওয়ার্ড ও কমপক্ষে ৬ অক্ষরের নতুন পাসওয়ার্ড দিন।' : 'Enter current password and a 6+ character new password.', true);
      return;
    }
    try {
      setBusyAction('password');
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setShowPasswordForm(false);
      notify(isBn ? 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।' : 'Password updated successfully.');
    } catch (err: any) {
      const msg =
        err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential'
          ? (isBn ? 'বর্তমান পাসওয়ার্ডটি সঠিক নয়।' : 'Current password is incorrect.')
          : err?.message || (isBn ? 'পাসওয়ার্ড পরিবর্তন করা যায়নি।' : 'Unable to update password.');
      notify(msg, true);
    } finally {
      setBusyAction(null);
    }
  };

  const handleRevokeAll = async () => {
    try {
      setBusyAction('revoke');
      await revokeAllSessions();
      notify(isBn ? 'সব ডিভাইস থেকে সেশন রিভোক করা হয়েছে।' : 'All active sessions revoked.');
    } catch (err: any) {
      notify(err?.message || (isBn ? 'সেশন রিভোক ব্যর্থ হয়েছে।' : 'Unable to revoke sessions.'), true);
    } finally {
      setBusyAction(null);
    }
  };

  const isBusy = Boolean(busyAction) || loading;

  return (
    <div className="space-y-3">
      <div id="pm-link-recaptcha-container" aria-hidden="true" />

      {/* Connected Sign-in Methods */}
      <div className="p-3.5 rounded-2xl bg-[var(--pm-surface)] border border-[var(--pm-border)] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[var(--pm-text)] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[var(--pm-accent)]" />
            <span>{isBn ? 'সংযুক্ত লগইন মাধ্যম' : 'Connected Sign-In Methods'}</span>
          </span>
          <span className="text-[10px] font-mono text-[var(--pm-muted)]">
            {linkedCount}/3 {isBn ? 'সক্রিয়' : 'active'}
          </span>
        </div>

        {/* Email/Password Row */}
        <div className="p-2.5 rounded-xl bg-[var(--pm-card)] border border-[var(--pm-border)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Mail className="w-4 h-4 text-[var(--pm-muted)] shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-[var(--pm-text)]">
                {isBn ? 'ইমেইল ও পাসওয়ার্ড' : 'Email & Password'}
              </div>
              <div className="text-[11px] text-[var(--pm-muted)] truncate">
                {firebaseUser.email || (isBn ? 'যুক্ত করা হয়নি' : 'Not connected')}
              </div>
            </div>
          </div>
          {hasPassword ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => setShowPasswordForm((prev) => !prev)}
              className="px-2.5 py-1 rounded-lg bg-[var(--pm-surface)] border border-[var(--pm-border)] text-[11px] font-bold text-[var(--pm-text)] hover:border-[var(--pm-accent)] cursor-pointer shrink-0 disabled:opacity-50"
            >
              {isBn ? 'পাসওয়ার্ড বদলান' : 'Change'}
            </button>
          ) : (
            <span className="text-[11px] font-medium text-[var(--pm-muted)] shrink-0">
              {firebaseUser.email ? (isBn ? 'OAuth যুক্ত' : 'OAuth Only') : (isBn ? 'নেই' : 'Unlinked')}
            </span>
          )}
        </div>

        {/* Inline Change Password Form */}
        {showPasswordForm && hasPassword && (
          <form onSubmit={handlePasswordChange} className="p-3 rounded-xl bg-[var(--pm-card)] border border-[var(--pm-accent-border)] space-y-2.5">
            <div className="text-[11px] font-bold text-[var(--pm-text)] flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[var(--pm-accent)]" />
              <span>{isBn ? 'নতুন পাসওয়ার্ড সেট করুন' : 'Update Account Password'}</span>
            </div>
            <input
              type={showPassChars ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={isBn ? 'বর্তমান পাসওয়ার্ড' : 'Current password'}
              disabled={isBusy}
              className="w-full px-3 py-2 text-xs bg-[var(--pm-input)] border border-[var(--pm-border)] rounded-lg text-[var(--pm-text)] focus:outline-none focus:border-[var(--pm-accent)]"
            />
            <div className="relative">
              <input
                type={showPassChars ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={isBn ? 'নতুন পাসওয়ার্ড (৬+ অক্ষর)' : 'New password (6+ chars)'}
                disabled={isBusy}
                className="w-full pl-3 pr-9 py-2 text-xs bg-[var(--pm-input)] border border-[var(--pm-border)] rounded-lg text-[var(--pm-text)] focus:outline-none focus:border-[var(--pm-accent)]"
              />
              <button
                type="button"
                onClick={() => setShowPassChars((p) => !p)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--pm-muted)] cursor-pointer"
                aria-label="Toggle password visibility"
              >
                {showPassChars ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {passwordStrength && (
              <div className="flex items-center justify-between text-[10px] text-[var(--pm-muted)]">
                <span>{isBn ? 'শক্তি:' : 'Strength:'}</span>
                <span className="font-bold uppercase">{passwordStrength.level}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isBusy}
                className="flex-1 py-1.5 px-3 rounded-lg bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {busyAction === 'password' && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>{isBn ? 'আপডেট করুন' : 'Update Password'}</span>
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setShowPasswordForm(false)}
                className="py-1.5 px-3 rounded-lg border border-[var(--pm-border)] text-xs font-semibold text-[var(--pm-muted)] cursor-pointer"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
            </div>
          </form>
        )}

        {/* Phone OTP Row */}
        <div className="p-2.5 rounded-xl bg-[var(--pm-card)] border border-[var(--pm-border)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Smartphone className="w-4 h-4 text-[var(--pm-muted)] shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-[var(--pm-text)]">
                {isBn ? 'মোবাইল নম্বর (OTP)' : 'Phone Number (OTP)'}
              </div>
              <div className="text-[11px] text-[var(--pm-muted)] truncate">
                {firebaseUser.phoneNumber
                  ? formatPhoneForDisplay(firebaseUser.phoneNumber)
                  : currentUser.phone
                  ? `${formatPhoneForDisplay(currentUser.phone)} (${isBn ? 'আনভেরিফাইড' : 'Unverified'})`
                  : (isBn ? 'এখনো লিঙ্ক করা হয়নি' : 'Not linked yet')}
              </div>
            </div>
          </div>

          {hasPhone ? (
            linkedCount > 1 ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void handleUnlink('phone', 'Phone OTP')}
                className="px-2.5 py-1 rounded-lg bg-[var(--pm-danger-soft)] text-[var(--pm-danger)] text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
              >
                <Unlink className="w-3 h-3" />
                <span>{isBn ? 'আনলিঙ্ক' : 'Unlink'}</span>
              </button>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 text-[10px] font-bold shrink-0">
                {isBn ? 'সংযুক্ত' : 'Primary'}
              </span>
            )
          ) : (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                setShowPhoneLinkForm((p) => !p);
                setPhoneStep('phone');
              }}
              className="px-2.5 py-1 rounded-lg bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
            >
              <Link2 className="w-3 h-3" />
              <span>{isBn ? 'লিঙ্ক করুন' : 'Link Phone'}</span>
            </button>
          )}
        </div>

        {/* Inline Phone Linking 2-Step Form */}
        {showPhoneLinkForm && !hasPhone && (
          <form
            onSubmit={phoneStep === 'phone' ? handleSendPhoneLink : handleVerifyPhoneLink}
            className="p-3 rounded-xl bg-[var(--pm-card)] border border-[var(--pm-accent-border)] space-y-2.5"
          >
            {phoneStep === 'phone' ? (
              <>
                <label className="block text-[11px] font-bold text-[var(--pm-text)]">
                  {isBn ? 'ভেরিফাই করার জন্য বাংলাদেশি নম্বর লিখুন' : 'Enter Bangladesh mobile number to link'}
                </label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+880 17XX-XXXXXX"
                  disabled={isBusy}
                  className="w-full px-3 py-2 text-xs bg-[var(--pm-input)] border border-[var(--pm-border)] rounded-lg text-[var(--pm-text)] focus:outline-none focus:border-[var(--pm-accent)]"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isBusy}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {busyAction === 'send-phone' && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>{isBn ? 'OTP পাঠান' : 'Send OTP'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      clearPhoneOtpSession();
                      setShowPhoneLinkForm(false);
                    }}
                    className="py-1.5 px-3 rounded-lg border border-[var(--pm-border)] text-xs font-semibold text-[var(--pm-muted)] cursor-pointer"
                  >
                    {isBn ? 'বাতিল' : 'Cancel'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="block text-[11px] font-bold text-[var(--pm-text)]">
                  {isBn ? `${pendingPhoneNumber} নম্বরে পাঠানো ৬ সংখ্যার OTP` : `Enter 6-digit OTP sent to ${pendingPhoneNumber}`}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  disabled={isBusy}
                  className="w-full px-3 py-2 text-xs font-bold tracking-[0.2em] bg-[var(--pm-input)] border border-[var(--pm-border)] rounded-lg text-[var(--pm-text)] focus:outline-none focus:border-[var(--pm-accent)]"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isBusy || otpInput.length < 6}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-[var(--pm-success)] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {busyAction === 'verify-phone' && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>{isBn ? 'যাচাই ও লিঙ্ক' : 'Verify & Link'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      clearPhoneOtpSession();
                      setPhoneStep('phone');
                    }}
                    className="py-1.5 px-3 rounded-lg border border-[var(--pm-border)] text-xs font-semibold text-[var(--pm-muted)] cursor-pointer"
                  >
                    {isBn ? 'নম্বর বদলান' : 'Back'}
                  </button>
                </div>
              </>
            )}
          </form>
        )}

        {/* Google Row */}
        <div className="p-2.5 rounded-xl bg-[var(--pm-card)] border border-[var(--pm-border)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className={`w-4 h-4 shrink-0 ${hasGoogle ? 'text-emerald-600' : 'text-[var(--pm-muted)]'}`} />
            <div className="min-w-0">
              <div className="text-xs font-bold text-[var(--pm-text)]">Google</div>
              <div className="text-[11px] text-[var(--pm-muted)] truncate">
                {hasGoogle ? (isBn ? 'সংযুক্ত আছে' : 'Connected') : (isBn ? 'যুক্ত করা হয়নি' : 'Not connected')}
              </div>
            </div>
          </div>

          {hasGoogle ? (
            linkedCount > 1 ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void handleUnlink('google.com', 'Google')}
                className="px-2.5 py-1 rounded-lg bg-[var(--pm-danger-soft)] text-[var(--pm-danger)] text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
              >
                <Unlink className="w-3 h-3" />
                <span>{isBn ? 'আনলিঙ্ক' : 'Unlink'}</span>
              </button>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 text-[10px] font-bold shrink-0">
                {isBn ? 'সংযুক্ত' : 'Primary'}
              </span>
            )
          ) : (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleLinkGoogle()}
              className="px-2.5 py-1 rounded-lg bg-[var(--pm-surface)] border border-[var(--pm-border)] text-[var(--pm-text)] text-[11px] font-bold hover:border-[var(--pm-accent)] flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
            >
              {busyAction === 'google' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
              <span>{isBn ? 'Google লিঙ্ক' : 'Link Google'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Session Security & Revoke All */}
      <div className="p-3.5 rounded-2xl bg-[var(--pm-surface)] border border-[var(--pm-border)] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-bold text-[var(--pm-text)]">
            {isBn ? 'সকল ডিভাইস সিকিউরিটি' : 'Active Sessions Across Devices'}
          </div>
          <p className="text-[11px] text-[var(--pm-muted)]">
            {isBn ? 'নিরাপত্তার জন্য সব ডিভাইস থেকে রিফ্রেশ টোকেন বাতিল করুন' : 'Invalidate active refresh tokens & sign out everywhere'}
          </p>
        </div>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => void handleRevokeAll()}
          className="px-3 py-1.5 rounded-xl bg-[var(--pm-danger-soft)] border border-[var(--pm-danger)]/30 text-[var(--pm-danger)] text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
        >
          {busyAction === 'revoke' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
          <span>{isBn ? 'সব সেশন বন্ধ' : 'Revoke All'}</span>
        </button>
      </div>
    </div>
  );
};
