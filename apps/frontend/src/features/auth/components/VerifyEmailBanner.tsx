import React, { useEffect, useState } from 'react';
import { CheckCircle2, MailCheck, RefreshCw, Send, Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface VerifyEmailBannerProps {
  compact?: boolean;
  onStatusChange?: (message: string, isError?: boolean) => void;
}

export const VerifyEmailBanner: React.FC<VerifyEmailBannerProps> = ({
  compact = false,
  onStatusChange,
}) => {
  const { firebaseUser, sendEmailVerificationSignal, reloadUser, loading } = useAuth();
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [cooldownSec, setCooldownSec] = useState(0);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [inlineNotice, setInlineNotice] = useState<{ text: string; isError?: boolean } | null>(null);

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownSec((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSec]);

  if (!firebaseUser) return null;

  // Phone-only user without an email credential
  if (!firebaseUser.email && firebaseUser.phoneNumber) {
    return (
      <div className="p-3.5 rounded-2xl bg-[var(--pm-surface)] border border-[var(--pm-border)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <CheckCircle2 className="w-4 h-4 text-[var(--pm-success)] shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-bold text-[var(--pm-text)]">
              {isBn ? 'ফোন OTP ভেরিফাইড অ্যাকাউন্ট' : 'Verified Phone Account'}
            </div>
            <div className="text-[11px] text-[var(--pm-muted)] truncate">{firebaseUser.phoneNumber}</div>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 shrink-0">
          {isBn ? 'ভেরিফাইড' : 'Verified'}
        </span>
      </div>
    );
  }

  const isVerified = Boolean(firebaseUser.emailVerified);

  const handleSendVerification = async () => {
    if (sending || cooldownSec > 0) return;
    try {
      setSending(true);
      setInlineNotice(null);
      await sendEmailVerificationSignal();
      setCooldownSec(60);
      const msg = isBn
        ? 'ভেরিফিকেশন লিংক ইমেইলে পাঠানো হয়েছে (Spam/Promotions ফোল্ডারও দেখুন)।'
        : 'Verification link sent! Please check your inbox and Spam/Promotions folders.';
      setInlineNotice({ text: msg });
      onStatusChange?.(msg, false);
    } catch (err: any) {
      const msg =
        err?.code === 'auth/too-many-requests'
          ? (isBn ? 'অনেকবার অনুরোধ করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।' : 'Too many requests. Please wait a moment and try again.')
          : err?.message || (isBn ? 'ভেরিফিকেশন ইমেইল পাঠানো যায়নি।' : 'Failed to send verification email.');
      setInlineNotice({ text: msg, isError: true });
      onStatusChange?.(msg, true);
    } finally {
      setSending(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (refreshing) return;
    try {
      setRefreshing(true);
      setInlineNotice(null);
      await reloadUser();
      const msg = isBn ? 'অ্যাকাউন্ট ভেরিফিকেশন স্ট্যাটাস আপডেট করা হয়েছে।' : 'Verification status refreshed.';
      setInlineNotice({ text: msg });
      onStatusChange?.(msg, false);
    } catch (err: any) {
      const msg = err?.message || (isBn ? 'স্ট্যাটাস রিফ্রেশ করা যায়নি।' : 'Unable to refresh status.');
      setInlineNotice({ text: msg, isError: true });
      onStatusChange?.(msg, true);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="p-3.5 rounded-2xl bg-[var(--pm-surface)] border border-[var(--pm-border)] space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isVerified ? (
            <MailCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          )}
          <span className="text-xs font-bold text-[var(--pm-text)] truncate">
            {isBn ? 'ইমেইল ভেরিফিকেশন স্ট্যাটাস' : 'Email Verification Status'}
          </span>
        </div>
        <span
          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 ${
            isVerified ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'
          }`}
        >
          {isVerified ? (isBn ? 'ভেরিফাইড' : 'Verified') : (isBn ? 'অপেক্ষমাণ' : 'Pending')}
        </span>
      </div>

      {!isVerified && (
        <>
          {!compact && (
            <p className="text-[11px] text-[var(--pm-muted)] leading-relaxed">
              {isBn
                ? 'সিকিউর অর্ডার ও পেমেন্টের জন্য ইমেইল ভেরিফাই করুন। লিংক না পেলে Spam, Junk বা Promotions ফোল্ডার চেক করুন।'
                : 'Verify your email to unlock full order & payout protections. If missing, check Spam, Junk, or Promotions.'}
            </p>
          )}

          {inlineNotice && (
            <p
              className={`text-[11px] font-medium leading-snug ${
                inlineNotice.isError ? 'text-[var(--pm-danger)]' : 'text-[var(--pm-success)]'
              }`}
            >
              {inlineNotice.text}
            </p>
          )}

          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleSendVerification}
              disabled={sending || loading || cooldownSec > 0}
              className="flex-1 py-2 px-3 bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] rounded-xl text-xs font-bold hover:bg-[var(--pm-accent-hover)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>
                {cooldownSec > 0
                  ? (isBn ? `আবার পাঠান (${cooldownSec}s)` : `Resend (${cooldownSec}s)`)
                  : (isBn ? 'ভেরিফিকেশন লিংক পাঠান' : 'Send Verification Link')}
              </span>
            </button>

            <button
              type="button"
              onClick={handleRefreshStatus}
              disabled={refreshing || loading}
              className="py-2 px-3 bg-[var(--pm-card)] border border-[var(--pm-border)] text-[var(--pm-text)] rounded-xl text-xs font-bold hover:border-[var(--pm-accent)] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
