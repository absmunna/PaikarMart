import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTE_PATHS } from '@/shared/constants/routes';
import { useLanguage } from '@/contexts/LanguageContext';

interface ComingSoonNoticeProps {
  featureName: string;
}

export const ComingSoonNotice: React.FC<ComingSoonNoticeProps> = ({ featureName }) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  return (
    <section
      role="status"
      aria-labelledby="coming-soon-title"
      className="mx-auto max-w-2xl px-4 py-6 text-center sm:py-8"
    >
      <h2
        id="coming-soon-title"
        className="text-xl font-bold text-[var(--pm-text)] sm:text-2xl"
      >
        {isBn ? 'এই সুবিধাটি শিগগিরই আসছে' : `Coming soon: ${featureName}`}
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--pm-muted)]">
        {isBn
          ? 'PaikarMart ধাপে ধাপে চালু হচ্ছে। এখন COD-সহ রিটেইল মার্কেটপ্লেস ব্যবহার করুন।'
          : 'PaikarMart is launching in stages. The Retail Marketplace is available now with Cash on Delivery.'}
      </p>
      <Link
        to={ROUTE_PATHS.MARKETPLACE_HUB}
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--pm-accent)] px-4 text-sm font-bold text-[var(--pm-accent-fg)] transition-colors hover:bg-[var(--pm-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pm-accent)]"
      >
        {isBn ? 'রিটেইল মার্কেটপ্লেস খুলুন' : 'Open Retail Marketplace'}
      </Link>
    </section>
  );
};
