import React from 'react';
import { Clock, CreditCard, Smartphone, Wallet } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export const PaymentMethodsPage: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const methods = [
    {
      icon: CreditCard,
      label: isBn ? 'ডেবিট ও ক্রেডিট কার্ড' : 'Debit and credit cards',
    },
    {
      icon: Wallet,
      label: isBn ? 'মোবাইল ওয়ালেট' : 'Mobile wallets',
    },
    {
      icon: Smartphone,
      label: isBn ? 'মোবাইল ব্যাংকিং' : 'Mobile banking',
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold text-[var(--pm-text)]">
          {isBn ? 'পেমেন্ট পদ্ধতি' : 'Payment methods'}
        </h3>
        <p className="mt-1 text-sm text-[var(--pm-muted)]">
          {isBn
            ? 'নিরাপদ পেমেন্ট সেবা যুক্ত হলে কার্ড ও মোবাইল ওয়ালেট পরিচালনা করুন।'
            : 'Manage cards and mobile wallets once secure payment support is connected.'}
        </p>
      </div>

      <div
        role="status"
        className="flex items-start gap-3 rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-surface)] p-4"
      >
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[var(--pm-accent)]" />
        <div>
          <p className="text-sm font-semibold text-[var(--pm-text)]">
            {isBn ? 'পেমেন্ট পদ্ধতি শীঘ্রই আসছে' : 'Payment methods are coming soon'}
          </p>
          <p className="mt-1 text-sm leading-5 text-[var(--pm-muted)]">
            {isBn
              ? 'নিরাপদ পেমেন্ট সেবা যুক্ত না হওয়া পর্যন্ত এখানে কোনো কার্ড বা ওয়ালেট যোগ, সংরক্ষণ বা চার্জ করা হবে না।'
              : 'Until a secure payment provider is connected, this page cannot add, store, or charge a card or wallet.'}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-card)] divide-y divide-[var(--pm-border)]">
        {methods.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-3 p-4">
            <Icon className="h-5 w-5 shrink-0 text-[var(--pm-muted)]" />
            <p className="min-w-0 flex-1 text-sm font-medium text-[var(--pm-text)]">{label}</p>
            <span className="shrink-0 rounded-full bg-[var(--pm-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--pm-muted)]">
              {isBn ? 'শীঘ্রই' : 'Coming soon'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
