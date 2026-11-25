import React, { useState } from 'react';
import { CheckCircle2, Circle, Factory, Pill, ShoppingBag, Store, Utensils, Wrench } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface CategoryKycSpec {
  id: 'retail' | 'wholesale' | 'pharmacy' | 'food' | 'service';
  labelEn: string;
  labelBn: string;
  icon: React.ComponentType<{ className?: string }>;
  docs: Array<{ id: string; en: string; bn: string }>;
}

const CATEGORY_KYC_SPECS: CategoryKycSpec[] = [
  {
    id: 'retail',
    labelEn: 'Retail Store',
    labelBn: 'রিটেইল শপ',
    icon: ShoppingBag,
    docs: [
      { id: 'nid', en: 'Owner NID / Smart Card (Verified)', bn: 'মালিকের NID / স্মার্ট কার্ড' },
      { id: 'trade', en: 'City Corp / Union Trade License', bn: 'সিটি কর্পোরেশন / ইউনিয়ন ট্রেড লাইসেন্স' },
      { id: 'bank', en: 'Verified Merchant Bank / bKash MFS', bn: 'ভেরিফাইড ব্যাংক বা মার্চেন্ট MFS' },
    ],
  },
  {
    id: 'wholesale',
    labelEn: 'Wholesale & Factory',
    labelBn: 'হোলসেল ও ফ্যাক্টরি',
    icon: Factory,
    docs: [
      { id: 'trade_wh', en: 'Industrial / Commercial Trade License', bn: 'বাণিজ্যিক / ইন্ডাস্ট্রিয়াল ট্রেড লাইসেন্স' },
      { id: 'tin', en: 'e-TIN & VAT BIN Registration', bn: 'ই-টিন ও ভ্যাট BIN সার্টিফিকেট' },
      { id: 'factory_reg', en: 'Chamber of Commerce / IRC / ERC (If Importer)', bn: 'চেম্বার / আমদানি-রপ্তানি নিবন্ধন' },
    ],
  },
  {
    id: 'pharmacy',
    labelEn: 'Pharmacy & Health',
    labelBn: 'ফার্মেসি ও হেলথ',
    icon: Pill,
    docs: [
      { id: 'dgda', en: 'DGDA Drug License (Mandatory)', bn: 'DGDA ড্রাগ লাইসেন্স (বাধ্যতামূলক)' },
      { id: 'pharmacist', en: 'Registered Pharmacist Certificate', bn: 'নিবন্ধিত ফার্মাসিস্ট সনদ' },
      { id: 'trade_ph', en: 'Valid Municipal Trade License', bn: 'হালনাগাদ ট্রেড লাইসেন্স' },
    ],
  },
  {
    id: 'food',
    labelEn: 'Food & Grocery',
    labelBn: 'ফুড ও গ্রোসারি',
    icon: Utensils,
    docs: [
      { id: 'bfsa', en: 'Bangladesh Food Safety (BFSA) Hygiene Clearance', bn: 'নিরাপদ খাদ্য কর্তৃপক্ষ (BFSA) সনদ' },
      { id: 'bsti', en: 'BSTI Packaging Approval (Packaged Goods)', bn: 'BSTI অনুমোদন (প্যাকেটজাত পণ্যের জন্য)' },
      { id: 'trade_fd', en: 'Valid Trade License', bn: 'বৈধ ট্রেড লাইসেন্স' },
    ],
  },
  {
    id: 'service',
    labelEn: 'Local Services',
    labelBn: 'লোকাল সার্ভিস',
    icon: Wrench,
    docs: [
      { id: 'nid_sv', en: 'Technician / Owner NID Verification', bn: 'টেকনিশিয়ান / মালিকের NID ভেরিফিকেশন' },
      { id: 'skill', en: 'Technical / BTEB Trade Skill Certificate', bn: 'কারিগরি / ট্রেড স্কিল সার্টিফিকেট' },
      { id: 'address', en: 'Service Zone Address Proof', bn: 'সার্ভিস জোনের ঠিকানা প্রমাণপত্র' },
    ],
  },
];

export const SmartKycChecklist: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [selectedCategory, setSelectedCategory] = useState<CategoryKycSpec['id']>('retail');
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({
    nid: true,
    trade: true,
    trade_wh: true,
    tin: true,
  });

  const activeSpec = CATEGORY_KYC_SPECS.find((s) => s.id === selectedCategory) || CATEGORY_KYC_SPECS[0];
  const completedCount = activeSpec.docs.filter((doc) => checkedDocs[doc.id]).length;

  const toggleDoc = (docId: string) => {
    setCheckedDocs((prev) => ({ ...prev, [docId]: !prev[docId] }));
  };

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-[var(--pm-surface)] border border-[var(--pm-border)] space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-[var(--pm-accent)]" />
          <h4 className="text-xs font-black uppercase tracking-wider text-[var(--pm-text)]">
            {isBn ? 'ক্যাটাগরি-ভিত্তিক স্মার্ট KYC চেকলিস্ট' : 'Category-Specific Compliance Checklist'}
          </h4>
        </div>
        <span className="text-xs font-mono font-bold text-[var(--pm-success)]">
          {completedCount}/{activeSpec.docs.length} {isBn ? 'সম্পন্ন' : 'ready'}
        </span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {CATEGORY_KYC_SPECS.map((spec) => {
          const Icon = spec.icon;
          const active = spec.id === selectedCategory;
          return (
            <button
              key={spec.id}
              type="button"
              onClick={() => setSelectedCategory(spec.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                active
                  ? 'bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] border-transparent'
                  : 'bg-[var(--pm-card)] text-[var(--pm-muted)] border-[var(--pm-border)] hover:text-[var(--pm-text)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{isBn ? spec.labelBn : spec.labelEn}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        {activeSpec.docs.map((doc) => {
          const checked = Boolean(checkedDocs[doc.id]);
          return (
            <button
              key={doc.id}
              type="button"
              onClick={() => toggleDoc(doc.id)}
              className="w-full p-3 rounded-xl bg-[var(--pm-card)] border border-[var(--pm-border)] hover:border-[var(--pm-accent)]/50 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                {checked ? (
                  <CheckCircle2 className="w-4 h-4 text-[var(--pm-success)] shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-[var(--pm-muted)] shrink-0" />
                )}
                <span className={`text-xs font-semibold ${checked ? 'text-[var(--pm-text)]' : 'text-[var(--pm-muted)]'}`}>
                  {isBn ? doc.bn : doc.en}
                </span>
              </div>
              <span className={`text-[10px] font-bold ${checked ? 'text-[var(--pm-success)]' : 'text-[var(--pm-muted)]'}`}>
                {checked ? (isBn ? 'প্রস্তুত' : 'Prepared') : (isBn ? 'বাকি আছে' : 'Pending')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
