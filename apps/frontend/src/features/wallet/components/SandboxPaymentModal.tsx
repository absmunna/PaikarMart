import React, { useEffect, useState } from 'react';
import { CheckCircle2, Lock, ShieldAlert, Smartphone, X, Loader2 } from 'lucide-react';
import {
  initiateGatewayPaymentApi,
  verifyGatewayPaymentApi,
  type PaymentGatewayProviderId,
  type PaymentInitiateResponse,
  type PaymentVerifyResponse,
} from '@/features/wallet/services/paymentGatewayClient';
import { useLanguage } from '@/contexts/LanguageContext';

interface SandboxPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: PaymentGatewayProviderId;
  amount: number;
  purpose: 'wallet_deposit' | 'order_checkout';
  orderId?: string;
  customerName?: string;
  customerPhone?: string;
  onVerified: (result: PaymentVerifyResponse) => void;
}

const PROVIDER_THEME: Record<
  PaymentGatewayProviderId,
  { label: string; labelBn: string; headerBg: string; accentText: string; badge: string }
> = {
  bkash: {
    label: 'bKash Payment Gateway',
    labelBn: 'বিকাশ পেমেন্ট গেটওয়ে',
    headerBg: 'bg-[#e2136e]',
    accentText: 'text-[#e2136e]',
    badge: 'bKash BD',
  },
  nagad: {
    label: 'Nagad Digital Payment',
    labelBn: 'নগদ ডিজিটাল পেমেন্ট',
    headerBg: 'bg-[#f37021]',
    accentText: 'text-[#f37021]',
    badge: 'Nagad BD',
  },
  sslcommerz: {
    label: 'SSLCommerz Secure Checkout',
    labelBn: 'SSLCommerz সিকিউর চেকআউট',
    headerBg: 'bg-[#1d4ed8]',
    accentText: 'text-[#1d4ed8]',
    badge: 'SSLCommerz · Cards/Rocket',
  },
};

export const SandboxPaymentModal: React.FC<SandboxPaymentModalProps> = ({
  isOpen,
  onClose,
  provider,
  amount,
  purpose,
  orderId,
  customerName,
  customerPhone,
  onVerified,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const theme = PROVIDER_THEME[provider];

  const [step, setStep] = useState<'loading' | 'account' | 'otp' | 'pin' | 'done' | 'error'>('loading');
  const [sessionData, setSessionData] = useState<PaymentInitiateResponse | null>(null);
  const [walletNumber, setWalletNumber] = useState(customerPhone || '01770618575');
  const [otp, setOtp] = useState('123456');
  const [pin, setPin] = useState('1212');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifiedReceipt, setVerifiedReceipt] = useState<PaymentVerifyResponse | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setStep('loading');
    setErrorMsg(null);
    setVerifiedReceipt(null);

    initiateGatewayPaymentApi({
      provider,
      amount,
      purpose,
      orderId,
      customerName,
      customerPhone,
      idempotencyKey: `${purpose}_${provider}_${amount}_${Date.now()}`,
    })
      .then((res) => {
        if (!active) return;
        setSessionData(res);
        if (res.sandboxChallenge?.testWallet && !customerPhone) {
          setWalletNumber(res.sandboxChallenge.testWallet);
        }
        setStep('account');
      })
      .catch((err: any) => {
        if (!active) return;
        setErrorMsg(err?.message || 'Unable to start payment session.');
        setStep('error');
      });

    return () => {
      active = false;
    };
  }, [isOpen, provider, amount, purpose, orderId, customerName, customerPhone]);

  if (!isOpen) return null;

  const handleConfirmPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionData?.session?.id) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const verified = await verifyGatewayPaymentApi({
        sessionId: sessionData.session.id,
        walletNumber: walletNumber.trim(),
        otp: otp.trim(),
        pin: pin.trim(),
      });
      setVerifiedReceipt(verified);
      setStep('done');
      onVerified(verified);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Verification failed. Please check OTP/PIN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-3xl bg-[var(--pm-card)] text-[var(--pm-text)] border border-[var(--pm-border)] shadow-2xl overflow-hidden"
      >
        {/* Branded Gateway Header */}
        <div className={`${theme.headerBg} text-white px-5 py-4 flex items-center justify-between gap-3`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black truncate">{isBn ? theme.labelBn : theme.label}</h3>
              <p className="text-[11px] text-white/85 font-mono truncate">
                {sessionData?.session?.mode === 'live' ? 'LIVE GATEWAY' : 'SANDBOX TEST CHECKOUT'} · ৳
                {amount.toLocaleString()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close payment gateway"
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Merchant Summary Box */}
          <div className="p-3.5 rounded-2xl bg-[var(--pm-surface)] border border-[var(--pm-border)] flex items-center justify-between text-xs">
            <div>
              <p className="text-[10px] font-bold text-[var(--pm-muted)] uppercase">PaikarMart Merchant</p>
              <p className="font-bold text-[var(--pm-text)] mt-0.5">
                {purpose === 'wallet_deposit' ? 'PaikarMart Pay Wallet Top-Up' : `Order Checkout ${orderId || ''}`}
              </p>
              {sessionData?.session?.gatewayReference && (
                <p className="text-[10px] font-mono text-[var(--pm-muted)] mt-0.5">
                  Ref: {sessionData.session.gatewayReference}
                </p>
              )}
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-[var(--pm-muted)] block">Total</span>
              <span className={`text-lg font-mono font-black ${theme.accentText}`}>
                ৳{amount.toLocaleString()}
              </span>
            </div>
          </div>

          {sessionData?.sandboxChallenge && step !== 'done' && step !== 'error' && (
            <div className="p-3 rounded-2xl bg-[var(--pm-accent-soft)] border border-[var(--pm-accent-border)] text-[11px] text-[var(--pm-text)]">
              <p className="font-bold">{sessionData.sandboxChallenge.hint}</p>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-[var(--pm-danger-soft)] border border-[var(--pm-danger)]/30 flex items-start gap-2 text-xs text-[var(--pm-danger)] font-bold">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 'loading' && (
            <div className="py-10 flex flex-col items-center justify-center gap-3 text-xs text-[var(--pm-muted)]">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--pm-accent)]" />
              <span>{isBn ? 'গেটওয়ে সেশন তৈরি হচ্ছে...' : 'Initializing secure gateway session...'}</span>
            </div>
          )}

          {step === 'error' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] text-xs font-bold cursor-pointer"
              >
                {isBn ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          )}

          {step === 'account' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setErrorMsg(null);
                setStep('otp');
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-bold block mb-1.5">
                  {provider === 'sslcommerz'
                    ? isBn
                      ? 'কার্ড / রকেট অ্যাকাউন্ট নম্বর'
                      : 'Card Last 4 or Rocket Number'
                    : isBn
                    ? 'মোবাইল ওয়ালেট নম্বর'
                    : 'Mobile Wallet Number'}
                </label>
                <input
                  type="text"
                  required
                  value={walletNumber}
                  onChange={(e) => setWalletNumber(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs font-mono font-bold outline-none focus:border-[var(--pm-accent)]"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] text-xs font-bold cursor-pointer"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2.5 rounded-xl ${theme.headerBg} text-white text-xs font-bold shadow-md cursor-pointer`}
                >
                  {isBn ? 'পরবর্তী ধাপ' : 'Proceed'}
                </button>
              </div>
            </form>
          )}

          {step === 'otp' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setErrorMsg(null);
                setStep('pin');
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-bold block mb-1.5">
                  {isBn ? 'ভেরিফিকেশন কোড (OTP)' : 'Verification Code (OTP)'}
                </label>
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs font-mono font-bold text-center tracking-widest outline-none focus:border-[var(--pm-accent)]"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep('account')}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] text-xs font-bold cursor-pointer"
                >
                  {isBn ? 'পিছনে' : 'Back'}
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2.5 rounded-xl ${theme.headerBg} text-white text-xs font-bold shadow-md cursor-pointer`}
                >
                  {isBn ? 'OTP যাচাই করুন' : 'Verify OTP'}
                </button>
              </div>
            </form>
          )}

          {step === 'pin' && (
            <form onSubmit={(e) => void handleConfirmPin(e)} className="space-y-3">
              <div>
                <label className="text-xs font-bold flex items-center gap-1.5 mb-1.5">
                  <Lock className="w-3.5 h-3.5 text-[var(--pm-accent)]" />
                  <span>{isBn ? 'পিন নিশ্চিত করুন' : 'Confirm Gateway PIN'}</span>
                </label>
                <input
                  type="password"
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="1212"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs font-mono font-bold text-center tracking-widest outline-none focus:border-[var(--pm-accent)]"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep('otp')}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--pm-surface)] border border-[var(--pm-border)] text-xs font-bold cursor-pointer"
                >
                  {isBn ? 'পিছনে' : 'Back'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 py-2.5 rounded-xl ${theme.headerBg} text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60`}
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>{isBn ? 'পেমেন্ট সম্পন্ন করুন' : `Pay ৳${amount.toLocaleString()}`}</span>
                </button>
              </div>
            </form>
          )}

          {step === 'done' && verifiedReceipt && (
            <div className="py-4 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[var(--pm-success-soft)] text-[var(--pm-success)] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-[var(--pm-text)]">
                  {isBn ? 'পেমেন্ট যাচাই সফল হয়েছে!' : 'Payment Verified Successfully'}
                </h4>
                <p className="text-xs text-[var(--pm-muted)] mt-1 font-mono">
                  TrxID: {verifiedReceipt.trxId}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] text-xs font-bold cursor-pointer"
              >
                {isBn ? 'সম্পন্ন' : 'Done'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
