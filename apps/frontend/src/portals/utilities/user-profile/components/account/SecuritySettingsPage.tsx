import React from 'react';
import { Clock, KeyRound, ShieldCheck, Smartphone } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export const SecuritySettingsPage: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const options = [
    {
      icon: KeyRound,
      label: isBn ? 'পাসওয়ার্ড পরিবর্তন' : 'Password changes',
      description: isBn ? 'সাইন-ইন পদ্ধতির মাধ্যমে পরিচালিত হবে।' : 'Managed through your sign-in provider.',
    },
    {
      icon: ShieldCheck,
      label: isBn ? 'টু-স্টেপ ভেরিফিকেশন' : 'Two-step verification',
      description: isBn ? 'অতিরিক্ত যাচাই চালু বা বন্ধ করা' : 'Add or remove an extra sign-in check.',
    },
    {
      icon: Smartphone,
      label: isBn ? 'সক্রিয় ডিভাইস' : 'Active devices',
      description: isBn ? 'সাইন-ইন করা ডিভাইস দেখা ও সরানো' : 'Review and remove signed-in devices.',
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold text-[var(--pm-text)]">
          {isBn ? 'লগইন ও অ্যাকাউন্ট নিরাপত্তা' : 'Login & Account Security'}
        </h3>
        <p className="mt-1 text-sm text-[var(--pm-muted)]">
          {isBn
            ? 'পাসওয়ার্ড, যাচাইকরণ ও ডিভাইস সেটিংস এখনো এই অ্যাকাউন্টের সঙ্গে যুক্ত নয়।'
            : 'Password, verification, and device settings are not connected to this account yet.'}
        </p>
      </div>

      <div
        role="status"
        className="flex items-start gap-3 rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-surface)] p-4"
      >
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[var(--pm-accent)]" />
        <div>
          <p className="text-sm font-semibold text-[var(--pm-text)]">
            {isBn ? 'নিরাপত্তা নিয়ন্ত্রণগুলো শীঘ্রই আসছে' : 'Security controls are coming soon'}
          </p>
          <p className="mt-1 text-sm leading-5 text-[var(--pm-muted)]">
            {isBn
              ? 'এই সেটিংসগুলো এখনো অ্যাকাউন্ট সেবার সঙ্গে যুক্ত নয়। এখান থেকে এখনো কোনো পাসওয়ার্ড, যাচাইকরণ বা ডিভাইস পরিবর্তন করা যাবে না।'
              : 'These settings are not connected to the account service yet. No password, verification, or device changes can be made here.'}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-card)] divide-y divide-[var(--pm-border)]">
        {options.map(({ icon: Icon, label, description }) => (
          <div key={label} className="flex items-center gap-3 p-4">
            <Icon className="h-5 w-5 shrink-0 text-[var(--pm-muted)]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--pm-text)]">{label}</p>
              <p className="mt-0.5 text-xs leading-4 text-[var(--pm-muted)]">{description}</p>
            </div>
            <span className="shrink-0 rounded-full bg-[var(--pm-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--pm-muted)]">
              {isBn ? 'শীঘ্রই' : 'Coming soon'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
