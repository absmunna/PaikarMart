import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Newspaper, Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface TradeNewsArticle {
  id: string;
  category: 'policy' | 'wholesale' | 'tech' | 'compliance';
  categoryLabelEn: string;
  categoryLabelBn: string;
  titleEn: string;
  titleBn: string;
  summaryEn: string;
  summaryBn: string;
  readTime: string;
  publishedAt: string;
  imageUrl: string;
}

const TRADE_NEWS_ARTICLES: TradeNewsArticle[] = [
  {
    id: 'news_import_q4',
    category: 'policy',
    categoryLabelEn: 'Import Policy',
    categoryLabelBn: 'আমদানি নীতি',
    titleEn: 'Updated Customs Clearance Guidelines for Consumer Electronics & Accessories',
    titleBn: 'ইলেকট্রনিক্স ও এক্সেসরিজ আমদানিতে নতুন কাস্টমস ক্লিয়ারেন্স নির্দেশিকা',
    summaryEn: 'HS-code harmonization and pre-arrival digital manifests reduce Chattogram port turnaround by up to 18 hours for registered B2B importers.',
    summaryBn: 'নতুন ডিজিটাল ম্যানিফেস্ট ও এইচএস-কোড সমন্বয়ের ফলে নিবন্ধিত B2B আমদানিকারকদের পণ্য ছাড়করণ সময় ১৮ ঘণ্টা পর্যন্ত কমছে।',
    readTime: '4 min read',
    publishedAt: '2 hours ago',
    imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'news_cold_chain',
    category: 'wholesale',
    categoryLabelEn: 'Wholesale Logistics',
    categoryLabelBn: 'হোলসেল লজিস্টিকস',
    titleEn: 'Cross-District Agri & Grocery Supply Corridors Expand Same-Day Freight',
    titleBn: 'আন্তঃজেলা কৃষি ও গ্রোসারি সাপ্লাই করিডোরে সেম-ডে ফ্রেইট সুবিধা চালু',
    summaryEn: 'Direct farm-to-hub refrigerated trucks now connect Bogura, Rajshahi, and Dhaka wholesale depots with live telemetry.',
    summaryBn: 'বগুড়া, রাজশাহী ও ঢাকার পাইকারি হাবগুলোর মধ্যে সরাসরি কোল্ড-চেইন ট্রাক সার্ভিস যুক্ত হয়েছে।',
    readTime: '3 min read',
    publishedAt: '5 hours ago',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'news_buybox_pmin',
    category: 'tech',
    categoryLabelEn: 'Marketplace Tech',
    categoryLabelBn: 'মার্কেটপ্লেস টেক',
    titleEn: 'How Canonical PMIN Catalogs & Landed-Cost Buy-Box Improve Seller Conversion',
    titleBn: 'ক্যানোনিকাল PMIN ক্যাটালগ ও ল্যান্ডেড-কস্ট Buy-Box যেভাবে সেলারদের বিক্রি বাড়ায়',
    summaryEn: 'Merging duplicate listings into unified PMIN product pages helps verified sellers compete transparently on total landed price and shipping speed.',
    summaryBn: 'একই পণ্যের একাধিক লিস্টিং একটি PMIN পেজে যুক্ত হওয়ায় স্বচ্ছ মূল্যে দ্রুত ডেলিভারি দেওয়া ভেরিফাইড সেলাররা বেশি অর্ডার পাচ্ছেন।',
    readTime: '5 min read',
    publishedAt: '1 day ago',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'news_kyc_compliance',
    category: 'compliance',
    categoryLabelEn: 'Merchant KYC',
    categoryLabelBn: 'মার্চেন্ট KYC',
    titleEn: 'Automated Trade License & NID Document Verification Checklist for 2026',
    titleBn: '২০২৬ সালের ট্রেড লাইসেন্স ও NID ডকুমেন্ট ভেরিফিকেশন চেকলিস্ট',
    summaryEn: 'Ensure your store TIN, Trade License, and category permits are up to date to keep escrow payouts instant and uninterrupted.',
    summaryBn: 'তাৎক্ষণিক এসক্রো পেআউট সচল রাখতে দোকানের TIN, ট্রেড লাইসেন্স ও ক্যাটাগরি অনুমোদন হালনাগাদ রাখুন।',
    readTime: '3 min read',
    publishedAt: '2 days ago',
    imageUrl: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=400&q=80',
  },
];

export const IndustryNewsPanel: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [selectedCategory, setSelectedCategory] = useState<'all' | TradeNewsArticle['category']>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return TRADE_NEWS_ARTICLES.filter((article) => {
      if (selectedCategory !== 'all' && article.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        article.titleEn.toLowerCase().includes(q) ||
        article.titleBn.toLowerCase().includes(q) ||
        article.summaryEn.toLowerCase().includes(q) ||
        article.summaryBn.toLowerCase().includes(q)
      );
    });
  }, [selectedCategory, searchQuery]);

  return (
    <section className="bg-[var(--pm-card)] border border-[var(--pm-border)] rounded-3xl p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-[var(--pm-accent)]" />
          <h3 className="text-sm font-black uppercase tracking-wider text-[var(--pm-text)]">
            {isBn ? 'পাইকারমার্ট ট্রেড ও মার্কেট নিউজ' : 'PaikarMart Trade & Industry News'}
          </h3>
        </div>

        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 text-[var(--pm-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isBn ? 'নিউজ খুঁজুন...' : 'Filter trade news...'}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[var(--pm-input)] border border-[var(--pm-border)] text-xs text-[var(--pm-text)] placeholder:text-[var(--pm-muted)] focus:outline-hidden focus:border-[var(--pm-accent)]"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {(
          [
            { id: 'all', labelEn: 'All Briefings', labelBn: 'সব নিউজ' },
            { id: 'policy', labelEn: 'Import Policy', labelBn: 'আমদানি নীতি' },
            { id: 'wholesale', labelEn: 'Wholesale', labelBn: 'হোলসেল' },
            { id: 'tech', labelEn: 'Commerce Tech', labelBn: 'টেকনোলজি' },
            { id: 'compliance', labelEn: 'Compliance', labelBn: 'কমপ্লায়েন্স' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedCategory(tab.id)}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              selectedCategory === tab.id
                ? 'bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] border-transparent'
                : 'bg-[var(--pm-surface)] text-[var(--pm-muted)] border-[var(--pm-border)] hover:text-[var(--pm-text)]'
            }`}
          >
            {isBn ? tab.labelBn : tab.labelEn}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredArticles.map((article) => {
          const isExpanded = expandedId === article.id;
          return (
            <div
              key={article.id}
              onClick={() => setExpandedId(isExpanded ? null : article.id)}
              className="bg-[var(--pm-surface)] p-4 rounded-2xl border border-[var(--pm-border)] hover:border-[var(--pm-accent)]/60 transition-colors cursor-pointer space-y-2"
            >
              <div className="flex gap-3">
                <img
                  src={article.imageUrl}
                  alt={isBn ? article.titleBn : article.titleEn}
                  className="w-16 h-16 rounded-xl bg-[var(--pm-card)] shrink-0 object-cover border border-[var(--pm-border)]"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-[var(--pm-muted)]">
                    <span className="text-[var(--pm-accent)] uppercase">
                      {isBn ? article.categoryLabelBn : article.categoryLabelEn}
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      {article.publishedAt} · {article.readTime}
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-[var(--pm-text)] leading-snug">
                    {isBn ? article.titleBn : article.titleEn}
                  </h4>
                </div>
              </div>
              {isExpanded && (
                <p className="text-xs text-[var(--pm-muted)] leading-relaxed pt-2 border-t border-[var(--pm-border)]">
                  {isBn ? article.summaryBn : article.summaryEn}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
