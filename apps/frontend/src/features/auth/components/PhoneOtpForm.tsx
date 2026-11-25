import React, { useEffect, useState } from 'react';
import { Phone, KeyRound, ArrowRight, Loader2, RotateCcw } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatPhoneForDisplay, isValidBdPhone } from '@/features/auth/services/userVerification';

interface PhoneOtpFormProps {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export const PhoneOtpForm: React.FC<PhoneOtpFormProps> = ({ onSuccess, onError }) => {
  const { sendPhoneOtp, verifyPhoneOtp, clearPhoneOtpSession, pendingPhoneNumber, loading } = useAuth();
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [cooldownSec, setCooldownSec] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownSec((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSec]);

  useEffect(() => {
    return () => {
      clearPhoneOtpSession();
    };
  }, [clearPhoneOtpSession]);

  const translatePhoneError = (err: any): string => {
    const code = String(err?.code || '');
    if (code === 'INVALID_PHONE' || code === 'auth/invalid-phone-number') {
      return isBn
        ? 'সঠিক ১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01712345678 বা +8801712345678)।'
        : 'Enter a valid 11-digit BD mobile number (e.g. 01712345678 or +8801712345678).';
    }
    if (code === 'auth/invalid-verification-code') {
      return isBn ? 'ভুল OTP কোড দেওয়া হয়েছে। অনুগ্রহ করে ৬ সংখ্যার সঠিক কোড দিন।' : 'Incorrect verification code. Please check the 6-digit OTP.';
    }
    if (code === 'auth/code-expired') {
      return isBn ? 'OTP কোডের মেয়াদ শেষ হয়েছে। অনুগ্রহ করে নতুন কোড পাঠান।' : 'OTP code expired. Please request a new code.';
    }
    if (code === 'auth/billing-not-enabled' || code === 'auth/quota-exceeded') {
      return isBn
        ? 'Firebase Spark ফ্রি প্ল্যানে লাইভ SMS কোটা সীমিত বা বিলিং চালু নেই। ইমেইল/Google লগইন অথবা Firebase Console Test Phone Number ব্যবহার করুন।'
        : 'Live SMS OTP requires Firebase Blaze billing or reached the free Spark quota. Use Email/Google sign-in or a Firebase Test Phone Number.';
    }
    if (code === 'auth/too-many-requests') {
      return isBn ? 'অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ অপেক্ষা করে পুনরায় চেষ্টা করুন।' : 'Too many attempts. Please wait briefly and try again.';
    }
    if (code === 'auth/operation-not-allowed') {
      return isBn
        ? 'Firebase Console-এ Phone Auth এখনো চালু করা হয়নি। ইমেইল বা Google লগইন ব্যবহার করুন।'
        : 'Phone sign-in is not enabled in Firebase Console yet. Please use Email or Google sign-in.';
    }
    if (code === 'auth/captcha-check-failed') {
      return isBn ? 'নিরাপত্তা যাচাই (reCAPTCHA) ব্যর্থ হয়েছে। আবার চেষ্টা করুন।' : 'Security verification failed. Please retry.';
    }
    return err?.message || (isBn ? 'ফোন ভেরিফিকেশন সম্পন্ন করা যায়নি।' : 'Unable to complete phone verification.');
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    onError?.('');
    if (!isValidBdPhone(phoneInput)) {
      onError?.(translatePhoneError({ code: 'INVALID_PHONE' }));
      return;
    }

    try {
      setIsSubmitting(true);
      await sendPhoneOtp(phoneInput, 'pm-recaptcha-container');
      setStep('otp');
      setOtpCode('');
      setCooldownSec(60);
    } catch (err) {
      onError?.(translatePhoneError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    onError?.('');
    const digitsOnly = otpCode.replace(/\D/g, '');
    if (digitsOnly.length !== 6) {
      onError?.(isBn ? '৬ সংখ্যার OTP কোডটি লিখুন।' : 'Please enter the 6-digit verification code.');
      return;
    }

    try {
      setIsSubmitting(true);
      await verifyPhoneOtp(digitsOnly);
      onSuccess?.(isBn ? 'ফোন নম্বরের মাধ্যমে সফলভাবে লগইন হয়েছে!' : 'Signed in with phone number successfully!');
    } catch (err) {
      onError?.(translatePhoneError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeNumber = () => {
    clearPhoneOtpSession();
    setStep('phone');
    setOtpCode('');
    onError?.('');
  };

  const isBusy = isSubmitting || loading;

  return (
    <div className="space-y-3">
      {/* Invisible Firebase reCAPTCHA mount */}
      <div id="pm-recaptcha-container" aria-hidden="true" />

      {step === 'phone' ? (
        <form onSubmit={handleSendOtp} className="space-y-3">
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-[var(--pm-muted)] ml-0.5">
              {isBn ? 'মোবাইল নম্বর (বাংলাদেশ)' : 'Mobile Number (Bangladesh)'}
            </label>
            <div className="relative group">
              <Phone className="w-4 h-4 text-[var(--pm-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-[var(--pm-accent)] transition-colors" />
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+880 17XX-XXXXXX"
                autoComplete="tel"
                disabled={isBusy}
                className="w-full pl-9 pr-3.5 py-2.5 text-sm font-medium bg-[var(--pm-input)] border border-[var(--pm-border)] rounded-xl text-[var(--pm-text)] placeholder:text-[var(--pm-muted)] focus:outline-none focus:border-[var(--pm-accent)] focus:ring-2 focus:ring-[var(--pm-accent)]/15 transition-all"
              />
            </div>
            <p className="text-[11px] text-[var(--pm-muted)] ml-0.5">
              {isBn
                ? '০১ দিয়ে শুরু হওয়া ১১ সংখ্যার নম্বর অথবা +880 সহ লিখুন'
                : 'Enter an 11-digit number (01XXXXXXXXX) or +880 format'}
            </p>
          </div>

          <button
            type="submit"
            disabled={isBusy}
            className="w-full py-2.5 sm:py-3 px-4 text-sm font-bold text-[var(--pm-accent-fg)] bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] rounded-xl shadow-md active-scale transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {isBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{isBn ? 'OTP কোড পাঠান' : 'Send OTP Code'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-3">
          <div className="p-2.5 rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold text-[var(--pm-muted)]">
                {isBn ? 'কোড পাঠানো হয়েছে' : 'OTP sent to'}
              </div>
              <div className="text-xs font-bold text-[var(--pm-text)] truncate">
                {formatPhoneForDisplay(pendingPhoneNumber || phoneInput)}
              </div>
            </div>
            <button
              type="button"
              onClick={handleChangeNumber}
              disabled={isBusy}
              className="text-[11px] font-bold text-[var(--pm-accent)] hover:underline cursor-pointer shrink-0 disabled:opacity-50"
            >
              {isBn ? 'নম্বর বদলান' : 'Change'}
            </button>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-[var(--pm-muted)] ml-0.5">
              {isBn ? '৬ সংখ্যার OTP কোড' : '6-Digit OTP Code'}
            </label>
            <div className="relative group">
              <KeyRound className="w-4 h-4 text-[var(--pm-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-[var(--pm-accent)] transition-colors" />
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                disabled={isBusy}
                className="w-full pl-9 pr-3.5 py-2.5 text-sm font-bold tracking-[0.25em] bg-[var(--pm-input)] border border-[var(--pm-border)] rounded-xl text-[var(--pm-text)] placeholder:text-[var(--pm-muted)] placeholder:tracking-normal focus:outline-none focus:border-[var(--pm-accent)] focus:ring-2 focus:ring-[var(--pm-accent)]/15 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isBusy || otpCode.length < 6}
            className="w-full py-2.5 sm:py-3 px-4 text-sm font-bold text-[var(--pm-accent-fg)] bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] rounded-xl shadow-md active-scale transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {isBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{isBn ? 'যাচাই করে লগইন করুন' : 'Verify & Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="flex items-center justify-center">
            <button
              type="button"
              disabled={isBusy || cooldownSec > 0}
              onClick={() => void handleSendOtp()}
              className="text-xs font-semibold text-[var(--pm-muted)] hover:text-[var(--pm-accent)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>
                {cooldownSec > 0
                  ? (isBn ? `পুনরায় কোড পাঠান (${cooldownSec}s)` : `Resend OTP in ${cooldownSec}s`)
                  : (isBn ? 'পুনরায় OTP পাঠান' : 'Resend OTP')}
              </span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
