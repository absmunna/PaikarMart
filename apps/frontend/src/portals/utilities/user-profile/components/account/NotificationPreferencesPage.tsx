import React from 'react';
import { Bell, Clock, Mail, ShieldCheck, Smartphone, Tag } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export const NotificationPreferencesPage: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const options = [
    {
      icon: Mail,
      label: isBn ? 'ইমেইল আপডেট' : 'Email updates',
    },
    {
      icon: Smartphone,
      label: isBn ? 'SMS ও ডেলিভারি অ্যালার্ট' : 'SMS and delivery alerts',
    },
    {
      icon: Bell,
      label: isBn ? 'অ্যাপ নোটিফিকেশন' : 'App notifications',
    },
    {
      icon: ShieldCheck,
      label: isBn ? 'নিরাপত্তা অ্যালার্ট' : 'Security alerts',
    },
    {
      icon: Tag,
      label: isBn ? 'অফার ও প্রচারণা' : 'Offers and promotions',
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold text-[var(--pm-text)]">
          {isBn ? 'নোটিফিকেশন পছন্দ' : 'Notification preferences'}
        </h3>
        <p className="mt-1 text-sm text-[var(--pm-muted)]">
          {isBn
            ? 'নোটিফিকেশন পাঠানোর ব্যবস্থা যুক্ত হলে কোন আপডেট পাবেন তা বেছে নিন।'
            : 'Choose which updates to receive once notification delivery is connected.'}
        </p>
      </div>

      <div
        role="status"
        className="flex items-start gap-3 rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-surface)] p-4"
      >
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[var(--pm-accent)]" />
        <div>
          <p className="text-sm font-semibold text-[var(--pm-text)]">
            {isBn ? 'নোটিফিকেশন নিয়ন্ত্রণ শীঘ্রই আসছে' : 'Notification controls are coming soon'}
          </p>
          <p className="mt-1 text-sm leading-5 text-[var(--pm-muted)]">
            {isBn
              ? 'এই পছন্দগুলো এখনো ইমেইল, SMS বা অ্যাপ নোটিফিকেশন পাঠানো নিয়ন্ত্রণ করে না।'
              : 'These preferences are not connected to email, SMS, or in-app notification delivery yet.'}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--pm-border)] bg-[var(--pm-card)] divide-y divide-[var(--pm-border)]">
        {options.map(({ icon: Icon, label }) => (
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
