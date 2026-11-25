import React, { useState, useEffect } from 'react';
import { Download, X, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PwaInstallBanner: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Only register offline service worker in production builds; clean up stale SW caches in dev
    if ('serviceWorker' in navigator) {
      if (import.meta.env.PROD) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js').catch(() => {
            // Ignore service worker registration errors in sandbox
          });
        });
      } else {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((reg) => reg.unregister());
        }).catch(() => {});
        if ('caches' in window) {
          caches.keys().then((keys) => {
            keys.forEach((key) => {
              if (key.startsWith('paikarmart-pwa-cache')) {
                caches.delete(key);
              }
            });
          }).catch(() => {});
        }
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  if (!showBanner) return null;

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 bg-[var(--pm-card)] text-[var(--pm-text)] border border-[var(--pm-accent-border)] rounded-2xl p-4 shadow-2xl animate-fade-in flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-[var(--pm-accent)] text-[var(--pm-accent-fg)] flex items-center justify-center shrink-0 shadow-md">
        <Sparkles className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-black text-[var(--pm-text)]">
          {isBn ? 'পাইকারমার্ট অ্যাপ ইন্সটল করুন' : 'Install PaikarMart App'}
        </h4>
        <p className="text-[11px] text-[var(--pm-muted)] mt-0.5 leading-snug">
          {isBn
            ? 'দ্রুত অ্যাক্সেস ও অফলাইন ব্রাউজিংয়ের জন্য আপনার ডিভাইসে সুপার অ্যাপটি ইনস্টল করুন।'
            : 'Get lightning-fast access, offline support, and app experience on your device.'}
        </p>
        <div className="flex items-center gap-2 mt-3">
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3 py-1.5 rounded-xl bg-[var(--pm-accent)] hover:bg-[var(--pm-accent-hover)] text-[var(--pm-accent-fg)] text-xs font-bold shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isBn ? 'ইন্সটল' : 'Install Now'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowBanner(false)}
            className="px-2.5 py-1.5 rounded-xl bg-[var(--pm-surface)] text-[var(--pm-muted)] hover:text-[var(--pm-text)] text-xs font-bold cursor-pointer"
          >
            {isBn ? 'পরে' : 'Not Now'}
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setShowBanner(false)}
        aria-label="Close install banner"
        className="text-[var(--pm-muted)] hover:text-[var(--pm-text)] cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
